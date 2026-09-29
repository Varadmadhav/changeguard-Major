import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Check } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const [toggles, setToggles] = useState({
    highRiskChanges: true,
    deploymentFailures: true,
    rollbacks: true,
    incidentAlerts: true,
    policyViolations: true,
    integrationFailures: false,
  });
  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const items = [
    {
      key: 'highRiskChanges' as const,
      label: 'High-Risk Change Ingestion Alerts',
      desc: 'Notify when a PR or commit scores > 70 in deployment risk assessment.',
    },
    {
      key: 'deploymentFailures' as const,
      label: 'Canary Rollout Anomaly Breaches',
      desc: 'Immediate dispatch when telemetry signals violate configured policy thresholds.',
    },
    {
      key: 'rollbacks' as const,
      label: 'Autonomous Rollback Executions',
      desc: 'Alert when ChangeGuard triggers an emergency traffic revert.',
    },
    {
      key: 'incidentAlerts' as const,
      label: 'Production Incident Triggers (SEV-1/SEV-2)',
      desc: 'Dispatch alerts directly into #changeguard-war-room on Slack and PagerDuty.',
    },
    {
      key: 'policyViolations' as const,
      label: 'Policy Violations & Blocked PRs',
      desc: 'Notify authors when a commit violates zero-downtime rules.',
    },
    {
      key: 'integrationFailures' as const,
      label: 'Telemetry Connector Sync Warnings',
      desc: 'Notify when Prometheus or OpenTelemetry collector pings drop packets.',
    },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Alert Dispatch & Notification Rules</h3>
        <p className="text-slate-500 mt-0.5">
          Control which deployment safety events trigger in-app notifications, webhooks, and Slack alerts.
        </p>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.key}
            className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-between gap-4"
          >
            <div>
              <span className="font-semibold text-slate-900 block">{item.label}</span>
              <span className="text-[11px] text-slate-500">{item.desc}</span>
            </div>
            <input
              type="checkbox"
              checked={toggles[item.key]}
              onChange={() => handleToggle(item.key)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 shrink-0"
            />
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
        <Button variant="primary" size="sm" type="submit">
          Save Notification Preferences
        </Button>
        {saved && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <Check size={14} /> Saved successfully
          </span>
        )}
      </div>
    </form>
  );
};
