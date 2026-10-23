import { Deployment, DeploymentStatus } from '../../types/shared.js';

export interface CreateDeploymentBody {
  serviceId: string;
  serviceName: string;
  serviceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  version: string;
  previousVersion: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  changeId: string;
  changeTitle: string;
  changeAuthor: string;
  repository: string;
  commitHash: string;
}

export interface PauseDeploymentBody {
  reason?: string;
}

export interface RollbackDeploymentBody {
  reason?: string;
  targetVersion?: string;
  expectedStatus?: DeploymentStatus;
}

export interface SimulateFailureBody {
  errorRate?: number;
  p95Latency?: number;
}

export type DeploymentRecord = Deployment;
