export type IntegrationCategory =
  | 'VCS'
  | 'CI_CD'
  | 'CONTAINER_ORCHESTRATION'
  | 'OBSERVABILITY'
  | 'PROGRESSIVE_DELIVERY'
  | 'NOTIFICATIONS'
  | 'ISSUE_TRACKING';

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CONFIGURING';

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  iconName: string;
  status: IntegrationStatus;
  lastSyncAt: string;
  connectedRepositoriesOrClusters?: number;
  config: {
    endpoint?: string;
    repository?: string;
    branch?: string;
    webhookEnabled?: boolean;
    clusterName?: string;
    namespace?: string;
    metricsRetentionDays?: number;
    channel?: string;
  };
}
