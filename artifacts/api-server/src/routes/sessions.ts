import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { focusSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSessionBody } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/sessions", requireAuth, async (req: any, res) => {
  try {
    const sessions = await db
      .select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.userId, req.userId));
    res.json(sessions);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sessions", requireAuth, async (req: any, res) => {
  const result = CreateSessionBody.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const [session] = await db
      .insert(focusSessionsTable)
      .values({ ...result.data, userId: req.userId })
      .returning();
    res.status(201).json(session);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
