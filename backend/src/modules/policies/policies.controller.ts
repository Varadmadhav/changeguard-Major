import { FastifyReply, FastifyRequest } from 'fastify';
import { PoliciesService } from './policies.service.js';
import { CreatePolicyBody, UpdatePolicyBody } from './policies.types.js';
import { PolicyRule } from '../../types/shared.js';

export class PoliciesController {
  public static async listPolicies(request: FastifyRequest, reply: FastifyReply) {
    const policies = await PoliciesService.listPolicies(request.user!.organizationId);
    return reply.status(200).send({
      data: policies,
      meta: { total: policies.length },
    });
  }

  public static async getPolicyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const policy = await PoliciesService.getPolicyById(request.params.id, request.user!.organizationId);
    return reply.status(200).send({ data: policy });
  }

  public static async createPolicy(
    request: FastifyRequest<{ Body: CreatePolicyBody }>,
    reply: FastifyReply
  ) {
    const created = await PoliciesService.createPolicy(request.body, request.user!);
    return reply.status(201).send({
      data: created,
      message: 'Policy created successfully',
    });
  }

  public static async updatePolicy(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePolicyBody }>,
    reply: FastifyReply
  ) {
    const updated = await PoliciesService.updatePolicy(
      request.params.id,
      request.body,
      request.user!
    );
    return reply.status(200).send({
      data: updated,
      message: `Policy updated to version ${updated.version}`,
    });
  }

  public static async updateRules(
    request: FastifyRequest<{ Params: { id: string }; Body: { rules: PolicyRule[] } }>,
    reply: FastifyReply
  ) {
    const updated = await PoliciesService.updateRules(
      request.params.id,
      request.body.rules,
      request.user!
    );
    return reply.status(200).send({
      data: updated,
      message: 'Policy rules updated successfully',
    });
  }

  public static async evaluatePolicy(
    request: FastifyRequest<{ Params: { id: string }; Body: Record<string, any> }>,
    reply: FastifyReply
  ) {
    const output = await PoliciesService.evaluatePolicy(
      request.params.id,
      request.body || {},
      request.user!
    );
    return reply.status(200).send({ data: output });
  }

  public static async getVersions(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const versions = await PoliciesService.getVersions(request.params.id);
    return reply.status(200).send({
      data: versions,
      meta: { total: versions.length },
    });
  }
}
