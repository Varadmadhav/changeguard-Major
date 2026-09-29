import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Rocket, ShieldCheck, Flame, RefreshCw } from 'lucide-react';
import { useDeployments } from '../../hooks/useDeployments';
import { DeploymentTable } from '../../components/deployments/DeploymentTable';
import { Tabs } from '../../components/common/Tabs';
import { SearchInput } from '../../components/common/SearchInput';
import { Button } from '../../components/common/Button';

export const DeploymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'active';

  const {
    deployments,
    isSimulatingFailure,
    simulateFailure,
    resetSimulationDemo,
  } = useDeployments();

  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    {
      id: 'active',
      label: 'Active Rollouts',
      count: deployments.filter(d => d.status === 'MONITORING' || d.status === 'PROMOTING' || d.status === 'PAUSED').length,
    },
    {
      id: 'completed',
      label: 'Completed (100%)',
      count: deployments.filter(d => d.status === 'PROMOTED').length,
    },
    {
      id: 'rolled_back',
      label: 'Rolled Back',
      count: deployments.filter(d => d.status === 'ROLLED_BACK' || d.status === 'ROLLING_BACK').length,
    },
    {
      id: 'failed',
      label: 'Failed / Aborted',
      count: deployments.filter(d => d.status === 'FAILED' || d.status === 'ABORTED').length,
    },
    { id: 'all', label: 'All Deployments', count: deployments.length },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  const filteredDeployments = useMemo(() => {
    return deployments.filter(dep => {
      // Tab filter
      if (activeTab === 'active' && !(dep.status === 'MONITORING' || dep.status === 'PROMOTING' || dep.status === 'PAUSED')) return false;
      if (activeTab === 'completed' && dep.status !== 'PROMOTED') return false;
      if (activeTab === 'rolled_back' && !(dep.status === 'ROLLED_BACK' || dep.status === 'ROLLING_BACK')) return false;
      if (activeTab === 'failed' && !(dep.status === 'FAILED' || dep.status === 'ABORTED')) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesService = dep.serviceName.toLowerCase().includes(q);
        const matchesVersion = dep.version.toLowerCase().includes(q);
        const matchesTitle = dep.changeTitle.toLowerCase().includes(q);
        if (!matchesService && !matchesVersion && !matchesTitle) return false;
      }

      return true;
    });
  }, [deployments, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deployments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time progressive delivery, canary progression, and automated rollback controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSimulatingFailure ? (
            <Button
              variant="outline"
              size="sm"
              icon={<Flame size={14} className="text-amber-600" />}
              onClick={() => simulateFailure('dep-checkout-284')}
              className="text-amber-700 bg-amber-50/70 border-amber-300 hover:bg-amber-100 font-mono text-xs"
            >
              Simulate Failure Scenario
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={resetSimulationDemo}
              className="font-mono text-xs"
            >
              Reset Simulation
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
        <div className="w-full md:w-64">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search deployments..."
          />
        </div>
      </div>

      {/* Deployments Table */}
      <DeploymentTable deployments={filteredDeployments} />
    </div>
  );
};
