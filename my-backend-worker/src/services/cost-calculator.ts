import { getModelConfig } from '../config/models';

export interface MessageBasedCostEstimate {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    currency: string;
    model: string;
}

export class CostCalculator {
    /**
     * 基于消息内容估算成本（支持stream）
     */
    static estimateCostFromMessages(
        modelId: string, 
        messages: any[], 
        estimatedOutputTokens: number = 500
    ): MessageBasedCostEstimate {
        const modelConfig = getModelConfig(modelId);
        
        // 估算input tokens
        const inputText = messages.map(msg => msg.content || '').join(' ');
        const inputTokens = this.estimateTokenCount(inputText);
        
        // 使用传入的估算output tokens
        const outputTokens = estimatedOutputTokens;
        
        // 计算成本
        const inputCost = (inputTokens / 1000) * modelConfig.pricing.input;
        const outputCost = (outputTokens / 1000) * modelConfig.pricing.output;
        const totalCost = inputCost + outputCost;

        return {
            inputTokens,
            outputTokens,
            totalCost: Number(totalCost.toFixed(6)),
            currency: 'USD',
            model: modelId
        };
    }

    /**
     * 基于对话历史动态估算output tokens
     */
    static estimateOutputTokens(messages: any[], modelId: string): number {
        const modelConfig = getModelConfig(modelId);
        
        // 根据模型类型和对话长度估算
        const conversationLength = messages.length;
        const lastMessage = messages[messages.length - 1]?.content || '';
        const lastMessageTokens = this.estimateTokenCount(lastMessage);
        
        // 简单启发式规则
        if (modelConfig.category === 'embedding') {
            return 0; // embedding模型没有output
        }
        
        // 根据对话复杂度估算
        if (conversationLength === 1) {
            // 单轮对话，根据问题长度估算
            return Math.min(Math.max(lastMessageTokens * 2, 100), 1000);
        } else {
            // 多轮对话，较保守的估算
            return Math.min(Math.max(lastMessageTokens * 1.5, 200), 800);
        }
    }

    /**
     * 简单的token数量估算
     */
    private static estimateTokenCount(text: string): number {
        if (!text) return 0;
        
        // 简化算法：英文大约4个字符=1个token，中文大约1个字符=1个token
        const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
        const otherChars = text.length - englishChars;
        
        return Math.ceil(englishChars / 4 + otherChars);
    }

    /**
     * 检查预估成本是否在预算内
     */
    static isWithinBudget(estimate: MessageBasedCostEstimate, userBalance: number): boolean {
        return estimate.totalCost <= userBalance;
    }

    /**
     * 获取模型的最低成本（用于预检查）
     */
    static getMinimumCost(modelId: string): number {
        const modelConfig = getModelConfig(modelId);
        // 假设最少100个input token
        return (100 / 1000) * modelConfig.pricing.input;
    }
}
