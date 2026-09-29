import { Deployment } from '../types/deployment';
import { mockDeployments } from '../data/mockDeployments';

class DeploymentsService {
  private deployments: Deployment[] = [...mockDeployments];

  async getDeployments(): Promise<Deployment[]> {
    // Simulates GET /api/deployments
    return Promise.resolve([...this.deployments]);
  }

  async getDeploymentById(id: string): Promise<Deployment | undefined> {
    // Simulates GET /api/deployments/:id
    return Promise.resolve(
      this.deployments.find(d => d.id === id || d.serviceId === id || d.serviceName.toLowerCase().includes(id.toLowerCase()))
    );
  }

  async promoteDeployment(id: string): Promise<Deployment | undefined> {
    // Simulates POST /api/deployments/:id/promote
    const dep = this.deployments.find(d => d.id === id);
    if (!dep) return undefined;

    const nextStages = dep.stages;
    const nextIdx = Math.min(dep.currentStageIndex + 1, nextStages.length - 1);
    const targetTraffic = nextStages[nextIdx];
    const isFull = targetTraffic === 100;

    dep.currentTrafficPercentage = targetTraffic;
    dep.targetTrafficPercentage = targetTraffic;
    dep.currentStageIndex = nextIdx;
    dep.status = isFull ? 'PROMOTED' : 'MONITORING';
    dep.health = 'HEALTHY';
    dep.updatedAt = 'Just now';

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: isFull ? 'Deployment 100% Promoted' : `Traffic Promoted to ${targetTraffic}%`,
      description: isFull
        ? 'Rollout reached full production traffic. All verification gates passed.'
        : `Advanced canary traffic to stage ${nextIdx + 1} (${targetTraffic}%).`,
      type: 'SUCCESS',
      actor: 'Alex Morgan (Operator)',
    });

    return Promise.resolve({ ...dep });
  }

  async pauseDeployment(id: string, reason: string): Promise<Deployment | undefined> {
    // Simulates POST /api/deployments/:id/pause
    const dep = this.deployments.find(d => d.id === id);
    if (!dep) return undefined;

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

    return Promise.resolve({ ...dep });
  }

  async rollbackDeployment(id: string, reason: string): Promise<Deployment | undefined> {
    // Simulates POST /api/deployments/:id/rollback
    const dep = this.deployments.find(d => d.id === id);
    if (!dep) return undefined;

    dep.status = 'ROLLED_BACK';
    dep.health = 'HEALTHY';
    dep.currentTrafficPercentage = 0;
    dep.targetTrafficPercentage = 0;
    dep.rollbackReason = reason || 'Error rate exceeded production safety threshold.';
    dep.updatedAt = 'Just now';
    dep.completedAt = 'Just now';

    // reset metrics back to baseline for safe rolled-back state
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
      title: `Automated Rollback to ${dep.previousVersion} Completed`,
      description: `Traffic immediately reverted to baseline ${dep.previousVersion}. Blast radius safely contained.`,
      type: 'DANGER',
      actor: 'ChangeGuard Rollback Controller',
    });

    return Promise.resolve({ ...dep });
  }

  async simulateFailure(id: string): Promise<Deployment | undefined> {
    const dep = this.deployments.find(d => d.id === id);
    if (!dep) return undefined;

    // Error rate jumps 0.42% -> 3.7%
    dep.currentTelemetry.errorRate = 3.7;
    dep.currentTelemetry.p95Latency = 840;
    dep.currentTelemetry.cpuUtilization = 78;
    dep.health = 'CRITICAL';
    dep.status = 'PAUSED';
    dep.pausedReason = 'Telemetry Error Rate (3.7%) breached Policy Threshold (< 1.0%).';
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

    dep.telemetryHistory.push({
      timestamp: '10:52',
      errorRate: 3.7,
      p95Latency: 840,
      requestsPerMinute: 13200,
      cpuUtilization: 78,
      memoryUtilization: 72,
      canaryTrafficPercentage: dep.currentTrafficPercentage,
    });

    dep.timeline.unshift({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: 'CRITICAL: Error Rate Spiked to 3.7% (Breach)',
      description: 'Threshold exceeded (< 1.0%). Autonomous policy triggered: Traffic progression halted.',
      type: 'DANGER',
      actor: 'ChangeGuard Verification Engine',
    });

    return Promise.resolve({ ...dep });
  }
}

export const deploymentsService = new DeploymentsService();
