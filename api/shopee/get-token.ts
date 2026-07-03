import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, shop_id } = req.query;

  if (!code || !shop_id) {
    return res.status(400).json({ error: 'Missing code or shop_id' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;
  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey!).update(baseString).digest('hex');

  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await axios.post(url, {
      code: code,
      partner_id: partnerId,
      shop_id: parseInt(shop_id as string)
    });

    if (response.data.access_token) {
      // 在实际生产中，token 应该存入数据库
      // 这里为了演示，我们将其返回给前端由前端 localStorage 持久化
      res.status(200).json(response.data);
    } else {
      res.status(400).json({ error: response.data.message || 'Failed to get token' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
