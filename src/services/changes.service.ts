import { Change, ChangeStatus } from '../types/change';
import { mockChanges } from '../data/mockChanges';

class ChangesService {
  private changes: Change[] = [...mockChanges];

  async getChanges(): Promise<Change[]> {
    // Simulates GET /api/changes
    return Promise.resolve([...this.changes]);
  }

  async getChangeById(id: string): Promise<Change | undefined> {
    // Simulates GET /api/changes/:id
    const found = this.changes.find(c => c.id === id || c.id === `pr-${id}` || c.number === Number(id));
    return Promise.resolve(found);
  }

  async updateChangeStatus(id: string, status: ChangeStatus): Promise<Change | undefined> {
    // Simulates PATCH /api/changes/:id/status
    const index = this.changes.findIndex(c => c.id === id || c.id === `pr-${id}` || c.number === Number(id));
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
    // Simulates POST /api/changes/analyze
    return this.getChangeById(String(prNumber));
  }
}

export const changesService = new ChangesService();
