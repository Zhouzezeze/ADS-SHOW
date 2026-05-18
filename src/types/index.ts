export interface AdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
  cvr: number;
}

export interface DailyData extends AdMetrics {
  date: string;
}

export interface ProductData extends AdMetrics {
  id: string;
  sku: string;
  name: string;
  image: string;
  status: '正常' | '无转化' | '转化率偏低' | 'ROAS偏低' | '点击率偏低' | '成本异常';
  date: string;
}

export interface PlatformData {
  summary: AdMetrics & { issueLinks: number };
  daily: DailyData[];
  products: ProductData[];
  diagnosis: {
    totalSkus: number;
    burningSkus: number;
    canAddBudget: number;
    highImpNoConv: number;
    overallRoas: number;
  };
}

export type Platform = 'shopee' | 'amazon' | 'total';
