import { FastifyPluginAsync } from 'fastify';
import { HealthController } from './health.controller.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/health', HealthController.getHealth);
  fastify.get('/api/v1/ready', HealthController.getReadiness);
};
