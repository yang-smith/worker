// 模型配置接口
export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openrouter' | 'dmxapi' | 'custom';
    category: 'chat' | 'embedding' | 'image' | 'audio';
    pricing: {
        input: number;  // 每1k token的价格（美元）
        output: number; // 每1k token的价格（美元）
        unit: string;   // 计价单位描述
    };
    endpoint: string;   // API端点
    enabled: boolean;   // 是否启用
    limits?: {
        maxTokens?: number;
        rateLimit?: number; // 每分钟请求数
    };
}

// 模型配置数据
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
    'google/gemini-2.5-flash': {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'openrouter',
        category: 'chat',
        pricing: {
            input: 0.000001,   // $0.000001 per 1k input tokens
            output: 0.000002,  // $0.000002 per 1k output tokens
            unit: 'per 1k tokens'
        },
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        enabled: true,
        limits: {
            maxTokens: 32000,
            rateLimit: 60
        }
    },
    'text-embedding-ada-002': {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002',
        provider: 'dmxapi',
        category: 'embedding',
        pricing: {
            input: 0.0001,     // $0.0001 per 1k tokens
            output: 0,         // No output cost for embeddings
            unit: 'per 1k tokens'
        },
        endpoint: 'https://www.dmxapi.com/v1/embeddings',
        enabled: true,
        limits: {
            maxTokens: 8192,
            rateLimit: 100
        }
    },
    'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openrouter',
        category: 'chat',
        pricing: {
            input: 0.00015,    // $0.00015 per 1k input tokens
            output: 0.0006,    // $0.0006 per 1k output tokens
            unit: 'per 1k tokens'
        },
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        enabled: true,
        limits: {
            maxTokens: 16384,
            rateLimit: 30
        }
    }
};

// 默认模型配置（用于未知模型）
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
    id: 'unknown',
    name: 'Unknown Model',
    provider: 'custom',
    category: 'chat',
    pricing: {
        input: 0.001,      // 保守估计
        output: 0.002,     // 保守估计
        unit: 'per 1k tokens'
    },
    endpoint: '',
    enabled: false
};

// 工具函数
export function getModelConfig(modelId: string): ModelConfig {
    return MODEL_CONFIGS[modelId] || DEFAULT_MODEL_CONFIG;
}

export function getEnabledModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(model => model.enabled);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(model => model.provider === provider);
}

export function getModelsByCategory(category: string): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(model => model.category === category);
}
