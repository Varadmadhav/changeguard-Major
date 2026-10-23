import { db, DbChange } from '../../db/index.js';

export class ChangesRepository {
  public static async list(
    orgId: string,
    filters?: {
      status?: string;
      riskLevel?: string;
      repository?: string;
      environment?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: DbChange[]; total: number }> {
    return db.listChanges(orgId, filters);
  }

  public static async findById(id: string, orgId: string): Promise<DbChange | null> {
    return db.getChangeById(id, orgId);
  }

  public static async create(data: Omit<DbChange, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbChange> {
    return db.createChange(data);
  }

  public static async updateStatus(
    id: string,
    status: DbChange['status'],
    orgId: string
  ): Promise<DbChange | null> {
    return db.updateChangeStatus(id, status, orgId);
  }

  public static async approve(
    id: string,
    userId: string,
    orgId: string
  ): Promise<{ change: DbChange; isFullyApproved: boolean } | null> {
    return db.approveChange(id, userId, orgId);
  }
}
