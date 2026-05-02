import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitLogsTable = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertHabitLogSchema = createInsertSchema(habitLogsTable).omit({ id: true, createdAt: true });
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type HabitLog = typeof habitLogsTable.$inferSelect;
