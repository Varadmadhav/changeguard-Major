import { db, DbApiKey } from '../../db/index.js';

export class ApiKeyRepository {
  public static async listByOrg(organizationId: string): Promise<DbApiKey[]> {
    return db.listApiKeysByOrg(organizationId);
  }

  public static async findByPrefix(keyPrefix: string): Promise<DbApiKey | null> {
    return db.findApiKeyByPrefix(keyPrefix);
  }

  public static async create(data: Omit<DbApiKey, 'id' | 'created_at' | 'last_used_at' | 'revoked_at'>): Promise<DbApiKey> {
    return db.createApiKey(data);
  }

  public static async revoke(id: string, organizationId: string): Promise<boolean> {
    return db.revokeApiKey(id, organizationId);
  }

  public static async updateLastUsed(id: string): Promise<void> {
    return db.updateApiKeyLastUsed(id);
  }
}
