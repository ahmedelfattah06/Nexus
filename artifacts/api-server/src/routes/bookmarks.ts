import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { bookmarksTable } from "@workspace/db";
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

router.get("/bookmarks", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(bookmarksTable)
        .where(eq(bookmarksTable.userId, req.userId))
        .orderBy(desc(bookmarksTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(bookmarksTable)
        .where(eq(bookmarksTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/bookmarks", requireAuth, async (req: any, res, next) => {
  const { title, url, description, tags } = req.body;
  if (!title || !url) return res.status(400).json({ error: "Title and URL are required" });
  try {
    const [bookmark] = await db
      .insert(bookmarksTable)
      .values({ title, url, description: description || "", tags, userId: req.userId })
      .returning();
    res.status(201).json(bookmark);
  } catch (err) {
    next(err);
  }
});

router.delete("/bookmarks/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [bookmark] = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.id, id));

    if (!bookmark) return res.status(404).json({ error: "Not found" });
    if (bookmark.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(bookmarksTable).where(eq(bookmarksTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
