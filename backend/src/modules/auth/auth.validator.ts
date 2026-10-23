import { LoginRequestBody, SsoCallbackBody } from './auth.types.js';

export class AuthValidator {
  public static validateLogin(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as LoginRequestBody;
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      return { valid: false, errors: ['Request body must be an object'] };
    }

    if (!body.email || typeof body.email !== 'string') {
      errors.push('Email is required');
    }

    if (!body.ssoToken && (!body.password || typeof body.password !== 'string')) {
      errors.push('Password is required when ssoToken is not provided');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  public static validateSso(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as SsoCallbackBody;
    if (!body || !body.SAMLResponse || typeof body.SAMLResponse !== 'string') {
      return { valid: false, errors: ['SAMLResponse is required'] };
    }
    return { valid: true };
  }
}
