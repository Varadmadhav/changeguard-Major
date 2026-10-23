import { prometheusClient, PrometheusTelemetry } from './prometheusClient.js';
import { argoClient } from './argoClient.js';
import { AuditWriter } from './auditWriter.js';
import { db } from '../db/index.js';

export interface SignalEvaluationOutput {
  id: string;
  name: string;
  metricKey: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  currentValue: number;
  threshold: number;
  unit: string;
  evaluatedAt: string;
  isStale: boolean;
}

export interface VerificationEvaluationResult {
  deploymentId: string;
  overallHealth: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  signals: SignalEvaluationOutput[];
  actionRequired: 'NONE' | 'AUTONOMOUS_PAUSE' | 'AUTONOMOUS_ROLLBACK';
  breachReason?: string;
  telemetry: PrometheusTelemetry;
}

export class VerificationEngine {
  private static breachTimestamps: Map<string, number> = new Map();

  public static async evaluateDeployment(
    deploymentId: string,
    toleranceWindowMs = 60000 // 60s sustained breach tolerance (PRD Section 12.3)
  ): Promise<VerificationEvaluationResult> {
    const deployment = await db.getDeploymentById(deploymentId);
    const telemetry = await prometheusClient.getTelemetry(deploymentId);

    const evaluatedSignals: SignalEvaluationOutput[] = [];
    let hasFailedSignal = false;
    let criticalError = false;

    // Check for stale telemetry (>90s)
    if (telemetry.isStale) {
      hasFailedSignal = true;
    }

    if (deployment?.signals) {
      for (const sig of deployment.signals) {
        let currentVal = 0;
        if (sig.metricKey === 'http_error_rate_pct') currentVal = telemetry.errorRate;
        else if (sig.metricKey === 'p95_latency_ms') currentVal = telemetry.p95Latency;
        else currentVal = telemetry.errorRate;

        let status: 'PASSED' | 'WARNING' | 'FAILED' = 'PASSED';

        if (telemetry.isStale) {
          status = 'FAILED';
        } else if (sig.operator === '<' || sig.operator === '<=') {
          if (currentVal > sig.threshold) {
            status = 'FAILED';
          } else if (currentVal > sig.threshold * 0.85) {
            status = 'WARNING';
          }
        } else if (sig.operator === '>' || sig.operator === '>=') {
          if (currentVal < sig.threshold) {
            status = 'FAILED';
          }
        }

        if (status === 'FAILED') hasFailedSignal = true;
        if (sig.metricKey === 'http_error_rate_pct' && currentVal >= 5.0) criticalError = true;

        evaluatedSignals.push({
          id: sig.id,
          name: sig.name,
          metricKey: sig.metricKey,
          status,
          currentValue: currentVal,
          threshold: sig.threshold,
          unit: sig.unit,
          evaluatedAt: new Date().toISOString(),
          isStale: telemetry.isStale,
        });
      }
    }

    // Determine overall health
    let overallHealth: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (criticalError) overallHealth = 'CRITICAL';
    else if (hasFailedSignal) overallHealth = 'DEGRADED';
    else if (evaluatedSignals.some((s) => s.status === 'WARNING')) overallHealth = 'WARNING';

    // Evaluate sustained breach tolerance window
    let actionRequired: 'NONE' | 'AUTONOMOUS_PAUSE' | 'AUTONOMOUS_ROLLBACK' = 'NONE';
    let breachReason: string | undefined;

    const now = Date.now();
    if (hasFailedSignal) {
      if (!this.breachTimestamps.has(deploymentId)) {
        this.breachTimestamps.set(deploymentId, now);
      }
      const breachStart = this.breachTimestamps.get(deploymentId)!;
      const sustainedDuration = now - breachStart;

      if (criticalError && sustainedDuration >= 1000) {
        actionRequired = 'AUTONOMOUS_ROLLBACK';
        breachReason = `Critical telemetry breach: HTTP Error Rate exceeded 5.0% (${telemetry.errorRate}%)`;
      } else if (sustainedDuration >= toleranceWindowMs) {
        actionRequired = 'AUTONOMOUS_PAUSE';
        breachReason = telemetry.isStale
          ? 'Missing telemetry data for over 90 seconds (stale Prometheus signal)'
          : `Telemetry threshold breached sustained for ${Math.round(sustainedDuration / 1000)}s: HTTP Error Rate at ${telemetry.errorRate}%`;
      }
    } else {
      this.breachTimestamps.delete(deploymentId);
    }

    return {
      deploymentId,
      overallHealth,
      signals: evaluatedSignals,
      actionRequired,
      breachReason,
      telemetry,
    };
  }

  public static async executeAutonomousAction(
    deploymentId: string,
    action: 'AUTONOMOUS_PAUSE' | 'AUTONOMOUS_ROLLBACK',
    reason: string
  ): Promise<void> {
    const deployment = await db.getDeploymentById(deploymentId);
    if (!deployment) return;

    if (action === 'AUTONOMOUS_PAUSE') {
      await argoClient.pauseRollout(deployment.serviceName, reason);
      await db.updateDeploymentState(deploymentId, 'PAUSED', {
        pausedReason: reason,
        health: 'DEGRADED',
      });

      // Automatically create incident record (PRD FR-INC-002)
      await db.createIncident({
        organization_id: deployment.organizationId,
        code: `INC-${Math.floor(100 + Math.random() * 900)}`,
        title: `Telemetry Breach: ${deployment.serviceName} (${deployment.version}) paused automatically`,
        severity: 'SEV-2',
        status: 'TRIGGERED',
        related_deployment_id: deployment.id,
        related_change_id: deployment.changeId,
        rca_summary: reason,
        rca_trigger: reason,
        rca_contained_by: 'ChangeGuard Autonomous Verification Engine (Traffic paused at canary stage)',
        rca_recommendation: 'Inspect database connection saturation and error logs before resuming canary progression.',
        peak_error_rate: `${deployment.currentTelemetry.errorRate}%`,
        peak_p95_latency: `${deployment.currentTelemetry.p95Latency}ms`,
        impacted_requests: 140,
        impacted_users: 85,
      });

      // Write audit event
      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: 'ChangeGuard', type: 'POLICY_ENGINE' },
        action: 'DEPLOYMENT_PAUSED',
        actionTitle: 'Deployment paused automatically',
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'WARNING',
        source: 'POLICY_ENGINE',
        details: reason,
      });
    } else if (action === 'AUTONOMOUS_ROLLBACK') {
      await argoClient.rollbackRollout(deployment.serviceName, deployment.previousVersion);
      await db.updateDeploymentState(deploymentId, 'ROLLED_BACK', {
        rollbackReason: reason,
        health: 'HEALTHY',
        currentTrafficPercentage: 0,
      });

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: 'ChangeGuard', type: 'POLICY_ENGINE' },
        action: 'ROLLBACK_EXECUTED',
        actionTitle: 'Autonomous rollback executed',
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'SUCCESS',
        source: 'POLICY_ENGINE',
        details: reason,
      });
    }
  }
}
