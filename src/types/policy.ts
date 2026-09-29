export type PolicyAction =
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'REQUIRE_CANARY'
  | 'PAUSE_ROLLOUT'
  | 'ROLLBACK_DEPLOYMENT'
  | 'BLOCK_MERGE'
  | 'RESTRICT_OFF_PEAK_ONLY';

export interface PolicyRule {
  id: string;
  conditionName: string;
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | 'contains';
  thresholdValue: string | number;
  unit?: string;
  action: PolicyAction;
  actionDescription: string;
  enabled: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  environment: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  rulesCount: number;
  rules: PolicyRule[];
  lastUpdatedAt: string;
  updatedBy: string;
  owner: string;
  enforcementMode: 'ENFORCING' | 'DRY_RUN';
}
