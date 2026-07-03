import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, shop_id } = req.query;

  // 允许 CORS 以防万一
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!code || !shop_id) {
    return res.status(400).json({ error: `Missing code or shop_id. Received: code=${code}, shop_id=${shop_id}` });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;

  // 调试输出
  console.log('[get-token] partnerId:', partnerId, 'shop_id:', shop_id, 'code:', (code as string).substring(0, 10) + '...');

  if (!partnerId || !partnerKey) {
    return res.status(500).json({ error: 'Server not configured: missing partner_id or partner_key in env' });
  }

  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await axios.post(url, {
      code: code,
      partner_id: partnerId,
      shop_id: parseInt(shop_id as string)
    });

    console.log('[get-token] Shopee response:', JSON.stringify(response.data).substring(0, 300));

    if (response.data.access_token) {
      res.status(200).json({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expire_in: response.data.expire_in,
        shop_id: parseInt(shop_id as string)
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
