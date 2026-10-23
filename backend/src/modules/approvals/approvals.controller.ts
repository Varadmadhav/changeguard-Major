import { FastifyReply, FastifyRequest } from 'fastify';
import { ApprovalsService } from './approvals.service.js';

export class ApprovalsController {
  public static async governanceApprove(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await ApprovalsService.governanceApprove(request.params.id, request.user!);
    return reply.status(200).send(result);
  }
}
