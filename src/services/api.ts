import type { Platform, PlatformData } from '../types';
import { shopeeMockData, amazonMockData } from '../mock/data';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAdData = async (platform: Platform): Promise<PlatformData> => {
  if (platform === 'shopee') {
    const shopId = localStorage.getItem('shopee_shop_id');
    const accessToken = localStorage.getItem('shopee_access_token');
    
    if (shopId && accessToken) {
      try {
        const res = await fetch(`/api/shopee/ads?shop_id=${shopId}&access_token=${accessToken}`);
        const data = await res.json();
        if (data.summary) {
          // 合并真实数据与部分 Mock 数据（如每日趋势和产品列表，因为这些需要额外接口）
          return {
            ...data,
            daily: shopeeMockData.daily, // 暂时保留 Mock 趋势图
            products: shopeeMockData.products, // 暂时保留 Mock 产品列表
          };
        }
      } catch (err) {
        console.error('Fetch Shopee Real Data Failed:', err);
      }
    }
    return shopeeMockData;
  }

  if (platform === 'amazon') return amazonMockData;

  // 总览合并逻辑保持不变...
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

  const daily = shopeeMockData.daily.map((d, i) => ({
    ...d,
    spend: parseFloat((d.spend + amazonMockData.daily[i].spend).toFixed(2)),
    sales: parseFloat((d.sales + amazonMockData.daily[i].sales).toFixed(2)),
    orders: d.orders + amazonMockData.daily[i].orders,
  }));

  const products = [...shopeeMockData.products, ...amazonMockData.products];
  
  const diagnosis = {
    totalSkus: shopeeMockData.diagnosis.totalSkus + amazonMockData.diagnosis.totalSkus,
    burningSkus: shopeeMockData.diagnosis.burningSkus + amazonMockData.diagnosis.burningSkus,
    canAddBudget: shopeeMockData.diagnosis.canAddBudget + amazonMockData.diagnosis.canAddBudget,
    highImpNoConv: shopeeMockData.diagnosis.highImpNoConv + amazonMockData.diagnosis.highImpNoConv,
    overallRoas: parseFloat(((shopeeMockData.diagnosis.overallRoas + amazonMockData.diagnosis.overallRoas) / 2).toFixed(2)),
  };

  return { summary: totalSummary, daily, products, diagnosis };
};
