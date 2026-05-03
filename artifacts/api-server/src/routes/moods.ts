import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { moodsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";
import { count } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/moods", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(moodsTable)
        .where(eq(moodsTable.userId, req.userId))
        .orderBy(desc(moodsTable.date))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(moodsTable)
        .where(eq(moodsTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/moods", requireAuth, async (req: any, res, next) => {
  const { mood, note, date } = req.body;
  if (!mood || !date) return res.status(400).json({ error: "Mood and date are required" });
  if (typeof mood !== "number" || mood < 1 || mood > 5) {
    return res.status(400).json({ error: "Mood must be a number between 1 and 5" });
  }
  try {
    const [existing] = await db
      .select()
      .from(moodsTable)
      .where(and(eq(moodsTable.userId, req.userId), eq(moodsTable.date, date)));

    if (existing) {
      return res.status(409).json({ error: "Mood already logged for this date" });
    }

    const [entry] = await db
      .insert(moodsTable)
      .values({ mood, note: note || "", date, userId: req.userId })
      .returning();
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.delete("/moods/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [mood] = await db
      .select()
      .from(moodsTable)
      .where(eq(moodsTable.id, id));

    if (!mood) return res.status(404).json({ error: "Not found" });
    if (mood.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(moodsTable).where(eq(moodsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
