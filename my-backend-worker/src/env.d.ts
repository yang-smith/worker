export interface CloudflareBindings {
    DATABASE: D1Database;
    KV: KVNamespace;
    
    // API 代理相关环境变量
    DMXAPI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends CloudflareBindings {
            // Additional environment variables can be added here
        }
    }
}
