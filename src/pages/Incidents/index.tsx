import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, Search } from 'lucide-react';
import { useIncidents } from '../../hooks/useIncidents';
import { IncidentTable } from '../../components/incidents/IncidentTable';
import { Tabs } from '../../components/common/Tabs';
import { SearchInput } from '../../components/common/SearchInput';

export const IncidentsPage: React.FC = () => {
  const { incidents } = useIncidents();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'all', label: 'All Incidents', count: incidents.length },
    {
      id: 'active',
      label: 'Active & Mitigating',
      count: incidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'TRIGGERED').length,
    },
    {
      id: 'deployment_related',
      label: 'Deployment Triggered',
      count: incidents.filter(i => !!i.relatedDeploymentId).length,
    },
    {
      id: 'resolved',
      label: 'Resolved & Postmortems',
      count: incidents.filter(i => i.status === 'RESOLVED').length,
    },
  ];

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (activeTab === 'active' && !(inc.status === 'INVESTIGATING' || inc.status === 'TRIGGERED')) return false;
      if (activeTab === 'deployment_related' && !inc.relatedDeploymentId) return false;
      if (activeTab === 'resolved' && inc.status !== 'RESOLVED') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCode = inc.code.toLowerCase().includes(q);
        const matchesTitle = inc.title.toLowerCase().includes(q);
        const matchesService = inc.affectedServices.some(s => s.toLowerCase().includes(q));
        if (!matchesCode && !matchesTitle && !matchesService) return false;
      }

      return true;
    });
  }, [incidents, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incidents & Containment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time incident response, blast radius telemetry, and automated rollback history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            PagerDuty: <strong className="text-emerald-700 font-semibold">Synced</strong>
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="w-full md:w-64">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search INC code, title, or service..."
          />
        </div>
      </div>

      {/* Incidents Table */}
      <IncidentTable incidents={filteredIncidents} />
    </div>
  );
};
