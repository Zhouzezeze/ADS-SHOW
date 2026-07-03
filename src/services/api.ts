import type { Platform, PlatformData } from '../types';
import { shopeeMockData, amazonMockData } from '../mock/data';

interface FetchResult {
  data: PlatformData;
  isReal: boolean;
  source: string;
  error?: string;
}

export const fetchAdData = async (platform: Platform): Promise<FetchResult> => {
  console.log(`[Dashboard] Fetching data for: ${platform}`);

  if (platform === 'shopee') {
    const shopId = localStorage.getItem('shopee_shop_id');
    const accessToken = localStorage.getItem('shopee_access_token');
    
    console.log(`[Shopee] ShopID: ${shopId}, HasToken: ${!!accessToken}`);

    if (shopId && accessToken) {
      try {
        const response = await fetch(`/api/shopee/ads?shop_id=${shopId}&access_token=${accessToken}`);
        const data = await response.json();
        console.log('[Shopee] API Response:', data);

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
        source: '模拟数据（未授权）',
        error: '缺少 Token 或 ShopID'
      };
    }
    return { data: shopeeMockData, isReal: false, source: '模拟数据' };
  }

  if (platform === 'amazon') {
    return { data: amazonMockData, isReal: false, source: '模拟数据（Amazon未接入）' };
  }

  const totalSummary = {
    impressions: shopeeMockData.summary.impressions + amazonMockData.summary.impressions,
    clicks: shopeeMockData.summary.clicks + amazonMockData.summary.clicks,
    spend: shopeeMockData.summary.spend + amazonMockData.summary.spend,
    sales: shopeeMockData.summary.sales + amazonMockData.summary.sales,
    orders: shopeeMockData.summary.orders + amazonMockData.summary.orders,
    ctr: parseFloat(((shopeeMockData.summary.clicks + amazonMockData.summary.clicks) / (shopeeMockData.summary.impressions + amazonMockData.summary.impressions) * 100).toFixed(2)),
    acos: parseFloat(((shopeeMockData.summary.spend + amazonMockData.summary.spend) / (shopeeMockData.summary.sales + amazonMockData.summary.sales) * 100).toFixed(2)),
    roas: parseFloat(((shopeeMockData.summary.sales + amazonMockData.summary.sales) / (shopeeMockData.summary.spend + amazonMockData.summary.spend)).toFixed(2)),
    cvr: parseFloat(((shopeeMockData.summary.orders + amazonMockData.summary.orders) / (shopeeMockData.summary.clicks + amazonMockData.summary.clicks) * 100).toFixed(2)),
    issueLinks: shopeeMockData.summary.issueLinks + amazonMockData.summary.issueLinks,
  };

  return { 
    data: {
      summary: totalSummary,
      daily: shopeeMockData.daily,
      products: [...shopeeMockData.products, ...amazonMockData.products],
      diagnosis: shopeeMockData.diagnosis
    },
    isReal: false,
    source: '模拟数据'
  };
};
