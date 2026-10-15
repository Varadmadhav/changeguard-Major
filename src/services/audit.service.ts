import { AuditEvent, AuditActionType } from '../types/audit';
import { mockAuditEvents } from '../data/mockAuditEvents';

class AuditService {
  private events: AuditEvent[] = [...mockAuditEvents];

<<<<<<< Updated upstream
  async getAuditLog(): Promise<AuditEvent[]> {
    // Simulates GET /api/audit-log
=======
  private isMockMode(): boolean {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_USE_MOCK_DATA !== undefined) {
        return (import.meta as any).env.VITE_USE_MOCK_DATA !== 'false';
      }
    } catch {
      // ignore
    }
    if (typeof process !== 'undefined' && process.env?.VITE_USE_MOCK_DATA !== undefined) {
      return process.env.VITE_USE_MOCK_DATA !== 'false';
    }
    return true;
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
>>>>>>> Stashed changes
    return Promise.resolve([...this.events]);
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
