import { useState, useEffect } from 'react';
import { Integration } from '../types/integration';
import { integrationsService } from '../services/integrations.service';

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const list = await integrationsService.getIntegrations();
    setIntegrations(list);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const updateIntegration = async (id: string, updates: Partial<Integration>) => {
    const updated = await integrationsService.updateIntegration(id, updates);
    if (updated) {
      setIntegrations(prev => prev.map(i => (i.id === id ? updated : i)));
    }
  };

  return { integrations, loading, updateIntegration, reload };
}
