import { FastifyReply, FastifyRequest } from 'fastify';
import { WebhookService } from './webhook.service.js';

export class WebhookController {
  public static async handleGithubWebhook(request: FastifyRequest, reply: FastifyReply) {
    const deliveryId = (request.headers['x-github-delivery'] as string) || '';
    const signature = (request.headers['x-hub-signature-256'] as string) || '';
    const event = (request.headers['x-github-event'] as string) || 'pull_request';
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'changeguard_dev_webhook_secret_key';

    if (signature) {
      WebhookService.verifySignature(JSON.stringify(request.body), signature, webhookSecret);
    }

    if (deliveryId && WebhookService.isDuplicateDelivery(deliveryId)) {
      return reply.status(200).send({
        status: 'ignored',
        message: 'Duplicate delivery ID acknowledged',
        deliveryId,
      });
    }

    const result = await WebhookService.processGithubWebhook(event, request.body as Record<string, any>);
    return reply.status(200).send(result);
  }
}
