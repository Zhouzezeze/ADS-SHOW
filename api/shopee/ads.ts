import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { shop_id, access_token } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;
  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/marketing/get_ads_report";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${path}${timestamp}${access_token}${shop_id}`;
  const sign = crypto.createHmac('sha256', partnerKey!).update(baseString).digest('hex');

  // 获取过去7天的数据
  const end_date = new Date().toISOString().split('T')[0];
  const start_date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&shop_id=${shop_id}&access_token=${access_token}&start_date=${start_date}&end_date=${end_date}`;

  try {
    const response = await axios.get(url);
    
    // 加工 Shopee 原始数据为看板格式
    const rawData = response.data.response || {};
    const reportList = rawData.report_list || [];

    // 计算汇总指标
    const summary = reportList.reduce((acc: any, curr: any) => ({
      impressions: acc.impressions + (curr.impression || 0),
      clicks: acc.clicks + (curr.click || 0),
      spend: acc.spend + (curr.cost || 0),
      orders: acc.orders + (curr.order || 0),
      sales: acc.sales + (curr.gmv || 0),
    }), { impressions: 0, clicks: 0, spend: 0, orders: 0, sales: 0 });

    const processedData = {
      summary: {
        ...summary,
        ctr: summary.impressions > 0 ? parseFloat(((summary.clicks / summary.impressions) * 100).toFixed(2)) : 0,
        acos: summary.sales > 0 ? parseFloat(((summary.spend / summary.sales) * 100).toFixed(2)) : 0,
        roas: summary.spend > 0 ? parseFloat((summary.sales / summary.spend).toFixed(2)) : 0,
        cvr: summary.clicks > 0 ? parseFloat(((summary.orders / summary.clicks) * 100).toFixed(2)) : 0,
        issueLinks: 0 // 后续可通过逻辑计算
      },
      daily: [], // 这里可以根据 reportList 进一步按天分组
      products: [], // 这里可以通过 get_ads_item_list 接口获取产品详情
      diagnosis: {
        totalSkus: 0,
        burningSkus: 0,
        canAddBudget: 0,
        highImpNoConv: 0,
        overallRoas: summary.spend > 0 ? parseFloat((summary.sales / summary.spend).toFixed(2)) : 0,
      }
    };

    res.status(200).json(processedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
