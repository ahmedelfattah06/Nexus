import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { snippetsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { CreateSnippetBody, UpdateSnippetBody } from "@workspace/api-zod";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/snippets", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(snippetsTable)
        .where(eq(snippetsTable.userId, req.userId))
        .orderBy(desc(snippetsTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(snippetsTable)
        .where(eq(snippetsTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/snippets", requireAuth, async (req: any, res, next) => {
  const result = CreateSnippetBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [snippet] = await db
      .insert(snippetsTable)
      .values({ ...result.data, userId: req.userId })
      .returning();
    res.status(201).json(snippet);
  } catch (err) {
    next(err);
  }
});

router.put("/snippets/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  const result = UpdateSnippetBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [existing] = await db
      .select()
      .from(snippetsTable)
      .where(eq(snippetsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [snippet] = await db
      .update(snippetsTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(snippetsTable.id, id))
      .returning();
    res.json(snippet);
  } catch (err) {
    next(err);
  }
});

router.delete("/snippets/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await db
      .select()
      .from(snippetsTable)
      .where(eq(snippetsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(snippetsTable).where(eq(snippetsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
