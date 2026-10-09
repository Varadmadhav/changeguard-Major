import type { AuditEvent, AuditEventInput } from '../types/audit.ts';
import type { Deployment } from '../types/deployment.ts';

export class AuditWriterError extends Error {
  public readonly eventInput: AuditEventInput;

  constructor(message: string, eventInput: AuditEventInput) {
    super(`Audit writer failed: ${message}`);
    this.name = 'AuditWriterError';
    this.eventInput = eventInput;
    Object.setPrototypeOf(this, AuditWriterError.prototype);
  }
}

/**
 * Adapter integrating deployment events with Jayesh's AuditWriter contract.
 */
export class DeploymentAuditAdapter {
  private events: AuditEvent[] = [];
  private failSink = false;

  /**
   * For testing audit-writer failure handling
   */
  public setSimulateWriterFailure(shouldFail: boolean): void {
    this.failSink = shouldFail;
  }

  public async record(input: AuditEventInput): Promise<AuditEvent> {
    if (this.failSink) {
      throw new AuditWriterError('Connection to tamper-evident audit store failed', input);
    }

    const now = new Date();
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const stored: AuditEvent = {
      id,
      timestamp: now.toISOString(),
      timeFormatted,
      actor: input.actor,
      action: input.action,
      actionTitle: input.actionTitle,
      resource: input.resource,
      result: input.result,
      source: input.source,
      details: input.details,
      metadata: input.metadata,
    };

    // Prevent immediate duplicate events for identical action on identical resource
    const lastEvent = this.events[0];
    if (
      lastEvent &&
      lastEvent.action === input.action &&
      lastEvent.resource.id === input.resource.id &&
      lastEvent.details === input.details &&
      now.getTime() - new Date(lastEvent.timestamp).getTime() < 1000
    ) {
      return lastEvent;
    }

    this.events.unshift(stored);
    return stored;
  }

  public async recordPromotion(
    deployment: Deployment,
    newStage: number,
    actorName: string = 'Operator'
  ): Promise<AuditEvent> {
    return this.record({
      actor: { name: actorName, type: 'USER' },
      action: 'DEPLOYMENT_PROMOTED',
      actionTitle: `Traffic Promoted to ${newStage}%`,
      resource: {
        type: 'DEPLOYMENT',
        id: deployment.id,
        name: `${deployment.serviceName} (${deployment.version})`,
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Advanced canary rollout to stage ${deployment.currentStageIndex + 1} (${newStage}% traffic).`,
      metadata: {
        stagePercentage: newStage,
        version: deployment.version,
      },
    });
  }

  public async recordPause(
    deployment: Deployment,
    reason: string,
    actorName: string = 'Policy Engine'
  ): Promise<AuditEvent> {
    return this.record({
      actor: { name: actorName, type: 'POLICY_ENGINE' },
      action: 'DEPLOYMENT_PAUSED',
      actionTitle: 'Autonomous Rollout Pause Triggered',
      resource: {
        type: 'DEPLOYMENT',
        id: deployment.id,
        name: `${deployment.serviceName} (${deployment.version})`,
      },
      result: 'WARNING',
      source: 'POLICY_ENGINE',
      details: reason,
      metadata: {
        trafficPercentage: deployment.currentTrafficPercentage,
        pausedReason: reason,
      },
    });
  }

  public async recordRollback(
    deployment: Deployment,
    targetVersion: string,
    reason: string,
    actorName: string = 'ChangeGuard Rollback Controller'
  ): Promise<AuditEvent> {
    return this.record({
      actor: { name: actorName, type: 'SYSTEM' },
      action: 'ROLLBACK_EXECUTED',
      actionTitle: `Rollback to ${targetVersion} Executed`,
      resource: {
        type: 'DEPLOYMENT',
        id: deployment.id,
        name: `${deployment.serviceName} (${deployment.version} → ${targetVersion})`,
      },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: `Traffic immediately reverted to baseline ${targetVersion}. Reason: ${reason}`,
      metadata: {
        targetVersion,
        baselineRestored: true,
      },
    });
  }

  public async recordRollbackInitiated(
    deployment: Deployment,
    reason: string,
    actorName: string = 'ChangeGuard Rollback Controller'
  ): Promise<AuditEvent> {
    return this.record({
      actor: { name: actorName, type: 'SYSTEM' },
      action: 'ROLLBACK_EXECUTED',
      actionTitle: `Rollback Initiated for ${deployment.id}`,
      resource: {
        type: 'DEPLOYMENT',
        id: deployment.id,
        name: `${deployment.serviceName} (${deployment.version})`,
      },
      result: 'WARNING',
      source: 'WEB_CONSOLE',
      details: `Rollback initiated. Reason: ${reason}`,
      metadata: {
        stage: 'INITIATED',
        reason,
      },
    });
  }

  public async recordRollbackCompleted(
    deployment: Deployment,
    targetVersion: string,
    actorName: string = 'ChangeGuard Rollback Controller'
  ): Promise<AuditEvent> {
    return this.recordRollback(deployment, targetVersion, deployment.rollbackReason || 'Safety threshold breach', actorName);
  }

  public async recordFailureSimulation(
    deployment: Deployment,
    errorRate: number,
    p95Latency: number
  ): Promise<AuditEvent> {
    return this.record({
      actor: { name: 'Simulation Controller', type: 'SYSTEM' },
      action: 'SIMULATION_TRIGGERED',
      actionTitle: 'Circuit Breaker Failure Simulated',
      resource: {
        type: 'DEPLOYMENT',
        id: deployment.id,
        name: `${deployment.serviceName} (${deployment.version})`,
      },
      result: 'WARNING',
      source: 'SIMULATION_CONTROLLER',
      details: `Simulated error rate spike to ${errorRate}%, P95 latency to ${p95Latency}ms.`,
      metadata: { errorRate, p95Latency },
    });
  }

  public async recordFailureInjected(
    deployment: Deployment,
    errorRate: number,
    p95Latency: number
  ): Promise<AuditEvent> {
    return this.recordFailureSimulation(deployment, errorRate, p95Latency);
  }

  public getEvents(): AuditEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
    this.failSink = false;
  }
}

export const deploymentAuditAdapter = new DeploymentAuditAdapter();
