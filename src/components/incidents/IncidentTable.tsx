import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Incident } from '../../types/incident';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface IncidentTableProps {
  incidents: Incident[];
}

export const IncidentTable: React.FC<IncidentTableProps> = ({ incidents }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
            <tr>
              <th className="py-3 px-4">Incident</th>
              <th className="py-3 px-3">Severity</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Affected Services</th>
              <th className="py-3 px-3">Related Deployment</th>
              <th className="py-3 px-3">Duration / Started</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {incidents.map(inc => (
              <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[280px]">
                  <Link
                    to={`/incidents/${inc.id}`}
                    className="hover:text-brand-600 block group-hover:text-brand-600 transition-colors"
                  >
                    <span className="font-mono text-xs font-bold text-slate-500 block mb-0.5">
                      {inc.code}
                    </span>
                    <span className="font-semibold text-slate-900">{inc.title}</span>
                  </Link>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs font-bold">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded border',
                      inc.severity === 'SEV-1'
                        ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                        : inc.severity === 'SEV-2'
                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    )}
                  >
                    {inc.severity}
                  </span>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium font-mono',
                      inc.status === 'INVESTIGATING'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : inc.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        inc.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                      )}
                    />
                    {inc.status}
                  </span>
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                  {inc.affectedServices.join(', ')}
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px]">
                  {inc.relatedDeploymentId ? (
                    <Link
                      to={`/deployments/${inc.relatedDeploymentId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {inc.relatedDeploymentVersion || inc.relatedDeploymentId}
                    </Link>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>

                <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                  <div>{inc.durationFormatted}</div>
                  <div className="text-[10px] text-slate-400">{inc.startedAt}</div>
                </td>

                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link to={`/incidents/${inc.id}`}>
                    <Button variant="secondary" size="xs">
                      Postmortem
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
