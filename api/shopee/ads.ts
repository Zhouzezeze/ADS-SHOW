import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { shop_id, access_token } = req.query;

  if (!shop_id || !access_token) {
    return res.status(400).json({ error: 'Missing shop_id or access_token' });
  }

  const partnerId = process.env.VITE_SHOPEE_PARTNER_ID;
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY;
  const host = "https://partner.shopeemobile.com";
  const path = "/api/v2/marketing/get_ads_report"; // 示例：获取广告报表
  const timestamp = Math.floor(Date.now() / 1000);

  // 1. 生成 Shopee 签名 (Sign)
  const baseString = `${partnerId}${path}${timestamp}${access_token}${shop_id}`;
  const sign = crypto.createHmac('sha256', partnerKey!).update(baseString).digest('hex');

  const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&shop_id=${shop_id}&access_token=${access_token}`;

  try {
    // 2. 调用真实 Shopee 接口
    const response = await axios.get(url);
    
    // 这里可以对 Shopee 返回的原始数据进行加工，转成看板需要的格式
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
