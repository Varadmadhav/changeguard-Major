import { FastifyPluginAsync } from 'fastify';
import { ChangesController } from './changes.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { ChangesValidator } from './changes.validator.js';

export const changeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/changes', { preHandler: [authenticate] }, ChangesController.listChanges as any);
  fastify.get('/api/v1/changes/:id', { preHandler: [authenticate] }, ChangesController.getChangeById as any);

  fastify.post(
    '/api/v1/changes/analyze',
    {
      preHandler: [authenticate, validateBody(ChangesValidator.validateAnalyze)],
    },
    ChangesController.analyzeChange as any
  );

  fastify.post(
    '/api/v1/changes/:id/approve',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER']),
      ],
    },
    ChangesController.approveChange as any
  );

  fastify.post(
    '/api/v1/changes/:id/reject',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER']),
      ],
    },
    ChangesController.rejectChange as any
  );
};
