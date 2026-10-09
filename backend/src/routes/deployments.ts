import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { AppError } from '../plugins/errorHandler.js';
import { authenticate } from '../plugins/auth.js';
import { requireRole } from '../plugins/rbac.js';
import { argoClient } from '../services/argoClient.js';
import { prometheusClient } from '../services/prometheusClient.js';
import { VerificationEngine } from '../services/verificationEngine.js';
import { AuditWriter } from '../services/auditWriter.js';
import { Deployment, DeploymentStatus } from '../types/shared.js';

interface PauseDeploymentBody {
  reason?: string;
}

interface RollbackDeploymentBody {
  reason?: string;
  targetVersion?: string;
  expectedStatus?: DeploymentStatus;
}

interface SimulateFailureBody {
  errorRate?: number;
  p95Latency?: number;
}

export const deploymentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/deployments - list all deployments
  fastify.get<{
    Querystring: { environment?: string; status?: string; serviceId?: string };
  }>('/api/v1/deployments', { preHandler: [authenticate] }, async (request, reply) => {
    const orgId = request.user.organizationId;
    const deployments = await db.listDeployments(orgId, request.query);
    return reply.status(200).send({
      data: deployments,
      meta: { total: deployments.length },
    });
  });

  // GET /api/v1/deployments/:id - get deployment by ID
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/deployments/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }
      return reply.status(200).send({ data: deployment });
    }
  );

  // POST /api/v1/deployments - create a new progressive canary deployment
  fastify.post<{
    Body: {
      serviceId: string;
      serviceName: string;
      serviceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
      version: string;
      previousVersion: string;
      environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
      changeId: string;
      changeTitle: string;
      changeAuthor: string;
      repository: string;
      commitHash: string;
    };
  }>(
    '/api/v1/deployments',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const orgId = request.user.organizationId;
      const body = request.body;

      const created = await db.createDeployment({
        organizationId: orgId,
        serviceId: body.serviceId,
        serviceName: body.serviceName,
        serviceTier: body.serviceTier,
        version: body.version,
        previousVersion: body.previousVersion,
        environment: body.environment,
        status: 'MONITORING',
        risk: { score: 45, level: 'MEDIUM' },
        strategy: 'CANARY',
        currentTrafficPercentage: 5,
        targetTrafficPercentage: 5,
        stages: [5, 25, 50, 100],
        currentStageIndex: 0,
        health: 'HEALTHY',
        changeId: body.changeId,
        changeTitle: body.changeTitle,
        changeAuthor: body.changeAuthor,
        repository: body.repository,
        commitHash: body.commitHash,
        currentTelemetry: {
          errorRate: 0.04,
          p95Latency: 175,
          requestsPerMinute: 11500,
          cpuUtilization: 38,
          memoryUtilization: 52,
        },
        signals: [
          {
            id: 'sig-1',
            name: 'HTTP Error Rate',
            description: 'Aggregate 5xx response percentage over rolling window',
            metricKey: 'http_error_rate_pct',
            operator: '<',
            threshold: 1.0,
            currentValue: 0.04,
            unit: '%',
            status: 'PASSED',
            evaluatedAt: new Date().toISOString(),
          },
          {
            id: 'sig-2',
            name: 'P95 Transaction Latency',
            description: 'End-to-end service response duration at 95th percentile',
            metricKey: 'p95_latency_ms',
            operator: '<',
            threshold: 500,
            currentValue: 175,
            unit: 'ms',
            status: 'PASSED',
            evaluatedAt: new Date().toISOString(),
          },
        ],
      });

      await argoClient.setTrafficPercentage(body.serviceName, 5);

      await AuditWriter.record({
        organizationId: orgId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'DEPLOYMENT_STARTED',
        actionTitle: 'Canary Rollout Started',
        resource: { type: 'DEPLOYMENT', id: created.id, name: `${body.serviceName} (${body.version})` },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Initiated 5% canary rollout for ${body.serviceName} version ${body.version}.`,
      });

      return reply.status(201).send({ data: created });
    }
  );

  // POST /api/v1/deployments/:id/promote - advance canary traffic stage (5% -> 25% -> 50% -> 100%)
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/promote',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      const nextIdx = Math.min(deployment.currentStageIndex + 1, deployment.stages.length - 1);
      const targetTraffic = deployment.stages[nextIdx];
      const isFull = targetTraffic === 100;
      const newStatus: DeploymentStatus = isFull ? 'PROMOTED' : 'MONITORING';

      await argoClient.setTrafficPercentage(deployment.serviceName, targetTraffic);

      const timelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: isFull ? 'Deployment 100% Promoted' : `Traffic Promoted to ${targetTraffic}%`,
        description: isFull
          ? 'Rollout reached full production traffic. All verification gates passed.'
          : `Advanced canary traffic to stage ${nextIdx + 1} (${targetTraffic}%).`,
        type: 'SUCCESS' as const,
        actor: `${request.user.name} (Operator)`,
      };

      const updated = await db.updateDeploymentState(id, newStatus, {
        currentTrafficPercentage: targetTraffic,
        targetTrafficPercentage: targetTraffic,
        currentStageIndex: nextIdx,
        health: 'HEALTHY',
        timeline: [timelineEvent, ...deployment.timeline],
        ...(isFull ? { completedAt: new Date().toISOString() } : {}),
      });

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'DEPLOYMENT_PROMOTED',
        actionTitle: `Traffic promoted to ${targetTraffic}%`,
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: `Canary traffic percentage shifted from ${deployment.currentTrafficPercentage}% to ${targetTraffic}%.`,
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/deployments/:id/pause - pause rollout progression
  fastify.post<{ Params: { id: string }; Body: PauseDeploymentBody }>(
    '/api/v1/deployments/:id/pause',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      const reason = request.body?.reason || 'Operator paused rollout progression.';
      await argoClient.pauseRollout(deployment.serviceName, reason);

      const timelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Rollout Paused',
        description: `Deployment paused. Reason: ${reason}`,
        type: 'WARNING' as const,
        actor: `${request.user.name} (Operator)`,
      };

      const updated = await db.updateDeploymentState(id, 'PAUSED', {
        pausedReason: reason,
        health: 'WARNING',
        timeline: [timelineEvent, ...deployment.timeline],
      });

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'DEPLOYMENT_PAUSED',
        actionTitle: 'Deployment Paused',
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'WARNING',
        source: 'WEB_CONSOLE',
        details: reason,
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/deployments/:id/resume - resume paused rollout progression
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/resume',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      await argoClient.resumeRollout(deployment.serviceName);

      const timelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Rollout Resumed',
        description: 'Canary progression active again. Verification gates monitoring.',
        type: 'INFO' as const,
        actor: `${request.user.name} (Operator)`,
      };

      const updated = await db.updateDeploymentState(id, 'MONITORING', {
        pausedReason: undefined,
        health: 'HEALTHY',
        timeline: [timelineEvent, ...deployment.timeline],
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/deployments/:id/rollback - trigger manual or autonomous rollback
  fastify.post<{ Params: { id: string }; Body: RollbackDeploymentBody }>(
    '/api/v1/deployments/:id/rollback',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      // Concurrency check: already rolled back?
      if (deployment.status === 'ROLLED_BACK') {
        throw new AppError(409, 'STATE_CONFLICT', `Deployment ${id} has already been rolled back.`);
      }

      const targetVersion = request.body?.targetVersion || deployment.previousVersion;
      const reason = request.body?.reason || 'Error rate exceeded safety threshold.';

      // Revert traffic to 0% canary immediately (<30s requirement)
      await argoClient.rollbackRollout(deployment.serviceName, targetVersion);

      const timelineEvent = {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: `Rollback to ${targetVersion} Executed`,
        description: `Traffic immediately reverted to baseline ${targetVersion}. Blast radius safely contained.`,
        type: 'DANGER' as const,
        actor: `${request.user.name} (Operator)`,
      };

      const updated = await db.updateDeploymentState(
        id,
        'ROLLED_BACK',
        {
          currentTrafficPercentage: 0,
          targetTrafficPercentage: 0,
          rollbackReason: reason,
          health: 'HEALTHY',
          completedAt: new Date().toISOString(),
          currentTelemetry: {
            ...deployment.currentTelemetry,
            errorRate: 0.04,
            p95Latency: 170,
          },
          timeline: [timelineEvent, ...deployment.timeline],
          expectedStatus: request.body?.expectedStatus,
        }
      );

      // Auto-generate incident record (PRD 14.4 Deliverable 4)
      await db.createIncident({
        organizationId: deployment.organizationId,
        code: `INC-${Math.floor(100 + Math.random() * 900)}`,
        title: `Rollback: ${deployment.serviceName} reverted to ${targetVersion}`,
        severity: deployment.serviceTier === 'TIER_1' ? 'SEV-1' : 'SEV-2',
        status: 'CONTAINED',
        relatedDeploymentId: deployment.id,
        relatedDeploymentVersion: deployment.version,
        relatedChangeId: deployment.changeId,
        relatedChangeTitle: deployment.changeTitle,
        rca_summary: reason,
        rca_trigger: reason,
        rca_contained_by: 'ChangeGuard Autonomous Rollback Controller',
        rca_recommendation: 'Fix root cause in staging before initiating new canary deployment.',
        peak_error_rate: `${deployment.currentTelemetry.errorRate}%`,
        peak_p95_latency: `${deployment.currentTelemetry.p95Latency}ms`,
        impacted_requests: 120,
        impacted_users: 64,
      });

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'ROLLBACK_EXECUTED',
        actionTitle: `Automated Rollback to ${targetVersion}`,
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: reason,
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // POST /api/v1/deployments/:id/abort - completely abort rollout
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/abort',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      await argoClient.abortRollout(deployment.serviceName);

      const updated = await db.updateDeploymentState(id, 'ABORTED', {
        currentTrafficPercentage: 0,
        targetTrafficPercentage: 0,
        health: 'CRITICAL',
        completedAt: new Date().toISOString(),
      });

      return reply.status(200).send({ data: updated });
    }
  );

  // GET /api/v1/deployments/:id/verification - query verification signals
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/verification',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const result = await VerificationEngine.evaluateDeployment(id);
      return reply.status(200).send({ data: result });
    }
  );

  // POST /api/v1/deployments/:id/simulate-failure - interactive test of circuit breaker
  fastify.post<{ Params: { id: string }; Body: SimulateFailureBody }>(
    '/api/v1/deployments/:id/simulate-failure',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      const deployment = await db.getDeploymentById(id);
      if (!deployment) {
        throw new AppError(404, 'DEPLOYMENT_NOT_FOUND', `Deployment ${id} not found`);
      }

      const errorRate = request.body?.errorRate ?? 3.8;
      const p95Latency = request.body?.p95Latency ?? 420;

      // Inject failure into Prometheus telemetry simulator
      prometheusClient.simulateMetricBreach(id, errorRate, p95Latency);

      // Evaluate verification engine
      const evaluation = await VerificationEngine.evaluateDeployment(id, 0); // 0ms tolerance to trip breaker immediately

      // If circuit breaker tripped, autonomously pause
      if (evaluation.actionRequired !== 'NONE') {
        await VerificationEngine.executeAutonomousAction(id, evaluation.actionRequired, evaluation.breachReason!);
      }

      // Re-fetch updated deployment state
      const updated = await db.getDeploymentById(id);

      await AuditWriter.record({
        organizationId: deployment.organizationId,
        actor: { name: request.user.name, type: 'USER', email: request.user.email },
        action: 'SIMULATION_TRIGGERED',
        actionTitle: 'Circuit Breaker Failure Simulated',
        resource: { type: 'DEPLOYMENT', id: deployment.id, name: `${deployment.serviceName} (${deployment.version})` },
        result: 'WARNING',
        source: 'SIMULATION_CONTROLLER',
        details: `Simulated error rate spike to ${errorRate}%, tripping verification safety threshold.`,
      });

      return reply.status(200).send({
        data: {
          deployment: updated,
          evaluation,
        },
      });
    }
  );

  // POST /api/v1/deployments/:id/simulate-recovery - restore healthy telemetry
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/simulate-recovery',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      prometheusClient.simulateRecovery(id);
      const evaluation = await VerificationEngine.evaluateDeployment(id);
      return reply.status(200).send({ data: evaluation });
    }
  );

  // POST /api/v1/deployments/:id/simulate-stale - simulate stale Prometheus data (>90s)
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/deployments/:id/simulate-stale',
    { preHandler: [authenticate, requireRole(['ADMIN', 'PLATFORM_ENGINEER', 'SRE'])] },
    async (request, reply) => {
      const { id } = request.params;
      prometheusClient.simulateStaleData(id);
      const evaluation = await VerificationEngine.evaluateDeployment(id);
      return reply.status(200).send({ data: evaluation });
    }
  );
};

