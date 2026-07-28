import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("scores_rank_idx").on(table.score, table.createdAt)]);
