import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc, desc, count } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateAnthropicConversationBody,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

const aiMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
  keyGenerator: (req: any) => req.userId ?? ipKeyGenerator(req),
});

const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quote limit reached, try again later." },
  keyGenerator: (req: any) => req.userId ?? ipKeyGenerator(req),
});

const NEX_SYSTEM_PROMPT = `You are Nex, the AI assistant inside Nexus — a premium productivity workspace for developers and students.

Your personality:
- Intelligent, warm, and occasionally witty
- You speak the user's language (Arabic or English — detect automatically)
- You are proactive but never annoying
- You never say "I can't" — you always find a way

Your capabilities:
- Help users organize their notes, tasks, and workspaces
- Answer questions and provide insights
- Help plan, remind, and suggest actions
- Create structured content from ideas

Rules:
- Be concise — no long paragraphs unless specifically asked
- Use bullet points for lists
- If user writes in Arabic, respond in Arabic
- Celebrate wins, no matter how small
- When uncertain, ask ONE clarifying question — never multiple`;

interface CacheEntry {
  quote: { quote: string; author: string };
  expiresAt: number;
}

const quoteCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of quoteCache.entries()) {
    if (entry.expiresAt < now) quoteCache.delete(key);
  }
}, CACHE_TTL_MS);

router.get("/anthropic/conversations", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(conversations),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/anthropic/conversations", requireAuth, async (req: any, res, next) => {
  const result = CreateAnthropicConversationBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [convo] = await db.insert(conversations).values(result.data).returning();
    res.status(201).json(convo);
  } catch (err) {
    next(err);
  }
});

router.get("/anthropic/conversations/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!convo) return res.status(404).json({ error: "Not found" });
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json({ ...convo, messages: msgs });
  } catch (err) {
    next(err);
  }
});

router.delete("/anthropic/conversations/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!convo) return res.status(404).json({ error: "Not found" });

    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/anthropic/conversations/:id/messages", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!convo) return res.status(404).json({ error: "Not found" });

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(asc(messages.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.conversationId, id)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/anthropic/conversations/:id/messages",
  requireAuth,
  aiMessageLimiter,
  async (req: any, res, next) => {
    const conversationId = parseInt(req.params.id);
    const result = SendAnthropicMessageBody.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Invalid body" });

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const abortController = new AbortController();
    let streamEnded = false;

    req.on("close", () => {
      if (!streamEnded) abortController.abort();
    });

    try {
      await db
        .insert(messages)
        .values({ conversationId, role: "user", content: result.data.content });

      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));

      const chatMessages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      let fullResponse = "";

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: NEX_SYSTEM_PROMPT,
        messages: chatMessages,
      });

      for await (const event of stream) {
        if (abortController.signal.aborted) break;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      if (!abortController.signal.aborted && fullResponse) {
        await db
          .insert(messages)
          .values({ conversationId, role: "assistant", content: fullResponse });
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }

      streamEnded = true;
      res.end();
    } catch (err) {
      streamEnded = true;
      if (!res.headersSent) {
        next(err);
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  }
);

router.get(
  "/nex/daily-quote",
  requireAuth,
  quoteLimiter,
  async (req: any, res, next) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const cacheKey = `daily-quote:${req.userId}:${today}`;

      const cached = quoteCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.quote);
      }

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Give me a short, powerful motivational quote for a developer or student for today (${today}). Reply with ONLY a JSON object like: {"quote": "...", "author": "..."}. The quote should be original or attributed to a real person.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\{[\s\S]*\}/);

      const fallback = {
        quote: "The secret of getting ahead is getting started.",
        author: "Mark Twain",
      };

      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          quoteCache.set(cacheKey, {
            quote: parsed,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          return res.json(parsed);
        } catch {
          return res.json(fallback);
        }
      }

      res.json(fallback);
    } catch (err) {
      req.log?.error(err);
      res.json({
        quote: "The secret of getting ahead is getting started.",
        author: "Mark Twain",
      });
    }
  }
);

export default router;
