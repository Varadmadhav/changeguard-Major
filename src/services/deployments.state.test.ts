import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CORE_DEPLOYMENT_STATES,
  CANARY_STAGES,
  isValidDeploymentTransition,
  validateDeploymentTransition,
  InvalidStateTransitionError,
} from '../types/deployment.ts';
import type {
  DeploymentStatus,
  CoreDeploymentStatus,
} from '../types/deployment.ts';
import { mockDeployments } from '../data/mockDeployments.ts';
import { deploymentsService } from './deployments.service.ts';

describe('Phase 1: Deployment State Foundation & Transitions', () => {
  describe('1. Reconciled Deployment Statuses & Canary Stages', () => {
    it('should include all required core lifecycle states', () => {
      const requiredCore: CoreDeploymentStatus[] = [
        'PENDING',
        'MONITORING',
        'PAUSED',
        'ROLLING_BACK',
        'ROLLED_BACK',
      ];

      for (const status of requiredCore) {
        assert.ok(
          CORE_DEPLOYMENT_STATES.includes(status),
          `Expected CORE_DEPLOYMENT_STATES to include ${status}`
        );
      }
      assert.strictEqual(CORE_DEPLOYMENT_STATES.length, 5);
    });

    it('should define the 4 canary stages strictly as 5%, 25%, 50%, 100%', () => {
      assert.deepStrictEqual(Array.from(CANARY_STAGES), [5, 25, 50, 100]);
    });
  });

  describe('2. State Transition Validation Rules', () => {
    it('should allow valid lifecycle transitions', () => {
      // PENDING -> MONITORING
      assert.strictEqual(isValidDeploymentTransition('PENDING', 'MONITORING'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('PENDING', 'MONITORING'));

      // MONITORING -> PAUSED
      assert.strictEqual(isValidDeploymentTransition('MONITORING', 'PAUSED'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('MONITORING', 'PAUSED'));

      // PAUSED -> MONITORING (resume)
      assert.strictEqual(isValidDeploymentTransition('PAUSED', 'MONITORING'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('PAUSED', 'MONITORING'));

      // MONITORING -> ROLLING_BACK -> ROLLED_BACK
      assert.strictEqual(isValidDeploymentTransition('MONITORING', 'ROLLING_BACK'), true);
      assert.strictEqual(isValidDeploymentTransition('ROLLING_BACK', 'ROLLED_BACK'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('MONITORING', 'ROLLING_BACK'));
      assert.doesNotThrow(() => validateDeploymentTransition('ROLLING_BACK', 'ROLLED_BACK'));

      // PAUSED -> ROLLING_BACK
      assert.strictEqual(isValidDeploymentTransition('PAUSED', 'ROLLING_BACK'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('PAUSED', 'ROLLING_BACK'));

      // MONITORING -> PROMOTED (100% full rollout)
      assert.strictEqual(isValidDeploymentTransition('MONITORING', 'PROMOTED'), true);
      assert.doesNotThrow(() => validateDeploymentTransition('MONITORING', 'PROMOTED'));
    });

    it('should reject invalid lifecycle transitions with typed InvalidStateTransitionError', () => {
      const invalidPairs: [DeploymentStatus, DeploymentStatus][] = [
        ['ROLLED_BACK', 'MONITORING'],
        ['ROLLED_BACK', 'PAUSED'],
        ['ROLLED_BACK', 'PROMOTED'],
        ['PROMOTED', 'MONITORING'],
        ['PROMOTED', 'PAUSED'],
        ['PENDING', 'ROLLED_BACK'],
        ['ROLLING_BACK', 'PROMOTED'],
      ];

      for (const [from, to] of invalidPairs) {
        assert.strictEqual(
          isValidDeploymentTransition(from, to),
          false,
          `Expected transition from ${from} to ${to} to be invalid`
        );

        assert.throws(
          () => validateDeploymentTransition(from, to),
          (err: unknown) => {
            assert.ok(err instanceof InvalidStateTransitionError);
            assert.strictEqual((err as InvalidStateTransitionError).fromStatus, from);
            assert.strictEqual((err as InvalidStateTransitionError).toStatus, to);
            assert.ok(Array.isArray((err as InvalidStateTransitionError).allowedTransitions));
            return true;
          },
          `Expected validateDeploymentTransition('${from}', '${to}') to throw InvalidStateTransitionError`
        );
      }
    });
  });

  describe('3. Shared Demo Deployment (dep-checkout-284) Alignment', () => {
    it('should match all required specifications for dep-checkout-284', () => {
      const demo = mockDeployments.find((d) => d.id === 'dep-checkout-284');
      assert.ok(demo, 'dep-checkout-284 must exist in mock deployments');

      // Version specifications
      assert.strictEqual(demo.version, 'v2.9.0', 'Current version must be v2.9.0');
      assert.strictEqual(demo.previousVersion, 'v2.8.3', 'Baseline version must be v2.8.3');

      // Traffic exposure
      assert.strictEqual(demo.currentTrafficPercentage, 42, 'Initial traffic must remain at 42%');
      assert.strictEqual(demo.status, 'MONITORING', 'Initial status must be MONITORING');

      // Initial telemetry
      assert.strictEqual(demo.currentTelemetry.errorRate, 0.42, 'Initial error rate must be 0.42%');
      assert.strictEqual(demo.currentTelemetry.p95Latency, 182, 'Initial P95 latency must be 182 ms');

      // Canary stages
      assert.deepStrictEqual(demo.stages, [5, 25, 50, 100], 'Canary stages must be [5, 25, 50, 100]');
    });
  });

  describe('4. DeploymentsService State Machine Guards', () => {
    it('should transition correctly during pause and rollback, and block illegal promotion', async () => {
      deploymentsService.resetDeployments();

      // 1. Pause rollout from MONITORING
      const paused = await deploymentsService.pauseDeployment('dep-checkout-284', 'Test anomaly pause');
      assert.ok(paused);
      assert.strictEqual(paused.status, 'PAUSED');

      // 2. Rollback from PAUSED
      const rolledBack = await deploymentsService.rollbackDeployment('dep-checkout-284', 'Test rollback');
      assert.ok(rolledBack);
      assert.strictEqual(rolledBack.status, 'ROLLED_BACK');
      assert.strictEqual(rolledBack.currentTrafficPercentage, 0);

      // 3. Attempting to promote a ROLLED_BACK deployment must reject with InvalidStateTransitionError
      await assert.rejects(
        async () => {
          await deploymentsService.promoteDeployment('dep-checkout-284');
        },
        InvalidStateTransitionError
      );

      // Reset service for clean state
      deploymentsService.resetDeployments();
    });
  });
});
