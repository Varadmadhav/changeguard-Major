import React, { useState } from 'react';
import { Plug, CheckCircle2 } from 'lucide-react';
import { useIntegrations } from '../../hooks/useIntegrations';
import { IntegrationCard } from '../../components/integrations/IntegrationCard';
import { IntegrationConfigModal } from '../../components/integrations/IntegrationConfigModal';
import { Integration } from '../../types/integration';

export const IntegrationsPage: React.FC = () => {
  const { integrations, updateIntegration } = useIntegrations();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsConfigOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Integration>) => {
    await updateIntegration(id, updates);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrations & Connectors</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect source control, CI/CD pipelines, Kubernetes clusters, telemetry collectors, and alerting systems.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-2xs">
            Active Connectors: <strong className="text-brand-600 font-bold">{integrations.filter(i => i.status === 'CONNECTED').length} / {integrations.length}</strong>
          </span>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConfigure={handleConfigure}
          />
        ))}
      </div>

      {/* Integration Configuration Modal */}
      <IntegrationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        integration={selectedIntegration}
        onSave={handleSave}
      />
    </div>
  );
};
