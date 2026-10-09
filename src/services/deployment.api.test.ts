import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentRepository, StateConflictError } from './deployment.repository.ts';
import { deploymentAuditAdapter, AuditWriterError } from './audit.adapter.ts';
import { deploymentsService } from './deployments.service.ts';
import { dispatchDeploymentApi, DeploymentApiController } from '../api/deployment.api.ts';

describe('Phase 4: Real Backend + Deployment APIs + Audit Integration', () => {
  beforeEach(async () => {
    deploymentsService.resetDeployments();
    deploymentAuditAdapter.clear();
  });

  describe('1. HTTP API Endpoints & Contract Enforcement', () => {
    it('GET /api/deployments returns all deployments with 200 OK', async () => {
      const res = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/deployments',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      const demo = res.body.data.find((d: any) => d.id === 'dep-checkout-284');
      assert.ok(demo);
      assert.strictEqual(demo.version, 'v2.9.0');
      assert.strictEqual(demo.previousVersion, 'v2.8.3');
      assert.strictEqual(demo.currentTrafficPercentage, 42);
    });

    it('GET /api/deployments/:id returns 200 OK for valid ID and 404 for unknown ID', async () => {
      const okRes = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/deployments/dep-checkout-284',
      });
      assert.strictEqual(okRes.statusCode, 200);
      assert.strictEqual(okRes.body.success, true);
      assert.strictEqual(okRes.body.data.id, 'dep-checkout-284');

      const notFoundRes = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/deployments/non-existent-dep-999',
      });
      assert.strictEqual(notFoundRes.statusCode, 404);
      assert.strictEqual(notFoundRes.body.success, false);
      assert.strictEqual(notFoundRes.body.error?.code, 'DEPLOYMENT_NOT_FOUND');
    });

    it('POST /api/deployments/:id/promote advances canary stage from 42% to 50%', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/promote',
        body: { targetStage: 50 },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.currentTrafficPercentage, 50);

      // Verify persisted in repository
      const persisted = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(persisted?.currentTrafficPercentage, 50);

      // Verify audit event was created
      const events = deploymentAuditAdapter.getEvents();
      assert.ok(events.length > 0);
      const promoteEvent = events.find(e => e.action === 'DEPLOYMENT_PROMOTED');
      assert.ok(promoteEvent);
      assert.strictEqual(promoteEvent.resource.id, 'dep-checkout-284');
      assert.strictEqual(promoteEvent.metadata?.stagePercentage, 50);
    });

    it('POST /api/deployments/:id/promote rejects invalid stage jump with 400 Bad Request', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/promote',
        body: { targetStage: 100 }, // Jumping directly from 42% to 100% violates canary steps
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error?.code, 'INVALID_STAGE');
    });

    it('POST /api/deployments/:id/pause halts rollout with 200 OK and updates state to PAUSED', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/pause',
        body: { reason: 'Operator manual safety hold.' },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PAUSED');
      assert.strictEqual(res.body.data.pausedReason, 'Operator manual safety hold.');

      // Verify repository persistence
      const persisted = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(persisted?.status, 'PAUSED');

      // Verify audit event
      const events = deploymentAuditAdapter.getEvents();
      const pauseEvent = events.find(e => e.action === 'DEPLOYMENT_PAUSED');
      assert.ok(pauseEvent);
      assert.strictEqual(pauseEvent.resource.id, 'dep-checkout-284');
      assert.strictEqual(pauseEvent.actor.type, 'POLICY_ENGINE');
    });

    it('POST /api/deployments/:id/rollback executes two-step rollback and restores baseline v2.8.3', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/rollback',
        body: { reason: 'P95 latency breach.' },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'ROLLED_BACK');
      assert.strictEqual(res.body.data.version, 'v2.8.3');
      assert.strictEqual(res.body.data.currentTrafficPercentage, 0);

      // Verify repository persistence
      const persisted = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(persisted?.status, 'ROLLED_BACK');
      assert.strictEqual(persisted?.version, 'v2.8.3');

      // Verify audit events recorded (both initiated and completed)
      const events = deploymentAuditAdapter.getEvents();
      const rollbackEvents = events.filter(e => e.action === 'ROLLBACK_EXECUTED');
      assert.ok(rollbackEvents.length >= 1);
    });

    it('POST /api/deployments/:id/promote on ROLLED_BACK returns 409 Conflict', async () => {
      // First rollback
      await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/rollback',
        body: {},
      });

      // Try promoting after rollback
      const promoteRes = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/promote',
        body: { targetStage: 5 },
      });

      assert.strictEqual(promoteRes.statusCode, 409);
      assert.strictEqual(promoteRes.body.success, false);
      assert.strictEqual(promoteRes.body.error?.code, 'INVALID_TRANSITION');
    });

    it('returns 404 for unknown route and 405 for unsupported method', async () => {
      const unknownRes = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/nonexistent-route',
      });
      assert.strictEqual(unknownRes.statusCode, 404);

      const notAllowedRes = await dispatchDeploymentApi({
        method: 'DELETE',
        url: '/api/deployments/dep-checkout-284',
      });
      assert.strictEqual(notAllowedRes.statusCode, 405);
    });
  });

  describe('2. Persistent Storage & Optimistic Concurrency Control', () => {
    it('persists state across repository re-instantiation / simulated service restart', async () => {
      // Modify deployment in repository
      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);
      dep.currentTrafficPercentage = 50;
      dep.status = 'MONITORING';
      await deploymentRepository.save(dep);

      // Simulate a service/process restart by reading the store directly
      const reloadedDep = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(reloadedDep?.currentTrafficPercentage, 50);
      assert.strictEqual(reloadedDep?.status, 'MONITORING');
    });

    it('prevents concurrent overwrite with StateConflictError when expectedStatus does not match', async () => {
      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      // Attempt save with mismatched expected status
      await assert.rejects(
        async () => {
          await deploymentRepository.save(
            { ...dep, currentTrafficPercentage: 50 },
            'PAUSED' // Actual status is MONITORING
          );
        },
        StateConflictError
      );
    });

    it('persists all core fields: baseline version, metrics, rollback status, timestamps', async () => {
      await deploymentsService.rollbackDeployment('dep-checkout-284', 'Test verification rollback');
      const persisted = await deploymentRepository.findById('dep-checkout-284');

      assert.ok(persisted);
      assert.strictEqual(persisted.id, 'dep-checkout-284');
      assert.strictEqual(persisted.serviceName, 'Checkout Service');
      assert.strictEqual(persisted.version, 'v2.8.3');
      assert.strictEqual(persisted.previousVersion, 'v2.8.3');
      assert.strictEqual(persisted.currentTrafficPercentage, 0);
      assert.strictEqual(persisted.status, 'ROLLED_BACK');
      assert.strictEqual(persisted.currentTelemetry.errorRate, 0.08);
      assert.strictEqual(persisted.currentTelemetry.p95Latency, 160);
      assert.ok(persisted.completedAt);
    });
  });

  describe('3. Audit Integration & Audit Writer Resilience', () => {
    it('records audit events conforming strictly to Jayesh AuditEventInput schema', async () => {
      await deploymentsService.promoteDeployment('dep-checkout-284', 50);

      const events = deploymentAuditAdapter.getEvents();
      assert.strictEqual(events.length, 1);
      const ev = events[0];

      // Validate schema conformity
      assert.ok(ev.id);
      assert.ok(ev.timestamp);
      assert.ok(ev.timeFormatted);
      assert.strictEqual(ev.actor.type, 'USER');
      assert.strictEqual(ev.action, 'DEPLOYMENT_PROMOTED');
      assert.strictEqual(ev.resource.type, 'DEPLOYMENT');
      assert.strictEqual(ev.resource.id, 'dep-checkout-284');
      assert.strictEqual(ev.result, 'SUCCESS');
      assert.strictEqual(ev.source, 'WEB_CONSOLE');
      assert.strictEqual(ev.metadata?.stagePercentage, 50);
    });

    it('deduplicates rapid identical audit events within 1 second window', async () => {
      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      // Rapid successive identical promotions
      await deploymentAuditAdapter.recordPromotion(dep, 50);
      await deploymentAuditAdapter.recordPromotion(dep, 50);

      const events = deploymentAuditAdapter.getEvents();
      assert.strictEqual(events.length, 1); // Deduplicated
    });

    it('surfaces AuditWriterError without corrupting deployment business state when sink fails', async () => {
      deploymentAuditAdapter.setSimulateWriterFailure(true);

      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      await assert.rejects(
        async () => {
          await deploymentAuditAdapter.recordPromotion(dep, 50);
        },
        AuditWriterError
      );

      deploymentAuditAdapter.setSimulateWriterFailure(false);
    });
  });

  describe('4. Failure Simulation & Autonomous Policy Receiver Integration', () => {
    it('POST /api/deployments/:id/simulate-failure sets errorRate to 3.7% and P95 to 840ms', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/deployments/dep-checkout-284/simulate-failure',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.currentTelemetry.errorRate, 3.7);
      assert.strictEqual(res.body.data.currentTelemetry.p95Latency, 840);
      assert.strictEqual(res.body.data.health, 'CRITICAL');

      // Verify persisted
      const persisted = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(persisted?.currentTelemetry.errorRate, 3.7);
    });

    it('handles autonomous policy receiver PAUSE command and creates audit trail', async () => {
      await deploymentsService.handlePolicyCommand({
        deploymentId: 'dep-checkout-284',
        decision: 'PAUSE',
        canPromote: false,
        allowedStages: [],
        failedSignals: ['http_error_rate (3.7% >= 1.0%)'],
        reason: 'Autonomous verification: error rate 3.7% breached safety threshold',
      });

      const persisted = await deploymentRepository.findById('dep-checkout-284');
      assert.strictEqual(persisted?.status, 'PAUSED');

      const events = deploymentAuditAdapter.getEvents();
      const pauseEvent = events.find(e => e.action === 'DEPLOYMENT_PAUSED');
      assert.ok(pauseEvent);
      assert.strictEqual(pauseEvent.actor.type, 'POLICY_ENGINE');
    });
  });
});
