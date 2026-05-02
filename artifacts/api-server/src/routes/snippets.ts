import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { snippetsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateSnippetBody, UpdateSnippetBody } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/snippets", requireAuth, async (req: any, res) => {
  try {
    const snippets = await db
      .select()
      .from(snippetsTable)
      .where(eq(snippetsTable.userId, req.userId));
    res.json(snippets);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/snippets", requireAuth, async (req: any, res) => {
  const result = CreateSnippetBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [snippet] = await db
      .insert(snippetsTable)
      .values({ ...result.data, userId: req.userId })
      .returning();
    res.status(201).json(snippet);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/snippets/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const result = UpdateSnippetBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [snippet] = await db
      .update(snippetsTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(snippetsTable.id, id), eq(snippetsTable.userId, req.userId)))
      .returning();
    if (!snippet) return res.status(404).json({ error: "Not found" });
    res.json(snippet);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/snippets/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(snippetsTable)
      .where(and(eq(snippetsTable.id, id), eq(snippetsTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
