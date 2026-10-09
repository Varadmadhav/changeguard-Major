import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { Deployment, VerificationSignal } from '../types/deployment.ts';
import {
  CanaryInvalidStateError,
  CanaryVerificationFailedError,
  CanaryInvalidStageError,
  CanaryStageSkipError,
} from '../types/deployment.ts';
import {
  canaryController,
  getNextCanaryStage,
  validateCanaryPromotion,
} from './canary.controller.ts';
import { mockDeployments } from '../data/mockDeployments.ts';
import { deploymentsService } from './deployments.service.ts';

function createMockDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: 'dep-test-canary',
    serviceId: 'srv-test',
    serviceName: 'Test Service',
    serviceTier: 'TIER_1',
    version: 'v2.0.0',
    previousVersion: 'v1.9.0',
    environment: 'PRODUCTION',
    status: 'MONITORING',
    risk: { score: 40, level: 'MEDIUM' },
    strategy: 'CANARY',
    currentTrafficPercentage: 5,
    targetTrafficPercentage: 25,
    stages: [5, 25, 50, 100],
    currentStageIndex: 0,
    health: 'HEALTHY',
    changeId: 'pr-test',
    changeTitle: 'Test change',
    changeAuthor: 'Dev',
    repository: 'test/repo',
    commitHash: 'abc1234',
    startedAt: '10 min ago',
    updatedAt: 'Just now',
    currentTelemetry: {
      errorRate: 0.2,
      p95Latency: 150,
      requestsPerMinute: 10000,
      cpuUtilization: 45,
      memoryUtilization: 55,
    },
    telemetryHistory: [],
    signals: [
      {
        id: 'sig-test-1',
        name: 'HTTP Error Rate',
        description: 'Error rate check',
        metricKey: 'http_error_rate',
        operator: '<',
        threshold: 1.0,
        currentValue: 0.2,
        unit: '%',
        status: 'PASSED',
        evaluatedAt: 'Just now',
      },
      {
        id: 'sig-test-2',
        name: 'P95 Latency',
        description: 'Latency check',
        metricKey: 'p95_latency',
        operator: '<',
        threshold: 500,
        currentValue: 150,
        unit: 'ms',
        status: 'PASSED',
        evaluatedAt: 'Just now',
      },
    ],
    timeline: [],
    ...overrides,
  };
}

