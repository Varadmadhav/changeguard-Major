import { FastifyPluginAsync } from 'fastify';
import { PoliciesController } from './policies.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { PoliciesValidator } from './policies.validator.js';

export const policyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/policies', { preHandler: [authenticate] }, PoliciesController.listPolicies as any);
  fastify.get('/api/v1/policies/:id', { preHandler: [authenticate] }, PoliciesController.getPolicyById as any);

  fastify.post(
    '/api/v1/policies',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER']),
        validateBody(PoliciesValidator.validateCreate),
      ],
    },
    PoliciesController.createPolicy as any
  );

  fastify.put(
    '/api/v1/policies/:id',
    {
      preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])],
    },
    PoliciesController.updatePolicy as any
  );

  fastify.patch(
    '/api/v1/policies/:id/rules',
    {
      preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])],
    },
    PoliciesController.updateRules as any
  );

  fastify.post(
    '/api/v1/policies/:id/evaluate',
    { preHandler: [authenticate] },
    PoliciesController.evaluatePolicy as any
  );

  fastify.get(
    '/api/v1/policies/:id/versions',
    { preHandler: [authenticate] },
    PoliciesController.getVersions as any
  );
};
