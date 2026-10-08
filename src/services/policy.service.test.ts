import { describe, it, expect } from 'vitest';

import { policyService } from './policy.service';

import { mockChanges } from '../data/mockChanges';

import {
  healthyTelemetry,
  failureTelemetry,
  severeFailureTelemetry,
} from './policy.test-data';

const change = mockChanges.find(
  c => c.number === 1824
);

if (!change) {
  throw new Error('PR #1824 not found');
}

const policy =
  policyService.generatePolicy(change);

describe('ChangeGuard Policy Engine', () => {

  it('should PROMOTE healthy telemetry', () => {
    const decision =
      policyService.evaluateTelemetry(
        healthyTelemetry,
        policy
      );

    expect(decision.decision).toBe('PROMOTE');
    expect(decision.canPromote).toBe(true);
  });

  it('should PAUSE when telemetry violates thresholds', () => {
    const decision =
      policyService.evaluateTelemetry(
        failureTelemetry,
        policy
      );

    expect(decision.decision).toBe('PAUSE');
    expect(decision.canPromote).toBe(false);
  });

  it('should PAUSE severe deployment failures', () => {
    const decision =
      policyService.evaluateTelemetry(
        severeFailureTelemetry,
        policy
      );

    expect(decision.decision).toBe('PAUSE');
    expect(decision.canPromote).toBe(false);
  });

  it('should generate the correct canary stages', () => {
    expect(policy.stages).toEqual([
      5,
      25,
      50,
      100,
    ]);
  });

  it('should use 1.0% error-rate threshold', () => {
    const errorSignal =
      policy.requiredSignals.find(
        signal =>
          signal.name === 'Error Rate'
      );

    expect(errorSignal).toBeDefined();
    expect(errorSignal?.threshold).toBe('1.0%');
  });

});