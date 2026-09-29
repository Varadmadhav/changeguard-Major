import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Plus, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Policy, PolicyRule, PolicyAction } from '../../types/policy';

interface PolicyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy?: Policy | null;
  onSave: (policyData: Partial<Policy>) => void;
}

export const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSave,
}) => {
  const [name, setName] = useState(policy?.name || 'Production Guardrail Policy');
  const [description, setDescription] = useState(policy?.description || 'Enforce release safety thresholds.');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'ALL'>(policy?.environment || 'PRODUCTION');
  const [tierScope, setTierScope] = useState<'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES'>(policy?.tierScope || 'ALL');
  const [rules, setRules] = useState<PolicyRule[]>(
    policy?.rules || [
      {
        id: 'r-1',
        conditionName: 'Risk Score Human Approval Gate',
        field: 'risk_score',
        operator: '>',
        thresholdValue: 80,
        unit: 'Score',
        action: 'REQUIRE_HUMAN_APPROVAL',
        actionDescription: 'Require manual signoff for high risk changes',
        enabled: true,
      },
      {
        id: 'r-2',
        conditionName: 'Canary Threshold',
        field: 'risk_score',
        operator: '>',
        thresholdValue: 60,
        unit: 'Score',
        action: 'REQUIRE_CANARY',
        actionDescription: 'Require multi-stage canary rollout',
        enabled: true,
      },
      {
        id: 'r-3',
        conditionName: 'Telemetry Anomaly Pause',
        field: 'error_rate',
        operator: '>',
        thresholdValue: 2.0,
        unit: '%',
        action: 'PAUSE_ROLLOUT',
        actionDescription: 'Automatically pause canary traffic progression',
        enabled: true,
      },
      {
        id: 'r-4',
        conditionName: 'Critical Breach Rollback',
        field: 'error_rate',
        operator: '>',
        thresholdValue: 5.0,
        unit: '%',
        action: 'ROLLBACK_DEPLOYMENT',
        actionDescription: 'Execute automated rollback to previous revision',
        enabled: true,
      },
    ]
  );

  const handleAddRule = () => {
    const newRule: PolicyRule = {
      id: `rule-${Date.now()}`,
      conditionName: 'New Telemetry Threshold',
      field: 'error_rate',
      operator: '>',
      thresholdValue: 3.0,
      unit: '%',
      action: 'PAUSE_ROLLOUT',
      actionDescription: 'Pause rollout when breached',
      enabled: true,
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleRuleChange = (id: string, field: keyof PolicyRule, val: any) => {
    setRules(rules.map(r => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      environment,
      tierScope,
      rules,
      rulesCount: rules.length,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={policy ? `Edit Policy: ${policy.name}` : 'Create New Release Safety Policy'}
      description="Configure automated safety gates, canary thresholds, and autonomous rollback triggers."
      maxWidth="3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Policy Guardrails
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Policy Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
              required
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="PRODUCTION">Production</option>
              <option value="STAGING">Staging</option>
              <option value="ALL">All Environments</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Policy Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
          />
        </div>

        {/* Rules Table / Builder */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-xs">
              Policy Rule Evaluation Triggers ({rules.length})
            </span>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              icon={<Plus size={12} />}
              onClick={handleAddRule}
            >
              Add Rule Condition
            </Button>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
            {rules.map((rule, idx) => (
              <div
                key={rule.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-400 block">Condition</label>
                    <input
                      type="text"
                      value={rule.conditionName}
                      onChange={e => handleRuleChange(rule.id, 'conditionName', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">Metric / Field</label>
                    <select
                      value={rule.field}
                      onChange={e => handleRuleChange(rule.id, 'field', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="risk_score">Risk Score</option>
                      <option value="error_rate">Error Rate (%)</option>
                      <option value="p95_latency">P95 Latency (ms)</option>
                      <option value="has_db_migration">DB Migration</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">Operator & Threshold</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={rule.operator}
                        onChange={e => handleRuleChange(rule.id, 'operator', e.target.value)}
                        className="w-14 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-mono"
                      >
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">==</option>
                      </select>
                      <input
                        type="text"
                        value={rule.thresholdValue}
                        onChange={e => handleRuleChange(rule.id, 'thresholdValue', e.target.value)}
                        className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">Enforcement Action</label>
                    <select
                      value={rule.action}
                      onChange={e => handleRuleChange(rule.id, 'action', e.target.value as PolicyAction)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-brand-700"
                    >
                      <option value="REQUIRE_HUMAN_APPROVAL">Require Human Signoff</option>
                      <option value="REQUIRE_CANARY">Mandate Canary</option>
                      <option value="PAUSE_ROLLOUT">Pause Rollout</option>
                      <option value="ROLLBACK_DEPLOYMENT">Auto Rollback</option>
                      <option value="BLOCK_MERGE">Block PR Merge</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveRule(rule.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-white transition-colors self-end sm:self-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
