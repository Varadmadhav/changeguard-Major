export interface WebhookResponse {
  status: 'processed' | 'ignored' | 'unhandled_event';
  changeId?: string;
  number?: number;
  riskScore?: number;
  riskLevel?: string;
  statusCheckUrl?: string;
  message?: string;
  deliveryId?: string;
  action?: string;
  event?: string;
}
