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

    const host = "https://partner.shopeemobile.com";
    
    // 测试1: 获取广告活动列表
    const testPath1 = "/api/v2/ads/get_campaign_id_list";
    const timestamp1 = Math.floor(Date.now() / 1000);
    const baseString1 = `${partnerId}${testPath1}${timestamp1}${access_token}${shop_id}`;
    const sign1 = crypto.createHmac('sha256', partnerKey).update(baseString1).digest('hex');
    const url1 = `${host}${testPath1}?partner_id=${partnerId}&timestamp=${timestamp1}&sign=${sign1}&access_token=${access_token}&shop_id=${shop_id}&ad_type=all&offset=0&limit=10`;

    let campaignResult = { success: false, data: null, error: null, url: url1 };
    try {
      const response = await axios.get(url1);
      campaignResult = { success: true, data: response.data, error: null, url: url1 };
    } catch (err: any) {
      campaignResult = { 
        success: false, 
        data: null, 
        error: {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers
        },
        url: url1
      };
    }

    // 测试2: 获取店铺广告实时数据
    const testPath2 = "/api/v2/ads/get_all_cpc_ads_daily_performance";
    const timestamp2 = Math.floor(Date.now() / 1000);
    const baseString2 = `${partnerId}${testPath2}${timestamp2}${access_token}${shop_id}`;
    const sign2 = crypto.createHmac('sha256', partnerKey).update(baseString2).digest('hex');
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };
    const url2 = `${host}${testPath2}?partner_id=${partnerId}&timestamp=${timestamp2}&sign=${sign2}&access_token=${access_token}&shop_id=${shop_id}&start_date=${formatDate(weekAgo)}&end_date=${formatDate(today)}`;

    let dailyResult = { success: false, data: null, error: null, url: url2 };
    try {
      const response = await axios.get(url2);
      dailyResult = { success: true, data: response.data, error: null, url: url2 };
    } catch (err: any) {
      dailyResult = { 
        success: false, 
        data: null, 
        error: {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers
        },
        url: url2
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
        campaign_list: campaignResult,
        daily_performance: dailyResult,
      },
      suggestions: [
        campaignResult.success ? "✅ 广告活动列表获取成功" : "❌ 广告活动列表获取失败",
        dailyResult.success ? "✅ 日度性能数据获取成功" : "❌ 日度性能数据获取失败",
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
