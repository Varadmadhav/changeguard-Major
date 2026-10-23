import { FastifyReply, FastifyRequest } from 'fastify';
import { SettingsService } from './settings.service.js';
import { SettingsSection } from './settings.types.js';

export class SettingsController {
  public static async getSettings(request: FastifyRequest, reply: FastifyReply) {
    const settings = await SettingsService.getSettings(request.user!.organizationId);
    return reply.status(200).send({ data: settings });
  }

  public static async updateSection(
    request: FastifyRequest<{ Params: { section: SettingsSection }; Body: any }>,
    reply: FastifyReply
  ) {
    const updated = await SettingsService.updateSection(
      request.user!.organizationId,
      request.params.section,
      request.body,
      request.user!
    );
    return reply.status(200).send({ data: updated });
  }
}
