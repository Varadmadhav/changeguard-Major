import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errorHandler.js';
import { PermissionAction, ROLE_PERMISSIONS, UserRole } from '../types/shared.js';

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `User role '${request.user.role}' lacks necessary permission. Required roles: ${allowedRoles.join(', ')}`
      );
    }
  };
}

export function requirePermission(action: PermissionAction) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const permissions = ROLE_PERMISSIONS[request.user.role] || [];
    if (!permissions.includes(action)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        `Action '${action}' is not permitted for role '${request.user.role}'`
      );
    }
  };
}
