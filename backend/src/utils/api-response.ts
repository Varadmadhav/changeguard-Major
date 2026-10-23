import crypto from 'node:crypto';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return meta ? { data, meta } : { data };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page = 1,
  limit = 50
): ApiResponse<T[]> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function formatErrorPayload(
  code: string,
  message: string,
  requestId?: string,
  details?: unknown
): ApiErrorResponse {
  const reqId = requestId || `req_${crypto.randomUUID().slice(0, 12)}`;
  return {
    error: {
      code,
      message,
      requestId: reqId,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
