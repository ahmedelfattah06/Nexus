import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { workspacesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
} from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/workspaces", requireAuth, async (req: any, res) => {
  try {
    const workspaces = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.userId, req.userId));
    res.json(workspaces);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces", requireAuth, async (req: any, res) => {
  const result = CreateWorkspaceBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [workspace] = await db
      .insert(workspacesTable)
      .values({ ...result.data, userId: req.userId })
      .returning();
    res.status(201).json(workspace);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, req.userId)));
    if (!workspace) return res.status(404).json({ error: "Not found" });
    res.json(workspace);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const result = UpdateWorkspaceBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [workspace] = await db
      .update(workspacesTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, req.userId)))
      .returning();
    if (!workspace) return res.status(404).json({ error: "Not found" });
    res.json(workspace);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(workspacesTable)
      .where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
