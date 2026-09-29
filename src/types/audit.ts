export type AuditActionType =
  | 'DEPLOYMENT_STARTED'
  | 'DEPLOYMENT_PROMOTED'
  | 'DEPLOYMENT_PAUSED'
  | 'ROLLBACK_EXECUTED'
  | 'POLICY_UPDATED'
  | 'POLICY_ENFORCED'
  | 'CHANGE_BLOCKED'
  | 'APPROVAL_GRANTED'
  | 'INTEGRATION_CONFIGURED'
  | 'SIMULATION_TRIGGERED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  actor: {
    name: string;
    type: 'USER' | 'SYSTEM' | 'POLICY_ENGINE' | 'AI_AGENT';
    email?: string;
  };
  action: AuditActionType;
  actionTitle: string;
  resource: {
    type: 'SERVICE' | 'DEPLOYMENT' | 'CHANGE' | 'POLICY' | 'INTEGRATION';
    id: string;
    name: string;
  };
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  source: 'WEB_CONSOLE' | 'POLICY_ENGINE' | 'GITHUB_WEBHOOK' | 'ARGO_CONTROLLER' | 'SIMULATION_CONTROLLER';
  details: string;
  metadata?: Record<string, any>;
}
