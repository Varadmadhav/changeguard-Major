import type {
  Deployment,
  DeploymentStatus,
  DeploymentPolicyCommand,
  VerificationSignal,
} from '../types/deployment.ts';
import {
  validateDeploymentTransition,
  InvalidStateTransitionError,
  UnknownDeploymentError,
} from '../types/deployment.ts';
import { mockDeployments } from '../data/mockDeployments.ts';
import { canaryController, CanaryController } from './canary.controller.ts';
import { policyReceiver, PolicyReceiver } from './policy.receiver.ts';
import { deploymentRepository, DeploymentRepository } from './deployment.repository.ts';
import { deploymentAuditAdapter, DeploymentAuditAdapter } from './audit.adapter.ts';

export class DeploymentsService {
  private mode: 'local' | 'api' = 'local';
  private apiBaseUrl = '/api';
  private repository: DeploymentRepository;
  private canary: CanaryController;
  private policy: PolicyReceiver;
  private audit: DeploymentAuditAdapter;

  constructor(
    repository: DeploymentRepository = deploymentRepository,
    canary: CanaryController = canaryController,
    policy: PolicyReceiver = policyReceiver,
    audit: DeploymentAuditAdapter = deploymentAuditAdapter
  ) {
    this.repository = repository;
    this.canary = canary;
    this.policy = policy;
    this.audit = audit;
  }

  public getMode(): 'local' | 'api' {
    return this.mode;
  }

  public setMode(mode: 'local' | 'api', baseUrl?: string): void {
    this.mode = mode;
    if (baseUrl) this.apiBaseUrl = baseUrl;
  }

