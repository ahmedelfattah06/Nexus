import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { readingItemsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/reading", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(readingItemsTable)
        .where(eq(readingItemsTable.userId, req.userId))
        .orderBy(desc(readingItemsTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(readingItemsTable)
        .where(eq(readingItemsTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/reading", requireAuth, async (req: any, res, next) => {
  const { title, author, url, status, progress, notes } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [item] = await db
      .insert(readingItemsTable)
      .values({
        title,
        author: author || "",
        url: url || "",
        status: status || "want_to_read",
        progress: progress || 0,
        notes: notes || "",
        userId: req.userId,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put("/reading/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  const { title, author, url, status, progress, notes } = req.body;
  try {
    const [existing] = await db
      .select()
      .from(readingItemsTable)
      .where(eq(readingItemsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId)
      return res.status(403).json({ error: "Forbidden" });

    const [item] = await db
      .update(readingItemsTable)
      .set({ title, author, url, status, progress, notes, updatedAt: new Date() })
      .where(eq(readingItemsTable.id, id))
      .returning();
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete("/reading/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await db
      .select()
      .from(readingItemsTable)
      .where(eq(readingItemsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId)
      return res.status(403).json({ error: "Forbidden" });

    await db.delete(readingItemsTable).where(eq(readingItemsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
