import { PolicyAction, PolicyRule } from '../types/shared.js';

export interface EvaluationContext {
  risk_score?: number;
  error_rate?: number;
  p95_latency?: number;
  has_db_migration?: boolean;
  change_size_lines?: number;
  freeze_window_active?: boolean;
  container_restart_count?: number;
  test_coverage?: number;
  environment?: string;
  service_tier?: string;
  [key: string]: any;
}

export interface RuleEvaluationResult {
  ruleId: string;
  conditionName: string;
  matched: boolean;
  field: string;
  actualValue: any;
  operator: string;
  thresholdValue: any;
  action: PolicyAction;
  actionDescription: string;
}

export interface PolicyEvaluationOutput {
  policyId: string;
  policyName: string;
  enforcementMode: 'ENFORCING' | 'DRY_RUN';
  matchedRules: RuleEvaluationResult[];
  unmatchedRules: RuleEvaluationResult[];
  actions: PolicyAction[];
  isApprovalRequired: boolean;
  isCanaryRequired: boolean;
  isBlocked: boolean;
  isPauseTriggered: boolean;
  isRollbackTriggered: boolean;
  summary: string;
}

export class PolicyEngine {
  public static evaluateRule(rule: PolicyRule, context: EvaluationContext): RuleEvaluationResult {
    const actual = context[rule.field];
    const threshold = rule.thresholdValue;
    let matched = false;

    if (actual !== undefined && actual !== null) {
      const numActual = typeof actual === 'number' ? actual : parseFloat(String(actual));
      const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

      switch (rule.operator) {
        case '>':
          matched = !isNaN(numActual) && !isNaN(numThreshold) && numActual > numThreshold;
          break;
        case '>=':
          matched = !isNaN(numActual) && !isNaN(numThreshold) && numActual >= numThreshold;
          break;
        case '<':
          matched = !isNaN(numActual) && !isNaN(numThreshold) && numActual < numThreshold;
          break;
        case '<=':
          matched = !isNaN(numActual) && !isNaN(numThreshold) && numActual <= numThreshold;
          break;
        case '==':
          matched = String(actual).toLowerCase() === String(threshold).toLowerCase();
          break;
        case 'contains':
          matched = String(actual).toLowerCase().includes(String(threshold).toLowerCase());
          break;
      }
    }

    return {
      ruleId: rule.id,
      conditionName: rule.conditionName,
      matched: rule.enabled && matched,
      field: rule.field,
      actualValue: actual,
      operator: rule.operator,
      thresholdValue: threshold,
      action: rule.action,
      actionDescription: rule.actionDescription,
    };
  }

  public static evaluatePolicy(
    policy: {
      id: string;
      name: string;
      enforcementMode: 'ENFORCING' | 'DRY_RUN';
      rules: PolicyRule[];
    },
    context: EvaluationContext
  ): PolicyEvaluationOutput {
    const matchedRules: RuleEvaluationResult[] = [];
    const unmatchedRules: RuleEvaluationResult[] = [];
    const actionSet = new Set<PolicyAction>();

    for (const rule of policy.rules) {
      const res = this.evaluateRule(rule, context);
      if (res.matched) {
        matchedRules.push(res);
        actionSet.add(rule.action);
      } else {
        unmatchedRules.push(res);
      }
    }

    const actions = Array.from(actionSet);
    const isDryRun = policy.enforcementMode === 'DRY_RUN';

    const isApprovalRequired = actions.includes('REQUIRE_HUMAN_APPROVAL');
    const isCanaryRequired = actions.includes('REQUIRE_CANARY');
    const isBlocked = actions.includes('BLOCK_MERGE');
    const isPauseTriggered = actions.includes('PAUSE_ROLLOUT');
    const isRollbackTriggered = actions.includes('ROLLBACK_DEPLOYMENT');

    const summary = matchedRules.length > 0
      ? `Policy '${policy.name}' (${policy.enforcementMode}): matched ${matchedRules.length} rule(s) requiring actions: [${actions.join(', ')}]`
      : `Policy '${policy.name}': all safety conditions satisfied; no restrictive actions mandated.`;

    return {
      policyId: policy.id,
      policyName: policy.name,
      enforcementMode: policy.enforcementMode,
      matchedRules,
      unmatchedRules,
      actions: isDryRun ? [] : actions, // In DRY_RUN mode, no actions are executed
      isApprovalRequired: !isDryRun && isApprovalRequired,
      isCanaryRequired: !isDryRun && isCanaryRequired,
      isBlocked: !isDryRun && isBlocked,
      isPauseTriggered: !isDryRun && isPauseTriggered,
      isRollbackTriggered: !isDryRun && isRollbackTriggered,
      summary,
    };
  }
}
