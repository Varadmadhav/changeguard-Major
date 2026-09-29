import React from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { DoraMetricsRow } from '../../components/analytics/DoraMetricsRow';
import { AnalyticsCharts } from '../../components/analytics/AnalyticsCharts';
import { DeploymentSafetyChart } from '../../components/dashboard/DeploymentSafetyChart';
import { Button } from '../../components/common/Button';

export const AnalyticsPage: React.FC = () => {
  const { data } = useAnalytics();

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DORA & Reliability Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Measure deployment safety calibration, progressive rollout performance, and containment velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="xs" icon={<Calendar size={13} />}>
            Last 30 Days
          </Button>
          <Button variant="secondary" size="xs" icon={<Download size={13} />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* DORA & Safety KPIs Row */}
      <DoraMetricsRow data={data} />

      {/* 30 Day Deployment Safety Velocity Chart */}
      <DeploymentSafetyChart />

      {/* Granular Charts */}
      <AnalyticsCharts data={data} />
    </div>
  );
};
