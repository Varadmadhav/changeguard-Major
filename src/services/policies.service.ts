import { Policy, PolicyRule } from '../types/policy';
import { mockPolicies } from '../data/mockPolicies';

class PoliciesService {
  private policies: Policy[] = [...mockPolicies];

  async getPolicies(): Promise<Policy[]> {
    // Simulates GET /api/policies
    return Promise.resolve([...this.policies]);
  }

  async getPolicyById(id: string): Promise<Policy | undefined> {
    // Simulates GET /api/policies/:id
    return Promise.resolve(this.policies.find(p => p.id === id));
  }

  async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    // Simulates POST /api/policies
    const newPolicy: Policy = {
      id: `pol-${Date.now()}`,
      name: policyData.name || 'Custom Safety Policy',
      description: policyData.description || 'Custom release safety rule definitions.',
      environment: policyData.environment || 'PRODUCTION',
      tierScope: policyData.tierScope || 'ALL',
      status: 'ACTIVE',
      rulesCount: (policyData.rules || []).length,
      rules: policyData.rules || [],
      lastUpdatedAt: 'Just now',
      updatedBy: 'Alex Morgan',
      owner: 'Platform Engineering Team',
      enforcementMode: policyData.enforcementMode || 'ENFORCING',
    };
    this.policies.push(newPolicy);
    return Promise.resolve(newPolicy);
  }

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy | undefined> {
    // Simulates PUT /api/policies/:id
    const index = this.policies.findIndex(p => p.id === id);
    if (index !== -1) {
      this.policies[index] = {
        ...this.policies[index],
        ...updates,
        rulesCount: updates.rules ? updates.rules.length : this.policies[index].rulesCount,
        lastUpdatedAt: 'Just now',
        updatedBy: 'Alex Morgan',
      };
      return Promise.resolve(this.policies[index]);
    }
    return Promise.resolve(undefined);
  }

  async addRule(policyId: string, rule: Omit<PolicyRule, 'id'>): Promise<Policy | undefined> {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) {
      const newRule: PolicyRule = {
        ...rule,
        id: `rule-${Date.now()}`,
      };
      policy.rules.push(newRule);
      policy.rulesCount = policy.rules.length;
      policy.lastUpdatedAt = 'Just now';
      return Promise.resolve({ ...policy });
    }
    return Promise.resolve(undefined);
  }

  async deleteRule(policyId: string, ruleId: string): Promise<Policy | undefined> {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) {
      policy.rules = policy.rules.filter(r => r.id !== ruleId);
      policy.rulesCount = policy.rules.length;
      policy.lastUpdatedAt = 'Just now';
      return Promise.resolve({ ...policy });
    }
    return Promise.resolve(undefined);
  }
}

export const policiesService = new PoliciesService();
