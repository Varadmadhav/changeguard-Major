import crypto from 'node:crypto';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function formatErrorPayload(
  code: string,
  message: string,
  requestId: string,
  details?: unknown
) {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  };
}

export function errorHandler(error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.id as string) || `req_${crypto.randomUUID().slice(0, 12)}`;
  
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(
      formatErrorPayload(error.code, error.message, requestId, error.details)
    );
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send(
      formatErrorPayload('VALIDATION_ERROR', error.message, requestId, error.validation)
    );
  }

  // Handle Fastify rate-limiting or 429
  if (error.statusCode === 429) {
    return reply.status(429).send(
      formatErrorPayload('TOO_MANY_REQUESTS', 'Rate limit exceeded, please retry later', requestId)
    );
  }

  // Generic internal server error
  const statusCode = error.statusCode || 500;
  const code = statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR';
  
  return reply.status(statusCode).send(
    formatErrorPayload(code, error.message || 'An unexpected server error occurred', requestId)
  );
}
