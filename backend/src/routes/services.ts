import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { ServiceDiscoveryJob } from '../jobs/serviceDiscovery.js';
import { ServiceTelemetrySyncJob } from '../jobs/serviceTelemetrySync.js';

export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/services - list service catalog
  fastify.get<{
    Querystring: { tier?: string; health?: string; environment?: string };
  }>('/api/v1/services', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    const services = await db.listServices(orgId, request.query);
    return reply.status(200).send({
      data: services,
      meta: { total: services.length },
    });
  });

  // GET /api/v1/services/:id - service detail
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/services/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const service = await db.getServiceById(id);
      if (!service) {
        throw new AppError(404, 'SERVICE_NOT_FOUND', `Service ${id} not found in catalog`);
      }
      return reply.status(200).send({ data: service });
    }
  );

  // POST /api/v1/services/sync - trigger manual K8s discovery and telemetry sync
  fastify.post(
    '/api/v1/services/sync',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const orgId = request.user.organizationId;
      const discoveryResult = await ServiceDiscoveryJob.run(orgId);
      const syncResult = await ServiceTelemetrySyncJob.run(orgId);
      const allServices = await db.listServices(orgId);

      return reply.status(200).send({
        data: {
          discovered: discoveryResult.discoveredCount,
          synced: syncResult.updatedCount,
          totalServices: allServices.length,
        },
      });
    }
  );
};
