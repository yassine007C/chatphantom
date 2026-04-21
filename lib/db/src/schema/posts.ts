import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const publicPostsTable = pgTable("public_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(publicPostsTable).omit({ id: true, createdAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PublicPost = typeof publicPostsTable.$inferSelect;
