import { CreatePolicyBody } from './policies.types.js';

export class PoliciesValidator {
  public static validateCreate(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as CreatePolicyBody;
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      return { valid: false, errors: ['Request body must be an object'] };
    }

    if (!body.name || typeof body.name !== 'string') {
      errors.push('Policy name is required');
    }

    if (!body.rules || !Array.isArray(body.rules)) {
      errors.push('Rules array is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
