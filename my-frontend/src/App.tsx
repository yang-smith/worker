// src/App.tsx

import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
import './App.css';
import './components/Auth.css';

function App() {
  const { user, loading, signIn, signOut } = useAuth();

  // 加载状态
  if (loading) {
    return <div className="loading">正在检查身份...</div>;
  }

  // 简化认证成功处理
  const handleAuthSuccess = (userData: any) => {
    console.log('认证成功，用户:', userData);
    signIn(userData); // 不传递token
  };

  return (
    <div className="app">
      <header>
        <h1>欢迎来到我的小木屋</h1>
      </header>
      
      <main>
        {user ? (
          <UserProfile user={user} onSignOut={signOut} />
        ) : (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        )}
      </main>
    </div>
  );
}

export default App;