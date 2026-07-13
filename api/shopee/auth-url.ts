import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const partnerId = process.env.VITE_SHOPEE_PARTNER_ID;
    const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;

    if (!partnerId || !partnerKey) {
      return res.status(500).json({ error: 'Server not configured: missing partner_id or partner_key' });
    }

    const host = "https://openplatform.shopee.cn";
    const path = "/api/v2/shop/auth_partner";
    const timestamp = Math.floor(Date.now() / 1000);
    const redirectUrl = `https://${_req.headers.host}/shopee-callback`;

    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

    const authUrl = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

    return res.status(200).json({ url: authUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
