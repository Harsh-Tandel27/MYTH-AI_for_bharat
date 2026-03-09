import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Projects table - stores user projects WITH their files
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull(), // Clerk user ID
  name: text('name').notNull(),
  type: text('type', { enum: ['url', 'prompt', 'mern'] }).notNull(),
  sourceUrl: text('source_url'), // Only for URL-based projects
  sandboxId: text('sandbox_id'), // Current active sandbox ID
  files: text('files', { mode: 'json' }).$type<ProjectFile[]>(), // JSON array of files - UPDATED ON EVERY CODE CHANGE
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Project Versions table - stores snapshots of project files at each save point
export const projectVersions = sqliteTable('project_versions', {
  id: text('id').primaryKey(), // UUID
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  files: text('files', { mode: 'json' }).$type<ProjectFile[]>(), // Full file snapshot
  packages: text('packages', { mode: 'json' }).$type<string[]>(), // npm packages used
  prompt: text('prompt'), // What the user asked for
  message: text('message'), // Commit-like message
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Chat History table - stores chat messages per project
export const chatHistory = sqliteTable('chat_history', {
  id: text('id').primaryKey(), // UUID
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type', { enum: ['user', 'assistant', 'system', 'error'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(), // Optional metadata (e.g., image URLs)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type for files stored in projects
export interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

// Infer types for use in the app
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectVersion = typeof projectVersions.$inferSelect;
export type NewProjectVersion = typeof projectVersions.$inferInsert;
export type ChatMessage = typeof chatHistory.$inferSelect;
export type NewChatMessage = typeof chatHistory.$inferInsert;

// ============================================================
// URL AI TABLES — Fully isolated from PromptAI tables above
// ============================================================

// URL AI Projects — stores cloned website projects
export const urlProjects = sqliteTable('url_projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  sourceUrl: text('source_url'),
  sandboxId: text('sandbox_id'),
  files: text('files', { mode: 'json' }).$type<ProjectFile[]>(),
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// URL AI Version History — snapshots of project files at each save point
export const urlProjectVersions = sqliteTable('url_project_versions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => urlProjects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  files: text('files', { mode: 'json' }).$type<ProjectFile[]>(),
  packages: text('packages', { mode: 'json' }).$type<string[]>(),
  prompt: text('prompt'),
  message: text('message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// URL AI Chat History — stores chat messages per URL AI project
export const urlChatHistory = sqliteTable('url_chat_history', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => urlProjects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type', { enum: ['user', 'assistant', 'system', 'error'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// URL AI inferred types
export type UrlProject = typeof urlProjects.$inferSelect;
export type NewUrlProject = typeof urlProjects.$inferInsert;
export type UrlProjectVersion = typeof urlProjectVersions.$inferSelect;
export type UrlChatMessage = typeof urlChatHistory.$inferSelect;

// ============================================================
// WALLET & CREDITS — Razorpay-powered credit system
// ============================================================

// User Wallets — one row per user, tracks credit balance
export const userWallets = sqliteTable('user_wallets', {
  userId: text('user_id').primaryKey(), // Clerk user ID
  credits: integer('credits').notNull().default(100), // Current credit balance (100 free)
  totalPurchased: integer('total_purchased').notNull().default(0), // Lifetime purchased credits
  totalSpent: integer('total_spent').notNull().default(0), // Lifetime spent credits
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Wallet Transactions — audit log of all credit changes
export const walletTransactions = sqliteTable('wallet_transactions', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['purchase', 'deduction', 'bonus', 'refund'] }).notNull(),
  amount: integer('amount').notNull(), // Positive for credit, negative for debit
  balance: integer('balance').notNull(), // Balance AFTER this transaction
  description: text('description').notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Wallet inferred types
export type UserWallet = typeof userWallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// ============================================================
// DRAG & DROP AI TABLES
// ============================================================

// Drag Drop Projects - stores visual builder projects
export const dragdropProjects = sqliteTable('drag_drop_projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  themeId: text('theme_id').notNull().default('midnight'),
  sections: text('sections', { mode: 'json' }).notNull(), // JSON data for builder sections
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type DragDropProject = typeof dragdropProjects.$inferSelect;

// ============================================================
// SAAS COPILOT TABLES
// ============================================================

// Copilot Chat Sessions - stores chat history for SaaS Copilot
export const copilotChatSessions = sqliteTable('copilot_chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('New Chat'),
  gatewayUrl: text('gateway_url'),
  messages: text('messages', { mode: 'json' }), // JSON array of messages
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type CopilotChatSession = typeof copilotChatSessions.$inferSelect;


