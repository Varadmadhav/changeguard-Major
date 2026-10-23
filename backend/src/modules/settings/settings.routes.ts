import { FastifyPluginAsync } from 'fastify';
import { SettingsController } from './settings.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/settings', { preHandler: [authenticate] }, SettingsController.getSettings);

  fastify.patch(
    '/api/v1/settings/:section',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    SettingsController.updateSection as any
  );
};
