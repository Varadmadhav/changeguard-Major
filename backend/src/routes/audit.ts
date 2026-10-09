import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';

interface ListAuditQuery {
  action?: string;
  actor?: string;
  resourceType?: string;
  result?: string;
  page?: string;
  limit?: string;
}

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/audit-log - list paginated audit log events (requires ADMIN, PLATFORM_ENGINEER, or SRE)
  fastify.get<{ Querystring: ListAuditQuery }>(
    '/api/v1/audit-log',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE']),
      ],
    },
    async (request, reply) => {
      const { action, actor, resourceType, result, page, limit } = request.query;
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;

      const auditData = await db.listAuditEvents(request.user.organizationId, {
        action,
        actor,
        resourceType,
        result,
        page: pageNum,
        limit: limitNum,
      });

      return reply.status(200).send({
        data: auditData.data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total: auditData.total,
          totalPages: Math.ceil(auditData.total / limitNum) || 1,
        },
      });
    }
  );

  // GET /api/v1/audit-log/export - export audit log as CSV
  fastify.get(
    '/api/v1/audit-log/export',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER']),
      ],
    },
    async (request, reply) => {
      const csvContent = await db.exportAuditCsv(request.user.organizationId);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="changeguard-audit-log.csv"');
      return reply.status(200).send(csvContent);
    }
  );
};
