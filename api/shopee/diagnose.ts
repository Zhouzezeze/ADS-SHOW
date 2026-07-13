import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { shop_id, access_token } = req.query;

    if (!shop_id || !access_token) {
      return res.status(400).json({ error: 'Missing shop_id or access_token' });
    }

    const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
    const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

    if (!partnerId || !partnerKey) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const host = "https://openplatform.shopee.cn";
    
    // 测试1: 验证 token 是否有效 (get_shop_info)
    const testPath1 = "/api/v2/shop/get_shop_info";
    const timestamp1 = Math.floor(Date.now() / 1000);
    const baseString1 = `${partnerId}${testPath1}${timestamp1}${access_token}${shop_id}`;
    const sign1 = crypto.createHmac('sha256', partnerKey).update(baseString1).digest('hex');
    const url1 = `${host}${testPath1}?partner_id=${partnerId}&timestamp=${timestamp1}&sign=${sign1}&access_token=${access_token}&shop_id=${shop_id}`;

    let shopInfoResult = { success: false, data: null, error: null };
    try {
      const response = await axios.get(url1);
      shopInfoResult = { success: true, data: response.data, error: null };
    } catch (err: any) {
      shopInfoResult = { 
        success: false, 
        data: null, 
        error: err.response?.data || err.message 
      };
    }

    // 测试2: 尝试获取广告活动列表
    const testPath2 = "/api/v2/ads/get_campaign_id_list";
    const timestamp2 = Math.floor(Date.now() / 1000);
    const baseString2 = `${partnerId}${testPath2}${timestamp2}${access_token}${shop_id}`;
    const sign2 = crypto.createHmac('sha256', partnerKey).update(baseString2).digest('hex');
    const url2 = `${host}${testPath2}?partner_id=${partnerId}&timestamp=${timestamp2}&sign=${sign2}&access_token=${access_token}&shop_id=${shop_id}`;

    let campaignResult = { success: false, data: null, error: null };
    try {
      const response = await axios.get(url2, { params: { ad_type: 'all', offset: 0, limit: 10 } });
      campaignResult = { success: true, data: response.data, error: null };
    } catch (err: any) {
      campaignResult = { 
        success: false, 
        data: null, 
        error: err.response?.data || err.message 
      };
    }

    // 返回诊断结果
    return res.status(200).json({
      diagnostics: {
        partner_id: partnerId,
        shop_id: shop_id,
        access_token_length: (access_token as string).length,
        timestamp_now: Math.floor(Date.now() / 1000),
      },
      tests: {
        shop_info: shopInfoResult,
        campaign_list: campaignResult,
      },
      suggestions: [
        !shopInfoResult.success ? "Token 验证失败，请重新授权" : "Token 有效",
        !campaignResult.success ? "广告 API 访问失败" : "广告 API 访问正常",
      ]
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error',
      detail: error.response?.data || null
    });
  }
}

export const config = {
  maxDuration: 30,
};
