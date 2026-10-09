import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { authenticate } from '../plugins/auth.js';

export const impactGraphRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/impact-graph - full topology impact graph
  fastify.get('/api/v1/impact-graph', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    const graph = await db.getImpactGraph(orgId);
    return reply.status(200).send({ data: graph });
  });

  // GET /api/v1/impact-graph/:serviceId - focused sub-graph for a specific service
  fastify.get<{ Params: { serviceId: string } }>(
    '/api/v1/impact-graph/:serviceId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const orgId = request.user.organizationId;
      const { serviceId } = request.params;
      const graph = await db.getImpactGraph(orgId, serviceId);
      return reply.status(200).send({ data: graph });
    }
  );
};
