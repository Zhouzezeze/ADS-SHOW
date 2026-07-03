import type { PlatformData, Platform } from '../types';
import { generateMockData } from '../mock/data';

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
  const expiryStr = localStorage.getItem('shopee_token_expiry') || localStorage.getItem('shopee_token_expire');

  if (!shopId) return null;

  const expiry = expiryStr ? parseInt(expiryStr) : 0;
  const now = Date.now();
  const isExpired = now >= expiry - 5 * 60 * 1000;

  if (accessToken && !isExpired) {
    console.log('[Shopee] Token valid, using cached token');
    return { token: accessToken, shopId };
  }

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

  if (platform === 'total') {
    const shopee = await fetchAdData('shopee');
    const amazon = await fetchAdData('amazon');

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
        // 关键修复：用 query 参数传 access_token，不用 header
        const response = await fetch(`/api/shopee/ads?shop_id=${auth.shopId}&access_token=${auth.token}`);
        const data = await response.json();
        console.log('[Shopee] API Response status:', response.status);

        if (!response.ok) {
          return {
            data: generateMockData('shopee'),
            isReal: false,
            source: '模拟数据（API请求失败）',
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
