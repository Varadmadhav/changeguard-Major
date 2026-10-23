import { db, DbUser } from '../../db/index.js';

export class TeamRepository {
  public static async listByOrg(organizationId: string): Promise<DbUser[]> {
    return db.listUsersByOrg(organizationId);
  }

  public static async findByEmail(email: string): Promise<DbUser | null> {
    return db.findUserByEmail(email);
  }

  public static async findById(id: string): Promise<DbUser | null> {
    return db.findUserById(id);
  }

  public static async create(data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    return db.createUser(data);
  }

  public static async update(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    return db.updateUser(id, updates);
  }

  public static async delete(id: string): Promise<boolean> {
    return db.deleteUser(id);
  }
}
