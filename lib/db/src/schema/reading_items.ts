import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const readingItemsTable = pgTable("reading_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  url: text("url").notNull().default(""),
  status: text("status").notNull().default("want_to_read"),
  progress: integer("progress").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertReadingItemSchema = createInsertSchema(readingItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReadingItem = z.infer<typeof insertReadingItemSchema>;
export type ReadingItem = typeof readingItemsTable.$inferSelect;
