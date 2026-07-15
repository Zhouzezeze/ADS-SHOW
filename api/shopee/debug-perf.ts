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
  const url = `${host}${path}?${qs}`;
  const response = await axios.get(url, { validateStatus: () => true });
  return response.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { shop_id, access_token } = req.query;
  if (!shop_id || !access_token) return res.status(400).json({ error: 'Missing params' });

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const accessToken = access_token as string;
  const shopId = shop_id as string;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = formatDate(weekAgo);
  const endDate = formatDate(today);

  try {
    // 1. 获取活动列表
    const campaignListRes = await shopeeApiCall(
      "/api/v2/ads/get_product_level_campaign_id_list",
      partnerId, partnerKey, accessToken, shopId,
      { offset: '0', limit: '5' }
    );

    let campaignIds: string[] = [];
    if (campaignListRes.response?.campaign_list) {
      campaignIds = campaignListRes.response.campaign_list.slice(0, 5).map((c: any) => String(c.campaign_id));
    }

    // 2. 获取活动表现数据（只取前5个活动）
    let perfResponse: any = {};
    if (campaignIds.length > 0) {
      perfResponse = await shopeeApiCall(
        "/api/v2/ads/get_product_campaign_daily_performance",
        partnerId, partnerKey, accessToken, shopId,
        { start_date: startDate, end_date: endDate, campaign_id_list: campaignIds.join(',') }
      );
    }

    // 3. 如果有 item_id，尝试获取商品详情（取第一个 item_id）
    let itemInfo: any = null;
    let firstItemId: string | null = null;
    if (perfResponse.response && Array.isArray(perfResponse.response)) {
      const records = perfResponse.response;
      if (records.length > 0) {
        const keys = Object.keys(records[0]);
        const itemIds = records.map((r: any) => r.item_id).filter(Boolean);
        if (itemIds.length > 0) {
          firstItemId = String(itemIds[0]);
          itemInfo = await shopeeApiCall(
            "/api/v2/product/get_item_base_info",
            partnerId, partnerKey, accessToken, shopId,
            { item_id_list: firstItemId }
          );
        }
      }
    }

    return res.status(200).json({
      campaign_ids_used: campaignIds,
      perf_response: perfResponse,
      perf_first_record_keys: perfResponse.response?.[0] ? Object.keys(perfResponse.response[0]) : [],
      perf_first_record_sample: perfResponse.response?.[0] || null,
      perf_record_count: perfResponse.response?.length || 0,
      first_item_id: firstItemId,
      item_info_response: itemInfo,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = { maxDuration: 60 };
