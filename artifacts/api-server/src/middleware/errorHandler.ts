import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof Error) {
    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.status(500).json({ error: "Unknown error" });
}
