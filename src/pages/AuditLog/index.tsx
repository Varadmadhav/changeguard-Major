import React, { useState, useMemo } from 'react';
import { ScrollText, Filter, Download, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAudit } from '../../hooks/useAudit';
import { SearchInput } from '../../components/common/SearchInput';
import { Button } from '../../components/common/Button';
import { cn } from '../../utils/cn';

export const AuditLogPage: React.FC = () => {
  const { auditEvents } = useAudit();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');

  const filteredEvents = useMemo(() => {
    return auditEvents.filter(event => {
      if (selectedSource !== 'ALL' && event.source !== selectedSource) return false;
      if (selectedResult !== 'ALL' && event.result !== selectedResult) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesAction = event.actionTitle.toLowerCase().includes(q);
        const matchesActor = event.actor.name.toLowerCase().includes(q);
        const matchesResource = event.resource.name.toLowerCase().includes(q);
        const matchesDetails = event.details.toLowerCase().includes(q);
        if (!matchesAction && !matchesActor && !matchesResource && !matchesDetails) return false;
      }

      return true;
    });
  }, [auditEvents, searchQuery, selectedSource, selectedResult]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail & Governance Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable trace of operator signoffs, policy engine enforcements, and autonomous containment actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="xs" icon={<Download size={13} />}>
            Export Audit JSON
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 rounded-card p-3 sm:p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search action, actor, or resource..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 rounded-input px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Sources</option>
            <option value="POLICY_ENGINE">Policy Engine</option>
            <option value="WEB_CONSOLE">Web Console (Operator)</option>
            <option value="ARGO_CONTROLLER">Argo Controller</option>
          </select>

          <select
            value={selectedResult}
            onChange={e => setSelectedResult(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 rounded-input px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-slate-200/80 rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200/80 uppercase text-[11px] font-mono">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target Resource</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3">Source Engine</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {filteredEvents.map(event => (
                <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {event.timeFormatted}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap font-sans font-medium text-slate-800">
                    <div>{event.actor.name}</div>
                    {event.actor.email && (
                      <div className="text-[10px] text-slate-400 font-mono">{event.actor.email}</div>
                    )}
                  </td>

                  <td className="py-3 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                    {event.actionTitle}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-brand-700 font-medium">
                    {event.resource.name}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full border font-bold text-[10px]',
                        event.result === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : event.result === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      )}
                    >
                      {event.result}
                    </span>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                    {event.source}
                  </td>

                  <td className="py-3 px-4 font-sans text-slate-600 text-xs max-w-sm">
                    {event.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
