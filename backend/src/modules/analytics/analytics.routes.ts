import { FastifyPluginAsync } from 'fastify';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/analytics/summary', { preHandler: [authenticate] }, AnalyticsController.getSummary);
  fastify.get('/api/v1/analytics/dora', { preHandler: [authenticate] }, AnalyticsController.getDora as any);
  fastify.get('/api/v1/analytics/risk-calibration', { preHandler: [authenticate] }, AnalyticsController.getRiskCalibration);
};
