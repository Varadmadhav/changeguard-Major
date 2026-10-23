import { AppError } from '../../errors/AppError.js';
import { AuditWriter } from '../../services/auditWriter.js';
import { IncidentsRepository } from './incidents.repository.js';
import {
  CreateIncidentBody,
  IncidentRecord,
  ListIncidentsQuery,
  UpdateRcaBody,
  UpdateStatusBody,
} from './incidents.types.js';

export class IncidentsService {
  public static async listIncidents(
    orgId: string,
    filters?: ListIncidentsQuery
  ): Promise<IncidentRecord[]> {
    let incidents = await IncidentsRepository.list(orgId);

    if (filters?.severity) {
      incidents = incidents.filter((i) => i.severity === filters.severity);
    }
    if (filters?.status) {
      incidents = incidents.filter((i) => i.status === filters.status);
    }

    return incidents;
  }

  public static async getIncidentById(id: string): Promise<IncidentRecord> {
    const incident = await IncidentsRepository.findById(id);
    if (!incident) {
      throw AppError.notFound(`Incident ${id}`);
    }
    return incident;
  }

  public static async createIncident(
    body: CreateIncidentBody,
    orgId: string
  ): Promise<IncidentRecord> {
    return IncidentsRepository.create({
      organizationId: orgId,
      ...body,
    });
  }

  public static async updateStatus(
    id: string,
    body: UpdateStatusBody,
    user: { id: string; name: string; email: string; organizationId: string }
  ): Promise<IncidentRecord> {
    const updated = await IncidentsRepository.updateStatus(id, body.status, body.comment);

    await AuditWriter.record({
      organizationId: updated.organizationId,
      actor: { name: user.name, type: 'USER', email: user.email },
      action: 'DEPLOYMENT_PAUSED',
      actionTitle: `Incident ${updated.code} status changed to ${body.status}`,
      resource: { type: 'SERVICE', id: updated.id, name: updated.title },
      result: 'SUCCESS',
      source: 'WEB_CONSOLE',
      details: body.comment || `Status transition to ${body.status}`,
    });

    return updated;
  }

  public static async updateRca(id: string, rca: UpdateRcaBody): Promise<IncidentRecord> {
    return IncidentsRepository.updateRca(id, rca);
  }
}
