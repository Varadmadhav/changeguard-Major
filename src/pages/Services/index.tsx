import React, { useState, useMemo } from 'react';
import { Layers, Search, Server } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { ServiceTable } from '../../components/services/ServiceTable';
import { SearchInput } from '../../components/common/SearchInput';
import { Tabs } from '../../components/common/Tabs';

export const ServicesPage: React.FC = () => {
  const { services } = useServices();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'all', label: 'All Services', count: services.length },
    { id: 'tier1', label: 'Tier-1 Critical', count: services.filter(s => s.tier === 'TIER_1').length },
    { id: 'tier2', label: 'Tier-2 Core', count: services.filter(s => s.tier === 'TIER_2').length },
    { id: 'active_deployments', label: 'Active Rollouts', count: services.filter(s => s.activeDeploymentsCount > 0).length },
  ];

  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      if (activeTab === 'tier1' && srv.tier !== 'TIER_1') return false;
      if (activeTab === 'tier2' && srv.tier !== 'TIER_2') return false;
      if (activeTab === 'active_deployments' && srv.activeDeploymentsCount === 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = srv.name.toLowerCase().includes(q);
        const matchesOwner = srv.owner.team.toLowerCase().includes(q);
        const matchesRepo = srv.repository.toLowerCase().includes(q);
        if (!matchesName && !matchesOwner && !matchesRepo) return false;
      }

      return true;
    });
  }, [services, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Microservice registry, risk profiles, dependency mapping, and runtime reliability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            Mesh: <strong className="text-slate-800">Istio mTLS Enabled</strong>
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
            placeholder="Search services or owners..."
          />
        </div>
      </div>

      {/* Services Table */}
      <ServiceTable services={filteredServices} />
    </div>
  );
};
