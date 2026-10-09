import { db } from '../db/index.js';
import { Service } from '../types/shared.js';

// ponytail: Kubernetes service discovery scanner simulates live discovery from cluster API
// (e.g. apps/v1 Deployments, core/v1 Services, networking.k8s.io Ingresses)
// and synchronizes discovered topology into the persistent service catalog.
export class ServiceDiscoveryJob {
  public static async run(orgId = 'org-acme-primary-01'): Promise<{ discoveredCount: number }> {
    const existing = await db.listServices(orgId);

    // Scan cluster services (default seed incorporates standard microservices architecture)
    const clusterDiscovered: Service[] = [
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
      await db.upsertService(service);
    }

    return { discoveredCount: clusterDiscovered.length };
  }
}
