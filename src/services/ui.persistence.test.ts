import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeploymentsService, deploymentsService } from './deployments.service.ts';
import { DeploymentRepository, MemoryStorageDriver, LocalStorageDriver } from './deployment.repository.ts';
import { CanaryController } from './canary.controller.ts';
import { PolicyReceiver } from './policy.receiver.ts';
import { DeploymentAuditAdapter } from './audit.adapter.ts';

describe('UI Integration & Refresh Persistence (Phase 9A)', () => {
  const TARGET_ID = 'dep-checkout-284';

  beforeEach(async () => {
    await deploymentsService.resetDeployments();
  });

  test('Initial state: dep-checkout-284 starts at 42% canary traffic', async () => {
    const list = await deploymentsService.getDeployments();
    const dep = list.find(d => d.id === TARGET_ID);
    assert.ok(dep, 'Target deployment should exist');
    assert.equal(dep.currentTrafficPercentage, 42);
    assert.equal(dep.status, 'MONITORING');
  });

  test('Stage progression: 42% advances to 50% (not jumping to 100%)', async () => {
    const promoted = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.ok(promoted);
    assert.equal(promoted.currentTrafficPercentage, 50, 'First promotion must advance from 42% to 50%');
    assert.equal(promoted.status, 'MONITORING', 'Stage at 50% should remain MONITORING');

    // Subsequent promotion should advance from 50% to 100%
    const finalPromoted = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.ok(finalPromoted);
    assert.equal(finalPromoted.currentTrafficPercentage, 100, 'Second promotion must advance from 50% to 100%');
    assert.equal(finalPromoted.status, 'PROMOTED', 'Final promotion status must be PROMOTED');
  });

  test('Refresh persistence: state is preserved across repository re-instantiation', async () => {
    // Shared storage simulates browser localStorage across page reloads
    const sharedStorage = new MemoryStorageDriver();
    const repoA = new DeploymentRepository(sharedStorage);
    const serviceA = new DeploymentsService(
      repoA,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    // Initial check on "tab 1"
    const initialList = await serviceA.getDeployments();
    const initialDep = initialList.find(d => d.id === TARGET_ID);
    assert.equal(initialDep?.currentTrafficPercentage, 42);

    // Promote to 50%
    const promoted = await serviceA.promoteDeployment(TARGET_ID);
    assert.equal(promoted?.currentTrafficPercentage, 50);

    // Simulate page refresh by creating a fresh repository/service connected to the same storage
    const repoB = new DeploymentRepository(sharedStorage);
    const serviceB = new DeploymentsService(
      repoB,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    const reloadedList = await serviceB.getDeployments();
    const reloadedDep = reloadedList.find(d => d.id === TARGET_ID);
    assert.ok(reloadedDep);
    assert.equal(reloadedDep.currentTrafficPercentage, 50, 'Reloaded state must retain 50% traffic rather than resetting to 42%');
    assert.equal(reloadedDep.status, 'MONITORING');
  });

  test('Pause & Rollback persistence across reloads', async () => {
    const sharedStorage = new MemoryStorageDriver();
    const repoA = new DeploymentRepository(sharedStorage);
    const serviceA = new DeploymentsService(
      repoA,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    // Pause deployment
    const paused = await serviceA.pauseDeployment(TARGET_ID, 'Investigating latency anomaly');
    assert.equal(paused?.status, 'PAUSED');

    // Simulate refresh
    const repoB = new DeploymentRepository(sharedStorage);
    const serviceB = new DeploymentsService(
      repoB,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );
    const refreshed = await serviceB.getDeploymentById(TARGET_ID);
    assert.equal(refreshed?.status, 'PAUSED');

    // Rollback deployment
    const rolledBack = await serviceB.rollbackDeployment(TARGET_ID, 'Manual override rollback');
    assert.equal(rolledBack?.status, 'ROLLED_BACK');
    assert.equal(rolledBack?.currentTrafficPercentage, 0);

    // Simulate another refresh
    const repoC = new DeploymentRepository(sharedStorage);
    const serviceC = new DeploymentsService(
      repoC,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );
    const refreshedAfterRollback = await serviceC.getDeploymentById(TARGET_ID);
    assert.equal(refreshedAfterRollback?.status, 'ROLLED_BACK');
    assert.equal(refreshedAfterRollback?.currentTrafficPercentage, 0);
  });

  test('Reset: resets persisted state back to initial seed data', async () => {
    const promoted = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.equal(promoted?.currentTrafficPercentage, 50);

    const resetList = await deploymentsService.resetDeployments();
    const targetAfterReset = resetList.find(d => d.id === TARGET_ID);
    assert.equal(targetAfterReset?.currentTrafficPercentage, 42);
    assert.equal(targetAfterReset?.status, 'MONITORING');
  });

  test('LocalStorageDriver handles browser storage gracefully', () => {
    const driver = new LocalStorageDriver();
    // In Node environment where window is undefined, driver should safely return null and not throw
    assert.equal(driver.read('non_existent_key'), null);
    assert.doesNotThrow(() => driver.write('test_key', 'test_data'));
    assert.doesNotThrow(() => driver.remove('test_key'));
  });

  test('Phase 9C Regression: Rollback from 100% PROMOTED transitions to ROLLED_BACK and restores baseline', async () => {
    // 1. Advance through canary stages: 42% -> 50% -> 100%
    const stage50 = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.equal(stage50?.currentTrafficPercentage, 50);
    assert.equal(stage50?.status, 'MONITORING');

    const stage100 = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.equal(stage100?.currentTrafficPercentage, 100);
    assert.equal(stage100?.status, 'PROMOTED');

    // 2. Execute rollback directly from PROMOTED state
    const rolledBack = await deploymentsService.rollbackDeployment(
      TARGET_ID,
      'Post-promotion production defect detected'
    );
    assert.ok(rolledBack, 'Rollback from PROMOTED must succeed');

    // 3. Verify domain-state restoration
    assert.equal(rolledBack.status, 'ROLLED_BACK');
    assert.equal(rolledBack.version, 'v2.8.3', 'Running version must restore to baseline v2.8.3');
    assert.equal(rolledBack.previousVersion, 'v2.8.3', 'Original baseline version must be preserved');
    assert.equal(rolledBack.currentTrafficPercentage, 0, 'Current traffic must revert to 0%');
    assert.equal(rolledBack.targetTrafficPercentage, 0, 'Target traffic must revert to 0%');
    assert.equal(rolledBack.currentTelemetry.errorRate, 0.08, 'Error rate must normalize to 0.08%');
    assert.equal(rolledBack.currentTelemetry.p95Latency, 160, 'P95 latency must normalize to 160ms');
    assert.equal(rolledBack.health, 'HEALTHY', 'Health must return to HEALTHY');
    for (const signal of rolledBack.signals) {
      assert.equal(signal.status, 'PASSED', 'Verification signals must reset to PASSED');
    }

    // 4. Verify persistence across reloads / re-instantiated repositories
    const reloaded = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.ok(reloaded);
    assert.equal(reloaded.status, 'ROLLED_BACK');
    assert.equal(reloaded.version, 'v2.8.3');
    assert.equal(reloaded.currentTrafficPercentage, 0);
  });

  test('Phase 9C Persistence: Rollback from PROMOTED persists across independent repository instances', async () => {
    const sharedStorage = new MemoryStorageDriver();
    const repoA = new DeploymentRepository(sharedStorage);
    const serviceA = new DeploymentsService(
      repoA,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    // Advance to 100%
    await serviceA.promoteDeployment(TARGET_ID); // 42% -> 50%
    const promoted = await serviceA.promoteDeployment(TARGET_ID); // 50% -> 100%
    assert.equal(promoted?.status, 'PROMOTED');

    // Execute rollback
    const rolledBack = await serviceA.rollbackDeployment(TARGET_ID, 'Emergency rollback after full promotion');
    assert.equal(rolledBack?.status, 'ROLLED_BACK');
    assert.equal(rolledBack?.version, 'v2.8.3');
    assert.equal(rolledBack?.currentTrafficPercentage, 0);

    // Simulate page reload on fresh repository
    const repoB = new DeploymentRepository(sharedStorage);
    const serviceB = new DeploymentsService(
      repoB,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );
    const persisted = await serviceB.getDeploymentById(TARGET_ID);
    assert.ok(persisted);
    assert.equal(persisted.status, 'ROLLED_BACK');
    assert.equal(persisted.version, 'v2.8.3');
    assert.equal(persisted.currentTrafficPercentage, 0);
    assert.equal(persisted.currentTelemetry.errorRate, 0.08);
    assert.equal(persisted.currentTelemetry.p95Latency, 160);
  });

  test('Phase 9C Safety: Rejected rollback does not mutate state or corrupt repository', async () => {
    // Rollback once to terminal ROLLED_BACK state
    const firstRollback = await deploymentsService.rollbackDeployment(TARGET_ID, 'First rollback');
    assert.equal(firstRollback?.status, 'ROLLED_BACK');

    // Attempting another rollback from terminal ROLLED_BACK must fail
    await assert.rejects(
      async () => {
        await deploymentsService.rollbackDeployment(TARGET_ID, 'Second invalid rollback');
      },
      (err: any) => {
        assert.equal(err.name, 'InvalidStateTransitionError');
        return true;
      }
    );

    // Ensure persisted state is unchanged
    const dep = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(dep?.status, 'ROLLED_BACK');
    assert.equal(dep?.version, 'v2.8.3');
  });

  test('Phase 9E: Pause persists as PAUSED across repository re-instantiations', async () => {
    const sharedStorage = new MemoryStorageDriver();
    const repoA = new DeploymentRepository(sharedStorage);
    const serviceA = new DeploymentsService(
      repoA,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    const paused = await serviceA.pauseDeployment(TARGET_ID, 'Operator manual audit');
    assert.ok(paused);
    assert.equal(paused.status, 'PAUSED');
    assert.equal(paused.pausedReason, 'Operator manual audit');

    // Reload in separate repo instance
    const repoB = new DeploymentRepository(sharedStorage);
    const serviceB = new DeploymentsService(
      repoB,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );
    const persisted = await serviceB.getDeploymentById(TARGET_ID);
    assert.ok(persisted);
    assert.equal(persisted.status, 'PAUSED');
    assert.equal(persisted.pausedReason, 'Operator manual audit');
  });

  test('Phase 9E: Resume transitions PAUSED -> MONITORING, clears pauseReason, and persists across reload', async () => {
    const sharedStorage = new MemoryStorageDriver();
    const repoA = new DeploymentRepository(sharedStorage);
    const serviceA = new DeploymentsService(
      repoA,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );

    // Pause first
    await serviceA.pauseDeployment(TARGET_ID, 'Temporary anomaly hold');

    // Resume deployment
    const resumed = await serviceA.resumeDeployment(TARGET_ID);
    assert.ok(resumed);
    assert.equal(resumed.status, 'MONITORING', 'Status must transition to MONITORING upon resume');
    assert.equal(resumed.pausedReason, undefined, 'pausedReason must be cleared');
    assert.equal(resumed.health, 'HEALTHY');
    assert.equal(resumed.timeline[0].title, 'Rollout Resumed');

    // Reload in separate instance
    const repoB = new DeploymentRepository(sharedStorage);
    const serviceB = new DeploymentsService(
      repoB,
      new CanaryController(),
      new PolicyReceiver(),
      new DeploymentAuditAdapter()
    );
    const reloaded = await serviceB.getDeploymentById(TARGET_ID);
    assert.ok(reloaded);
    assert.equal(reloaded.status, 'MONITORING');
    assert.equal(reloaded.pausedReason, undefined);
  });

  test('Phase 9E: Promotion after resume follows valid canary stages (42% -> 50% -> 100%)', async () => {
    // 1. Pause at 42%
    await deploymentsService.pauseDeployment(TARGET_ID, 'Investigating trace');
    const paused = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(paused?.status, 'PAUSED');

    // 2. Resume to MONITORING
    const resumed = await deploymentsService.resumeDeployment(TARGET_ID);
    assert.equal(resumed?.status, 'MONITORING');

    // 3. Promote stage: 42% -> 50%
    const stage50 = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.ok(stage50);
    assert.equal(stage50.currentTrafficPercentage, 50);
    assert.equal(stage50.status, 'MONITORING');

    // 4. Promote stage: 50% -> 100%
    const stage100 = await deploymentsService.promoteDeployment(TARGET_ID);
    assert.ok(stage100);
    assert.equal(stage100.currentTrafficPercentage, 100);
    assert.equal(stage100.status, 'PROMOTED');
  });

  test('Phase 9E Safety: Direct promotion while PAUSED is rejected and does not mutate persisted state', async () => {
    await deploymentsService.pauseDeployment(TARGET_ID, 'Safety lock');
    const beforePromotion = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(beforePromotion?.status, 'PAUSED');

    // Attempting promote directly on PAUSED deployment must throw CanaryInvalidStateError
    await assert.rejects(
      async () => {
        await deploymentsService.promoteDeployment(TARGET_ID);
      },
      (err: any) => {
        assert.equal(err.name, 'CanaryInvalidStateError');
        return true;
      }
    );

    // State remains in PAUSED with unchanged traffic
    const afterAttempt = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(afterAttempt?.status, 'PAUSED');
    assert.equal(afterAttempt?.currentTrafficPercentage, 42);
  });

  test('Phase 9E Safety: Invalid resume attempts are rejected without mutating state', async () => {
    // Currently in MONITORING state (not PAUSED)
    const current = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(current?.status, 'MONITORING');

    // Resuming a non-paused deployment must reject
    await assert.rejects(
      async () => {
        await deploymentsService.resumeDeployment(TARGET_ID);
      },
      (err: any) => {
        assert.equal(err.name, 'InvalidStateTransitionError');
        return true;
      }
    );

    // State remains intact
    const intact = await deploymentsService.getDeploymentById(TARGET_ID);
    assert.equal(intact?.status, 'MONITORING');
  });
});
