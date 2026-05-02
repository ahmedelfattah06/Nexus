import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/goals", requireAuth, async (req: any, res) => {
  try {
    const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, req.userId));
    res.json(goals);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals", requireAuth, async (req: any, res) => {
  const { title, description, targetDate, progress, status } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [goal] = await db.insert(goalsTable).values({ title, description: description || "", targetDate: targetDate || "", progress: progress || 0, status: status || "active", userId: req.userId }).returning();
    res.status(201).json(goal);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/goals/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { title, description, targetDate, progress, status } = req.body;
  try {
    const [goal] = await db.update(goalsTable).set({ title, description, targetDate, progress, status, updatedAt: new Date() }).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId))).returning();
    if (!goal) return res.status(404).json({ error: "Not found" });
    res.json(goal);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/goals/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
