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
  const { shop_id, access_token, start_date, end_date } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const accessToken = access_token as string;
  const shopId = shop_id as string;

  try {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (start_date && end_date && typeof start_date === 'string' && typeof end_date === 'string') {
      startDate = start_date;
      endDate = end_date;
    } else {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = formatDate(weekAgo);
      endDate = formatDate(today);
    }

    // 并行请求: 店铺日度表现 + 余额 + 广告活动ID列表
    const [dailyRes, balanceRes, campaignListRes] = await Promise.all([
      shopeeApiCall(
        "/api/v2/ads/get_all_cpc_ads_daily_performance",
        partnerId, partnerKey, accessToken, shopId,
        { start_date: startDate, end_date: endDate }
      ),
      shopeeApiCall(
        "/api/v2/ads/get_total_balance",
        partnerId, partnerKey, accessToken, shopId
      ),
      shopeeApiCall(
        "/api/v2/ads/get_product_level_campaign_id_list",
        partnerId, partnerKey, accessToken, shopId,
        { offset: '0', limit: '100' }
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

    // ===== 聚合汇总（基于店铺日度数据） =====
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalOrders = 0;
    let totalSales = 0;

    records.forEach((item: any) => {
      totalImpressions += parseInt(String(item.impression || '0'), 10);
      totalClicks += parseInt(String(item.clicks || '0'), 10);
      totalSpend += parseFloat(String(item.expense || '0'));
      totalOrders += parseInt(String(item.broad_order || '0'), 10);
      totalSales += parseFloat(String(item.broad_gmv || '0'));
    });

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

    // ===== 广告活动级数据 =====
    let products: any[] = [];
    const errors: string[] = [];
    if (dailyRes._error) errors.push(`日度表现: ${dailyRes._error}`);
    if (balanceRes._error) errors.push(`余额: ${balanceRes._error}`);

    // 提取广告活动 ID 列表 (response.campaign_list[].campaign_id)
    let campaignIds: string[] = [];
    if (!campaignListRes._error && campaignListRes.response) {
      const resp = campaignListRes.response;
      if (Array.isArray(resp.campaign_list)) {
        campaignIds = resp.campaign_list.map((c: any) => String(c.campaign_id)).filter(Boolean);
      } else if (Array.isArray(resp)) {
        campaignIds = resp.map((c: any) => String(c.campaign_id || c)).filter(Boolean);
      }
      console.log(`[ads] Campaign IDs found: ${campaignIds.length}`);
    } else if (campaignListRes._error) {
      console.log(`[ads] Campaign list error: ${campaignListRes._error}`);
      errors.push(`活动列表: ${campaignListRes._error}`);
    }

    // 调试信息（会返回到 diagnosis.suggestion 中）
    const debugInfo: string[] = [];

    // 如果有广告活动 ID，抓取活动级表现数据
    if (campaignIds.length > 0) {
      // 每次最多20个ID（Shopee API 限制）
      const batchSize = 20;
      const campaignBatches: string[][] = [];
      for (let i = 0; i < campaignIds.length; i += batchSize) {
        campaignBatches.push(campaignIds.slice(i, i + batchSize));
      }

      debugInfo.push(`campaigns: ${campaignIds.length}, batches: ${campaignBatches.length}`);

      for (let batchIdx = 0; batchIdx < campaignBatches.length; batchIdx++) {
        const batch = campaignBatches[batchIdx];
        const campaignPerfRes = await shopeeApiCall(
          "/api/v2/ads/get_product_campaign_daily_performance",
          partnerId, partnerKey, accessToken, shopId,
          {
            start_date: startDate,
            end_date: endDate,
            campaign_id_list: batch.join(','),
          }
        );

        if (campaignPerfRes._error) {
          console.log(`[ads] Campaign perf error (batch ${batchIdx}): ${campaignPerfRes._error}`);
          debugInfo.push(`batch${batchIdx} error: ${campaignPerfRes._error}`);
          errors.push(`活动表现batch${batchIdx}: ${campaignPerfRes._error}`);
        } else {
          const respKeys = Object.keys(campaignPerfRes.response || {});
          const campaignList = campaignPerfRes.response?.campaign_list || [];
          
          // 记录第一个活动的完整结构
          if (batchIdx === 0 && campaignList.length > 0) {
            const first = campaignList[0];
            debugInfo.push(`camp0=${JSON.stringify(first).substring(0, 300)}`);
          }
          debugInfo.push(`batch${batchIdx}: campaigns=${campaignList.length}`);

          campaignList.forEach((campaign: any) => {
            const metricsList = campaign.metrics_list || [];

            // 按活动聚合所有日期的数据
            let totalImp = 0, totalClk = 0, totalSpend = 0, totalOrders = 0, totalSales = 0;
            metricsList.forEach((m: any) => {
              totalImp += parseInt(String(m.impression || '0'), 10);
              totalClk += parseInt(String(m.clicks || '0'), 10);
              totalSpend += parseFloat(String(m.expense || '0'));
              totalOrders += parseInt(String(m.broad_order || '0'), 10);
              totalSales += parseFloat(String(m.broad_gmv || '0'));
            });

            let status: string = '无数据';
            if (totalSpend <= 0 && totalImp <= 0) {
              status = '无数据';
            } else if (totalClk > 20 && totalOrders === 0) status = '无转化';
            else if (totalImp > 500 && totalClk < 5) status = '点击率偏低';
            else if (totalClk > 0 && totalOrders > 0 && (totalOrders / totalClk) < 0.01) status = '转化率偏低';
            else if (totalSpend > 0 && totalSales > 0 && (totalSales / totalSpend) < 2) status = 'ROAS偏低';
            else if (totalSpend > 50 && totalOrders === 0) status = '成本异常';
            else status = '正常';

            const adName = campaign.ad_name || `活动 ${campaign.campaign_id || ''}`;

            products.push({
              id: String(campaign.campaign_id || products.length),
              sku: String(campaign.campaign_id || ''),
              name: adName,
              image: '',
              campaign_name: adName,
              ad_group: campaign.ad_type || campaign.campaign_placement || '',
              date: '',
              status,
              impressions: totalImp,
              clicks: totalClk,
              ctr: totalImp > 0 ? parseFloat(((totalClk / totalImp) * 100).toFixed(2)) : 0,
              spend: parseFloat(totalSpend.toFixed(2)),
              orders: totalOrders,
              sales: parseFloat(totalSales.toFixed(2)),
              acos: totalSales > 0 ? parseFloat(((totalSpend / totalSales) * 100).toFixed(2)) : 0,
              roas: totalSpend > 0 ? parseFloat((totalSales / totalSpend).toFixed(2)) : 0,
              cvr: totalClk > 0 ? parseFloat(((totalOrders / totalClk) * 100).toFixed(2)) : 0,
              cpc: totalClk > 0 ? parseFloat((totalSpend / totalClk).toFixed(2)) : 0,
            });
          });
        }
      }

      debugInfo.push(`products_with_data: ${products.length}`);
    }

    // 如果没有活动级数据，回退到日度记录
    if (products.length === 0) {
      debugInfo.push('fallback_to_daily');
      products = records.map((item: any, idx: number) => {
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
    }

    const burningSkus = products.filter((p: any) => p.status === '成本异常').length;
    const canAddBudget = products.filter((p: any) => p.roas > 5 && p.spend < 100).length;
    const highImpNoConv = products.filter((p: any) => p.status === '无转化' || p.status === '转化率偏低').length;

    const diagnosis = {
      totalSkus: products.length,
      burningSkus,
      canAddBudget,
      highImpNoConv,
      overallRoas: summary.roas,
      totalSpend: summary.spend,
      totalSales: summary.sales,
      debug_info: debugInfo.join(' | '),
      suggestion: errors.length > 0
        ? `部分API调用失败: ${errors.join('; ')} | DEBUG: ${debugInfo.join(' | ')}`
        : `共 ${products.length} 条记录（${campaignIds.length} 个广告活动），${totalOrders} 个订单，整体 ROAS ${summary.roas}，花费 ฿${summary.spend.toFixed(2)}，销售 ฿${summary.sales.toFixed(2)}。| DEBUG: ${debugInfo.join(' | ')}`,
    };

    res.status(200).json({ summary, daily, products, diagnosis });
  } catch (error: any) {
    console.error('[ads] Unexpected error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 60,
};
