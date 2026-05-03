import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  adminsTable,
  workspacesTable,
  pagesTable,
  tasksTable,
  snippetsTable,
  habitsTable,
  habitLogsTable,
  moodsTable,
  goalsTable,
  conversations,
  messages,
  focusSessionsTable,
  bookmarksTable,
  flashcardSetsTable,
  flashcardsTable,
} from "@workspace/db";
import { eq, count, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

async function fetchClerkUsers(userIds: string[]): Promise<Record<string, any>> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || userIds.length === 0) return {};

  try {
    const params = new URLSearchParams();
    userIds.forEach((id) => params.append("user_id", id));
    params.set("limit", "100");

    const resp = await fetch(`https://api.clerk.com/v1/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!resp.ok) return {};
    const data = (await resp.json()) as any[];
    const map: Record<string, any> = {};
    for (const u of data) {
      map[u.id] = {
        id: u.id,
        email: u.email_addresses?.[0]?.email_address ?? "—",
        name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
        imageUrl: u.image_url,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      };
    }
    return map;
  } catch {
    return {};
  }
}

router.get("/admin/check", requireAuth, async (req: any, res, next) => {
  try {
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.userId, req.userId))
      .limit(1);
    res.json({ isAdmin: !!admin });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/seed", requireAuth, async (req: any, res, next) => {
  try {
    const [existing] = await db.select({ c: count() }).from(adminsTable);
    if (existing.c > 0) {
      return res.status(403).json({ error: "Admin already exists. Contact an existing admin." });
    }
    const [admin] = await db
      .insert(adminsTable)
      .values({ userId: req.userId })
      .returning();
    res.status(201).json({ success: true, admin });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/stats", requireAdmin, async (_req, res, next) => {
  try {
    const [users] = await db.select({ c: count() }).from(workspacesTable);
    const [wsCount] = await db.select({ c: count() }).from(workspacesTable);
    const [pageCount] = await db.select({ c: count() }).from(pagesTable);
    const [taskCount] = await db.select({ c: count() }).from(tasksTable);
    const [snippetCount] = await db.select({ c: count() }).from(snippetsTable);
    const [habitCount] = await db.select({ c: count() }).from(habitsTable);
    const [moodCount] = await db.select({ c: count() }).from(moodsTable);
    const [goalCount] = await db.select({ c: count() }).from(goalsTable);
    const [convCount] = await db.select({ c: count() }).from(conversations);
    const [msgCount] = await db.select({ c: count() }).from(messages);
    const [sessionCount] = await db.select({ c: count() }).from(focusSessionsTable);
    const [bookmarkCount] = await db.select({ c: count() }).from(bookmarksTable);
    const [flashcardSetCount] = await db.select({ c: count() }).from(flashcardSetsTable);
    const [flashcardCount] = await db.select({ c: count() }).from(flashcardsTable);
    const [adminCount] = await db.select({ c: count() }).from(adminsTable);

    const distinctUsers = await db
      .selectDistinct({ userId: workspacesTable.userId })
      .from(workspacesTable);

    res.json({
      uniqueUsers: distinctUsers.length,
      workspaces: wsCount.c,
      pages: pageCount.c,
      tasks: taskCount.c,
      snippets: snippetCount.c,
      habits: habitCount.c,
      moods: moodCount.c,
      goals: goalCount.c,
      conversations: convCount.c,
      messages: msgCount.c,
      focusSessions: sessionCount.c,
      bookmarks: bookmarkCount.c,
      flashcardSets: flashcardSetCount.c,
      flashcards: flashcardCount.c,
      admins: adminCount.c,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const wsUsers = await db
      .selectDistinct({ userId: workspacesTable.userId })
      .from(workspacesTable);

    const taskUsers = await db
      .selectDistinct({ userId: tasksTable.userId })
      .from(tasksTable);

    const pageUsers = await db
      .selectDistinct({ userId: pagesTable.userId })
      .from(pagesTable);

    const allUserIds = [
      ...new Set([
        ...wsUsers.map((r) => r.userId),
        ...taskUsers.map((r) => r.userId),
        ...pageUsers.map((r) => r.userId),
      ]),
    ];

    const clerkUsers = await fetchClerkUsers(allUserIds);

    const adminRows = await db.select({ userId: adminsTable.userId }).from(adminsTable);
    const adminSet = new Set(adminRows.map((a) => a.userId));

    const [wsCounts] = await Promise.all([
      db.select({ userId: workspacesTable.userId, c: count() })
        .from(workspacesTable)
        .groupBy(workspacesTable.userId),
    ]);

    const wsMap: Record<string, number> = {};
    for (const row of wsCounts as any[]) wsMap[row.userId] = Number(row.c);

    const users = allUserIds.map((userId) => ({
      userId,
      isAdmin: adminSet.has(userId),
      workspaces: wsMap[userId] ?? 0,
      ...(clerkUsers[userId] ?? { email: "—", name: "—", imageUrl: null }),
    }));

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get("/admin/users/:userId/data", requireAdmin, async (req: any, res, next) => {
  const userId = req.params.userId as string;
  try {
    const [wsCount] = await db.select({ c: count() }).from(workspacesTable).where(eq(workspacesTable.userId, userId));
    const [pageCount] = await db.select({ c: count() }).from(pagesTable).where(eq(pagesTable.userId, userId));
    const [taskCount] = await db.select({ c: count() }).from(tasksTable).where(eq(tasksTable.userId, userId));
    const [habitCount] = await db.select({ c: count() }).from(habitsTable).where(eq(habitsTable.userId, userId));
    const [moodCount] = await db.select({ c: count() }).from(moodsTable).where(eq(moodsTable.userId, userId));
    const [goalCount] = await db.select({ c: count() }).from(goalsTable).where(eq(goalsTable.userId, userId));
    const [snippetCount] = await db.select({ c: count() }).from(snippetsTable).where(eq(snippetsTable.userId, userId));
    const [bookmarkCount] = await db.select({ c: count() }).from(bookmarksTable).where(eq(bookmarksTable.userId, userId));
    const [sessionCount] = await db.select({ c: count() }).from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId));

    res.json({
      userId,
      workspaces: wsCount.c,
      pages: pageCount.c,
      tasks: taskCount.c,
      habits: habitCount.c,
      moods: moodCount.c,
      goals: goalCount.c,
      snippets: snippetCount.c,
      bookmarks: bookmarkCount.c,
      focusSessions: sessionCount.c,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/users/:userId/data", requireAdmin, async (req: any, res, next) => {
  const userId = req.params.userId as string;
  try {
    await db.delete(habitLogsTable).where(eq(habitLogsTable.userId, userId));
    await db.delete(habitsTable).where(eq(habitsTable.userId, userId));
    await db.delete(moodsTable).where(eq(moodsTable.userId, userId));
    await db.delete(goalsTable).where(eq(goalsTable.userId, userId));
    await db.delete(tasksTable).where(eq(tasksTable.userId, userId));
    await db.delete(pagesTable).where(eq(pagesTable.userId, userId));
    await db.delete(workspacesTable).where(eq(workspacesTable.userId, userId));
    await db.delete(snippetsTable).where(eq(snippetsTable.userId, userId));
    await db.delete(bookmarksTable).where(eq(bookmarksTable.userId, userId));
    await db.delete(focusSessionsTable).where(eq(focusSessionsTable.userId, userId));
    res.json({ success: true, message: `All data deleted for user ${userId}` });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/users/:userId/promote", requireAdmin, async (req: any, res, next) => {
  const { userId } = req.params;
  if (userId === req.userId) return res.status(400).json({ error: "Cannot modify your own role" });
  try {
    const [existing] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.userId, userId))
      .limit(1);
    if (existing) return res.status(409).json({ error: "User is already an admin" });
    const [admin] = await db.insert(adminsTable).values({ userId }).returning();
    res.status(201).json(admin);
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/users/:userId/promote", requireAdmin, async (req: any, res, next) => {
  const { userId } = req.params;
  if (userId === req.userId) return res.status(400).json({ error: "Cannot remove your own admin role" });
  try {
    await db.delete(adminsTable).where(eq(adminsTable.userId, userId));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/ai-stats", requireAdmin, async (_req, res, next) => {
  try {
    const [convCount] = await db.select({ c: count() }).from(conversations);
    const [msgCount] = await db.select({ c: count() }).from(messages);

    const recentConvs = await db
      .select({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt })
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(20);

    res.json({
      totalConversations: convCount.c,
      totalMessages: msgCount.c,
      avgMessagesPerConv: convCount.c > 0 ? Math.round(Number(msgCount.c) / Number(convCount.c)) : 0,
      recentConversations: recentConvs,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/recent-content", requireAdmin, async (_req, res, next) => {
  try {
    const recentPages = await db
      .select({ id: pagesTable.id, title: pagesTable.title, userId: pagesTable.userId, updatedAt: pagesTable.updatedAt })
      .from(pagesTable)
      .orderBy(desc(pagesTable.updatedAt))
      .limit(10);

    const recentTasks = await db
      .select({ id: tasksTable.id, title: tasksTable.title, userId: tasksTable.userId, status: tasksTable.status, updatedAt: tasksTable.updatedAt })
      .from(tasksTable)
      .orderBy(desc(tasksTable.updatedAt))
      .limit(10);

    const recentGoals = await db
      .select({ id: goalsTable.id, title: goalsTable.title, userId: goalsTable.userId, status: goalsTable.status, progress: goalsTable.progress, updatedAt: goalsTable.updatedAt })
      .from(goalsTable)
      .orderBy(desc(goalsTable.updatedAt))
      .limit(10);

    res.json({ recentPages, recentTasks, recentGoals });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/growth", requireAdmin, async (_req, res, next) => {
  try {
    const pagesByDay = await db.execute(sql`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM pages
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    const tasksByDay = await db.execute(sql`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM tasks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    res.json({
      pagesByDay: pagesByDay.rows,
      tasksByDay: tasksByDay.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
