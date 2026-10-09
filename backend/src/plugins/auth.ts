import bcrypt from 'bcryptjs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from './errorHandler.js';

export interface RequestUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PLATFORM_ENGINEER' | 'SRE' | 'DEVELOPER' | 'APPROVER';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      role: RequestUser['role'];
      organizationId: string;
      name: string;
    };
    user: RequestUser;
  }
}

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
