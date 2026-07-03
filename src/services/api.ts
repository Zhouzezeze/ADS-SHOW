import type { PlatformData, Platform } from '../types';
import { generateMockData } from '../mock/data';

export const fetchAdData = async (platform: Platform): Promise<{ data: PlatformData; isReal: boolean; source: string }> => {
  if (platform === 'total') {
    const shopee = await fetchAdData('shopee');
    const amazon = await fetchAdData('amazon');
    
    const combinedDaily = [...shopee.data.daily]; // Simplified: just use one for now or merge properly
    // In a real app we'd merge by date. For mock, just return one sets combined
    
    return {
      data: {
        summary: {
          impressions: shopee.data.summary.impressions + amazon.data.summary.impressions,
          clicks: shopee.data.summary.clicks + amazon.data.summary.clicks,
          spend: shopee.data.summary.spend + amazon.data.summary.spend,
          orders: shopee.data.summary.orders + amazon.data.summary.orders,
          sales: shopee.data.summary.sales + amazon.data.summary.sales,
          ctr: ((shopee.data.summary.clicks + amazon.data.summary.clicks) / (shopee.data.summary.impressions + amazon.data.summary.impressions)) * 100,
          roas: (shopee.data.summary.sales + amazon.data.summary.sales) / (shopee.data.summary.spend + amazon.data.summary.spend),
          acos: ((shopee.data.summary.spend + amazon.data.summary.spend) / (shopee.data.summary.sales + amazon.data.summary.sales)) * 100,
          cvr: ((shopee.data.summary.orders + amazon.data.summary.orders) / (shopee.data.summary.clicks + amazon.data.summary.clicks)) * 100,
          cpc: (shopee.data.summary.spend + amazon.data.summary.spend) / (shopee.data.summary.clicks + amazon.data.summary.clicks),
        },
        daily: shopee.data.daily.map((d, i) => {
          const a = amazon.data.daily[i] || amazon.data.daily[0];
          return {
            ...d,
            impressions: d.impressions + a.impressions,
            clicks: d.clicks + a.clicks,
            spend: d.spend + a.spend,
            orders: d.orders + a.orders,
            sales: d.sales + a.sales,
            roas: (d.sales + a.sales) / (d.spend + a.spend)
          };
        }),
        products: [...shopee.data.products, ...amazon.data.products],
        diagnosis: {
          totalSkus: shopee.data.diagnosis.totalSkus + amazon.data.diagnosis.totalSkus,
          burningSkus: shopee.data.diagnosis.burningSkus + amazon.data.diagnosis.burningSkus,
          canAddBudget: shopee.data.diagnosis.canAddBudget + amazon.data.diagnosis.canAddBudget,
          highImpNoConv: shopee.data.diagnosis.highImpNoConv + amazon.data.diagnosis.highImpNoConv,
          overallRoas: (shopee.data.summary.sales + amazon.data.summary.sales) / (shopee.data.summary.spend + amazon.data.summary.spend),
          totalSpend: shopee.data.summary.spend + amazon.data.summary.spend,
          totalSales: shopee.data.summary.sales + amazon.data.summary.sales,
          suggestion: '全渠道数据概览'
        }
      },
      isReal: shopee.isReal && amazon.isReal,
      source: 'Aggregated Data'
    };
  }

  try {
    const accessToken = localStorage.getItem('shopee_access_token');
    const shopId = localStorage.getItem('shopee_shop_id');
    const expireTime = localStorage.getItem('shopee_token_expire');

    if (platform === 'shopee' && accessToken && shopId) {
      // Check for expiration and refresh
      if (expireTime && Date.now() > parseInt(expireTime)) {
        console.log('Token expired, refreshing...');
        const refreshRes = await fetch('/api/shopee/refresh-token', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: localStorage.getItem('shopee_refresh_token') })
        });
        if (refreshRes.ok) {
          const newData = await refreshRes.json();
          localStorage.setItem('shopee_access_token', newData.access_token);
          localStorage.setItem('shopee_token_expire', (Date.now() + 3600 * 1000).toString());
        }
      }

      const response = await fetch(`/api/shopee/ads?shop_id=${shopId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shopee_access_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { data, isReal: true, source: 'Shopee API' };
      }
    }
    
    // Fallback to mock
    return {
      data: generateMockData(platform as 'shopee' | 'amazon'),
      isReal: false,
      source: 'Mock Data'
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      data: generateMockData(platform as 'shopee' | 'amazon'),
      isReal: false,
      source: 'Mock Data (Error Fallback)'
    };
  }
};
