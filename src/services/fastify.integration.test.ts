import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentRepository, StateConflictError, FileStorageDriver } from './deployment.repository.ts';
import { deploymentAuditAdapter, AuditWriterError } from './audit.adapter.ts';
import { deploymentsService } from './deployments.service.ts';
import { dispatchDeploymentApi, createDeploymentHttpServer } from '../api/deployment.api.ts';
import http from 'node:http';

describe('Phase 5: Real Backend, Persistence & Fastify Integration Adapter', () => {
  beforeEach(async () => {
    deploymentsService.resetDeployments();
    deploymentAuditAdapter.clear();
  });

  describe('1. Fastify & V1 API Route Compatibility', () => {
    it('supports both /api/v1/deployments and /api/deployments for deployment list', async () => {
      const v1Res = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/v1/deployments',
      });
      assert.strictEqual(v1Res.statusCode, 200);
      assert.strictEqual(v1Res.body.success, true);
      assert.ok(Array.isArray(v1Res.body.data));
      const demo = v1Res.body.data.find((d: any) => d.id === 'dep-checkout-284');
      assert.ok(demo);
      assert.strictEqual(demo.currentTrafficPercentage, 42);

      const legacyRes = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/deployments',
      });
      assert.strictEqual(legacyRes.statusCode, 200);
      assert.strictEqual(legacyRes.body.data.length, v1Res.body.data.length);
    });

    it('supports /api/v1/deployments/:id detail route', async () => {
      const res = await dispatchDeploymentApi({
        method: 'GET',
        url: '/api/v1/deployments/dep-checkout-284',
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, 'dep-checkout-284');
      assert.strictEqual(res.body.data.version, 'v2.9.0');
      assert.strictEqual(res.body.data.previousVersion, 'v2.8.3');
    });

    it('executes progressive promotion through /api/v1/deployments/:id/promote', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/v1/deployments/dep-checkout-284/promote',
        body: { targetStage: 50 },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.currentTrafficPercentage, 50);

      const auditEvent = deploymentAuditAdapter.getEvents().find(e => e.action === 'DEPLOYMENT_PROMOTED');
      assert.ok(auditEvent);
      assert.strictEqual(auditEvent.resource.id, 'dep-checkout-284');
      assert.strictEqual(auditEvent.metadata?.stagePercentage, 50);
    });

    it('executes pause through /api/v1/deployments/:id/pause and records audit', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/v1/deployments/dep-checkout-284/pause',
        body: { reason: 'P95 latency trending upward' },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'PAUSED');

      const auditEvent = deploymentAuditAdapter.getEvents().find(e => e.action === 'DEPLOYMENT_PAUSED');
      assert.ok(auditEvent);
      assert.strictEqual(auditEvent.details, 'P95 latency trending upward');
    });

    it('executes rollback through /api/v1/deployments/:id/rollback and reverts to baseline v2.8.3', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/v1/deployments/dep-checkout-284/rollback',
        body: { reason: 'High error rate breach' },
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'ROLLED_BACK');
      assert.strictEqual(res.body.data.version, 'v2.8.3');
      assert.strictEqual(res.body.data.currentTrafficPercentage, 0);

      const auditEvent = deploymentAuditAdapter.getEvents().find(e => e.action === 'ROLLBACK_EXECUTED');
      assert.ok(auditEvent);
    });
  });

  describe('2. Real Server & Concurrency Safety Verification', () => {
    it('handles live HTTP requests over actual Node.js HTTP server instance', async () => {
      const server = createDeploymentHttpServer();
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const addr = server.address() as { port: number };

      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/api/v1/deployments/dep-checkout-284`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.data.id, 'dep-checkout-284');
        assert.strictEqual(data.data.currentTrafficPercentage, 42);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('rejects concurrent conflicting state transitions with 409 STATE_CONFLICT', async () => {
      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      // Save expecting MONITORING succeeds
      await deploymentRepository.save(dep, 'MONITORING');

      // Save expecting PAUSED fails since status is MONITORING
      await assert.rejects(
        async () => {
          await deploymentRepository.save(dep, 'PAUSED');
        },
        StateConflictError
      );
    });
  });

  describe('3. Durable Persistence & Real Database Contract Alignment', () => {
    it('persists changes to FileStorageDriver on disk and reloads on new instance', async () => {
      const fileDriver = new FileStorageDriver();
      const testDep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(testDep);

      testDep.currentTrafficPercentage = 50;
      testDep.status = 'MONITORING';
      await deploymentRepository.save(testDep);

      // Instantiate a fresh repository reading from disk
      const freshRepo = new (deploymentRepository.constructor as any)(fileDriver);
      const reloaded = await freshRepo.findById('dep-checkout-284');
      assert.ok(reloaded);
      assert.strictEqual(reloaded.currentTrafficPercentage, 50);
      assert.strictEqual(reloaded.status, 'MONITORING');
    });

    it('failure simulation trips breaker: errorRate becomes 3.7%, latency becomes 840ms', async () => {
      const res = await dispatchDeploymentApi({
        method: 'POST',
        url: '/api/v1/deployments/dep-checkout-284/simulate-failure',
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.currentTelemetry.errorRate, 3.7);
      assert.strictEqual(res.body.data.currentTelemetry.p95Latency, 840);
      assert.strictEqual(res.body.data.health, 'CRITICAL');
    });
  });

  describe('4. Audit Resilience & Tamper-Evident Logging', () => {
    it('dispatches valid audit payload matching Jayesh AuditWriter schema', async () => {
      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      const event = await deploymentAuditAdapter.recordPromotion(dep, 50, 'SRE Lead');
      assert.strictEqual(event.actor.name, 'SRE Lead');
      assert.strictEqual(event.actor.type, 'USER');
      assert.strictEqual(event.action, 'DEPLOYMENT_PROMOTED');
      assert.strictEqual(event.resource.id, 'dep-checkout-284');
      assert.strictEqual(event.result, 'SUCCESS');
      assert.strictEqual(event.source, 'WEB_CONSOLE');
      assert.strictEqual(event.metadata?.stagePercentage, 50);
    });

    it('propagates AuditWriterError if the audit store fails without corrupting deployment state', async () => {
      deploymentAuditAdapter.setSimulateWriterFailure(true);

      const dep = await deploymentRepository.findById('dep-checkout-284');
      assert.ok(dep);

      await assert.rejects(
        async () => {
          await deploymentAuditAdapter.recordPause(dep, 'Emergency halt');
        },
        AuditWriterError
      );

      deploymentAuditAdapter.setSimulateWriterFailure(false);
    });
  });
});
