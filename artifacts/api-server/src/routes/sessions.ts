import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, sessionsTable, apiKeysTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { CreateSessionBody } from "@workspace/api-zod";
import { launchJupyterTask, resolveTaskPublicIp, stopTask } from "../lib/aws";
import crypto from "crypto";

const router: IRouter = Router();

const ALGO = "aes-256-cbc";
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-do-not-use-in-prod-00";
const KEY = crypto.scryptSync(SECRET, "missing-semester-salt", 32);

function decryptKey(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encData = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  return Buffer.concat([decipher.update(encData), decipher.final()]).toString("utf8");
}

function getPlatformApiUrl(req: Request): string {
  // In production the platform URL is the public domain; in dev use the Replit dev domain
  const host = req.get("host") ?? "localhost";
  const protocol = req.secure || host.includes("replit.dev") ? "https" : "http";
  return `${protocol}://${host}`;
}

// POST /sessions — start or resume a container session
router.post("/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;

  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { lessonId } = parsed.data;

  // Resume an existing active session for this lesson
  const [existing] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, authed.userId), eq(sessionsTable.lessonId, lessonId)))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(1);

  if (existing && ["running", "paused", "starting"].includes(existing.status)) {
    res.status(201).json(existing);
    return;
  }

  // Create session record first (so we have an ID for bootstrap.sh)
  const [session] = await db
    .insert(sessionsTable)
    .values({ userId: authed.userId, lessonId, status: "starting" })
    .returning();

  // Retrieve and decrypt learner API keys to inject into container env
  const keyRows = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, authed.userId));

  const apiKeys: Record<string, string> = {};
  for (const row of keyRows) {
    try {
      apiKeys[row.service] = decryptKey(row.encryptedKey);
    } catch {
      req.log.warn({ service: row.service }, "Failed to decrypt API key — skipping");
    }
  }

  const platformApiUrl = getPlatformApiUrl(req);

  try {
    const { ecsTaskArn, jupyterToken } = await launchJupyterTask({
      sessionId: session.id,
      lessonId,
      platformApiUrl,
      apiKeys,
    });

    // Store task ARN; containerUrl will be filled in when bootstrap signals ready
    const [updated] = await db
      .update(sessionsTable)
      .set({
        ecsTaskArn,
        // Temporarily store token in containerUrl until IP is resolved
        containerUrl: `__token__${jupyterToken}`,
      })
      .where(eq(sessionsTable.id, session.id))
      .returning();

    req.log.info({ sessionId: session.id, ecsTaskArn }, "ECS task launched");
    res.status(201).json(updated);
  } catch (err) {
    req.log.error({ err, sessionId: session.id }, "Failed to launch ECS task");
    await db
      .update(sessionsTable)
      .set({ status: "error" })
      .where(eq(sessionsTable.id, session.id));
    res.status(500).json({ error: "Failed to start notebook container" });
  }
});

// PATCH /sessions/:sessionId/ready — called by bootstrap.sh inside the container
router.patch("/sessions/:sessionId/ready", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const sessionId = parseInt(raw, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session?.ecsTaskArn) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Only a starting session can transition; repeated/forged calls are no-ops.
  if (session.status !== "starting") {
    res.sendStatus(204);
    return;
  }

  // Extract the Jupyter token we stored temporarily
  const token = session.containerUrl?.startsWith("__token__")
    ? session.containerUrl.slice("__token__".length)
    : null;

  // Authenticate the container: bootstrap.sh sends its Jupyter token as a
  // bearer header. If a header is present it must match. (Absent header is
  // tolerated only until all container images send it — see docker/bootstrap.sh.)
  const authHeader = req.get("authorization");
  if (authHeader) {
    if (!token || authHeader !== `Bearer ${token}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } else {
    req.log.warn({ sessionId }, "ready called without bearer token (old container image)");
  }

  // Resolve the container's public IP from ECS/EC2 — this also implicitly
  // verifies that a real task for this session is actually running.
  const publicIp = await resolveTaskPublicIp(session.ecsTaskArn);

  const containerUrl = publicIp && token
    ? `http://${publicIp}:8888/lab?token=${token}`
    : null;

  await db
    .update(sessionsTable)
    .set({ status: "running", containerUrl })
    .where(eq(sessionsTable.id, sessionId));

  // Never return session data (containerUrl carries the Jupyter token) —
  // this endpoint is reachable by the container network, not just users.
  res.sendStatus(204);
});

// GET /sessions/active — must come before /:sessionId
router.get("/sessions/active", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, authed.userId), eq(sessionsTable.status, "running")))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(1);

  if (session) {
    await db
      .update(sessionsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessionsTable.id, session.id));
  }

  res.json({ session: session ?? null });
});

// GET /sessions/:sessionId — also polls ECS for IP if still starting
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

  // Heartbeat: polling this endpoint keeps the session alive for the reaper
  if (["starting", "running"].includes(session.status)) {
    await db
      .update(sessionsTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessionsTable.id, sessionId));
  }

  // If still starting and we have a task ARN, check if ECS is running yet
  if (session.status === "starting" && session.ecsTaskArn) {
    const publicIp = await resolveTaskPublicIp(session.ecsTaskArn).catch(() => null);
    if (publicIp) {
      const token = session.containerUrl?.startsWith("__token__")
        ? session.containerUrl.slice("__token__".length)
        : null;
      if (token) {
        const containerUrl = `http://${publicIp}:8888/lab?token=${token}`;
        const [updated] = await db
          .update(sessionsTable)
          .set({ status: "running", containerUrl })
          .where(eq(sessionsTable.id, sessionId))
          .returning();
        res.json(updated);
        return;
      }
    }
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

  if (session.ecsTaskArn) {
    await stopTask(session.ecsTaskArn).catch((err) =>
      req.log.warn({ err }, "Failed to stop ECS task (may already be stopped)"),
    );
  }

  await db
    .update(sessionsTable)
    .set({ status: "stopped", endedAt: new Date() })
    .where(eq(sessionsTable.id, sessionId));

  res.sendStatus(204);
});

export default router;
