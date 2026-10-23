import { FastifyPluginAsync } from 'fastify';
import { TeamController } from './team.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { TeamValidator } from './team.validator.js';

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/v1/team',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    TeamController.listMembers
  );

  fastify.post(
    '/api/v1/team/invite',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN']),
        validateBody(TeamValidator.validateInvite),
      ],
    },
    TeamController.inviteMember as any
  );

  fastify.patch(
    '/api/v1/team/:userId',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN']),
        validateBody(TeamValidator.validateUpdateRole),
      ],
    },
    TeamController.updateMemberRole as any
  );

  fastify.delete(
    '/api/v1/team/:userId',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    TeamController.removeMember as any
  );
};
