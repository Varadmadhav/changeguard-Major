import fs from 'node:fs';
import path from 'node:path';
import type { Deployment, DeploymentStatus } from '../types/deployment.ts';
import { mockDeployments } from '../data/mockDeployments.ts';

export class StateConflictError extends Error {
  public readonly deploymentId: string;
  public readonly actualStatus: DeploymentStatus;
  public readonly expectedStatus: DeploymentStatus;

  constructor(deploymentId: string, actualStatus: DeploymentStatus, expectedStatus: DeploymentStatus) {
    super(`State conflict on deployment '${deploymentId}': current status is '${actualStatus}', expected '${expectedStatus}'.`);
    this.name = 'StateConflictError';
    this.deploymentId = deploymentId;
    this.actualStatus = actualStatus;
    this.expectedStatus = expectedStatus;
    Object.setPrototypeOf(this, StateConflictError.prototype);
  }
}

/**
 * Storage driver abstraction for cross-environment persistence (Node.js fs / Browser localStorage)
 */
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
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore security/sandbox storage access failures
    }
    return null;
  }
  write(key: string, data: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, data);
      }
    } catch {
      // Ignore
    }
  }
  remove(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * FileStorageDriver: Durable filesystem-backed storage for server/Node.js runtime.
 */
export class FileStorageDriver implements StorageDriver {
  private filePath: string;

  constructor(filePath?: string) {
    if (filePath) {
      this.filePath = filePath;
    } else {
      // Default to data directory in project root
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {
          // Fall back if permission denied
        }
      }
      this.filePath = path.join(dataDir, 'deployments-store.json');
    }
  }

  read(key: string): string | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed[key] ? JSON.stringify(parsed[key]) : null;
      }
    } catch {
      // Return null on read error
    }
    return null;
  }

  write(key: string, data: string): void {
    try {
      let store: Record<string, any> = {};
      if (fs.existsSync(this.filePath)) {
        try {
          store = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        } catch {
          store = {};
        }
      }
      store[key] = JSON.parse(data);
      fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch {
      // Safe fallback
    }
  }

  remove(key: string): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const store = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        delete store[key];
        fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
      }
    } catch {
      // Safe fallback
    }
  }
}

/**
 * Robust persistent repository managing deployment state with optimistic concurrency protection.
 */
export class DeploymentRepository {
  private static readonly STORAGE_KEY = 'changeguard_deployments_v1';
  private storage: StorageDriver;
  private cache: Deployment[] = [];

  constructor(storageDriver?: StorageDriver) {
    if (storageDriver) {
      this.storage = storageDriver;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = new LocalStorageDriver();
    } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      this.storage = new FileStorageDriver();
    } else {
      this.storage = new MemoryStorageDriver();
    }
    this.load();
  }

  private load(): void {
    const raw = this.storage.read(DeploymentRepository.STORAGE_KEY);
    if (raw) {
      try {
        this.cache = JSON.parse(raw);
        return;
      } catch {
        // Fall back to seed data if corrupted
      }
    }
    this.cache = JSON.parse(JSON.stringify(mockDeployments));
    this.persist();
  }

  private persist(): void {
    this.storage.write(DeploymentRepository.STORAGE_KEY, JSON.stringify(this.cache));
  }

  public async findAll(): Promise<Deployment[]> {
    return JSON.parse(JSON.stringify(this.cache));
  }

  public async findById(id: string): Promise<Deployment | null> {
    const found = this.cache.find(
      (d) => d.id === id || d.serviceId === id || d.serviceName.toLowerCase().includes(id.toLowerCase())
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async save(
    deployment: Deployment,
    expectedStatus?: DeploymentStatus
  ): Promise<Deployment> {
    const idx = this.cache.findIndex((d) => d.id === deployment.id);

    if (idx !== -1) {
      const existing = this.cache[idx];
      // Optimistic concurrency check (matching Jayesh's db.updateDeploymentState contract)
      if (expectedStatus && existing.status !== expectedStatus) {
        throw new StateConflictError(deployment.id, existing.status, expectedStatus);
      }
      this.cache[idx] = JSON.parse(JSON.stringify(deployment));
    } else {
      this.cache.push(JSON.parse(JSON.stringify(deployment)));
    }

    this.persist();
    return JSON.parse(JSON.stringify(deployment));
  }

  public async reset(): Promise<void> {
    this.cache = JSON.parse(JSON.stringify(mockDeployments));
    this.persist();
  }
}

export const deploymentRepository = new DeploymentRepository();
