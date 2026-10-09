import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { AuditWriter } from '../services/auditWriter.js';
import { OrgSettings } from '../types/shared.js';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/settings - read all organization settings
  fastify.get('/api/v1/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    const settings = await db.getSettings(orgId);
    return reply.status(200).send({ data: settings });
  });

  // PATCH /api/v1/settings/:section - update specific settings section
  fastify.patch<{
    Params: { section: keyof OrgSettings };
    Body: any;
  }>(
    '/api/v1/settings/:section',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const orgId = request.user.organizationId;
      const { section } = request.params;
      const data = request.body;

      const validSections: Array<keyof OrgSettings> = [
        'general',
        'security',
        'environments',
        'notifications',
        'ai',
      ];

      if (!validSections.includes(section)) {
        throw new AppError(400, 'BAD_REQUEST', `Invalid settings section: ${section}`);
      }

      const updated = await db.updateSettings(orgId, section, data);

      await AuditWriter.record({
        organizationId: orgId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'POLICY_UPDATED',
        actionTitle: `Updated settings section: ${section}`,
        resource: { type: 'SETTING', id: `settings-${section}`, name: `${section} settings` },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Updated ${section} configuration parameters.`,
      });

      return reply.status(200).send({ data: updated });
    }
  );
};
