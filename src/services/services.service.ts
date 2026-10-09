import { Service } from '../types/service';
import { mockServices } from '../data/mockServices';
import { apiClient } from './apiClient';

class ServicesService {
  private services: Service[] = [...mockServices];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getServices(): Promise<Service[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Service[] }>('/services');
        return response.data;
      } catch (err) {
        console.warn('[ServicesService] Failed to fetch services from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.services]);
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Service }>(`/services/${id}`);
        return response.data;
      } catch (err) {
        console.warn(`[ServicesService] Failed to fetch service ${id} from API, falling back to mock:`, err);
      }
    }
    return Promise.resolve(
      this.services.find(s => s.id === id || s.slug === id || s.name.toLowerCase().includes(id.toLowerCase()))
    );
  }

  async triggerSync(): Promise<{ discovered: number; synced: number; totalServices: number } | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.post<{
          data: { discovered: number; synced: number; totalServices: number };
        }>('/services/sync');
        return response.data;
      } catch (err) {
        console.warn('[ServicesService] Failed to trigger sync on API, returning local stats:', err);
      }
    }
    return Promise.resolve({
      discovered: this.services.length,
      synced: this.services.length,
      totalServices: this.services.length,
    });
  }
}

export const servicesService = new ServicesService();
