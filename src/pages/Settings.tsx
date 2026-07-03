import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Link2, ExternalLink, Key, Trash2, Loader2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [shopeeConnected, setShopeeConnected] = useState(false);
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('shopee_access_token');
    const sid = localStorage.getItem('shopee_shop_id');
    if (token && sid) {
      setShopeeConnected(true);
      setShopId(sid);
    }
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shopee/auth-url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('无法获取授权链接，请检查后端配置');
      }
    } catch (err) {
      alert('网络错误，无法连接授权服务');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('确定要断开此店铺连接吗？')) {
      localStorage.removeItem('shopee_access_token');
      localStorage.removeItem('shopee_refresh_token');
      localStorage.removeItem('shopee_shop_id');
      localStorage.removeItem('shopee_token_expiry');
      localStorage.removeItem('shopee_token_expire');
      setShopeeConnected(false);
      setShopId('');
      window.location.reload();
    }
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
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAuth}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors border border-blue-100 text-sm"
                  >
                    更新授权
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="flex items-center gap-1 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 断开
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleAuth}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-100 disabled:bg-gray-300"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {loading ? '正在跳转...' : '立即去 Shopee 授权'}
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
                  <div className="text-xs text-slate-500 font-bold uppercase">Token 有效期</div>
                  <div className="text-sm text-slate-700">
                    {(() => {
                      const expiry = localStorage.getItem('shopee_token_expiry') || localStorage.getItem('shopee_token_expire');
                      if (!expiry) return '未知';
                      const remaining = parseInt(expiry) - Date.now();
                      if (remaining <= 0) return '已过期（自动续期中）';
                      const hours = Math.floor(remaining / (1000 * 60 * 60));
                      return `剩余约 ${hours} 小时`;
                    })()}
                  </div>
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
          <ExternalLink className="w-5 h-5" /> 环境变量配置说明
        </h3>
        <div className="space-y-4">
          <p className="text-blue-800 text-sm">
            本应用使用 Vercel 部署，请在 Vercel 控制台 (Settings → Environment Variables) 配置以下变量：
          </p>
          <div className="bg-white p-4 rounded-lg font-mono text-xs text-blue-900 space-y-2 border border-blue-200">
            <div>VITE_SHOPEE_PARTNER_ID=2036671</div>
            <div>VITE_SHOPEE_PARTNER_KEY=shpkxxxxxxxxxxxxx</div>
          </div>
          <p className="text-blue-600 text-xs">
            配置完成后需要 Redeploy 才能生效。Token 有效期 4 小时，系统会自动用 refresh_token 续期，30 天内无需重新授权。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
