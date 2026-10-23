import { FastifyPluginAsync } from 'fastify';
import { IntegrationsController } from './integrations.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export const integrationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/integrations', { preHandler: [authenticate] }, IntegrationsController.listIntegrations);

  fastify.patch(
    '/api/v1/integrations/:id',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    IntegrationsController.updateIntegration as any
  );

  fastify.post(
    '/api/v1/integrations/:id/test',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    IntegrationsController.testIntegration as any
  );
};
