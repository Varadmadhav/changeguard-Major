import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { corsConfig } from './config/cors.js';
import { rateLimitConfig } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test' || config.nodeEnv === 'test';
  const app = Fastify({
    logger: isTest ? false : { level: 'info' },
  });

  // Attach request ID and correlation logging
  app.addHook('onRequest', requestLoggerMiddleware);

  // CORS
  await app.register(fastifyCors, {
    origin: corsConfig.origin as any,
    credentials: corsConfig.credentials,
    methods: corsConfig.methods,
    allowedHeaders: corsConfig.allowedHeaders,
  });

  // Rate Limiting
  await app.register(fastifyRateLimit, rateLimitConfig);

  // JWT
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  // PRD-compliant Error & 404 Handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Register all feature routes
  await registerRoutes(app);

  return app;
}
