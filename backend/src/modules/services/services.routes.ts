import { FastifyPluginAsync } from 'fastify';
import { ServicesController } from './services.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/services', { preHandler: [authenticate] }, ServicesController.listServices as any);
  fastify.get('/api/v1/services/:id', { preHandler: [authenticate] }, ServicesController.getServiceById as any);

  fastify.post(
    '/api/v1/services/sync',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    ServicesController.syncServices
  );
};
