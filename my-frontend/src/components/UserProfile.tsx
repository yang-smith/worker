import { useState } from 'react';
import { API_URLS } from '../config/api';
import ApiTest from './ApiTest';

interface User {
  id: string;
  name?: string;
  email: string;
  createdAt?: string;
}

interface UserProfileProps {
  user: User;
  onSignOut: () => void;
}

export default function UserProfile({ user, onSignOut }: UserProfileProps) {
  const [showApiTest, setShowApiTest] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch(API_URLS.SIGN_OUT, {
        method: 'POST',
        credentials: 'include',
      });
      console.log('已登出');
      onSignOut();
    } catch (error) {
      console.error('登出时出错:', error);
      // 即使出错也清空本地状态
      onSignOut();
    }
  };

  if (showApiTest) {
    return (
      <div className="user-profile">
        <div className="profile-header">
          <h1>API 测试面板</h1>
          <button 
            onClick={() => setShowApiTest(false)}
            className="back-button"
          >
            ← 返回个人信息
          </button>
        </div>
        <ApiTest />
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h1>欢迎回来!</h1>
      
      <div className="user-info">
        <div className="info-item">
          <strong>姓名：</strong>
          <span>{user.name || '未设置'}</span>
        </div>
        
        <div className="info-item">
          <strong>邮箱：</strong>
          <span>{user.email}</span>
        </div>
        
        <div className="info-item">
          <strong>用户ID：</strong>
          <span>{user.id}</span>
        </div>
        
        {user.createdAt && (
          <div className="info-item">
            <strong>注册时间：</strong>
            <span>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        )}
      </div>
      
      <div className="user-actions">
        <button 
          onClick={() => setShowApiTest(true)} 
          className="api-test-btn"
        >
          🧪 API 测试
        </button>
        <button onClick={handleSignOut} className="sign-out-btn">
          登出
        </button>
      </div>
    </div>
  );
}