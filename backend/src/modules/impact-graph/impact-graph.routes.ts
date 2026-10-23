import { FastifyPluginAsync } from 'fastify';
import { ImpactGraphController } from './impact-graph.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const impactGraphRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/impact-graph', { preHandler: [authenticate] }, ImpactGraphController.getImpactGraph as any);
  fastify.get('/api/v1/impact-graph/:serviceId', { preHandler: [authenticate] }, ImpactGraphController.getImpactGraph as any);
};
