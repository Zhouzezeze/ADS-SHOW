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
    return res.status(500).json({ error: 'Server not configured: missing partner_id or partner_key' });
  }

  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const requestBody: any = {
    code: code,
    partner_id: partnerId,
  };

  if (is_main_account === '1' || !shop_id) {
    if (shop_id) {
      requestBody.main_account_id = parseInt(shop_id as string);
    }
    console.log('[get-token] Main account mode, main_account_id:', shop_id);
  } else {
    requestBody.shop_id = parseInt(shop_id as string);
    console.log('[get-token] Shop mode, shop_id:', shop_id);
  }

  try {
    const response = await axios.post(url, requestBody);
    console.log('[get-token] Full Shopee response:', JSON.stringify(response.data));

    if (response.data.access_token) {
      const responseData: any = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || '',
        expire_in: response.data.expire_in || 14400,
      };

      // 关键：提取真正的 shop_id
      if (response.data.shop_id) {
        // 普通店铺模式，直接有 shop_id
        responseData.shop_id = response.data.shop_id.toString();
      } else if (response.data.shop_id_list && response.data.shop_id_list.length > 0) {
        // 主账号模式，返回的是 shop_id_list（可能有多个店铺）
        responseData.shop_id = response.data.shop_id_list[0].toString();
        responseData.shop_id_list = response.data.shop_id_list;
        responseData.all_shops = response.data.shop_id_list;
        console.log('[get-token] Found shop_id_list:', response.data.shop_id_list);
        console.log('[get-token] Using first shop_id:', responseData.shop_id);
      } else {
        // 都没有，用传入的 ID 作为 fallback
        responseData.shop_id = (shop_id as string);
      }

      res.status(200).json(responseData);
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
