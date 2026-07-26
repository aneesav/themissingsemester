import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /users/me
router.get("/users/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, authed.userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// POST /users/sync — called from frontend after Clerk sign-in
router.post("/users/sync", async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fetch profile from Clerk — never trust the client for identity fields.
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email?.split("@")[0] ||
    "Learner";

  if (!email) {
    res.status(400).json({ error: "No email address on Clerk account" });
    return;
  }

  // Upsert user
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, name })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({ clerkId, email, name, role: "learner" })
    .returning();

  res.json(created);
});

export default router;
