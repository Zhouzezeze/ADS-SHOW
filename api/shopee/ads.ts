import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

function generateSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: string, partnerKey: string): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

async function shopeeApiCall(path: string, partnerId: number, partnerKey: string, accessToken: string, shopId: string, params: Record<string, any> = {}) {
  const host = "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(partnerId, path, timestamp, accessToken, shopId, partnerKey);

  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;

  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error: any) {
    console.error(`[Shopee API Error] ${path}:`, error.response?.data || error.message);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { shop_id, access_token } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

  try {
    // Step 1: 获取所有广告活动 ID
    const campaignRes = await shopeeApiCall(
      "/api/v2/ads/get_product_level_campaign_id_list",
      partnerId, partnerKey, access_token as string, shop_id as string,
      { ad_type: 'all', offset: 0, limit: 100 }
    );

    const campaignIds = (campaignRes.response?.campaign_id_list || []).join(',');
    console.log('[Shopee] Campaign IDs:', campaignIds);

    if (!campaignIds) {
      // 没有广告活动，返回空数据
      return res.status(200).json({
        summary: { impressions: 0, clicks: 0, ctr: 0, spend: 0, orders: 0, sales: 0, acos: 0, roas: 0, cvr: 0, issueLinks: 0 },
        daily: [],
        products: [],
        diagnosis: { totalSkus: 0, burningSkus: 0, canAddBudget: 0, highImpNoConv: 0, overallRoas: 0 }
      });
    }

    // Step 2: 获取过去7天的日度表现数据
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    const perfRes = await shopeeApiCall(
      "/api/v2/ads/get_product_campaign_daily_performance",
      partnerId, partnerKey, access_token as string, shop_id as string,
      {
        start_date: formatDate(weekAgo),
        end_date: formatDate(today),
        campaign_id_list: campaignIds,
      }
    );

    const perfList = perfRes.response?.performance_list || [];
    console.log('[Shopee] Performance records:', perfList.length);

    // Step 3: 聚合数据
    let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalOrders = 0, totalSales = 0;
    const dailyMap: Record<string, any> = {};

    perfList.forEach((item: any) => {
      const imp = item.impression || 0;
      const clk = item.click || 0;
      const cost = item.expense || 0;
      const ord = item.direct_order_count || 0;
      const gmv = item.direct_gmv || 0;

      totalImpressions += imp;
      totalClicks += clk;
      totalSpend += parseFloat(cost);
      totalOrders += ord;
      totalSales += parseFloat(gmv);

      const day = item.date || 'N/A';
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, impressions: 0, clicks: 0, ctr: 0, spend: 0, orders: 0, sales: 0, acos: 0, roas: 0, cvr: 0 };
      }
      dailyMap[day].impressions += imp;
      dailyMap[day].clicks += clk;
      dailyMap[day].spend += parseFloat(cost);
      dailyMap[day].orders += ord;
      dailyMap[day].sales += parseFloat(gmv);
    });

    // 计算每日衍生指标
    const daily = Object.values(dailyMap).map((d: any) => ({
      ...d,
      ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
      acos: d.sales > 0 ? parseFloat(((d.spend / d.sales) * 100).toFixed(2)) : 0,
      roas: d.spend > 0 ? parseFloat((d.sales / d.spend).toFixed(2)) : 0,
      cvr: d.clicks > 0 ? parseFloat(((d.orders / d.clicks) * 100).toFixed(2)) : 0,
    })).sort((a, b) => a.date.localeCompare(b.date));

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
      issueLinks: 0,
    };

    const diagnosis = {
      totalSkus: campaignIds.split(',').length,
      burningSkus: 0,
      canAddBudget: 0,
      highImpNoConv: 0,
      overallRoas: summary.roas,
    };

    res.status(200).json({ summary, daily, products: [], diagnosis });
  } catch (error: any) {
    console.error('[Shopee] Ads fetch error:', error.message);
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
}
