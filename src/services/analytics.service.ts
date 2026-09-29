import { AnalyticsSummary } from '../types/telemetry';
import { mockAnalyticsSummary } from '../data/mockMetrics';

class AnalyticsService {
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    // Simulates GET /api/analytics
    return Promise.resolve({ ...mockAnalyticsSummary });
  }
}

export const analyticsService = new AnalyticsService();
