import { FastifyPluginAsync } from 'fastify';
import { AuditController } from './audit.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/audit-log',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE']),
      ],
    },
    AuditController.listAuditEvents as any
  );

  fastify.get(
    '/api/v1/audit-log/export',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER']),
      ],
    },
    AuditController.exportCsv
  );
};
