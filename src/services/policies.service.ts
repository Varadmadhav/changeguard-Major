import { Policy, PolicyRule } from '../types/policy';
import { mockPolicies } from '../data/mockPolicies';
import { apiClient } from './apiClient';

class PoliciesService {
  private policies: Policy[] = [...mockPolicies];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getPolicies(): Promise<Policy[]> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Policy[] }>('/policies');
        return response.data;
      } catch (err) {
        console.warn('[PoliciesService] Failed to fetch policies from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.policies]);
  }

  async getPolicyById(id: string): Promise<Policy | undefined> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.get<{ data: Policy }>(`/policies/${id}`);
        return response.data;
      } catch (err) {
        console.warn(`[PoliciesService] Failed to fetch policy ${id} from API, falling back to mock:`, err);
      }
    }
    return Promise.resolve(this.policies.find((p) => p.id === id));
  }

  async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.post<{ data: Policy }>('/policies', policyData);
        return response.data;
      } catch (err) {
        console.warn('[PoliciesService] Failed to create policy on API, saving locally:', err);
      }
    }

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
    if (!this.isMockMode()) {
      try {
        const response = await apiClient.put<{ data: Policy }>(`/policies/${id}`, updates);
        return response.data;
      } catch (err) {
        console.warn(`[PoliciesService] Failed to update policy ${id} on API, updating locally:`, err);
      }
    }

    const index = this.policies.findIndex((p) => p.id === id);
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
    const policy = await this.getPolicyById(policyId);
    if (policy) {
      const newRule: PolicyRule = {
        ...rule,
        id: `rule-${Date.now()}`,
      };
      const updatedRules = [...policy.rules, newRule];
      return this.updatePolicy(policyId, { rules: updatedRules });
    }
    return Promise.resolve(undefined);
  }

  async deleteRule(policyId: string, ruleId: string): Promise<Policy | undefined> {
    const policy = await this.getPolicyById(policyId);
    if (policy) {
      const updatedRules = policy.rules.filter((r) => r.id !== ruleId);
      return this.updatePolicy(policyId, { rules: updatedRules });
    }
    return Promise.resolve(undefined);
  }

  async toggleRule(policyId: string, ruleId: string): Promise<Policy | undefined> {
    const policy = await this.getPolicyById(policyId);
    if (policy) {
      const updatedRules = policy.rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
      return this.updatePolicy(policyId, { rules: updatedRules });
    }
    return Promise.resolve(undefined);
  }
}

export const policiesService = new PoliciesService();
