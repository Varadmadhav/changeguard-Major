import { CreateIncidentBody, UpdateStatusBody } from './incidents.types.js';

export class IncidentsValidator {
  public static validateCreate(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as CreateIncidentBody;
    if (!body || !body.title || typeof body.title !== 'string') {
      return { valid: false, errors: ['Incident title is required'] };
    }
    return { valid: true };
  }

  public static validateStatus(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as UpdateStatusBody;
    if (!body || !body.status) {
      return { valid: false, errors: ['Missing status field'] };
    }
    return { valid: true };
  }
}
