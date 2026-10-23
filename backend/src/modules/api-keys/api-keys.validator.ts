import { CreateApiKeyBody } from './api-keys.types.js';

export class ApiKeyValidator {
  public static validateCreate(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as CreateApiKeyBody;
    if (!body || !body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return { valid: false, errors: ['API key name is required'] };
    }
    return { valid: true };
  }
}
