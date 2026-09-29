import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowUpRight, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { Service } from '../../types/service';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface ServiceTableProps {
  services: Service[];
}

export const ServiceTable: React.FC<ServiceTableProps> = ({ services }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
            <tr>
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-3">Tier</th>
              <th className="py-3 px-3">Health Status</th>
              <th className="py-3 px-3">Deployment Risk</th>
              <th className="py-3 px-3">Deployments</th>
              <th className="py-3 px-3">Incidents</th>
              <th className="py-3 px-3">Owner Team</th>
              <th className="py-3 px-3">Last Release</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {services.map(srv => (
              <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-3.5 px-4 font-medium text-slate-900">
                  <Link
                    to={`/services/${srv.id}`}
                    className="hover:text-brand-600 block group-hover:text-brand-600 transition-colors"
                  >
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{srv.name}</span>
                      {srv.activeDeploymentsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Active canary rollout in progress" />
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {srv.repository}
                    </div>
                  </Link>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px]">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded border font-medium',
                      srv.tier === 'TIER_1'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : srv.tier === 'TIER_2'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    )}
                  >
                    {srv.tier}
                  </span>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {srv.uptimePercentage}% Uptime
                  </span>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap">
                  <RiskBadge level={srv.currentRisk} score={srv.riskScore} size="sm" />
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-700">
                  {srv.deploymentsCount} releases
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                  {srv.incidentsCount > 0 ? (
                    <span className="text-rose-600 font-bold">{srv.incidentsCount} incident</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                  {srv.owner.team}
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                  <div>{srv.lastDeploymentVersion}</div>
                  <div className="text-[10px] text-slate-400">{srv.lastDeploymentAt}</div>
                </td>

                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link to={`/services/${srv.id}`}>
                    <Button variant="secondary" size="xs">
                      Inspect
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
