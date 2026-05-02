import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { pagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreatePageBody, UpdatePageBody } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/workspaces/:workspaceId/pages", requireAuth, async (req: any, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const pages = await db
      .select()
      .from(pagesTable)
      .where(and(eq(pagesTable.workspaceId, workspaceId), eq(pagesTable.userId, req.userId)));
    res.json(pages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/pages", requireAuth, async (req: any, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const result = CreatePageBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [page] = await db
      .insert(pagesTable)
      .values({ ...result.data, workspaceId, userId: req.userId })
      .returning();
    res.status(201).json(page);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:workspaceId/pages/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    const [page] = await db
      .select()
      .from(pagesTable)
      .where(and(eq(pagesTable.id, id), eq(pagesTable.userId, req.userId)));
    if (!page) return res.status(404).json({ error: "Not found" });
    res.json(page);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:workspaceId/pages/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const result = UpdatePageBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [page] = await db
      .update(pagesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(pagesTable.id, id), eq(pagesTable.userId, req.userId)))
      .returning();
    if (!page) return res.status(404).json({ error: "Not found" });
    res.json(page);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/pages/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(pagesTable)
      .where(and(eq(pagesTable.id, id), eq(pagesTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
