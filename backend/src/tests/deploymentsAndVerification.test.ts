import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';
import { argoClient } from '../services/argoClient.js';
import { prometheusClient } from '../services/prometheusClient.js';
import { VerificationEngine } from '../services/verificationEngine.js';

test('ChangeGuard Phase 4: Progressive Deployment and Autonomous Response Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const app = await buildApp();

  const login = async (email: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    return JSON.parse(res.payload).token;
  };

  const adminToken = await login('admin@acme.corp');
  const platformToken = await login('platform@acme.corp');
  const sreToken = await login('sre@acme.corp');
  const devToken = await login('developer@acme.corp');

  await t.test('1. ArgoRolloutsClient & Canary progression stages', async () => {
    const rollout = await argoClient.setTrafficPercentage('checkout-service', 5);
    assert.equal(rollout.currentTrafficPct, 5);
    assert.equal(rollout.replicas.canary, 1);
    assert.equal(rollout.replicas.stable, 9);

    const paused = await argoClient.pauseRollout('checkout-service', 'Error spike detected');
    assert.equal(paused.phase, 'Paused');
    assert.equal(paused.pauseReason, 'Error spike detected');

    const resumed = await argoClient.resumeRollout('checkout-service');
    assert.equal(resumed.phase, 'Progressing');

    const rolledBack = await argoClient.rollbackRollout('checkout-service', 'v2.8.3');
    assert.equal(rolledBack.currentTrafficPct, 0);
    assert.equal(rolledBack.stableRevision, 'v2.8.3');
    assert.equal(rolledBack.replicas.canary, 0);
  });

  await t.test('2. Progressive Canary Promotion via API (5% -> 25% -> 50% -> 100%)', async () => {
    // Read initial deployment
    const initialRes = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(initialRes.statusCode, 200);
    const dep = JSON.parse(initialRes.payload).data;
    assert.equal(dep.id, 'dep-checkout-284');
    assert.equal(dep.currentTrafficPercentage, 5);
    assert.equal(dep.currentStageIndex, 0);

    // RBAC: DEVELOPER cannot promote (requires ADMIN, PLATFORM_ENGINEER, or SRE)
    const unauthorizedPromote = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/promote',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(unauthorizedPromote.statusCode, 403);

    // SRE promotes to Stage 1 (25%)
    const promote1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/promote',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(promote1Res.statusCode, 200);
    const depStage1 = JSON.parse(promote1Res.payload).data;
    assert.equal(depStage1.currentTrafficPercentage, 25);
    assert.equal(depStage1.currentStageIndex, 1);
    assert.equal(depStage1.status, 'MONITORING');

    // SRE promotes to Stage 2 (50%)
    const promote2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/promote',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(promote2Res.statusCode, 200);
    const depStage2 = JSON.parse(promote2Res.payload).data;
    assert.equal(depStage2.currentTrafficPercentage, 50);
    assert.equal(depStage2.currentStageIndex, 2);

    // Operator Pauses rollout
    const pauseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/pause',
      headers: { authorization: `Bearer ${platformToken}` },
      payload: { reason: 'Investigating database pool connection spikes' },
    });
    assert.equal(pauseRes.statusCode, 200);
    const pausedDep = JSON.parse(pauseRes.payload).data;
    assert.equal(pausedDep.status, 'PAUSED');
    assert.equal(pausedDep.health, 'WARNING');
    assert.equal(pausedDep.pausedReason, 'Investigating database pool connection spikes');

    // Operator Resumes rollout
    const resumeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/resume',
      headers: { authorization: `Bearer ${platformToken}` },
    });
    assert.equal(resumeRes.statusCode, 200);
    const resumedDep = JSON.parse(resumeRes.payload).data;
    assert.equal(resumedDep.status, 'MONITORING');
  });

  await t.test('3. Verification Engine: metric comparison & stale telemetry detection', async () => {
    // 1. Healthy baseline evaluation
    prometheusClient.simulateRecovery('dep-checkout-284');
    const healthyEval = await VerificationEngine.evaluateDeployment('dep-checkout-284');
    assert.equal(healthyEval.overallHealth, 'HEALTHY');
    assert.equal(healthyEval.actionRequired, 'NONE');
    assert.equal(healthyEval.signals.every((s) => s.status === 'PASSED'), true);

    // 2. Stale data simulation (>90 seconds without metrics)
    prometheusClient.simulateStaleData('dep-checkout-284');
    const staleEval = await VerificationEngine.evaluateDeployment('dep-checkout-284', 0);
    assert.equal(staleEval.telemetry.isStale, true);
    assert.equal(staleEval.signals.some((s) => s.isStale), true);
    assert.equal(staleEval.actionRequired, 'AUTONOMOUS_PAUSE');
    assert.match(staleEval.breachReason!, /Missing telemetry data/);

    // Reset back to healthy
    prometheusClient.simulateRecovery('dep-checkout-284');
  });

  await t.test('4. Circuit Breaker Simulation & Autonomous Incident Generation', async () => {
    // Simulate error rate spike to 3.8%
    const simRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/simulate-failure',
      headers: { authorization: `Bearer ${sreToken}` },
      payload: { errorRate: 3.8, p95Latency: 420 },
    });
    assert.equal(simRes.statusCode, 200);
    const simPayload = JSON.parse(simRes.payload).data;
    assert.equal(simPayload.deployment.status, 'PAUSED');
    assert.equal(simPayload.deployment.health, 'DEGRADED');

    // Verification check endpoint
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284/verification',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(verifyRes.statusCode, 200);
    const verifyPayload = JSON.parse(verifyRes.payload).data;
    assert.equal(verifyPayload.signals.find((s: any) => s.metricKey === 'http_error_rate_pct')?.status, 'FAILED');

    // Verify incident was automatically created
    const incRes = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(incRes.statusCode, 200);
    const incidents = JSON.parse(incRes.payload).data;
    assert.ok(incidents.length > 0);
    const generatedInc = incidents.find((i: any) => i.relatedDeploymentId === 'dep-checkout-284');
    assert.ok(generatedInc);
    assert.equal(generatedInc.status, 'TRIGGERED');
    assert.match(generatedInc.rootCauseAnalysis.failureContainedBy, /Autonomous Verification Engine/);
  });

  await t.test('5. Fast Autonomous Rollback (<30s) & State Concurrency Handling (409 Conflict)', async () => {
    // Execute rollback
    const rollbackRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/rollback',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        reason: 'Error rate breach: rollback executed immediately to protect users.',
        targetVersion: 'v2.8.3',
      },
    });
    assert.equal(rollbackRes.statusCode, 200);
    const rolledBackDep = JSON.parse(rollbackRes.payload).data;
    assert.equal(rolledBackDep.status, 'ROLLED_BACK');
    assert.equal(rolledBackDep.currentTrafficPercentage, 0);
    assert.equal(rolledBackDep.health, 'HEALTHY');

    // Concurrency conflict test: calling rollback again must return 409 STATE_CONFLICT
    const conflictRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/rollback',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        reason: 'Duplicate concurrent rollback invocation',
      },
    });
    assert.equal(conflictRes.statusCode, 409);
    const conflictPayload = JSON.parse(conflictRes.payload);
    assert.equal(conflictPayload.error.code, 'STATE_CONFLICT');
  });

  await t.test('6. Complete Audit Trail for all Progressive Deployment Actions', async () => {
    const auditRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.statusCode, 200);
    const logs = JSON.parse(auditRes.payload).data;

    const actions = logs.map((l: any) => l.action);
    assert.ok(actions.includes('DEPLOYMENT_PROMOTED'), 'Must include DEPLOYMENT_PROMOTED');
    assert.ok(actions.includes('DEPLOYMENT_PAUSED'), 'Must include DEPLOYMENT_PAUSED');
    assert.ok(actions.includes('SIMULATION_TRIGGERED'), 'Must include SIMULATION_TRIGGERED');
    assert.ok(actions.includes('ROLLBACK_EXECUTED'), 'Must include ROLLBACK_EXECUTED');
  });
});
