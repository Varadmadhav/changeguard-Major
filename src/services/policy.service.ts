import type { Change, ReleasePolicyRecommendation } from '../types/change';

export type DeploymentDecision = 'PROMOTE' | 'PAUSE';

export interface TelemetryInput {
    deploymentId: string;
    errorRate: number;
    p95Latency: number;
    checkoutSuccessRate: number;
    dbConnectionSaturation: number;
}

export interface PolicyDecision {
    deploymentId: string;
    decision: DeploymentDecision;
    reason: string;
    failedSignals: string[];
    telemetry: TelemetryInput;
    policy: ReleasePolicyRecommendation;
}

class PolicyService {
    generatePolicy(change: Change): ReleasePolicyRecommendation {
        const riskScore = change.risk.score;

        if (riskScore >= 70) {
            return {
                strategy: 'CANARY',
                stages: [5, 25, 50, 100],
                verificationWindowMinutes: 10,
                requiredSignals: [
                    {
                        name: 'Error Rate',
                        metric: 'http_request_errors_total / http_requests_total',
                        operator: '<',
                        threshold: '1.0%',
                        targetValue: '0.42%',
                    },
                    {
                        name: 'P95 Latency',
                        metric:
                            'histogram_quantile(0.95, http_request_duration_seconds)',
                        operator: '<',
                        threshold: '500ms',
                        targetValue: '182ms',
                    },
                    {
                        name: 'Checkout Success Rate',
                        metric:
                            'checkout_orders_completed / checkout_orders_attempted',
                        operator: '>=',
                        threshold: '99.0%',
                        targetValue: '99.8%',
                    },
                    {
                        name: 'DB Connection Saturation',
                        metric:
                            'pg_stat_activity_active / pg_stat_activity_max',
                        operator: '<',
                        threshold: '75%',
                        targetValue: '38%',
                    },
                ],
                humanApprovalRequired: true,
                approvalReason:
                    'Risk score is above the automated promotion threshold.',
                suggestedAction: 'APPROVE_POLICY',
            };
        }

        return change.policyRecommendation;
    }

    evaluateTelemetry(
        telemetry: TelemetryInput,
        policy: ReleasePolicyRecommendation
    ): PolicyDecision {
        const failedSignals: string[] = [];

        const errorThreshold = this.parsePercentage(
            this.getThreshold(policy, 'Error Rate')
        );

        const latencyThreshold = this.parseNumber(
            this.getThreshold(policy, 'P95 Latency')
        );

        const successThreshold = this.parsePercentage(
            this.getThreshold(policy, 'Checkout Success Rate')
        );

        const dbThreshold = this.parsePercentage(
            this.getThreshold(policy, 'DB Connection Saturation')
        );

        if (telemetry.errorRate >= errorThreshold) {
            failedSignals.push(
                `Error rate ${telemetry.errorRate}% exceeded threshold ${errorThreshold}%`
            );
        }

        if (telemetry.p95Latency >= latencyThreshold) {
            failedSignals.push(
                `P95 latency ${telemetry.p95Latency}ms exceeded threshold ${latencyThreshold}ms`
            );
        }

        if (
            telemetry.checkoutSuccessRate < successThreshold
        ) {
            failedSignals.push(
                `Checkout success rate ${telemetry.checkoutSuccessRate}% fell below ${successThreshold}%`
            );
        }

        if (
            telemetry.dbConnectionSaturation >= dbThreshold
        ) {
            failedSignals.push(
                `DB connection saturation ${telemetry.dbConnectionSaturation}% exceeded ${dbThreshold}%`
            );
        }

        const decision: DeploymentDecision =
            failedSignals.length > 0 ? 'PAUSE' : 'PROMOTE';

        return {
            deploymentId: telemetry.deploymentId,
            decision,
            reason:
                decision === 'PAUSE'
                    ? 'One or more deployment safety thresholds were violated.'
                    : 'All deployment safety thresholds are within acceptable limits.',
            failedSignals,
            telemetry,
            policy,
        };
    }

    private getThreshold(
        policy: ReleasePolicyRecommendation,
        signalName: string
    ): string {
        const signal = policy.requiredSignals.find(
            signal => signal.name === signalName
        );

        return signal?.threshold ?? '0';
    }

    private parsePercentage(value: string): number {
        return Number(value.replace('%', ''));
    }

    private parseNumber(value: string): number {
        return Number(value.replace('ms', ''));
    }
}

export const policyService = new PolicyService();