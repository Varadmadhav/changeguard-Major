import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';
import { NotificationDispatcher } from '../services/notificationDispatcher.js';

test('ChangeGuard Phase 6: Integrations, Analytics, and Production Readiness Test Suite', async (t) => {
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
  const devToken = await login('developer@acme.corp');

  await t.test('1. DORA Metrics & Analytics Summary Calculation', async () => {
    // 1. DORA metrics endpoint
    const doraRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/dora?periodDays=30',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(doraRes.statusCode, 200);
    const dora = JSON.parse(doraRes.payload).data;
    assert.ok(typeof dora.changeFailureRatePercentage === 'number');
    assert.ok(typeof dora.deploymentFrequencyPerDay === 'number');
    assert.ok(typeof dora.meanTimeToRecoveryMinutes === 'number');
    assert.ok(['ELITE', 'HIGH', 'MEDIUM', 'LOW'].includes(dora.rating));

    // 2. Analytics Executive Summary
    const summaryRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/summary',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(summaryRes.statusCode, 200);
    const summary = JSON.parse(summaryRes.payload).data;
    assert.ok(summary.deploymentRiskAverage > 0);
    assert.ok(summary.riskDistribution.length >= 4);
    assert.ok(summary.deployments30Days.length > 0);

    // 3. Risk Calibration Scatter
    const calibRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/risk-calibration',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(calibRes.statusCode, 200);
    const calibPoints = JSON.parse(calibRes.payload).data;
    assert.ok(Array.isArray(calibPoints));
  });

  await t.test('2. Settings API: persistence across all sections & RBAC', async () => {
    // Read initial settings
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    const settings = JSON.parse(getRes.payload).data;
    assert.ok(settings.general);
    assert.ok(settings.security);
    assert.ok(settings.notifications);
    assert.ok(settings.ai);

    // RBAC: DEVELOPER cannot update settings
    const unauthorizedPatch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/general',
      headers: { authorization: `Bearer ${devToken}` },
      payload: { riskScoreThreshold: 85 },
    });
    assert.equal(unauthorizedPatch.statusCode, 403);

    // PLATFORM_ENGINEER updates general settings
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/general',
      headers: { authorization: `Bearer ${platformToken}` },
      payload: { riskScoreThreshold: 85, orgName: 'Acme Global Platform' },
    });
    assert.equal(patchRes.statusCode, 200);
    const updated = JSON.parse(patchRes.payload).data;
    assert.equal(updated.general.riskScoreThreshold, 85);
    assert.equal(updated.general.orgName, 'Acme Global Platform');

    // Update notification settings
    const patchNotif = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/notifications',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { slackAlertChannel: '#changeguard-alerts-live' },
    });
    assert.equal(patchNotif.statusCode, 200);
    assert.equal(JSON.parse(patchNotif.payload).data.notifications.slackAlertChannel, '#changeguard-alerts-live');

    // Invalid section returns 400
    const invalidSection = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/unknownSection',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    });
    assert.equal(invalidSection.statusCode, 400);
  });

  await t.test('3. Integrations Management & Connectivity Testing', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations',
      headers: { authorization: `Bearer ${devToken}` },
    });
    assert.equal(listRes.statusCode, 200);
    const integrations = JSON.parse(listRes.payload).data;
    assert.ok(integrations.length >= 4);

    // Update integration config
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/integrations/int-github',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { connectedRepositoriesOrClusters: 18 },
    });
    assert.equal(patchRes.statusCode, 200);
    assert.equal(JSON.parse(patchRes.payload).data.connectedRepositoriesOrClusters, 18);

    // Test connectivity
    const testRes = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/int-github/test',
      headers: { authorization: `Bearer ${platformToken}` },
    });
    assert.equal(testRes.statusCode, 200);
    assert.equal(JSON.parse(testRes.payload).data.connected, true);
  });

  await t.test('4. Notification Dispatcher on Deployment Events', async () => {
    const dispatchResult = await NotificationDispatcher.dispatch('org-acme-primary-01', {
      title: 'CRITICAL: Autonomous Rollback Executed',
      message: 'Checkout API canary reverted to v2.8.3 following error rate spike.',
      severity: 'CRITICAL',
      serviceName: 'Checkout API',
      deploymentId: 'dep-checkout-284',
    });

    assert.equal(dispatchResult.delivered, true);
    assert.equal(dispatchResult.slackDelivered, true);
    assert.ok(NotificationDispatcher.dispatchedNotifications.length > 0);
    const latest = NotificationDispatcher.dispatchedNotifications[0];
    assert.equal(latest.severity, 'CRITICAL');
    assert.match(latest.message, /Checkout API/);
  });

  await t.test('5. Enterprise SAML SSO Authentication Callback Flow', async () => {
    // Mock base64 encoded SAML assertion for Riley Vance (SRE)
    const mockAssertion = Buffer.from('<Assertion><Subject><NameID>sre@acme.corp</NameID></Subject></Assertion>').toString('base64');

    const ssoRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sso/callback',
      payload: { SAMLResponse: mockAssertion },
    });

    assert.equal(ssoRes.statusCode, 200);
    const ssoPayload = JSON.parse(ssoRes.payload);
    assert.ok(ssoPayload.token);
    assert.equal(ssoPayload.user.email, 'sre@acme.corp');

    // Verify token authenticates to /api/v1/auth/me
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${ssoPayload.token}` },
    });
    assert.equal(meRes.statusCode, 200);
    assert.equal(JSON.parse(meRes.payload).data.email, 'sre@acme.corp');
  });
});
