import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { DeploymentPolicyCommand, Deployment } from '../types/deployment.ts';
import {
  UnknownDeploymentError,
  InvalidPolicyCommandError,
  InvalidStateTransitionError,
  CanaryInvalidStateError,
} from '../types/deployment.ts';
import { deploymentsService } from './deployments.service.ts';
import { policyReceiver } from './policy.receiver.ts';
import { canaryController } from './canary.controller.ts';

describe('Phase 3: Telemetry Failure, Policy Receiver & Rollback Controller', () => {
  beforeEach(() => {
    deploymentsService.resetDeployments();
  });

  describe('Part A — Telemetry & Failure Simulation', () => {
    it('1 & 2. should update error rate (0.42% -> 3.7%) and P95 latency (182ms -> 840ms) deterministically', async () => {
      const initial = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(initial);
      assert.strictEqual(initial.currentTelemetry.errorRate, 0.42);
      assert.strictEqual(initial.currentTelemetry.p95Latency, 182);

      const failed = await deploymentsService.simulateFailure('dep-checkout-284');
      assert.ok(failed);

      // 1. Error rate increased to 3.7%
      assert.strictEqual(failed.currentTelemetry.errorRate, 3.7);

      // 2. P95 latency increased to 840 ms
      assert.strictEqual(failed.currentTelemetry.p95Latency, 840);

      // Verification signals updated consistently
      const errorSignal = failed.signals.find((s) => s.metricKey === 'http_error_rate');
      assert.ok(errorSignal);
      assert.strictEqual(errorSignal.currentValue, 3.7);
      assert.strictEqual(errorSignal.status, 'FAILED');

      const latencySignal = failed.signals.find((s) => s.metricKey === 'p95_latency');
      assert.ok(latencySignal);
      assert.strictEqual(latencySignal.currentValue, 840);
      assert.strictEqual(latencySignal.status, 'FAILED');

      assert.strictEqual(failed.health, 'CRITICAL');
    });

    it('3. should preserve the original baseline version and baseline metrics', async () => {
      const dep = await deploymentsService.simulateFailure('dep-checkout-284');
      assert.ok(dep);

      // Baseline version preserved
      assert.strictEqual(dep.previousVersion, 'v2.8.3');
      // Running version remains v2.9.0 before rollback
      assert.strictEqual(dep.version, 'v2.9.0');
      // Traffic remains at 42%
      assert.strictEqual(dep.currentTrafficPercentage, 42);
    });
  });

  describe('Part B — Policy Command Receiver and Automatic Pause', () => {
    it('4. should change status from MONITORING to PAUSED upon receiving a valid PAUSE command', async () => {
      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep);
      assert.strictEqual(dep.status, 'MONITORING');

      const pauseCommand: DeploymentPolicyCommand = {
        deploymentId: 'dep-checkout-284',
        decision: 'PAUSE',
        canPromote: false,
        allowedStages: [5, 25, 50, 100],
        failedSignals: ['Error rate 3.7% exceeded threshold 1.0%'],
        reason: 'Error rate threshold breached in production canary.',
      };

      const updated = await deploymentsService.handlePolicyCommand(pauseCommand);
      assert.ok(updated);
      assert.strictEqual(updated.status, 'PAUSED');
      assert.ok(updated.pausedReason?.includes('Error rate threshold breached'));
      assert.strictEqual(updated.timeline[0].title, 'Autonomous Rollout Pause Triggered');
    });

    it('5. should reject unknown deployment IDs and invalid commands with typed errors', async () => {
      // Unknown deployment ID
      const unknownCommand: DeploymentPolicyCommand = {
        deploymentId: 'dep-non-existent-999',
        decision: 'PAUSE',
        canPromote: false,
        allowedStages: [5, 25, 50, 100],
        failedSignals: [],
        reason: 'Pause non-existent',
      };

      await assert.rejects(
        async () => {
          await deploymentsService.handlePolicyCommand(unknownCommand);
        },
        (err: unknown) => {
          assert.ok(err instanceof UnknownDeploymentError);
          assert.strictEqual((err as UnknownDeploymentError).deploymentId, 'dep-non-existent-999');
          return true;
        }
      );

      // Invalid decision command
      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep);

      const invalidCommand = {
        deploymentId: 'dep-checkout-284',
        decision: 'INVALID_ACTION',
        canPromote: false,
        allowedStages: [],
        failedSignals: [],
        reason: 'Bad command',
      } as unknown as DeploymentPolicyCommand;

      assert.throws(
        () => policyReceiver.handleCommand(dep, invalidCommand),
        (err: unknown) => {
          assert.ok(err instanceof InvalidPolicyCommandError);
          return true;
        }
      );
    });

    it('6. should handle repeated pause commands safely (idempotency)', async () => {
      const pauseCommand: DeploymentPolicyCommand = {
        deploymentId: 'dep-checkout-284',
        decision: 'PAUSE',
        canPromote: false,
        allowedStages: [5, 25, 50, 100],
        failedSignals: ['Error rate breach'],
        reason: 'Threshold violated',
      };

      // First pause
      const firstPause = await deploymentsService.handlePolicyCommand(pauseCommand);
      assert.ok(firstPause);
      assert.strictEqual(firstPause.status, 'PAUSED');
      const timelineCount = firstPause.timeline.length;

      // Repeated pause (must not throw or duplicate state)
      const secondPause = await deploymentsService.handlePolicyCommand(pauseCommand);
      assert.ok(secondPause);
      assert.strictEqual(secondPause.status, 'PAUSED');
      assert.strictEqual(secondPause.timeline.length, timelineCount);
    });
  });

  describe('Part C — Two-Step Rollback Controller', () => {
    it('7. should transition safely through ROLLING_BACK to ROLLED_BACK', async () => {
      // Initiate from PAUSED
      await deploymentsService.pauseDeployment('dep-checkout-284', 'Prepare for rollback');
      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep);
      assert.strictEqual(dep.status, 'PAUSED');

      const rolledBack = await deploymentsService.rollbackDeployment('dep-checkout-284', 'Incident mitigation');
      assert.ok(rolledBack);
      assert.strictEqual(rolledBack.status, 'ROLLED_BACK');
    });

    it('8. should restore running version to baseline v2.8.3, traffic to 0%, error rate to 0.08%, and P95 to 160ms', async () => {
      // First simulate failure
      await deploymentsService.simulateFailure('dep-checkout-284');

      // Now execute rollback
      const rolledBack = await deploymentsService.rollbackDeployment('dep-checkout-284', 'Critical error rollback');
      assert.ok(rolledBack);

      // Running version restored to baseline v2.8.3
      assert.strictEqual(rolledBack.version, 'v2.8.3');
      // Original baseline record preserved
      assert.strictEqual(rolledBack.previousVersion, 'v2.8.3');
      // Traffic reduced to 0%
      assert.strictEqual(rolledBack.currentTrafficPercentage, 0);
      assert.strictEqual(rolledBack.targetTrafficPercentage, 0);
      // Metrics restored to safe baseline
      assert.strictEqual(rolledBack.currentTelemetry.errorRate, 0.08);
      assert.strictEqual(rolledBack.currentTelemetry.p95Latency, 160);
      // Health restored to healthy
      assert.strictEqual(rolledBack.health, 'HEALTHY');
      // Signals marked PASSED
      for (const signal of rolledBack.signals) {
        assert.strictEqual(signal.status, 'PASSED');
      }
    });

    it('9. should reject any further promotion after rollback has completed', async () => {
      await deploymentsService.rollbackDeployment('dep-checkout-284');

      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep);
      assert.strictEqual(dep.status, 'ROLLED_BACK');

      await assert.rejects(
        async () => {
          await deploymentsService.promoteDeployment('dep-checkout-284');
        },
        CanaryInvalidStateError
      );
    });

    it('10. should ensure failed operations do not leave partially mutated deployment data', async () => {
      // Rollback a deployment
      await deploymentsService.rollbackDeployment('dep-checkout-284');
      const dep = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.ok(dep);

      const snapshotBefore = JSON.stringify(dep);

      // Attempt to pause a ROLLED_BACK deployment (illegal transition)
      await assert.rejects(
        async () => {
          await deploymentsService.pauseDeployment('dep-checkout-284', 'Invalid pause');
        },
        InvalidStateTransitionError
      );

      // Assert state remains completely untouched
      const depAfter = await deploymentsService.getDeploymentById('dep-checkout-284');
      assert.strictEqual(JSON.stringify(depAfter), snapshotBefore);
    });
  });
});
