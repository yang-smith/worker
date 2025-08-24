import { useState, useEffect } from 'react';

const AUTH_SERVICE_URL = 'https://my-backend-worker.zy892065502.workers.dev';

interface User {
  id: string;
  name?: string;
  email: string;
  createdAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查当前用户状态
  const checkCurrentUser = async () => {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/get-session`, {
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
  }, []);

  const signOut = () => {
    setUser(null);
  };

  const signIn = (userData: User) => {
    setUser(userData);
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    checkCurrentUser
  };
}

