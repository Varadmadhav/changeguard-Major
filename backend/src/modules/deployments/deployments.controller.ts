import { FastifyReply, FastifyRequest } from 'fastify';
import { DeploymentsService } from './deployments.service.js';
import {
  CreateDeploymentBody,
  PauseDeploymentBody,
  RollbackDeploymentBody,
  SimulateFailureBody,
} from './deployments.types.js';

export class DeploymentsController {
  public static async listDeployments(
    request: FastifyRequest<{ Querystring: { environment?: string; status?: string; serviceId?: string } }>,
    reply: FastifyReply
  ) {
    const deployments = await DeploymentsService.listDeployments(request.user!.organizationId, request.query);
    return reply.status(200).send({
      data: deployments,
      meta: { total: deployments.length },
    });
  }

  public static async getDeploymentById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const deployment = await DeploymentsService.getDeploymentById(request.params.id);
    return reply.status(200).send({ data: deployment });
  }

  public static async createDeployment(
    request: FastifyRequest<{ Body: CreateDeploymentBody }>,
    reply: FastifyReply
  ) {
    const created = await DeploymentsService.createDeployment(request.body, request.user!);
    return reply.status(201).send({
      data: created,
      message: 'Canary deployment initiated successfully',
    });
  }

  public static async promoteDeployment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const promoted = await DeploymentsService.promoteDeployment(request.params.id, request.user!);
    return reply.status(200).send({
      data: promoted,
      message: promoted.status === 'PROMOTED' ? 'Deployment promoted to 100%' : 'Canary stage advanced',
    });
  }

  public static async pauseDeployment(
    request: FastifyRequest<{ Params: { id: string }; Body: PauseDeploymentBody }>,
    reply: FastifyReply
  ) {
    const paused = await DeploymentsService.pauseDeployment(request.params.id, request.body || {}, request.user!);
    return reply.status(200).send({ data: paused });
  }

  public static async rollbackDeployment(
    request: FastifyRequest<{ Params: { id: string }; Body: RollbackDeploymentBody }>,
    reply: FastifyReply
  ) {
    const rolledBack = await DeploymentsService.rollbackDeployment(request.params.id, request.body || {}, request.user!);
    return reply.status(200).send({ data: rolledBack });
  }

  public static async abortDeployment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const aborted = await DeploymentsService.abortDeployment(request.params.id);
    return reply.status(200).send({ data: aborted });
  }

  public static async getVerification(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await DeploymentsService.getVerification(request.params.id);
    return reply.status(200).send({ data: result });
  }

  public static async simulateFailure(
    request: FastifyRequest<{ Params: { id: string }; Body: SimulateFailureBody }>,
    reply: FastifyReply
  ) {
    const result = await DeploymentsService.simulateFailure(request.params.id, request.body || {}, request.user!);
    return reply.status(200).send({ data: result });
  }

  public static async simulateRecovery(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await DeploymentsService.simulateRecovery(request.params.id);
    return reply.status(200).send({ data: result });
  }

  public static async simulateStale(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const result = await DeploymentsService.simulateStale(request.params.id);
    return reply.status(200).send({ data: result });
  }
}
