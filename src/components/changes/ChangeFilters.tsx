import React from 'react';
import { SearchInput } from '../common/SearchInput';
import { Filter, X } from 'lucide-react';
import { RiskLevel, ChangeStatus } from '../../types/change';

interface ChangeFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRisk: RiskLevel | 'ALL';
  onRiskChange: (r: RiskLevel | 'ALL') => void;
  selectedStatus: ChangeStatus | 'ALL';
  onStatusChange: (s: ChangeStatus | 'ALL') => void;
  selectedRepo: string;
  onRepoChange: (repo: string) => void;
  repositories: string[];
  onReset: () => void;
}

export const ChangeFilters: React.FC<ChangeFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedRisk,
  onRiskChange,
  selectedStatus,
  onStatusChange,
  selectedRepo,
  onRepoChange,
  repositories,
  onReset,
}) => {
  const isFiltered =
    searchQuery !== '' ||
    selectedRisk !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedRepo !== 'ALL';

  return (
    <div className="bg-white border border-slate-200/80 rounded-card p-3 sm:p-4 shadow-card mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="w-full md:w-80">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Filter by title, PR number, or author..."
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Risk Filter */}
        <select
          value={selectedRisk}
          onChange={e => onRiskChange(e.target.value as RiskLevel | 'ALL')}
          className="bg-white border border-slate-300 text-slate-700 text-xs rounded-input px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="CRITICAL">Critical Risk</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => onStatusChange(e.target.value as ChangeStatus | 'ALL')}
          className="bg-white border border-slate-300 text-slate-700 text-xs rounded-input px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="AWAITING_REVIEW">Awaiting Review</option>
          <option value="APPROVED">Approved</option>
          <option value="CANARY_RECOMMENDED">Canary Recommended</option>
          <option value="POLICY_BLOCKED">Policy Blocked</option>
        </select>

        {/* Repository Filter */}
        <select
          value={selectedRepo}
          onChange={e => onRepoChange(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-xs rounded-input px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">All Repositories</option>
          {repositories.map(repo => (
            <option key={repo} value={repo}>
              {repo}
            </option>
          ))}
        </select>

        {/* Reset Filters button */}
        {isFiltered && (
          <button
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors"
          >
            <X size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
