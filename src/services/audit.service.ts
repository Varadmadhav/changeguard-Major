import { AuditEvent, AuditActionType } from '../types/audit';
import { mockAuditEvents } from '../data/mockAuditEvents';
import { apiClient } from './apiClient';

class AuditService {
  private events: AuditEvent[] = [...mockAuditEvents];

  private isMockMode(): boolean {
    return import.meta.env.VITE_USE_MOCK_DATA !== 'false';
  }

  async getAuditLog(filters?: { action?: string; resourceType?: string }): Promise<AuditEvent[]> {
    if (!this.isMockMode()) {
      try {
        const query = new URLSearchParams();
        if (filters?.action) query.set('action', filters.action);
        if (filters?.resourceType) query.set('resourceType', filters.resourceType);

        const response = await apiClient.get<{ data: AuditEvent[] }>(
          `/audit-log${query.toString() ? `?${query.toString()}` : ''}`
        );
        return response.data;
      } catch (err) {
        console.warn('[AuditService] Failed to fetch audit log from API, falling back to mock:', err);
      }
    }
    return Promise.resolve([...this.events]);
  }

  async exportCsv(): Promise<string> {
    if (!this.isMockMode()) {
      try {
        return await apiClient.get<string>('/audit-log/export');
      } catch (err) {
        console.warn('[AuditService] Failed to export audit log from API:', err);
      }
    }
    // Client-side fallback export
    const headers = ['ID', 'Timestamp', 'Actor Name', 'Action', 'Resource', 'Result', 'Details'];
    const rows = this.events.map((e) => [
      `"${e.id}"`,
      `"${e.timestamp}"`,
      `"${e.actor.name}"`,
      `"${e.action}"`,
      `"${e.resource.name}"`,
      `"${e.result}"`,
      `"${e.details}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async logEvent(
    action: AuditActionType,
    actionTitle: string,
    resource: AuditEvent['resource'],
    details: string,
    source: AuditEvent['source'] = 'WEB_CONSOLE',
    actorName: string = 'Alex Morgan',
    actorType: AuditEvent['actor']['type'] = 'USER'
  ): Promise<AuditEvent> {
    const now = new Date();
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor: {
        name: actorName,
        type: actorType,
        email: actorType === 'USER' ? 'alex.morgan@acme.com' : undefined,
      },
      action,
      actionTitle,
      resource,
      result: 'SUCCESS',
      source,
      details,
    };
    this.events.unshift(newEvent);
    return Promise.resolve(newEvent);
  }
}

export const auditService = new AuditService();
