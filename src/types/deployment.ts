import { RiskLevel } from './change';

export type DeploymentStatus =
  | 'QUEUED'
  | 'MONITORING'
  | 'PROMOTING'
  | 'PROMOTED'
  | 'PAUSED'
  | 'ROLLING_BACK'
  | 'ROLLED_BACK'
  | 'FAILED'
  | 'ABORTED';

export type RolloutStrategy = 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';

export interface VerificationSignal {
  id: string;
  name: string;
  description: string;
  metricKey: string;
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  currentValue: number;
  unit: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  evaluatedAt: string;
}

export interface DeploymentTimelineEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'SYSTEM';
  actor?: string;
  metadata?: Record<string, any>;
}

export interface LiveTelemetrySnapshot {
  timestamp: string;
  errorRate: number; // %
  p95Latency: number; // ms
  requestsPerMinute: number; // e.g. 12800
  cpuUtilization: number; // %
  memoryUtilization: number; // %
  canaryTrafficPercentage: number; // %
}

export interface Deployment {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  version: string;
  previousVersion: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  status: DeploymentStatus;
  risk: {
    score: number;
    level: RiskLevel;
  };
  strategy: RolloutStrategy;
  currentTrafficPercentage: number; // 0-100
  targetTrafficPercentage: number;
  stages: number[]; // [5, 25, 50, 100]
  currentStageIndex: number;
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  changeId: string;
  changeTitle: string;
  changeAuthor: string;
  repository: string;
  commitHash: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  pausedReason?: string;
  rollbackReason?: string;
  currentTelemetry: {
    errorRate: number;
    p95Latency: number;
    requestsPerMinute: number;
    cpuUtilization: number;
    memoryUtilization: number;
  };
  telemetryHistory: LiveTelemetrySnapshot[];
  signals: VerificationSignal[];
  timeline: DeploymentTimelineEvent[];
}
