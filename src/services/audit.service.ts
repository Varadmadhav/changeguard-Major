import { AuditEvent, AuditActionType } from '../types/audit';
import { mockAuditEvents } from '../data/mockAuditEvents';

class AuditService {
  private events: AuditEvent[] = [...mockAuditEvents];

  async getAuditLog(): Promise<AuditEvent[]> {
    // Simulates GET /api/audit-log
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
