const AUTH_SERVICE_URL = 'https://my-backend-worker.zy892065502.workers.dev';

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
  const handleSignOut = async () => {
    try {
      await fetch(`${AUTH_SERVICE_URL}/api/auth/sign-out`, {
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
        <button onClick={handleSignOut} className="sign-out-btn">
          登出
        </button>
      </div>
    </div>
  );
}