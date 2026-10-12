import type { Change } from '../types/change';

import { riskService } from './risk.service';
import { policyService } from './policy.service';

import {
    createDeploymentPolicyCommand,
} from './deployment.contract';

export interface ChangeGuardAnalysisResult {
    change: Change;
    risk: ReturnType<typeof riskService.analyze>;
    policy: ReturnType<typeof policyService.generatePolicy>;
}

class ChangeGuardEngine {
    analyze(
        change: Change
    ): ChangeGuardAnalysisResult {
        // 1. Analyze the change
        const risk =
            riskService.analyze(change);

        // 2. Apply calculated risk to the change
        const analyzedChange: Change = {
            ...change,
            risk: {
                ...change.risk,
                score: risk.score,
                level: risk.level,
                confidence: risk.confidence,
                summary: risk.summary,
                reasons: risk.reasons,
                factors: risk.factors,
            },
        };

        // 3. Generate deployment policy
        const policy =
            policyService.generatePolicy(
                analyzedChange
            );

        return {
            change: {
                ...analyzedChange,
                policyRecommendation: policy,
            },
            risk,
            policy,
        };
    }

    evaluateTelemetry(
        change: Change,
        telemetry: Parameters<
            typeof policyService.evaluateTelemetry
        >[0]
    ) {
        const result =
            this.analyze(change);

        return policyService.evaluateTelemetry(
            telemetry,
            result.policy
        );
    }

    createDeploymentCommand(
        change: Change,
        telemetry: Parameters<
            typeof policyService.evaluateTelemetry
        >[0]
    ) {
        const decision =
            this.evaluateTelemetry(
                change,
                telemetry
            );

        return createDeploymentPolicyCommand(
            decision
        );
    }
}

export const changeGuardEngine =
    new ChangeGuardEngine();