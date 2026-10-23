import { AuditRepository } from './audit.repository.js';
import { ListAuditQuery } from './audit.types.js';

export class AuditService {
  public static async listAuditEvents(orgId: string, query: ListAuditQuery) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 20;

    const auditData = await AuditRepository.list(orgId, {
      action: query.action,
      actor: query.actor,
      resourceType: query.resourceType,
      result: query.result,
      page: pageNum,
      limit: limitNum,
    });

    return {
      data: auditData.data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: auditData.total,
        totalPages: Math.ceil(auditData.total / limitNum) || 1,
      },
    };
  }

  public static async exportAuditCsv(orgId: string): Promise<string> {
    return AuditRepository.exportCsv(orgId);
  }
}
