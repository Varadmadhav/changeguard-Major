import type { TelemetryInput } from './policy.service';

export const healthyTelemetry: TelemetryInput = {
  deploymentId: 'dep-checkout-284',
  errorRate: 0.42,
  p95Latency: 182,
  checkoutSuccessRate: 99.8,
  dbConnectionSaturation: 38,
};

export const failureTelemetry: TelemetryInput = {
  deploymentId: 'dep-checkout-284',
  errorRate: 3.7,
  p95Latency: 840,
  checkoutSuccessRate: 96.8,
  dbConnectionSaturation: 82,
};

export const severeFailureTelemetry: TelemetryInput = {
  deploymentId: 'dep-checkout-284',
  errorRate: 7.5,
  p95Latency: 1200,
  checkoutSuccessRate: 91,
  dbConnectionSaturation: 94,
};