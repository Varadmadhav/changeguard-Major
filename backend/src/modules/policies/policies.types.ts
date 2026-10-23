import { Policy, PolicyRule, PolicyVersion } from '../../types/shared.js';

export interface CreatePolicyBody {
  name: string;
  description?: string;
  environment?: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope?: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  enforcementMode?: 'ENFORCING' | 'DRY_RUN';
  owner?: string;
  rules: PolicyRule[];
}

export interface UpdatePolicyBody {
  name?: string;
  description?: string;
  environment?: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope?: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  enforcementMode?: 'ENFORCING' | 'DRY_RUN';
  owner?: string;
  rules?: PolicyRule[];
}

export type PolicyRecord = Policy;
export type PolicyVersionRecord = PolicyVersion;
