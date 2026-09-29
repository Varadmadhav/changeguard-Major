export interface TelemetryPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  metricName: string;
  unit: string;
  current: number;
  baseline: number;
  data: { time: string; current: number; baseline: number; threshold?: number }[];
}

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
  deployments30Days: {
    date: string;
    total: number;
    successful: number;
    failed: number;
    rollbacks: number;
    blocked: number;
  }[];
  riskDistribution: {
    level: string;
    count: number;
    color: string;
  }[];
  serviceFailureRates: {
    serviceName: string;
    failureRate: number;
    deployments: number;
  }[];
}
