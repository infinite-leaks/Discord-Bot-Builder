import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const botsTable = pgTable("bot_builder_bots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  framework: text("framework").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull().default("stopped"),
  encryptedToken: text("encrypted_token"),
  presence: text("presence").notNull().default("online"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
});

export const botFilesTable = pgTable("bot_builder_files", {
  id: text("id").primaryKey(),
  botId: text("bot_id").notNull(),
  path: text("path").notNull(),
  content: text("content").notNull().default(""),
  language: text("language").notNull().default("text"),
  size: integer("size").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityTable = pgTable("bot_builder_activity", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  botId: text("bot_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const toolsTable = pgTable("bot_builder_tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});