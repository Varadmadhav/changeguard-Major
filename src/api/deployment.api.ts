import http from 'node:http';
import type { Deployment, DeploymentStatus, DeploymentPolicyCommand } from '../types/deployment.ts';
import {
  InvalidStateTransitionError,
  validateDeploymentTransition,
  CanaryInvalidStateError,
  CanaryVerificationFailedError,
  CanaryInvalidStageError,
  CanaryStageSkipError,
  UnknownDeploymentError,
  InvalidPolicyCommandError,
} from '../types/deployment.ts';
import { canaryController } from '../services/canary.controller.ts';
import { policyReceiver } from '../services/policy.receiver.ts';
import {
  deploymentRepository as defaultRepository,
  DeploymentRepository,
  StateConflictError,
} from '../services/deployment.repository.ts';
import { deploymentAuditAdapter } from '../services/audit.adapter.ts';
import { FileStorageDriver } from '../services/file-storage.server.ts';
import { policyService } from '../services/policy.service.ts';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Portable Deployment API Controller
 * Provides pure request handlers compatible with both Node http and Fastify/Express.
 */
export class DeploymentApiController {
  constructor(
    private readonly repository: DeploymentRepository = defaultRepository
  ) {}

  public async getDeployments(): Promise<{ status: number; body: ApiResponse<Deployment[]> }> {
    const list = await this.repository.findAll();
    return {
      status: 200,
      body: { success: true, data: list },
    };
  }

  public async getDeploymentById(id: string): Promise<{ status: number; body: ApiResponse<Deployment> }> {
    if (!id || typeof id !== 'string') {
      return {
        status: 400,
        body: { success: false, error: { code: 'INVALID_ID', message: 'Deployment ID is required' } },
      };
    }

    const deployment = await this.repository.findById(id);
    if (!deployment) {
      return {
        status: 404,
        body: { success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: `Deployment '${id}' not found` } },
      };
    }

