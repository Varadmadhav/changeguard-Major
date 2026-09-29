import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Server,
  Activity,
  AlertTriangle,
  Rocket,
  Network,
  Users,
  GitBranch,
} from 'lucide-react';
import { useService } from '../../hooks/useServices';
import { useDeployments } from '../../hooks/useDeployments';
import { useIncidents } from '../../hooks/useIncidents';
import { RiskBadge } from '../../components/common/RiskBadge';
import { Button } from '../../components/common/Button';
import { ServiceDependencies } from '../../components/services/ServiceDependencies';
import { DeploymentTable } from '../../components/deployments/DeploymentTable';
import { IncidentTable } from '../../components/incidents/IncidentTable';

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service } = useService(id || 'srv-checkout');
  const { deployments } = useDeployments();
  const { incidents } = useIncidents();

  if (!service) {
    return (
      <div className="bg-white border border-slate-200 rounded-card p-12 text-center shadow-card">
        <h3 className="text-base font-semibold text-slate-800">Service not found</h3>
        <Link to="/services" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            Back to Services
          </Button>
        </Link>
      </div>
    );
  }

  const serviceDeployments = deployments.filter(
    d => d.serviceId === service.id || d.serviceName.toLowerCase() === service.name.toLowerCase()
  );
  const serviceIncidents = incidents.filter(
    i => i.affectedServices.includes(service.name)
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/services"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Services</span>
        </Link>

        <Link to="/impact-graph">
          <Button variant="secondary" size="xs" icon={<Network size={13} />}>
            View in Impact Graph
          </Button>
        </Link>
      </div>

      {/* Service Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {service.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700">
                {service.tier}
              </span>
              <RiskBadge level={service.currentRisk} score={service.riskScore} showScore size="sm" />
            </div>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {service.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-400" />
                <span>Owner: <strong className="text-slate-800">{service.owner.team}</strong> ({service.owner.lead})</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <GitBranch size={13} className="text-slate-400" />
                <span>{service.repository}</span>
              </span>
              <span>•</span>
              <span>Slack: <strong className="text-brand-600">{service.owner.slackChannel}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Snapshot Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Uptime SLA</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {service.uptimePercentage}%
          </span>
          <span className="text-[10px] text-emerald-600 font-mono">30-day rolling</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">P95 Latency</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {service.telemetry.p95Latency}ms
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Baseline 160ms</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Error Rate</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {service.telemetry.errorRate}%
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Threshold &lt; 1.0%</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Throughput</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {service.telemetry.requestsPerSecond} rps
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Peak 420 rps</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Total Releases</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {service.deploymentsCount}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Latest: {service.lastDeploymentVersion}</span>
        </div>
      </div>

      {/* Dependency Mapping */}
      <ServiceDependencies
        dependencies={service.dependencies}
        dependents={service.dependents}
      />

      {/* Service Releases */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Recent Service Deployments</h3>
        <DeploymentTable deployments={serviceDeployments} />
      </div>

      {/* Incidents */}
      {serviceIncidents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Incident History</h3>
          <IncidentTable incidents={serviceIncidents} />
        </div>
      )}
    </div>
  );
};
