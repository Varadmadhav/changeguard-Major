import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Deployment } from '../../types/deployment';
import { RiskBadge } from '../common/RiskBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface ActiveRolloutsTableProps {
  deployments: Deployment[];
}

export const ActiveRolloutsTable: React.FC<ActiveRolloutsTableProps> = ({ deployments }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Active Progressive Rollouts</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Canary and staged deployments currently evaluating production telemetry
          </p>
        </div>
        <Link to="/deployments">
          <Button variant="ghost" size="xs" icon={<ArrowUpRight size={13} />} iconPosition="right">
            View All
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
            <tr>
              <th className="py-2.5 px-4">Service</th>
              <th className="py-2.5 px-3">Version</th>
              <th className="py-2.5 px-3">Environment</th>
              <th className="py-2.5 px-3">Progress</th>
              <th className="py-2.5 px-3">Risk</th>
              <th className="py-2.5 px-3">Health</th>
              <th className="py-2.5 px-3">Started</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {deployments.map(dep => (
              <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-3 px-4 font-medium text-slate-900">
                  <Link
                    to={`/deployments/${dep.id}`}
                    className="hover:text-brand-600 flex items-center gap-1.5"
                  >
                    <span>{dep.serviceName}</span>
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200/60">
                      {dep.serviceTier}
                    </span>
                  </Link>
                </td>
                <td className="py-3 px-3 font-mono font-medium text-slate-700">{dep.version}</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        dep.environment === 'PRODUCTION' ? 'bg-emerald-500' : 'bg-amber-500'
                      )}
                    />
                    {dep.environment}
                  </span>
                </td>
                <td className="py-3 px-3 min-w-[140px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-900 font-semibold">{dep.currentTrafficPercentage}%</span>
                      <span className="text-slate-400">Target {dep.targetTrafficPercentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          dep.status === 'PAUSED'
                            ? 'bg-amber-500'
                            : dep.status === 'ROLLED_BACK'
                            ? 'bg-rose-500'
                            : dep.currentTrafficPercentage === 100
                            ? 'bg-emerald-500'
                            : 'bg-brand-600'
                        )}
                        style={{ width: `${dep.currentTrafficPercentage}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <RiskBadge level={dep.risk.level} score={dep.risk.score} size="sm" />
                </td>
                <td className="py-3 px-3">
                  <StatusBadge status={dep.status} size="sm" />
                </td>
                <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                  {dep.startedAt}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link to={`/deployments/${dep.id}`}>
                    <Button variant="secondary" size="xs">
                      View Control
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
