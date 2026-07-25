import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, progressTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { UpdateProgressBody } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /progress
router.get("/progress", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const rows = await db
    .select()
    .from(progressTable)
    .where(eq(progressTable.userId, authed.userId));

  res.json(rows);
});

// GET /progress/:lessonId
router.get("/progress/:lessonId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const raw = Array.isArray(req.params.lessonId) ? req.params.lessonId[0] : req.params.lessonId;
  const lessonId = parseInt(raw, 10);
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson ID" });
    return;
  }

  const [row] = await db
    .select()
    .from(progressTable)
    .where(and(eq(progressTable.userId, authed.userId), eq(progressTable.lessonId, lessonId)));

  if (!row) {
    res.status(404).json({ error: "Progress not found" });
    return;
  }

  res.json(row);
});

// PATCH /progress/:lessonId
router.patch("/progress/:lessonId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authed = req as AuthedRequest;
  const raw = Array.isArray(req.params.lessonId) ? req.params.lessonId[0] : req.params.lessonId;
  const lessonId = parseInt(raw, 10);
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson ID" });
    return;
  }

  const parsed = UpdateProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { cellsRun, totalCells, completed } = parsed.data;

  const existing = await db
    .select()
    .from(progressTable)
    .where(and(eq(progressTable.userId, authed.userId), eq(progressTable.lessonId, lessonId)));

  const updateData: Partial<typeof progressTable.$inferInsert> = {
    lastActiveAt: new Date(),
    ...(cellsRun !== undefined && { cellsRun }),
    ...(totalCells !== undefined && { totalCells }),
    ...(completed === true && { completedAt: new Date() }),
    ...(completed === false && { completedAt: undefined }),
  };

  let row;
  if (existing.length === 0) {
    [row] = await db
      .insert(progressTable)
      .values({
        userId: authed.userId,
        lessonId,
        cellsRun: cellsRun ?? 0,
        totalCells: totalCells ?? 0,
        lastActiveAt: new Date(),
        ...(completed === true && { completedAt: new Date() }),
      })
      .returning();
  } else {
    [row] = await db
      .update(progressTable)
      .set(updateData)
      .where(and(eq(progressTable.userId, authed.userId), eq(progressTable.lessonId, lessonId)))
      .returning();
  }

  res.json(row);
});

export default router;
