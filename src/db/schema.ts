import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("users", {
  id: text("id").notNull().primaryKey(),
  githubId: integer("github_id").unique(),
  username: text("username"),
});

export const sessionTable = sqliteTable("sessions", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});
