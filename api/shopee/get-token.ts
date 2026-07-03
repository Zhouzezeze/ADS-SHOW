import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { code, shop_id, is_main_account } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const partnerId = parseInt(process.env.VITE_SHOPEE_PARTNER_ID || '0');
    const partnerKey = process.env.VITE_SHOPEE_PARTNER_KEY || '';

    if (!partnerId || !partnerKey) {
      return res.status(500).json({ 
        error: 'Server not configured',
        detail: 'Missing VITE_SHOPEE_PARTNER_ID or VITE_SHOPEE_PARTNER_KEY in environment variables'
      });
    }

    const host = "https://partner.shopeemobile.com";
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
    const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

    // 尝试两种模式：先用 main_account_id，如果失败再用 shop_id
    const requests: any[] = [];

    // 模式1: 主账号模式
    if (is_main_account === '1' || !shop_id) {
      requests.push({
        code: code as string,
        partner_id: partnerId,
        main_account_id: parseInt(shop_id as string)
      });
    }

    // 模式2: 普通店铺模式
    if (shop_id) {
      requests.push({
        code: code as string,
        partner_id: partnerId,
        shop_id: parseInt(shop_id as string)
      });
    }

    let lastError: any = null;
    let successData: any = null;

    for (const body of requests) {
      try {
        const response = await axios.post(url, body);
        if (response.data && response.data.access_token) {
          successData = response.data;
          console.log('[get-token] Success with mode:', body.main_account_id ? 'main_account' : 'shop_id');
          break;
        }
      } catch (err: any) {
        lastError = err.response?.data || err.message;
        console.log('[get-token] Failed mode:', body.main_account_id ? 'main_account' : 'shop_id', 'Error:', lastError);
      }
    }

    if (successData) {
      // 提取真正的 shop_id
      let finalShopId = (shop_id as string);

      if (successData.shop_id) {
        finalShopId = successData.shop_id.toString();
      } else if (successData.shop_id_list && successData.shop_id_list.length > 0) {
        finalShopId = successData.shop_id_list[0].toString();
      }

      // 用拿到的 token 立即验证一次
      let tokenVerified = false;
      let verifyError = '';

      if (finalShopId) {
        try {
          const verifyPath = "/api/v2/shop/get_shop_info";
          const verifyBaseString = `${partnerId}${verifyPath}${timestamp}${successData.access_token}${finalShopId}`;
          const verifySign = crypto.createHmac('sha256', partnerKey).update(verifyBaseString).digest('hex');
          const verifyUrl = `${host}${verifyPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${verifySign}&access_token=${successData.access_token}&shop_id=${finalShopId}`;

          const verifyRes = await axios.get(verifyUrl);
          if (verifyRes.data) {
            tokenVerified = true;
            console.log('[get-token] Token verified successfully! Shop:', verifyRes.data);
          }
        } catch (verifyErr: any) {
          verifyError = verifyErr.response?.data?.message || verifyErr.message;
          console.log('[get-token] Token verification failed:', verifyError);
        }
      }

      return res.status(200).json({
        access_token: successData.access_token,
        refresh_token: successData.refresh_token || '',
        expire_in: successData.expire_in || 14400,
        shop_id: finalShopId,
        shop_id_list: successData.shop_id_list || [],
        token_verified: tokenVerified,
        verify_error: verifyError,
      });
    } else {
      return res.status(400).json({
        error: lastError?.message || 'Failed to get token',
        detail: lastError
      });
    }
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
