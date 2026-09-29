import { RiskLevel } from './change';

export interface ServiceDependencyNode {
  id: string;
  name: string;
  type: 'SERVICE' | 'DATABASE' | 'QUEUE' | 'API_GATEWAY' | 'CACHE' | 'THIRD_PARTY';
  direction: 'UPSTREAM' | 'DOWNSTREAM';
  health: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  protocol: 'gRPC' | 'REST' | 'PostgreSQL' | 'Kafka' | 'Redis';
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  owner: {
    team: string;
    lead: string;
    slackChannel: string;
  };
  repository: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  currentRisk: RiskLevel;
  riskScore: number;
  uptimePercentage: number;
  deploymentsCount: number;
  activeDeploymentsCount: number;
  incidentsCount: number;
  lastDeploymentAt: string;
  lastDeploymentVersion: string;
  telemetry: {
    errorRate: number;
    p95Latency: number;
    requestsPerSecond: number;
    cpuPercentage: number;
    memoryPercentage: number;
  };
  dependencies: ServiceDependencyNode[];
  dependents: ServiceDependencyNode[];
  tags: string[];
}
