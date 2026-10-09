import { db } from '../db/index.js';
import { prometheusClient } from '../services/prometheusClient.js';

// ponytail: Telemetry sync reconciles Prometheus metrics into service catalog health status
export class ServiceTelemetrySyncJob {
  public static async run(orgId = 'org-acme-primary-01'): Promise<{ updatedCount: number }> {
    const services = await db.listServices(orgId);
    let count = 0;

    for (const service of services) {
      // Query metrics for service deployment
      const telemetry = await prometheusClient.getTelemetry(service.id);

      // Determine health status based on metric thresholds
      let health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
      if (telemetry.errorRate >= 5.0 || telemetry.p95Latency >= 1000) {
        health = 'CRITICAL';
      } else if (telemetry.errorRate >= 2.0 || telemetry.p95Latency >= 500) {
        health = 'DEGRADED';
      } else if (telemetry.errorRate >= 1.0 || telemetry.p95Latency >= 300) {
        health = 'WARNING';
      }

      service.health = health;
      service.telemetry.errorRate = telemetry.errorRate;
      service.telemetry.p95Latency = telemetry.p95Latency;
      service.telemetry.cpuPercentage = telemetry.cpuUtilization;
      service.telemetry.memoryPercentage = telemetry.memoryUtilization;

      await db.upsertService(service);
      count++;
    }

    return { updatedCount: count };
  }
}
