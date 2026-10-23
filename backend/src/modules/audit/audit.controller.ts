import { FastifyReply, FastifyRequest } from 'fastify';
import { AuditService } from './audit.service.js';
import { ListAuditQuery } from './audit.types.js';

export class AuditController {
  public static async listAuditEvents(
    request: FastifyRequest<{ Querystring: ListAuditQuery }>,
    reply: FastifyReply
  ) {
    const result = await AuditService.listAuditEvents(request.user!.organizationId, request.query);
    return reply.status(200).send(result);
  }

  public static async exportCsv(request: FastifyRequest, reply: FastifyReply) {
    const csvContent = await AuditService.exportAuditCsv(request.user!.organizationId);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="changeguard-audit-log.csv"');
    return reply.status(200).send(csvContent);
  }
}
