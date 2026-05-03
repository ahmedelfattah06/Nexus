import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { flashcardSetsTable, flashcardsTable } from "@workspace/db";
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

router.get("/flashcard-sets", requireAuth, async (req: any, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(flashcardSetsTable)
        .where(eq(flashcardSetsTable.userId, req.userId))
        .orderBy(desc(flashcardSetsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(flashcardSetsTable)
        .where(eq(flashcardSetsTable.userId, req.userId)),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/flashcard-sets", requireAuth, async (req: any, res, next) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const [set] = await db
      .insert(flashcardSetsTable)
      .values({ title, description: description || "", userId: req.userId })
      .returning();
    res.status(201).json(set);
  } catch (err) {
    next(err);
  }
});

router.delete("/flashcard-sets/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(flashcardsTable).where(eq(flashcardsTable.setId, id));
    await db.delete(flashcardSetsTable).where(eq(flashcardSetsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/flashcard-sets/:id/cards", requireAuth, async (req: any, res, next) => {
  const setId = parseInt(req.params.id);
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [existingSet] = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.id, setId));

    if (!existingSet) return res.status(404).json({ error: "Not found" });
    if (existingSet.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [items, [countResult]] = await Promise.all([
      db
        .select()
        .from(flashcardsTable)
        .where(and(eq(flashcardsTable.setId, setId), eq(flashcardsTable.userId, req.userId)))
        .orderBy(desc(flashcardsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(flashcardsTable)
        .where(and(eq(flashcardsTable.setId, setId), eq(flashcardsTable.userId, req.userId))),
    ]);

    const total = Number(countResult?.count ?? 0);
    res.json({ data: items, pagination: buildPaginationMeta(page, limit, total) });
  } catch (err) {
    next(err);
  }
});

router.post("/flashcard-sets/:id/cards", requireAuth, async (req: any, res, next) => {
  const setId = parseInt(req.params.id);
  const { front, back } = req.body;
  if (!front || !back) return res.status(400).json({ error: "Front and back are required" });
  try {
    const [existingSet] = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.id, setId));

    if (!existingSet) return res.status(404).json({ error: "Not found" });
    if (existingSet.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const [card] = await db
      .insert(flashcardsTable)
      .values({ setId, front, back, userId: req.userId })
      .returning();
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

router.delete("/flashcards/:id", requireAuth, async (req: any, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.id, id));

    if (!existing) return res.status(403).json({ error: "Not found or forbidden" });
    if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await db.delete(flashcardsTable).where(eq(flashcardsTable.id, id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
