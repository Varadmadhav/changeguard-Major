import type { RiskLevel, ReleasePolicyRecommendation } from './change';

// -------------------------------------------------------------
// Deployment Lifecycle States
// -------------------------------------------------------------

/**
 * Required Core Lifecycle States for Deployment & Canary Controller
 */
export type CoreDeploymentStatus =
  | 'PENDING'
  | 'MONITORING'
  | 'PAUSED'
  | 'ROLLING_BACK'
  | 'ROLLED_BACK';

/**
 * Extended / Legacy States preserved for complete system compatibility
 */
export type LegacyDeploymentStatus =
  | 'QUEUED'
  | 'PROMOTING'
  | 'PROMOTED'
  | 'FAILED'
  | 'ABORTED';

/**
 * Reconciled DeploymentStatus supporting both core and legacy states
 */
export type DeploymentStatus = CoreDeploymentStatus | LegacyDeploymentStatus;

export const CORE_DEPLOYMENT_STATES: readonly CoreDeploymentStatus[] = [
  'PENDING',
  'MONITORING',
  'PAUSED',
  'ROLLING_BACK',
  'ROLLED_BACK',
] as const;

// -------------------------------------------------------------
// Canary Stages (5%, 25%, 50%, 100%)
// -------------------------------------------------------------

export type CanaryStage = 5 | 25 | 50 | 100;
export const CANARY_STAGES: readonly CanaryStage[] = [5, 25, 50, 100] as const;

// -------------------------------------------------------------
// State Machine Transition Validation & Errors
// -------------------------------------------------------------

export class InvalidStateTransitionError extends Error {
  public readonly fromStatus: DeploymentStatus;
  public readonly toStatus: DeploymentStatus;
  public readonly allowedTransitions: readonly DeploymentStatus[];

