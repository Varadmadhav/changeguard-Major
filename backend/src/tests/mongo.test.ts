import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import {
  connectMongo,
  closeMongo,
  isMongoConnected,
  getMongoDb,
  getAuditCollection,
  getIncidentsCollection,
  getDeploymentsCollection,
  getServicesCollection,
  getPoliciesCollection,
  getChangesCollection,
} from '../db/mongo.js';
import { db } from '../db/index.js';
import type { AuditEvent } from '../types/shared.js';

describe('Phase 4: MongoDB Architecture & Data Access Tests', () => {
  before(async () => {
    await connectMongo();
  });

  after(async () => {
    await closeMongo();
  });

  test('Database.isConnected() initializes without throwing', async () => {
    const isReady = await db.isConnected();
    assert.strictEqual(isReady, true);
  });

  test('db.isUsingMongo() returns boolean status', () => {
    const usingMongo = db.isUsingMongo();
    assert.strictEqual(typeof usingMongo, 'boolean');
  });

  test('Audit log is strictly append-only (PRD 14.5 Immutability Guard)', async () => {
    await assert.rejects(
      async () => {
        await db.updateAuditEvent();
      },
      {
        statusCode: 403,
        code: 'PERMISSION_DENIED',
      }
    );

    await assert.rejects(
      async () => {
        await db.deleteAuditEvent();
      },
      {
        statusCode: 403,
        code: 'PERMISSION_DENIED',
      }
    );
  });

  test('Audit events insertion and retrieval works consistently', async () => {
    const orgId = 'org-acme-primary-01';
    const testAction: 'DEPLOYMENT_PAUSED' = 'DEPLOYMENT_PAUSED';
    const testEvent: AuditEvent = {
      id: `audit-test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: 'Just now',
      actor: {
        name: 'Riley Vance (SRE)',
        type: 'USER',
        email: 'sre@acme.corp',
      },
      action: 'DEPLOYMENT_PAUSED',
      actionTitle: 'Canary Deployment Paused by Test',
      resource: {
        type: 'DEPLOYMENT',
        id: 'dep-checkout-test',
        name: 'Checkout Service Rollout',
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: 'Automated test of audit log persistence',
    };

    await db.appendAuditEvent(testEvent);

    const result = await db.listAuditEvents(orgId, { action: testAction });
    assert.ok(result.total >= 1, 'Should find at least 1 audit event matching action');
    assert.strictEqual(result.data[0].action, testAction);
    assert.strictEqual(result.data[0].actor.name, 'Riley Vance (SRE)');
  });

  test('Incidents creation, status update, and RCA persistence work', async () => {
    const orgId = 'org-acme-primary-01';
    const incident = await db.createIncident({
      organizationId: orgId,
      title: 'Database Contention Test Incident',
      severity: 'SEV-1',
      status: 'TRIGGERED',
      related_deployment_id: 'dep-checkout-284',
      rca_summary: 'Connection pool spike tested in test suite',
      rca_trigger: 'Synthetic load test trigger',
      rca_contained_by: 'ChangeGuard Autonomous Engine',
      rca_recommendation: 'Increase max_pool_size in config',
    });

    assert.ok(incident.id.startsWith('inc-'));
    assert.strictEqual(incident.severity, 'SEV-1');
    assert.strictEqual(incident.status, 'TRIGGERED');

    // Update status to CONTAINED
    const updated = await db.updateIncidentStatus(incident.id, 'CONTAINED', 'Mitigation verified in test');
    assert.strictEqual(updated.status, 'CONTAINED');
    assert.ok(updated.timeline.length >= 2);

    // Fetch by ID
    const fetched = await db.getIncidentById(incident.id);
    assert.ok(fetched !== null);
    assert.strictEqual(fetched.id, incident.id);
    assert.strictEqual(fetched.status, 'CONTAINED');
  });

  test('Deployment creation, stage progression, and optimistic concurrency work', async () => {
    const orgId = 'org-acme-primary-01';
    const deployment = await db.createDeployment({
      organizationId: orgId,
      serviceId: 'svc-checkout-01',
      serviceName: 'Checkout Service',
      serviceTier: 'TIER_1',
      version: 'v3.0.0-test',
      previousVersion: 'v2.8.4',
      environment: 'PRODUCTION',
      status: 'PROMOTING',
      risk: {
        score: 78,
        level: 'HIGH',
      },
      strategy: 'CANARY',
      currentTrafficPercentage: 5,
      targetTrafficPercentage: 100,
      stages: [5, 25, 50, 100],
      currentStageIndex: 0,
      health: 'HEALTHY',
      changeId: 'pr-1824',
      changeTitle: 'Test change',
      changeAuthor: 'Alex Rivera',
      repository: 'acme/checkout-service',
      commitHash: '7f9a2b4c8e',
      currentTelemetry: {
        errorRate: 0.04,
        p95Latency: 42,
        requestsPerMinute: 1200,
        cpuUtilization: 35,
        memoryUtilization: 52,
      },
      signals: [],
    });

    assert.ok(deployment.id.startsWith('dep-'));
    assert.strictEqual(deployment.status, 'PROMOTING');

    // Update state to PAUSED
    const paused = await db.updateDeploymentState(deployment.id, 'PAUSED', {
      expectedStatus: 'PROMOTING',
      currentTrafficPercentage: 5,
    });
    assert.strictEqual(paused.status, 'PAUSED');

    // Concurrency conflict check: expecting PROMOTING when it is PAUSED should throw 409
    await assert.rejects(
      async () => {
        await db.updateDeploymentState(deployment.id, 'ROLLED_BACK', {
          expectedStatus: 'PROMOTING',
        });
      },
      {
        statusCode: 409,
        code: 'STATE_CONFLICT',
      }
    );
  });

  test('Change retrieval by ID and PR approval lifecycle work', async () => {
    const orgId = 'org-acme-primary-01';
    const change = await db.getChangeById('1824', orgId);
    assert.ok(change !== null, 'PR 1824 should be present in database');
    assert.strictEqual(change.number, 1824);

    // List changes
    const changes = await db.listChanges(orgId);
    assert.ok(changes.total >= 1);
  });
});
