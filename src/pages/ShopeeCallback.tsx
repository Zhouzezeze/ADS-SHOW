import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const ShopeeCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在同步授权信息...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const shopId = params.get('shop_id');
    const mainAccountId = params.get('main_account_id');
    const idToUse = shopId || mainAccountId;
    const isMainAccount = !shopId && !!mainAccountId;

    const exchangeToken = async () => {
      if (!code || !idToUse) {
        setStatus('error');
        setMessage('授权失败：缺少必要参数 (code 或 shop_id)');
        return;
      }

      try {
        const apiUrl = isMainAccount
          ? `/api/shopee/get-token?code=${code}&shop_id=${idToUse}&is_main_account=1`
          : `/api/shopee/get-token?code=${code}&shop_id=${idToUse}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.access_token) {
          const finalShopId = data.shop_id || idToUse;

          localStorage.setItem('shopee_access_token', data.access_token);
          localStorage.setItem('shopee_refresh_token', data.refresh_token || '');
          localStorage.setItem('shopee_shop_id', finalShopId);
          localStorage.setItem('shopee_token_expiry', (Date.now() + (data.expire_in || 14400) * 1000).toString());

          // 同时保存到服务器，这样任何设备都能访问
          try {
            await fetch('/api/shopee/token-store', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token || '',
                shop_id: finalShopId,
                expire_in: data.expire_in || 14400,
              }),
            });
          } catch (e) {
            console.warn('[ShopeeCallback] Failed to save token to server, localStorage still works');
          }

          setStatus('success');
          setMessage(`店铺授权成功！Shop ID: ${finalShopId}`);
          setTimeout(() => {
            window.location.href = '/?view=settings';
          }, 2000);
        } else {
          throw new Error(data.error || '换取令牌失败');
        }
      } catch (err: any) {
        console.error('[ShopeeCallback] Token exchange error:', err);
        setStatus('error');
        setMessage(`授权失败：${err.message}`);
      }
    };

    exchangeToken();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="text-blue-600 animate-spin mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800">{message}</h2>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="text-green-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">授权成功</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-xs text-gray-400 mt-4 italic">即将自动跳转...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">授权失败</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <button
              onClick={() => window.location.href = '/?view=settings'}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              返回设置重试
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopeeCallback;
