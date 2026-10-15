import { AnalyticsSummary } from '../types/telemetry';
import { mockAnalyticsSummary } from '../data/mockMetrics';

class AnalyticsService {
<<<<<<< Updated upstream
=======
  private isMockMode(): boolean {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_USE_MOCK_DATA !== undefined) {
        return (import.meta as any).env.VITE_USE_MOCK_DATA !== 'false';
      }
    } catch {
      // ignore
    }
    if (typeof process !== 'undefined' && process.env?.VITE_USE_MOCK_DATA !== undefined) {
      return process.env.VITE_USE_MOCK_DATA !== 'false';
    }
    return true;
  }

>>>>>>> Stashed changes
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    // Simulates GET /api/analytics
    return Promise.resolve({ ...mockAnalyticsSummary });
  }
}

export const analyticsService = new AnalyticsService();
