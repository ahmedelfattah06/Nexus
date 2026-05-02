import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateAnthropicConversationBody,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

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

router.get("/anthropic/conversations", requireAuth, async (req: any, res) => {
  try {
    const convos = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
    res.json(convos);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/anthropic/conversations", requireAuth, async (req: any, res) => {
  const result = CreateAnthropicConversationBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [convo] = await db.insert(conversations).values(result.data).returning();
    res.status(201).json(convo);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/anthropic/conversations/:id", requireAuth, async (req: any, res) => {
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
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/anthropic/conversations/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/anthropic/conversations/:id/messages", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/anthropic/conversations/:id/messages", requireAuth, async (req: any, res) => {
  const conversationId = parseInt(req.params.id);
  const result = SendAnthropicMessageBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });

  try {
    const [userMessage] = await db
      .insert(messages)
      .values({ conversationId, role: "user", content: result.data.content })
      .returning();

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

    let fullResponse = "";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: NEX_SYSTEM_PROMPT,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db
      .insert(messages)
      .values({ conversationId, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
