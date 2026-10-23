import { InviteMemberBody, UpdateRoleBody } from './team.types.js';
import { UserRole } from '../../types/shared.js';

const VALID_ROLES: UserRole[] = ['ADMIN', 'PLATFORM_ENGINEER', 'SRE', 'DEVELOPER', 'APPROVER'];

export class TeamValidator {
  public static validateInvite(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as InviteMemberBody;
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
      return { valid: false, errors: ['Request body must be an object'] };
    }

    if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!body.name || typeof body.name !== 'string') {
      errors.push('Name is required');
    }

    if (!body.role || !VALID_ROLES.includes(body.role)) {
      errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  public static validateUpdateRole(data: unknown): { valid: boolean; errors?: string[] } {
    const body = data as UpdateRoleBody;
    if (!body || !body.role || !VALID_ROLES.includes(body.role)) {
      return { valid: false, errors: [`Role must be one of: ${VALID_ROLES.join(', ')}`] };
    }
    return { valid: true };
  }
}
