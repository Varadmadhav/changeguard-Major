import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { AuditWriter } from '../services/auditWriter.js';

export const approvalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/changes/:id/governance-approve',
    {
      preHandler: [
        authenticate,
        requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'APPROVER', 'SRE']),
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const change = await db.getChangeById(id, request.user.organizationId);

      if (!change) {
        throw new AppError(404, 'CHANGE_NOT_FOUND', `Change with ID ${id} not found`);
      }

      const isTwoPersonRequired = change.risk.score >= 90;
      const isSecondApproval = change.status === 'AWAITING_SECOND_APPROVAL';

      // Ensure the second approver is not the same user as the first approver
      if (isSecondApproval && change.policyRecommendation.approvedBy === request.user.id) {
        throw new AppError(
          400,
          'TWO_PERSON_RULE_VIOLATION',
          'Two-person approval requires a distinct secondary reviewer. You cannot approve twice.'
        );
      }

      const approvalResult = await db.approveChange(
        id,
        request.user.id,
        request.user.organizationId,
        isSecondApproval
      );

      if (!approvalResult) {
        throw new AppError(404, 'CHANGE_NOT_FOUND', `Change with ID ${id} not found`);
      }

      const { change: updatedChange, isFullyApproved } = approvalResult;

      // Write audit event
      await AuditWriter.record({
        organizationId: request.user.organizationId,
        actor: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          type: 'USER',
        },
        action: 'APPROVAL_GRANTED',
        actionTitle: isFullyApproved
          ? `Approved Release Policy for PR #${updatedChange.number}`
          : `First Signoff Provided for PR #${updatedChange.number} (Awaiting 2nd Reviewer)`,
        resource: {
          type: 'CHANGE',
          id: updatedChange.id,
          name: `PR #${updatedChange.number} (${updatedChange.title})`,
        },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: isFullyApproved
          ? `Full deployment clearance granted for strategy ${updatedChange.policyRecommendation.strategy} with ${updatedChange.policyRecommendation.stages.join('->')}% stages.`
          : `First approval registered by ${request.user.name}. Two-person rule requires 1 more approval.`,
        metadata: {
          riskScore: updatedChange.risk.score,
          isFullyApproved,
          approverRole: request.user.role,
        },
      });

      return reply.status(200).send({
        data: updatedChange,
        isFullyApproved,
        message: isFullyApproved
          ? 'Release policy recommendation fully approved'
          : 'First approval recorded; awaiting second authorized reviewer',
      });
    }
  );
};
