import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
  impressions: number;
}

export interface SearchConsoleData {
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  timeSeries: TimeSeriesData[];
  queries: SearchConsoleRow[];
  pages: SearchConsoleRow[];
  countries: SearchConsoleRow[];
  devices: SearchConsoleRow[];
}

export function useSearchConsoleData(days: string = '28') {
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'fetch-search-console-data',
        {
          body: { days: parseInt(days) },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch analytics data');
      }

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      setData(responseData);
    } catch (err) {
      console.error('Error fetching Search Console data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
