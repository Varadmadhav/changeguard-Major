import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../server.js';

test('ChangeGuard Phase 1 Test Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const app = await buildApp();

  await t.test('1. Health and Ready Probes', async () => {
    const healthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });
    assert.equal(healthRes.statusCode, 200);
    const healthData = JSON.parse(healthRes.payload);
    assert.equal(healthData.status, 'healthy');

    const readyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/ready',
    });
    assert.equal(readyRes.statusCode, 200);
    const readyData = JSON.parse(readyRes.payload);
    assert.equal(readyData.status, 'ready');
  });

  await t.test('2. Authentication: Login with seeded users & JWT validation', async () => {
    // Valid Admin login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@acme.corp',
        password: 'password123',
      },
    });
    assert.equal(loginRes.statusCode, 200);
    const loginData = JSON.parse(loginRes.payload);
    assert.ok(loginData.token, 'Token must be returned');
    assert.equal(loginData.user.role, 'ADMIN');
    assert.equal(loginData.user.email, 'admin@acme.corp');

    // GET /api/v1/auth/me with JWT
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginData.token}`,
      },
    });
    assert.equal(meRes.statusCode, 200);
    const meData = JSON.parse(meRes.payload);
    assert.equal(meData.data.email, 'admin@acme.corp');
    assert.ok(Array.isArray(meData.permissions));

    // Invalid credentials
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@acme.corp',
        password: 'wrong_password',
      },
    });
    assert.equal(invalidRes.statusCode, 401);
    const invalidData = JSON.parse(invalidRes.payload);
    assert.equal(invalidData.error.code, 'INVALID_CREDENTIALS');
    assert.ok(invalidData.error.requestId, 'requestId must be present');
  });

  await t.test('3. Protection: Unauthorized access without token returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });
    assert.equal(res.statusCode, 401);
    const data = JSON.parse(res.payload);
    assert.ok(data.error);
    assert.equal(data.error.code, 'UNAUTHORIZED');
    assert.ok(data.error.requestId);
  });

  await t.test('4. RBAC: Developer role attempting GET /api/v1/team returns 403', async () => {
    // Login as developer
    const devLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'developer@acme.corp',
        password: 'password123',
      },
    });
    assert.equal(devLogin.statusCode, 200);
    const { token: devToken } = JSON.parse(devLogin.payload);

    // Attempt GET /api/v1/team (Admin / Platform Eng only)
    const teamRes = await app.inject({
      method: 'GET',
      url: '/api/v1/team',
      headers: {
        authorization: `Bearer ${devToken}`,
      },
    });
    assert.equal(teamRes.statusCode, 403);
    const teamData = JSON.parse(teamRes.payload);
    assert.equal(teamData.error.code, 'FORBIDDEN');
    assert.ok(teamData.error.message.includes('DEVELOPER'));
    assert.ok(teamData.error.requestId);
  });

  await t.test('5. RBAC: Check all 5 roles on /api/v1/team', async () => {
    const rolesToTest = [
      { email: 'admin@acme.corp', expectedStatus: 200 },
      { email: 'platform@acme.corp', expectedStatus: 200 },
      { email: 'sre@acme.corp', expectedStatus: 403 },
      { email: 'developer@acme.corp', expectedStatus: 403 },
      { email: 'approver@acme.corp', expectedStatus: 403 },
    ];

    for (const testRole of rolesToTest) {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testRole.email,
          password: 'password123',
        },
      });
      assert.equal(loginRes.statusCode, 200);
      const { token } = JSON.parse(loginRes.payload);

      const teamRes = await app.inject({
        method: 'GET',
        url: '/api/v1/team',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      assert.equal(
        teamRes.statusCode,
        testRole.expectedStatus,
        `Role for ${testRole.email} should return ${testRole.expectedStatus}`
      );
    }
  });

  await t.test('6. API Key: Authentication with X-API-Key header', async () => {
    // Valid seeded demo key
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/team',
      headers: {
        'x-api-key': 'cg_live_demo123456789',
      },
    });
    assert.equal(res.statusCode, 200);

    // Invalid API key
    const invalidKeyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/team',
      headers: {
        'x-api-key': 'cg_live_invalid_fake_key_999',
      },
    });
    assert.equal(invalidKeyRes.statusCode, 401);
    const invalidData = JSON.parse(invalidKeyRes.payload);
    assert.equal(invalidData.error.code, 'INVALID_API_KEY');
    assert.ok(invalidData.error.requestId);
  });

  await t.test('7. API Key Issuance, Masking, and Revocation', async () => {
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@acme.corp',
        password: 'password123',
      },
    });
    const { token: adminToken } = JSON.parse(adminLogin.payload);

    // Create new API key
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/settings/api-keys',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'GitHub Webhook Key',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createdData = JSON.parse(createRes.payload);
    const rawSecret = createdData.data.secret;
    const keyId = createdData.data.key.id;
    assert.ok(rawSecret.startsWith('cg_live_'), 'Raw secret returned once');

    // Authenticate with new key
    const keyAuthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/team',
      headers: {
        'x-api-key': rawSecret,
      },
    });
    assert.equal(keyAuthRes.statusCode, 200);

    // Revoke key
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/settings/api-keys/${keyId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(revokeRes.statusCode, 200);

    // Authenticate with revoked key - must fail
    const revokedAuthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/team',
      headers: {
        'x-api-key': rawSecret,
      },
    });
    assert.equal(revokedAuthRes.statusCode, 401);
  });

  await t.test('8. Logout endpoint', async () => {
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@acme.corp',
        password: 'password123',
      },
    });
    const { token } = JSON.parse(adminLogin.payload);

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    assert.equal(logoutRes.statusCode, 200);
    const logoutData = JSON.parse(logoutRes.payload);
    assert.equal(logoutData.success, true);
  });
});
