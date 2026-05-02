import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/workspaces/:workspaceId/tasks", requireAuth, async (req: any, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.workspaceId, workspaceId), eq(tasksTable.userId, req.userId)));
    res.json(tasks);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/tasks", requireAuth, async (req: any, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const result = CreateTaskBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [task] = await db
      .insert(tasksTable)
      .values({ ...result.data, workspaceId, userId: req.userId })
      .returning();
    res.status(201).json(task);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:workspaceId/tasks/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const result = UpdateTaskBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [task] = await db
      .update(tasksTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId)))
      .returning();
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/tasks/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
