import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

function generateSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: string, partnerKey: string): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function shopeeApiCall(
  path: string,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: string,
  extraParams: Record<string, string> = {}
) {
  const host = "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(partnerId, path, timestamp, accessToken, shopId, partnerKey);

  const allParams: Record<string, string> = {
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: shopId,
    ...extraParams,
  };

  const qs = Object.entries(allParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${host}${path}?${qs}`;

  const response = await axios.get(url, { validateStatus: () => true });
  const body = response.data;

  if (body.error && body.error !== '') {
    return { _error: `${body.error}: ${body.message || ''}`, _raw: body };
  }
  return body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { shop_id, access_token } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const accessToken = access_token as string;
  const shopId = shop_id as string;

  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = formatDate(weekAgo);
    const endDate = formatDate(today);

    // 并行请求: 店铺日度表现 + 余额
    const [dailyRes, balanceRes] = await Promise.all([
      shopeeApiCall(
        "/api/v2/ads/get_all_cpc_ads_daily_performance",
        partnerId, partnerKey, accessToken, shopId,
        { start_date: startDate, end_date: endDate }
      ),
      shopeeApiCall(
        "/api/v2/ads/get_total_balance",
        partnerId, partnerKey, accessToken, shopId
      ),
    ]);

    // 提取日度数据
    let records: any[] = [];
    if (!dailyRes._error) {
      records = Array.isArray(dailyRes.response) ? dailyRes.response : [];
      console.log(`[ads] Daily records count: ${records.length}`);
      if (records.length > 0) {
        console.log(`[ads] First record keys: ${Object.keys(records[0]).join(', ')}`);
        console.log(`[ads] First record:`, JSON.stringify(records[0]));
      }
    }

    // 提取余额
    let totalBalance = 0;
    if (!balanceRes._error) {
      totalBalance = balanceRes.response?.total_balance || 0;
    }

    // ===== 聚合汇总 =====
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    let totalSales = 0;

    records.forEach((item: any) => {
      const imp = parseInt(String(item.impression || '0'), 10);
      const clk = parseInt(String(item.clicks || '0'), 10);
      const spend = parseFloat(String(item.expense || '0'));
      const orders = parseInt(String(item.broad_order || '0'), 10);
      const sales = parseFloat(String(item.broad_gmv || '0'));

      console.log(`[ads] Day ${item.date}: imp=${imp}, clk=${clk}, spend=${spend}, orders=${orders}, sales=${sales}`);

      totalImpressions += imp;
      totalClicks += clk;
      totalSpend += spend;
      totalOrders += orders;
      totalSales += sales;
    });

    console.log(`[ads] Totals: imp=${totalImpressions}, clk=${totalClicks}, spend=${totalSpend}, orders=${totalOrders}, sales=${totalSales}`);

    const summary = {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      spend: parseFloat(totalSpend.toFixed(2)),
      orders: totalOrders,
      sales: parseFloat(totalSales.toFixed(2)),
      acos: totalSales > 0 ? parseFloat(((totalSpend / totalSales) * 100).toFixed(2)) : 0,
      roas: totalSpend > 0 ? parseFloat((totalSales / totalSpend).toFixed(2)) : 0,
      cvr: totalClicks > 0 ? parseFloat(((totalOrders / totalClicks) * 100).toFixed(2)) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
      issueLinks: 0,
      total_balance: totalBalance,
    };

    // 每日数据
    const daily = records.map((item: any) => {
      const imp = parseInt(String(item.impression || '0'), 10);
      const clk = parseInt(String(item.clicks || '0'), 10);
      const spend = parseFloat(String(item.expense || '0'));
      const orders = parseInt(String(item.broad_order || '0'), 10);
      const sales = parseFloat(String(item.broad_gmv || '0'));

      return {
        date: item.date || '',
        impressions: imp,
        clicks: clk,
        ctr: imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0,
        spend: parseFloat(spend.toFixed(2)),
        orders,
        sales: parseFloat(sales.toFixed(2)),
        acos: sales > 0 ? parseFloat(((spend / sales) * 100).toFixed(2)) : 0,
        roas: spend > 0 ? parseFloat((sales / spend).toFixed(2)) : 0,
        cvr: clk > 0 ? parseFloat(((orders / clk) * 100).toFixed(2)) : 0,
        cpc: clk > 0 ? parseFloat((spend / clk).toFixed(2)) : 0,
      };
    });

    // 商品数据 - 用每条日度记录作为一行展示
    const products = records.map((item: any, idx: number) => {
      const imp = parseInt(String(item.impression || '0'), 10);
      const clk = parseInt(String(item.clicks || '0'), 10);
      const spend = parseFloat(String(item.expense || '0'));
      const orders = parseInt(String(item.broad_order || '0'), 10);
      const sales = parseFloat(String(item.broad_gmv || '0'));

      let status: string = '正常';
      if (clk > 20 && orders === 0) status = '无转化';
      else if (imp > 500 && clk < 5) status = '点击率偏低';
      else if (clk > 0 && orders > 0 && (orders / clk) < 0.01) status = '转化率偏低';
      else if (spend > 0 && sales > 0 && (sales / spend) < 2) status = 'ROAS偏低';
      else if (spend > 50 && orders === 0) status = '成本异常';

      return {
        id: String(idx),
        sku: `day-${item.date || idx}`,
        name: `${item.date || '未知日期'} 广告表现`,
        image: '',
        campaign_name: '',
        ad_group: '',
        date: item.date || '',
        status,
        impressions: imp,
        clicks: clk,
        ctr: imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0,
        spend: parseFloat(spend.toFixed(2)),
        orders,
        sales: parseFloat(sales.toFixed(2)),
        acos: sales > 0 ? parseFloat(((spend / sales) * 100).toFixed(2)) : 0,
        roas: spend > 0 ? parseFloat((sales / spend).toFixed(2)) : 0,
        cvr: clk > 0 ? parseFloat(((orders / clk) * 100).toFixed(2)) : 0,
        cpc: clk > 0 ? parseFloat((spend / clk).toFixed(2)) : 0,
      };
    });

    const burningSkus = products.filter((p: any) => p.status === '成本异常').length;
    const canAddBudget = products.filter((p: any) => p.roas > 5 && p.spend < 100).length;
    const highImpNoConv = products.filter((p: any) => p.status === '无转化' || p.status === '转化率偏低').length;

    const errors: string[] = [];
    if (dailyRes._error) errors.push(`日度表现: ${dailyRes._error}`);
    if (balanceRes._error) errors.push(`余额: ${balanceRes._error}`);

    const diagnosis = {
      totalSkus: records.length,
      burningSkus,
      canAddBudget,
      highImpNoConv,
      overallRoas: summary.roas,
      totalSpend: summary.spend,
      totalSales: summary.sales,
      suggestion: errors.length > 0
        ? `部分API调用失败: ${errors.join('; ')}`
        : `共 ${records.length} 天数据，${totalOrders} 个订单，整体 ROAS ${summary.roas}，花费 $${summary.spend.toFixed(2)}，销售 $${summary.sales.toFixed(2)}。`,
    };

    res.status(200).json({ summary, daily, products, diagnosis });
  } catch (error: any) {
    console.error('[ads] Unexpected error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
