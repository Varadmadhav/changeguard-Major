import { describe, it, expect } from 'vitest';

import { changeGuardEngine } from './changeguard.engine';
import { mockChanges } from '../data/mockChanges';
import {
    healthyTelemetry,
    failureTelemetry,
} from './policy.test-data';
import {
    deploymentGateway,
} from './deployment.gateway';

const change = mockChanges.find(
    c => c.number === 1824
);

if (!change) {
    throw new Error('PR #1824 not found');
}

describe('ChangeGuard Engine Pipeline', () => {

    it('should route healthy telemetry through Deployment Gateway', () => {
        const command =
            deploymentGateway.evaluateDeployment(
                change,
                healthyTelemetry
            );

        expect(command.decision).toBe('PROMOTE');
        expect(command.canPromote).toBe(true);
        expect(command.allowedStages).toEqual([
            5,
            25,
            50,
            100,
        ]);
    });

    it('should route failed telemetry through Deployment Gateway', () => {
        const command =
            deploymentGateway.evaluateDeployment(
                change,
                failureTelemetry
            );

        expect(command.decision).toBe('PAUSE');
        expect(command.canPromote).toBe(false);
        expect(command.failedSignals.length)
            .toBeGreaterThan(0);
    });

    it('should analyze PR and generate HIGH risk', () => {
        const result =
            changeGuardEngine.analyze(change);

        expect(result.risk.score).toBe(78);
        expect(result.risk.level).toBe('HIGH');
    });

    it('should generate CANARY policy for PR #1824', () => {
        const result =
            changeGuardEngine.analyze(change);

        expect(result.policy.strategy).toBe('CANARY');

        expect(result.policy.stages).toEqual([
            5,
            25,
            50,
            100,
        ]);
    });
    it('should create PROMOTE command for healthy telemetry', () => {
        const command =
            changeGuardEngine.createDeploymentCommand(
                change,
                healthyTelemetry
            );

        expect(command.decision).toBe('PROMOTE');
        expect(command.canPromote).toBe(true);
        expect(command.deploymentId).toBe(
            'dep-checkout-284'
        );
        expect(command.allowedStages).toEqual([
            5,
            25,
            50,
            100,
        ]);
    });

    it('should create PAUSE command for failed telemetry', () => {
        const command =
            changeGuardEngine.createDeploymentCommand(
                change,
                failureTelemetry
            );

        expect(command.decision).toBe('PAUSE');
        expect(command.canPromote).toBe(false);
        expect(command.deploymentId).toBe(
            'dep-checkout-284'
        );
        expect(command.failedSignals.length)
            .toBeGreaterThan(0);
    });
    it('should PROMOTE healthy telemetry', () => {
        const result =
            changeGuardEngine.evaluateTelemetry(
                change,
                healthyTelemetry
            );

        expect(result.decision).toBe('PROMOTE');
        expect(result.canPromote).toBe(true);
    });

    it('should PAUSE failed telemetry', () => {
        const result =
            changeGuardEngine.evaluateTelemetry(
                change,
                failureTelemetry
            );

        expect(result.decision).toBe('PAUSE');
        expect(result.canPromote).toBe(false);
        expect(result.failedSignals.length)
            .toBeGreaterThan(0);
    });

});