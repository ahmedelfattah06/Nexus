import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { habitsTable, habitLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { calculateStreak } from "../utils/streak";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/habits", requireAuth, async (req: any, res, next) => {
  try {
    const habits = await db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.userId, req.userId));

    const today = new Date().toISOString().split("T")[0];

    const habitsWithStreak = await Promise.all(
      habits.map(async (habit) => {
        const logs = await db
          .select({ date: habitLogsTable.date })
          .from(habitLogsTable)
          .where(
            and(
              eq(habitLogsTable.habitId, habit.id),
              eq(habitLogsTable.completed, true)
            )
          )
          .orderBy(desc(habitLogsTable.date));

        return {
          ...habit,
          streak: calculateStreak(logs),
          completedToday: logs.length > 0 && logs[0].date === today,
        };
      })
    );

    res.json(habitsWithStreak);
  } catch (err) {
    next(err);
  }
});

router.post("/habits", requireAuth, async (req: any, res, next) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const [habit] = await db
      .insert(habitsTable)
      .values({
        name,
        icon: icon || "✅",
        color: color || "#D4890A",
        userId: req.userId,
      })
      .returning();
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

router.delete("/habits/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [habit] = await db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.id, id));

    if (!habit) return res.status(404).json({ error: "Not found" });
    if (habit.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(habitLogsTable).where(eq(habitLogsTable.habitId, id));
    await db.delete(habitsTable).where(eq(habitsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/habits/today-logs", requireAuth, async (req: any, res, next) => {
  const today = new Date().toISOString().split("T")[0];
  try {
    const logs = await db
      .select()
      .from(habitLogsTable)
      .where(
        and(
          eq(habitLogsTable.userId, req.userId),
          eq(habitLogsTable.date, today)
        )
      );
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.post("/habits/:id/log", requireAuth, async (req: any, res, next) => {
  const habitId = parseInt(req.params.id);
  const { date, completed } = req.body;
  if (!date) return res.status(400).json({ error: "Date is required" });
  try {
    const [habit] = await db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habitId));

    if (!habit) return res.status(404).json({ error: "Not found" });
    if (habit.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [existing] = await db
      .select()
      .from(habitLogsTable)
      .where(
        and(
          eq(habitLogsTable.habitId, habitId),
          eq(habitLogsTable.date, date)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(habitLogsTable)
        .set({ completed: completed ?? true })
        .where(eq(habitLogsTable.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [log] = await db
      .insert(habitLogsTable)
      .values({
        habitId,
        userId: req.userId,
        date,
        completed: completed ?? true,
      })
      .returning();
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.delete("/habits/:id/log/today", requireAuth, async (req: any, res, next) => {
  const habitId = parseInt(req.params.id);
  const today = new Date().toISOString().split("T")[0];
  try {
    const [habit] = await db
      .select()
      .from(habitsTable)
      .where(eq(habitsTable.id, habitId));

    if (!habit) return res.status(404).json({ error: "Not found" });
    if (habit.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db
      .delete(habitLogsTable)
      .where(
        and(
          eq(habitLogsTable.habitId, habitId),
          eq(habitLogsTable.date, today)
        )
      );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
