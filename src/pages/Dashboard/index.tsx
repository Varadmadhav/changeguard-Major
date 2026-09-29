import React from 'react';
import {
  ShieldAlert,
  Rocket,
  AlertTriangle,
  RotateCcw,
  Ban,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { AttentionPanel } from '../../components/dashboard/AttentionPanel';
import { DeploymentSafetyChart } from '../../components/dashboard/DeploymentSafetyChart';
import { HealthOverview } from '../../components/dashboard/HealthOverview';
import { ActiveRolloutsTable } from '../../components/dashboard/ActiveRolloutsTable';
import { RecentChangesList } from '../../components/dashboard/RecentChangesList';

export const DashboardPage: React.FC = () => {
  const { deployments, changes, incidents } = useSimulation();

  const activeRollouts = deployments.filter(
    d => d.status === 'MONITORING' || d.status === 'PROMOTING' || d.status === 'PAUSED'
  );
  const activeIncidents = incidents.filter(
    i => i.status === 'INVESTIGATING' || i.status === 'TRIGGERED'
  );
  const blockedChanges = changes.filter(c => c.status === 'POLICY_BLOCKED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor software changes, deployment risk, and production health.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            Cluster: <strong className="text-slate-800">prod-us-east-1</strong>
          </span>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium">
            Control Plane Healthy
          </span>
        </div>
      </div>

      {/* Critical Attention Warning Banner */}
      <AttentionPanel />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Deployment Risk"
          value="68"
          trend={{ value: -12, isGood: true }}
          subtitle="Mean release risk index"
          icon={<ShieldAlert size={14} />}
          highlight
        />

        <MetricCard
          label="Active Rollouts"
          value={activeRollouts.length || 7}
          subtitle="Canary & staged delivery"
          icon={<Rocket size={14} />}
        />

        <MetricCard
          label="Blocked Changes"
          value={blockedChanges.length || 3}
          subtitle="Policy enforcement gates"
          icon={<Ban size={14} />}
        />

        <MetricCard
          label="Active Incidents"
          value={activeIncidents.length || 2}
          subtitle="Under containment"
          icon={<AlertTriangle size={14} />}
        />

        <MetricCard
          label="Rollbacks (30d)"
          value="4"
          subtitle="Autonomous rollbacks"
          icon={<RotateCcw size={14} />}
        />

        <MetricCard
          label="Change Failure Rate"
          value="3.8%"
          trend={{ value: -24, isGood: true }}
          subtitle="Target < 5.0%"
          icon={<Activity size={14} />}
        />
      </div>

      {/* Deployment Safety 30-Day Velocity Chart */}
      <DeploymentSafetyChart />

      {/* Production Telemetry System Health */}
      <HealthOverview />

      {/* Main Grid: Active Rollouts & Recent Ingested Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveRolloutsTable deployments={deployments.slice(0, 4)} />
        <RecentChangesList changes={changes} />
      </div>
    </div>
  );
};
