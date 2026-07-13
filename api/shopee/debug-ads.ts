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
  return response.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { shop_id, access_token } = req.query;
  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const accessToken = access_token as string;
  const shopId = shop_id as string;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = formatDate(weekAgo);
  const endDate = formatDate(today);

  try {
    // 调用3个API，返回完整的原始响应
    const [balance, dailyPerf, campaignList] = await Promise.all([
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

    return res.status(200).json({
      date_range: { start_date: startDate, end_date: endDate },
      raw_balance: balance,
      raw_daily_performance: dailyPerf,
      raw_campaign_list: campaignList,
      daily_records_count: Array.isArray(dailyPerf?.response) ? dailyPerf.response.length : 'not an array',
      daily_first_record: Array.isArray(dailyPerf?.response) && dailyPerf.response.length > 0 ? dailyPerf.response[0] : null,
      daily_all_field_names: Array.isArray(dailyPerf?.response) && dailyPerf.response.length > 0 ? Object.keys(dailyPerf.response[0]) : [],
      campaign_response_keys: campaignList?.response ? Object.keys(campaignList.response) : 'no response',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
