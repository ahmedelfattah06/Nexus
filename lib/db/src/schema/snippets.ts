import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const snippetsTable = pgTable(
  "snippets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    language: text("language").notNull(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("snippets_user_idx").on(table.userId)]
);

export const insertSnippetSchema = createInsertSchema(snippetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type Snippet = typeof snippetsTable.$inferSelect;
