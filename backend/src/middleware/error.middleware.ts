import crypto from 'node:crypto';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError.js';
import { formatErrorPayload } from '../utils/api-response.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (request.id as string) || `req_${crypto.randomUUID().slice(0, 12)}`;

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(
      formatErrorPayload(error.code, error.message, requestId, error.details)
    );
  }

  // Handle Fastify schema validation errors
  const fastifyErr = error as FastifyError;
  if (fastifyErr.validation) {
    return reply.status(400).send(
      formatErrorPayload('VALIDATION_ERROR', fastifyErr.message, requestId, fastifyErr.validation)
    );
  }

  // Handle Fastify rate-limiting / 429
  if (fastifyErr.statusCode === 429) {
    return reply.status(429).send(
      formatErrorPayload('TOO_MANY_REQUESTS', 'Rate limit exceeded, please retry later', requestId)
    );
  }

  // Handle JWT errors from @fastify/jwt
  if (fastifyErr.statusCode === 401 || fastifyErr.name === 'UnauthorizedError') {
    return reply.status(401).send(
      formatErrorPayload('UNAUTHORIZED', fastifyErr.message || 'Authentication required', requestId)
    );
  }

  const statusCode = fastifyErr.statusCode || 500;
  const code =
    statusCode === 404
      ? 'NOT_FOUND'
      : statusCode === 403
      ? 'FORBIDDEN'
      : statusCode === 401
      ? 'UNAUTHORIZED'
      : 'INTERNAL_SERVER_ERROR';

  return reply.status(statusCode).send(
    formatErrorPayload(code, fastifyErr.message || 'An unexpected server error occurred', requestId)
  );
}
