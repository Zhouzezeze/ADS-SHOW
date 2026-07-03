import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, shop_id, is_main_account } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  // 根据是否是主账号，构造不同的请求体
  const requestBody: any = {
    code: code,
    partner_id: partnerId,
  };

  if (is_main_account === '1' || !shop_id) {
    // 主账号授权，使用 main_account_id
    if (shop_id) {
      requestBody.main_account_id = parseInt(shop_id as string);
    }
    console.log('[get-token] Using main_account_id mode:', shop_id);
  } else {
    // 普通店铺授权，使用 shop_id
    requestBody.shop_id = parseInt(shop_id as string);
    console.log('[get-token] Using shop_id mode:', shop_id);
  }

  try {
    const response = await axios.post(url, requestBody);
    console.log('[get-token] Shopee response:', JSON.stringify(response.data).substring(0, 500));

    if (response.data.access_token) {
      // 从返回中提取真实的 shop_id
      const realShopId = response.data.shop_id;
      const shopIdList = response.data.shop_id_list; // 主账号可能有多个店铺

      res.status(200).json({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || '',
        expire_in: response.data.expire_in || 14400,
        shop_id: realShopId ? realShopId.toString() : (shop_id as string),
        shop_id_list: shopIdList,
        request_id: response.data.request_id,
        raw_response: response.data
      });
    } else {
      res.status(400).json({
        error: response.data.message || 'Failed to get token',
        shopee_response: response.data
      });
    }
  } catch (error: any) {
    console.error('[get-token] Error:', error.message);
    res.status(500).json({
      error: error.message,
      shopee_error: error.response?.data
    });
  }
}
