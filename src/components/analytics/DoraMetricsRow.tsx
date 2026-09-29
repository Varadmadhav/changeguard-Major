import React from 'react';
import { Rocket, ShieldAlert, Clock, RotateCcw, CheckCircle2, Sliders } from 'lucide-react';
import { AnalyticsSummary } from '../../types/telemetry';
import { MetricCard } from '../dashboard/MetricCard';

interface DoraMetricsRowProps {
  data: AnalyticsSummary;
}

export const DoraMetricsRow: React.FC<DoraMetricsRowProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        label="Deployment Velocity"
        value="14.2 / day"
        trend={{ value: 18, isGood: true }}
        subtitle="On-demand continuous delivery"
        icon={<Rocket size={14} />}
      />

      <MetricCard
        label="Change Failure Rate"
        value={`${data.changeFailureRate}%`}
        trend={{ value: -32, isGood: true }}
        subtitle="Industry elite benchmark < 5%"
        icon={<ShieldAlert size={14} />}
      />

      <MetricCard
        label="Mean Time to Detect (MTTD)"
        value={`${data.mttdMinutes}m`}
        trend={{ value: -45, isGood: true }}
        subtitle="Telemetry anomaly latency"
        icon={<Clock size={14} />}
      />

      <MetricCard
        label="Mean Time to Rollback (MTTR)"
        value={`${data.mttrMinutes}m`}
        trend={{ value: -28, isGood: true }}
        subtitle="Automated traffic restore"
        icon={<RotateCcw size={14} />}
      />

      <MetricCard
        label="Failure Containment"
        value={`${data.incidentContainmentRate}%`}
        subtitle="Halted in canary stages"
        icon={<CheckCircle2 size={14} />}
      />

      <MetricCard
        label="Risk Calibration Accuracy"
        value="97.9%"
        subtitle="2.1% false positive rate"
        icon={<Sliders size={14} />}
      />
    </div>
  );
};
