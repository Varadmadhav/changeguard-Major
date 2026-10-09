import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';
import { db } from '../db/index.js';
import { ServiceDiscoveryJob } from '../jobs/serviceDiscovery.js';
import { ServiceTelemetrySyncJob } from '../jobs/serviceTelemetrySync.js';

test('ChangeGuard Phase 5: Service Reliability, Incidents, and Auditability Test Suite', async (t) => {
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

  await t.test('1. Service Catalog: listing, detail lookup, and filtering', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/services',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    const services = JSON.parse(listRes.payload).data;
    assert.ok(services.length >= 4);

    // Filter by tier
    const tier1Res = await app.inject({
      method: 'GET',
      url: '/api/v1/services?tier=TIER_1',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(tier1Res.statusCode, 200);
    const tier1Services = JSON.parse(tier1Res.payload).data;
    assert.ok(tier1Services.every((s: any) => s.tier === 'TIER_1'));

    // Service detail
    const detailRes = await app.inject({
      method: 'GET',
      url: '/api/v1/services/srv-checkout',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(detailRes.statusCode, 200);
    const srv = JSON.parse(detailRes.payload).data;
    assert.equal(srv.id, 'srv-checkout');
    assert.equal(srv.slug, 'checkout-service');
    assert.ok(srv.dependencies.length > 0);
  });

  await t.test('2. Kubernetes Service Discovery & Telemetry Sync jobs', async () => {
    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/v1/services/sync',
      headers: { authorization: `Bearer ${platformToken}` },
    });
    assert.equal(syncRes.statusCode, 200);
    const result = JSON.parse(syncRes.payload).data;
    assert.ok(result.totalServices >= 5);

    // Verify discovered inventory service
    const invRes = await app.inject({
      method: 'GET',
      url: '/api/v1/services/srv-inventory',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(invRes.statusCode, 200);
    const inv = JSON.parse(invRes.payload).data;
    assert.equal(inv.name, 'Inventory Service');
    assert.equal(inv.tier, 'TIER_2');
  });

  await t.test('3. Topology Impact Graph API: multi-tier node and edge generation', async () => {
    const graphRes = await app.inject({
      method: 'GET',
      url: '/api/v1/impact-graph',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(graphRes.statusCode, 200);
    const graph = JSON.parse(graphRes.payload).data;

    // Check node types present: SERVICE, DATABASE, QUEUE, API_GATEWAY, etc.
    const nodeTypes = new Set(graph.nodes.map((n: any) => n.type));
    assert.ok(nodeTypes.has('SERVICE'), 'Graph must have SERVICE nodes');
    assert.ok(nodeTypes.has('DATABASE'), 'Graph must have DATABASE nodes');
    assert.ok(nodeTypes.has('QUEUE'), 'Graph must have QUEUE nodes');

    // Focused sub-graph for Checkout API
    const subGraphRes = await app.inject({
      method: 'GET',
      url: '/api/v1/impact-graph/srv-checkout',
      headers: { authorization: `Bearer ${sreToken}` },
    });
    assert.equal(subGraphRes.statusCode, 200);
    const subGraph = JSON.parse(subGraphRes.payload).data;
    assert.ok(subGraph.nodes.some((n: any) => n.id === 'srv-checkout'));
    assert.ok(subGraph.nodes.some((n: any) => n.id === 'db-postgres'));
  });

  await t.test('4. Incident Lifecycle: status transitions and RCA updates', async () => {
    // 1. Create a test incident
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${sreToken}` },
      payload: {
        title: 'Downstream Database Lock Contention Spike',
        severity: 'SEV-1',
        affectedServices: ['Checkout API', 'Order Service'],
        relatedDeploymentId: 'dep-checkout-284',
        rca_summary: 'Lock contention caused connection pool exhaustion.',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const created = JSON.parse(createRes.payload).data;
    assert.equal(created.status, 'TRIGGERED');

    // 2. Transition status: TRIGGERED -> INVESTIGATING
    const investRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${created.id}/status`,
      headers: { authorization: `Bearer ${sreToken}` },
      payload: { status: 'INVESTIGATING', comment: 'SRE on-call triaging slow queries.' },
    });
    assert.equal(investRes.statusCode, 200);
    const investigating = JSON.parse(investRes.payload).data;
    assert.equal(investigating.status, 'INVESTIGATING');
    assert.ok(investigating.timeline.some((t: any) => t.title.includes('INVESTIGATING')));

    // 3. Update RCA draft
    const rcaRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${created.id}/rca`,
      headers: { authorization: `Bearer ${sreToken}` },
      payload: {
        summary: 'Root cause identified: missing partial index on pending orders.',
        triggerMechanism: 'High write throughput triggered table sequential scan locks.',
        preventativeRecommendation: 'Add CONCURRENTLY index on checkout_orders(status).',
      },
    });
    assert.equal(rcaRes.statusCode, 200);
    const rcaUpdated = JSON.parse(rcaRes.payload).data;
    assert.equal(rcaUpdated.rootCauseAnalysis.summary, 'Root cause identified: missing partial index on pending orders.');

    // 4. Transition status: INVESTIGATING -> RESOLVED
    const resolveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${created.id}/status`,
      headers: { authorization: `Bearer ${sreToken}` },
      payload: { status: 'RESOLVED', comment: 'Index applied concurrently, pool latency normalized.' },
    });
    assert.equal(resolveRes.statusCode, 200);
    const resolved = JSON.parse(resolveRes.payload).data;
    assert.equal(resolved.status, 'RESOLVED');
    assert.ok(resolved.resolvedAt);
  });

  await t.test('5. Forensic Audit Immutability Guard: Reject UPDATE and DELETE on audit log', async () => {
    // PRD Section 14.5 Acceptance Criteria:
    // "The audit log cannot have rows modified or deleted by the application user"
    await assert.rejects(
      async () => {
        await db.updateAuditEvent();
      },
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'PERMISSION_DENIED');
        assert.match(err.message, /append-only/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await db.deleteAuditEvent();
      },
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'PERMISSION_DENIED');
        assert.match(err.message, /append-only/);
        return true;
      }
    );
  });
});
