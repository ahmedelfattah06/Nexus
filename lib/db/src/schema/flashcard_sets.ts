import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardSetsTable = pgTable("flashcard_sets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFlashcardSetSchema = createInsertSchema(flashcardSetsTable).omit({ id: true, createdAt: true });
export type InsertFlashcardSet = z.infer<typeof insertFlashcardSetSchema>;
export type FlashcardSet = typeof flashcardSetsTable.$inferSelect;
