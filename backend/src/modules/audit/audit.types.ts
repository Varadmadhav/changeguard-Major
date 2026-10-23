import { AuditEvent } from '../../types/shared.js';

export interface ListAuditQuery {
  action?: string;
  actor?: string;
  resourceType?: string;
  result?: string;
  page?: string;
  limit?: string;
}

export type AuditEventRecord = AuditEvent;
