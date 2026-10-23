import { FastifyPluginAsync } from 'fastify';
import { WebhookController } from './webhook.controller.js';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/v1/webhook/github', WebhookController.handleGithubWebhook);
};
