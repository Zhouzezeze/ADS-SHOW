import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

function generateSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: string, partnerKey: string): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

async function shopeeApiCall(
  path: string,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: string,
  extraParams: Record<string, string> = {}
) {
  const host = "https://openplatform.shopee.cn";
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

  try {
    const response = await axios.get(url, { validateStatus: () => true });
    const body = response.data;
    if (body.error && body.error !== '') {
      return { success: false, error: `${body.error}: ${body.message || ''}`, url: url.substring(0, 300) };
    }
    return { success: true, data: body, url: url.substring(0, 300) };
  } catch (err: any) {
    return { success: false, error: err.message, url: url.substring(0, 300) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { shop_id, access_token } = req.query;

    if (!shop_id || !access_token) {
      return res.status(400).json({ error: 'Missing shop_id or access_token' });
    }

    const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
    const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

    if (!partnerId || !partnerKey) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const accessToken = access_token as string;
    const shopId = shop_id as string;
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    // 并行测试所有 API
    const [shopInfo, balance, campaignList, dailyPerf] = await Promise.all([
      shopeeApiCall("/api/v2/shop/get_shop_info", partnerId, partnerKey, accessToken, shopId),
      shopeeApiCall("/api/v2/ads/get_total_balance", partnerId, partnerKey, accessToken, shopId),
      shopeeApiCall("/api/v2/ads/get_product_level_campaign_id_list", partnerId, partnerKey, accessToken, shopId, { offset: '0', limit: '10' }),
      shopeeApiCall("/api/v2/ads/get_all_cpc_ads_daily_performance", partnerId, partnerKey, accessToken, shopId, { start_date: formatDate(weekAgo), end_date: formatDate(today) }),
    ]);

    return res.status(200).json({
      diagnostics: {
        partner_id: partnerId,
        shop_id: shopId,
        access_token_length: accessToken.length,
        api_host: "https://openplatform.shopee.cn",
      },
      tests: {
        shop_info: { success: shopInfo.success, detail: shopInfo.success ? 'Token 有效' : shopInfo.error },
        balance: { success: balance.success, detail: balance.success ? `余额: ${balance.data?.response?.total_balance || 'N/A'}` : balance.error },
        campaign_list: { success: campaignList.success, detail: campaignList.success ? `活动数: ${(campaignList.data?.response?.campaign_id_list || []).length}` : campaignList.error },
        daily_performance: { success: dailyPerf.success, detail: dailyPerf.success ? `日度数据: ${(dailyPerf.data?.response || []).length} 条` : dailyPerf.error },
      },
      summary: [
        shopInfo.success ? "✅ Token 有效" : "❌ Token 无效，请重新授权",
        balance.success ? "✅ 广告余额获取成功" : "❌ 广告余额获取失败",
        campaignList.success ? "✅ 广告活动列表获取成功" : "❌ 广告活动列表获取失败",
        dailyPerf.success ? "✅ 日度表现数据获取成功" : "❌ 日度表现数据获取失败",
      ]
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export const config = {
  maxDuration: 30,
};
