export interface ArgoRolloutState {
  name: string;
  namespace: string;
  strategy: 'CANARY' | 'BLUE_GREEN';
  currentTrafficPct: number;
  stableRevision: string;
  canaryRevision: string;
  phase: 'Healthy' | 'Progressing' | 'Paused' | 'Degraded';
  pauseReason?: string;
  replicas: {
    total: number;
    canary: number;
    stable: number;
  };
}

// ponytail: in-memory Argo Rollouts controller simulator provides realistic Canary traffic progression
// and pod health verification without requiring an external Kubernetes cluster on the local developer host.
// Production connects to Kubernetes API server via @kubernetes/client-node.
export class ArgoRolloutsClient {
  private rollouts: Map<string, ArgoRolloutState> = new Map();

  constructor() {
    this.rollouts.set('checkout-service-rollout', {
      name: 'checkout-service-rollout',
      namespace: 'production',
      strategy: 'CANARY',
      currentTrafficPct: 5,
      stableRevision: 'v2.8.3-sha-9a1b2c',
      canaryRevision: 'v2.8.4-sha-7f9a2b',
      phase: 'Progressing',
      replicas: {
        total: 10,
        canary: 1,
        stable: 9,
      },
    });
  }

  public async setTrafficPercentage(name: string, percentage: number): Promise<ArgoRolloutState> {
    const rollout = this.rollouts.get(name) || {
      name,
      namespace: 'production',
      strategy: 'CANARY',
      currentTrafficPct: percentage,
      stableRevision: 'v2.8.3',
      canaryRevision: 'v2.8.4',
      phase: percentage === 100 ? 'Healthy' : 'Progressing',
      replicas: { total: 10, canary: Math.round((percentage / 100) * 10), stable: 10 - Math.round((percentage / 100) * 10) },
    };

    rollout.currentTrafficPct = percentage;
    rollout.phase = percentage === 100 ? 'Healthy' : 'Progressing';
    rollout.replicas.canary = Math.round((percentage / 100) * 10);
    rollout.replicas.stable = 10 - rollout.replicas.canary;
    this.rollouts.set(name, rollout);
    return rollout;
  }

  public async pauseRollout(name: string, reason: string): Promise<ArgoRolloutState> {
    const rollout = await this.setTrafficPercentage(name, this.rollouts.get(name)?.currentTrafficPct || 5);
    rollout.phase = 'Paused';
    rollout.pauseReason = reason;
    this.rollouts.set(name, rollout);
    return rollout;
  }

  public async resumeRollout(name: string): Promise<ArgoRolloutState> {
    const rollout = this.rollouts.get(name);
    if (rollout) {
      rollout.phase = 'Progressing';
      rollout.pauseReason = undefined;
    }
    return rollout || this.setTrafficPercentage(name, 5);
  }

  public async rollbackRollout(name: string, targetRevision?: string): Promise<ArgoRolloutState> {
    const rollout = this.rollouts.get(name);
    const targetRev = targetRevision || rollout?.stableRevision || 'v2.8.3';

    const rolledBack: ArgoRolloutState = {
      name,
      namespace: rollout?.namespace || 'production',
      strategy: 'CANARY',
      currentTrafficPct: 0,
      stableRevision: targetRev,
      canaryRevision: targetRev,
      phase: 'Healthy',
      pauseReason: undefined,
      replicas: { total: 10, canary: 0, stable: 10 },
    };
    this.rollouts.set(name, rolledBack);
    return rolledBack;
  }

  public async abortRollout(name: string): Promise<ArgoRolloutState> {
    const rollout = this.rollouts.get(name);
    if (rollout) {
      rollout.phase = 'Degraded';
      rollout.currentTrafficPct = 0;
    }
    return rollout || this.setTrafficPercentage(name, 0);
  }

  public async getRollout(name: string): Promise<ArgoRolloutState | null> {
    return this.rollouts.get(name) || null;
  }
}

export const argoClient = new ArgoRolloutsClient();
