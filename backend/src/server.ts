import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { errorHandler } from './plugins/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { teamRoutes } from './routes/team.js';
import { apiKeyRoutes } from './routes/apiKeys.js';
import { webhookRoutes } from './routes/webhook.js';
import { changeRoutes } from './routes/changes.js';

export async function buildApp() {
  const isTest = process.env.NODE_ENV === 'test' || config.nodeEnv === 'test';
  const app = Fastify({
    logger: isTest ? false : { level: 'info' },
  });

  // CORS configuration
  await app.register(fastifyCors, {
    origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Rate limiting (Section 14.1 / 10.1)
  await app.register(fastifyRateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  // Register JWT globally
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  // Custom PRD-compliant Error Handler
  app.setErrorHandler(errorHandler);

  // Register Core Route Modules
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(teamRoutes);
  await app.register(apiKeyRoutes);
  await app.register(webhookRoutes);
  await app.register(changeRoutes);

  return app;
}

export async function startServer() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`\n======================================================`);
    console.log(` ChangeGuard API Server running on http://${config.host}:${config.port}`);
    console.log(` Health probe:  http://localhost:${config.port}/api/v1/health`);
    console.log(` Ready probe:   http://localhost:${config.port}/api/v1/ready`);
    console.log(` Webhook URL:   http://localhost:${config.port}/api/v1/webhook/github`);
    console.log(` Changes API:   http://localhost:${config.port}/api/v1/changes`);
    console.log(`======================================================\n`);
    return app;
  } catch (err) {
    console.error('Failed to start ChangeGuard API server:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain && process.env.NODE_ENV !== 'test') {
  startServer();
}
