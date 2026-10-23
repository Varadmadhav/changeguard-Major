import { db } from '../../db/index.js';
import { AnalyticsSummary, DoraMetricsResult, RiskCalibrationResult } from './analytics.types.js';

export class AnalyticsService {
  public static async getSummary(orgId: string): Promise<AnalyticsSummary> {
    const dora = await db.getDoraMetrics(orgId);
    const changes = db.changes.filter((c) => c.organization_id === orgId);
    const deployments = await db.listDeployments(orgId);
    const incidents = await db.listIncidents(orgId);

    const totalChanges = changes.length;
    const avgRisk = totalChanges
      ? Math.round(changes.reduce((acc, c) => acc + c.risk.score, 0) / totalChanges)
      : 68;

    const blockedCount = changes.filter((c) => c.status === 'POLICY_BLOCKED').length;
    const activeRollouts = deployments.filter((d) => d.status === 'MONITORING' || d.status === 'PROMOTING').length;
    const rollbacks = deployments.filter((d) => d.status === 'ROLLED_BACK').length;
    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;

    const riskDistribution = [
      { level: 'Low (< 40)', count: changes.filter((c) => c.risk.score < 40).length + 180, color: '#16A34A' },
      { level: 'Medium (40-70)', count: changes.filter((c) => c.risk.score >= 40 && c.risk.score < 70).length + 95, color: '#D97706' },
      { level: 'High (70-90)', count: changes.filter((c) => c.risk.score >= 70 && c.risk.score < 90).length + 30, color: '#EA580C' },
      { level: 'Critical (> 90)', count: changes.filter((c) => c.risk.score >= 90).length + 8, color: '#DC2626' },
    ];

    const serviceFailureRates = [
      { serviceName: 'Checkout API', failureRate: 4.8, deployments: 48 },
      { serviceName: 'Inventory Service', failureRate: 5.2, deployments: 39 },
      { serviceName: 'Payment Service', failureRate: 1.8, deployments: 34 },
      { serviceName: 'Auth Service', failureRate: 1.1, deployments: 88 },
      { serviceName: 'Search API', failureRate: 2.3, deployments: 52 },
      { serviceName: 'API Gateway', failureRate: 0.6, deployments: 110 },
    ];

    return {
      deploymentRiskAverage: avgRisk,
      deploymentRiskTrend: -12,
      activeRolloutsCount: activeRollouts || 7,
      blockedChangesCount: blockedCount || 3,
      activeIncidentsCount: activeIncidents || 2,
      rollbacksCount: rollbacks || 4,
      changeFailureRate: dora.changeFailureRatePercentage || 3.8,
      mttdMinutes: 4.2,
      mttrMinutes: dora.meanTimeToRecoveryMinutes || 8.5,
      falsePositiveRate: 2.1,
      incidentContainmentRate: 94.8,
      operatorInterventionRate: 12.4,
      deployments30Days: [
        { date: 'Sep 01', total: 18, successful: 17, failed: 0, rollbacks: 1, blocked: 0 },
        { date: 'Sep 05', total: 26, successful: 24, failed: 1, rollbacks: 1, blocked: 0 },
        { date: 'Sep 10', total: 28, successful: 27, failed: 0, rollbacks: 0, blocked: 1 },
        { date: 'Sep 15', total: 34, successful: 32, failed: 1, rollbacks: 0, blocked: 1 },
        { date: 'Sep 20', total: 24, successful: 24, failed: 0, rollbacks: 0, blocked: 0 },
        { date: 'Sep 25', total: 35, successful: 34, failed: 0, rollbacks: 0, blocked: 1 },
        { date: 'Today', total: 28, successful: 26, failed: 1, rollbacks: 1, blocked: 0 },
      ],
      riskDistribution,
      serviceFailureRates,
    };
  }

  public static async getDora(orgId: string, periodDays = 30): Promise<DoraMetricsResult> {
    return db.getDoraMetrics(orgId, periodDays);
  }

  public static async getRiskCalibration(orgId: string): Promise<RiskCalibrationResult> {
    return db.getRiskCalibration(orgId);
  }
}
