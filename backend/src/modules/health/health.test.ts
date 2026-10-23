import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { HealthService } from './health.service.js';

describe('Health Module Unit Tests', () => {
  test('HealthService.getHealth returns healthy status', () => {
    const health = HealthService.getHealth();
    assert.equal(health.status, 'healthy');
    assert.equal(health.version, '1.0.0');
    assert.ok(health.uptimeSeconds >= 0);
  });
});
