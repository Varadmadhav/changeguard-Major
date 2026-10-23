import { FastifyReply, FastifyRequest } from 'fastify';
import { IncidentsService } from './incidents.service.js';
import { CreateIncidentBody, ListIncidentsQuery, UpdateRcaBody, UpdateStatusBody } from './incidents.types.js';

export class IncidentsController {
  public static async listIncidents(
    request: FastifyRequest<{ Querystring: ListIncidentsQuery }>,
    reply: FastifyReply
  ) {
    const incidents = await IncidentsService.listIncidents(request.user!.organizationId, request.query);
    return reply.status(200).send({
      data: incidents,
      meta: { total: incidents.length },
    });
  }

  public static async getIncidentById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const incident = await IncidentsService.getIncidentById(request.params.id);
    return reply.status(200).send({ data: incident });
  }

  public static async createIncident(
    request: FastifyRequest<{ Body: CreateIncidentBody }>,
    reply: FastifyReply
  ) {
    const created = await IncidentsService.createIncident(request.body, request.user!.organizationId);
    return reply.status(201).send({ data: created });
  }

  public static async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateStatusBody }>,
    reply: FastifyReply
  ) {
    const updated = await IncidentsService.updateStatus(request.params.id, request.body, request.user!);
    return reply.status(200).send({ data: updated });
  }

  public static async updateRca(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateRcaBody }>,
    reply: FastifyReply
  ) {
    const updated = await IncidentsService.updateRca(request.params.id, request.body);
    return reply.status(200).send({ data: updated });
  }
}
