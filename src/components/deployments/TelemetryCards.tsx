import React from 'react';
import { AlertCircle, Clock, Zap, Cpu, Server } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TelemetryCardsProps {
  errorRate: number; // 0.42 or 3.7
  p95Latency: number; // 182 or 840
  requestsPerMinute: number; // 12800
  cpuUtilization: number; // 54
  memoryUtilization: number; // 67
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  errorRate,
  p95Latency,
  requestsPerMinute,
  cpuUtilization,
  memoryUtilization,
}) => {
  const isErrorBreached = errorRate >= 1.0;
  const isLatencyBreached = p95Latency >= 500;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Error Rate */}
      <div
        className={cn(
          'p-4 rounded-card border transition-all flex flex-col justify-between shadow-card',
          isErrorBreached
            ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200/80'
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Error Rate</span>
          <AlertCircle
            size={14}
            className={isErrorBreached ? 'text-rose-600 animate-bounce' : 'text-slate-400'}
          />
        </div>
        <div className="my-1.5">
          <span
            className={cn(
              'text-2xl font-bold font-mono',
              isErrorBreached ? 'text-rose-700 font-extrabold' : 'text-slate-900'
            )}
          >
            {errorRate.toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Threshold &lt; 1.0%</span>
          {isErrorBreached && <span className="text-rose-600 font-bold">BREACH</span>}
        </div>
      </div>

      {/* P95 Latency */}
      <div
        className={cn(
          'p-4 rounded-card border transition-all flex flex-col justify-between shadow-card',
          isLatencyBreached
            ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200/80'
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">P95 Latency</span>
          <Clock
            size={14}
            className={isLatencyBreached ? 'text-rose-600' : 'text-slate-400'}
          />
        </div>
        <div className="my-1.5">
          <span
            className={cn(
              'text-2xl font-bold font-mono',
              isLatencyBreached ? 'text-rose-700 font-extrabold' : 'text-slate-900'
            )}
          >
            {p95Latency}ms
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Threshold &lt; 500ms</span>
          {isLatencyBreached && <span className="text-rose-600 font-bold">HIGH</span>}
        </div>
      </div>

      {/* Throughput */}
      <div className="p-4 rounded-card border bg-white border-slate-200/80 flex flex-col justify-between shadow-card">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Live Throughput</span>
          <Zap size={14} className="text-slate-400" />
        </div>
        <div className="my-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {(requestsPerMinute / 1000).toFixed(1)}k
          </span>
          <span className="text-xs font-mono text-slate-400 ml-1">rpm</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Stable traffic</span>
      </div>

      {/* CPU */}
      <div className="p-4 rounded-card border bg-white border-slate-200/80 flex flex-col justify-between shadow-card">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Cluster CPU</span>
          <Cpu size={14} className="text-slate-400" />
        </div>
        <div className="my-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {cpuUtilization}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Headroom 46%</span>
      </div>

      {/* Memory */}
      <div className="p-4 rounded-card border bg-white border-slate-200/80 flex flex-col justify-between shadow-card">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Cluster Memory</span>
          <Server size={14} className="text-slate-400" />
        </div>
        <div className="my-1.5">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {memoryUtilization}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">RSS / Heap</span>
      </div>
    </div>
  );
};