describe('Phase 2: Canary Controller Engine', () => {
  describe('1. Promotion from 5% to 25%', () => {
    it('should advance from stage 1 (5%) to stage 2 (25%) while in MONITORING', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 5,
        targetTrafficPercentage: 5,
        currentStageIndex: 0,
        status: 'MONITORING',
      });

      assert.strictEqual(canaryController.getNextStage(dep), 25);
      const promoted = canaryController.promote(dep);

      assert.strictEqual(promoted.currentTrafficPercentage, 25);
      assert.strictEqual(promoted.targetTrafficPercentage, 25);
      assert.strictEqual(promoted.currentStageIndex, 1);
      assert.strictEqual(promoted.status, 'MONITORING');
      assert.strictEqual(promoted.health, 'HEALTHY');
      assert.strictEqual(promoted.timeline[0].title, 'Traffic Promoted to 25%');
    });
  });

  describe('2. Promotion from 25% to 50%', () => {
    it('should advance from stage 2 (25%) to stage 3 (50%)', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 25,
        targetTrafficPercentage: 25,
        currentStageIndex: 1,
        status: 'MONITORING',
      });

      assert.strictEqual(canaryController.getNextStage(dep), 50);
      const promoted = canaryController.promote(dep);

      assert.strictEqual(promoted.currentTrafficPercentage, 50);
      assert.strictEqual(promoted.targetTrafficPercentage, 50);
      assert.strictEqual(promoted.currentStageIndex, 2);
      assert.strictEqual(promoted.status, 'MONITORING');
      assert.strictEqual(promoted.timeline[0].title, 'Traffic Promoted to 50%');
    });
  });

  describe('3. Promotion from 50% to 100%', () => {
    it('should advance from stage 3 (50%) to stage 4 (100%) and mark status as PROMOTED', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 50,
        targetTrafficPercentage: 50,
        currentStageIndex: 2,
        status: 'MONITORING',
      });

      assert.strictEqual(canaryController.getNextStage(dep), 100);
      const promoted = canaryController.promote(dep);

      assert.strictEqual(promoted.currentTrafficPercentage, 100);
      assert.strictEqual(promoted.targetTrafficPercentage, 100);
      assert.strictEqual(promoted.currentStageIndex, 3);
      assert.strictEqual(promoted.status, 'PROMOTED');
      assert.ok(promoted.completedAt, 'completedAt timestamp should be set upon 100% promotion');
      assert.strictEqual(promoted.timeline[0].title, 'Deployment 100% Promoted');
    });
  });

  describe("4. Promotion from Demo's 42% to 50%", () => {
    it('should promote the shared demo deployment (dep-checkout-284) from 42% to 50%, then to 100%', async () => {
      deploymentsService.resetDeployments();

      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep, 'dep-checkout-284 must exist');
      assert.strictEqual(dep.currentTrafficPercentage, 42, 'Demo must start at 42%');
      assert.strictEqual(dep.status, 'MONITORING');

      // Next valid stage for 42% in [5, 25, 50, 100] is 50%
      assert.strictEqual(canaryController.getNextStage(dep), 50);

      // Execute promotion to 50%
      const promotedTo50 = await deploymentsService.promoteDeployment('dep-checkout-284');
      assert.ok(promotedTo50);
      assert.strictEqual(promotedTo50.currentTrafficPercentage, 50);
      assert.strictEqual(promotedTo50.targetTrafficPercentage, 50);
      assert.strictEqual(promotedTo50.currentStageIndex, 2);
      assert.strictEqual(promotedTo50.status, 'MONITORING');

      // Subsequent promotion must advance to 100%
      assert.strictEqual(canaryController.getNextStage(promotedTo50), 100);
      const promotedTo100 = await deploymentsService.promoteDeployment('dep-checkout-284');
      assert.ok(promotedTo100);
      assert.strictEqual(promotedTo100.currentTrafficPercentage, 100);
      assert.strictEqual(promotedTo100.status, 'PROMOTED');

      deploymentsService.resetDeployments();
    });
  });

  describe('5. Rejection of Stage Skipping', () => {
    it('should reject skipping stages with CanaryStageSkipError', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 5,
        targetTrafficPercentage: 5,
        currentStageIndex: 0,
      });

      // Trying to skip 25% directly to 50%
      assert.throws(
        () => canaryController.promote(dep, 50),
        (err: unknown) => {
          assert.ok(err instanceof CanaryStageSkipError);
          const skipErr = err as CanaryStageSkipError;
          assert.strictEqual(skipErr.currentTraffic, 5);
          assert.strictEqual(skipErr.attemptedStage, 50);
          assert.strictEqual(skipErr.expectedStage, 25);
          return true;
        }
      );

      // Trying to skip directly to 100%
      assert.throws(
        () => canaryController.promote(dep, 100),
        (err: unknown) => {
          assert.ok(err instanceof CanaryStageSkipError);
          const skipErr = err as CanaryStageSkipError;
          assert.strictEqual(skipErr.expectedStage, 25);
          return true;
        }
      );
    });
  });

  describe('6. Rejection when Verification Fails', () => {
    it('should reject promotion when a verification signal is marked FAILED', () => {
      const failingSignals: VerificationSignal[] = [
        {
          id: 'sig-err',
          name: 'HTTP Error Rate',
          description: 'Spiked error rate',
          metricKey: 'http_error_rate',
          operator: '<',
          threshold: 1.0,
          currentValue: 3.7,
          unit: '%',
          status: 'FAILED',
          evaluatedAt: 'Just now',
        },
      ];

      const dep = createMockDeployment({
        currentTrafficPercentage: 25,
        signals: failingSignals,
      });

      assert.throws(
        () => canaryController.promote(dep),
        (err: unknown) => {
          assert.ok(err instanceof CanaryVerificationFailedError);
          const verErr = err as CanaryVerificationFailedError;
          assert.strictEqual(verErr.failedSignals.length, 1);
          assert.strictEqual(verErr.failedSignals[0].metricKey, 'http_error_rate');
          return true;
        }
      );
    });

    it('should reject promotion when metric value breaches threshold boundary', () => {
      const breachingSignals: VerificationSignal[] = [
        {
          id: 'sig-lat',
          name: 'P95 Transaction Latency',
          description: 'High latency',
          metricKey: 'p95_latency',
          operator: '<',
          threshold: 500,
          currentValue: 840,
          unit: 'ms',
          status: 'WARNING', // even if status was warning, value 840 >= 500 is in violation
          evaluatedAt: 'Just now',
        },
      ];

      const dep = createMockDeployment({
        currentTrafficPercentage: 25,
        signals: breachingSignals,
      });

      assert.throws(
        () => canaryController.promote(dep),
        (err: unknown) => {
          assert.ok(err instanceof CanaryVerificationFailedError);
          return true;
        }
      );
    });

    it('should reject promotion when overall health is CRITICAL', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 25,
        health: 'CRITICAL',
      });

      assert.throws(
        () => canaryController.promote(dep),
        (err: unknown) => {
          assert.ok(err instanceof CanaryVerificationFailedError);
          return true;
        }
      );
    });
  });

  describe('7. Rejection when Deployment is PAUSED', () => {
    it('should reject promotion when status is PAUSED with CanaryInvalidStateError', () => {
      const dep = createMockDeployment({
        status: 'PAUSED',
        currentTrafficPercentage: 42,
      });

      assert.throws(
        () => canaryController.promote(dep),
        (err: unknown) => {
          assert.ok(err instanceof CanaryInvalidStateError);
          const stateErr = err as CanaryInvalidStateError;
          assert.strictEqual(stateErr.currentStatus, 'PAUSED');
          return true;
        }
      );
    });
  });

  describe('8. Rejection after ROLLED_BACK, FAILED, or ABORTED', () => {
    it('should reject promotion for non-eligible terminal states', () => {
      const invalidStatuses = ['ROLLED_BACK', 'ROLLING_BACK', 'FAILED', 'ABORTED'] as const;

      for (const st of invalidStatuses) {
        const dep = createMockDeployment({
          status: st,
          currentTrafficPercentage: st === 'ROLLED_BACK' ? 0 : 25,
        });

        assert.throws(
          () => canaryController.promote(dep),
          (err: unknown) => {
            assert.ok(err instanceof CanaryInvalidStateError);
            assert.strictEqual((err as CanaryInvalidStateError).currentStatus, st);
            return true;
          },
          `Expected status ${st} to throw CanaryInvalidStateError`
        );
      }
    });
  });

  describe('9. Rejection of Promotion Beyond 100%', () => {
    it('should reject promotion when current traffic has already reached 100%', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 100,
        status: 'PROMOTED',
      });

      assert.throws(
        () => canaryController.promote(dep),
        (err: unknown) => {
          assert.ok(
            err instanceof CanaryInvalidStateError || err instanceof CanaryInvalidStageError
          );
          return true;
        }
      );
    });
  });

  describe('10. Confirmation that Rejected Operations Do Not Mutate State', () => {
    it('should preserve deployment state completely intact when promotion is rejected', () => {
      const dep = createMockDeployment({
        currentTrafficPercentage: 25,
        targetTrafficPercentage: 25,
        currentStageIndex: 1,
        status: 'MONITORING',
        health: 'HEALTHY',
        signals: [
          {
            id: 'sig-err',
            name: 'Error Rate',
            description: 'Failing error rate',
            metricKey: 'http_error_rate',
            operator: '<',
            threshold: 1.0,
            currentValue: 2.5,
            unit: '%',
            status: 'FAILED',
            evaluatedAt: 'Just now',
          },
        ],
      });

      const initialSnapshot = JSON.stringify(dep);

      // Attempt promotion (which must fail due to failing signal)
      assert.throws(() => canaryController.promote(dep));

      // Assert complete immutability of deployment upon failure
      assert.strictEqual(
        JSON.stringify(dep),
        initialSnapshot,
        'Deployment state must not be modified after a failed promotion'
      );
    });
  });
});
