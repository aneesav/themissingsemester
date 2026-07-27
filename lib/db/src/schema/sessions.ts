import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lessonsTable } from "./lessons";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  // Nullable: a null lessonId is a "fresh notebook" sandbox session not tied to any lesson.
  lessonId: integer("lesson_id").references(() => lessonsTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["starting", "running", "paused", "stopped", "error"] }).notNull().default("starting"),
  containerUrl: text("container_url"),
  ecsTaskArn: text("ecs_task_arn"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (t) => [
  // Race guard: at most one active (starting/running/paused) session per user.
  uniqueIndex("one_active_session_per_user")
    .on(t.userId)
    .where(sql`status IN ('starting', 'running', 'paused')`),
]);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
