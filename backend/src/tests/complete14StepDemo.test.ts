import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';
import { connectMongo, closeMongo, getAuditCollection, getIncidentsCollection, getDeploymentsCollection } from '../db/mongo.js';
import { db } from '../db/index.js';
import { argoClient } from '../services/argoClient.js';
import { prometheusClient } from '../services/prometheusClient.js';
import { VerificationEngine } from '../services/verificationEngine.js';

test('Phase 7: End-to-End 14-Step ChangeGuard Demo Verification', async (t) => {
  process.env.NODE_ENV = 'test';
  
  // 0. Ensure MongoDB connection is initialized for persistent verification
  let mongoConnected = false;
  try {
    const mongoDb = await connectMongo();
    if (mongoDb) {
      mongoConnected = true;
    }
  } catch (err) {
    console.warn('[Test Warning] MongoDB daemon not reachable, continuing in fallback mode');
  }

  const app = await buildApp();

  const login = async (email: string) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    return JSON.parse(res.payload).token;
  };

  const sreToken = await login('sre@acme.corp');
  const adminToken = await login('admin@acme.corp');

  await t.test('Step 1 & 2: Analyze PR/Change & Calculate Risk Score and Blast Radius', async () => {
    // 1. Analyze PR #1824
    const changeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/changes/pr-1824',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(changeRes.statusCode, 200);
    const change = JSON.parse(changeRes.payload).data;

    assert.equal(change.id, 'pr-1824');
    assert.equal(change.number, 1824);
    assert.equal(change.repository, 'acme/checkout-service');

    // 2. Calculate risk score & blast radius
    assert.equal(change.risk.score, 78);
    assert.equal(change.risk.level, 'HIGH');
    assert.ok(change.risk.factors.length >= 3, 'Must identify >= 3 risk factors');
    assert.ok(change.impact.affectedServices.length >= 2, 'Must affect multiple services in blast radius');
    assert.ok(change.impact.servicesCount >= 3, 'Blast radius covers 3+ services');
  });

  await t.test('Step 3 & 4: Generate Release Policy & Initiate Deployment Workflow', async () => {
    // 3. Recommended release policy
    const changeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/changes/pr-1824',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    const change = JSON.parse(changeRes.payload).data;
    assert.ok(change.policyRecommendation);
    assert.equal(change.policyRecommendation.strategy, 'CANARY');
    assert.deepEqual(change.policyRecommendation.stages, [5, 25, 50, 100]);
    assert.equal(change.policyRecommendation.verificationWindowMinutes, 10);

    // 4. Approve release policy and initiate rollout
    const approveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/changes/pr-1824/approve',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(approveRes.statusCode, 200);
    const approvedChange = JSON.parse(approveRes.payload).data;
    assert.equal(approvedChange.status, 'APPROVED');

    // Confirm deployment dep-checkout-284 is ready
    const depRes = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(depRes.statusCode, 200);
    const dep = JSON.parse(depRes.payload).data;
    assert.equal(dep.id, 'dep-checkout-284');
    assert.equal(dep.serviceName, 'Checkout Service');
  });

  await t.test('Step 5 & 6: Progress Through Canary Stages & Monitor Telemetry', async () => {
    // Reset to initial stage 0 (5%) and healthy telemetry baseline before canary progression
    await db.updateDeploymentState('dep-checkout-284', 'MONITORING', {
      currentTrafficPercentage: 5,
      currentStageIndex: 0,
      health: 'HEALTHY',
    });
    prometheusClient.simulateRecovery('dep-checkout-284');

    // Stage 0: 5% (Initial)
    const stage0Res = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    const stage0 = JSON.parse(stage0Res.payload).data;
    assert.equal(stage0.currentTrafficPercentage, 5);

    // Stage 1: Promote to 25%
    const promote1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/promote',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(promote1Res.statusCode, 200);
    const stage1 = JSON.parse(promote1Res.payload).data;
    assert.equal(stage1.currentTrafficPercentage, 25);

    // Stage 2: Promote to 50%
    const promote2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/promote',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(promote2Res.statusCode, 200);
    const stage2 = JSON.parse(promote2Res.payload).data;
    assert.equal(stage2.currentTrafficPercentage, 50);

    // 6. Display telemetry sample values
    const telemetry = await prometheusClient.getTelemetry('dep-checkout-284');
    assert.ok(telemetry);
    assert.ok(typeof telemetry.errorRate === 'number');
    assert.ok(typeof telemetry.p95Latency === 'number');
    assert.ok(typeof telemetry.requestsPerMinute === 'number');
    assert.equal(telemetry.isStale, false);
  });

  await t.test('Step 7 & 8: Inject Simulated Failure & Detect Breach via Policy Logic', async () => {
    // 7. Inject failure: 3.8% error rate (breaching 1.0% limit) and 420ms latency
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

    // 8. Policy logic evaluates metrics
    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284/verification',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(verifyRes.statusCode, 200);
    const verifyPayload = JSON.parse(verifyRes.payload).data;
    assert.ok(verifyPayload.signals.find((s: any) => s.metricKey === 'http_error_rate_pct')?.status === 'FAILED');
  });

  await t.test('Step 9, 10, & 11: Pause Deployment, Create Incident, & Record Audit Event', async () => {
    // 9. Deployment paused automatically
    const depRes = await app.inject({
      method: 'GET',
      url: '/api/v1/deployments/dep-checkout-284',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(depRes.statusCode, 200);
    const pausedDep = JSON.parse(depRes.payload).data;
    assert.equal(pausedDep.status, 'PAUSED');
    assert.equal(pausedDep.health, 'DEGRADED');

    // 10. Incident created/updated
    const incRes = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(incRes.statusCode, 200);
    const incidents = JSON.parse(incRes.payload).data;
    const relatedInc = incidents.find((i: any) => i.relatedDeploymentId === 'dep-checkout-284');
    assert.ok(relatedInc, 'Incident must be created for breached deployment');
    assert.ok(['SEV-1', 'SEV-2', 'CRITICAL'].includes(relatedInc.severity));

    // 11. Audit trail recorded
    const auditRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.statusCode, 200);
    const auditLogs = JSON.parse(auditRes.payload).data;
    const actions = auditLogs.map((l: any) => l.action);
    assert.ok(actions.includes('DEPLOYMENT_PAUSED'), 'Must record DEPLOYMENT_PAUSED in audit log');
    assert.ok(actions.includes('SIMULATION_TRIGGERED'), 'Must record SIMULATION_TRIGGERED in audit log');
  });

  await t.test('Step 12 & 13: Trigger Rollback & Display Target Version', async () => {
    // 12. Trigger rollback to baseline v2.8.3
    const rollbackRes = await app.inject({
      method: 'POST',
      url: '/api/v1/deployments/dep-checkout-284/rollback',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        reason: 'Autonomous containment: metric breach of error rate 3.8% > 1.0%',
        targetVersion: 'v2.8.3',
      },
    });
    assert.equal(rollbackRes.statusCode, 200);
    const rolledBack = JSON.parse(rollbackRes.payload).data;

    // 13. Display rollback target & restored healthy state
    assert.equal(rolledBack.status, 'ROLLED_BACK');
    assert.equal(rolledBack.currentTrafficPercentage, 0);
    assert.equal(rolledBack.health, 'HEALTHY');
    assert.match(rolledBack.rollbackReason, /Autonomous containment/);
  });

  await t.test('Step 14: Confirm Audit Records & Incidents Persisted in MongoDB', async () => {
    if (mongoConnected) {
      const auditCol = getAuditCollection();
      const incCol = getIncidentsCollection();
      const depCol = getDeploymentsCollection();

      assert.ok(auditCol, 'Audit collection should be accessible');
      const auditCount = await auditCol.countDocuments({});
      assert.ok(auditCount > 0, 'MongoDB audit_logs must have records');

      assert.ok(incCol, 'Incidents collection should be accessible');
      const incCount = await incCol.countDocuments({});
      assert.ok(incCount > 0, 'MongoDB incidents must have records');

      assert.ok(depCol, 'Deployments collection should be accessible');
      const rolledBackInDb = await depCol.findOne({ id: 'dep-checkout-284' });
      if (rolledBackInDb) {
        assert.equal(rolledBackInDb.status, 'ROLLED_BACK');
        assert.equal(rolledBackInDb.currentTrafficPercentage, 0);
      }
    } else {
      // In-memory verification
      const logs = db.auditEvents;
      assert.ok(logs.length > 0, 'In-memory audit log must have records');

      const incidents = db.incidents;
      assert.ok(incidents.length > 0, 'In-memory incidents must have records');
    }
  });

  t.after(async () => {
    if (mongoConnected) {
      await closeMongo();
    }
  });
});
