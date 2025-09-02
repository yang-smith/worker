import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";

// 用户状态表
export const userApiStatus = sqliteTable("user_status", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("free"), // free, monthly, yearly  
    status: text("status").notNull().default("active"), // active, expired, cancelled
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    balance: real("balance").notNull().default(0.0), // 美元余额
    totalSpent: real("total_spent").notNull().default(0.0), // 累计花费
    lastUsed: integer("last_used", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => new Date())
        .notNull(),
});

// API使用记录保持不变
export const apiUsage = sqliteTable("api_usage", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    cost: real("cost").notNull(), // 本次花费（美元）
    timestamp: integer("timestamp", { mode: "timestamp" })
        .$defaultFn(() => new Date())
        .notNull(),
});
