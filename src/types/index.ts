export type AdMetrics = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
  cvr: number;
  cpc: number;
};

export type DailyData = AdMetrics & {
  date: string;
};

export type ProductStatus = '正常' | '无转化' | '转化率偏低' | 'ROAS偏低' | '点击率偏低' | '成本异常';

export type ProductData = AdMetrics & {
  id: string;
  sku: string;
  name: string;
  image: string;
  status: ProductStatus;
  date: string;
  campaign_name: string;
  ad_group: string;
};

export type DiagnosisInfo = {
  totalSkus: number;
  burningSkus: number;
  canAddBudget: number;
  highImpNoConv: number;
  overallRoas: number;
  suggestion: string;
  totalSpend: number;
  totalSales: number;
};

export type PlatformData = {
  summary: AdMetrics;
  daily: DailyData[];
  products: ProductData[];
  diagnosis: DiagnosisInfo;
};

export type Platform = 'shopee' | 'amazon' | 'total';
