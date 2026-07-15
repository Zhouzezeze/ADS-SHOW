import type { PlatformData, Platform } from '../types';
import { generateMockData } from '../mock/data';

interface FetchResult {
  data: PlatformData;
  isReal: boolean;
  source: string;
  error?: string;
}

// 从服务器端获取 Token（跨设备支持）
async function fetchTokenFromServer(): Promise<{ token: string; shopId: string; refreshToken?: string } | null> {
  try {
    const res = await fetch('/api/shopee/token-store');
    const data = await res.json();
    if (data.connected && data.access_token && data.shop_id) {
      localStorage.setItem('shopee_access_token', data.access_token);
      localStorage.setItem('shopee_shop_id', data.shop_id);
      if (data.refresh_token) localStorage.setItem('shopee_refresh_token', data.refresh_token);
      if (data.token_expiry) localStorage.setItem('shopee_token_expiry', data.token_expiry);
      console.log('[Shopee] Token loaded from server');
      return { token: data.access_token, shopId: data.shop_id, refreshToken: data.refresh_token };
    }
    return null;
  } catch (err) {
    console.warn('[Shopee] Failed to fetch token from server:', err);
    return null;
  }
}

// Token 管理器：自动检查过期并续期，支持跨设备
async function getValidAccessToken(): Promise<{ token: string; shopId: string } | null> {
  let accessToken = localStorage.getItem('shopee_access_token');
  let refreshToken = localStorage.getItem('shopee_refresh_token');
  let shopId = localStorage.getItem('shopee_shop_id');
  let expiryStr = localStorage.getItem('shopee_token_expiry') || localStorage.getItem('shopee_token_expire');

  // 本地没有 Token，尝试从服务器获取
  if (!accessToken || !shopId) {
    console.log('[Shopee] No local token, fetching from server...');
    const serverToken = await fetchTokenFromServer();
    if (serverToken) {
      accessToken = serverToken.token;
      shopId = serverToken.shopId;
      refreshToken = serverToken.refreshToken || null;
      expiryStr = localStorage.getItem('shopee_token_expiry') || localStorage.getItem('shopee_token_expire');
    } else {
      return null;
    }
  }

  const expiry = expiryStr ? parseInt(expiryStr) : 0;
  const now = Date.now();
  const isExpired = now >= expiry - 5 * 60 * 1000;

  if (accessToken && !isExpired) {
    return { token: accessToken, shopId };
  }

  // Token 过期，尝试续期
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

        // 同步更新服务器上的 Token
        try {
          await fetch('/api/shopee/token-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              shop_id: shopId,
              expire_in: data.expire_in || 14400,
            }),
          });
        } catch (e) { /* ignore */ }

        return { token: data.access_token, shopId };
      }
    } catch (err) {
      console.error('[Shopee] Refresh error:', err);
    }
  }

  localStorage.removeItem('shopee_access_token');
  localStorage.removeItem('shopee_refresh_token');
  return null;
}

