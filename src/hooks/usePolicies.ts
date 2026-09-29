import { useState, useEffect } from 'react';
import { Policy, PolicyRule } from '../types/policy';
import { policiesService } from '../services/policies.service';

export function usePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const list = await policiesService.getPolicies();
    setPolicies(list);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const addRule = async (policyId: string, rule: Omit<PolicyRule, 'id'>) => {
    const updated = await policiesService.addRule(policyId, rule);
    if (updated) {
      setPolicies(prev => prev.map(p => (p.id === policyId ? updated : p)));
    }
  };

  const deleteRule = async (policyId: string, ruleId: string) => {
    const updated = await policiesService.deleteRule(policyId, ruleId);
    if (updated) {
      setPolicies(prev => prev.map(p => (p.id === policyId ? updated : p)));
    }
  };

  const updatePolicy = async (id: string, updates: Partial<Policy>) => {
    const updated = await policiesService.updatePolicy(id, updates);
    if (updated) {
      setPolicies(prev => prev.map(p => (p.id === id ? updated : p)));
    }
  };

  return {
    policies,
    loading,
    addRule,
    deleteRule,
    updatePolicy,
    reload,
  };
}
