import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

async function hasAnyAdmin() {
  const [row] = await db.select({ c: count() }).from(adminsTable);
  return row.c > 0;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [admin] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.userId, userId))
      .limit(1);

    if (!admin && await hasAnyAdmin()) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    (req as any).userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}
