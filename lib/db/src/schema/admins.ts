import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Admin = typeof adminsTable.$inferSelect;
