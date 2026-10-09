import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';

interface CreateApiKeyBody {
  name: string;
}

export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  // List API keys (masked)
  fastify.get(
    '/api/v1/settings/api-keys',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const keys = await db.listApiKeysByOrg(request.user.organizationId);
      const sanitized = keys.map((k) => ({
        id: k.id,
        organizationId: k.organization_id,
        userId: k.user_id,
        name: k.name,
        keyPrefix: `${k.key_prefix}...`,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at,
        createdAt: k.created_at,
      }));

      return reply.status(200).send({
        data: sanitized,
        meta: {
          total: sanitized.length,
        },
      });
    }
  );

  // Issue new API key - returns plaintext secret exactly once
  fastify.post<{ Body: CreateApiKeyBody }>(
    '/api/v1/settings/api-keys',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      const { name } = request.body || {};
      if (!name) {
        throw new AppError(400, 'BAD_REQUEST', 'API key name is required');
      }

      // Generate secure 32-byte secret prefixed with cg_live_
      const rawToken = `cg_live_${crypto.randomBytes(24).toString('hex')}`;
      const keyPrefix = rawToken.slice(0, 12);
      const keyHash = await bcrypt.hash(rawToken, 10);

      const created = await db.createApiKey({
        organization_id: request.user.organizationId,
        user_id: request.user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });

      return reply.status(201).send({
        data: {
          key: {
            id: created.id,
            organizationId: created.organization_id,
            name: created.name,
            keyPrefix: `${keyPrefix}...`,
            createdAt: created.created_at,
          },
          secret: rawToken, // Returned only once!
        },
        message: 'API key created successfully. Save this secret now; it will not be shown again.',
      });
    }
  );

  // Revoke API key
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/settings/api-keys/:id',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params;
      const revoked = await db.revokeApiKey(id, request.user.organizationId);

      if (!revoked) {
        throw new AppError(404, 'KEY_NOT_FOUND', `API key ${id} not found or already revoked`);
      }

      return reply.status(200).send({
        success: true,
        message: 'API key revoked successfully',
      });
    }
  );
};
