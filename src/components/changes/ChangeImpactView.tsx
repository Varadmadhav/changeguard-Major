import React from 'react';
import { ArrowDown, Database, Server, Radio, Users, Layers } from 'lucide-react';
import { AffectedServiceItem } from '../../types/change';
import { cn } from '../../utils/cn';

interface ChangeImpactViewProps {
  servicesCount: number;
  databasesCount: number;
  apisCount: number;
  potentialUsers: number;
  dependencyChain: string[];
  affectedServices: AffectedServiceItem[];
}

export const ChangeImpactView: React.FC<ChangeImpactViewProps> = ({
  servicesCount,
  databasesCount,
  apisCount,
  potentialUsers,
  dependencyChain,
  affectedServices,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Potential Impact & Blast Radius
        </h3>
        <span className="text-[11px] font-mono text-slate-400">Topology Map v2.4</span>
      </div>

      {/* Blast Radius KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg">
          <span className="text-[11px] text-slate-500 font-medium block">Affected Services</span>
          <span className="text-xl font-bold font-mono text-slate-900">{servicesCount}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg">
          <span className="text-[11px] text-slate-500 font-medium block">Affected Databases</span>
          <span className="text-xl font-bold font-mono text-slate-900">{databasesCount}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg">
          <span className="text-[11px] text-slate-500 font-medium block">Affected Endpoints</span>
          <span className="text-xl font-bold font-mono text-slate-900">{apisCount}</span>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg">
          <span className="text-[11px] text-slate-500 font-medium block">Potential Users</span>
          <span className="text-xl font-bold font-mono text-slate-900">~{potentialUsers.toLocaleString()}</span>
        </div>
      </div>

      {/* Visual Dependency Chain */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-800 block">
          Downstream Impact Chain
        </span>
        <div className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 overflow-x-auto">
          {dependencyChain.map((nodeName, idx) => (
            <React.Fragment key={idx}>
              <div
                className={cn(
                  'px-3 py-2 rounded-md border text-xs font-mono font-medium flex items-center gap-2 shrink-0 shadow-2xs',
                  idx === 0
                    ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold'
                    : nodeName.toLowerCase().includes('sql')
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-white border-slate-200 text-slate-800'
                )}
              >
                {nodeName.toLowerCase().includes('sql') ? (
                  <Database size={13} className="text-indigo-600" />
                ) : (
                  <Server size={13} className={idx === 0 ? 'text-orange-600' : 'text-slate-500'} />
                )}
                <span>{nodeName}</span>
              </div>

              {idx < dependencyChain.length - 1 && (
                <div className="hidden md:flex items-center text-slate-400 shrink-0 px-1 font-mono text-xs">
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Affected Services Detail Table */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-800 block">
          Tier-1 Affected Services Breakdown
        </span>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-mono border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Service</th>
                <th className="py-2 px-3">Tier</th>
                <th className="py-2 px-3">Relationship</th>
                <th className="py-2 px-3">Current Error Rate</th>
                <th className="py-2 px-3 text-right">Blast Radius</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {affectedServices.map(srv => (
                <tr key={srv.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{srv.name}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{srv.tier}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded text-[10px]',
                        srv.relationship === 'DIRECT'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {srv.relationship}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">{srv.currentErrorRate}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {srv.blastRadiusScore}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
