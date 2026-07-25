import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { CreateSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /sessions — start or resume
router.post("/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;

  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lessonId } = parsed.data;

  // Check for an existing active session for this lesson
  const existing = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, authed.userId),
        eq(sessionsTable.lessonId, lessonId),
        // Resume running or paused sessions
      ),
    )
    .orderBy(desc(sessionsTable.createdAt))
    .limit(1);

  if (existing.length > 0 && (existing[0].status === "running" || existing[0].status === "paused" || existing[0].status === "starting")) {
    res.status(201).json(existing[0]);
    return;
  }

  // Create new session record (ECS launch handled in Phase 2)
  req.log.info({ userId: authed.userId, lessonId }, "Creating new session — ECS launch pending Phase 2");

  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: authed.userId,
      lessonId,
      status: "starting",
    })
    .returning();

  // TODO (Phase 2): Launch AWS ECS Fargate task here, update session with ecsTaskArn + containerUrl

  res.status(201).json(session);
});

// GET /sessions/active — must come before /:sessionId
router.get("/sessions/active", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, authed.userId),
        eq(sessionsTable.status, "running"),
      ),
    )
    .orderBy(desc(sessionsTable.createdAt))
    .limit(1);

  res.json({ session: session ?? null });
});

// GET /sessions/:sessionId
router.get("/sessions/:sessionId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const raw = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const sessionId = parseInt(raw, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, authed.userId)));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(session);
});

// DELETE /sessions/:sessionId — stop a session
router.delete("/sessions/:sessionId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const raw = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const sessionId = parseInt(raw, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, authed.userId)));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // TODO (Phase 2): Stop ECS task here

  await db
    .update(sessionsTable)
    .set({ status: "stopped", endedAt: new Date() })
    .where(eq(sessionsTable.id, sessionId));

  res.sendStatus(204);
});

export default router;
