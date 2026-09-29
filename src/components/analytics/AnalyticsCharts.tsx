import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AnalyticsSummary } from '../../types/telemetry';

interface AnalyticsChartsProps {
  data: AnalyticsSummary;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Risk Distribution Breakdown */}
      <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Change Risk Score Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Breakdown of 320 ingested changes evaluated by the Risk Engine
          </p>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="level"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2.5 border border-slate-200 rounded shadow-dropdown text-xs font-mono">
                        <span className="font-semibold text-slate-900">{payload[0].payload.level}: </span>
                        <span className="font-bold text-brand-600">{payload[0].value} changes</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" name="Changes" radius={[4, 4, 0, 0]}>
                {data.riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Failure Rate by Service */}
      <div className="bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Change Failure Rate by Service</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Target threshold: &lt; 2.0% for Tier-1 services
          </p>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.serviceFailureRates}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis
                type="number"
                unit="%"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis
                type="category"
                dataKey="serviceName"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter' }}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-2.5 border border-slate-200 rounded shadow-dropdown text-xs font-mono">
                        <span className="font-semibold text-slate-900">{payload[0].payload.serviceName}: </span>
                        <span className="font-bold text-rose-600">{payload[0].value}% failure rate</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="failureRate" name="Failure Rate" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
