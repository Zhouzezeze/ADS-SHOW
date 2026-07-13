import { useState, useEffect } from 'react';
import type { PlatformData, Platform } from '../types';
import { fetchAdData } from '../services/api';

export const useAdData = (platform: Platform, startDate?: string, endDate?: string, trigger?: number) => {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealData, setIsRealData] = useState(false);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAdData(platform, startDate, endDate);
        if (isMounted) {
          setData(result.data);
          setIsRealData(result.isReal);
          setDataSource(result.source);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, [platform, startDate, endDate, trigger]);

  return { data, loading, error, isRealData, dataSource };
};
