import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, AlertOctagon, Info, Cpu, User } from 'lucide-react';
import { DeploymentTimelineEvent } from '../../types/deployment';
import { cn } from '../../utils/cn';

interface DeploymentTimelineProps {
  timeline: DeploymentTimelineEvent[];
}

export const DeploymentTimeline: React.FC<DeploymentTimelineProps> = ({ timeline }) => {
  const getIcon = (type: DeploymentTimelineEvent['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 size={13} className="text-emerald-600" />;
      case 'WARNING':
        return <AlertTriangle size={13} className="text-amber-600" />;
      case 'DANGER':
        return <AlertOctagon size={13} className="text-rose-600 animate-pulse" />;
      case 'SYSTEM':
        return <Cpu size={13} className="text-brand-600" />;
      case 'INFO':
      default:
        return <Info size={13} className="text-slate-500" />;
    }
  };

  const getBorderColor = (type: DeploymentTimelineEvent['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-emerald-200 bg-emerald-50/40';
      case 'WARNING':
        return 'border-amber-200 bg-amber-50/40';
      case 'DANGER':
        return 'border-rose-300 bg-rose-50/50';
      default:
        return 'border-slate-200 bg-white';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
            Rollout Execution Timeline & Audit Log
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Sequential Trace</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {timeline.map((event) => (
          <div key={event.id} className="relative group">
            {/* Dot Node */}
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-2xs">
              {getIcon(event.type)}
            </div>

            {/* Event Card */}
            <div
              className={cn(
                'p-3 rounded-lg border text-xs space-y-1 transition-colors',
                getBorderColor(event.type)
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{event.title}</span>
                <span className="font-mono text-[10px] text-slate-400">{event.timeFormatted}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">{event.description}</p>
              {event.actor && (
                <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                  Actor: {event.actor}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
