import type {
  ReleasePolicyRecommendation,
} from '../types/change';

import type {
  PolicyDecision,
} from './policy.service';

/**
 * Contract sent from ChangeGuard Policy Engine
 * to the Deployment Controller.
 */
export interface DeploymentPolicyCommand {
  deploymentId: string;

  decision: PolicyDecision['decision'];

  canPromote: boolean;

  allowedStages: number[];

  failedSignals: string[];

  reason: string;

  policy: ReleasePolicyRecommendation;
}

/**
 * Converts a Policy Engine decision into the
 * Deployment Controller command.
 */
export function createDeploymentPolicyCommand(
  decision: PolicyDecision
): DeploymentPolicyCommand {
  return {
    deploymentId: decision.deploymentId,

    decision: decision.decision,

    canPromote: decision.canPromote,

    allowedStages: decision.allowedStages,

    failedSignals: decision.failedSignals,

    reason: decision.reason,

    policy: decision.policy,
  };
}