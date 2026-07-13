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
    const errMsg = `API ${path} failed: ${body.error} (${body.message || ''})`;
    console.error('[ads]', errMsg);
    return { _error: errMsg, _raw: body };
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

    // 并行请求所有数据 (使用与 check-permissions.ts 完全相同的方式)
    const [balanceRes, shopDailyRes, campaignListRes] = await Promise.all([
      shopeeApiCall("/api/v2/ads/get_total_balance", partnerId, partnerKey, accessToken, shopId),
      shopeeApiCall("/api/v2/ads/get_all_cpc_ads_daily_performance", partnerId, partnerKey, accessToken, shopId, {
        start_date: startDate,
        end_date: endDate,
      }),
      shopeeApiCall("/api/v2/ads/get_product_level_campaign_id_list", partnerId, partnerKey, accessToken, shopId, {
        ad_type: 'all',
        offset: '0',
        limit: '100',
      }),
    ]);

    // 余额
    let totalBalance = 0;
    if (!balanceRes._error) {
      totalBalance = balanceRes.response?.total_balance || 0;
    }

    // 店铺日度表现
    let shopDaily: any[] = [];
    if (!shopDailyRes._error) {
      shopDaily = Array.isArray(shopDailyRes.response) ? shopDailyRes.response : [];
    }

    // 广告活动 ID 列表
    let campaignIds: number[] = [];
    if (!campaignListRes._error) {
      campaignIds = campaignListRes.response?.campaign_id_list || [];
    }

    // 获取商品级日度表现
    let productPerfData: any[] = [];
    if (campaignIds.length > 0) {
      const productPerfRes = await shopeeApiCall(
        "/api/v2/ads/get_product_campaign_daily_performance",
        partnerId, partnerKey, accessToken, shopId,
        {
          start_date: startDate,
          end_date: endDate,
          campaign_id_list: campaignIds.join(','),
        }
      );
      if (!productPerfRes._error) {
        productPerfData = Array.isArray(productPerfRes.response?.metrics_list)
          ? productPerfRes.response.metrics_list
          : (Array.isArray(productPerfRes.response) ? productPerfRes.response : []);
      }
    }

    // ===== 聚合店铺级汇总 =====
    let totalImpressions = 0, totalClicks = 0, totalSpend = 0;
    let totalBroadOrders = 0, totalBroadGmv = 0;
    const dailyMap: Record<string, any> = {};

    shopDaily.forEach((item: any) => {
      const imp = Number(item.impression || 0);
      const clk = Number(item.clicks || 0);
      const expense = parseFloat(item.expense || '0');
      const bOrder = Number(item.broad_order || 0);
      const bGmv = parseFloat(item.broad_gmv || '0');

      totalImpressions += imp;
      totalClicks += clk;
      totalSpend += expense;
      totalBroadOrders += bOrder;
      totalBroadGmv += bGmv;

      const day = item.date || '';
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, impressions: 0, clicks: 0, spend: 0, orders: 0, sales: 0 };
      }
      dailyMap[day].impressions += imp;
      dailyMap[day].clicks += clk;
      dailyMap[day].spend += expense;
      dailyMap[day].orders += bOrder;
      dailyMap[day].sales += bGmv;
    });

    const summary = {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      spend: parseFloat(totalSpend.toFixed(2)),
      orders: totalBroadOrders,
      sales: parseFloat(totalBroadGmv.toFixed(2)),
      acos: totalBroadGmv > 0 ? parseFloat(((totalSpend / totalBroadGmv) * 100).toFixed(2)) : 0,
      roas: totalSpend > 0 ? parseFloat((totalBroadGmv / totalSpend).toFixed(2)) : 0,
      cvr: totalClicks > 0 ? parseFloat(((totalBroadOrders / totalClicks) * 100).toFixed(2)) : 0,
      cpc: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
      issueLinks: 0,
      total_balance: totalBalance,
    };

    const daily = Object.values(dailyMap).map((d: any) => ({
      ...d,
      spend: parseFloat(d.spend.toFixed(2)),
      sales: parseFloat(d.sales.toFixed(2)),
      ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
      acos: d.sales > 0 ? parseFloat(((d.spend / d.sales) * 100).toFixed(2)) : 0,
      roas: d.spend > 0 ? parseFloat((d.sales / d.spend).toFixed(2)) : 0,
      cvr: d.clicks > 0 ? parseFloat(((d.orders / d.clicks) * 100).toFixed(2)) : 0,
      cpc: d.clicks > 0 ? parseFloat((d.spend / d.clicks).toFixed(2)) : 0,
    })).sort((a, b) => {
      const [ad, am, ay] = a.date.split('-').map(Number);
      const [bd, bm, by] = b.date.split('-').map(Number);
      return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime();
    });

    // ===== 商品级数据 =====
    const productMap: Record<string, any> = {};
    productPerfData.forEach((item: any) => {
      const key = String(item.item_id || item.model_id || item.product_id || item.campaign_id || 'unknown');
      if (!productMap[key]) {
        productMap[key] = {
          id: key,
          sku: String(item.item_id || key),
          name: item.item_name || item.name || `商品 ${key}`,
          image: item.image_url || item.image || '',
          campaign_name: item.campaign_name || '',
          ad_group: item.ad_group_name || '',
          date: '',
          status: '正常' as const,
          impressions: 0, clicks: 0, spend: 0, orders: 0, sales: 0,
          ctr: 0, acos: 0, roas: 0, cvr: 0, cpc: 0,
        };
      }
      const p = productMap[key];
      p.impressions += Number(item.impression || 0);
      p.clicks += Number(item.clicks || 0);
      p.spend += parseFloat(item.expense || '0');
      p.orders += Number(item.broad_order || item.direct_order || 0);
      p.sales += parseFloat(item.broad_gmv || item.direct_gmv || '0');
    });

    const products = Object.values(productMap).map((p: any) => {
      p.spend = parseFloat(p.spend.toFixed(2));
      p.sales = parseFloat(p.sales.toFixed(2));
      p.ctr = p.impressions > 0 ? parseFloat(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
      p.acos = p.sales > 0 ? parseFloat(((p.spend / p.sales) * 100).toFixed(2)) : 0;
      p.roas = p.spend > 0 ? parseFloat((p.sales / p.spend).toFixed(2)) : 0;
      p.cvr = p.clicks > 0 ? parseFloat(((p.orders / p.clicks) * 100).toFixed(2)) : 0;
      p.cpc = p.clicks > 0 ? parseFloat((p.spend / p.clicks).toFixed(2)) : 0;

      if (p.clicks > 20 && p.orders === 0) p.status = '无转化';
      else if (p.impressions > 500 && p.clicks < 5) p.status = '点击率偏低';
      else if (p.clicks > 0 && p.orders > 0 && (p.orders / p.clicks) < 0.01) p.status = '转化率偏低';
      else if (p.roas > 0 && p.roas < 2) p.status = 'ROAS偏低';
      else if (p.spend > 50 && p.orders === 0) p.status = '成本异常';
      else p.status = '正常';
      return p;
    });

    const burningSkus = products.filter((p: any) => p.status === '成本异常').length;
    const canAddBudget = products.filter((p: any) => p.roas > 5 && p.spend < 100).length;
    const highImpNoConv = products.filter((p: any) => p.status === '无转化' || p.status === '转化率偏低').length;

    // 错误信息收集
    const errors: string[] = [];
    if (shopDailyRes._error) errors.push(`日度表现: ${shopDailyRes._error}`);
    if (campaignListRes._error) errors.push(`活动列表: ${campaignListRes._error}`);
    if (balanceRes._error) errors.push(`余额: ${balanceRes._error}`);

    const diagnosis = {
      totalSkus: products.length || campaignIds.length,
      burningSkus,
      canAddBudget,
      highImpNoConv,
      overallRoas: summary.roas,
      totalSpend: summary.spend,
      totalSales: summary.sales,
      suggestion: errors.length > 0
        ? `部分API调用失败: ${errors.join('; ')}`
        : `共 ${products.length || campaignIds.length} 个广告活动，整体 ROAS ${summary.roas}，花费 $${summary.spend.toFixed(2)}，销售 $${summary.sales.toFixed(2)}。`,
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