  constructor(
    fromStatus: DeploymentStatus,
    toStatus: DeploymentStatus,
    allowedTransitions: readonly DeploymentStatus[],
    customMessage?: string
  ) {
    const msg =
      customMessage ||
      `Invalid deployment transition from '${fromStatus}' to '${toStatus}'. Allowed destination states: [${allowedTransitions.join(', ')}]`;
    super(msg);
    this.name = 'InvalidStateTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.allowedTransitions = allowedTransitions;
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

// -------------------------------------------------------------
// Canary Promotion Errors
// -------------------------------------------------------------

export class CanaryPromotionError extends Error {
  public readonly deploymentId?: string;

  constructor(message: string, deploymentId?: string) {
    super(message);
    this.name = 'CanaryPromotionError';
    this.deploymentId = deploymentId;
    Object.setPrototypeOf(this, CanaryPromotionError.prototype);
  }
}

export class CanaryInvalidStateError extends InvalidStateTransitionError {
  public readonly deploymentId?: string;

  constructor(
    currentStatus: DeploymentStatus,
    allowedStatuses: readonly DeploymentStatus[],
    deploymentId?: string
  ) {
    super(
      currentStatus,
      'PROMOTING',
      allowedStatuses,
      `Cannot promote deployment ${deploymentId ? `'${deploymentId}' ` : ''}with status '${currentStatus}'. Promotion requires status to be one of: [${allowedStatuses.join(', ')}].`
    );
    this.name = 'CanaryInvalidStateError';
    this.deploymentId = deploymentId;
    Object.setPrototypeOf(this, CanaryInvalidStateError.prototype);
  }

  get currentStatus(): DeploymentStatus {
    return this.fromStatus;
  }

  get allowedStatuses(): readonly DeploymentStatus[] {
    return this.allowedTransitions;
  }
}

export class CanaryVerificationFailedError extends CanaryPromotionError {
  public readonly failedSignals: VerificationSignal[];

  constructor(failedSignals: VerificationSignal[], deploymentId?: string, customMessage?: string) {
    const signalDetails = failedSignals
      .map((s) => `${s.name} (${s.metricKey}: ${s.currentValue}${s.unit} fails ${s.operator} ${s.threshold}${s.unit})`)
      .join('; ');
    const msg =
      customMessage ||
      `Cannot promote deployment ${deploymentId ? `'${deploymentId}' ` : ''}due to failing verification signals: [${signalDetails}].`;
    super(msg, deploymentId);
    this.name = 'CanaryVerificationFailedError';
    this.failedSignals = failedSignals;
    Object.setPrototypeOf(this, CanaryVerificationFailedError.prototype);
  }
}

export class CanaryInvalidStageError extends CanaryPromotionError {
  public readonly currentTraffic: number;
  public readonly attemptedStage?: number;

  constructor(currentTraffic: number, attemptedStage?: number, deploymentId?: string) {
    const msg =
      attemptedStage !== undefined
        ? `Cannot promote deployment ${deploymentId ? `'${deploymentId}' ` : ''}from ${currentTraffic}% to invalid stage ${attemptedStage}%.`
        : `Deployment ${deploymentId ? `'${deploymentId}' ` : ''}has already reached maximum traffic (${currentTraffic}%); no further promotion stages exist.`;
    super(msg, deploymentId);
    this.name = 'CanaryInvalidStageError';
    this.currentTraffic = currentTraffic;
    this.attemptedStage = attemptedStage;
    Object.setPrototypeOf(this, CanaryInvalidStageError.prototype);
  }
}

export class CanaryStageSkipError extends CanaryPromotionError {
  public readonly currentTraffic: number;
  public readonly attemptedStage: number;
  public readonly expectedStage: number;

  constructor(currentTraffic: number, attemptedStage: number, expectedStage: number, deploymentId?: string) {
    super(
      `Invalid canary progression: cannot skip stages from ${currentTraffic}% to ${attemptedStage}%. Next required stage is ${expectedStage}%.`,
      deploymentId
    );
    this.name = 'CanaryStageSkipError';
    this.currentTraffic = currentTraffic;
    this.attemptedStage = attemptedStage;
    this.expectedStage = expectedStage;
    Object.setPrototypeOf(this, CanaryStageSkipError.prototype);
  }
}

// -------------------------------------------------------------
// Policy Command & Rollback Types and Errors
// -------------------------------------------------------------

export interface DeploymentPolicyCommand {
  deploymentId: string;
  decision: 'PROMOTE' | 'PAUSE';
  canPromote: boolean;
  allowedStages: number[];
  failedSignals: string[];
  reason: string;
  policy?: ReleasePolicyRecommendation;
}

export class UnknownDeploymentError extends Error {
  public readonly deploymentId: string;

  constructor(deploymentId: string) {
    super(`Deployment with ID '${deploymentId}' was not found.`);
    this.name = 'UnknownDeploymentError';
    this.deploymentId = deploymentId;
    Object.setPrototypeOf(this, UnknownDeploymentError.prototype);
  }
}

export class InvalidPolicyCommandError extends Error {
  public readonly command: Partial<DeploymentPolicyCommand>;

  constructor(message: string, command: Partial<DeploymentPolicyCommand>) {
    super(message);
    this.name = 'InvalidPolicyCommandError';
    this.command = command;
    Object.setPrototypeOf(this, InvalidPolicyCommandError.prototype);
  }
}

export class RollbackExecutionError extends Error {
  public readonly deploymentId: string;
  public readonly currentStatus: DeploymentStatus;

  constructor(deploymentId: string, currentStatus: DeploymentStatus, reason: string) {
    super(`Failed to execute rollback on deployment '${deploymentId}' in status '${currentStatus}': ${reason}`);
    this.name = 'RollbackExecutionError';
    this.deploymentId = deploymentId;
    this.currentStatus = currentStatus;
    Object.setPrototypeOf(this, RollbackExecutionError.prototype);
  }
}

/**
 * Explicit Valid State Transitions Map
 */
export const VALID_DEPLOYMENT_TRANSITIONS: Record<DeploymentStatus, readonly DeploymentStatus[]> = {
  PENDING: ['MONITORING', 'ABORTED', 'FAILED'],
  QUEUED: ['PENDING', 'MONITORING', 'ABORTED', 'FAILED'],
  MONITORING: ['MONITORING', 'PAUSED', 'PROMOTING', 'PROMOTED', 'ROLLING_BACK', 'FAILED', 'ABORTED'],
  PROMOTING: ['MONITORING', 'PROMOTED', 'PAUSED', 'ROLLING_BACK', 'FAILED'],
  PAUSED: ['MONITORING', 'ROLLING_BACK', 'ABORTED', 'FAILED'],
  ROLLING_BACK: ['ROLLED_BACK', 'FAILED'],
  ROLLED_BACK: [], // Terminal state
  PROMOTED: ['ROLLING_BACK'],
  FAILED: [],      // Terminal state
  ABORTED: [],     // Terminal state
};

/**
 * Validates whether a transition from `from` to `to` is legally allowed.
 */
export function isValidDeploymentTransition(from: DeploymentStatus, to: DeploymentStatus): boolean {
  const allowed = VALID_DEPLOYMENT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that the transition from `from` to `to` is legal.
 * Throws InvalidStateTransitionError if illegal.
 */
export function validateDeploymentTransition(from: DeploymentStatus, to: DeploymentStatus): void {
  if (!isValidDeploymentTransition(from, to)) {
    const allowed = VALID_DEPLOYMENT_TRANSITIONS[from] || [];
    throw new InvalidStateTransitionError(from, to, allowed);
  }
}

export type RolloutStrategy = 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';

export interface VerificationSignal {
  id: string;
  name: string;
  description: string;
  metricKey: string;
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  currentValue: number;
  unit: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  evaluatedAt: string;
}

export interface DeploymentTimelineEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'SYSTEM';
  actor?: string;
  metadata?: Record<string, any>;
}

export interface LiveTelemetrySnapshot {
  timestamp: string;
  errorRate: number; // %
  p95Latency: number; // ms
  requestsPerMinute: number; // e.g. 12800
  cpuUtilization: number; // %
  memoryUtilization: number; // %
  canaryTrafficPercentage: number; // %
}

export interface DeploymentTelemetry {
  errorRate: number; // %
  p95Latency: number; // ms
  requestsPerMinute: number; // e.g. 12800
  cpuUtilization: number; // %
  memoryUtilization: number; // %
}

export interface Deployment {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  version: string;
  previousVersion: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  status: DeploymentStatus;
  risk: {
    score: number;
    level: RiskLevel;
  };
  strategy: RolloutStrategy;
  currentTrafficPercentage: number; // 0-100
  targetTrafficPercentage: number;
  stages: number[]; // [5, 25, 50, 100]
  currentStageIndex: number;
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  changeId: string;
  changeTitle: string;
  changeAuthor: string;
  repository: string;
  commitHash: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  pausedReason?: string;
  rollbackReason?: string;
  currentTelemetry: DeploymentTelemetry;
  telemetryHistory: LiveTelemetrySnapshot[];
  signals: VerificationSignal[];
  timeline: DeploymentTimelineEvent[];
}
