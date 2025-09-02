import { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';

interface User {
  id: string;
  name?: string;
  email: string;
  createdAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('better-auth-token') // 从本地存储获取 token
  );

  // 检查当前用户状态 - 使用 token 认证
  const checkCurrentUser = async () => {
    try {
      // 如果有 token，尝试用 token 验证
      if (authToken) {
        console.log('使用 token 验证:', authToken);
        
        // 先尝试访问需要认证的 API
        const statsResponse = await fetch(API_URLS.STATS, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('Token 验证成功, 用户数据:', statsData.user);
          setUser(statsData.user);
          return;
        } else {
          console.log('Token 验证失败:', statsResponse.status);
          // Token 无效，清除它
          localStorage.removeItem('better-auth-token');
          setAuthToken(null);
        }
      }
      
      // 如果没有 token 或 token 无效，尝试 cookie 方式
      const response = await fetch(API_URLS.GET_SESSION, {
        credentials: 'include',
      });

      if (response.ok) {
        const text = await response.text();
        
        if (!text || text.trim() === '') {
          console.log("当前无人登录。");
          setUser(null);
          return;
        }
        
        const data = JSON.parse(text);
        if (data && data.session && data.user) {
          console.log("识别到已登录用户:", data.user);
          setUser(data.user);
        } else {
          console.log("当前无人登录。");
          setUser(null);
        }
      } else {
        console.log("Session检查失败:", response.status);
        setUser(null);
      }
    } catch (error) {
      console.error("身份检查失败:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentUser();
  }, []); // 移除 authToken 依赖，避免无限循环

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('better-auth-token');
    setAuthToken(null);
  };

  const signIn = (userData: User, token?: string) => {
    setUser(userData);
    if (token) {
      localStorage.setItem('better-auth-token', token);
      setAuthToken(token);
    }
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    checkCurrentUser,
    authToken
  };
}

