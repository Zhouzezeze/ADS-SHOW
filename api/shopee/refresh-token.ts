import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { refresh_token, shop_id } = req.query;

  if (!refresh_token || !shop_id) {
    return res.status(400).json({ error: 'Missing refresh_token or shop_id' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/auth/access_token/refresh";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await axios.post(url, {
      refresh_token: refresh_token,
      partner_id: partnerId,
      shop_id: parseInt(shop_id as string)
    });

    console.log('[refresh-token] Response:', JSON.stringify(response.data).substring(0, 300));

    if (response.data.access_token) {
      res.status(200).json({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refresh_token,
        expire_in: response.data.expire_in || 14400,
        shop_id: response.data.shop_id?.toString() || (shop_id as string)
      });
    } else {
      res.status(400).json({
        error: response.data.message || 'Refresh failed',
        shopee_response: response.data
      });
    }
  } catch (error: any) {
    console.error('[refresh-token] Error:', error.message);
    res.status(500).json({
      error: error.message,
      shopee_error: error.response?.data
    });
  }
}
