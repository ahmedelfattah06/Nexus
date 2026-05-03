import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { habitsTable } from "./habits";

export const habitLogsTable = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habitsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    completed: boolean("completed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("habit_logs_habit_date_unique").on(table.habitId, table.date),
    index("habit_logs_user_idx").on(table.userId),
    index("habit_logs_habit_idx").on(table.habitId),
  ]
);

export const insertHabitLogSchema = createInsertSchema(habitLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type HabitLog = typeof habitLogsTable.$inferSelect;
