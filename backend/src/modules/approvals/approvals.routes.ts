import { FastifyPluginAsync } from 'fastify';
import { ApprovalsController } from './approvals.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export const approvalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/v1/changes/:id/governance-approve',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER', 'SRE']),
      ],
    },
    ApprovalsController.governanceApprove as any
  );
};
