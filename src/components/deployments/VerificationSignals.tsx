import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';
import { VerificationSignal } from '../../types/deployment';
import { cn } from '../../utils/cn';

interface VerificationSignalsProps {
  signals: VerificationSignal[];
}

export const VerificationSignals: React.FC<VerificationSignalsProps> = ({ signals }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
            Autonomous Verification Signals
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Prometheus Telemetry Stream</span>
      </div>

      <div className="space-y-2.5">
        {signals.map(sig => {
          const isPassed = sig.status === 'PASSED';
          const isWarning = sig.status === 'WARNING';
          const isFailed = sig.status === 'FAILED';

          return (
            <div
              key={sig.id}
              className={cn(
                'p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                isFailed
                  ? 'bg-rose-50/70 border-rose-300'
                  : isWarning
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200'
              )}
            >
              {/* Left Title & Description */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="shrink-0 mt-0.5">
                  {isFailed ? (
                    <AlertOctagon size={16} className="text-rose-600 animate-pulse" />
                  ) : isWarning ? (
                    <AlertTriangle size={16} className="text-amber-600" />
                  ) : (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{sig.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold',
                        isFailed
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      )}
                    >
                      {sig.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sig.description}</p>
                </div>
              </div>

              {/* Right Values */}
              <div className="flex items-center gap-4 sm:text-right shrink-0 font-mono text-[11px] pl-6 sm:pl-0">
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT</span>
                  <span
                    className={cn(
                      'font-bold text-xs',
                      isFailed ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-slate-900'
                    )}
                  >
                    {sig.currentValue}
                    {sig.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">THRESHOLD</span>
                  <span className="text-slate-600 font-medium">
                    {sig.operator} {sig.threshold}
                    {sig.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
