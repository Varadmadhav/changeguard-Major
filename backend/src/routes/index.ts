import { FastifyInstance } from 'fastify';
import { healthRoutes } from '../modules/health/health.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { teamRoutes } from '../modules/team/team.routes.js';
import { apiKeyRoutes } from '../modules/api-keys/api-keys.routes.js';
import { webhookRoutes } from '../modules/webhook/webhook.routes.js';
import { changeRoutes } from '../modules/changes/changes.routes.js';
import { policyRoutes } from '../modules/policies/policies.routes.js';
import { approvalRoutes } from '../modules/approvals/approvals.routes.js';
import { auditRoutes } from '../modules/audit/audit.routes.js';
import { deploymentRoutes } from '../modules/deployments/deployments.routes.js';
import { serviceRoutes } from '../modules/services/services.routes.js';
import { incidentRoutes } from '../modules/incidents/incidents.routes.js';
import { impactGraphRoutes } from '../modules/impact-graph/impact-graph.routes.js';
import { settingsRoutes } from '../modules/settings/settings.routes.js';
import { integrationRoutes } from '../modules/integrations/integrations.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(teamRoutes);
  await app.register(apiKeyRoutes);
  await app.register(webhookRoutes);
  await app.register(changeRoutes);
  await app.register(policyRoutes);
  await app.register(approvalRoutes);
  await app.register(auditRoutes);
  await app.register(deploymentRoutes);
  await app.register(serviceRoutes);
  await app.register(incidentRoutes);
  await app.register(impactGraphRoutes);
  await app.register(settingsRoutes);
  await app.register(integrationRoutes);
  await app.register(analyticsRoutes);
}

export {
  healthRoutes,
  authRoutes,
  teamRoutes,
  apiKeyRoutes,
  webhookRoutes,
  changeRoutes,
  policyRoutes,
  approvalRoutes,
  auditRoutes,
  deploymentRoutes,
  serviceRoutes,
  incidentRoutes,
  impactGraphRoutes,
  settingsRoutes,
  integrationRoutes,
  analyticsRoutes,
};
