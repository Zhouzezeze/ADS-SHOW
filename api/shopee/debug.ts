import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { access_token, shop_id } = req.query;

  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
  const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';
  const host = "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);

  const debug: any = {
    partnerId,
    shop_id: shop_id || 'none',
    token_preview: (access_token as string).substring(0, 20) + '...',
    token_length: (access_token as string).length,
    timestamp,
  };

  // Test 1: Verify token with get_token_detail
  const path1 = "/api/v2/auth/access_token/get_token_detail";
  const baseString1 = `${partnerId}${path1}${timestamp}${access_token}`;
  const sign1 = crypto.createHmac('sha256', partnerKey).update(baseString1).digest('hex');
  const url1 = `${host}${path1}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign1}&access_token=${access_token}`;

  try {
    const response1 = await axios.get(url1);
    debug.token_detail = response1.data;
  } catch (err: any) {
    debug.token_detail_error = err.response?.data || err.message;
  }

  // Test 2: Try a simple shop API to see if token works at all
  if (shop_id) {
    const path2 = "/api/v2/shop/get_shop_info";
    const baseString2 = `${partnerId}${path2}${timestamp}${access_token}${shop_id}`;
    const sign2 = crypto.createHmac('sha256', partnerKey).update(baseString2).digest('hex');
    const url2 = `${host}${path2}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign2}&access_token=${access_token}&shop_id=${shop_id}`;

    try {
      const response2 = await axios.get(url2);
      debug.shop_info = response2.data;
    } catch (err: any) {
      debug.shop_info_error = err.response?.data || err.message;
    }
  }

  // Test 3: Try the actual ads API path
  if (shop_id) {
    const path3 = "/api/v2/ads/get_product_level_campaign_id_list";
    const baseString3 = `${partnerId}${path3}${timestamp}${access_token}${shop_id}`;
    const sign3 = crypto.createHmac('sha256', partnerKey).update(baseString3).digest('hex');
    const url3 = `${host}${path3}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign3}&access_token=${access_token}&shop_id=${shop_id}&ad_type=all&offset=0&limit=50`;

    try {
      const response3 = await axios.get(url3);
      debug.ads_campaign_list = response3.data;
    } catch (err: any) {
      debug.ads_campaign_error = err.response?.data || err.message;
    }
  }

  res.status(200).json(debug);
}
