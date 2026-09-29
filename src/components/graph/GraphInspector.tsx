import React from 'react';
import { Link } from 'react-router-dom';
import { X, Layers, Database, Server, Radio, ArrowDown, ArrowUp, ArrowRight, Activity } from 'lucide-react';
import { GraphNodeData } from '../../data/mockGraph';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface GraphInspectorProps {
  node: GraphNodeData | null;
  onClose: () => void;
}

export const GraphInspector: React.FC<GraphInspectorProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-card p-5 shadow-dropdown space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-slate-400 font-semibold">
            <span>{node.type}</span>
            <span>•</span>
            <span>{node.tier}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{node.label}</h3>
          <p className="text-xs text-slate-500 font-mono">{node.sublabel}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Risk & Health Metrics */}
      <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Node Health:</span>
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                node.status === 'HEALTHY'
                  ? 'bg-emerald-500'
                  : node.status === 'WARNING'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              )}
            />
            {node.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Change Risk Score:</span>
          <RiskBadge level={node.risk} score={node.riskScore} showScore size="sm" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Owner Team:</span>
          <span className="font-medium text-slate-800">{node.owner}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Incidents:</span>
          <span className="font-mono text-slate-800 font-bold">{node.incidents}</span>
        </div>
      </div>

      {/* Downstream Dependencies */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <ArrowDown size={12} className="text-brand-600" />
          <span>Dependencies ({node.dependencies.length})</span>
        </span>
        <div className="space-y-1">
          {node.dependencies.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">No downstream dependencies</span>
          ) : (
            node.dependencies.map((dep, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded text-[11px] font-mono text-slate-700"
              >
                {dep}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upstream Dependents */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <ArrowUp size={12} className="text-emerald-600" />
          <span>Dependents ({node.dependents.length})</span>
        </span>
        <div className="space-y-1">
          {node.dependents.length === 0 ? (
            <span className="text-[11px] text-slate-400 italic">Root Gateway / No dependents</span>
          ) : (
            node.dependents.map((dep, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded text-[11px] font-mono text-slate-700"
              >
                {dep}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Last Deployment & Action */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="text-[11px] text-slate-500 font-mono">
          <span className="block text-slate-400">LAST RELEASE:</span>
          <span>{node.lastDeployment}</span>
        </div>

        {node.id.startsWith('srv-') && (
          <Link to={`/services/${node.id}`} className="block">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              icon={<ArrowRight size={13} />}
              iconPosition="right"
            >
              Open Service Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
