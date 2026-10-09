import type {
  Deployment,
  DeploymentStatus,
  VerificationSignal,
  CanaryStage,
} from '../types/deployment.ts';
import {
  CANARY_STAGES,
  validateDeploymentTransition,
  CanaryInvalidStateError,
  CanaryVerificationFailedError,
  CanaryInvalidStageError,
  CanaryStageSkipError,
} from '../types/deployment.ts';

/**
 * Standard Allowed States from which traffic can be promoted
 */
export const PROMOTION_ELIGIBLE_STATUSES: readonly DeploymentStatus[] = [
  'MONITORING',
  'PENDING',
  'QUEUED',
  'PROMOTING',
] as const;

/**
 * Evaluates whether an individual verification signal is in violation
 */
export function isSignalViolated(signal: VerificationSignal): boolean {
  if (signal.status === 'FAILED') {
    return true;
  }

  // Check mathematical metric boundary against operator threshold
  switch (signal.operator) {
    case '<':
      return signal.currentValue >= signal.threshold;
    case '<=':
      return signal.currentValue > signal.threshold;
    case '>':
      return signal.currentValue <= signal.threshold;
    case '>=':
      return signal.currentValue < signal.threshold;
    default:
      return false;
  }
}

/**
 * Validates the deployment lifecycle state before promotion.
 * Throws CanaryInvalidStateError if status is not eligible for promotion.
 */
export function validateCanaryStatus(deployment: Deployment): void {
  if (!PROMOTION_ELIGIBLE_STATUSES.includes(deployment.status)) {
    throw new CanaryInvalidStateError(
      deployment.status,
      PROMOTION_ELIGIBLE_STATUSES,
      deployment.id
    );
  }
}

/**
 * Validates that all health criteria and verification signals pass.
 * Throws CanaryVerificationFailedError if any signal is failing.
 */
export function validateVerificationSignals(deployment: Deployment): void {
  // Check global deployment health status
  if (deployment.health === 'CRITICAL') {
    const criticalSignals = (deployment.signals || []).filter(isSignalViolated);
    throw new CanaryVerificationFailedError(
      criticalSignals,
      deployment.id,
      `Cannot promote deployment '${deployment.id}': overall health status is CRITICAL.`
    );
  }

  if (!deployment.signals || deployment.signals.length === 0) {
    return;
  }

  const failedSignals = deployment.signals.filter(isSignalViolated);
  if (failedSignals.length > 0) {
    throw new CanaryVerificationFailedError(failedSignals, deployment.id);
  }
}

/**
 * Determines the next valid traffic stage for the deployment.
 * Supports standard stages (5% -> 25% -> 50% -> 100%) and in-progress positions (e.g. 42% -> 50%).
 * Throws CanaryInvalidStageError if the deployment has already reached 100% or no higher stage exists.
 */
export function getNextCanaryStage(deployment: Deployment): number {
  if (deployment.currentTrafficPercentage >= 100) {
    throw new CanaryInvalidStageError(
      deployment.currentTrafficPercentage,
      undefined,
      deployment.id
    );
  }

  const stages =
    deployment.stages && deployment.stages.length > 0
      ? deployment.stages
      : Array.from(CANARY_STAGES);

  // Find the lowest defined stage strictly greater than current traffic
  const nextStages = stages
    .filter((stage) => stage > deployment.currentTrafficPercentage)
    .sort((a, b) => a - b);

  if (nextStages.length === 0) {
    throw new CanaryInvalidStageError(
      deployment.currentTrafficPercentage,
      undefined,
      deployment.id
    );
  }

  return nextStages[0];
}

/**
 * Full pre-flight validation for canary promotion.
 * Verifies lifecycle state, health signals, and stage progression sequence.
 * Ensures stage skipping is prevented.
 */
export function validateCanaryPromotion(
  deployment: Deployment,
  targetStage?: number
): number {
  // 1. Validate lifecycle state
  validateCanaryStatus(deployment);

  // 2. Validate health & verification signals
  validateVerificationSignals(deployment);

  // 3. Compute next expected stage
  const expectedStage = getNextCanaryStage(deployment);

  // 4. Validate requested target stage (prevent skipping)
  if (targetStage !== undefined && targetStage !== expectedStage) {
    throw new CanaryStageSkipError(
      deployment.currentTrafficPercentage,
      targetStage,
      expectedStage,
      deployment.id
    );
  }

  // 5. Validate formal state transition to target status
  const targetStatus: DeploymentStatus =
    expectedStage === 100 ? 'PROMOTED' : 'MONITORING';
  validateDeploymentTransition(deployment.status, targetStatus);

  return expectedStage;
}

/**
 * Canary Controller Engine
 * Controls progressive traffic promotion and enforces safety verification gates.
 */
export class CanaryController {
  /**
   * Evaluates if a deployment can be safely promoted without throwing errors.
   */
  canPromote(
    deployment: Deployment,
    targetStage?: number
  ): { allowed: boolean; reason?: string; nextStage?: number } {
    try {
      const nextStage = validateCanaryPromotion(deployment, targetStage);
      return { allowed: true, nextStage };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { allowed: false, reason: message };
    }
  }

  /**
   * Determines the next valid stage.
   */
  getNextStage(deployment: Deployment): number {
    return getNextCanaryStage(deployment);
  }

  /**
   * Promotes the deployment to the next stage atomically.
   * Throws typed errors if promotion criteria are not met.
   * Ensures that no deployment state is mutated if validation fails.
   */
  promote(deployment: Deployment, targetStage?: number): Deployment {
    // Perform all validations prior to any state mutation (guaranteeing atomicity)
    const nextStage = validateCanaryPromotion(deployment, targetStage);
    const isFull = nextStage === 100;
    const targetStatus: DeploymentStatus = isFull ? 'PROMOTED' : 'MONITORING';

    const stageIdx = deployment.stages.indexOf(nextStage);
    const updatedStageIndex =
      stageIdx !== -1 ? stageIdx : deployment.currentStageIndex + 1;

    // Apply state updates only after all assertions succeeded
    deployment.currentTrafficPercentage = nextStage;
    deployment.targetTrafficPercentage = nextStage;
    deployment.currentStageIndex = updatedStageIndex;
    deployment.status = targetStatus;
    deployment.health = 'HEALTHY';
    deployment.updatedAt = 'Just now';

    if (isFull) {
      deployment.completedAt = new Date().toISOString();
    }

    // Append timeline record
    const now = new Date();
    deployment.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: isFull
        ? 'Deployment 100% Promoted'
        : `Traffic Promoted to ${nextStage}%`,
      description: isFull
        ? 'Rollout reached 100% full production traffic. All verification checks passed.'
        : `Advanced canary traffic to stage ${updatedStageIndex + 1} (${nextStage}%).`,
      type: 'SUCCESS',
      actor: 'ChangeGuard Canary Controller',
      metadata: {
        stagePercentage: nextStage,
        isFullPromotion: isFull,
      },
    });

    return deployment;
  }
}

export const canaryController = new CanaryController();
