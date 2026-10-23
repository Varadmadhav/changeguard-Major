import { FastifyPluginAsync } from 'fastify';
import { DeploymentsController } from './deployments.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { DeploymentsValidator } from './deployments.validator.js';

export const deploymentRoutes: FastifyPluginAsync = async (fastify) => {
  const privileged = [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])];

  fastify.get('/api/v1/deployments', { preHandler: [authenticate] }, DeploymentsController.listDeployments as any);
  fastify.get('/api/v1/deployments/:id', { preHandler: [authenticate] }, DeploymentsController.getDeploymentById as any);

  fastify.post(
    '/api/v1/deployments',
    { preHandler: [...privileged, validateBody(DeploymentsValidator.validateCreate)] },
    DeploymentsController.createDeployment as any
  );

  fastify.post('/api/v1/deployments/:id/promote', { preHandler: privileged }, DeploymentsController.promoteDeployment as any);
  fastify.post('/api/v1/deployments/:id/pause', { preHandler: privileged }, DeploymentsController.pauseDeployment as any);
  fastify.post('/api/v1/deployments/:id/rollback', { preHandler: privileged }, DeploymentsController.rollbackDeployment as any);
  fastify.post('/api/v1/deployments/:id/abort', { preHandler: privileged }, DeploymentsController.abortDeployment as any);

  fastify.get('/api/v1/deployments/:id/verification', { preHandler: [authenticate] }, DeploymentsController.getVerification as any);

  fastify.post('/api/v1/deployments/:id/simulate-failure', { preHandler: privileged }, DeploymentsController.simulateFailure as any);
  fastify.post('/api/v1/deployments/:id/simulate-recovery', { preHandler: privileged }, DeploymentsController.simulateRecovery as any);
  fastify.post('/api/v1/deployments/:id/simulate-stale', { preHandler: privileged }, DeploymentsController.simulateStale as any);
};
