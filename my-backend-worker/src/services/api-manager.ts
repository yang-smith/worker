import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { userApiStatus, apiUsage } from "../db/api.schema";
import { schema } from "../db/schema";
import type { CloudflareBindings } from "../env";
import { sql } from "drizzle-orm";
import { CostCalculator, type MessageBasedCostEstimate } from "./cost-calculator";
import { getModelConfig } from "../config/models";

export class ApiManager {
    private db;

    constructor(env: CloudflareBindings) {
        this.db = drizzle(env.DATABASE, { schema });
    }

    // 检查用户API权限和余额
    async checkAccess(userId: string): Promise<{ canUse: boolean; balance?: number; reason?: string }> {
        const status = await this.db
            .select()
            .from(userApiStatus)
            .where(eq(userApiStatus.userId, userId))
            .get();

        if (!status) {
            await this.createDefaultStatus(userId);
            return { canUse: true, balance: 5.0 };
        }

        if (status.status !== 'active') {
            return { canUse: false, reason: '订阅已过期' };
        }

        if (status.balance <= 0) {
            return { canUse: false, reason: '余额不足' };
        }

        return { canUse: true, balance: status.balance };
    }

    // 基于消息估算成本
    estimateCostFromMessages(modelId: string, messages: any[]): MessageBasedCostEstimate {
        const estimatedOutputTokens = CostCalculator.estimateOutputTokens(messages, modelId);
        return CostCalculator.estimateCostFromMessages(modelId, messages, estimatedOutputTokens);
    }

    // 检查预算
    checkBudget(estimate: MessageBasedCostEstimate, userBalance: number): boolean {
        return CostCalculator.isWithinBudget(estimate, userBalance);
    }

    // 扣费并记录（简化版）
    async deductAndRecord(userId: string, estimate: MessageBasedCostEstimate): Promise<boolean> {
        try {
            const results = await this.db.batch([
                // 扣除余额
                this.db
                    .update(userApiStatus)
                    .set({
                        balance: sql`balance - ${estimate.totalCost}`,
                        totalSpent: sql`total_spent + ${estimate.totalCost}`,
                        lastUsed: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(and(
                        eq(userApiStatus.userId, userId),
                        sql`balance >= ${estimate.totalCost}`
                    )),
                
                // 记录使用
                this.db
                    .insert(apiUsage)
                    .values({
                        id: crypto.randomUUID(),
                        userId,
                        model: estimate.model,
                        cost: estimate.totalCost,
                        timestamp: new Date(),
                    })
            ]);

            const updateResult = results[0] as any;
            return updateResult.success === true || updateResult.meta?.changes > 0;
        } catch (error) {
            console.error('扣费失败:', error);
            return false;
        }
    }

    // 获取模型端点信息
    getModelEndpoint(modelId: string) {
        const config = getModelConfig(modelId);
        return {
            url: config.endpoint,
            provider: config.provider
        };
    }

    // 创建默认用户状态
    private async createDefaultStatus(userId: string) {
        try {
            await this.db
                .insert(userApiStatus)
                .values({
                    userId,
                    plan: 'free',
                    status: 'active',
                    balance: 5.0,
                    totalSpent: 0,
                    updatedAt: new Date(),
                });
            console.log(`为用户 ${userId} 创建了默认API状态`);
        } catch (error) {
            console.error(`为用户 ${userId} 创建默认状态失败:`, error);
            throw error;
        }
    }

    // 获取用户API统计 - 修改这个方法，确保总是返回状态
    async getUserStats(userId: string) {
        try {
            let status = await this.db
                .select()
                .from(userApiStatus)
                .where(eq(userApiStatus.userId, userId))
                .get();

            // 如果用户没有状态记录，自动创建一个
            if (!status) {
                console.log(`用户 ${userId} 没有API状态记录，正在创建默认状态...`);
                await this.createDefaultStatus(userId);
                
                // 重新查询创建的状态
                status = await this.db
                    .select()
                    .from(userApiStatus)
                    .where(eq(userApiStatus.userId, userId))
                    .get();
            }

            if (!status) {
                console.error(`为用户 ${userId} 创建默认状态后仍然查询不到记录`);
                // 返回默认值而不是 null
                return {
                    plan: 'free',
                    status: 'active',
                    balance: 5.0,
                    totalSpent: 0,
                    lastUsed: null,
                };
            }

            return {
                plan: status.plan,
                status: status.status,
                balance: status.balance,
                totalSpent: status.totalSpent,
                lastUsed: status.lastUsed,
            };
        } catch (error) {
            console.error(`获取用户 ${userId} 状态失败:`, error);
            // 返回默认值而不是抛出错误
            return {
                plan: 'free',
                status: 'active',
                balance: 5.0,
                totalSpent: 0,
                lastUsed: null,
            };
        }
    }

    // 新增：确保用户状态存在的方法
    async ensureUserStatus(userId: string): Promise<void> {
        const status = await this.db
            .select()
            .from(userApiStatus)
            .where(eq(userApiStatus.userId, userId))
            .get();

        if (!status) {
            await this.createDefaultStatus(userId);
        }
    }
}
