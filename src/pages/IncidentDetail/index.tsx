import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertOctagon,
  Rocket,
  GitPullRequest,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Activity,
  RotateCcw,
} from 'lucide-react';
import { useIncident } from '../../hooks/useIncidents';
import { Button } from '../../components/common/Button';
import { cn } from '../../utils/cn';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { incident } = useIncident(id || 'inc-482');

  if (!incident) {
    return (
      <div className="bg-white border border-slate-200 rounded-card p-12 text-center shadow-card">
        <h3 className="text-base font-semibold text-slate-800">Incident record not found</h3>
        <Link to="/incidents" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            Back to Incidents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Incidents</span>
        </Link>

        <div className="flex items-center gap-3">
          {incident.relatedDeploymentId && (
            <Link to={`/deployments/${incident.relatedDeploymentId}`}>
              <Button variant="secondary" size="xs" icon={<Rocket size={13} />}>
                View Related Deployment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {incident.code}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-mono font-bold border',
                  incident.severity === 'SEV-1'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-orange-50 text-orange-800 border-orange-300'
                )}
              >
                {incident.severity}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-300">
                {incident.status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {incident.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-slate-500 pt-1">
              <span>Duration: <strong className="text-slate-800">{incident.durationFormatted}</strong></span>
              <span>•</span>
              <span>Triggered: <strong className="text-slate-800">{incident.startedAt}</strong></span>
              <span>•</span>
              <span>Affected: <strong className="text-slate-800">{incident.affectedServices.join(', ')}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Interconnected Entities Chain Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700 font-mono">Linked Pipeline Entities:</span>
        <div className="flex flex-wrap items-center gap-2">
          {incident.relatedChangeId && (
            <Link
              to={`/changes/${incident.relatedChangeId}`}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-brand-700 hover:border-brand-500 flex items-center gap-1.5 shadow-2xs"
            >
              <GitPullRequest size={12} />
              <span>Change #{incident.relatedChangeId.replace('pr-', '')}</span>
            </Link>
          )}

          {incident.relatedDeploymentId && (
            <Link
              to={`/deployments/${incident.relatedDeploymentId}`}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-brand-700 hover:border-brand-500 flex items-center gap-1.5 shadow-2xs"
            >
              <Rocket size={12} />
              <span>Deployment ({incident.relatedDeploymentVersion || 'Control Room'})</span>
            </Link>
          )}

          <Link
            to="/impact-graph"
            className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-brand-700 hover:border-brand-500 flex items-center gap-1.5 shadow-2xs"
          >
            <Layers size={12} />
            <span>Impact Graph</span>
          </Link>
        </div>
      </div>

      {/* Impact Telemetry Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Peak Error Rate</span>
          <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
            {incident.metrics.peakErrorRate}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Threshold &lt; 1.0%</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Peak P95 Latency</span>
          <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
            {incident.metrics.peakP95Latency}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Baseline 182ms</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Impacted Requests</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {incident.metrics.impactedRequests.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">504 Gateway Timeouts</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-card shadow-card">
          <span className="text-xs text-slate-500 font-medium block">Impacted Users</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {incident.metrics.impactedUsers.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-mono">Contained at 42%</span>
        </div>
      </div>

      {/* Grid: Root Cause Analysis & Sequential Incident Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RCA (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Root Cause Diagnostic & Failure Containment
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Postmortem</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-700">
            <div>
              <span className="font-semibold text-slate-900 block mb-1">Executive Summary:</span>
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                {incident.rootCauseAnalysis.summary}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-900 block mb-1">Trigger Mechanism:</span>
              <p>{incident.rootCauseAnalysis.triggerMechanism}</p>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
              <span className="font-semibold block font-mono text-[11px] uppercase">
                Containment Mechanism:
              </span>
              <p>{incident.rootCauseAnalysis.failureContainedBy}</p>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-blue-900 space-y-1">
              <span className="font-semibold block font-mono text-[11px] uppercase">
                Preventative Recommendation:
              </span>
              <p>{incident.rootCauseAnalysis.preventativeRecommendation}</p>
            </div>
          </div>

          {/* Actions Taken */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-900 text-xs block">Remediation Steps Taken:</span>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              {incident.actionsTaken.map((act, idx) => (
                <li key={idx}>{act}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Timeline (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Incident Response Timeline
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Chronological</span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {incident.timeline.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-rose-600 shadow-2xs">
                  <AlertOctagon size={12} />
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{event.title}</span>
                    <span className="font-mono text-[10px] text-slate-400">{event.timeFormatted}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{event.description}</p>
                  <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                    Actor: {event.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
