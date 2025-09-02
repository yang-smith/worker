// API 配置文件 - 统一管理所有 API 相关配置

// 开发环境和生产环境的 API 地址
const API_ENDPOINTS = {
  development: 'https://api.autumnriver.blue', // 本地开发时的地址
  production: 'https://api.autumnriver.blue', // 生产环境地址
};

// 根据环境自动选择 API 地址
const getApiBaseUrl = (): string => {
  // 在 Vite 中，可以通过 import.meta.env.MODE 获取当前环境
  const isDevelopment = import.meta.env.MODE === 'development';
  return isDevelopment ? API_ENDPOINTS.development : API_ENDPOINTS.production;
};

// 导出统一的 API 配置
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    // 认证相关
    AUTH: {
      SIGN_UP: '/api/auth/sign-up/email',
      SIGN_IN: '/api/auth/sign-in/email',
      SIGN_OUT: '/api/auth/sign-out',
      GET_SESSION: '/api/auth/get-session',
    },
    // API 管理相关
    API: {
      STATS: '/api/stats',
      MODELS: '/api/models',
      PROXY_CHAT: '/api/proxy/chat/completions',
      TOPUP: '/api/topup',
    },
    // 健康检查
    HEALTH: '/health',
  }
} as const;

// 便捷的 URL 生成函数
export const createApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 导出常用的完整 URL（向后兼容）
export const AUTH_SERVICE_URL = API_CONFIG.BASE_URL;
export const API_BASE_URL = API_CONFIG.BASE_URL;

// 导出一些常用的完整 URL
export const API_URLS = {
  // 认证
  SIGN_UP: createApiUrl(API_CONFIG.ENDPOINTS.AUTH.SIGN_UP),
  SIGN_IN: createApiUrl(API_CONFIG.ENDPOINTS.AUTH.SIGN_IN),
  SIGN_OUT: createApiUrl(API_CONFIG.ENDPOINTS.AUTH.SIGN_OUT),
  GET_SESSION: createApiUrl(API_CONFIG.ENDPOINTS.AUTH.GET_SESSION),
  
  // API 管理
  STATS: createApiUrl(API_CONFIG.ENDPOINTS.API.STATS),
  MODELS: createApiUrl(API_CONFIG.ENDPOINTS.API.MODELS),
  PROXY_CHAT: createApiUrl(API_CONFIG.ENDPOINTS.API.PROXY_CHAT),
  
  // 其他
  HEALTH: createApiUrl(API_CONFIG.ENDPOINTS.HEALTH),
} as const;
