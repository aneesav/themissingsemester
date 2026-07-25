import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db, lessonsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /lessons
router.get("/lessons", async (_req: Request, res: Response): Promise<void> => {
  const lessons = await db
    .select()
    .from(lessonsTable)
    .orderBy(asc(lessonsTable.moduleNum), asc(lessonsTable.lessonNum));

  // Group by module
  const moduleMap = new Map<number, { moduleNum: number; title: string; description: string; lessons: typeof lessons }>();

  const moduleMeta: Record<number, { title: string; description: string }> = {
    1: { title: "Data Types", description: "Explore the core data types in modern bioinformatics: single-cell RNA sequencing, spatial transcriptomics, and proteomics." },
    2: { title: "Multi-omics", description: "Integrate multiple data modalities to uncover biological insights that no single data type can reveal alone." },
    3: { title: "Reproducibility & Scale", description: "Make your analyses reproducible and scalable using Docker containers and Nextflow workflow management." },
    4: { title: "AI in Multi-omics", description: "Apply foundation models and large language models to multi-omics data analysis." },
  };

  for (const lesson of lessons) {
    if (!moduleMap.has(lesson.moduleNum)) {
      const meta = moduleMeta[lesson.moduleNum] ?? { title: `Module ${lesson.moduleNum}`, description: "" };
      moduleMap.set(lesson.moduleNum, {
        moduleNum: lesson.moduleNum,
        title: meta.title,
        description: meta.description,
        lessons: [],
      });
    }
    moduleMap.get(lesson.moduleNum)!.lessons.push(lesson);
  }

  res.json(Array.from(moduleMap.values()).sort((a, b) => a.moduleNum - b.moduleNum));
});

// GET /lessons/:lessonId
router.get("/lessons/:lessonId", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.lessonId) ? req.params.lessonId[0] : req.params.lessonId;
  const lessonId = parseInt(raw, 10);
  if (isNaN(lessonId)) {
    res.status(400).json({ error: "Invalid lesson ID" });
    return;
  }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.id, lessonId));

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.json(lesson);
});

export default router;
