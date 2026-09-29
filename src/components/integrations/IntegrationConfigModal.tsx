import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Integration } from '../../types/integration';

interface IntegrationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
  onSave: (id: string, updates: Partial<Integration>) => void;
}

export const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  isOpen,
  onClose,
  integration,
  onSave,
}) => {
  if (!integration) return null;

  const [repo, setRepo] = useState(integration.config.repository || 'acme/checkout-service');
  const [branch, setBranch] = useState(integration.config.branch || 'main');
  const [webhookEnabled, setWebhookEnabled] = useState(integration.config.webhookEnabled ?? true);
  const [endpoint, setEndpoint] = useState(integration.config.endpoint || 'https://api.github.com');

  const handleSave = () => {
    onSave(integration.id, {
      status: 'CONNECTED',
      config: {
        ...integration.config,
        repository: repo,
        branch: branch,
        webhookEnabled: webhookEnabled,
        endpoint: endpoint,
      },
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${integration.name} Integration Configuration`}
      description={`Manage connection parameters, authentication tokens, and event subscriptions for ${integration.name}.`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Configuration
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {integration.config.endpoint !== undefined && (
          <div>
            <label className="font-semibold text-slate-700 block mb-1">API Endpoint / Host</label>
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        )}

        {integration.config.repository !== undefined && (
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Repository Target</label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        )}

        {integration.config.branch !== undefined && (
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Default Ingestion Branch</label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <span className="font-semibold text-slate-900 block">Real-time Webhook Receiver</span>
            <span className="text-[11px] text-slate-500">
              Receive instant PR commit and deployment events
            </span>
          </div>
          <input
            type="checkbox"
            checked={webhookEnabled}
            onChange={e => setWebhookEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Last synchronization: {integration.lastSyncAt}
        </div>
      </div>
    </Modal>
  );
};
