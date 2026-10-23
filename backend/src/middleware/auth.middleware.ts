import bcrypt from 'bcryptjs';
import '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../errors/AppError.js';
import { PermissionAction, ROLE_PERMISSIONS, UserRole } from '../types/shared.js';
import type { RequestUser } from '../types/fastify.d.js';

export type { RequestUser };

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  // 1. Check for X-API-Key header
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
  if (apiKeyHeader) {
    if (apiKeyHeader.length < 12) {
      throw new AppError(401, 'INVALID_API_KEY', 'API key provided is invalid');
    }
    const prefix = apiKeyHeader.slice(0, 12);
    const keyRecord = await db.findApiKeyByPrefix(prefix);
    if (!keyRecord) {
      throw new AppError(401, 'INVALID_API_KEY', 'API key not found or revoked');
    }

    const match = await bcrypt.compare(apiKeyHeader, keyRecord.key_hash);
    if (!match) {
      throw new AppError(401, 'INVALID_API_KEY', 'API key authentication failed');
    }

    await db.updateApiKeyLastUsed(keyRecord.id);

    // Programmatic access has service/admin context
    request.user = {
      id: keyRecord.user_id || 'system-api-key',
      organizationId: keyRecord.organization_id,
      name: keyRecord.name,
      email: 'api-key@changeguard.internal',
      role: 'ADMIN',
    };
    return;
  }

  // 2. Check for Authorization: Bearer <jwt>
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header');
  }

  try {
    const decoded = await request.jwtVerify<{
      userId: string;
      email: string;
      role: RequestUser['role'];
      organizationId: string;
      name: string;
    }>();

    const user = await db.findUserById(decoded.userId);
    if (!user || !user.is_active) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or account deactivated');
    }

    request.user = {
      id: user.id,
      organizationId: user.organization_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'INVALID_TOKEN', 'Session token is invalid or expired');
  }
}

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
