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
  name: string;
  provider: string;
  category: string;
  pricing: {
    input: number;
    output: number;
    unit: string;
  };
  limits?: {
    maxTokens?: number;
    rateLimit?: number;
  };
}

export default function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [response, setResponse] = useState<string>('');
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true); // 新增：控制是否启用流式传输

  // 统一的请求函数
  const fetchWithCredentials = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
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

  // 流式传输处理函数
  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    setResponse(''); // 清空之前的响应
    setIsStreaming(true);

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                setResponse(prev => prev + content);
              }
            } catch (parseError) {
              console.log('解析SSE数据失败:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      setIsStreaming(false);
    }

    return fullResponse;
  };

  // 处理非流式响应
  const handleNonStreamResponse = async (response: Response) => {
    const responseText = await response.text();
    
    try {
      const parsedResponse = JSON.parse(responseText);
      if (parsedResponse.choices && parsedResponse.choices[0]) {
        const content = parsedResponse.choices[0].message?.content || parsedResponse.choices[0].text || '无响应内容';
        setResponse(content);
        return content;
      } else {
        const formatted = JSON.stringify(parsedResponse, null, 2);
        setResponse(formatted);
        return formatted;
      }
    } catch (parseError) {
      setResponse(`原始响应: ${responseText}`);
      return responseText;
    }
  };

  // 发送 AI API 请求 - 支持流式传输
  const sendApiRequest = async () => {
    if (!message.trim()) {
      alert('请输入消息内容！');
      return;
    }

    setLoading(true);
    setResponse('');
    setIsStreaming(false);

    try {
      const requestBody = {
        model: model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000,
        temperature: 0.7,
        stream: streamEnabled // 根据用户选择决定是否启用流式传输
      };

      console.log('发送请求:', requestBody);

      const response = await fetchWithCredentials(API_URLS.PROXY_CHAT, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      console.log('响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      // 检查是否为流式响应
      const contentType = response.headers.get('Content-Type') || '';
      const isStreamResponse = contentType.includes('text/event-stream') || 
                              contentType.includes('text/plain') && streamEnabled;

      let finalResponse: string;
      
      if (isStreamResponse && streamEnabled) {
        console.log('处理流式响应...');
        finalResponse = await handleStreamResponse(response);
      } else {
        console.log('处理普通响应...');
        finalResponse = await handleNonStreamResponse(response);
      }

      // 显示剩余余额
      const remainingBalance = response.headers.get('X-Remaining-Balance');
      if (remainingBalance) {
        console.log('剩余余额:', remainingBalance);
        // 可以更新UI显示余额
        if (stats) {
          setStats({
            ...stats,
            stats: {
              ...stats.stats,
              balance: parseFloat(remainingBalance)
            }
          });
        }
      }

    } catch (error) {
      console.error('API请求失败:', error);
      setResponse(`错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      setIsStreaming(false);
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
              <span>${stats.stats.balance.toFixed(6)}</span>
            </div>
            <div className="info-item">
              <strong>总消费：</strong>
              <span>${stats.stats.totalSpent.toFixed(6)}</span>
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
                <strong>{modelInfo.name || modelInfo.id}</strong>
                <span>({modelInfo.provider} - {modelInfo.category})</span>
                <span className="pricing">
                  输入: ${modelInfo.pricing.input} / 输出: ${modelInfo.pricing.output} {modelInfo.pricing.unit}
                </span>
                {modelInfo.limits && (
                  <span className="limits">
                    最大Token: {modelInfo.limits.maxTokens} | 频率限制: {modelInfo.limits.rateLimit}/分钟
                  </span>
                )}
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
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="text-embedding-ada-002">Text Embedding Ada 002</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={streamEnabled}
              onChange={(e) => setStreamEnabled(e.target.checked)}
            />
            启用流式传输 (Stream)
          </label>
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
          {loading ? (isStreaming ? '流式响应中...' : '发送中...') : '发送请求'}
        </button>

        {response && (
          <div className="response-section">
            <h4>📝 响应结果: {isStreaming && <span style={{color: '#007bff'}}>● 实时流式传输中...</span>}</h4>
            <div className="response-content">
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
