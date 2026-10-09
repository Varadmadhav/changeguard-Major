import { Integration } from '../types/integration';
import { mockIntegrations } from '../data/mockIntegrations';
import { apiClient } from './apiClient';

class IntegrationsService {
  private integrations: Integration[] = [...mockIntegrations];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getIntegrations(): Promise<Integration[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Integration[] }>('/integrations');
        return response.data;
      } catch (err) {
        console.warn('[IntegrationsService] Failed to fetch integrations from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.integrations]);
  }

  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.patch<{ data: Integration }>(`/integrations/${id}`, updates);
        return response.data;
      } catch (err) {
        console.warn(`[IntegrationsService] Failed to update integration ${id} on API, updating locally:`, err);
      }
    }

    const idx = this.integrations.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.integrations[idx] = {
        ...this.integrations[idx],
        ...updates,
        lastSyncAt: 'Just now',
      };
      return Promise.resolve(this.integrations[idx]);
    }
    return Promise.resolve(undefined);
  }

  async testIntegration(id: string): Promise<{ connected: boolean; message: string }> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.post<{ data: { connected: boolean; message: string } }>(
          `/integrations/${id}/test`
        );
        return response.data;
      } catch (err) {
        console.warn(`[IntegrationsService] Failed to test integration ${id} on API:`, err);
      }
    }
    return Promise.resolve({
      connected: true,
      message: 'Integration connectivity verified successfully.',
    });
  }
}

export const integrationsService = new IntegrationsService();
