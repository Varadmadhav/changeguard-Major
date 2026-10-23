import { FastifyReply, FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  public static async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const summary = await AnalyticsService.getSummary(request.user!.organizationId);
    return reply.status(200).send({ data: summary });
  }

  public static async getDora(
    request: FastifyRequest<{ Querystring: { periodDays?: string } }>,
    reply: FastifyReply
  ) {
    const periodDays = parseInt(request.query.periodDays || '30', 10);
    const dora = await AnalyticsService.getDora(request.user!.organizationId, periodDays);
    return reply.status(200).send({ data: dora });
  }

  public static async getRiskCalibration(request: FastifyRequest, reply: FastifyReply) {
    const points = await AnalyticsService.getRiskCalibration(request.user!.organizationId);
    return reply.status(200).send({ data: points });
  }
}
