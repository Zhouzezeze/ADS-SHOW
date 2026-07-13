import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

function generateSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: string, partnerKey: string): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

async function shopeeApiCall(path: string, partnerId: number, partnerKey: string, accessToken: string, shopId: string, extraParams: Record<string, any> = {}) {
  const host = "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(partnerId, path, timestamp, accessToken, shopId, partnerKey);
  
  // 构建基础 URL
  let url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;
  
  // 将额外参数附加到 URL
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url += `&${key}=${encodeURIComponent(value)}`;
    }
  });

  try {
    const response = await axios.get(url);
    console.log(`[Shopee API] ${path} response:`, JSON.stringify(response.data).substring(0, 500));
    return response.data;
  } catch (error: any) {
    console.error(`[Shopee API Error] ${path}:`, error.response?.data || error.message);
    throw error;
  }
}

// 新增：获取广告活动详情（包括商品信息）
async function getCampaignDetails(campaignId: number, partnerId: number, partnerKey: string, accessToken: string, shopId: string) {
  try {
    const detailRes = await shopeeApiCall(
      "/api/v2/ads/get_product_campaign_detail",
      partnerId, partnerKey, accessToken, shopId,
      { campaign_id: campaignId }
    );
    return detailRes.response || detailRes;
  } catch (error: any) {
    console.error(`[Shopee] Failed to get campaign detail for ${campaignId}:`, error.message);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { shop_id, access_token } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

  try {
    // Step 1: 获取所有广告活动 ID
    // 注意：Shopee 广告 API 需要先获取 campaign_id_list，然后才能获取性能数据
    const campaignRes = await shopeeApiCall(
      "/api/v2/ads/get_campaign_id_list",
      partnerId, partnerKey, access_token as string, shop_id as string,
      { ad_type: 'all', offset: 0, limit: 100 }
    );

    const campaignIdList = campaignRes.response?.campaign_id_list || [];
    const campaignIds = campaignIdList.join(',');
    console.log('[Shopee] Campaign IDs:', campaignIds);

    if (!campaignIds) {
      return res.status(200).json({
        summary: { impressions: 0, clicks: 0, ctr: 0, spend: 0, orders: 0, sales: 0, acos: 0, roas: 0, cvr: 0, cpc: 0, issueLinks: 0 },
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
      return `${dd}-${mm}-${yyyy}`; // Shopee 要求 DD-MM-YYYY 格式
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

    // 根据官方文档，返回数据在 metrics_list 中
    const perfList = perfRes.response?.metrics_list || perfRes.response?.performance_list || [];
    console.log('[Shopee] Performance records count:', perfList.length);
    if (perfList.length > 0) {
      console.log('[Shopee] First record sample:', JSON.stringify(perfList[0]).substring(0, 500));
    }

    // Step 3: 聚合数据
    // 官方文档字段名：impression, clicks, expense, broad_gmv, broad_order, broad_roi, broad_cir
    let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalOrders = 0, totalSales = 0;
    const dailyMap: Record<string, any> = {};

    perfList.forEach((item: any) => {
      // 兼容多种可能的字段名
      const imp = item.impression || item.impressions || 0;
      const clk = item.clicks || item.click || 0;
      const cost = parseFloat(item.expense || item.cost || item.spend || '0');
      const ord = item.broad_order || item.broad_order_count || item.direct_order_count || item.order || item.orders || 0;
      const gmv = parseFloat(item.broad_gmv || item.direct_gmv || item.gmv || item.sales || '0');

      totalImpressions += imp;
      totalClicks += clk;
      totalSpend += cost;
      totalOrders += ord;
      totalSales += gmv;

      const day = item.date || item.report_date || 'N/A';
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, impressions: 0, clicks: 0, ctr: 0, spend: 0, orders: 0, sales: 0, acos: 0, roas: 0, cvr: 0, cpc: 0 };
      }
      dailyMap[day].impressions += imp;
      dailyMap[day].clicks += clk;
      dailyMap[day].spend += cost;
      dailyMap[day].orders += ord;
      dailyMap[day].sales += gmv;
    });

    // 计算每日衍生指标
    const daily = Object.values(dailyMap).map((d: any) => ({
      ...d,
      ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
      acos: d.sales > 0 ? parseFloat(((d.spend / d.sales) * 100).toFixed(2)) : 0,
      roas: d.spend > 0 ? parseFloat((d.sales / d.spend).toFixed(2)) : 0,
      cvr: d.clicks > 0 ? parseFloat(((d.orders / d.clicks) * 100).toFixed(2)) : 0,
      cpc: d.clicks > 0 ? parseFloat((d.spend / d.clicks).toFixed(2)) : 0,
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
      cpc: totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
      issueLinks: 0,
    };

    const diagnosis = {
      totalSkus: campaignIdList.length,
      burningSkus: 0,
      canAddBudget: 0,
      highImpNoConv: 0,
      overallRoas: summary.roas,
      totalSpend: summary.spend,
      totalSales: summary.sales,
      suggestion: `共 ${campaignIdList.length} 个广告活动，整体 ROAS ${summary.roas}，花费 $${summary.spend.toFixed(2)}，销售 $${summary.sales.toFixed(2)}。`,
    };

    res.status(200).json({ summary, daily, products: [], diagnosis });
  } catch (error: any) {
    console.error('[Shopee] Ads fetch error:', error.message);
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
}

export const config = {
  maxDuration: 30,
};
