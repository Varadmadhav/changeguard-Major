import { db } from '../../db/index.js';
import { Service } from '../../types/shared.js';

export class ServicesRepository {
  public static async list(
    orgId: string,
    filters?: { tier?: string; health?: string; environment?: string }
  ): Promise<Service[]> {
    return db.listServices(orgId, filters);
  }

  public static async findById(id: string): Promise<Service | null> {
    return db.getServiceById(id);
  }

  public static async upsert(service: Service): Promise<Service> {
    return db.upsertService(service);
  }
}
