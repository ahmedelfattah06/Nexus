import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { readingItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/reading", requireAuth, async (req: any, res) => {
  try {
    const items = await db.select().from(readingItemsTable).where(eq(readingItemsTable.userId, req.userId));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reading", requireAuth, async (req: any, res) => {
  const { title, author, url, status, progress, notes } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [item] = await db.insert(readingItemsTable).values({ title, author: author || "", url: url || "", status: status || "want_to_read", progress: progress || 0, notes: notes || "", userId: req.userId }).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/reading/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { title, author, url, status, progress, notes } = req.body;
  try {
    const [item] = await db.update(readingItemsTable).set({ title, author, url, status, progress, notes, updatedAt: new Date() }).where(and(eq(readingItemsTable.id, id), eq(readingItemsTable.userId, req.userId))).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reading/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(readingItemsTable).where(and(eq(readingItemsTable.id, id), eq(readingItemsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
