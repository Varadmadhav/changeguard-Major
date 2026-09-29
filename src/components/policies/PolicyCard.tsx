import React from 'react';
import { Scale, ShieldCheck, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Policy } from '../../types/policy';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface PolicyCardProps {
  policy: Policy;
  onEdit: (policy: Policy) => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onEdit }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4 hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{policy.name}</h3>
            <span
              className={cn(
                'px-2 py-0.2 rounded-full text-[10px] font-mono font-medium border',
                policy.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {policy.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{policy.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="xs" icon={<Edit size={12} />} onClick={() => onEdit(policy)}>
            Configure
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-700 block">
          Enforced Policy Rules ({policy.rulesCount})
        </span>

        <div className="space-y-1.5">
          {policy.rules.map(rule => (
            <div
              key={rule.id}
              className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                <span className="font-medium text-slate-900">{rule.conditionName}</span>
                <span className="font-mono text-[11px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  {rule.field} {rule.operator} {rule.thresholdValue}
                  {rule.unit}
                </span>
              </div>

              <span className="font-mono text-[11px] font-bold text-brand-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                → {rule.action.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Environment: <strong className="text-slate-700 font-semibold">{policy.environment}</strong></span>
        <span>Updated: {policy.lastUpdatedAt} by {policy.updatedBy}</span>
      </div>
    </div>
  );
};
