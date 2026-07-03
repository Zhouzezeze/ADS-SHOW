import { useState, useEffect } from 'react';
import type { Platform, PlatformData } from '../types';
import { fetchAdData } from '../services/api';

export const useAdData = (platform: Platform) => {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (platform === 'settings') {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchAdData(platform);
        setData(result);
        setError(null);
      } catch (err) {
        setError('加载广告数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [platform]);

  return { data, loading, error };
};
