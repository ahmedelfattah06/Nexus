import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  workspacesTable,
  pagesTable,
  tasksTable,
  focusSessionsTable,
  habitsTable,
  habitLogsTable,
} from "@workspace/db";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { calculateStreak } from "../utils/streak";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/dashboard/stats", requireAuth, async (req: any, res, next) => {
  try {
    const userId = req.userId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [workspaceCount] = await db
      .select({ count: count() })
      .from(workspacesTable)
      .where(eq(workspacesTable.userId, userId));

    const [taskCount] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.userId, userId));

    const [pageCount] = await db
      .select({ count: count() })
      .from(pagesTable)
      .where(eq(pagesTable.userId, userId));

    const [completedTasksThisWeek] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.userId, userId),
          eq(tasksTable.status, "done"),
          gte(tasksTable.updatedAt, weekAgo)
        )
      );

    const sessions = await db
      .select({ focusScore: focusSessionsTable.focusScore })
      .from(focusSessionsTable)
      .where(
        and(
          eq(focusSessionsTable.userId, userId),
          gte(focusSessionsTable.date, weekAgo)
        )
      );

    const avgFocusScore =
      sessions.length > 0
        ? Math.round(
            sessions.reduce((s, r) => s + r.focusScore, 0) / sessions.length
          )
        : 0;

    const habits = await db
      .select({ id: habitsTable.id })
      .from(habitsTable)
      .where(eq(habitsTable.userId, userId));

    let streakDays = 0;

    if (habits.length > 0) {
      const allLogs = await db
        .select({ date: habitLogsTable.date })
        .from(habitLogsTable)
        .where(
          and(
            eq(habitLogsTable.userId, userId),
            eq(habitLogsTable.completed, true)
          )
        )
        .orderBy(desc(habitLogsTable.date));

      streakDays = calculateStreak(allLogs);
    }

    res.json({
      tasksCompletedThisWeek: completedTasksThisWeek.count,
      notesWritten: pageCount.count,
      streakDays,
      flowScore: avgFocusScore,
      totalWorkspaces: workspaceCount.count,
      totalTasks: taskCount.count,
      totalPages: pageCount.count,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/recent-pages", requireAuth, async (req: any, res, next) => {
  try {
    const pages = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        workspaceId: pagesTable.workspaceId,
        workspaceName: workspacesTable.name,
        updatedAt: pagesTable.updatedAt,
      })
      .from(pagesTable)
      .leftJoin(workspacesTable, eq(pagesTable.workspaceId, workspacesTable.id))
      .where(eq(pagesTable.userId, req.userId))
      .orderBy(desc(pagesTable.updatedAt))
      .limit(5);
    res.json(pages);
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/today-tasks", requireAuth, async (req: any, res, next) => {
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(
        and(eq(tasksTable.userId, req.userId), eq(tasksTable.status, "todo"))
      )
      .orderBy(desc(tasksTable.priority))
      .limit(3);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

export default router;
