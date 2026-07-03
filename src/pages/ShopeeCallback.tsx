import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const ShopeeCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在同步授权信息...');
  
  const shopId = searchParams.get('shop_id') || searchParams.get('main_account_id');
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // 只要拿到了 code，就算初步授权成功
      const finalShopId = shopId || 'unknown';
      localStorage.setItem('shopee_shop_id', finalShopId);
      localStorage.setItem('shopee_auth_code', code);

      setStatus('success');
      setMessage('店铺授权成功！您现在可以返回看板查看数据。');
      
      // 3秒后跳转回设置页
      setTimeout(() => {
        window.location.href = '/?platform=settings';
      }, 3000);
    } else {
      setStatus('error');
      setMessage('授权失败：未获取到店铺信息。');
    }
  }, [shopId, code]);

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
            <p className="text-gray-500">{message}</p>
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
