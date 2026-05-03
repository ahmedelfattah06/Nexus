import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moodsTable = pgTable(
  "moods",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    mood: integer("mood").notNull(),
    note: text("note").notNull().default(""),
    date: text("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("moods_user_idx").on(table.userId)]
);

export const insertMoodSchema = createInsertSchema(moodsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMood = z.infer<typeof insertMoodSchema>;
export type Mood = typeof moodsTable.$inferSelect;
