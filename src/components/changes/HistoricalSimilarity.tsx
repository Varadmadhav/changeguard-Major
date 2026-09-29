import React from 'react';
import { History, ArrowUpRight, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { HistoricalChange } from '../../types/change';
import { RiskBadge } from '../common/RiskBadge';
import { cn } from '../../utils/cn';

interface HistoricalSimilarityProps {
  historicalChanges: HistoricalChange[];
}

export const HistoricalSimilarity: React.FC<HistoricalSimilarityProps> = ({ historicalChanges }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History size={15} className="text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
            Similar Historical Changes & Production Outcomes
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Embedding Match</span>
      </div>

      <div className="space-y-3">
        {historicalChanges.map(change => (
          <div
            key={change.id}
            className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-lg space-y-2 hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-xs text-slate-900">
                  PR #{change.prNumber}
                </span>
                <span className="text-xs font-medium text-slate-800 line-clamp-1">
                  {change.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-brand-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {change.similarityPercentage}% Similarity
                </span>
                <RiskBadge level={change.risk} size="sm" />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{change.summary}</p>

            <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200/50">
              <span className="text-slate-400 font-mono">{change.date}</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-500">Historical Outcome:</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full font-mono text-[10px] flex items-center gap-1',
                    change.outcome === 'SUCCESSFUL'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : change.outcome === 'ROLLBACK'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  )}
                >
                  {change.outcome === 'SUCCESSFUL' ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <RotateCcw size={10} />
                  )}
                  {change.outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
