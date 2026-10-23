import { CreateDeploymentBody } from './deployments.types.js';

export class DeploymentsValidator {
  public static validateCreate(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as CreateDeploymentBody;
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      return { valid: false, errors: ['Request body must be an object'] };
    }

    if (!body.serviceId) errors.push('serviceId is required');
    if (!body.serviceName) errors.push('serviceName is required');
    if (!body.version) errors.push('version is required');
    if (!body.changeId) errors.push('changeId is required');

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
