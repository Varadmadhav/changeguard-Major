import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { GovernanceApproveResult } from './approvals.types.js';

export class ApprovalsService {
  public static async governanceApprove(
    id: string,
    user: { id: string; name: string; email: string; organizationId: string; role: any }
  ): Promise<GovernanceApproveResult> {
    const change = await db.getChangeById(id, user.organizationId);
    if (!change) {
      throw AppError.notFound(`Change with ID ${id}`);
    }

    const isSecondApproval = change.status === 'AWAITING_SECOND_APPROVAL';

    if (isSecondApproval && change.policyRecommendation.approvedBy === user.id) {
      throw new AppError(
        400,
        'TWO_PERSON_RULE_VIOLATION',
        'Two-person approval requires a distinct secondary reviewer. You cannot approve twice.'
      );
    }

    const approvalResult = await db.approveChange(
      id,
      user.id,
      user.organizationId,
      isSecondApproval
    );

    if (!approvalResult) {
      throw AppError.notFound(`Change with ID ${id}`);
    }

    const { change: updatedChange, isFullyApproved } = approvalResult;

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
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
        : `First approval registered by ${user.name}. Two-person rule requires 1 more approval.`,
      metadata: {
        riskScore: updatedChange.risk.score,
        isFullyApproved,
        approverRole: user.role,
      },
    });

    return {
      data: updatedChange,
      isFullyApproved,
      message: isFullyApproved
        ? 'Release policy recommendation fully approved'
        : 'First approval recorded; awaiting second authorized reviewer',
    };
  }
}
