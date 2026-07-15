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
  path: string, partnerId: number, partnerKey: string,
  accessToken: string, shopId: string, extraParams: Record<string, string> = {}
) {
  const host = "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(partnerId, path, timestamp, accessToken, shopId, partnerKey);
  const allParams: Record<string, string> = {
    partner_id: String(partnerId), timestamp: String(timestamp), sign,
    access_token: accessToken, shop_id: shopId, ...extraParams,
  };
  const qs = Object.entries(allParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return { url: `${host}${path}?${qs}`, params: allParams };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { shop_id, access_token, campaign_id } = req.query;
  if (!shop_id || !access_token) return res.status(400).json({ error: 'Missing params' });

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const accessToken = access_token as string;
  const shopId = shop_id as string;
  const testCampaignId = (campaign_id as string) || '42202822';

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = formatDate(weekAgo);
  const endDate = formatDate(today);
  const path = "/api/v2/ads/get_product_campaign_daily_performance";

  try {
    // 测试多种参数组合
    const [test1, test2, test3] = await Promise.all([
      shopeeApiCall(path, partnerId, partnerKey, accessToken, shopId, {
        start_date: startDate, end_date: endDate, campaign_id_list: testCampaignId,
      }),
      shopeeApiCall(path, partnerId, partnerKey, accessToken, shopId, {
        start_date: startDate, end_date: endDate, campaign_id: testCampaignId,
      }),
      shopeeApiCall(path, partnerId, partnerKey, accessToken, shopId, {
        start_date: startDate, end_date: endDate,
      }),
    ]);

    // 实际调用看返回
    const callApi = async (url: string) => {
      const response = await axios.get(url, { validateStatus: () => true });
      return response.data;
    };

    const [res1, res2, res3] = await Promise.all([
      callApi(test1.url),
      callApi(test2.url),
      callApi(test3.url),
    ]);

    return res.status(200).json({
      campaign_id_tested: testCampaignId,
      date_range: { startDate, endDate },
      test1_campaign_id_list: {
        params_used: Object.keys(test1.params).filter(k => !['partner_id','timestamp','sign','access_token','shop_id'].includes(k)),
        url: test1.url,
        response: res1,
      },
      test2_campaign_id_single: {
        params_used: Object.keys(test2.params).filter(k => !['partner_id','timestamp','sign','access_token','shop_id'].includes(k)),
        url: test2.url,
        response: res2,
      },
      test3_no_campaign_id: {
        params_used: Object.keys(test3.params).filter(k => !['partner_id','timestamp','sign','access_token','shop_id'].includes(k)),
        url: test3.url,
        response: res3,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = { maxDuration: 60 };
