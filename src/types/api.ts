import type {
    Change,
    ReleasePolicyRecommendation,
} from './change';

import type {
    TelemetryInput,
    PolicyDecision,
} from '../services/policy.service';

/**
 * POST /api/changes/analyze
 */
export interface AnalyzeChangeRequest {
    changeId: string;
}

export interface AnalyzeChangeResponse {
    change: Change;
    risk: Change['risk'];
    policy: ReleasePolicyRecommendation;
}

/**
 * GET /api/changes
 */
export interface GetChangesResponse {
    changes: Change[];
}

/**
 * GET /api/changes/:id
 */
export interface GetChangeResponse {
    change: Change;
}

/**
 * POST /api/policies
 */
export interface CreatePolicyRequest {
    changeId: string;
}

export interface CreatePolicyResponse {
    policy: ReleasePolicyRecommendation;
}

/**
 * GET /api/policies
 */
export interface GetPoliciesResponse {
    policies: ReleasePolicyRecommendation[];
}

/**
 * Policy Engine → Deployment Controller
 */
export interface DeploymentDecisionResponse {
    decision: PolicyDecision['decision'];
    canPromote: boolean;
    allowedStages: number[];
    failedSignals: string[];
    reason: string;
}

/**
 * Telemetry sent to Policy Engine
 */
export type EvaluateTelemetryRequest =
    TelemetryInput;