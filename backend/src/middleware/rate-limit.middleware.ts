import { config } from '../config/env.js';

export const rateLimitConfig = {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindowMs,
  errorResponseBuilder: (_request: any, context: any) => {
    return {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded, retry after ${context.after}`,
        requestId: `req_rate_limit`,
      },
    };
  },
};
