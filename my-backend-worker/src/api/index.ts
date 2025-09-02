import { Hono } from "hono";
import type { CloudflareBindings } from "../env";
import { createAuth } from "../auth";
import { ApiManager } from "../services/api-manager";
import { getEnabledModels } from "../config/models";

type Variables = {
    auth: ReturnType<typeof createAuth>;
};

const apiApp = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// API Proxy routes - 支持Stream传输
apiApp.all("/proxy/*", async c => {
    try {
        // 1. 用户认证检查
        const authResult = await authenticateUser(c);
        if (!authResult.success) {
            return c.json({ error: authResult.error }, 401);
        }

        // 2. 检查用户API权限和余额
        const apiManager = new ApiManager(c.env);
        const accessCheck = await apiManager.checkAccess(authResult.userId!);
        
        if (!accessCheck.canUse) {
            return c.json({ 
                error: accessCheck.reason || 'API访问被拒绝',
                balance: accessCheck.balance 
            }, 403);
        }

        // 3. 解析请求体
        const requestBody = await c.req.json().catch(() => ({}));
        const modelId = requestBody.model || 'google/gemini-2.5-flash';
        const messages = requestBody.messages || [];
        
        // 4. 基于消息估算成本
        const costEstimate = apiManager.estimateCostFromMessages(modelId, messages);
        
        // 5. 检查预算
        if (!apiManager.checkBudget(costEstimate, accessCheck.balance!)) {
            return c.json({ 
                error: '预估费用超出余额',
                estimatedCost: costEstimate.totalCost,
                balance: accessCheck.balance 
            }, 403);
        }

        // 6. 预先扣费（基于估算）
        const deductSuccess = await apiManager.deductAndRecord(authResult.userId!, costEstimate);
        if (!deductSuccess) {
            return c.json({ error: '扣费失败，请稍后重试' }, 500);
        }

        // 7. 获取模型端点
        const endpoint = apiManager.getModelEndpoint(modelId);
        
        // 8. 创建代理请求
        const proxyRequest = new Request(endpoint.url, {
            method: c.req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey(endpoint.provider, c.env)}`,
                ...(endpoint.provider === 'openrouter' ? {
                    'HTTP-Referer': 'simple-test',
                    'X-Title': 'simple-agent'
                } : {})
            },
            body: JSON.stringify(requestBody)
        });
        
        // 9. 直接返回响应（支持stream）
        const response = await fetch(proxyRequest);
        
        // 创建新的响应，保持原有的stream特性
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'X-Remaining-Balance': (accessCheck.balance! - costEstimate.totalCost).toFixed(6),
                // 保持stream相关的headers
                ...(response.headers.get('Content-Encoding') && {
                    'Content-Encoding': response.headers.get('Content-Encoding')!
                }),
                ...(response.headers.get('Transfer-Encoding') && {
                    'Transfer-Encoding': response.headers.get('Transfer-Encoding')!
                }),
                ...(response.headers.get('Cache-Control') && {
                    'Cache-Control': response.headers.get('Cache-Control')!
                })
            }
        });
        
    } catch (error) {
        console.error('API代理错误:', error);
        return c.json({ 
            error: '代理请求失败', 
            details: error instanceof Error ? error.message : String(error) 
        }, 500);
    }
});

// API 使用统计路由
apiApp.get("/stats", async c => {
    const authResult = await authenticateUser(c);
    if (!authResult.success) {
        return c.json({ error: authResult.error }, 401);
    }

    const apiManager = new ApiManager(c.env);
    const stats = await apiManager.getUserStats(authResult.userId!);

    return c.json({
        user: authResult.user,
        stats: stats || {
            plan: 'free',
            status: 'inactive',
            balance: 0,
            totalSpent: 0,
            lastUsed: null
        }
    });
});

// 更新模型列表路由
apiApp.get("/models", async c => {
    const authResult = await authenticateUser(c);
    if (!authResult.success) {
        return c.json({ error: authResult.error }, 401);
    }

    const models = getEnabledModels().map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        category: model.category,
        pricing: model.pricing,
        limits: model.limits
    }));

    return c.json({ models });
});

// 余额充值路由（占位符）
apiApp.post("/topup", async c => {
    const authResult = await authenticateUser(c);
    if (!authResult.success) {
        return c.json({ error: authResult.error }, 401);
    }

    // 这里可以集成支付系统
    return c.json({
        message: "充值功能开发中",
        user: authResult.user,
        supportedMethods: ["stripe", "paypal", "alipay"]
    });
});

// 简化认证函数 - 只使用Better Auth标准方式
async function authenticateUser(c: any) {
    try {
        const auth = c.get("auth");
        
        // 使用 Better Auth 标准会话检查
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (session?.session && session?.user) {
            return { 
                success: true, 
                user: session.user,
                userId: session.user.id 
            };
        }

        return { 
            success: false, 
            error: '需要登录才能访问API' 
        };
        
    } catch (error) {
        console.error('认证检查失败:', error);
        return { 
            success: false, 
            error: '认证检查失败' 
        };
    }
}

// 工具函数：获取API密钥
function getApiKey(provider: string, env: any): string {
    switch (provider) {
        case 'openrouter':
            return env.OPENROUTER_API_KEY;
        case 'dmxapi':
            return env.DMXAPI_API_KEY;
        default:
            throw new Error(`未知的API提供商: ${provider}`);
    }
}

export default apiApp;
