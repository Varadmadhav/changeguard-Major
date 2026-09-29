import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { LiveTelemetrySnapshot } from '../../types/deployment';

interface LiveTelemetryChartProps {
  telemetryHistory: LiveTelemetrySnapshot[];
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  telemetryHistory = [],
}) => {
  const chartData = telemetryHistory.length > 0
    ? telemetryHistory
    : [
        { timestamp: '10:42', errorRate: 0.21, p95Latency: 165 },
        { timestamp: '10:44', errorRate: 0.28, p95Latency: 172 },
        { timestamp: '10:46', errorRate: 0.35, p95Latency: 178 },
        { timestamp: '10:48', errorRate: 0.39, p95Latency: 180 },
        { timestamp: '10:50', errorRate: 0.42, p95Latency: 182 },
      ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-dropdown text-xs font-mono">
          <p className="font-semibold text-slate-900 mb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-900">
                  {entry.value}
                  {entry.dataKey === 'errorRate' ? '%' : 'ms'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
            Live Telemetry Verification vs Policy Thresholds
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time HTTP error rate (%) and P95 latency (ms) plotted with safety limits
          </p>
        </div>
        <span className="text-[11px] font-mono text-emerald-700 font-medium">
          ● Sampling every 15s
        </span>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              domain={[0, 'dataMax + 1']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10, fontFamily: 'Inter' }}
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine
              yAxisId="left"
              y={1.0}
              label={{ value: 'Error Limit (1.0%)', fill: '#DC2626', fontSize: 10, position: 'insideTopRight' }}
              stroke="#DC2626"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              yAxisId="right"
              y={500}
              label={{ value: 'Latency Cap (500ms)', fill: '#D97706', fontSize: 10, position: 'insideBottomRight' }}
              stroke="#D97706"
              strokeDasharray="4 4"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="errorRate"
              name="Error Rate (%)"
              stroke="#DC2626"
              strokeWidth={2}
              dot={{ r: 3, fill: '#DC2626' }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="p95Latency"
              name="P95 Latency (ms)"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563EB' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
