import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { AuditWriter } from '../services/auditWriter.js';
import { IncidentStatus } from '../types/shared.js';

interface UpdateStatusBody {
  status: IncidentStatus;
  comment?: string;
}

interface UpdateRcaBody {
  summary?: string;
  triggerMechanism?: string;
  failureContainedBy?: string;
  preventativeRecommendation?: string;
}

export const incidentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/incidents - list all incidents
  fastify.get<{
    Querystring: { severity?: string; status?: string };
  }>('/api/v1/incidents', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    let incidents = await db.listIncidents(orgId);

    if (request.query.severity) {
      incidents = incidents.filter((i) => i.severity === request.query.severity);
    }
    if (request.query.status) {
      incidents = incidents.filter((i) => i.status === request.query.status);
    }

    return reply.status(200).send({
      data: incidents,
      meta: { total: incidents.length },
    });
  });

  // GET /api/v1/incidents/:id - incident detail
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/incidents/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const incident = await db.getIncidentById(id);
      if (!incident) {
        throw new AppError(404, 'INCIDENT_NOT_FOUND', `Incident ${id} not found`);
      }
      return reply.status(200).send({ data: incident });
    }
  );

  // PATCH /api/v1/incidents/:id/status - transition lifecycle status
  fastify.patch<{ Params: { id: string }; Body: UpdateStatusBody }>(
    '/api/v1/incidents/:id/status',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const { status, comment } = request.body;

      if (!status) {
        throw new AppError(400, 'BAD_REQUEST', 'Missing status field');
      }

      const updated = await db.updateIncidentStatus(id, status, comment);

      await AuditWriter.record({
        organizationId: updated.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'DEPLOYMENT_PAUSED', // Reusable audit action category
        actionTitle: `Incident ${updated.code} status changed to ${status}`,
        resource: { type: 'SERVICE', id: updated.id, name: updated.title },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: comment || `Status transition to ${status}`,
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // PATCH /api/v1/incidents/:id/rca - update root cause analysis draft
  fastify.patch<{ Params: { id: string }; Body: UpdateRcaBody }>(
    '/api/v1/incidents/:id/rca',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const rca = request.body;
      const updated = await db.updateIncidentRca(id, rca);
      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/incidents - manually create or trigger incident
  fastify.post<{
    Body: {
      title: string;
      severity?: 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
      affectedServices?: string[];
      relatedDeploymentId?: string;
      relatedChangeId?: string;
      rca_summary?: string;
    };
  }>(
    '/api/v1/incidents',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const created = await db.createIncident({
        organizationId: request.user.organizationId,
        ...request.body,
      });
      return reply.status(201).send({ data: created });
    }
  );
};
