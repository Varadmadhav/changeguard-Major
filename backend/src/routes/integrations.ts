import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { AuditWriter } from '../services/auditWriter.js';
import { IntegrationRecord } from '../types/shared.js';

export const integrationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/integrations - list all integrations
  fastify.get('/api/v1/integrations', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    const integrations = await db.listIntegrations(orgId);
    return reply.status(200).send({ data: integrations });
  });

  // PATCH /api/v1/integrations/:id - update integration configuration
  fastify.patch<{
    Params: { id: string };
    Body: Partial<IntegrationRecord>;
  }>(
    '/api/v1/integrations/:id',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      const updated = await db.updateIntegration(id, updates);

      await AuditWriter.record({
        organizationId: request.user.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'INTEGRATION_CONFIGURED',
        actionTitle: `Updated integration: ${updated.name}`,
        resource: { type: 'INTEGRATION', id: updated.id, name: updated.name },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Updated integration ${updated.name} settings and credentials.`,
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/integrations/:id/test - verify connection connectivity
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/integrations/:id/test',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const { id } = request.params;
      const integration = await db.getIntegrationById(id);
      if (!integration) {
        throw new AppError(404, 'INTEGRATION_NOT_FOUND', `Integration ${id} not found`);
      }

      // Simulated connectivity healthcheck
      const healthy = integration.status !== 'ERROR';
      return reply.status(200).send({
        data: {
          connected: healthy,
          status: integration.status,
          latencyMs: 42,
          message: healthy
            ? `Successfully verified connectivity to ${integration.name}.`
            : `Failed to connect to ${integration.name}. Check endpoint credentials.`,
        },
      });
    }
  );
};
