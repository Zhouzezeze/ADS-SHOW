import type { Platform, PlatformData } from '../types';
import { shopeeMockData, amazonMockData } from '../mock/data';

export const fetchAdData = async (platform: Platform): Promise<PlatformData> => {
  console.log(`[Dashboard] Attempting to fetch data for: ${platform}`);

  if (platform === 'shopee') {
    const shopId = localStorage.getItem('shopee_shop_id');
    const accessToken = localStorage.getItem('shopee_access_token');
    
    console.log(`[Shopee] Auth Status - ShopID: ${shopId}, HasToken: ${!!accessToken}`);

    if (shopId && accessToken) {
      try {
        const response = await fetch(`/api/shopee/ads?shop_id=${shopId}&access_token=${accessToken}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[Shopee] Real data received:', data);

        if (data && data.summary) {
          // 如果真实数据拉取成功但某些字段为空（如产品列表），用 Mock 补充显示
          return {
            ...data,
            daily: data.daily?.length > 0 ? data.daily : shopeeMockData.daily, 
            products: data.products?.length > 0 ? data.products : shopeeMockData.products,
          };
        }
      } catch (err: any) {
        console.error('[Shopee] Real data fetch failed:', err.message);
      }
    } else {
      console.warn('[Shopee] Missing credentials, falling back to mock data.');
    }
    return shopeeMockData;
  }

  if (platform === 'amazon') return amazonMockData;

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
    summary: totalSummary, 
    daily: shopeeMockData.daily, 
    products: [...shopeeMockData.products, ...amazonMockData.products], 
    diagnosis: shopeeMockData.diagnosis 
  };
};
