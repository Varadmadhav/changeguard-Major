import { AnalyticsSummary } from '../types/telemetry';
import { mockAnalyticsSummary } from '../data/mockMetrics';
import { apiClient } from './apiClient';

class AnalyticsService {
  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: AnalyticsSummary }>('/analytics/summary');
        return response.data;
      } catch (err) {
        console.warn('[AnalyticsService] Failed to fetch analytics summary from API, falling back to mock:', err);
      }
    }
    return Promise.resolve({ ...mockAnalyticsSummary });
  }

  async getDoraMetrics(periodDays = 30): Promise<any> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<any>(`/analytics/dora?periodDays=${periodDays}`);
        return response.data;
      } catch (err) {
        console.warn('[AnalyticsService] Failed to fetch DORA metrics from API:', err);
      }
    }
    return Promise.resolve({
      deploymentFrequencyPerDay: 4.2,
      leadTimeForChangesHours: 1.8,
      changeFailureRatePercentage: mockAnalyticsSummary.changeFailureRate,
      meanTimeToRecoveryMinutes: mockAnalyticsSummary.mttrMinutes,
      rating: 'ELITE',
      periodDays,
    });
  }

  async getRiskCalibration(): Promise<any[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<any>('/analytics/risk-calibration');
        return response.data;
      } catch (err) {
        console.warn('[AnalyticsService] Failed to fetch risk calibration from API:', err);
      }
    }
    return Promise.resolve([]);
  }
}

export const analyticsService = new AnalyticsService();
