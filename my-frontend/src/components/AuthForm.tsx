import { useState } from 'react';

const AUTH_SERVICE_URL = 'https://my-backend-worker.zy892065502.workers.dev';

interface AuthFormProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本验证
    if (!email || !password) {
      alert('请输入邮箱和密码！');
      return;
    }
    
    if (!isLogin && !name) {
      alert('请输入姓名！');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/sign-in/email' : '/api/auth/sign-up/email';
      const body = isLogin 
        ? { email, password }
        : { name, email, password };

      const response = await fetch(`${AUTH_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${isLogin ? '登录' : '注册'}失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`${isLogin ? '登录' : '注册'}成功:`, result);
      onAuthSuccess(result.user);
      
    } catch (error) {
      console.error(`${isLogin ? '登录' : '注册'}时出错:`, error);
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>{isLogin ? '登录' : '注册'}</h2>
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的名字"
              required={!isLogin}
            />
          </div>
        )}
        
        <div className="form-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入邮箱"
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </button>
      </form>
      
      <p>
        {isLogin ? '还没有账号？' : '已有账号？'}
        <button 
          type="button" 
          className="link-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setName('');
            setEmail('');
            setPassword('');
          }}
        >
          {isLogin ? '注册' : '登录'}
        </button>
      </p>
    </div>
  );
}