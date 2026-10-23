import { FastifyReply, FastifyRequest } from 'fastify';
import { TeamService } from './team.service.js';
import { InviteMemberBody, UpdateRoleBody } from './team.types.js';

export class TeamController {
  public static async listMembers(request: FastifyRequest, reply: FastifyReply) {
    const members = await TeamService.listMembers(request.user!.organizationId);
    return reply.status(200).send({
      data: members,
      meta: {
        total: members.length,
      },
    });
  }

  public static async inviteMember(
    request: FastifyRequest<{ Body: InviteMemberBody }>,
    reply: FastifyReply
  ) {
    const member = await TeamService.inviteMember(request.user!.organizationId, request.body);
    return reply.status(201).send({
      data: member,
      message: 'Member invitation created successfully',
    });
  }

  public static async updateMemberRole(
    request: FastifyRequest<{ Params: { userId: string }; Body: UpdateRoleBody }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;
    const member = await TeamService.updateMemberRole(userId, request.body.role);
    return reply.status(200).send({
      data: member,
    });
  }

  public static async removeMember(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;
    await TeamService.removeMember(userId, request.user!.id);
    return reply.status(200).send({
      success: true,
      message: 'Member removed successfully',
    });
  }
}
