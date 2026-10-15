import { Integration, IntegrationStatus } from '../types/integration';
import { mockIntegrations } from '../data/mockIntegrations';

class IntegrationsService {
  private integrations: Integration[] = [...mockIntegrations];

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
  async getIntegrations(): Promise<Integration[]> {
    // Simulates GET /api/integrations
    return Promise.resolve([...this.integrations]);
  }

  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration | undefined> {
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
}

export const integrationsService = new IntegrationsService();
