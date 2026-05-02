import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { flashcardSetsTable, flashcardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/flashcard-sets", requireAuth, async (req: any, res) => {
  try {
    const sets = await db.select().from(flashcardSetsTable).where(eq(flashcardSetsTable.userId, req.userId));
    res.json(sets);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/flashcard-sets", requireAuth, async (req: any, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [set] = await db.insert(flashcardSetsTable).values({ title, description: description || "", userId: req.userId }).returning();
    res.status(201).json(set);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/flashcard-sets/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(flashcardsTable).where(and(eq(flashcardsTable.setId, id), eq(flashcardsTable.userId, req.userId)));
    await db.delete(flashcardSetsTable).where(and(eq(flashcardSetsTable.id, id), eq(flashcardSetsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/flashcard-sets/:id/cards", requireAuth, async (req: any, res) => {
  const setId = parseInt(req.params.id);
  try {
    const cards = await db.select().from(flashcardsTable).where(and(eq(flashcardsTable.setId, setId), eq(flashcardsTable.userId, req.userId)));
    res.json(cards);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/flashcard-sets/:id/cards", requireAuth, async (req: any, res) => {
  const setId = parseInt(req.params.id);
  const { front, back } = req.body;
  if (!front || !back) return res.status(400).json({ error: "Front and back are required" });
  try {
    const [card] = await db.insert(flashcardsTable).values({ setId, front, back, userId: req.userId }).returning();
    res.status(201).json(card);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/flashcards/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(flashcardsTable).where(and(eq(flashcardsTable.id, id), eq(flashcardsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
