import { db } from '../../db/index.js';
import { Deployment, DeploymentStatus } from '../../types/shared.js';

export class DeploymentsRepository {
  public static async list(
    orgId: string,
    filters?: { environment?: string; status?: string; serviceId?: string }
  ): Promise<Deployment[]> {
    return db.listDeployments(orgId, filters);
  }

  public static async findById(id: string): Promise<Deployment | null> {
    return db.getDeploymentById(id);
  }

  public static async create(
    data: Omit<Deployment, 'id' | 'startedAt' | 'updatedAt' | 'timeline' | 'telemetryHistory'>
  ): Promise<Deployment> {
    return db.createDeployment(data);
  }

  public static async updateState(
    id: string,
    newStatus: DeploymentStatus,
    updates?: Partial<Deployment> & { expectedStatus?: DeploymentStatus }
  ): Promise<Deployment> {
    return db.updateDeploymentState(id, newStatus, updates);
  }
}
