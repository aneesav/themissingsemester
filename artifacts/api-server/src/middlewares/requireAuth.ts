import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthedRequest extends Request {
  userId: number;
  clerkId: string;
  userRole: string;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    // TEMP DEBUG: understand why Clerk session verification fails
    console.log("[auth-debug]", JSON.stringify({
      url: req.originalUrl,
      hasSessionCookie: Boolean(req.headers.cookie?.includes("__session")),
      cookieNames: (req.headers.cookie ?? "").split(";").map((c) => c.split("=")[0]?.trim()),
      host: req.headers.host,
      xForwardedHost: req.headers["x-forwarded-host"],
      authStatus: (auth as any)?.status ?? null,
      authReason: (auth as any)?.reason ?? null,
      authMessage: (auth as any)?.message ?? null,
    }));
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (!user) {
    res.status(401).json({ error: "User not found — please sync your account" });
    return;
  }

  (req as AuthedRequest).userId = user.id;
  (req as AuthedRequest).clerkId = clerkId;
  (req as AuthedRequest).userRole = user.role;
  next();
};

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
