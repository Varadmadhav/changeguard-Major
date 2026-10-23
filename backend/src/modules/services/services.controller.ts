import { FastifyReply, FastifyRequest } from 'fastify';
import { ServicesService } from './services.service.js';
import { ListServicesQuery } from './services.types.js';

export class ServicesController {
  public static async listServices(
    request: FastifyRequest<{ Querystring: ListServicesQuery }>,
    reply: FastifyReply
  ) {
    const services = await ServicesService.listServices(request.user!.organizationId, request.query);
    return reply.status(200).send({
      data: services,
      meta: { total: services.length },
    });
  }

  public static async getServiceById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const service = await ServicesService.getServiceById(request.params.id);
    return reply.status(200).send({ data: service });
  }

  public static async syncServices(request: FastifyRequest, reply: FastifyReply) {
    const result = await ServicesService.syncServices(request.user!.organizationId);
    return reply.status(200).send({ data: result });
  }
}
