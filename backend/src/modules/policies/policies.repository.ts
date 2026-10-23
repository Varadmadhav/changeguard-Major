import { db } from '../../db/index.js';
import { Policy, PolicyVersion } from '../../types/shared.js';

export class PoliciesRepository {
  public static async list(orgId: string): Promise<Policy[]> {
    return db.listPolicies(orgId);
  }

  public static async findById(id: string, orgId: string): Promise<Policy | null> {
    return db.getPolicyById(id, orgId);
  }

  public static async create(
    data: Omit<Policy, 'id' | 'version' | 'rulesCount' | 'lastUpdatedAt'>,
    actorName: string
  ): Promise<Policy> {
    return db.createPolicy(data, actorName);
  }

  public static async update(
    id: string,
    updates: Partial<Policy>,
    actorName: string,
    orgId: string
  ): Promise<{ policy: Policy; previousVersion: PolicyVersion } | null> {
    return db.updatePolicy(id, updates, actorName, orgId);
  }

  public static async getVersions(policyId: string): Promise<PolicyVersion[]> {
    return db.getPolicyVersions(policyId);
  }
}
