import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/AppError.js';

export type ValidatorFn<T = any> = (data: unknown) => { valid: boolean; errors?: string[] };

export function validateBody<T>(validator: ValidatorFn<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = validator(request.body);
    if (!result.valid) {
      throw AppError.validation('Request body validation failed', result.errors);
    }
  };
}

export function validateParams<T>(validator: ValidatorFn<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = validator(request.params);
    if (!result.valid) {
      throw AppError.validation('Request parameters validation failed', result.errors);
    }
  };
}

export function validateQuery<T>(validator: ValidatorFn<T>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = validator(request.query);
    if (!result.valid) {
      throw AppError.validation('Request query validation failed', result.errors);
    }
  };
}
