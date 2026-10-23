import { ErrorCode, ErrorCodes } from './error-codes.js';

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, ErrorCodes.BAD_REQUEST, message, details);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Unauthorized access', code: ErrorCode = ErrorCodes.UNAUTHORIZED): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'Forbidden resource or action', code: ErrorCode = ErrorCodes.FORBIDDEN): AppError {
    return new AppError(403, code, message);
  }

  static notFound(resource = 'Resource', details?: unknown): AppError {
    return new AppError(404, ErrorCodes.NOT_FOUND, `${resource} not found`, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, ErrorCodes.STATE_CONFLICT, message, details);
  }

  static internal(message = 'Internal server error occurred', details?: unknown): AppError {
    return new AppError(500, ErrorCodes.INTERNAL_SERVER_ERROR, message, details);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', details?: unknown): AppError {
    return new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, message, details);
  }
}
