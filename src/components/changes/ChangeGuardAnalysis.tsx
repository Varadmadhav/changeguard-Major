import React from 'react';
import { ShieldCheck, AlertCircle, ArrowRight, CheckCircle, Terminal } from 'lucide-react';

interface ChangeGuardAnalysisProps {
  overview: string;
  technicalDetails: string;
  identifiedRisks: string[];
  recommendedVerification: string;
  generatedAt?: string;
}

export const ChangeGuardAnalysis: React.FC<ChangeGuardAnalysisProps> = ({
  overview,
  technicalDetails,
  identifiedRisks,
  recommendedVerification,
  generatedAt,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-brand-600 text-white flex items-center justify-center text-xs">
            <ShieldCheck size={13} strokeWidth={2.5} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
            ChangeGuard Analysis
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Deterministic Engine</span>
      </div>

      {/* Main Analysis Prose */}
      <div className="space-y-3 text-xs leading-relaxed text-slate-700">
        <p className="font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
          {overview}
        </p>

        <p className="text-slate-600">
          {technicalDetails}
        </p>
      </div>

      {/* Identified Critical Risks */}
      {identifiedRisks && identifiedRisks.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider font-mono">
            Identified Failure Mechanisms
          </span>
          <div className="space-y-1">
            {identifiedRisks.map((risk, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-700 bg-rose-50/40 border border-rose-200/60 p-2 rounded-md"
              >
                <AlertCircle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Verification */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
        <span className="font-semibold text-brand-800 font-mono uppercase tracking-wider text-[11px] block">
          Recommended Safe Verification Path
        </span>
        <p className="text-brand-900 font-medium leading-relaxed">
          {recommendedVerification}
        </p>
      </div>
    </div>
  );
};
