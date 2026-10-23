export interface PrometheusTelemetry {
  errorRate: number; // percentage (e.g. 0.04)
  p95Latency: number; // ms (e.g. 180)
  requestsPerMinute: number;
  cpuUtilization: number;
  memoryUtilization: number;
  capturedAt: string;
  isStale: boolean;
}

// ponytail: Telemetry provider with live simulation capability allows realistic metric graphs,
// threshold breaches, and recovery without depending on an active Prometheus Thanos cluster.
// Production executes PromQL queries against Prometheus HTTP API.
export class PrometheusClient {
  private customTelemetry: Map<string, Partial<PrometheusTelemetry> & { lastUpdatedMs?: number }> = new Map();

  public async getTelemetry(deploymentId: string): Promise<PrometheusTelemetry> {
    const override = this.customTelemetry.get(deploymentId);
    const now = Date.now();
    const lastUpdated = override?.lastUpdatedMs || now;
    const isStale = now - lastUpdated > 90000; // Stale if older than 90s (PRD Section 12.3)

    if (override && !isStale) {
      return {
        errorRate: override.errorRate ?? 0.04,
        p95Latency: override.p95Latency ?? 180,
        requestsPerMinute: override.requestsPerMinute ?? 12800,
        cpuUtilization: override.cpuUtilization ?? 38,
        memoryUtilization: override.memoryUtilization ?? 54,
        capturedAt: new Date(lastUpdated).toISOString(),
        isStale: false,
      };
    }

    if (isStale) {
      return {
        errorRate: 0.04,
        p95Latency: 180,
        requestsPerMinute: 12000,
        cpuUtilization: 35,
        memoryUtilization: 50,
        capturedAt: new Date(lastUpdated).toISOString(),
        isStale: true,
      };
    }

    // Default healthy canary baseline
    return {
      errorRate: 0.04,
      p95Latency: 185,
      requestsPerMinute: 13400,
      cpuUtilization: 42,
      memoryUtilization: 58,
      capturedAt: new Date().toISOString(),
      isStale: false,
    };
  }

  public simulateMetricBreach(deploymentId: string, errorRate = 3.8, p95Latency = 420): void {
    this.customTelemetry.set(deploymentId, {
      errorRate,
      p95Latency,
      requestsPerMinute: 11200,
      cpuUtilization: 78,
      memoryUtilization: 84,
      lastUpdatedMs: Date.now(),
    });
  }

  public simulateRecovery(deploymentId: string): void {
    this.customTelemetry.set(deploymentId, {
      errorRate: 0.02,
      p95Latency: 165,
      requestsPerMinute: 14200,
      cpuUtilization: 34,
      memoryUtilization: 52,
      lastUpdatedMs: Date.now(),
    });
  }

  public simulateStaleData(deploymentId: string): void {
    this.customTelemetry.set(deploymentId, {
      lastUpdatedMs: Date.now() - 100000, // 100 seconds ago (>90s threshold)
    });
  }
}

export const prometheusClient = new PrometheusClient();
