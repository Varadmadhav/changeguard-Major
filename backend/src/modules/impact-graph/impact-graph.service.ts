import { db } from '../../db/index.js';
import { ImpactGraphResult } from './impact-graph.types.js';

export class ImpactGraphService {
  public static async getImpactGraph(orgId: string, serviceId?: string): Promise<ImpactGraphResult> {
    return db.getImpactGraph(orgId, serviceId);
  }
}
