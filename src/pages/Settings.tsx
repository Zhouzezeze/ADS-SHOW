import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Link2, ExternalLink, Key, LayoutGrid } from 'lucide-react';

const Settings: React.FC = () => {
  const [shopeeConnected, setShopeeConnected] = useState(false);
  const [shopId, setShopId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('shopee_access_token');
    const sid = localStorage.getItem('shopee_shop_id');
    if (token && sid) {
      setShopeeConnected(true);
      setShopId(sid);
    }
  }, []);

  const handleAuth = async () => {
    try {
      // In a real app, this calls the backend to get the Shopee Auth URL
      // window.location.href = 'https://partner.shopeemobile.com/api/v2/shop/auth_partner...';
      alert('正在前往 Shopee 授权页面...');
      // For demo purposes, we'll just simulate it after a delay
      setTimeout(() => {
        localStorage.setItem('shopee_access_token', 'mock_token_' + Date.now());
        localStorage.setItem('shopee_shop_id', '12345678');
        localStorage.setItem('shopee_token_expire', (Date.now() + 3600 * 1000).toString());
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('shopee_access_token');
    localStorage.removeItem('shopee_shop_id');
    localStorage.removeItem('shopee_token_expire');
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Key className="text-blue-600" />
          API 配置与授权管理
        </h2>
        
        <div className="space-y-8">
          {/* Shopee Section */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-xl">S</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Shopee 授权状态</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {shopeeConnected ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <ShieldCheck className="w-4 h-4" /> 已连接
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                        <ShieldAlert className="w-4 h-4" /> 未连接
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {shopeeConnected ? (
                <button 
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  断开连接
                </button>
              ) : (
                <button 
                  onClick={handleAuth}
                  className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-100"
                >
                  <Link2 className="w-4 h-4" /> 立即授权
                </button>
              )}
            </div>
            
            {shopeeConnected && (
              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Shop ID</div>
                  <div className="text-sm font-mono text-slate-700">{shopId}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">授权范围</div>
                  <div className="text-sm text-slate-700">Ad Data & Analytics</div>
                </div>
              </div>
            )}
          </div>

          {/* Amazon Section */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Amazon Advertising</h3>
                  <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm font-medium">
                    <ShieldAlert className="w-4 h-4" /> 即将推出
                  </div>
                </div>
              </div>
              <button disabled className="bg-gray-200 text-gray-400 px-6 py-2.5 rounded-lg font-bold cursor-not-allowed">
                暂不支持
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" /> 环境变量配置说明
        </h3>
        <div className="space-y-4">
          <p className="text-blue-800 text-sm">
            本应用使用 Vercel 部署，如果您需要连接生产环境，请在 Vercel 控制台中配置以下环境变量：
          </p>
          <div className="bg-white p-4 rounded-lg font-mono text-xs text-blue-900 space-y-2 border border-blue-200">
            <div>SHOPEE_PARTNER_ID=xxxxx</div>
            <div>SHOPEE_PARTNER_KEY=xxxxx</div>
            <div>REDIRECT_URI=https://ads-show-lemon.vercel.app/api/shopee/callback</div>
          </div>
          <div className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline cursor-pointer">
            <ExternalLink className="w-4 h-4" /> 查看完整的开发者文档
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
