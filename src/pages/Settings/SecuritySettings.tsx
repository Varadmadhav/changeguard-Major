import React, { useState } from 'react';
import { ShieldCheck, Key, Lock, Check } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const SecuritySettings: React.FC = () => {
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('8');
  const [twoPersonApproval, setTwoPersonApproval] = useState(true);
  const [auditRetention, setAuditRetention] = useState('365');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Security, Authentication & Signoff Gates</h3>
        <p className="text-slate-500 mt-0.5">
          Enforce single sign-on, dual-engineer approval protocols for high risk changes, and audit retention.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900 block">SAML 2.0 / Okta SSO Enforcement</span>
            <span className="text-[11px] text-slate-500">Require corporate identity provider for platform access</span>
          </div>
          <input
            type="checkbox"
            checked={ssoEnabled}
            onChange={e => setSsoEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900 block">Two-Person Production Signoff</span>
            <span className="text-[11px] text-slate-500">
              Changes with risk score &gt; 80 require an independent second SRE approval
            </span>
          </div>
          <input
            type="checkbox"
            checked={twoPersonApproval}
            onChange={e => setTwoPersonApproval(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Session Inactivity Timeout (Hours)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Audit Trail Retention Period (Days)</label>
            <input
              type="number"
              value={auditRetention}
              onChange={e => setAuditRetention(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="font-semibold text-slate-700 block">Active CI/CD Service Account API Keys</label>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between font-mono">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">cg_live_9f82c...94a1</span>
              <span className="text-[10px] text-slate-400">Created: 2 weeks ago • Scopes: changes:write, telemetry:ingest</span>
            </div>
            <Button variant="outline" size="xs">
              Revoke
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
        <Button variant="primary" size="sm" type="submit">
          Save Security Policy
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
