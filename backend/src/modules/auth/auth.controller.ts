import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { LoginRequestBody, SsoCallbackBody } from './auth.types.js';

export class AuthController {
  public static async login(
    request: FastifyRequest<{ Body: LoginRequestBody }>,
    reply: FastifyReply
  ) {
    const result = await AuthService.login(
      request.body || {},
      request.server.jwt.sign.bind(request.server.jwt)
    );
    return reply.status(200).send(result);
  }

  public static async logout(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({
      success: true,
      message: 'Session successfully terminated',
    });
  }

  public static async getMe(request: FastifyRequest, reply: FastifyReply) {
    const result = await AuthService.getCurrentUser(request.user!.id);
    return reply.status(200).send(result);
  }

  public static async ssoCallback(
    request: FastifyRequest<{ Body: SsoCallbackBody }>,
    reply: FastifyReply
  ) {
    const result = await AuthService.ssoCallback(
      request.body.SAMLResponse,
      request.server.jwt.sign.bind(request.server.jwt)
    );
    return reply.status(200).send(result);
  }
}
