export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ChangeStatus =
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'POLICY_BLOCKED'
  | 'CANARY_RECOMMENDED'
  | 'DEPLOYED'
  | 'REJECTED';

export type ChangeType = 'PULL_REQUEST' | 'COMMIT' | 'INFRASTRUCTURE' | 'AI_GENERATED';

export interface RiskFactorItem {
  id: string;
  name: string;
  score: number; // 0-100%
  weight: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details: string[];
}

export interface HistoricalChange {
  id: string;
  prNumber: number;
  title: string;
  repository: string;
  risk: RiskLevel;
  outcome: 'SUCCESSFUL' | 'ROLLBACK' | 'INCIDENT' | 'PAUSED';
  similarityPercentage: number;
  date: string;
  summary: string;
}

export interface AffectedServiceItem {
  id: string;
  name: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  relationship: 'DIRECT' | 'UPSTREAM' | 'DOWNSTREAM' | 'DATABASE';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  currentErrorRate: string;
  blastRadiusScore: number;
}

export interface DiffFile {
  filename: string;
  status: 'MODIFIED' | 'ADDED' | 'DELETED';
  additions: number;
  deletions: number;
  riskHighlights: string[];
  chunks: {
    header: string;
    lines: {
      type: 'context' | 'add' | 'delete';
      text: string;
      lineNumber?: { old?: number; new?: number };
    }[];
  }[];
}

export interface ReleasePolicyRecommendation {
  strategy: 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';
  stages: number[]; // e.g. [5, 25, 50, 100]
  verificationWindowMinutes: number;
  requiredSignals: {
    name: string;
    metric: string;
    operator: '<' | '>' | '<=' | '>=';
    threshold: string;
    targetValue: string;
  }[];
  humanApprovalRequired: boolean;
  approvalReason?: string;
  suggestedAction: 'APPROVE_POLICY' | 'MODIFY_POLICY' | 'BLOCK';
}

export interface Change {
  id: string;
  number: number;
  title: string;
  type: ChangeType;
  author: {
    name: string;
    username: string;
    avatar: string;
    isAiAgent?: boolean;
    agentName?: string;
  };
  repository: string;
  branch: {
    source: string;
    target: string;
  };
  commitHash: string;
  risk: {
    score: number; // 0-100
    level: RiskLevel;
    confidence: number; // 0-100
    summary: string;
    reasons: string[];
    factors: RiskFactorItem[];
  };
  analysis: {
    overview: string;
    technicalDetails: string;
    identifiedRisks: string[];
    recommendedVerification: string;
    generatedAt: string;
  };
  impact: {
    servicesCount: number;
    databasesCount: number;
    apisCount: number;
    potentialUsersImpacted: number;
    dependencyChain: string[];
    affectedServices: AffectedServiceItem[];
  };
  historicalSimilarity: HistoricalChange[];
  policyRecommendation: ReleasePolicyRecommendation;
  filesChangedCount: number;
  additions: number;
  deletions: number;
  status: ChangeStatus;
  createdAt: string;
  updatedAt: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  diffs?: DiffFile[];
}
