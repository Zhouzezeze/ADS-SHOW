import type { PlatformData, DailyData, ProductData, ProductStatus, AdMetrics } from '../types';

const generateMetrics = (baseSpend: number, baseRoas: number): AdMetrics => {
  const spend = baseSpend + (Math.random() - 0.5) * baseSpend * 0.2;
  const roas = baseRoas + (Math.random() - 0.5) * 2;
  const sales = spend * roas;
  const clicks = Math.floor(spend / (0.1 + Math.random() * 0.2));
  const impressions = clicks * (10 + Math.floor(Math.random() * 50));
  const ctr = (clicks / impressions) * 100;
  const orders = Math.floor(sales / (20 + Math.random() * 30));
  const cvr = (orders / clicks) * 100;
  const cpc = spend / clicks;
  const acos = (spend / sales) * 100;

  return {
    impressions,
    clicks,
    ctr,
    spend,
    orders,
    sales,
    acos,
    roas,
    cvr,
    cpc,
  };
};

const statuses: ProductStatus[] = ['正常', '无转化', '转化率偏低', 'ROAS偏低', '点击率偏低', '成本异常'];

export const generateMockData = (platform: 'shopee' | 'amazon'): PlatformData => {
  const daily: DailyData[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const metrics = generateMetrics(platform === 'shopee' ? 500 : 800, platform === 'shopee' ? 4 : 5);
    daily.push({ ...metrics, date: dateStr });
  }

  const products: ProductData[] = [];
  const names = [
    'Wireless Earbuds Pro', 'Smart Watch Series 7', 'Mechanical Keyboard RGB', 'USB-C Hub 7-in-1',
    'Gaming Mouse Wireless', 'Portable SSD 1TB', 'Bluetooth Speaker Mini', 'HD Webcam 1080p',
    'Laptop Stand Aluminum', 'Ergonomic Office Chair', 'Noise Cancelling Headphones', '4K Monitor 27 inch',
    'External Battery Pack', 'Wireless Charger Pad', 'Desk Mat Large', 'Monitor Arm Single',
    'Phone Tripod Stand', 'Webcam Light Ring', 'Cable Management Box', 'Vertical Mouse'
  ];

  for (let i = 0; i < 20; i++) {
    const metrics = generateMetrics(platform === 'shopee' ? 50 : 80, platform === 'shopee' ? 3 : 4);
    const status = i === 0 ? '正常' : i % 5 === 0 ? statuses[Math.floor(Math.random() * statuses.length)] : '正常';
    
    products.push({
      ...metrics,
      id: `${platform}-${i}`,
      sku: `${platform.toUpperCase()}-${1000 + i}`,
      name: `${platform === 'shopee' ? '[Shopee] ' : '[Amazon] '}${names[i]}`,
      image: `https://picsum.photos/seed/${platform}-${i}/40/40`,
      status: status as ProductStatus,
      date: daily[daily.length - 1].date,
      campaign_name: `${platform.toUpperCase()}_Campaign_${Math.floor(i / 5)}`,
      ad_group: `Group_${i % 5}`
    });
  }

  const summary = daily.reduce((acc, curr) => ({
    impressions: acc.impressions + curr.impressions,
    clicks: acc.clicks + curr.clicks,
    spend: acc.spend + curr.spend,
    orders: acc.orders + curr.orders,
    sales: acc.sales + curr.sales,
    ctr: 0,
    acos: 0,
    roas: 0,
    cvr: 0,
    cpc: 0,
  }), { impressions: 0, clicks: 0, spend: 0, orders: 0, sales: 0, ctr: 0, acos: 0, roas: 0, cvr: 0, cpc: 0 });

  summary.ctr = (summary.clicks / summary.impressions) * 100;
  summary.roas = summary.sales / summary.spend;
  summary.acos = (summary.spend / summary.sales) * 100;
  summary.cvr = (summary.orders / summary.clicks) * 100;
  summary.cpc = summary.spend / summary.clicks;

  const diagnosis = {
    totalSkus: products.length,
    burningSkus: products.filter(p => p.status === '成本异常' || p.status === '无转化').length,
    canAddBudget: products.filter(p => p.roas > 5).length,
    highImpNoConv: products.filter(p => p.status === '无转化').length,
    overallRoas: summary.roas,
    totalSpend: summary.spend,
    totalSales: summary.sales,
    suggestion: summary.roas < 4 ? '建议优化关键词和转化率' : '表现良好，可适当增加预算'
  };

  return { summary, daily, products, diagnosis };
};
