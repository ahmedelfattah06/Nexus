import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { workspacesTable, pagesTable, tasksTable, focusSessionsTable } from "@workspace/db";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/dashboard/stats", requireAuth, async (req: any, res) => {
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
      .where(and(eq(focusSessionsTable.userId, userId), gte(focusSessionsTable.date, weekAgo)));

    const avgFocusScore =
      sessions.length > 0
        ? Math.round(sessions.reduce((s, r) => s + r.focusScore, 0) / sessions.length)
        : 0;

    const recentDates = await db
      .select({ date: sql<string>`DATE(${focusSessionsTable.date})` })
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.userId, userId))
      .orderBy(desc(focusSessionsTable.date))
      .limit(30);

    let streakDays = 0;
    const today = new Date().toISOString().split("T")[0];
    const dateSet = new Set(recentDates.map((r) => r.date));
    let checkDate = new Date();
    while (dateSet.has(checkDate.toISOString().split("T")[0])) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
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
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-pages", requireAuth, async (req: any, res) => {
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
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/today-tasks", requireAuth, async (req: any, res) => {
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.userId, req.userId), eq(tasksTable.status, "todo")))
      .orderBy(desc(tasksTable.priority))
      .limit(3);
    res.json(tasks);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
