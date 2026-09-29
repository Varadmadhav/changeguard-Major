import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitPullRequest, Filter, Plus, ShieldCheck } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { ChangeTable } from '../../components/changes/ChangeTable';
import { ChangeFilters } from '../../components/changes/ChangeFilters';
import { Tabs } from '../../components/common/Tabs';
import { RiskLevel, ChangeStatus, ChangeType } from '../../types/change';

export const ChangesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'all';

  const { changes } = useSimulation();

  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ChangeStatus | 'ALL'>('ALL');
  const [selectedRepo, setSelectedRepo] = useState<string>('ALL');

  const repositories = useMemo(() => {
    return Array.from(new Set(changes.map(c => c.repository)));
  }, [changes]);

  const tabs = [
    { id: 'all', label: 'All Changes', count: changes.length },
    { id: 'prs', label: 'Pull Requests', count: changes.filter(c => c.type === 'PULL_REQUEST').length },
    { id: 'commits', label: 'Commits', count: changes.filter(c => c.type === 'COMMIT').length },
    { id: 'infrastructure', label: 'Infrastructure', count: changes.filter(c => c.type === 'INFRASTRUCTURE').length },
    { id: 'ai', label: 'AI Generated', count: changes.filter(c => c.type === 'AI_GENERATED').length },
    { id: 'blocked', label: 'Policy Blocked', count: changes.filter(c => c.status === 'POLICY_BLOCKED').length },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      // Tab filter
      if (activeTab === 'prs' && change.type !== 'PULL_REQUEST') return false;
      if (activeTab === 'commits' && change.type !== 'COMMIT') return false;
      if (activeTab === 'infrastructure' && change.type !== 'INFRASTRUCTURE') return false;
      if (activeTab === 'ai' && change.type !== 'AI_GENERATED') return false;
      if (activeTab === 'blocked' && change.status !== 'POLICY_BLOCKED') return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = change.title.toLowerCase().includes(q);
        const matchesNumber = String(change.number).includes(q);
        const matchesAuthor = change.author.name.toLowerCase().includes(q);
        const matchesRepo = change.repository.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNumber && !matchesAuthor && !matchesRepo) return false;
      }

      // Risk Filter
      if (selectedRisk !== 'ALL' && change.risk.level !== selectedRisk) return false;

      // Status Filter
      if (selectedStatus !== 'ALL' && change.status !== selectedStatus) return false;

      // Repository Filter
      if (selectedRepo !== 'ALL' && change.repository !== selectedRepo) return false;

      return true;
    });
  }, [changes, activeTab, searchQuery, selectedRisk, selectedStatus, selectedRepo]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRisk('ALL');
    setSelectedStatus('ALL');
    setSelectedRepo('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Changes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Understand the risk of every software change before it reaches production.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            Ingestion: <strong className="text-brand-600 font-semibold">GitHub Webhooks Active</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      {/* Filter Controls */}
      <ChangeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRisk={selectedRisk}
        onRiskChange={setSelectedRisk}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedRepo={selectedRepo}
        onRepoChange={setSelectedRepo}
        repositories={repositories}
        onReset={handleResetFilters}
      />

      {/* Changes Table */}
      <ChangeTable changes={filteredChanges} />
    </div>
  );
};
