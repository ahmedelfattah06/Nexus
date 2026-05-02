import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  setId: integer("set_id").notNull(),
  userId: text("user_id").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
