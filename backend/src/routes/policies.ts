import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { PolicyEngine } from '../services/policyEngine.js';
import { AuditWriter } from '../services/auditWriter.js';
import { PolicyRule } from '../types/shared.js';

interface CreatePolicyBody {
  name: string;
  description: string;
  environment: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  enforcementMode?: 'ENFORCING' | 'DRY_RUN';
  owner?: string;
  rules: PolicyRule[];
}

interface UpdatePolicyBody {
  name?: string;
  description?: string;
  environment?: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope?: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status?: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  enforcementMode?: 'ENFORCING' | 'DRY_RUN';
  owner?: string;
  rules?: PolicyRule[];
}

export const policyRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/policies - list all policies
  fastify.get('/api/v1/policies', { preHandler: [authenticate] }, async (request, reply) => {
    const policies = await db.listPolicies(request.user.organizationId);
    return reply.status(200).send({
      data: policies,
      meta: { total: policies.length },
    });
  });

  // GET /api/v1/policies/:id - get policy by ID
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/policies/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const policy = await db.getPolicyById(id, request.user.organizationId);
      if (!policy) {
        throw new AppError(404, 'POLICY_NOT_FOUND', `Policy with ID ${id} not found`);
      }
      return reply.status(200).send({ data: policy });
    }
  );

  // POST /api/v1/policies - create new policy (requires PLATFORM_ENGINEER or ADMIN)
  fastify.post<{ Body: CreatePolicyBody }>(
    '/api/v1/policies',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const { name, description, environment, tierScope, status, enforcementMode, owner, rules } =
        request.body || {};

      if (!name || !rules || !Array.isArray(rules)) {
        throw new AppError(400, 'BAD_REQUEST', 'Policy name and rules array are required');
      }

      const created = await db.createPolicy(
        {
          organizationId: request.user.organizationId,
          name,
          description: description || '',
          environment: environment || 'PRODUCTION',
          tierScope: tierScope || 'ALL',
          status: status || 'DRAFT',
          enforcementMode: enforcementMode || 'ENFORCING',
          owner: owner || request.user.name,
          rules,
          updatedBy: request.user.name,
        },
        request.user.name
      );

      // Audit event
      await AuditWriter.record({
        organizationId: request.user.organizationId,
        actor: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          type: 'USER',
        },
        action: 'POLICY_CREATED',
        actionTitle: `Created Policy: ${created.name}`,
        resource: {
          type: 'POLICY',
          id: created.id,
          name: created.name,
        },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Created version ${created.version} with ${created.rulesCount} safety rule(s).`,
      });

      return reply.status(201).send({
        data: created,
        message: 'Policy created successfully',
      });
    }
  );

  // PUT /api/v1/policies/:id - update policy, increment version, and record snapshot
  fastify.put<{ Params: { id: string }; Body: UpdatePolicyBody }>(
    '/api/v1/policies/:id',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body || {};

      const result = await db.updatePolicy(id, updates, request.user.name, request.user.organizationId);
      if (!result) {
        throw new AppError(404, 'POLICY_NOT_FOUND', `Policy with ID ${id} not found`);
      }

      // Record audit event
      await AuditWriter.record({
        organizationId: request.user.organizationId,
        actor: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          type: 'USER',
        },
        action: 'POLICY_UPDATED',
        actionTitle: `Updated Policy: ${result.policy.name} (v${result.policy.version})`,
        resource: {
          type: 'POLICY',
          id: result.policy.id,
          name: result.policy.name,
        },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Incremented from version ${result.previousVersion.version} to ${result.policy.version}. Previous configuration archived.`,
      });

      return reply.status(200).send({
        data: result.policy,
        message: `Policy updated to version ${result.policy.version}`,
      });
    }
  );

  // PATCH /api/v1/policies/:id/rules - update rules in policy
  fastify.patch<{ Params: { id: string }; Body: { rules: PolicyRule[] } }>(
    '/api/v1/policies/:id/rules',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER'])] },
    async (request, reply) => {
      const { id } = request.params;
      const { rules } = request.body || {};

      if (!rules || !Array.isArray(rules)) {
        throw new AppError(400, 'BAD_REQUEST', 'Rules array is required');
      }

      const result = await db.updatePolicy(id, { rules }, request.user.name, request.user.organizationId);
      if (!result) {
        throw new AppError(404, 'POLICY_NOT_FOUND', `Policy with ID ${id} not found`);
      }

      await AuditWriter.record({
        organizationId: request.user.organizationId,
        actor: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          type: 'USER',
        },
        action: 'POLICY_UPDATED',
        actionTitle: `Updated rules in Policy: ${result.policy.name}`,
        resource: {
          type: 'POLICY',
          id: result.policy.id,
          name: result.policy.name,
        },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Configured ${rules.length} safety rules. Version bumped to ${result.policy.version}.`,
      });

      return reply.status(200).send({
        data: result.policy,
        message: 'Policy rules updated successfully',
      });
    }
  );

  // POST /api/v1/policies/:id/evaluate - dry-run evaluate policy against change attributes
  fastify.post<{ Params: { id: string }; Body: Record<string, any> }>(
    '/api/v1/policies/:id/evaluate',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const context = request.body || {};

      const policy = await db.getPolicyById(id, request.user.organizationId);
      if (!policy) {
        throw new AppError(404, 'POLICY_NOT_FOUND', `Policy with ID ${id} not found`);
      }

      const output = PolicyEngine.evaluatePolicy(policy, context);

      // Log dry run evaluation in audit log if in DRY_RUN mode
      if (policy.enforcementMode === 'DRY_RUN') {
        await AuditWriter.record({
          organizationId: request.user.organizationId,
          actor: {
            id: request.user.id,
            name: request.user.name,
            email: request.user.email,
            type: 'POLICY_ENGINE',
          },
          action: 'POLICY_ENFORCED',
          actionTitle: `Dry-Run Evaluated: ${policy.name}`,
          resource: {
            type: 'POLICY',
            id: policy.id,
            name: policy.name,
          },
          result: 'SUCCESS',
          source: 'POLICY_ENGINE',
          details: `DRY_RUN mode: ${output.summary}`,
        });
      }

      return reply.status(200).send({
        data: output,
      });
    }
  );

  // GET /api/v1/policies/:id/versions - get version history
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/policies/:id/versions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const versions = await db.getPolicyVersions(id);
      return reply.status(200).send({
        data: versions,
        meta: { total: versions.length },
      });
    }
  );
};
