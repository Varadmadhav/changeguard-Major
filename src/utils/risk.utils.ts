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

  return clampRiskScore(
    weightedScore / totalWeight
  );
}

/**
 * Calculates the number of unique services affected
 * by the change.
 */
export function calculateAffectedServices(
  change: Change
): number {
  const services =
    change.impact.affectedServices ?? [];

  const uniqueServices = new Set(
    services.map(service => service.name)
  );

  return uniqueServices.size;
}

/**
 * Calculates potential users affected using the
 * blast-radius score of each affected service.
 *
 * Existing user-impact data is used as the baseline
 * when service-level data is unavailable.
 */
export function calculatePotentialUsers(
  change: Change
): number {
  const services =
    change.impact.affectedServices ?? [];

  if (services.length === 0) {
    return change.impact.potentialUsersImpacted;
  }

  const serviceRisk =
    services.reduce(
      (total, service) =>
        total + service.blastRadiusScore,
      0
    );

  const averageServiceRisk =
    serviceRisk / services.length;

  const baselineUsers =
    change.impact.potentialUsersImpacted;

  /*
   * Scale the existing impact estimate according
   * to the calculated service blast radius.
   */
  const calculatedUsers = Math.round(
    baselineUsers *
      Math.min(
        1.5,
        Math.max(
          0.5,
          averageServiceRisk / 60
        )
      )
  );

  return calculatedUsers;
}

export function calculateBlastRadius(
  change: Change
): number {
  const affectedServices =
    calculateAffectedServices(change);

  const potentialUsers =
    calculatePotentialUsers(change);

  const servicesScore =
    Math.min(
      affectedServices * 15,
      45
    );

  const databaseScore =
    Math.min(
      change.impact.databasesCount * 15,
      20
    );

  const userScore =
    Math.min(
      Math.round(
        potentialUsers / 1000
      ),
      25
    );

  const apiScore =
    Math.min(
      change.impact.apisCount * 2,
      10
    );

  return clampRiskScore(
    servicesScore +
      databaseScore +
      userScore +
      apiScore
  );
}