import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowRight, Database, History, GitPullRequest } from 'lucide-react';
import { Button } from '../common/Button';
import { RiskBadge } from '../common/RiskBadge';

export const AttentionPanel: React.FC = () => {
  return (
    <div className="bg-white border-2 border-orange-300 rounded-card p-4 sm:p-5 shadow-sm relative overflow-hidden bg-gradient-to-r from-orange-50/40 via-white to-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Warning Header & Context */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <RiskBadge level="HIGH" score={78} showScore size="sm" />
            <span className="text-xs font-mono font-medium text-slate-500">
              PR #1824 • acme/checkout-service
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Optimize checkout query & persist idempotency keys
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              ChangeGuard identified elevated deployment risk. This change introduces an exclusive table lock migration and affects downstream payment processing.
            </p>
          </div>

          {/* Key Risk Signals in clean technical pill badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 shadow-2xs">
              <Database size={13} className="text-orange-600" />
              <span className="font-medium">Database migration detected</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 shadow-2xs">
              <History size={13} className="text-orange-600" />
              <span className="font-medium">Historical similarity: 2 previous rollbacks</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-brand-700 font-medium">
              <span>Recommended strategy: 5% Canary (10m window)</span>
            </div>
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
          <Link to="/changes/pr-1824">
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight size={14} />}
              iconPosition="right"
              className="w-full sm:w-auto"
            >
              Review Change & Safety Policy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
