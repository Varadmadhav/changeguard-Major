import { useState, useEffect } from 'react';
import { AnalyticsSummary } from '../types/telemetry';
import { analyticsService } from '../services/analytics.service';

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getAnalyticsSummary().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
