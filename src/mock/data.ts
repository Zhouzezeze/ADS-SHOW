import type { DailyData, PlatformData, ProductData, AdMetrics } from '../types';

const generateDailyData = (days: number, baseSpend: number): DailyData[] => {
  return Array.from({ length: days }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const spend = baseSpend * (0.8 + Math.random() * 0.4);
    const sales = spend * (3 + Math.random() * 4);
    const clicks = Math.floor(spend / (0.5 + Math.random()));
    const impressions = clicks * (20 + Math.random() * 30);
    const orders = Math.floor(sales / (15 + Math.random() * 10));

    return {
      date: date.toISOString().split('T')[0],
      spend: parseFloat(spend.toFixed(2)),
      sales: parseFloat(sales.toFixed(2)),
      impressions,
      clicks,
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
      orders,
      acos: parseFloat(((spend / sales) * 100).toFixed(2)),
      roas: parseFloat((sales / spend).toFixed(2)),
      cvr: parseFloat(((orders / clicks) * 100).toFixed(2)),
    };
  });
};

const productNames = ['Talhe...', 'Jk-7', 'A170-D', 'Ralo...', 'Moldu...', 'Ga...', 'Kit 4 ou 8 G...'];
const statuses: ProductData['status'][] = ['正常', '无转化', '转化率偏低', 'ROAS偏低', '点击率偏低', '成本异常'];

const generateProducts = (count: number): ProductData[] => {
  return Array.from({ length: count }).map((_, i) => {
    const spend = 50 + Math.random() * 500;
    const sales = Math.random() > 0.2 ? spend * (2 + Math.random() * 8) : 0;
    const clicks = Math.floor(spend / (0.3 + Math.random()));
    const impressions = clicks * (10 + Math.random() * 50);
    const orders = sales > 0 ? Math.floor(sales / 20) : 0;

    return {
      id: `P-${1000 + i}`,
      sku: `SKU-${1000 + i}`,
      name: productNames[i % productNames.length],
      image: `https://picsum.photos/seed/${i}/40/40`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: '05-16',
      spend: parseFloat(spend.toFixed(2)),
      sales: parseFloat(sales.toFixed(2)),
      impressions,
      clicks,
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
      orders,
      acos: sales > 0 ? parseFloat(((spend / sales) * 100).toFixed(2)) : 0,
      roas: sales > 0 ? parseFloat((sales / spend).toFixed(2)) : 0,
      cvr: clicks > 0 ? parseFloat(((orders / clicks) * 100).toFixed(2)) : 0,
    };
  });
};

export const shopeeMockData: PlatformData = {
  summary: {
    impressions: 1250000,
    clicks: 45000,
    ctr: 3.6,
    spend: 15000.5,
    orders: 1200,
    sales: 85000.2,
    acos: 17.65,
    roas: 5.67,
    cvr: 2.67,
    issueLinks: 4159,
  },
  daily: generateDailyData(30, 500),
  products: generateProducts(15),
  diagnosis: {
    totalSkus: 50,
    burningSkus: 0,
    canAddBudget: 2,
    highImpNoConv: 0,
    overallRoas: 9.67,
  }
};

export const amazonMockData: PlatformData = {
  summary: {
    impressions: 2100000,
    clicks: 68000,
    ctr: 3.24,
    spend: 32000.8,
    orders: 2800,
    sales: 195000.5,
    acos: 16.41,
    roas: 6.09,
    cvr: 4.12,
    issueLinks: 1250,
  },
  daily: generateDailyData(30, 1000),
  products: generateProducts(20),
  diagnosis: {
    totalSkus: 85,
    burningSkus: 2,
    canAddBudget: 5,
    highImpNoConv: 1,
    overallRoas: 6.09,
  }
};