    return {
      status: 200,
      body: { success: true, data: deployment },
    };
  }

  public async promoteDeployment(
    id: string,
    payload?: { targetStage?: number; expectedStatus?: DeploymentStatus; actor?: string }
  ): Promise<{ status: number; body: ApiResponse<Deployment> }> {
    const deployment = await this.repository.findById(id);
    if (!deployment) {
      return {
        status: 404,
        body: { success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: `Deployment '${id}' not found` } },
      };
    }

    if (payload?.targetStage !== undefined && typeof payload.targetStage !== 'number') {
      return {
        status: 400,
        body: { success: false, error: { code: 'INVALID_STAGE', message: 'Target stage must be a valid number' } },
      };
    }

    try {
      // 1. Promote via tested Canary Controller (enforces stages & signal gates)
      canaryController.promote(deployment, payload?.targetStage);

      // 2. Persist with optimistic concurrency check
      const updated = await this.repository.save(deployment, payload?.expectedStatus);

      // 3. Dispatch tamper-evident audit record
      await deploymentAuditAdapter.recordPromotion(
        updated,
        updated.currentTrafficPercentage,
        payload?.actor || 'Operator'
      );

      return {
        status: 200,
        body: { success: true, data: updated },
      };
    } catch (err: unknown) {
      return this.mapErrorToResponse(err);
    }
  }

  public async pauseDeployment(
    id: string,
    payload?: { reason?: string; command?: DeploymentPolicyCommand; expectedStatus?: DeploymentStatus }
  ): Promise<{ status: number; body: ApiResponse<Deployment> }> {
    const deployment = await this.repository.findById(id);
    if (!deployment) {
      return {
        status: 404,
        body: { success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: `Deployment '${id}' not found` } },
      };
    }

    try {
      const reason = payload?.reason || 'Rollout progression paused.';

      if (payload?.command) {
        // Enforce policy command through PolicyReceiver
        policyReceiver.handleCommand(deployment, payload.command);
      } else {
        // Direct pause
        if (deployment.status !== 'PAUSED') {
          validateDeploymentTransition(deployment.status, 'PAUSED');
          deployment.status = 'PAUSED';
          deployment.health = 'WARNING';
          deployment.pausedReason = reason;
          deployment.updatedAt = 'Just now';
        }
      }

      const updated = await this.repository.save(deployment, payload?.expectedStatus);

      await deploymentAuditAdapter.recordPause(updated, reason);

      return {
        status: 200,
        body: { success: true, data: updated },
      };
    } catch (err: unknown) {
      return this.mapErrorToResponse(err);
    }
  }

  public async rollbackDeployment(
    id: string,
    payload?: { reason?: string; targetVersion?: string; expectedStatus?: DeploymentStatus; actor?: string }
  ): Promise<{ status: number; body: ApiResponse<Deployment> }> {
    const deployment = await this.repository.findById(id);
    if (!deployment) {
      return {
        status: 404,
        body: { success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: `Deployment '${id}' not found` } },
      };
    }

    if (deployment.status === 'ROLLED_BACK') {
      return {
        status: 409,
        body: {
          success: false,
          error: { code: 'ALREADY_ROLLED_BACK', message: `Deployment '${id}' has already been rolled back.` },
        },
      };
    }

    try {
      const targetVersion = payload?.targetVersion || deployment.previousVersion || 'v2.8.3';
      const reason = payload?.reason || 'Error rate exceeded safety threshold.';

      // Two-step lifecycle: ROLLING_BACK -> ROLLED_BACK
      deployment.status = 'ROLLING_BACK';
      deployment.updatedAt = 'Just now';

      // Complete rollback
      deployment.status = 'ROLLED_BACK';
      deployment.version = targetVersion;
      deployment.currentTrafficPercentage = 0;
      deployment.targetTrafficPercentage = 0;
      deployment.health = 'HEALTHY';
      deployment.rollbackReason = reason;
      deployment.completedAt = new Date().toISOString();

      // Reset telemetry to baseline
      deployment.currentTelemetry.errorRate = 0.08;
      deployment.currentTelemetry.p95Latency = 160;
      deployment.signals = deployment.signals.map((s) => ({
        ...s,
        status: 'PASSED' as const,
        currentValue: s.metricKey === 'http_error_rate' ? 0.08 : s.metricKey === 'p95_latency' ? 160 : s.currentValue,
      }));

      deployment.timeline.unshift({
        id: `tl-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: `Rollback to ${targetVersion} Executed`,
        description: `Traffic immediately reverted to baseline ${targetVersion}. Blast radius safely contained.`,
        type: 'DANGER',
        actor: payload?.actor || 'ChangeGuard Rollback Controller',
      });

      const updated = await this.repository.save(deployment, payload?.expectedStatus);

      await deploymentAuditAdapter.recordRollback(updated, targetVersion, reason, payload?.actor);

      return {
        status: 200,
        body: { success: true, data: updated },
      };
    } catch (err: unknown) {
      return this.mapErrorToResponse(err);
    }
  }

  public async simulateFailure(
    id: string,
    payload?: { errorRate?: number; p95Latency?: number }
  ): Promise<{ status: number; body: ApiResponse<Deployment> }> {
    const deployment = await this.repository.findById(id);

    if (!deployment) {
      return {
        status: 404,
        body: {
          success: false,
          error: {
            code: 'DEPLOYMENT_NOT_FOUND',
            message: `Deployment '${id}' not found`,
          },
        },
      };
    }

    try {
      const errorRate = payload?.errorRate ?? 3.7;
      const p95Latency = payload?.p95Latency ?? 840;
      const now = new Date();

      // Ensure arrays exist
      deployment.timeline ??= [];
      deployment.signals ??= [];

      // Update telemetry
      deployment.currentTelemetry.errorRate = errorRate;
      deployment.currentTelemetry.p95Latency = p95Latency;

      // Define monitored signals
      const signalDefinitions = [
        {
          metricKey: 'http_error_rate',
          name: 'HTTP Error Rate',
          value: errorRate,
          threshold: 1.0,
          unit: '%',
        },
        {
          metricKey: 'p95_latency',
          name: 'P95 Transaction Latency',
          value: p95Latency,
          threshold: 500,
          unit: 'ms',
        },
      ];

      const failedSignals: string[] = [];

      // Create or update monitored signals
      for (const definition of signalDefinitions) {
        let signal = deployment.signals.find(
          (item) => item.metricKey === definition.metricKey
        );

        const status =
          definition.value >= definition.threshold ? 'FAILED' : 'PASSED';

        if (!signal) {
          signal = {
            id: `sig-${definition.metricKey}-${deployment.id}`,
            name: definition.name,
            description: `Monitors ${definition.name.toLowerCase()}.`,
            metricKey: definition.metricKey,
            operator: '<',
            threshold: definition.threshold,
            currentValue: definition.value,
            unit: definition.unit,
            status,
            evaluatedAt: now.toISOString(),
          };

          deployment.signals.push(signal);
        } else {
          signal.currentValue = definition.value;
          signal.status = status;
          signal.evaluatedAt = now.toISOString();
        }

        if (status === 'FAILED') {
          failedSignals.push(definition.name);
        }
      }

      // Update deployment health
      deployment.health =
        failedSignals.length > 0 ? 'CRITICAL' : 'HEALTHY';

      // Record the failure simulation in the timeline
      deployment.timeline.unshift({
        id: `event-${Date.now()}`,
        timestamp: now.toISOString(),
        timeFormatted: now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        title: 'Failure Simulation',
        description:
          `Simulated HTTP Error Rate: ${errorRate}% and ` +
          `P95 Latency: ${p95Latency}ms.`,
        type: 'DANGER',
        actor: 'SYSTEM',
      });

      // Automatically pause unsafe deployments
      if (failedSignals.length > 0 && deployment.status === 'MONITORING') {
        const reason =
          `Automatic safety pause: ${failedSignals.join(', ')} ` +
          'exceeded their thresholds.';

        policyReceiver.handleCommand(deployment, {
          deploymentId: deployment.id,
          decision: 'PAUSE',
          canPromote: false,
          allowedStages: deployment.stages,
          failedSignals,
          reason,
        });
      }

      // Persist the updated deployment
      const updated = await this.repository.save(deployment);

      // Record the failure simulation in the audit log
      await deploymentAuditAdapter.recordFailureSimulation(
        updated,
        errorRate,
        p95Latency
      );

      return {
        status: 200,
        body: {
          success: true,
          data: updated,
        },
      };
    } catch (err: unknown) {
      return this.mapErrorToResponse(err);
    }
  }

  private mapErrorToResponse(err: unknown): { status: number; body: ApiResponse } {
    if (err instanceof StateConflictError) {
      return {
        status: 409,
        body: { success: false, error: { code: 'STATE_CONFLICT', message: err.message } },
      };
    }
    if (err instanceof CanaryInvalidStateError || err instanceof InvalidStateTransitionError) {
      return {
        status: 409,
        body: { success: false, error: { code: 'INVALID_TRANSITION', message: err.message } },
      };
    }
    if (err instanceof CanaryVerificationFailedError) {
      return {
        status: 409,
        body: { success: false, error: { code: 'VERIFICATION_FAILED', message: err.message, details: err.failedSignals } },
      };
    }
    if (err instanceof CanaryStageSkipError || err instanceof CanaryInvalidStageError) {
      return {
        status: 400,
        body: { success: false, error: { code: 'INVALID_STAGE', message: err.message } },
      };
    }
    if (err instanceof UnknownDeploymentError) {
      return {
        status: 404,
        body: { success: false, error: { code: 'DEPLOYMENT_NOT_FOUND', message: err.message } },
      };
    }
    if (err instanceof InvalidPolicyCommandError) {
      return {
        status: 400,
        body: { success: false, error: { code: 'INVALID_COMMAND', message: err.message } },
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: { success: false, error: { code: 'INTERNAL_ERROR', message: msg } },
    };
  }
}

export const deploymentApiController = new DeploymentApiController();

/**
 * Dispatches an HTTP-like request path and method to the controller
 */
export async function dispatchDeploymentApi(
  reqOrMethod: string | { method: string; url?: string; urlPath?: string; body?: any },
  urlPathArg?: string,
  bodyArg?: any,
  controller: DeploymentApiController = deploymentApiController
): Promise<{ status: number; statusCode: number; body: ApiResponse }> {
  let method: string;
  let urlPath: string;
  let body: any;

  if (typeof reqOrMethod === 'object' && reqOrMethod !== null) {
    method = reqOrMethod.method;
    urlPath = reqOrMethod.url || reqOrMethod.urlPath || '';
    body = reqOrMethod.body;
  } else {
    method = reqOrMethod;
    urlPath = urlPathArg || '';
    body = bodyArg;
  }

  const normalized = (urlPath || '').split('?')[0].replace(/\/+$/, '');

  let result: { status: number; body: ApiResponse };

  // Support both /api/deployments and /api/v1/deployments prefixes
  if (method === 'GET' && (normalized === '/api/deployments' || normalized === '/api/v1/deployments')) {
    result = await controller.getDeployments();
    return { ...result, statusCode: result.status };
  }
  // Routes matching /api/deployments/:id(/action) or /api/v1/deployments/:id(/action)
  const match = normalized.match(/^(?:\/api\/v1|\/api)\/deployments\/([^/]+)(?:\/(promote|pause|rollback|simulate-failure))?$/);
  if (!match) {
    const errorRes = {
      status: 404,
      statusCode: 404,
      body: { success: false as const, error: { code: 'NOT_FOUND', message: `Route ${method} ${urlPath} not found` } },
    };
    return errorRes;
  }

  const id = match[1];
  const action = match[2];

  if (method === 'GET' && !action) {
    result = await controller.getDeploymentById(id);
    return { ...result, statusCode: result.status };
  }

  if (method === 'POST') {
    switch (action) {
      case 'promote':
        result = await controller.promoteDeployment(id, body);
        return { ...result, statusCode: result.status };
      case 'pause':
        result = await controller.pauseDeployment(id, body);
        return { ...result, statusCode: result.status };
      case 'rollback':
        result = await controller.rollbackDeployment(id, body);
        return { ...result, statusCode: result.status };
      case 'simulate-failure':
        result = await controller.simulateFailure(id, body);
        return { ...result, statusCode: result.status };
      default:
        return {
          status: 400,
          statusCode: 400,
          body: { success: false as const, error: { code: 'UNKNOWN_ACTION', message: `Action '${action}' is not supported` } },
        };
    }
  }

  return {
    status: 405,
    statusCode: 405,
    body: { success: false as const, error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${method} not allowed` } },
  };
}

/**
 * Creates a real Node.js HTTP server instance routing deployment requests.
 */
export function createDeploymentHttpServer(): http.Server {
  const serverRepository = new DeploymentRepository(
    new FileStorageDriver()
  );
  const serverController = new DeploymentApiController(serverRepository);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      let parsedBody: any = undefined;

      if (rawBody.trim()) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_JSON',
              message: 'Malformed JSON payload'
            }
          }));
          return;
        }
      }

      const response = await dispatchDeploymentApi(
        req.method || 'GET',
        req.url || '/',
        parsedBody,
        serverController
      );

      res.writeHead(response.status, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify(response.body));
    });
  });

  return server;
}
