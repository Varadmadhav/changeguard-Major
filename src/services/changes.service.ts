import type {
  Change,
  ChangeStatus,
  ReleasePolicyRecommendation,
} from '../types/change';

import { mockChanges } from '../data/mockChanges';
import { riskService } from './risk.service';

import { policyService } from './policy.service';

import type {
  TelemetryInput,
  PolicyDecision,
} from './policy.service';

class ChangesService {
  private changes: Change[] = [...mockChanges];

  async getChanges(): Promise<Change[]> {
    return Promise.resolve([...this.changes]);
  }

  async getChangeById(
    id: string
  ): Promise<Change | undefined> {
    const found = this.changes.find(
      c =>
        c.id === id ||
        c.id === `pr-${id}` ||
        c.number === Number(id)
    );

    return Promise.resolve(found);
  }

  async updateChangeStatus(
    id: string,
    status: ChangeStatus
  ): Promise<Change | undefined> {
    const index = this.changes.findIndex(
      c =>
        c.id === id ||
        c.id === `pr-${id}` ||
        c.number === Number(id)
    );

    if (index !== -1) {
      this.changes[index] = {
        ...this.changes[index],
        status,
        updatedAt: 'Just now',
      };

      return Promise.resolve(this.changes[index]);
    }

    return Promise.resolve(undefined);
  }

  async analyzeChange(
    prNumber: number
  ): Promise<Change | undefined> {
    const change = await this.getChangeById(
      String(prNumber)
    );

    if (!change) {
      return undefined;
    }

    const risk = riskService.analyze(change);

    const updatedChange: Change = {
      ...change,

      risk: {
        ...change.risk,
        score: risk.score,
        level: risk.level,
        confidence: risk.confidence,
        summary: risk.summary,
        reasons: risk.reasons,
        factors: risk.factors,
      },
    };

    return updatedChange;
  }

  async generatePolicy(
    prNumber: number
  ): Promise<ReleasePolicyRecommendation | undefined> {
    const change = await this.getChangeById(
      String(prNumber)
    );

    if (!change) {
      return undefined;
    }

    return policyService.generatePolicy(change);
  }

  async evaluateDeploymentTelemetry(
    prNumber: number,
    telemetry: TelemetryInput
  ): Promise<PolicyDecision | undefined> {
    const change = await this.getChangeById(
      String(prNumber)
    );

    if (!change) {
      return undefined;
    }

    const policy = policyService.generatePolicy(change);

    return policyService.evaluateTelemetry(
      telemetry,
      policy
    );
  }
}

export const changesService = new ChangesService();