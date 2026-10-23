import { FastifyReply, FastifyRequest } from 'fastify';
import { ImpactGraphService } from './impact-graph.service.js';

export class ImpactGraphController {
  public static async getImpactGraph(
    request: FastifyRequest<{ Params?: { serviceId?: string } }>,
    reply: FastifyReply
  ) {
    const graph = await ImpactGraphService.getImpactGraph(
      request.user!.organizationId,
      request.params?.serviceId
    );
    return reply.status(200).send({ data: graph });
  }
}
