import type { Request, Response, NextFunction } from "express";
import { requireAuth, type AuthedRequest } from "./requireAuth";

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  await requireAuth(req, res, async () => {
    if ((req as AuthedRequest).userRole !== "admin") {
      res.status(403).json({ error: "Forbidden — admin access required" });
      return;
    }
    next();
  });
};
