import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';
import { PolicyEngine } from '../services/policyEngine.js';
import { PolicyRule } from '../types/shared.js';

test('ChangeGuard Phase 3: Release Policies and Governance Test Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const app = await buildApp();

  // Helper login for different roles
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
  const sre1Token = await login('sre@acme.corp');
  const sre2Token = await login('sre2@acme.corp');
  const devToken = await login('developer@acme.corp');

  await t.test('1. PolicyEngine: 10+ rule evaluation test cases covering all operators and actions', async () => {
    // 1. > operator with REQUIRE_HUMAN_APPROVAL
    const r1: PolicyRule = {
      id: 'r1', conditionName: 'High Risk', field: 'risk_score', operator: '>',
      thresholdValue: 75, action: 'REQUIRE_HUMAN_APPROVAL', actionDescription: 'Gate deploy', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r1, { risk_score: 80 }).matched, true);
    assert.equal(PolicyEngine.evaluateRule(r1, { risk_score: 70 }).matched, false);

    // 2. >= operator with REQUIRE_CANARY
    const r2: PolicyRule = {
      id: 'r2', conditionName: 'Canary Threshold', field: 'risk_score', operator: '>=',
      thresholdValue: 60, action: 'REQUIRE_CANARY', actionDescription: 'Mandate canary', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r2, { risk_score: 60 }).matched, true);

    // 3. < operator
    const r3: PolicyRule = {
      id: 'r3', conditionName: 'Low Test Coverage', field: 'test_coverage', operator: '<',
      thresholdValue: 80, action: 'BLOCK_MERGE', actionDescription: 'Block PR', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r3, { test_coverage: 75 }).matched, true);
    assert.equal(PolicyEngine.evaluateRule(r3, { test_coverage: 85 }).matched, false);

    // 4. <= operator
    const r4: PolicyRule = {
      id: 'r4', conditionName: 'Strict Coverage', field: 'test_coverage', operator: '<=',
      thresholdValue: 50, action: 'BLOCK_MERGE', actionDescription: 'Block PR', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r4, { test_coverage: 50 }).matched, true);

    // 5. == operator
    const r5: PolicyRule = {
      id: 'r5', conditionName: 'Migration Check', field: 'has_db_migration', operator: '==',
      thresholdValue: 'true', action: 'REQUIRE_HUMAN_APPROVAL', actionDescription: 'DB review', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r5, { has_db_migration: true }).matched, true);
    assert.equal(PolicyEngine.evaluateRule(r5, { has_db_migration: false }).matched, false);

    // 6. contains operator
    const r6: PolicyRule = {
      id: 'r6', conditionName: 'Tier Check', field: 'service_tier', operator: 'contains',
      thresholdValue: 'TIER_1', action: 'REQUIRE_CANARY', actionDescription: 'Tier 1 check', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r6, { service_tier: 'TIER_1_CORE' }).matched, true);
    assert.equal(PolicyEngine.evaluateRule(r6, { service_tier: 'TIER_2' }).matched, false);

    // 7. PAUSE_ROLLOUT action on error_rate
    const r7: PolicyRule = {
      id: 'r7', conditionName: 'Error Anomaly', field: 'error_rate', operator: '>',
      thresholdValue: 2.0, action: 'PAUSE_ROLLOUT', actionDescription: 'Pause canary', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r7, { error_rate: 2.5 }).matched, true);

    // 8. ROLLBACK_DEPLOYMENT action on error_rate spike
    const r8: PolicyRule = {
      id: 'r8', conditionName: 'Error Spike', field: 'error_rate', operator: '>',
      thresholdValue: 5.0, action: 'ROLLBACK_DEPLOYMENT', actionDescription: 'Rollback canary', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r8, { error_rate: 5.8 }).matched, true);

    // 9. RESTRICT_OFF_PEAK_ONLY action on large churn
    const r9: PolicyRule = {
      id: 'r9', conditionName: 'Large Churn', field: 'change_size_lines', operator: '>',
      thresholdValue: 1000, action: 'RESTRICT_OFF_PEAK_ONLY', actionDescription: 'Deploy off-peak', enabled: true,
    };
    assert.equal(PolicyEngine.evaluateRule(r9, { change_size_lines: 1200 }).matched, true);

    // 10. Disabled rule must not trigger
    const r10: PolicyRule = {
      id: 'r10', conditionName: 'Disabled Rule', field: 'risk_score', operator: '>',
      thresholdValue: 10, action: 'BLOCK_MERGE', actionDescription: 'Disabled', enabled: false,
    };
    assert.equal(PolicyEngine.evaluateRule(r10, { risk_score: 99 }).matched, false);

    // 11. DRY_RUN mode evaluation
    const dryRunOutput = PolicyEngine.evaluatePolicy(
      {
        id: 'pol-dry',
        name: 'Dry Run Policy',
        enforcementMode: 'DRY_RUN',
        rules: [r1, r2],
      },
      { risk_score: 85 }
    );
    assert.equal(dryRunOutput.matchedRules.length, 2);
    assert.equal(dryRunOutput.actions.length, 0, 'DRY_RUN mode must not emit blocking actions');
    assert.equal(dryRunOutput.isApprovalRequired, false);
  });

  await t.test('2. Policy Management: Creation, Versioning, and Audit Trail', async () => {
    // 1. Create a new policy
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/policies',
      headers: { authorization: `Bearer ${platformToken}` },
      payload: {
        name: 'Staging Auto-Promote Policy',
        description: 'Automated verification for staging environment',
        environment: 'STAGING',
        tierScope: 'ALL',
        rules: [
          {
            id: 'rule-stg-1',
            conditionName: 'Low Risk Only',
            field: 'risk_score',
            operator: '<',
            thresholdValue: 40,
            action: 'REQUIRE_CANARY',
            actionDescription: 'Canary rollout',
            enabled: true,
          },
        ],
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createdPolicy = JSON.parse(createRes.payload).data;
    assert.equal(createdPolicy.version, 1);
    const policyId = createdPolicy.id;

    // 2. Update the policy - must increment version to 2
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/policies/${policyId}`,
      headers: { authorization: `Bearer ${platformToken}` },
      payload: {
        description: 'Updated staging verification policy',
        rules: [
          {
            id: 'rule-stg-1',
            conditionName: 'Low Risk Only',
            field: 'risk_score',
            operator: '<',
            thresholdValue: 50, // Modified threshold
            action: 'REQUIRE_CANARY',
            actionDescription: 'Canary rollout',
            enabled: true,
          },
        ],
      },
    });
    assert.equal(updateRes.statusCode, 200);
    const updatedPolicy = JSON.parse(updateRes.payload).data;
    assert.equal(updatedPolicy.version, 2, 'Version must be incremented on update');

    // 3. Verify version history archives the previous version
    const versionsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/policies/${policyId}/versions`,
      headers: { authorization: `Bearer ${platformToken}` },
    });
    assert.equal(versionsRes.statusCode, 200);
    const versionsData = JSON.parse(versionsRes.payload);
    assert.ok(versionsData.data.length >= 1);
    assert.equal(versionsData.data[0].version, 1);
  });

  await t.test('3. Governance Approvals & Two-Person Approval Rule', async () => {
    // 1. Developer role attempting approval gets 403 Forbidden
    const devAttempt = await app.inject({
      method: 'POST',
      url: '/api/v1/changes/pr-1824/governance-approve',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(devAttempt.statusCode, 403);
    const devErr = JSON.parse(devAttempt.payload);
    assert.equal(devErr.error.code, 'FORBIDDEN');

    // 2. SRE single approval on PR #1824 (Risk score 78 < 90) -> Grants full approval
    const sreApprove = await app.inject({
      method: 'POST',
      url: '/api/v1/changes/pr-1824/governance-approve',
      headers: { authorization: `Bearer ${sre1Token}` },
    });
    assert.equal(sreApprove.statusCode, 200);
    const approvedData = JSON.parse(sreApprove.payload);
    assert.equal(approvedData.isFullyApproved, true);
    assert.equal(approvedData.data.status, 'APPROVED');

    // 3. Create a CRITICAL change (Risk score = 95) to test Two-Person Approval
    const critChangeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/changes/analyze',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: 'Drop legacy ledger tables',
        repository: 'acme/payment-gateway',
        files: [{ filename: 'migrations/drop_ledger.sql', additions: 1, deletions: 100 }],
        sqlContent: 'DROP TABLE legacy_ledger;',
      },
    });
    const critChange = JSON.parse(critChangeRes.payload).data;
    assert.ok(critChange.risk.score >= 90, 'DROP TABLE must score in CRITICAL range (>= 90)');

    // 4. First SRE approves -> sets status to AWAITING_SECOND_APPROVAL
    const firstApproval = await app.inject({
      method: 'POST',
      url: `/api/v1/changes/${critChange.id}/governance-approve`,
      headers: { authorization: `Bearer ${sre1Token}` },
    });
    assert.equal(firstApproval.statusCode, 200);
    const firstResult = JSON.parse(firstApproval.payload);
    assert.equal(firstResult.isFullyApproved, false);
    assert.equal(firstResult.data.status, 'AWAITING_SECOND_APPROVAL');

    // 5. Same SRE attempting second approval must be REJECTED (400 TWO_PERSON_RULE_VIOLATION)
    const duplicateApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/changes/${critChange.id}/governance-approve`,
      headers: { authorization: `Bearer ${sre1Token}` },
    });
    assert.equal(duplicateApprove.statusCode, 400);
    const dupErr = JSON.parse(duplicateApprove.payload);
    assert.equal(dupErr.error.code, 'TWO_PERSON_RULE_VIOLATION');

    // 6. Distinct second SRE approves -> Grants full clearance (APPROVED)
    const secondApproval = await app.inject({
      method: 'POST',
      url: `/api/v1/changes/${critChange.id}/governance-approve`,
      headers: { authorization: `Bearer ${sre2Token}` },
    });
    assert.equal(secondApproval.statusCode, 200);
    const secondResult = JSON.parse(secondApproval.payload);
    assert.equal(secondResult.isFullyApproved, true);
    assert.equal(secondResult.data.status, 'APPROVED');
    assert.ok(secondResult.data.policyRecommendation.secondApproverId);
  });

  await t.test('4. Audit Log API: Listing, filtering, and CSV export', async () => {
    // 1. List audit events
    const auditRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.statusCode, 200);
    const auditData = JSON.parse(auditRes.payload);
    assert.ok(Array.isArray(auditData.data));
    assert.ok(auditData.data.length >= 3);
    assert.ok(auditData.meta.total >= 3);

    // 2. Filter audit log by action
    const filterRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-log?action=APPROVAL_GRANTED',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(filterRes.statusCode, 200);
    const filtered = JSON.parse(filterRes.payload).data;
    assert.ok(filtered.every((e: { action: string }) => e.action === 'APPROVAL_GRANTED'));

    // 3. Export audit log as CSV
    const exportRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit-log/export',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(exportRes.statusCode, 200);
    assert.equal(exportRes.headers['content-type'], 'text/csv');
    assert.ok(exportRes.payload.startsWith('"ID","Timestamp","Actor Name"'));
    assert.ok(exportRes.payload.includes('APPROVAL_GRANTED'));
  });
});
