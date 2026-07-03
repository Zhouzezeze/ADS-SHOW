import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const partnerId = process.env.VITE_SHOPEE_PARTNER_ID;
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;
  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const redirectUrl = `https://${_req.headers.host}/shopee-callback`; // 授权后的回调地址

  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey!).update(baseString).digest('hex');

  const authUrl = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

  res.status(200).json({ url: authUrl });
}
