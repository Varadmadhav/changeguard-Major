import crypto from 'node:crypto';
import { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLoggerMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const reqId = (request.headers['x-request-id'] as string) || `req_${crypto.randomUUID().slice(0, 12)}`;
  request.id = reqId;
  reply.header('x-request-id', reqId);
}
