import { useState } from 'react';
import { API_URLS, API_CONFIG } from '../config/api';

interface ApiStats {
  user: any;
  stats: {
    plan: string;
    status: string;
    balance: number;
    totalSpent: number;
    lastUsed: string | null;
  };
}

interface Model {
  id: string;
  provider: string;
  category: string;
  pricing: {
    input: number;
    output: number;
    unit: string;
  };
}

export default function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [response, setResponse] = useState<string>('');
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>(''); // 添加调试信息

  // 获取 token
  const getAuthToken = () => localStorage.getItem('better-auth-token');

  // 创建带 token 的请求头
  const createAuthHeaders = () => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  // 改进的会话检查 - 使用 /api/stats 作为认证检查
  const checkSession = async () => {
    try {
      const token = getAuthToken();
      console.log('🔑 当前 token:', token ? `${token.substring(0, 20)}...` : '无 token');
      
      // 方法1: 使用 token 检查认证状态
      if (token) {
        console.log('方法1: 通过 token 检查认证状态...');
        const statsResponse = await fetch(API_URLS.STATS, {
          headers: createAuthHeaders()
        });
        
        console.log('Stats response status:', statsResponse.status);
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('Stats data:', statsData);
          setDebugInfo(`✅ 认证成功 (通过 token)\n状态: ${statsResponse.status}\n用户: ${JSON.stringify(statsData.user, null, 2)}\n统计: ${JSON.stringify(statsData.stats, null, 2)}`);
          setStats(statsData);
          return;
        }
      }
      
      // 方法2: 尝试 cookie 方式
      console.log('方法2: 尝试 cookie 方式...');
      const sessionResponse = await fetch(API_URLS.GET_SESSION, {
        credentials: 'include',
      });
      
      const sessionText = await sessionResponse.text();
      console.log('Session response status:', sessionResponse.status);
      console.log('Session response text:', sessionText);
      
      if (sessionResponse.ok && sessionText && sessionText.trim() !== 'null') {
        const sessionData = JSON.parse(sessionText);
        setDebugInfo(`✅ 认证成功 (通过 cookie)\n状态: ${sessionResponse.status}\n用户: ${JSON.stringify(sessionData.user, null, 2)}`);
      } else {
        setDebugInfo(`❌ 认证失败\n🔑 Token: ${token ? '有' : '无'}\n📊 Stats: ${token ? sessionResponse?.status : 'N/A'}\n🗂️ Session: ${sessionResponse.status}\n📄 响应: ${sessionText}`);
      }
      
    } catch (error) {
      console.error('会话检查错误:', error);
      setDebugInfo(`❌ 会话检查错误: ${error}`);
    }
  };

  // 获取用户统计信息 - 简化版本，如果已经有数据就不重复获取
  const fetchStats = async () => {
    if (stats) {
      // 如果已经有统计数据，就显示它
      alert('统计数据已加载！');
      return;
    }
    
    setLoading(true);
    try {
      console.log('正在获取统计信息...');
      const response = await fetch(API_URLS.STATS, {
        headers: createAuthHeaders()
      });

      console.log('Stats response status:', response.status);
      console.log('Stats response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Stats error response:', errorText);
        throw new Error(`获取统计失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Stats data:', data);
      setStats(data);
    } catch (error) {
      console.error('获取统计失败:', error);
      alert(`获取统计失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取支持的模型列表
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URLS.MODELS, {
        headers: createAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Models error response:', errorText);
        throw new Error(`获取模型列表失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setModels(data.models);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      alert(`获取模型列表失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 发送 AI API 请求
  const sendApiRequest = async () => {
    if (!message.trim()) {
      alert('请输入消息内容！');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      };

      console.log('发送请求:', requestBody);

      const response = await fetch(API_URLS.PROXY_CHAT, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log('响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));
      console.log('响应内容:', responseText);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} - ${responseText}`);
      }

      // 解析响应
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        setResponse(`原始响应: ${responseText}`);
        return;
      }

      // 格式化显示响应
      if (parsedResponse.choices && parsedResponse.choices[0]) {
        setResponse(parsedResponse.choices[0].message?.content || parsedResponse.choices[0].text || '无响应内容');
      } else {
        setResponse(JSON.stringify(parsedResponse, null, 2));
      }

      // 显示剩余余额
      const remainingBalance = response.headers.get('X-Remaining-Balance');
      if (remainingBalance) {
        console.log('剩余余额:', remainingBalance);
      }

    } catch (error) {
      console.error('API请求失败:', error);
      setResponse(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="api-test">
      <h2>🤖 AI API 测试</h2>
      
      {/* 显示当前 API 地址 */}
      <div className="api-info">
        <small>当前 API 地址: {API_CONFIG.BASE_URL}</small>
      </div>

      {/* 调试部分 */}
      <div className="api-section">
        <h3>🔍 调试信息</h3>
        <button onClick={checkSession} disabled={loading}>
          {loading ? '检查中...' : '检查认证状态'}
        </button>
        
        {debugInfo && (
          <div className="debug-info">
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
      
      {/* 用户统计信息 */}
      <div className="api-section">
        <h3>📊 账户信息</h3>
        <button onClick={fetchStats} disabled={loading}>
          {loading ? '加载中...' : (stats ? '刷新账户信息' : '获取账户信息')}
        </button>
        
        {stats && (
          <div className="stats-info">
            <div className="info-item">
              <strong>用户ID：</strong>
              <span>{stats.user?.id || '未知'}</span>
            </div>
            <div className="info-item">
              <strong>邮箱：</strong>
              <span>{stats.user?.email || '未知'}</span>
            </div>
            <div className="info-item">
              <strong>套餐：</strong>
              <span>{stats.stats.plan}</span>
            </div>
            <div className="info-item">
              <strong>状态：</strong>
              <span>{stats.stats.status}</span>
            </div>
            <div className="info-item">
              <strong>余额：</strong>
              <span>${stats.stats.balance.toFixed(4)}</span>
            </div>
            <div className="info-item">
              <strong>总消费：</strong>
              <span>${stats.stats.totalSpent.toFixed(4)}</span>
            </div>
            <div className="info-item">
              <strong>最后使用：</strong>
              <span>{stats.stats.lastUsed ? new Date(stats.stats.lastUsed).toLocaleString('zh-CN') : '从未使用'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 支持的模型 */}
      <div className="api-section">
        <h3>🎯 支持的模型</h3>
        <button onClick={fetchModels} disabled={loading}>
          {loading ? '加载中...' : '获取模型列表'}
        </button>
        
        {models.length > 0 && (
          <div className="models-list">
            {models.map((modelInfo) => (
              <div key={modelInfo.id} className="model-item">
                <strong>{modelInfo.id}</strong>
                <span>({modelInfo.provider} - {modelInfo.category})</span>
                <span className="pricing">
                  输入: ${modelInfo.pricing.input} / 输出: ${modelInfo.pricing.output} {modelInfo.pricing.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API 测试 */}
      <div className="api-section">
        <h3>💬 AI 对话测试</h3>
        
        <div className="form-group">
          <label htmlFor="model-select">选择模型:</label>
          <select 
            id="model-select"
            value={model} 
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="text-embedding-ada-002">Text Embedding Ada 002</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="message-input">消息内容:</label>
          <textarea
            id="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入你想问的问题..."
            rows={4}
          />
        </div>

        <button onClick={sendApiRequest} disabled={loading || !message.trim()}>
          {loading ? '发送中...' : '发送请求'}
        </button>

        {response && (
          <div className="response-section">
            <h4>📝 响应结果:</h4>
            <div className="response-content">
              <pre>{response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
