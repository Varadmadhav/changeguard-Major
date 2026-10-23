import { DoraMetrics, RiskCalibrationPoint } from '../../types/shared.js';

export interface AnalyticsSummary {
  deploymentRiskAverage: number;
  deploymentRiskTrend: number;
  activeRolloutsCount: number;
  blockedChangesCount: number;
  activeIncidentsCount: number;
  rollbacksCount: number;
  changeFailureRate: number;
  mttdMinutes: number;
  mttrMinutes: number;
  falsePositiveRate: number;
  incidentContainmentRate: number;
  operatorInterventionRate: number;
  deployments30Days: Array<{
    date: string;
    total: number;
    successful: number;
    failed: number;
    rollbacks: number;
    blocked: number;
  }>;
  riskDistribution: Array<{
    level: string;
    count: number;
    color: string;
  }>;
  serviceFailureRates: Array<{
    serviceName: string;
    failureRate: number;
    deployments: number;
  }>;
}

export type DoraMetricsResult = DoraMetrics;
export type RiskCalibrationResult = RiskCalibrationPoint[];
