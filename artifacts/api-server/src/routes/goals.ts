import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db";
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

router.get("/goals", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.userId, req.userId))
        .orderBy(desc(goalsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(goalsTable)
        .where(eq(goalsTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/goals", requireAuth, async (req: any, res, next) => {
  const { title, description, targetDate, progress, status } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [goal] = await db
      .insert(goalsTable)
      .values({
        title,
        description: description || "",
        targetDate: targetDate || "",
        progress: progress || 0,
        status: status || "active",
        userId: req.userId,
      })
      .returning();
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.put("/goals/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  const { title, description, targetDate, progress, status } = req.body;
  try {
    const [existing] = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [goal] = await db
      .update(goalsTable)
      .set({ title, description, targetDate, progress, status, updatedAt: new Date() })
      .where(eq(goalsTable.id, id))
      .returning();
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete("/goals/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(goalsTable).where(eq(goalsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
