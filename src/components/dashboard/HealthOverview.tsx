import React from 'react';
import { Activity, Clock, AlertCircle, Cpu, Server } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HealthOverviewProps {
  apiHealth?: number; // 99.98
  p95Latency?: number; // 182
  errorRate?: number; // 0.42
  cpu?: number; // 54
  memory?: number; // 67
}

export const HealthOverview: React.FC<HealthOverviewProps> = ({
  apiHealth = 99.98,
  p95Latency = 182,
  errorRate = 0.42,
  cpu = 54,
  memory = 67,
}) => {
  const metrics = [
    {
      label: 'Global API Health',
      value: `${apiHealth}%`,
      status: apiHealth > 99.9 ? 'healthy' : 'warning',
      icon: Activity,
    },
    {
      label: 'P95 Response Latency',
      value: `${p95Latency}ms`,
      status: p95Latency < 300 ? 'healthy' : 'warning',
      icon: Clock,
    },
    {
      label: 'Aggregated Error Rate',
      value: `${errorRate}%`,
      status: errorRate < 1.0 ? 'healthy' : 'critical',
      icon: AlertCircle,
    },
    {
      label: 'Cluster CPU Usage',
      value: `${cpu}%`,
      status: cpu < 70 ? 'healthy' : 'warning',
      icon: Cpu,
    },
    {
      label: 'Cluster Memory Usage',
      value: `${memory}%`,
      status: memory < 80 ? 'healthy' : 'warning',
      icon: Server,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Production System Health Telemetry
        </h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Real-time Live Sync
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-3 bg-slate-50/70 border border-slate-200/60 rounded-lg flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-slate-600 truncate">{m.label}</span>
                <Icon size={13} />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                  {m.value}
                </span>
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    m.status === 'healthy'
                      ? 'bg-emerald-500'
                      : m.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500 animate-pulse'
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
