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

  // 简化：只使用cookie-based session检查
  const checkCurrentUser = async () => {
    try {
      const response = await fetch(API_URLS.GET_SESSION, {
        credentials: 'include', // 关键：包含cookies
      });

      if (response.ok) {
        const text = await response.text();
        
        if (!text || text.trim() === '' || text === 'null') {
          setUser(null);
          return;
        }
        
        const data = JSON.parse(text);
        if (data?.session && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
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

  const signOut = async () => {
    try {
      await fetch(API_URLS.SIGN_OUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('登出失败:', error);
    }
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

