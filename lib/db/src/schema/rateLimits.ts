import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rateLimitsTable = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRateLimitSchema = createInsertSchema(rateLimitsTable).omit({ id: true, createdAt: true });
export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type RateLimit = typeof rateLimitsTable.$inferSelect;
