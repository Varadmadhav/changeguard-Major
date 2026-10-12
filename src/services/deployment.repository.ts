
import type { Deployment, DeploymentStatus } from '../types/deployment.ts';
import { mockDeployments } from '../data/mockDeployments.ts';

export class StateConflictError extends Error {
  public readonly deploymentId: string;
  public readonly actualStatus: DeploymentStatus;
  public readonly expectedStatus: DeploymentStatus;

  constructor(
    deploymentId: string,
    actualStatus: DeploymentStatus,
    expectedStatus: DeploymentStatus
  ) {
    super(
      `State conflict on deployment '${deploymentId}': current status is '${actualStatus}', expected '${expectedStatus}'.`
    );
    this.name = 'StateConflictError';
    this.deploymentId = deploymentId;
    this.actualStatus = actualStatus;
    this.expectedStatus = expectedStatus;
    Object.setPrototypeOf(this, StateConflictError.prototype);
  }
}

export interface StorageDriver {
  read(key: string): string | null;
  write(key: string, data: string): void;
  remove(key: string): void;
}

export class MemoryStorageDriver implements StorageDriver {
  private map = new Map<string, string>();

  read(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  write(key: string, data: string): void {
    this.map.set(key, data);
  }

  remove(key: string): void {
    this.map.delete(key);
  }
}

export class LocalStorageDriver implements StorageDriver {
  read(key: string): string | null {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage may be unavailable.
    }
    return null;
  }

  write(key: string, data: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, data);
      }
    } catch {
      // Storage may be unavailable.
    }
  }

  remove(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage may be unavailable.
    }
  }
}

/**
 * Node.js filesystem storage is intentionally not implemented in this
 * browser-facing module. Use MemoryStorageDriver or LocalStorageDriver here.
 * Keep filesystem persistence in a separate server-only module.
 */
export class FileStorageDriver implements StorageDriver {
  private readonly memory = new MemoryStorageDriver();

  constructor(_filePath?: string) {}

  read(key: string): string | null {
    return this.memory.read(key);
  }

  write(key: string, data: string): void {
    this.memory.write(key, data);
  }

  remove(key: string): void {
    this.memory.remove(key);
  }
}

export class DeploymentRepository {
  private static readonly STORAGE_KEY = 'changeguard_deployments_v1';

  private readonly storage: StorageDriver;
  private cache: Deployment[] = [];

  constructor(storageDriver?: StorageDriver) {
    if (storageDriver) {
      this.storage = storageDriver;
    } else if (typeof window !== 'undefined') {
      this.storage = new LocalStorageDriver();
    } else {
      this.storage = new MemoryStorageDriver();
    }

    this.load();
  }

  private load(): void {
    const raw = this.storage.read(DeploymentRepository.STORAGE_KEY);

    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          this.cache = parsed as Deployment[];
          return;
        }
      } catch {
        // Use seed data if stored data is invalid.
      }
    }

    this.cache = JSON.parse(JSON.stringify(mockDeployments));
    this.persist();
  }

  private persist(): void {
    this.storage.write(
      DeploymentRepository.STORAGE_KEY,
      JSON.stringify(this.cache)
    );
  }

  public async findAll(): Promise<Deployment[]> {
    return JSON.parse(JSON.stringify(this.cache));
  }

  public async findById(id: string): Promise<Deployment | null> {
    const search = id.toLowerCase();

    const found = this.cache.find(
      (deployment) =>
        deployment.id === id ||
        deployment.serviceId === id ||
        deployment.serviceName.toLowerCase().includes(search)
    );

    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async save(
    deployment: Deployment,
    expectedStatus?: DeploymentStatus
  ): Promise<Deployment> {
    const index = this.cache.findIndex(
      (item) => item.id === deployment.id
    );

    if (index !== -1) {
      const existing = this.cache[index];

      if (expectedStatus && existing.status !== expectedStatus) {
        throw new StateConflictError(
          deployment.id,
          existing.status,
          expectedStatus
        );
      }

      this.cache[index] = JSON.parse(JSON.stringify(deployment));
    } else {
      this.cache.push(JSON.parse(JSON.stringify(deployment)));
    }

    this.persist();
    return JSON.parse(JSON.stringify(deployment));
  }

  public async reset(): Promise<Deployment[]> {
    this.cache = JSON.parse(JSON.stringify(mockDeployments));
    this.persist();
    return JSON.parse(JSON.stringify(this.cache));
  }
}

export const deploymentRepository = new DeploymentRepository();
