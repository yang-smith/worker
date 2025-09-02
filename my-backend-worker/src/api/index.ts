import { Hono } from "hono";
import type { CloudflareBindings } from "../env";
import { createAuth } from "../auth";
import { ApiManager } from "../services/api-manager";

type Variables = {
    auth: ReturnType<typeof createAuth>;
};

const apiApp = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// API Proxy routes - 只使用 Better Auth 认证
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
        const model = requestBody.model || 'google/gemini-2.5-flash';
        
        // 4. 计算预估费用
        const estimatedCost = apiManager.calculateCost(model);
        
        // 5. 根据模型决定路由
        const routeInfo = getRouteInfo(model, c.env);
        
        // 6. 创建代理请求
        const proxyRequest = new Request(routeInfo.url, {
            method: c.req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${routeInfo.apiKey}`,
                ...(routeInfo.url.includes('openrouter') ? {
                    'HTTP-Referer': 'simple-test',
                    'X-Title': 'simple-agent'
                } : {})
            },
            body: JSON.stringify(requestBody)
        });
        
        // 7. 发送请求并返回响应
        const response = await fetch(proxyRequest);
        const responseBody = await response.text();
        
        // 8. 如果请求成功，扣除费用
        if (response.ok) {
            await apiManager.deductAndRecord(authResult.userId!, model, estimatedCost);
        }
        
        return new Response(responseBody, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'X-Remaining-Balance': accessCheck.balance?.toString() || '0',
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

// 支持的模型列表
apiApp.get("/models", async c => {
    const authResult = await authenticateUser(c);
    if (!authResult.success) {
        return c.json({ error: authResult.error }, 401);
    }

    return c.json({
        models: [
            {
                id: 'google/gemini-2.5-flash',
                provider: 'openrouter',
                category: 'chat',
                pricing: {
                    input: 0.000001,
                    output: 0.000002,
                    unit: 'per 1k tokens'
                }
            },
            {
                id: 'text-embedding-ada-002',
                provider: 'dmxapi',
                category: 'embedding',
                pricing: {
                    input: 0.0001,
                    output: 0,
                    unit: 'per 1k tokens'
                }
            }
        ]
    });
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

// 🔧 修改的认证函数 - 添加 Bearer Token 支持
async function authenticateUser(c: any) {
    try {
        const auth = c.get("auth");
        
        // 方法1: 尝试 Better Auth 的标准会话检查（Cookie）
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

        // 方法2: 如果会话检查失败，尝试 Bearer Token
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7); // 移除 "Bearer " 前缀
            
            try {
                // 使用 Better Auth 验证 token
                const tokenSession = await auth.api.getSession({
                    headers: new Headers({
                        'Authorization': `Bearer ${token}`
                    })
                });
                
                if (tokenSession?.session && tokenSession?.user) {
                    return { 
                        success: true, 
                        user: tokenSession.user,
                        userId: tokenSession.user.id 
                    };
                }
            } catch (tokenError) {
                console.log('Token 验证失败:', tokenError);
            }
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

// 路由信息函数
function getRouteInfo(model: string, env: any) {
    // embedding 模型使用 dmxapi
    if (model.includes('embedding') || model.includes('embed')) {
        return {
            url: 'https://www.dmxapi.com/v1/chat/completions',
            apiKey: env.DMXAPI_API_KEY
        };
    }
    
    // 其他模型使用 openrouter
    return {
        url: 'https://openrouter.ai/api/v1/chat/completions', 
        apiKey: env.OPENROUTER_API_KEY
    };
}

export default apiApp;
