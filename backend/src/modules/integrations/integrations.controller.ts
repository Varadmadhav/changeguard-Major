import { FastifyReply, FastifyRequest } from 'fastify';
import { IntegrationsService } from './integrations.service.js';
import { IntegrationItem } from './integrations.types.js';

export class IntegrationsController {
  public static async listIntegrations(request: FastifyRequest, reply: FastifyReply) {
    const integrations = await IntegrationsService.listIntegrations(request.user!.organizationId);
    return reply.status(200).send({ data: integrations });
  }

  public static async updateIntegration(
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<IntegrationItem> }>,
    reply: FastifyReply
  ) {
    const updated = await IntegrationsService.updateIntegration(
      request.params.id,
      request.body,
      request.user!
    );
    return reply.status(200).send({ data: updated });
  }

  public static async testIntegration(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await IntegrationsService.testIntegration(request.params.id);
    return reply.status(200).send({ data: result });
  }
}
