import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Check } from 'lucide-react';

export const GeneralSettings: React.FC = () => {
  const [orgName, setOrgName] = useState('Acme Engineering');
  const [defaultEnv, setDefaultEnv] = useState('PRODUCTION');
  const [timezone, setTimezone] = useState('UTC (GMT+00:00)');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD HH:mm:ss');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Organization & Workspace Settings</h3>
        <p className="text-slate-500 mt-0.5">Manage workspace identity, localization, and default presentation.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Organization Name</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-input px-3 py-2 text-xs text-slate-900"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Default Production Environment</label>
          <select
            value={defaultEnv}
            onChange={e => setDefaultEnv(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-input px-3 py-2 text-xs text-slate-900"
          >
            <option value="PRODUCTION">Production (Primary Cluster)</option>
            <option value="STAGING">Staging</option>
            <option value="DEVELOPMENT">Development</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Timezone Display</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-input px-3 py-2 text-xs text-slate-900"
            >
              <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
              <option value="America/New_York (EST)">America/New_York (EST)</option>
              <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
              <option value="Europe/London (GMT)">Europe/London (GMT)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Date Format</label>
            <input
              type="text"
              value={dateFormat}
              onChange={e => setDateFormat(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-input px-3 py-2 text-xs text-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Theme preference: Light only prompt requirement */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Application Theme</label>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-900 block">Enterprise Light Interface</span>
              <span className="text-[11px] text-slate-500">
                Optimized for technical readability, high contrast, and engineering precision.
              </span>
            </div>
            <span className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono font-semibold text-slate-700 shadow-2xs">
              Light Mode Only
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
        <Button variant="primary" size="sm" type="submit">
          Save Changes
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
