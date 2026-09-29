import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { mockAnalyticsSummary } from '../../data/mockMetrics';

export const DeploymentSafetyChart: React.FC = () => {
  const data = mockAnalyticsSummary.deployments30Days;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-dropdown text-xs font-mono">
          <p className="font-semibold text-slate-900 mb-1.5">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Deployment Safety & Velocity (30 Days)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Canary progression volume, successful releases, autonomous rollbacks and blocked changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600 border border-slate-200">
            397 Total Releases
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12, fontFamily: 'Inter' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="successful" name="Successful Releases" fill="#2563EB" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="rollbacks" name="Autonomous Rollbacks" fill="#EA580C" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="failed" name="Failed Rollouts" fill="#DC2626" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="blocked" name="Policy Blocked" fill="#94A3B8" stackId="a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
