import { db } from '../../db/index.js';
import { AppError } from '../../errors/AppError.js';
import { HealthStatus, ReadyStatus } from './health.types.js';

export class HealthService {
  public static getHealth(): HealthStatus {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  public static async getReadiness(): Promise<ReadyStatus> {
    const isDbReady = await db.isConnected();
    if (!isDbReady) {
      throw AppError.serviceUnavailable('Database dependency is unhealthy');
    }

    return {
      status: 'ready',
      database: db.isUsingMongo() ? 'mongodb_connected' : 'memory_fallback_active',
      timestamp: new Date().toISOString(),
    };
  }
}
