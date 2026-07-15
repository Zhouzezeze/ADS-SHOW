import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: 读取已保存的 Token
  if (req.method === 'GET') {
    try {
      const token = await redis.get<string>('shopee_access_token');
      const refreshToken = await redis.get<string>('shopee_refresh_token');
      const shopId = await redis.get<string>('shopee_shop_id');
      const expiry = await redis.get<string>('shopee_token_expiry');

      if (!token || !shopId) {
        return res.status(200).json({ connected: false });
      }

      return res.status(200).json({
        connected: true,
        shop_id: shopId,
        access_token: token,
        refresh_token: refreshToken || '',
        token_expiry: expiry || '',
      });
    } catch (err: any) {
      console.error('[token-store] Read error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: 保存 Token
  if (req.method === 'POST') {
    try {
      const { access_token, refresh_token, shop_id, expire_in } = req.body;

      if (!access_token || !shop_id) {
        return res.status(400).json({ error: 'Missing access_token or shop_id' });
      }

      const expiry = String(Date.now() + (expire_in || 14400) * 1000);

      await redis.set('shopee_access_token', access_token);
      await redis.set('shopee_shop_id', shop_id);
      if (refresh_token) await redis.set('shopee_refresh_token', refresh_token);
      await redis.set('shopee_token_expiry', expiry);

      return res.status(200).json({ success: true, shop_id });
    } catch (err: any) {
      console.error('[token-store] Write error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE: 清除 Token
  if (req.method === 'DELETE') {
    try {
      await redis.del('shopee_access_token');
      await redis.del('shopee_refresh_token');
      await redis.del('shopee_shop_id');
      await redis.del('shopee_token_expiry');
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
