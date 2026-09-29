import React from 'react';
import { Database, Server, Radio, ArrowDown, ArrowUp } from 'lucide-react';
import { ServiceDependencyNode } from '../../types/service';
import { cn } from '../../utils/cn';

interface ServiceDependenciesProps {
  dependencies: ServiceDependencyNode[];
  dependents: ServiceDependencyNode[];
}

export const ServiceDependencies: React.FC<ServiceDependenciesProps> = ({
  dependencies = [],
  dependents = [],
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Downstream Dependencies */}
      <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
            <ArrowDown size={14} className="text-brand-600" />
            <span>Downstream Dependencies ({dependencies.length})</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Calls made</span>
        </div>

        <div className="space-y-2">
          {dependencies.map(dep => (
            <div
              key={dep.id}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                {dep.type === 'DATABASE' ? (
                  <Database size={13} className="text-indigo-600" />
                ) : (
                  <Server size={13} className="text-slate-600" />
                )}
                <span className="font-semibold text-slate-900">{dep.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500">{dep.protocol}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upstream Callers */}
      <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
            <ArrowUp size={14} className="text-emerald-600" />
            <span>Upstream Dependents ({dependents.length})</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Inbound callers</span>
        </div>

        <div className="space-y-2">
          {dependents.map(dep => (
            <div
              key={dep.id}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <Radio size={13} className="text-blue-600" />
                <span className="font-semibold text-slate-900">{dep.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500">{dep.protocol}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
