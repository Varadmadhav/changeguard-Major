import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { RiskFactorItem } from '../../types/change';
import { cn } from '../../utils/cn';

interface RiskFactorsListProps {
  factors: RiskFactorItem[];
}

export const RiskFactorsList: React.FC<RiskFactorsListProps> = ({ factors }) => {
  const [expandedId, setExpandedId] = useState<string | null>(factors[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-rose-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Granular Risk Factor Breakdown
        </h3>
        <span className="text-[11px] text-slate-400">Click a factor to inspect analysis</span>
      </div>

      <div className="space-y-2">
        {factors.map(factor => {
          const isExpanded = expandedId === factor.id;
          return (
            <div
              key={factor.id}
              className={cn(
                'border rounded-lg transition-all',
                isExpanded
                  ? 'border-brand-300 bg-blue-50/10 shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <button
                onClick={() => toggleExpand(factor.id)}
                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className="text-xs font-medium text-slate-900 truncate">
                    {factor.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Progress bar */}
                  <div className="w-24 hidden sm:block h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', getBarColor(factor.score))}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>

                  <span
                    className={cn(
                      'text-xs font-mono font-bold px-2 py-0.5 rounded border',
                      getScoreColor(factor.score)
                    )}
                  >
                    {factor.score}%
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 border-t border-slate-100 space-y-2 bg-slate-50/50">
                  <p className="font-medium text-slate-800">{factor.description}</p>
                  {factor.details && factor.details.length > 0 && (
                    <ul className="space-y-1 pl-2 border-l-2 border-slate-200 text-[11px] font-mono text-slate-600">
                      {factor.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-slate-400">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
