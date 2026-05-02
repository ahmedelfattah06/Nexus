import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { bookmarksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/bookmarks", requireAuth, async (req: any, res) => {
  try {
    const bookmarks = await db.select().from(bookmarksTable).where(eq(bookmarksTable.userId, req.userId));
    res.json(bookmarks);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookmarks", requireAuth, async (req: any, res) => {
  const { title, url, description, tags } = req.body;
  if (!title || !url) return res.status(400).json({ error: "Title and URL are required" });
  try {
    const [bookmark] = await db.insert(bookmarksTable).values({ title, url, description: description || "", tags, userId: req.userId }).returning();
    res.status(201).json(bookmark);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bookmarks/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(bookmarksTable).where(and(eq(bookmarksTable.id, id), eq(bookmarksTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
