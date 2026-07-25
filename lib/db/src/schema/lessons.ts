import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleNum: integer("module_num").notNull(),
  lessonNum: integer("lesson_num").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectives: json("objectives").$type<string[]>().notNull().default([]),
  notebookPath: text("notebook_path").notNull(),
  requiresApiKeys: boolean("requires_api_keys").notNull().default(false),
  requiredServices: json("required_services").$type<string[]>().notNull().default([]),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
