import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/health', async () => {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  });

  fastify.get('/api/v1/ready', async () => {
    const isDbReady = await db.isConnected();
    if (!isDbReady) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database dependency is unhealthy');
    }
    return {
      status: 'ready',
      database: db.isUsingPostgres() ? 'postgresql_connected' : 'memory_fallback_active',
      timestamp: new Date().toISOString(),
    };
  });
};
