import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { AuditEvent, AuditActionType } from '../types/shared.js';

export type AuditActorType = 'USER' | 'SYSTEM' | 'POLICY_ENGINE' | 'AI_AGENT';
export type AuditResourceType = 'SERVICE' | 'DEPLOYMENT' | 'CHANGE' | 'POLICY' | 'INTEGRATION' | 'USER' | 'SETTING';
export type AuditResult = 'SUCCESS' | 'WARNING' | 'FAILED';
export type AuditSource = 'WEB_CONSOLE' | 'POLICY_ENGINE' | 'GITHUB_WEBHOOK' | 'ARGO_CONTROLLER' | 'SIMULATION_CONTROLLER';

export interface AuditEventInput {
  organizationId: string;
  actor: {
    id?: string;
    name: string;
    type: AuditActorType;
    email?: string;
  };
  action: AuditActionType;
  actionTitle: string;
  resource: {
    type: AuditResourceType;
    id: string;
    name: string;
  };
  result: AuditResult;
  source: AuditSource;
  details: string;
  metadata?: Record<string, any>;
}

// Append-only audit event writer ensuring tamper-evident accountability (PRD Section 6.F)
export class AuditWriter {
  public static async record(event: AuditEventInput): Promise<AuditEvent> {
    const now = new Date();
    const id = `aud-${crypto.randomUUID().slice(0, 10)}`;
    const timeFormatted = now.toTimeString().split(' ')[0];

    const stored: AuditEvent = {
      id,
      timestamp: now.toISOString(),
      timeFormatted,
      actor: event.actor,
      action: event.action,
      actionTitle: event.actionTitle,
      resource: event.resource,
      result: event.result,
      source: event.source,
      details: event.details,
      metadata: event.metadata,
    };

    // Append to database audit store
    await db.appendAuditEvent(stored);
    return stored;
  }
}
