import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { argoClient } from '../../services/argoClient.js';
import { prometheusClient } from '../../services/prometheusClient.js';
import { VerificationEngine } from '../../services/verificationEngine.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { DeploymentsRepository } from './deployments.repository.js';
import {
  CreateDeploymentBody,
  DeploymentRecord,
  PauseDeploymentBody,
  RollbackDeploymentBody,
  SimulateFailureBody,
} from './deployments.types.js';

export class DeploymentsService {
  public static async listDeployments(
    orgId: string,
    filters?: { environment?: string; status?: string; serviceId?: string }
  ): Promise<DeploymentRecord[]> {
    return DeploymentsRepository.list(orgId, filters);
  }

  public static async getDeploymentById(id: string): Promise<DeploymentRecord> {
    const deployment = await DeploymentsRepository.findById(id);
    if (!deployment) {
      throw AppError.notFound(`Deployment ${id}`);
    }
    return deployment;
  }

  public static async createDeployment(
    body: CreateDeploymentBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<DeploymentRecord> {
    const created = await DeploymentsRepository.create({
      organizationId: user.organizationId,
      serviceId: body.serviceId,
      serviceName: body.serviceName,
      serviceTier: body.serviceTier,
      version: body.version,
      previousVersion: body.previousVersion,
      environment: body.environment,
      status: 'MONITORING',
      risk: { score: 45, level: 'MEDIUM' },
      strategy: 'CANARY',
      currentTrafficPercentage: 5,
      targetTrafficPercentage: 5,
      stages: [5, 25, 50, 100],
      currentStageIndex: 0,
      health: 'HEALTHY',
      changeId: body.changeId,
      changeTitle: body.changeTitle,
      changeAuthor: body.changeAuthor,
      repository: body.repository,
      commitHash: body.commitHash,
      currentTelemetry: {
        errorRate: 0.04,
        p95Latency: 175,
        requestsPerMinute: 11500,
        cpuUtilization: 38,
        memoryUtilization: 52,
      },
      signals: [
        {
          id: 'sig-1',
          name: 'HTTP Error Rate',
          description: 'Aggregate 5xx response percentage over rolling window',
          metricKey: 'http_error_rate_pct',
          operator: '<',
          threshold: 1.0,
          currentValue: 0.04,
          unit: '%',
          status: 'PASSED',
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: 'sig-2',
          name: 'P95 Transaction Latency',
          description: 'End-to-end service response duration at 95th percentile',
          metricKey: 'p95_latency_ms',
          operator: '<',
          threshold: 500,
          currentValue: 175,
          unit: 'ms',
          status: 'PASSED',
          evaluatedAt: new Date().toISOString(),
        },
      ],
    });

    await argoClient.setTrafficPercentage(body.serviceName, 5);

    await AuditWriter.record({
      organizationId: user.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'DEPLOYMENT_STARTED',
      actionTitle: 'Canary Rollout Started',
      resource: { type: 'DEPLOYMENT', id: created.id, name: `${body.serviceName} (${body.version})` },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Initiated 5% canary rollout for ${body.serviceName} version ${body.version}`,
    });

    return created;
  }

  public static async promoteDeployment(
    id: string,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<DeploymentRecord> {
    const deployment = await this.getDeploymentById(id);

    // Run verification pre-check
    const evalResult = await VerificationEngine.evaluateDeployment(id);
    if (evalResult.overallHealth === 'CRITICAL' || evalResult.actionRequired !== 'NONE') {
      throw AppError.conflict(
        `Cannot promote deployment: ${evalResult.breachReason || 'Health verification failed'}`
      );
    }

    const nextStageIndex = deployment.currentStageIndex + 1;
    const stages = deployment.stages || [5, 25, 50, 100];

    if (nextStageIndex >= stages.length) {
      // 100% Full Promotion
      await argoClient.setTrafficPercentage(deployment.serviceName, 100);
      const promoted = await DeploymentsRepository.updateState(id, 'PROMOTED', {
        currentTrafficPercentage: 100,
        targetTrafficPercentage: 100,
        currentStageIndex: stages.length - 1,
        health: 'HEALTHY',
        completedAt: new Date().toISOString(),
      });

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: user.name, type: 'USER', email: user.email },
        action: 'DEPLOYMENT_PROMOTED',
        actionTitle: 'Promoted to 100% Production Traffic',
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: 'Canary verified healthy through all stages. Full promotion complete.',
      });

      return promoted;
    }

    const nextTrafficPct = stages[nextStageIndex];
    await argoClient.setTrafficPercentage(deployment.serviceName, nextTrafficPct);

    const updated = await DeploymentsRepository.updateState(id, 'MONITORING', {
      currentTrafficPercentage: nextTrafficPct,
      targetTrafficPercentage: nextTrafficPct,
      currentStageIndex: nextStageIndex,
      health: 'HEALTHY',
    });

    await AuditWriter.record({
      organizationId: deployment.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'DEPLOYMENT_PROMOTED',
      actionTitle: `Advanced Canary to ${nextTrafficPct}% Traffic`,
      resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Advanced stage ${nextStageIndex + 1} of ${stages.length}. Traffic routed: ${nextTrafficPct}%.`,
    });

    return updated;
  }

  public static async pauseDeployment(
    id: string,
    body: PauseDeploymentBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<DeploymentRecord> {
    const deployment = await this.getDeploymentById(id);
    const reason = body.reason || 'Paused by operator via console';

    await argoClient.pauseRollout(deployment.serviceName, reason);

    const updated = await DeploymentsRepository.updateState(id, 'PAUSED', {
      pausedReason: reason,
      health: 'WARNING',
    });

    await AuditWriter.record({
      organizationId: deployment.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'DEPLOYMENT_PAUSED',
      actionTitle: 'Canary Rollout Paused',
      resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
      result: 'WARNING',
      source: 'WEB_CONSOLE',
      details: reason,
    });

    return updated;
  }

  public static async rollbackDeployment(
    id: string,
    body: RollbackDeploymentBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<DeploymentRecord> {
    const deployment = await this.getDeploymentById(id);
    const targetVersion = body.targetVersion || deployment.previousVersion;
    const reason = body.reason || 'Manual rollback initiated via console';

    await argoClient.rollbackRollout(deployment.serviceName, targetVersion);

    const updated = await DeploymentsRepository.updateState(
      id,
      'ROLLED_BACK',
      {
        expectedStatus: body.expectedStatus,
        rollbackReason: reason,
        currentTrafficPercentage: 0,
        targetTrafficPercentage: 0,
        health: 'HEALTHY',
        completedAt: new Date().toISOString(),
      }
    );

    // Create Incident record
    await db.createIncident({
      organization_id: deployment.organizationId,
      code: `INC-${Math.floor(100 + Math.random() * 900)}`,
      title: `Rollback: ${deployment.serviceName} rolled back to ${targetVersion}`,
      severity: 'SEV-2',
      status: 'CONTAINED',
      related_deployment_id: deployment.id,
      related_change_id: deployment.changeId,
      rca_summary: reason,
      rca_trigger: reason,
      rca_contained_by: 'Automated Canary Rollback (Traffic diverted to stable revision)',
      rca_recommendation: 'Check recent commits for regressions before re-attempting rollout.',
      peak_error_rate: `${deployment.currentTelemetry.errorRate}%`,
      peak_p95_latency: `${deployment.currentTelemetry.p95Latency}ms`,
      impacted_requests: 120,
      impacted_users: 64,
    });

    await AuditWriter.record({
      organizationId: deployment.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'ROLLBACK_EXECUTED',
      actionTitle: `Automated Rollback to ${targetVersion}`,
      resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: reason,
    });

    return updated;
  }

  public static async abortDeployment(id: string): Promise<DeploymentRecord> {
    const deployment = await this.getDeploymentById(id);

    await argoClient.abortRollout(deployment.serviceName);

    return DeploymentsRepository.updateState(id, 'ABORTED', {
      currentTrafficPercentage: 0,
      targetTrafficPercentage: 0,
      health: 'CRITICAL',
      completedAt: new Date().toISOString(),
    });
  }

  public static async getVerification(id: string) {
    return VerificationEngine.evaluateDeployment(id);
  }

  public static async simulateFailure(
    id: string,
    body: SimulateFailureBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ) {
    const deployment = await this.getDeploymentById(id);
    const errorRate = body.errorRate ?? 3.8;
    const p95Latency = body.p95Latency ?? 420;

    prometheusClient.simulateMetricBreach(id, errorRate, p95Latency);

    const evaluation = await VerificationEngine.evaluateDeployment(id, 0);

    if (evaluation.actionRequired !== 'NONE') {
      await VerificationEngine.executeAutonomousAction(id, evaluation.actionRequired, evaluation.breachReason!);
    }

    const updated = await DeploymentsRepository.findById(id);

    await AuditWriter.record({
      organizationId: deployment.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'SIMULATION_TRIGGERED',
      actionTitle: 'Circuit Breaker Failure Simulated',
      resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
      result: 'WARNING',
      source: 'SIMULATION_CONTROLLER',
      details: `Simulated error rate spike to ${errorRate}%, tripping verification safety threshold.`,
    });

    return {
      deployment: updated,
      evaluation,
    };
  }

  public static async simulateRecovery(id: string) {
    prometheusClient.simulateRecovery(id);
    return VerificationEngine.evaluateDeployment(id);
  }

  public static async simulateStale(id: string) {
    prometheusClient.simulateStaleData(id);
    return VerificationEngine.evaluateDeployment(id);
  }
}
