import { FastifyPluginAsync } from 'fastify';
import { ApiKeyController } from './api-keys.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { ApiKeyValidator } from './api-keys.validator.js';

export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  // Support both /api/v1/api-keys and /api/v1/settings/api-keys
  const preList = [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])];
  const preMutate = [authenticate, requireRole(['ADMIN']), validateBody(ApiKeyValidator.validateCreate)];
  const preDelete = [authenticate, requireRole(['ADMIN'])];

  fastify.get('/api/v1/settings/api-keys', { preHandler: preList }, ApiKeyController.listKeys);
  fastify.get('/api/v1/api-keys', { preHandler: preList }, ApiKeyController.listKeys);

  fastify.post('/api/v1/settings/api-keys', { preHandler: preMutate }, ApiKeyController.createKey as any);
  fastify.post('/api/v1/api-keys', { preHandler: preMutate }, ApiKeyController.createKey as any);

  fastify.delete('/api/v1/settings/api-keys/:id', { preHandler: preDelete }, ApiKeyController.revokeKey as any);
  fastify.delete('/api/v1/api-keys/:id', { preHandler: preDelete }, ApiKeyController.revokeKey as any);
};
