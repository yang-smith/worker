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

  // 统一的请求函数 - 只使用cookies
  const fetchWithCredentials = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include', // 所有请求都包含cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  // 获取用户统计信息
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCredentials(API_URLS.STATS);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取统计失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
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
      const response = await fetchWithCredentials(API_URLS.MODELS);

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
        messages: [{ role: 'user', content: message }],
        max_tokens: 150,
        temperature: 0.7
      };

      const response = await fetchWithCredentials(API_URLS.PROXY_CHAT, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} - ${responseText}`);
      }

      // 解析并显示响应
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        if (parsedResponse.choices && parsedResponse.choices[0]) {
          setResponse(parsedResponse.choices[0].message?.content || '无响应内容');
        } else {
          setResponse(JSON.stringify(parsedResponse, null, 2));
        }
      } catch (parseError) {
        setResponse(`原始响应: ${responseText}`);
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
