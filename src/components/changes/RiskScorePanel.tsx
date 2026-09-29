import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import { RiskLevel } from '../../types/change';
import { AlertOctagon, CheckCircle2, Plus, Sparkles, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RiskScorePanelProps {
  score: number; // 78
  level: RiskLevel; // HIGH
  confidence: number; // 91%
  reasons: string[];
}

export const RiskScorePanel: React.FC<RiskScorePanelProps> = ({
  score,
  level,
  confidence,
  reasons,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Change Risk Assessment
        </span>
        <span className="text-xs font-mono text-slate-500">
          Confidence <strong className="text-slate-900 font-semibold">{confidence}%</strong>
        </span>
      </div>

      {/* Main Score Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/60 rounded-lg">
        <div>
          <span className="text-xs font-medium text-slate-500 block">Deployment Risk Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{score}</span>
            <span className="text-sm font-mono text-slate-400 font-medium">/ 100</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <RiskBadge level={level} size="md" />
          <span className="text-[11px] text-slate-500 font-mono">
            {score >= 70 ? 'High probability of release friction' : 'Safe to release under standard policy'}
          </span>
        </div>
      </div>

      {/* Primary Risk Reasons */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-700 block">
          Identified Risk Drivers & Factors
        </span>
        <div className="space-y-1.5">
          {reasons.map((reason, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2 rounded-md bg-white border border-slate-200/60 text-xs text-slate-700"
            >
              <span className="text-orange-600 font-mono font-bold shrink-0 mt-0.5">+</span>
              <span className="leading-relaxed font-medium">{reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
