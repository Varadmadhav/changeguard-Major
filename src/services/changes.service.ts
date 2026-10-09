import { Change, ChangeStatus } from '../types/change';
import { mockChanges } from '../data/mockChanges';
import { apiClient } from './apiClient';

class ChangesService {
  private changes: Change[] = [...mockChanges];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getChanges(): Promise<Change[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Change[] }>('/changes');
        return response.data;
      } catch (err) {
        console.warn('[ChangesService] Failed to fetch changes from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.changes]);
  }

  async getChangeById(id: string): Promise<Change | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Change }>(`/changes/${id}`);
        return response.data;
      } catch (err) {
        console.warn(`[ChangesService] Failed to fetch change ${id} from API, falling back to mock:`, err);
      }
    }
    const found = this.changes.find((c) => c.id === id || c.id === `pr-${id}` || c.number === Number(id));
    return Promise.resolve(found);
  }

  async updateChangeStatus(id: string, status: ChangeStatus): Promise<Change | undefined> {
    if (!this.isMockMode()) {
      try {
        if (status === 'APPROVED') {
          const response = await apiClient.post<{ data: Change }>(`/changes/${id}/approve`);
          return response.data;
        } else if (status === 'REJECTED') {
          const response = await apiClient.post<{ data: Change }>(`/changes/${id}/reject`);
          return response.data;
        }
      } catch (err) {
        console.warn(`[ChangesService] Failed to update change ${id} status on API, updating local:`, err);
      }
    }

    const index = this.changes.findIndex((c) => c.id === id || c.id === `pr-${id}` || c.number === Number(id));
    if (index !== -1) {
      this.changes[index] = {
        ...this.changes[index],
        status,
        updatedAt: 'Just now',
      };
      return Promise.resolve(this.changes[index]);
    }
    return Promise.resolve(undefined);
  }

  async analyzeChange(prNumber: number): Promise<Change | undefined> {
    return this.getChangeById(String(prNumber));
  }
}

export const changesService = new ChangesService();
