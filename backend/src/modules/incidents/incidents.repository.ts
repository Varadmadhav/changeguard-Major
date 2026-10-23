import { db } from '../../db/index.js';
import { Incident, IncidentStatus } from '../../types/shared.js';

export class IncidentsRepository {
  public static async list(orgId: string): Promise<Incident[]> {
    return db.listIncidents(orgId);
  }

  public static async findById(id: string): Promise<Incident | null> {
    return db.getIncidentById(id);
  }

  public static async create(data: any): Promise<Incident> {
    return db.createIncident(data);
  }

  public static async updateStatus(id: string, status: IncidentStatus, comment?: string): Promise<Incident> {
    return db.updateIncidentStatus(id, status, comment);
  }

  public static async updateRca(id: string, rca: Partial<Incident['rootCauseAnalysis']>): Promise<Incident> {
    return db.updateIncidentRca(id, rca);
  }
}
