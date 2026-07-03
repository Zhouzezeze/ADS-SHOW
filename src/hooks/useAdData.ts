import { useState, useEffect } from 'react';
import type { Platform, PlatformData } from '../types';
import { fetchAdData } from '../services/api';

export const useAdData = (platform: Platform) => {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealData, setIsRealData] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    if (platform === 'settings') {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAdData(platform);
        setData(result.data);
        setIsRealData(result.isReal);
        setDataSource(result.source);
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError('加载广告数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [platform]);

  return { data, loading, error, isRealData, dataSource };
};
