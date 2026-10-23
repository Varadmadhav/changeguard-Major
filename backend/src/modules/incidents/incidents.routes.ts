import { FastifyPluginAsync } from 'fastify';
import { IncidentsController } from './incidents.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { IncidentsValidator } from './incidents.validator.js';

export const incidentRoutes: FastifyPluginAsync = async (fastify) => {
  const privileged = [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])];

  fastify.get('/api/v1/incidents', { preHandler: [authenticate] }, IncidentsController.listIncidents as any);
  fastify.get('/api/v1/incidents/:id', { preHandler: [authenticate] }, IncidentsController.getIncidentById as any);

  fastify.post(
    '/api/v1/incidents',
    { preHandler: [...privileged, validateBody(IncidentsValidator.validateCreate)] },
    IncidentsController.createIncident as any
  );

  fastify.patch(
    '/api/v1/incidents/:id/status',
    { preHandler: [...privileged, validateBody(IncidentsValidator.validateStatus)] },
    IncidentsController.updateStatus as any
  );

  fastify.patch(
    '/api/v1/incidents/:id/rca',
    { preHandler: privileged },
    IncidentsController.updateRca as any
  );
};
