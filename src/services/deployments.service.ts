import type {
  Deployment,
  DeploymentStatus,
  DeploymentPolicyCommand,
} from '../types/deployment.ts';
import {
  validateDeploymentTransition,
  InvalidStateTransitionError,
  UnknownDeploymentError,
} from '../types/deployment.ts';
import { mockDeployments } from '../data/mockDeployments.ts';
import { canaryController } from './canary.controller.ts';
import { policyReceiver } from './policy.receiver.ts';
import { deploymentRepository } from './deployment.repository.ts';
import { deploymentAuditAdapter } from './audit.adapter.ts';

class DeploymentsService {
  private mode: 'local' | 'api' = 'local';
  private apiBaseUrl = '/api';

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
    return deploymentRepository.findAll();
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
    const found = await deploymentRepository.findById(id);
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

    const dep = await deploymentRepository.findById(id);
    if (!dep) return undefined;

    canaryController.promote(dep, targetStage);
    const saved = await deploymentRepository.save(dep);
    await deploymentAuditAdapter.recordPromotion(saved, saved.currentTrafficPercentage);

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

    const dep = await deploymentRepository.findById(id);
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

    const saved = await deploymentRepository.save(dep);
    await deploymentAuditAdapter.recordPause(saved, dep.pausedReason, 'MANUAL');
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

    const dep = await deploymentRepository.findById(id);
    if (!dep) return undefined;

    // 1. Enter intermediate state ROLLING_BACK
    validateDeploymentTransition(dep.status, 'ROLLING_BACK');
    dep.status = 'ROLLING_BACK';
    dep.updatedAt = 'Just now';
    await deploymentAuditAdapter.recordRollbackInitiated(dep, reason || 'Error rate exceeded production safety threshold.');

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

    dep.signals = dep.signals.map(s => ({
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

    const saved = await deploymentRepository.save(dep);
    await deploymentAuditAdapter.recordRollbackCompleted(saved, targetBaselineVersion);
    return saved;
  }

  async transitionDeploymentState(
    id: string,
    targetStatus: DeploymentStatus,
    reason?: string
  ): Promise<Deployment | undefined> {
    const dep = await deploymentRepository.findById(id);
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

    return await deploymentRepository.save(dep);
  }

  async handlePolicyCommand(command: DeploymentPolicyCommand): Promise<Deployment | undefined> {
    const dep = await deploymentRepository.findById(command.deploymentId);
    if (!dep) {
      throw new UnknownDeploymentError(command.deploymentId);
    }
    policyReceiver.handleCommand(dep, command);
    const saved = await deploymentRepository.save(dep);

    const decision = (command.decision || (command as any).action) as string;
    if (decision === 'PAUSE') {
      await deploymentAuditAdapter.recordPause(saved, command.reason, 'POLICY');
    } else if (decision === 'ROLLBACK') {
      await deploymentAuditAdapter.recordRollbackInitiated(saved, command.reason);
      await deploymentAuditAdapter.recordRollbackCompleted(saved, saved.version);
    } else if (decision === 'PROMOTE' || decision === 'ALLOW') {
      const stage = (command as any).targetStage || saved.currentTrafficPercentage;
      await deploymentAuditAdapter.recordPromotion(saved, stage);
    }

    return saved;
  }

  resetDeployments(): void {
    deploymentRepository.reset();
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

    const dep = await deploymentRepository.findById(id);
    if (!dep) return undefined;

    // Error rate jumps 0.42% -> 3.7%, latency jumps 182ms -> 840ms
    dep.currentTelemetry.errorRate = 3.7;
    dep.currentTelemetry.p95Latency = 840;
    dep.currentTelemetry.cpuUtilization = 78;
    dep.health = 'CRITICAL';
    dep.updatedAt = 'Just now';

    dep.signals = dep.signals.map(s => {
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

    const saved = await deploymentRepository.save(dep);
    await deploymentAuditAdapter.recordFailureInjected(saved, 3.7, 840);
    return saved;
  }
}

export const deploymentsService = new DeploymentsService();
