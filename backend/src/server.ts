import { buildApp } from './app.js';
import { config } from './config/env.js';
import { db } from './db/index.js';

export { buildApp };

export async function startServer() {
  try {
    // Ensure database connection is initialized
    await db.isConnected();

    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });

    console.log(`\n======================================================`);
    console.log(` ChangeGuard API Server running on http://${config.host}:${config.port}`);
    console.log(` Mode:          ${config.nodeEnv}`);
    console.log(` Database:      ${db.isUsingMongo() ? 'MongoDB Active' : 'Memory Resilient Store Active'}`);
    console.log(` Health probe:  http://localhost:${config.port}/api/v1/health`);
    console.log(` Ready probe:   http://localhost:${config.port}/api/v1/ready`);
    console.log(` Webhook URL:   http://localhost:${config.port}/api/v1/webhook/github`);
    console.log(` Changes API:   http://localhost:${config.port}/api/v1/changes`);
    console.log(` Policies API:  http://localhost:${config.port}/api/v1/policies`);
    console.log(` Deployments:   http://localhost:${config.port}/api/v1/deployments`);
    console.log(` Services API:  http://localhost:${config.port}/api/v1/services`);
    console.log(` Incidents API: http://localhost:${config.port}/api/v1/incidents`);
    console.log(` Impact Graph:  http://localhost:${config.port}/api/v1/impact-graph`);
    console.log(` Settings API:  http://localhost:${config.port}/api/v1/settings`);
    console.log(` Integrations:  http://localhost:${config.port}/api/v1/integrations`);
    console.log(` Analytics API: http://localhost:${config.port}/api/v1/analytics/summary`);
    console.log(` DORA API:      http://localhost:${config.port}/api/v1/analytics/dora`);
    console.log(` Audit Log API: http://localhost:${config.port}/api/v1/audit-log`);
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
