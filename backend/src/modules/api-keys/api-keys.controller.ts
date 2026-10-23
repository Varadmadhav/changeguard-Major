import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiKeyService } from './api-keys.service.js';
import { CreateApiKeyBody } from './api-keys.types.js';

export class ApiKeyController {
  public static async listKeys(request: FastifyRequest, reply: FastifyReply) {
    const keys = await ApiKeyService.listKeys(request.user!.organizationId);
    return reply.status(200).send({
      data: keys,
      meta: {
        total: keys.length,
      },
    });
  }

  public static async createKey(
    request: FastifyRequest<{ Body: CreateApiKeyBody }>,
    reply: FastifyReply
  ) {
    const result = await ApiKeyService.createKey(
      request.user!.organizationId,
      request.user!.id,
      request.body.name
    );
    return reply.status(201).send({
      data: result,
      message: 'API key created successfully. Save this secret now; it will not be shown again.',
    });
  }

  public static async revokeKey(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    await ApiKeyService.revokeKey(id, request.user!.organizationId);
    return reply.status(200).send({
      success: true,
      message: 'API key revoked successfully',
    });
  }
}
