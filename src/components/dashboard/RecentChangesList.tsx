import React from 'react';
import { Link } from 'react-router-dom';
import { GitPullRequest, ArrowUpRight, Cpu, User } from 'lucide-react';
import { Change } from '../../types/change';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';

interface RecentChangesListProps {
  changes: Change[];
}

export const RecentChangesList: React.FC<RecentChangesListProps> = ({ changes }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Recent Software Changes</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingested PRs and commits scored by the ChangeGuard Risk Engine
          </p>
        </div>
        <Link to="/changes">
          <Button variant="ghost" size="xs" icon={<ArrowUpRight size={13} />} iconPosition="right">
            All Changes
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {changes.slice(0, 5).map(change => (
          <div
            key={change.id}
            className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/changes/${change.id}`}
                  className="font-medium text-xs text-slate-900 hover:text-brand-600 truncate flex items-center gap-1.5"
                >
                  <span className="font-mono text-slate-500 font-semibold">#{change.number}</span>
                  <span className="font-semibold">{change.title}</span>
                </Link>
                {change.author.isAiAgent && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-medium">
                    <Cpu size={10} />
                    AI Agent
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap font-mono">
                <span>{change.repository}</span>
                <span>•</span>
                <span>{change.filesChangedCount} files</span>
                <span>•</span>
                <span className="text-slate-700 font-medium">
                  {change.impact.servicesCount} affected services
                </span>
                <span>•</span>
                <span>{change.createdAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <RiskBadge level={change.risk.level} score={change.risk.score} showScore size="sm" />
              <Link to={`/changes/${change.id}`}>
                <Button variant="secondary" size="xs">
                  Review
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