  async getDeployments(): Promise<Deployment[]> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) return json.data;
        }
      } catch {
        // Fall back to local repository
      }
    }
    return this.repository.findAll();
  }

  async getDeploymentById(id: string): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local repository
      }
    }
    const found = await this.repository.findById(id);
    return found || undefined;
  }

  async promoteDeployment(id: string, targetStage?: number): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetStage }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local execution
      }
    }

    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    this.canary.promote(dep, targetStage);
    const saved = await this.repository.save(dep);
    await this.audit.recordPromotion(saved, saved.currentTrafficPercentage);

    return saved;
  }

  async pauseDeployment(id: string, reason?: string): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}/pause`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local execution
      }
    }

    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    validateDeploymentTransition(dep.status, 'PAUSED');

    dep.status = 'PAUSED';
    dep.health = 'WARNING';
    dep.pausedReason = reason || 'Telemetry threshold breach approaching limit.';
    dep.updatedAt = 'Just now';

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: 'Rollout Paused',
      description: `Deployment paused. Reason: ${dep.pausedReason}`,
      type: 'WARNING',
      actor: 'Policy Engine / Operator',
    });

    const saved = await this.repository.save(dep);
    await this.audit.recordPause(saved, dep.pausedReason, 'MANUAL');
    return saved;
  }

  async resumeDeployment(id: string): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}/resume`, {
          method: 'POST',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local execution
      }
    }

    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    // Only allow resume from PAUSED state
    if (dep.status !== 'PAUSED') {
      throw new InvalidStateTransitionError(dep.status, 'MONITORING', ['PAUSED']);
    }

    validateDeploymentTransition(dep.status, 'MONITORING');

    dep.status = 'MONITORING';
    if (dep.health === 'WARNING') {
      dep.health = 'HEALTHY';
    }
    dep.pausedReason = undefined;
    dep.updatedAt = 'Just now';

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: 'Rollout Resumed',
      description: 'Canary progression and telemetry monitoring resumed by Operator.',
      type: 'INFO',
      actor: 'Policy Engine / Operator',
    });

    const saved = await this.repository.save(dep);
    return saved;
  }

  async rollbackDeployment(id: string, reason?: string): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local execution
      }
    }

    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    // 1. Enter intermediate state ROLLING_BACK
    validateDeploymentTransition(dep.status, 'ROLLING_BACK');
    dep.status = 'ROLLING_BACK';
    dep.updatedAt = 'Just now';
    await this.audit.recordRollbackInitiated(dep, reason || 'Error rate exceeded production safety threshold.');

    // 2. Complete rollback to ROLLED_BACK
    validateDeploymentTransition(dep.status, 'ROLLED_BACK');
    const targetBaselineVersion = dep.previousVersion;
    dep.status = 'ROLLED_BACK';
    dep.version = targetBaselineVersion; // Restores running version to baseline v2.8.3
    dep.health = 'HEALTHY';
    dep.currentTrafficPercentage = 0;
    dep.targetTrafficPercentage = 0;
    dep.rollbackReason = reason || 'Error rate exceeded production safety threshold.';
    dep.updatedAt = 'Just now';
    dep.completedAt = new Date().toISOString();

    // Reset metrics back to baseline for safe rolled-back state
    dep.currentTelemetry.errorRate = 0.08;
    dep.currentTelemetry.p95Latency = 160;

    dep.signals = dep.signals.map((s: VerificationSignal) => ({
      ...s,
      status: 'PASSED',
      currentValue: s.metricKey === 'http_error_rate' ? 0.08 : s.metricKey === 'p95_latency' ? 160 : s.currentValue,
    }));

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: `Automated Rollback to ${targetBaselineVersion} Completed`,
      description: `Traffic immediately reverted to baseline ${targetBaselineVersion}. Blast radius safely contained.`,
      type: 'DANGER',
      actor: 'ChangeGuard Rollback Controller',
    });

    const saved = await this.repository.save(dep);
    await this.audit.recordRollbackCompleted(saved, targetBaselineVersion);
    return saved;
  }

  async transitionDeploymentState(
    id: string,
    targetStatus: DeploymentStatus,
    reason?: string
  ): Promise<Deployment | undefined> {
    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    validateDeploymentTransition(dep.status, targetStatus);
    const previousStatus = dep.status;
    dep.status = targetStatus;
    dep.updatedAt = 'Just now';

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: `State Transition: ${previousStatus} → ${targetStatus}`,
      description: reason || `Deployment state explicitly transitioned to ${targetStatus}.`,
      type:
        targetStatus === 'PAUSED'
          ? 'WARNING'
          : targetStatus === 'ROLLED_BACK' || targetStatus === 'FAILED'
          ? 'DANGER'
          : 'INFO',
      actor: 'Canary Controller',
    });

    return await this.repository.save(dep);
  }

  async handlePolicyCommand(command: DeploymentPolicyCommand): Promise<Deployment | undefined> {
    const dep = await this.repository.findById(command.deploymentId);
    if (!dep) {
      throw new UnknownDeploymentError(command.deploymentId);
    }
    this.policy.handleCommand(dep, command);
    const saved = await this.repository.save(dep);

    const decision = (command.decision || (command as any).action) as string;
    if (decision === 'PAUSE') {
      await this.audit.recordPause(saved, command.reason, 'POLICY');
    } else if (decision === 'ROLLBACK') {
      await this.audit.recordRollbackInitiated(saved, command.reason);
      await this.audit.recordRollbackCompleted(saved, saved.version);
    } else if (decision === 'PROMOTE' || decision === 'ALLOW') {
      const stage = (command as any).targetStage || saved.currentTrafficPercentage;
      await this.audit.recordPromotion(saved, stage);
    }

    return saved;
  }

  async resetDeployments(): Promise<Deployment[]> {
    return this.repository.reset();
  }

  async simulateFailure(id: string): Promise<Deployment | undefined> {
    if (this.mode === 'api' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${this.apiBaseUrl}/deployments/${id}/simulate-failure`, {
          method: 'POST',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) return json.data;
        }
      } catch {
        // Fall back to local execution
      }
    }

    const dep = await this.repository.findById(id);
    if (!dep) return undefined;

    // Error rate jumps 0.42% -> 3.7%, latency jumps 182ms -> 840ms
    dep.currentTelemetry.errorRate = 3.7;
    dep.currentTelemetry.p95Latency = 840;
    dep.currentTelemetry.cpuUtilization = 78;
    dep.health = 'CRITICAL';
    dep.updatedAt = 'Just now';

    dep.signals = dep.signals.map((s: VerificationSignal) => {
      if (s.metricKey === 'http_error_rate') {
        return { ...s, currentValue: 3.7, status: 'FAILED' as const };
      }
      if (s.metricKey === 'p95_latency') {
        return { ...s, currentValue: 840, status: 'FAILED' as const };
      }
      if (s.metricKey === 'cpu_usage') {
        return { ...s, currentValue: 78, status: 'WARNING' as const };
      }
      return s;
    });

    const now = new Date();
    dep.telemetryHistory.push({
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      errorRate: 3.7,
      p95Latency: 840,
      requestsPerMinute: 13200,
      cpuUtilization: 78,
      memoryUtilization: 72,
      canaryTrafficPercentage: dep.currentTrafficPercentage,
    });

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: 'CRITICAL: Error Rate Spiked to 3.7% (Breach)',
      description: 'Threshold exceeded (< 1.0%). P95 latency spiked to 840ms. Safety alert dispatched.',
      type: 'DANGER',
      actor: 'ChangeGuard Verification Engine',
    });

    const saved = await this.repository.save(dep);
    await this.audit.recordFailureInjected(saved, 3.7, 840);
    return saved;
  }
}

export const deploymentsService = new DeploymentsService();
