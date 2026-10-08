import type {
  RiskLevel,
  RiskFactorItem,
  Change,
} from '../types/change';

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export function clampRiskScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateWeightedRisk(
  factors: RiskFactorItem[]
): number {
  if (factors.length === 0) return 0;

  const weights: Record<RiskFactorItem['weight'], number> = {
    LOW: 1,
    MEDIUM: 1.25,
    HIGH: 1.5,
    CRITICAL: 2,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    const weight = weights[factor.weight];

    weightedScore += factor.score * weight;
    totalWeight += weight;
  }

  return clampRiskScore(weightedScore / totalWeight);
}

export function calculateBlastRadius(change: Change): number {
  const servicesScore =
    Math.min(change.impact.servicesCount * 15, 45);

  const databaseScore =
    Math.min(change.impact.databasesCount * 15, 20);

  const userScore =
    Math.min(
      Math.round(change.impact.potentialUsersImpacted / 1000),
      25
    );

  const apiScore =
    Math.min(change.impact.apisCount * 2, 10);

  return clampRiskScore(
    servicesScore +
      databaseScore +
      userScore +
      apiScore
  );
}