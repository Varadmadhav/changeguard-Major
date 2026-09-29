import React from 'react';
import { CheckCircle2, PauseCircle, RotateCcw, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DeploymentStatus } from '../../types/deployment';

interface RolloutProgressBarProps {
  stages: number[]; // [5, 25, 50, 100]
  currentPercentage: number; // 42
  targetPercentage: number;
  status: DeploymentStatus;
}

export const RolloutProgressBar: React.FC<RolloutProgressBarProps> = ({
  stages = [5, 25, 50, 100],
  currentPercentage = 42,
  targetPercentage = 50,
  status,
}) => {
  const isPaused = status === 'PAUSED';
  const isRolledBack = status === 'ROLLED_BACK';
  const isPromoted = status === 'PROMOTED' || currentPercentage === 100;

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Traffic Progression & Canary Stages
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {currentPercentage}% Live Traffic Exposed
            </span>
            {isPaused && (
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                PAUSED AT {currentPercentage}%
              </span>
            )}
            {isRolledBack && (
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                TRAFFIC ROLLED BACK TO 0%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-500">
          <span>Target: <strong className="text-slate-900 font-bold">{targetPercentage}%</strong></span>
          <span>•</span>
          <span>Strategy: <strong className="text-brand-700 font-bold">CANARY</strong></span>
        </div>
      </div>

      {/* Visual Stage Checkpoints */}
      <div className="relative pt-2 pb-1">
        {/* Continuous background bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              isPaused
                ? 'bg-amber-500'
                : isRolledBack
                ? 'bg-rose-500'
                : isPromoted
                ? 'bg-emerald-500'
                : 'bg-brand-600'
            )}
            style={{ width: `${currentPercentage}%` }}
          />
        </div>

        {/* Stage Nodes on top */}
        <div className="flex justify-between items-center mt-3">
          {stages.map((stage) => {
            const isPassed = currentPercentage >= stage;
            const isCurrent = currentPercentage < stage && currentPercentage >= (stage === 25 ? 5 : stage === 50 ? 25 : 50);

            return (
              <div key={stage} className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border transition-colors',
                    isPassed
                      ? 'bg-brand-600 text-white border-brand-700'
                      : isCurrent && isPaused
                      ? 'bg-amber-500 text-white border-amber-600'
                      : isCurrent
                      ? 'bg-blue-100 text-brand-700 border-brand-400 animate-pulse'
                      : 'bg-white text-slate-400 border-slate-300'
                  )}
                >
                  {isPassed ? <CheckCircle2 size={12} /> : `${stage}%`}
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1">Stage {stage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
