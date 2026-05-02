import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { habitsTable, habitLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/habits", requireAuth, async (req: any, res) => {
  try {
    const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, req.userId));
    res.json(habits);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits", requireAuth, async (req: any, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const [habit] = await db.insert(habitsTable).values({ name, icon: icon || "✅", color: color || "#D4890A", userId: req.userId }).returning();
    res.status(201).json(habit);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/habits/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(habitsTable).where(and(eq(habitsTable.id, id), eq(habitsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/habits/today-logs", requireAuth, async (req: any, res) => {
  const today = new Date().toISOString().split("T")[0];
  try {
    const logs = await db.select().from(habitLogsTable).where(and(eq(habitLogsTable.userId, req.userId), eq(habitLogsTable.date, today)));
    res.json(logs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits/:id/log", requireAuth, async (req: any, res) => {
  const habitId = parseInt(req.params.id);
  const { date, completed } = req.body;
  if (!date) return res.status(400).json({ error: "Date is required" });
  try {
    const [log] = await db.insert(habitLogsTable).values({ habitId, userId: req.userId, date, completed: completed ?? true }).returning();
    res.status(201).json(log);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
