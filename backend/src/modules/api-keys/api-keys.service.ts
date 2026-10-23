import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../errors/AppError.js';
import { ApiKeyRepository } from './api-keys.repository.js';
import { MaskedApiKey, CreatedApiKeyResult } from './api-keys.types.js';

export class ApiKeyService {
  public static async listKeys(organizationId: string): Promise<MaskedApiKey[]> {
    const keys = await ApiKeyRepository.listByOrg(organizationId);
    return keys.map((k) => ({
      id: k.id,
      organizationId: k.organization_id,
      userId: k.user_id || undefined,
      name: k.name,
      keyPrefix: `${k.key_prefix}...`,
      lastUsedAt: k.last_used_at || undefined,
      revokedAt: k.revoked_at || undefined,
      createdAt: k.created_at,
    }));
  }

  public static async createKey(
    organizationId: string,
    userId: string,
    name: string
  ): Promise<CreatedApiKeyResult> {
    if (!name) {
      throw AppError.badRequest('API key name is required');
    }

    const rawToken = `cg_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawToken.slice(0, 12);
    const keyHash = await bcrypt.hash(rawToken, 10);

    const created = await ApiKeyRepository.create({
      organization_id: organizationId,
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    });

    return {
      key: {
        id: created.id,
        organizationId: created.organization_id,
        name: created.name,
        keyPrefix: `${keyPrefix}...`,
        createdAt: created.created_at,
      },
      secret: rawToken,
    };
  }

  public static async revokeKey(id: string, organizationId: string): Promise<void> {
    const revoked = await ApiKeyRepository.revoke(id, organizationId);
    if (!revoked) {
      throw AppError.notFound(`API key ${id} or already revoked`);
    }
  }
}
