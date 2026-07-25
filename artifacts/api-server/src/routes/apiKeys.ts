import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { UpsertApiKeyBody } from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

// Simple symmetric encryption for API keys using SESSION_SECRET
// In Phase 2 this will be replaced by AWS KMS
const ALGO = "aes-256-cbc";
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-do-not-use-in-prod-00";
const KEY = crypto.scryptSync(SECRET, "missing-semester-salt", 32);

function encryptKey(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

// GET /api-keys
router.get("/api-keys", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const keys = await db
    .select({
      id: apiKeysTable.id,
      userId: apiKeysTable.userId,
      service: apiKeysTable.service,
      maskedKey: apiKeysTable.maskedKey,
      createdAt: apiKeysTable.createdAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, authed.userId));

  res.json(keys);
});

// PUT /api-keys/:service
router.put("/api-keys/:service", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const service = Array.isArray(req.params.service) ? req.params.service[0] : req.params.service;

  const parsed = UpsertApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { key } = parsed.data;
  const encryptedKey = encryptKey(key);
  const maskedKey = maskKey(key);

  const existing = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, authed.userId), eq(apiKeysTable.service, service)));

  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(apiKeysTable)
      .set({ encryptedKey, maskedKey })
      .where(and(eq(apiKeysTable.userId, authed.userId), eq(apiKeysTable.service, service)))
      .returning({
        id: apiKeysTable.id,
        userId: apiKeysTable.userId,
        service: apiKeysTable.service,
        maskedKey: apiKeysTable.maskedKey,
        createdAt: apiKeysTable.createdAt,
      });
  } else {
    [row] = await db
      .insert(apiKeysTable)
      .values({ userId: authed.userId, service, encryptedKey, maskedKey })
      .returning({
        id: apiKeysTable.id,
        userId: apiKeysTable.userId,
        service: apiKeysTable.service,
        maskedKey: apiKeysTable.maskedKey,
        createdAt: apiKeysTable.createdAt,
      });
  }

  res.json(row);
});

// DELETE /api-keys/:service
router.delete("/api-keys/:service", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const service = Array.isArray(req.params.service) ? req.params.service[0] : req.params.service;

  const [deleted] = await db
    .delete(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, authed.userId), eq(apiKeysTable.service, service)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
