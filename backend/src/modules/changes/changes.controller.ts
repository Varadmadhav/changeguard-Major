import { FastifyReply, FastifyRequest } from 'fastify';
import { ChangesService } from './changes.service.js';
import { AnalyzeChangeBody, ListChangesQuery } from './changes.types.js';

export class ChangesController {
  public static async listChanges(
    request: FastifyRequest<{ Querystring: ListChangesQuery }>,
    reply: FastifyReply
  ) {
    const result = await ChangesService.listChanges(request.user!.organizationId, request.query);
    return reply.status(200).send(result);
  }

  public static async getChangeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const change = await ChangesService.getChangeById(request.params.id, request.user!.organizationId);
    return reply.status(200).send({ data: change });
  }

  public static async analyzeChange(
    request: FastifyRequest<{ Body: AnalyzeChangeBody }>,
    reply: FastifyReply
  ) {
    const created = await ChangesService.analyzeChange(request.body, request.user!);
    return reply.status(201).send({
      data: created,
      message: 'Change analyzed and registered successfully',
    });
  }

  public static async approveChange(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await ChangesService.approveChange(
      request.params.id,
      request.user!.id,
      request.user!.organizationId
    );
    return reply.status(200).send({
      data: result.change,
      isFullyApproved: result.isFullyApproved,
      message: 'Release policy recommendation approved successfully',
    });
  }

  public static async rejectChange(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const rejected = await ChangesService.rejectChange(request.params.id, request.user!.organizationId);
    return reply.status(200).send({
      data: rejected,
      message: 'Change rejected',
    });
  }
}
