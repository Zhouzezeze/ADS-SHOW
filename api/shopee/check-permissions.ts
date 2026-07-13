import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

function generateSign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: string, partnerKey: string): string {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

async function testApi(
  host: string,
  path: string,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: string,
  extraParams: Record<string, string> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateSign(partnerId, path, timestamp, accessToken, shopId, partnerKey);

  const allParams: Record<string, string> = {
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: shopId,
    ...extraParams,
  };

  const qs = Object.entries(allParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${host}${path}?${qs}`;

  try {
    const response = await axios.get(url, { validateStatus: () => true, timeout: 10000 });
    const body = response.data;
    return {
      host,
      path,
      http_status: response.status,
      success: !body.error || body.error === '',
      response_body: JSON.stringify(body).substring(0, 500),
      url: url.substring(0, 300),
    };
  } catch (err: any) {
    return {
      host,
      path,
      http_status: 0,
      success: false,
      error: err.message,
      url: url.substring(0, 300),
    };
  }
}

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
    const accessToken = access_token as string;
    const shopId = shop_id as string;

    // 测试所有可能的域名组合
    const hosts = [
      "https://partner.shopeemobile.com",
      "https://open.shopee.cn",
      "https://openplatform.shopee.cn",
    ];

    const adsPath = "/api/v2/ads/get_total_balance";
    const shopPath = "/api/v2/shop/get_shop_info";

    // 并行测试所有组合
    const results = await Promise.all([
      // shop_info 在三个域名上
      testApi(hosts[0], shopPath, partnerId, partnerKey, accessToken, shopId),
      testApi(hosts[1], shopPath, partnerId, partnerKey, accessToken, shopId),
      testApi(hosts[2], shopPath, partnerId, partnerKey, accessToken, shopId),
      // ads balance 在三个域名上
      testApi(hosts[0], adsPath, partnerId, partnerKey, accessToken, shopId),
      testApi(hosts[1], adsPath, partnerId, partnerKey, accessToken, shopId),
      testApi(hosts[2], adsPath, partnerId, partnerKey, accessToken, shopId),
    ]);

    return res.status(200).json({
      diagnostics: {
        partner_id: partnerId,
        shop_id: shopId,
        token_length: accessToken.length,
      },
      results: results.map(r => ({
        host: r.host,
        path: r.path,
        http_status: r.http_status,
        success: r.success,
        response: r.response_body || r.error,
      })),
      conclusion: (() => {
        // 找出哪个域名对 ads API 有效
        const adsResults = results.filter(r => r.path === adsPath);
        const workingAds = adsResults.filter(r => r.success);
        if (workingAds.length > 0) {
          return `✅ 找到可用的广告 API 域名: ${workingAds[0].host}`;
        }
        // 看哪个域名对 shop_info 有效
        const shopResults = results.filter(r => r.path === shopPath);
        const workingShop = shopResults.filter(r => r.success);
        if (workingShop.length > 0) {
          return `⚠️ Token 有效(${workingShop[0].host})，但所有域名的广告 API 都失败。可能需要检查 API 权限或路径。`;
        }
        return `❌ 所有域名都失败，token 可能已过期。`;
      })()
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
