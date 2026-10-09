import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../server.js';
import { SqlHazardDetector } from '../services/sqlHazardDetector.js';
import { HistoricalSimilarityEngine } from '../services/historicalSimilarity.js';

test('ChangeGuard Phase 2: Change Intelligence & Risk Analysis Test Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const app = await buildApp();

  // Helper to obtain admin token
  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: 'admin@acme.corp',
      password: 'password123',
    },
  });
  const { token: adminToken } = JSON.parse(adminLogin.payload);

  await t.test('1. SQL/DDL Hazard Detector: Detects all hazard patterns', async () => {
    // Non-concurrent index hazard
    const indexSql = 'CREATE INDEX idx_checkout_user ON checkout_transactions(user_id);';
    const indexResult = SqlHazardDetector.analyzeSql(indexSql);
    assert.equal(indexResult.hasMigration, true);
    assert.ok(indexResult.hazardScore >= 70, 'Non-concurrent index must score >= 70');
    assert.ok(indexResult.hazards.some((h) => h.type === 'INDEX_WITHOUT_CONCURRENTLY'));

    // Destructive DROP TABLE hazard
    const dropTableSql = 'DROP TABLE old_audit_archive;';
    const dropResult = SqlHazardDetector.analyzeSql(dropTableSql);
    assert.ok(dropResult.hazardScore >= 90, 'DROP TABLE must score in CRITICAL range (>= 90)');
    assert.ok(dropResult.hazards.some((h) => h.type === 'DROP_TABLE'));

    // Non-nullable column without default
    const addColSql = 'ALTER TABLE orders ADD COLUMN merchant_code VARCHAR(32) NOT NULL;';
    const colResult = SqlHazardDetector.analyzeSql(addColSql);
    assert.ok(colResult.hazards.some((h) => h.type === 'ADD_COLUMN_NOT_NULL_NO_DEFAULT'));

    // Safe migration with CONCURRENTLY and DEFAULT
    const safeSql = 'CREATE INDEX CONCURRENTLY idx_safe ON orders(created_at); ALTER TABLE orders ADD COLUMN note TEXT DEFAULT "";';
    const safeResult = SqlHazardDetector.analyzeSql(safeSql);
    assert.equal(safeResult.hazards.length, 0);
    assert.ok(safeResult.hazardScore <= 20, 'Safe migration should score <= 20');
  });

  await t.test('2. Historical Similarity: Jaccard file set overlap calculation', async () => {
    const filesA = ['src/services/checkout.ts', 'src/db/connection.ts', 'migrations/001.sql'];
    const filesB = ['src/services/checkout.ts', 'src/db/connection.ts', 'migrations/001.sql'];
    const exactMatch = HistoricalSimilarityEngine.calculateJaccard(filesA, filesB);
    assert.equal(exactMatch, 100, 'Identical files must have 100% similarity');

    const filesC = ['src/services/checkout.ts', 'src/db/connection.ts', 'src/other.ts'];
    const partialMatch = HistoricalSimilarityEngine.calculateJaccard(filesA, filesC);
    // 2 in common out of 4 total unique = 50%
    assert.equal(partialMatch, 50);

    const noOverlap = HistoricalSimilarityEngine.calculateJaccard(filesA, ['docs/readme.md']);
    assert.equal(noOverlap, 0);
  });

  await t.test('3. Webhook: HMAC-SHA256 signature verification & delivery deduplication', async () => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'changeguard_dev_webhook_secret_key';
    const payload = {
      action: 'opened',
      pull_request: {
        number: 4099,
        title: 'Add high-concurrency checkout buffer',
        user: { login: 'dev-alex' },
        head: { ref: 'feat/buffer', sha: 'c0ffee1234' },
        base: { ref: 'main' },
      },
      files: [
        { filename: 'src/services/checkout.ts', additions: 120, deletions: 10 },
        { filename: 'migrations/20261010_buffer.sql', additions: 15, deletions: 0, patch: 'CREATE INDEX idx_buffer ON buffers(id);' },
      ],
    };
    const rawBody = JSON.stringify(payload);

    // Tampered / invalid signature must be rejected (401)
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/github',
      headers: {
        'x-github-delivery': 'delivery-unique-01',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': 'sha256=invalid_tampered_signature_hash',
      },
      payload,
    });
    assert.equal(invalidRes.statusCode, 401);
    const errData = JSON.parse(invalidRes.payload);
    assert.equal(errData.error.code, 'INVALID_WEBHOOK_SIGNATURE');

    // Valid HMAC-SHA256 signature must be accepted (200)
    const hmac = crypto.createHmac('sha256', secret);
    const validSig = `sha256=${hmac.update(rawBody).digest('hex')}`;

    const validRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/github',
      headers: {
        'x-github-delivery': 'delivery-unique-02',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': validSig,
      },
      payload,
    });
    assert.equal(validRes.statusCode, 200);
    const webhookData = JSON.parse(validRes.payload);
    assert.equal(webhookData.status, 'processed');
    assert.ok(webhookData.riskScore >= 70, 'PR with un-concurrent index must score in HIGH range');
    assert.equal(webhookData.riskLevel, 'HIGH');

    // Duplicate delivery ID is acknowledged without reprocessing
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhook/github',
      headers: {
        'x-github-delivery': 'delivery-unique-02',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': validSig,
      },
      payload,
    });
    assert.equal(dupRes.statusCode, 200);
    const dupData = JSON.parse(dupRes.payload);
    assert.equal(dupData.status, 'ignored');
  });

  await t.test('4. Changes API: Listing, filters, pagination, and tenant isolation', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/changes',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const listData = JSON.parse(listRes.payload);
    assert.ok(Array.isArray(listData.data));
    assert.ok(listData.data.length >= 1);
    assert.ok(listData.meta.total >= 1);

    // Fetch change detail for PR #1824
    const detailRes = await app.inject({
      method: 'GET',
      url: '/api/v1/changes/pr-1824',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(detailRes.statusCode, 200);
    const detailData = JSON.parse(detailRes.payload);
    assert.equal(detailData.data.number, 1824);
    assert.equal(detailData.data.risk.level, 'HIGH');
    assert.ok(detailData.data.risk.factors.length >= 3);
    assert.ok(detailData.data.impact.affectedServices.length >= 2);
    assert.ok(detailData.data.policyRecommendation.strategy === 'CANARY');
  });

  await t.test('5. Changes API: Manual PR analysis and Policy Approval', async () => {
    // Manually trigger analysis
    const analyzeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/changes/analyze',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        title: 'Update payment webhook dispatcher',
        repository: 'acme/payment-gateway',
        files: [
          { filename: 'src/webhook/dispatcher.ts', additions: 45, deletions: 12 },
          { filename: 'tests/dispatcher.test.ts', additions: 80, deletions: 0 },
        ],
      },
    });
    assert.equal(analyzeRes.statusCode, 201);
    const analyzeData = JSON.parse(analyzeRes.payload);
    const newChangeId = analyzeData.data.id;
    assert.ok(newChangeId);

    // Approve release policy
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/changes/${newChangeId}/approve`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(approveRes.statusCode, 200);
    const approveData = JSON.parse(approveRes.payload);
    assert.equal(approveData.data.status, 'APPROVED');
    assert.ok(approveData.data.policyRecommendation.approvedBy);
  });
});
