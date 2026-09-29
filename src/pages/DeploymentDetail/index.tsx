import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, GitPullRequest, Layers, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDeployment } from '../../hooks/useDeployments';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskBadge } from '../../components/common/RiskBadge';
import { Button } from '../../components/common/Button';
import { RolloutProgressBar } from '../../components/deployments/RolloutProgressBar';
import { TelemetryCards } from '../../components/deployments/TelemetryCards';
import { VerificationSignals } from '../../components/deployments/VerificationSignals';
import { DeploymentTimeline } from '../../components/deployments/DeploymentTimeline';
import { DeploymentActions } from '../../components/deployments/DeploymentActions';
import { LiveTelemetryChart } from '../../components/deployments/LiveTelemetryChart';
import { SimulateFailureBanner } from '../../components/deployments/SimulateFailureBanner';

export const DeploymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { deployment, promote, pause, rollback, isSimulatingFailure } = useDeployment(
    id || 'dep-checkout-284'
  );

  if (!deployment) {
    return (
      <div className="bg-white border border-slate-200 rounded-card p-12 text-center shadow-card">
        <h3 className="text-base font-semibold text-slate-800">Deployment record not found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested rollout could not be loaded.</p>
        <Link to="/deployments" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            Back to Deployments
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/deployments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Deployments</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/changes/${deployment.changeId}`}
            className="text-xs font-mono text-brand-600 hover:underline flex items-center gap-1"
          >
            <GitPullRequest size={13} />
            <span>Associated Change ({deployment.changeId.toUpperCase()})</span>
          </Link>
        </div>
      </div>

      {/* Interactive Presentation Demo Failure Simulator Banner */}
      <SimulateFailureBanner
        deploymentId={deployment.id}
        status={deployment.status}
      />

      {/* Main Header / Production Control Room Bar */}
      <div className="bg-white border border-slate-200/80 rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base font-bold text-slate-900">{deployment.serviceName}</span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {deployment.version}
              </span>
              <StatusBadge status={deployment.status} size="md" />
              <RiskBadge level={deployment.risk.level} score={deployment.risk.score} showScore size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-slate-500 pt-1">
              <span>Environment: <strong className="text-slate-800">{deployment.environment}</strong></span>
              <span>•</span>
              <span>Previous Baseline: <strong className="text-slate-800">{deployment.previousVersion}</strong></span>
              <span>•</span>
              <span>Strategy: <strong className="text-brand-700">{deployment.strategy}</strong></span>
              <span>•</span>
              <span>Started: <strong className="text-slate-800">{deployment.startedAt}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/services/${deployment.serviceId}`}>
              <Button variant="secondary" size="sm" icon={<Layers size={13} />}>
                Service Graph
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Rollout Progress Bar */}
      <RolloutProgressBar
        stages={deployment.stages}
        currentPercentage={deployment.currentTrafficPercentage}
        targetPercentage={deployment.targetTrafficPercentage}
        status={deployment.status}
      />

      {/* Operator Control Actions */}
      <DeploymentActions
        deployment={deployment}
        onPromote={promote}
        onPause={pause}
        onRollback={rollback}
      />

      {/* Live Health Telemetry Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Production Telemetry Health Snapshot
          </h3>
          <span className="text-[11px] font-mono text-emerald-700">Live Prometheus Ingestion</span>
        </div>
        <TelemetryCards
          errorRate={deployment.currentTelemetry.errorRate}
          p95Latency={deployment.currentTelemetry.p95Latency}
          requestsPerMinute={deployment.currentTelemetry.requestsPerMinute}
          cpuUtilization={deployment.currentTelemetry.cpuUtilization}
          memoryUtilization={deployment.currentTelemetry.memoryUtilization}
        />
      </div>

      {/* Telemetry Chart */}
      <LiveTelemetryChart telemetryHistory={deployment.telemetryHistory} />

      {/* Grid: Verification Signals & Execution Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSignals signals={deployment.signals} />
        <DeploymentTimeline timeline={deployment.timeline} />
      </div>
    </div>
  );
};
