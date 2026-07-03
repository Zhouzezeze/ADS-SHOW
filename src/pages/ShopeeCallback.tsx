import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const ShopeeCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在同步授权信息...');
  const [debugInfo, setDebugInfo] = useState('');

  // Shopee 回调可能返回 shop_id 或 main_account_id
  const shopId = searchParams.get('shop_id');
  const mainAccountId = searchParams.get('main_account_id');
  const code = searchParams.get('code');

  // 判断是哪种授权模式
  const isMainAccount = !shopId && !!mainAccountId;
  const idToUse = shopId || mainAccountId;

  useEffect(() => {
    const exchangeToken = async () => {
      setDebugInfo(`Params: code=${code ? '有' : '无'}, shop_id=${shopId || '无'}, main_account_id=${mainAccountId || '无'}, mode=${isMainAccount ? '主账号' : '普通店铺'}`);

      if (code && idToUse) {
        try {
          // 根据模式决定参数
          const apiUrl = isMainAccount
            ? `/api/shopee/get-token?code=${code}&shop_id=${idToUse}&is_main_account=1`
            : `/api/shopee/get-token?code=${code}&shop_id=${idToUse}`;

          setDebugInfo(prev => prev + `\nCalling: ${apiUrl}`);
          const res = await fetch(apiUrl);
          const data = await res.json();
          setDebugInfo(prev => prev + `\nResponse: ${JSON.stringify(data).substring(0, 300)}`);

          if (data.access_token) {
            // 存储真正的 shop_id（如果 Shopee 返回了，用返回的；否则用回调的）
            const finalShopId = data.shop_id || idToUse;

            localStorage.setItem('shopee_access_token', data.access_token);
            localStorage.setItem('shopee_refresh_token', data.refresh_token || '');
            localStorage.setItem('shopee_shop_id', finalShopId);
            localStorage.setItem('shopee_token_expiry', (Date.now() + (data.expire_in || 14400) * 1000).toString());

            // 如果有多个店铺，也存起来
            if (data.shop_id_list && data.shop_id_list.length > 0) {
              localStorage.setItem('shopee_shop_id_list', JSON.stringify(data.shop_id_list));
            }

            setStatus('success');
            setMessage(`店铺授权成功！Shop ID: ${finalShopId}`);
            setTimeout(() => {
              window.location.href = '/?platform=settings';
            }, 2000);
          } else {
            throw new Error(data.error || '换取令牌失败');
          }
        } catch (err: any) {
          setStatus('error');
          setMessage(`授权失败：${err.message}`);
          setDebugInfo(prev => prev + `\nError: ${err.message}`);
        }
      } else {
        setStatus('error');
        setMessage('授权失败：缺少必要参数');
      }
    };

    exchangeToken();
  }, [code, shopId, mainAccountId, idToUse, isMainAccount]);

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
            <p className="text-xs text-gray-400 mt-4 italic">即将为您自动跳转...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">授权失败</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-400 text-left overflow-auto max-w-full whitespace-pre-wrap">
                {debugInfo}
              </div>
            )}
            <button
              onClick={() => window.location.href = '/?platform=settings'}
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
