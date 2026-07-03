import React, { useState, useEffect } from 'react';
import { Bug, RefreshCw, Trash2, Copy, CheckCircle } from 'lucide-react';

const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [tokenInfo, setTokenInfo] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 收集 localStorage 中的 token 信息
    const info = {
      access_token: localStorage.getItem('shopee_access_token') ? '已设置 (长度: ' + (localStorage.getItem('shopee_access_token')?.length || 0) + ')' : '未设置',
      refresh_token: localStorage.getItem('shopee_refresh_token') ? '已设置' : '未设置',
      shop_id: localStorage.getItem('shopee_shop_id') || '未设置',
      token_expiry: localStorage.getItem('shopee_token_expiry') || '未设置',
      token_expire: localStorage.getItem('shopee_token_expire') || '未设置',
    };
    setTokenInfo(info);

    // 收集浏览器控制台日志
    const originalLog = console.log;
    const originalError = console.error;
    const logBuffer: string[] = [];

    console.log = (...args: any[]) => {
      logBuffer.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      logBuffer.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      originalError.apply(console, args);
    };

    // 定期更新日志显示
    const interval = setInterval(() => {
      if (logBuffer.length > 0) {
        setLogs(prev => [...prev, ...logBuffer].slice(-50));
        logBuffer.length = 0;
      }
    }, 1000);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      clearInterval(interval);
    };
  }, []);

  const handleClearStorage = () => {
    if (window.confirm('确定要清除所有本地存储的授权信息吗？')) {
      localStorage.removeItem('shopee_access_token');
      localStorage.removeItem('shopee_refresh_token');
      localStorage.removeItem('shopee_shop_id');
      localStorage.removeItem('shopee_token_expiry');
      localStorage.removeItem('shopee_token_expire');
      window.location.reload();
    }
  };

  const handleCopyDebugInfo = () => {
    const debugInfo = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      tokenInfo,
      logs: logs.slice(-20),
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Bug className="text-purple-600" />
          调试面板
        </h2>

        {/* Token 信息 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">授权状态</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {Object.entries(tokenInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-sm text-gray-600">{key}:</span>
                <span className="text-sm font-mono text-gray-900">{String(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleClearStorage}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              清除授权信息
            </button>
            <button
              onClick={handleCopyDebugInfo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制调试信息'}
            </button>
          </div>
        </div>

        {/* 日志输出 */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">控制台日志</h3>
          <div className="bg-gray-900 p-4 rounded-lg h-96 overflow-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无日志...</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${log.startsWith('[ERROR]') ? 'text-red-400' : 'text-green-400'}`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">快速操作</h3>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              刷新页面
            </button>
            <button
              onClick={() => window.location.href = '/?view=settings'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              返回设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
