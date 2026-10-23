import { AppError } from '../../errors/AppError.js';
import { ServicesRepository } from './services.repository.js';
import { ListServicesQuery, ServiceRecord } from './services.types.js';
import { prometheusClient } from '../../services/prometheusClient.js';

export class ServicesService {
  public static async listServices(
    orgId: string,
    filters?: ListServicesQuery
  ): Promise<ServiceRecord[]> {
    return ServicesRepository.list(orgId, filters);
  }

  public static async getServiceById(id: string): Promise<ServiceRecord> {
    const service = await ServicesRepository.findById(id);
    if (!service) {
      throw AppError.notFound(`Service ${id} in catalog`);
    }
    return service;
  }

  public static async syncServices(orgId: string) {
    const existing = await ServicesRepository.list(orgId);

    // K8s simulated discovery
    const clusterDiscovered: ServiceRecord[] = [
      ...existing,
      {
        id: 'srv-inventory',
        organizationId: orgId,
        name: 'Inventory Service',
        slug: 'inventory-service',
        description: 'Stock reservation, warehouse bin allocation, and SKU inventory counts.',
        tier: 'TIER_2',
        owner: {
          team: 'Fulfillment Platform',
          lead: 'David Kim',
          slackChannel: '#inventory-eng',
        },
        repository: 'acme/inventory-service',
        environment: 'PRODUCTION',
        health: 'HEALTHY',
        currentRisk: 'LOW',
        riskScore: 28,
        uptimePercentage: 99.95,
        deploymentsCount: 22,
        activeDeploymentsCount: 0,
        incidentsCount: 0,
        lastDeploymentAt: '5 days ago',
        lastDeploymentVersion: 'v1.4.2',
        telemetry: {
          errorRate: 0.02,
          p95Latency: 85,
          requestsPerSecond: 84,
          cpuPercentage: 35,
          memoryPercentage: 48,
        },
        dependencies: [
          { id: 'db-postgres', name: 'PostgreSQL Primary Cluster', type: 'DATABASE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'PostgreSQL' },
        ],
        dependents: [
          { id: 'srv-checkout', name: 'Checkout API', type: 'SERVICE', direction: 'UPSTREAM', health: 'HEALTHY', protocol: 'gRPC' },
        ],
        tags: ['fulfillment', 'tier-2'],
      },
    ];

    for (const service of clusterDiscovered) {
      await ServicesRepository.upsert(service);
    }

    // Telemetry Sync
    let syncedCount = 0;
    const services = await ServicesRepository.list(orgId);
    for (const service of services) {
      const telemetry = await prometheusClient.getTelemetry(service.id);
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

      await ServicesRepository.upsert(service);
      syncedCount++;
    }

    const allServices = await ServicesRepository.list(orgId);

    return {
      discovered: clusterDiscovered.length,
      synced: syncedCount,
      totalServices: allServices.length,
    };
  }
}
