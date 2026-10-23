import { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from './health.service.js';

export class HealthController {
  public static async getHealth(_req: FastifyRequest, reply: FastifyReply) {
    const health = HealthService.getHealth();
    return reply.status(200).send(health);
  }

  public static async getReadiness(_req: FastifyRequest, reply: FastifyReply) {
    const readiness = await HealthService.getReadiness();
    return reply.status(200).send(readiness);
  }
}
