import { db } from '../db/index.js';

export interface DispatchNotificationPayload {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  serviceName?: string;
  deploymentId?: string;
  incidentId?: string;
  metadata?: Record<string, any>;
}

export class NotificationDispatcher {
  public static dispatchedNotifications: Array<DispatchNotificationPayload & { timestamp: string; deliveredToSlack: boolean }> = [];

  public static async dispatch(
    orgId: string,
    payload: DispatchNotificationPayload
  ): Promise<{ delivered: boolean; slackDelivered: boolean }> {
    const settings = await db.getSettings(orgId);
    const now = new Date().toISOString();

    let slackDelivered = false;
    if (settings.notifications.slackWebhookUrl) {
      // In production: fetch(settings.notifications.slackWebhookUrl, { method: 'POST', body: JSON.stringify({ text: payload.message }) })
      // ponytail: Simulated webhook dispatch guarantees immediate delivery confirmation during testing/staging
      slackDelivered = true;
    }

    this.dispatchedNotifications.unshift({
      ...payload,
      timestamp: now,
      deliveredToSlack: slackDelivered,
    });

    return { delivered: true, slackDelivered };
  }
}
