import { Router, type IRouter, type Request, type Response } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, usersTable, progressTable, sessionsTable, lessonsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [totalLearners] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "learner"));

  const [sessionsToday] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(sql`${sessionsTable.createdAt} >= ${startOfToday}`);

  const [sessionsThisWeek] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(sql`${sessionsTable.createdAt} >= ${startOfWeek}`);

  const [lessonsCompleted] = await db
    .select({ count: count() })
    .from(progressTable)
    .where(sql`${progressTable.completedAt} IS NOT NULL`);

  const [activeSessions] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "running"));

  res.json({
    totalLearners: totalLearners.count,
    sessionsToday: sessionsToday.count,
    sessionsThisWeek: sessionsThisWeek.count,
    lessonsCompleted: lessonsCompleted.count,
    activeSessions: activeSessions.count,
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const users = await db.select().from(usersTable);

  const result = await Promise.all(
    users.map(async (user) => {
      const [started] = await db
        .select({ count: count() })
        .from(progressTable)
        .where(eq(progressTable.userId, user.id));

      const [completed] = await db
        .select({ count: count() })
        .from(progressTable)
        .where(sql`${progressTable.userId} = ${user.id} AND ${progressTable.completedAt} IS NOT NULL`);

      const [lastSession] = await db
        .select({ createdAt: sessionsTable.createdAt })
        .from(sessionsTable)
        .where(eq(sessionsTable.userId, user.id))
        .orderBy(sql`${sessionsTable.createdAt} DESC`)
        .limit(1);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastActiveAt: lastSession?.createdAt ?? null,
        lessonsStarted: started.count,
        lessonsCompleted: completed.count,
      };
    }),
  );

  res.json(result);
});

// GET /admin/lessons/funnel
router.get("/admin/lessons/funnel", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const lessons = await db
    .select()
    .from(lessonsTable)
    .orderBy(sql`${lessonsTable.moduleNum} ASC, ${lessonsTable.lessonNum} ASC`);

  const result = await Promise.all(
    lessons.map(async (lesson) => {
      const [started] = await db
        .select({ count: count() })
        .from(progressTable)
        .where(eq(progressTable.lessonId, lesson.id));

      const [completed] = await db
        .select({ count: count() })
        .from(progressTable)
        .where(sql`${progressTable.lessonId} = ${lesson.id} AND ${progressTable.completedAt} IS NOT NULL`);

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleNum: lesson.moduleNum,
        lessonNum: lesson.lessonNum,
        started: started.count,
        completed: completed.count,
      };
    }),
  );

  res.json(result);
});

// GET /admin/sessions
router.get("/admin/sessions", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      userEmail: usersTable.email,
      userName: usersTable.name,
      lessonId: sessionsTable.lessonId,
      lessonTitle: lessonsTable.title,
      status: sessionsTable.status,
      createdAt: sessionsTable.createdAt,
      endedAt: sessionsTable.endedAt,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .innerJoin(lessonsTable, eq(sessionsTable.lessonId, lessonsTable.id))
    .orderBy(sql`${sessionsTable.createdAt} DESC`)
    .limit(100);

  const result = rows.map((row) => ({
    ...row,
    durationMinutes:
      row.endedAt && row.createdAt
        ? Math.round((row.endedAt.getTime() - row.createdAt.getTime()) / 60000)
        : null,
  }));

  res.json(result);
});

export default router;
