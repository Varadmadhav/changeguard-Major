import { db } from '../../db/index.js';
import { IntegrationRecord } from '../../types/shared.js';

export class IntegrationsRepository {
  public static async list(orgId: string): Promise<IntegrationRecord[]> {
    return db.listIntegrations(orgId);
  }

  public static async findById(id: string): Promise<IntegrationRecord | null> {
    return db.getIntegrationById(id);
  }

  public static async update(id: string, updates: Partial<IntegrationRecord>): Promise<IntegrationRecord> {
    return db.updateIntegration(id, updates);
  }
}
