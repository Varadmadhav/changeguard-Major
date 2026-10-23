import { FastifyReply, FastifyRequest } from 'fastify';
import { formatErrorPayload } from '../utils/api-response.js';

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.id as string) || `req_404`;
  return reply.status(404).send(
    formatErrorPayload(
      'NOT_FOUND',
      `Route ${request.method} ${request.url} not found`,
      requestId
    )
  );
}
