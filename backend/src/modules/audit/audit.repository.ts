import { db } from '../../db/index.js';
import { AuditEvent } from '../../types/shared.js';

export class AuditRepository {
  public static async list(
    orgId: string,
    filters?: {
      action?: string;
      actor?: string;
      resourceType?: string;
      result?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: AuditEvent[]; total: number }> {
    return db.listAuditEvents(orgId, filters);
  }

  public static async append(event: AuditEvent): Promise<void> {
    return db.appendAuditEvent(event);
  }

  public static async exportCsv(orgId: string): Promise<string> {
    return db.exportAuditCsv(orgId);
  }
}
