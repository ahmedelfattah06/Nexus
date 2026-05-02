import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { moodsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/moods", requireAuth, async (req: any, res) => {
  try {
    const moods = await db.select().from(moodsTable).where(eq(moodsTable.userId, req.userId));
    res.json(moods);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/moods", requireAuth, async (req: any, res) => {
  const { mood, note, date } = req.body;
  if (!mood || !date) return res.status(400).json({ error: "Mood and date are required" });
  try {
    const [entry] = await db.insert(moodsTable).values({ mood, note: note || "", date, userId: req.userId }).returning();
    res.status(201).json(entry);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
