import { AnalyzeChangeBody } from './changes.types.js';

export class ChangesValidator {
  public static validateAnalyze(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as AnalyzeChangeBody;
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      return { valid: false, errors: ['Request body must be an object'] };
    }

    if (!body.title || typeof body.title !== 'string') {
      errors.push('Title is required');
    }

    if (!body.repository || typeof body.repository !== 'string') {
      errors.push('Repository is required');
    }

    if (!body.files || !Array.isArray(body.files)) {
      errors.push('Files array is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
