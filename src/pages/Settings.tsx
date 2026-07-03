import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Link2, ShieldCheck, AlertCircle, Trash2, CheckCircle } from 'lucide-react';

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [connectedShop, setConnectedShop] = useState<string | null>(null);

  // 初始化时读取本地存储的店铺信息
  useEffect(() => {
    const savedShopId = localStorage.getItem('shopee_shop_id');
    if (savedShopId) {
      setConnectedShop(savedShopId);
    }
  }, []);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shopee/auth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('无法获取授权链接，请检查网络或配置');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('确定要断开此店铺连接吗？')) {
      localStorage.removeItem('shopee_shop_id');
      localStorage.removeItem('shopee_auth_code');
      setConnectedShop(null);
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
            {connectedShop ? (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold flex items-center gap-1">
                  <CheckCircle size={14} /> ID: {connectedShop}
                </span>
                <button 
                  onClick={handleDisconnect}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="断开连接"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <span className="text-gray-400 italic">暂无连接</span>
            )}
          </div>
        </div>

        {connectedShop ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-green-500" size={20} />
              <div>
                <p className="text-sm font-bold text-green-800">店铺已成功连接</p>
                <p className="text-xs text-green-600 mt-0.5">看板现在可以拉取该店铺的广告报表数据了。</p>
              </div>
            </div>
            <button
              onClick={handleAuthorize}
              className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
            >
              更新授权 (重新登录)
            </button>
          </div>
        ) : (
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {loading ? '正在跳转...' : '立即去 Shopee 授权'}
          </button>
        )}

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
