import type { Platform, PlatformData } from '../types';
import { shopeeMockData, amazonMockData } from '../mock/data';

interface FetchResult {
  data: PlatformData;
  isReal: boolean;
  source: string;
  error?: string;
}

// Token 管理器：自动检查过期并续期
async function getValidAccessToken(): Promise<{ token: string; shopId: string } | null> {
  const accessToken = localStorage.getItem('shopee_access_token');
  const refreshToken = localStorage.getItem('shopee_refresh_token');
  const shopId = localStorage.getItem('shopee_shop_id');
  const expiryStr = localStorage.getItem('shopee_token_expiry');

  if (!shopId) return null;

  // 检查 access_token 是否还有效（提前 5 分钟判断过期）
  const expiry = expiryStr ? parseInt(expiryStr) : 0;
  const now = Date.now();
  const isExpired = now >= expiry - 5 * 60 * 1000;

  if (accessToken && !isExpired) {
    // Token 还在有效期内，直接用
    console.log('[Shopee] Token valid, using cached token');
    return { token: accessToken, shopId };
  }

  // Token 过期了，尝试用 refresh_token 续期
  if (refreshToken) {
    console.log('[Shopee] Token expired, attempting refresh...');
    try {
      const res = await fetch(`/api/shopee/refresh-token?refresh_token=${refreshToken}&shop_id=${shopId}`);
      const data = await res.json();

      if (data.access_token) {
        console.log('[Shopee] Token refreshed successfully');
        localStorage.setItem('shopee_access_token', data.access_token);
        localStorage.setItem('shopee_refresh_token', data.refresh_token);
        localStorage.setItem('shopee_token_expiry', (Date.now() + (data.expire_in || 14400) * 1000).toString());
        return { token: data.access_token, shopId };
      } else {
        console.error('[Shopee] Refresh failed:', data.error);
        // refresh_token 也过期了，需要重新授权
        localStorage.removeItem('shopee_access_token');
        localStorage.removeItem('shopee_refresh_token');
        return null;
      }
    } catch (err) {
      console.error('[Shopee] Refresh error:', err);
      return null;
    }
  }

  return null;
}

export const fetchAdData = async (platform: Platform): Promise<FetchResult> => {
  console.log(`[Dashboard] Fetching data for: ${platform}`);

  if (platform === 'shopee') {
    const auth = await getValidAccessToken();

    if (auth) {
      console.log(`[Shopee] Using shopId: ${auth.shopId}`);
      try {
        const response = await fetch(`/api/shopee/ads?shop_id=${auth.shopId}&access_token=${auth.token}`);
        const data = await response.json();
        console.log('[Shopee] API Response status:', response.status);

        if (!response.ok) {
          return {
            data: shopeeMockData,
            isReal: false,
            source: '模拟数据（API请求失败）',
            error: data.error || `HTTP ${response.status}`
          };
        }

        if (data && data.summary) {
          return {
            data: {
              ...data,
              daily: data.daily?.length > 0 ? data.daily : shopeeMockData.daily,
              products: data.products?.length > 0 ? data.products : shopeeMockData.products,
            },
            isReal: true,
            source: 'Shopee 真实数据'
          };
        }
      } catch (err: any) {
        return {
          data: shopeeMockData,
          isReal: false,
          source: '模拟数据（网络错误）',
          error: err.message
        };
      }
    } else {
      return {
        data: shopeeMockData,
        isReal: false,
        source: '模拟数据（Token已过期，请重新授权）',
        error: '需要重新授权'
      };
    }
    return { data: shopeeMockData, isReal: false, source: '模拟数据（未授权）' };
  }

  if (platform === 'amazon') {
    return { data: amazonMockData, isReal: false, source: '模拟数据（Amazon未接入）' };
  }

  // 总览合并逻辑
  const shopee = await fetchAdData('shopee');
  const totalSummary = {
    impressions: shopee.data.summary.impressions + amazonMockData.summary.impressions,
    clicks: shopee.data.summary.clicks + amazonMockData.summary.clicks,
    spend: shopee.data.summary.spend + amazonMockData.summary.spend,
    sales: shopee.data.summary.sales + amazonMockData.summary.sales,
    orders: shopee.data.summary.orders + amazonMockData.summary.orders,
    ctr: parseFloat(((shopee.data.summary.clicks + amazonMockData.summary.clicks) / (shopee.data.summary.impressions + amazonMockData.summary.impressions) * 100).toFixed(2)),
    acos: parseFloat(((shopee.data.summary.spend + amazonMockData.summary.spend) / (shopee.data.summary.sales + amazonMockData.summary.sales) * 100).toFixed(2)),
    roas: parseFloat(((shopee.data.summary.sales + amazonMockData.summary.sales) / (shopee.data.summary.spend + amazonMockData.summary.spend)).toFixed(2)),
    cvr: parseFloat(((shopee.data.summary.orders + amazonMockData.summary.orders) / (shopee.data.summary.clicks + amazonMockData.summary.clicks) * 100).toFixed(2)),
    issueLinks: shopee.data.summary.issueLinks + amazonMockData.summary.issueLinks,
  };

  return {
    data: {
      summary: totalSummary,
      daily: shopee.data.daily,
      products: [...shopee.data.products, ...amazonMockData.products],
      diagnosis: shopee.data.diagnosis
    },
    isReal: shopee.isReal,
    source: shopee.source
  };
};