export const fetchAdData = async (platform: Platform, startDate?: string, endDate?: string): Promise<FetchResult> => {
  console.log(`[Dashboard] Fetching data for: ${platform}`);

  if (platform === 'total') {
    const shopee = await fetchAdData('shopee', startDate, endDate);
    const amazon = await fetchAdData('amazon', startDate, endDate);

    const totalSummary = {
      impressions: shopee.data.summary.impressions + amazon.data.summary.impressions,
      clicks: shopee.data.summary.clicks + amazon.data.summary.clicks,
      spend: shopee.data.summary.spend + amazon.data.summary.spend,
      sales: shopee.data.summary.sales + amazon.data.summary.sales,
      orders: shopee.data.summary.orders + amazon.data.summary.orders,
      ctr: (shopee.data.summary.impressions + amazon.data.summary.impressions) > 0
        ? parseFloat(((shopee.data.summary.clicks + amazon.data.summary.clicks) / (shopee.data.summary.impressions + amazon.data.summary.impressions) * 100).toFixed(2))
        : 0,
      roas: (shopee.data.summary.spend + amazon.data.summary.spend) > 0
        ? parseFloat(((shopee.data.summary.sales + amazon.data.summary.sales) / (shopee.data.summary.spend + amazon.data.summary.spend)).toFixed(2))
        : 0,
      acos: (shopee.data.summary.sales + amazon.data.summary.sales) > 0
        ? parseFloat(((shopee.data.summary.spend + amazon.data.summary.spend) / (shopee.data.summary.sales + amazon.data.summary.sales) * 100).toFixed(2))
        : 0,
      cvr: (shopee.data.summary.clicks + amazon.data.summary.clicks) > 0
        ? parseFloat(((shopee.data.summary.orders + amazon.data.summary.orders) / (shopee.data.summary.clicks + amazon.data.summary.clicks) * 100).toFixed(2))
        : 0,
      cpc: (shopee.data.summary.clicks + amazon.data.summary.clicks) > 0
        ? parseFloat(((shopee.data.summary.spend + amazon.data.summary.spend) / (shopee.data.summary.clicks + amazon.data.summary.clicks)).toFixed(2))
        : 0,
      issueLinks: 0,
    };

    return {
      data: {
        summary: totalSummary,
        daily: shopee.data.daily.map((d: any, i: number) => {
          const a = amazon.data.daily[i] || amazon.data.daily[0];
          return {
            ...d,
            impressions: d.impressions + a.impressions,
            clicks: d.clicks + a.clicks,
            spend: d.spend + a.spend,
            orders: d.orders + a.orders,
            sales: d.sales + a.sales,
          };
        }),
        products: [...shopee.data.products, ...amazon.data.products],
        diagnosis: {
          totalSkus: shopee.data.diagnosis.totalSkus + amazon.data.diagnosis.totalSkus,
          burningSkus: shopee.data.diagnosis.burningSkus + amazon.data.diagnosis.burningSkus,
          canAddBudget: shopee.data.diagnosis.canAddBudget + amazon.data.diagnosis.canAddBudget,
          highImpNoConv: shopee.data.diagnosis.highImpNoConv + amazon.data.diagnosis.highImpNoConv,
          overallRoas: totalSummary.roas,
          totalSpend: totalSummary.spend,
          totalSales: totalSummary.sales,
          suggestion: '全渠道数据概览'
        }
      },
      isReal: shopee.isReal,
      source: shopee.source
    };
  }

  if (platform === 'shopee') {
    const auth = await getValidAccessToken();

    if (auth) {
      console.log(`[Shopee] Using shopId: ${auth.shopId}`);
      try {
        let adsUrl = `/api/shopee/ads?shop_id=${auth.shopId}&access_token=${auth.token}`;
        if (startDate && endDate) {
          adsUrl += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
        }
        const response = await fetch(adsUrl);
        const data = await response.json();
        console.log('[Shopee] API Response status:', response.status);

        if (!response.ok) {
          console.error('[Shopee] API Error:', data.error || `HTTP ${response.status}`);
          return {
            data: generateMockData('shopee'),
            isReal: false,
            source: `模拟数据（API请求失败: ${data.error || `HTTP ${response.status}`}）`,
            error: data.error || `HTTP ${response.status}`
          };
        }

        if (data && data.summary) {
          return {
            data: {
              ...data,
              daily: data.daily?.length > 0 ? data.daily : generateMockData('shopee').daily,
              products: data.products?.length > 0 ? data.products : generateMockData('shopee').products,
            },
            isReal: true,
            source: 'Shopee 真实数据'
          };
        }
      } catch (err: any) {
        return {
          data: generateMockData('shopee'),
          isReal: false,
          source: '模拟数据（网络错误）',
          error: err.message
        };
      }
    } else {
      return {
        data: generateMockData('shopee'),
        isReal: false,
        source: '模拟数据（Token已过期，请重新授权）',
        error: '需要重新授权'
      };
    }
    return { data: generateMockData('shopee'), isReal: false, source: '模拟数据（未授权）' };
  }

  if (platform === 'amazon') {
    return { data: generateMockData('amazon'), isReal: false, source: '模拟数据（Amazon未接入）' };
  }

  return { data: generateMockData('shopee'), isReal: false, source: '模拟数据' };
};
