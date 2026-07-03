import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { code, shop_id, is_main_account } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
    const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

    if (!partnerId || !partnerKey) {
      return res.status(500).json({ 
        error: 'Server not configured',
        detail: 'Missing VITE_SHOPEE_PARTNER_ID or VITE_SHOPEE_PARTNER_KEY in environment variables'
      });
    }

    const host = "https://partner.shopeemobile.com";
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
    const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const requestBody: any = {
      code: code as string,
      partner_id: partnerId,
    };

    if (is_main_account === '1' || !shop_id) {
      if (shop_id) {
        requestBody.main_account_id = parseInt(shop_id as string);
      }
    } else {
      requestBody.shop_id = parseInt(shop_id as string);
    }

    const response = await axios.post(url, requestBody);

    if (response.data && response.data.access_token) {
      let finalShopId = shop_id as string;
      
      if (response.data.shop_id) {
        finalShopId = response.data.shop_id.toString();
      } else if (response.data.shop_id_list && response.data.shop_id_list.length > 0) {
        finalShopId = response.data.shop_id_list[0].toString();
      }

      return res.status(200).json({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || '',
        expire_in: response.data.expire_in || 14400,
        shop_id: finalShopId,
        shop_id_list: response.data.shop_id_list || [],
      });
    } else {
      return res.status(400).json({
        error: response.data?.message || 'Failed to get token',
        detail: response.data
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error',
      detail: error.response?.data || null
    });
  }
}

// 强制 Node.js runtime（不用 Edge）
export const config = {
  maxDuration: 30,
};
