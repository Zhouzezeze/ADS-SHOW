import React from 'react';
import { Settings as SettingsIcon, Link2, ShieldCheck, AlertCircle } from 'lucide-react';

const SettingsPage = () => {
  const [loading, setLoading] = React.useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shopee/auth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // 跳转到 Shopee 官方授权页
      }
    } catch (err) {
      alert('无法获取授权链接，请检查网络或配置');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon size={24} /> 系统设置
        </h1>
        <p className="text-gray-500">配置您的 API 密钥和店铺授权</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Link2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Shopee 店铺授权</h3>
            <p className="text-gray-500 text-sm mt-1">
              连接您的 Shopee 店铺以自动同步广告数据。授权一次有效期通常为 30 天。
            </p>
          </div>
        </div>

        <div className="border-t border-b border-gray-100 py-6 mb-8 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">API 状态</span>
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <ShieldCheck size={14} /> 配置已就绪
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">当前已连接店铺</span>
            <span className="text-gray-400 italic">暂无连接</span>
          </div>
        </div>

        <button
          onClick={handleAuthorize}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
            loading ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
          }`}
        >
          {loading ? '正在跳转...' : '立即去 Shopee 授权'}
        </button>

        <div className="mt-6 flex items-start gap-2 p-4 bg-amber-50 rounded-lg">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            提示：点击按钮后，您将被引导至 Shopee 官方后台。请登录您的卖家账号并确认授权。
            授权完成后，看板会自动获取 Access Token。
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
