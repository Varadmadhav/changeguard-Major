import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Deployment } from '../../types/deployment';
import { RiskBadge } from '../common/RiskBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface DeploymentTableProps {
  deployments: Deployment[];
}

export const DeploymentTable: React.FC<DeploymentTableProps> = ({ deployments }) => {
  if (deployments.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-card p-12 text-center shadow-card">
        <Rocket size={32} className="mx-auto text-slate-300 mb-3" />
        <h4 className="text-sm font-semibold text-slate-800">No deployments found</h4>
        <p className="text-xs text-slate-500 mt-1">There are no deployments in this category.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
            <tr>
              <th className="py-3 px-4">Deployment</th>
              <th className="py-3 px-3">Service</th>
              <th className="py-3 px-3">Version</th>
              <th className="py-3 px-3">Risk Assessment</th>
              <th className="py-3 px-3">Canary Progress</th>
              <th className="py-3 px-3">Health Status</th>
              <th className="py-3 px-3">Strategy</th>
              <th className="py-3 px-3">Started</th>
              <th className="py-3 px-4 text-right">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {deployments.map(dep => (
              <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors group">
                {/* Deployment / Commit */}
                <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[240px]">
                  <Link
                    to={`/deployments/${dep.id}`}
                    className="hover:text-brand-600 block group-hover:text-brand-600 transition-colors"
                  >
                    <div className="font-semibold text-slate-900 line-clamp-1">{dep.changeTitle}</div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      by {dep.changeAuthor} • {dep.commitHash}
                    </div>
                  </Link>
                </td>

                {/* Service */}
                <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">
                  <Link to={`/services/${dep.serviceId}`} className="hover:text-brand-600">
                    {dep.serviceName}
                  </Link>
                </td>

                {/* Version */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono font-medium text-slate-700">
                  <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200/60">
                    {dep.version}
                  </span>
                </td>

                {/* Risk */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <RiskBadge level={dep.risk.level} score={dep.risk.score} size="sm" />
                </td>

                {/* Progress */}
                <td className="py-3.5 px-3 min-w-[140px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-900 font-bold">{dep.currentTrafficPercentage}%</span>
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

                {/* Health */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <StatusBadge status={dep.status} size="sm" />
                </td>

                {/* Strategy */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                  {dep.strategy}
                </td>

                {/* Started */}
                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                  {dep.startedAt}
                </td>

                {/* Control Action */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link to={`/deployments/${dep.id}`}>
                    <Button variant="secondary" size="xs">
                      Control Room
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
