// Shared domain models and API contracts for ChangeGuard (Frontend & Backend)

export type UserRole = 'ADMIN' | 'PLATFORM_ENGINEER' | 'SRE' | 'DEVELOPER' | 'APPROVER';

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  ssoSubject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  key: ApiKey;
  secret: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  ssoToken?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface InviteMemberRequest {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type PermissionAction =
  | 'VIEW'
  | 'APPROVE_POLICY'
  | 'PROMOTE_DEPLOYMENT'
  | 'PAUSE_DEPLOYMENT'
  | 'ROLLBACK_DEPLOYMENT'
  | 'MANAGE_POLICIES'
  | 'MANAGE_TEAM'
  | 'MANAGE_INTEGRATIONS'
  | 'VIEW_AUDIT_LOG'
  | 'EXPORT_AUDIT_LOG'
  | 'MANAGE_AI_SETTINGS';

export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionAction[]> = {
  ADMIN: [
    'VIEW',
    'APPROVE_POLICY',
    'PROMOTE_DEPLOYMENT',
    'PAUSE_DEPLOYMENT',
    'ROLLBACK_DEPLOYMENT',
    'MANAGE_POLICIES',
    'MANAGE_TEAM',
    'MANAGE_INTEGRATIONS',
    'VIEW_AUDIT_LOG',
    'EXPORT_AUDIT_LOG',
    'MANAGE_AI_SETTINGS',
  ],
  PLATFORM_ENGINEER: [
    'VIEW',
    'APPROVE_POLICY',
    'PROMOTE_DEPLOYMENT',
    'PAUSE_DEPLOYMENT',
    'ROLLBACK_DEPLOYMENT',
    'MANAGE_POLICIES',
    'MANAGE_INTEGRATIONS',
    'VIEW_AUDIT_LOG',
    'EXPORT_AUDIT_LOG',
    'MANAGE_AI_SETTINGS',
  ],
  SRE: [
    'VIEW',
    'PROMOTE_DEPLOYMENT',
    'PAUSE_DEPLOYMENT',
    'ROLLBACK_DEPLOYMENT',
    'VIEW_AUDIT_LOG',
  ],
  DEVELOPER: [
    'VIEW',
  ],
  APPROVER: [
    'VIEW',
    'APPROVE_POLICY',
  ],
};

// --- Policies Domain Models ---
export type PolicyAction =
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'REQUIRE_CANARY'
  | 'PAUSE_ROLLOUT'
  | 'ROLLBACK_DEPLOYMENT'
  | 'BLOCK_MERGE'
  | 'RESTRICT_OFF_PEAK_ONLY';

export interface PolicyRule {
  id: string;
  conditionName: string;
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | 'contains';
  thresholdValue: string | number;
  unit?: string;
  action: PolicyAction;
  actionDescription: string;
  enabled: boolean;
}

export interface Policy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  environment: 'PRODUCTION' | 'STAGING' | 'ALL';
  tierScope: 'ALL' | 'TIER_1_ONLY' | 'CRITICAL_SERVICES';
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  rulesCount: number;
  rules: PolicyRule[];
  version: number;
  lastUpdatedAt: string;
  updatedBy: string;
  owner: string;
  enforcementMode: 'ENFORCING' | 'DRY_RUN';
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  snapshot: Policy;
  createdAt: string;
  createdBy: string;
}

// --- Audit Events Domain Models ---
export type AuditActionType =
  | 'DEPLOYMENT_STARTED'
  | 'DEPLOYMENT_PROMOTED'
  | 'DEPLOYMENT_PAUSED'
  | 'ROLLBACK_EXECUTED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'POLICY_ENFORCED'
  | 'CHANGE_BLOCKED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REQUESTED'
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
    type: 'SERVICE' | 'DEPLOYMENT' | 'CHANGE' | 'POLICY' | 'INTEGRATION' | 'USER' | 'SETTING';
    id: string;
    name: string;
  };
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  source: 'WEB_CONSOLE' | 'POLICY_ENGINE' | 'GITHUB_WEBHOOK' | 'ARGO_CONTROLLER' | 'SIMULATION_CONTROLLER';
  details: string;
  metadata?: Record<string, any>;
}

// --- Progressive Deployment & Telemetry Domain Models ---
export type DeploymentStatus =
  | 'QUEUED'
  | 'MONITORING'
  | 'PROMOTING'
  | 'PROMOTED'
  | 'PAUSED'
  | 'ROLLING_BACK'
  | 'ROLLED_BACK'
  | 'FAILED'
  | 'ABORTED';

export type RolloutStrategy = 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';

export interface VerificationSignal {
  id: string;
  name: string;
  description: string;
  metricKey: string;
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  currentValue: number;
  unit: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  evaluatedAt: string;
}

export interface DeploymentTimelineEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'SYSTEM';
  actor?: string;
  metadata?: Record<string, any>;
}

export interface LiveTelemetrySnapshot {
  timestamp: string;
  errorRate: number; // %
  p95Latency: number; // ms
  requestsPerMinute: number;
  cpuUtilization: number; // %
  memoryUtilization: number; // %
  canaryTrafficPercentage: number; // %
}

export interface Deployment {
  id: string;
  organizationId: string;
  serviceId: string;
  serviceName: string;
  serviceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  version: string;
  previousVersion: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  status: DeploymentStatus;
  risk: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  strategy: RolloutStrategy;
  currentTrafficPercentage: number; // 0-100
  targetTrafficPercentage: number;
  stages: number[]; // [5, 25, 50, 100]
  currentStageIndex: number;
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  changeId: string;
  changeTitle: string;
  changeAuthor: string;
  repository: string;
  commitHash: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  pausedReason?: string;
  rollbackReason?: string;
  currentTelemetry: {
    errorRate: number;
    p95Latency: number;
    requestsPerMinute: number;
    cpuUtilization: number;
    memoryUtilization: number;
  };
  telemetryHistory: LiveTelemetrySnapshot[];
  signals: VerificationSignal[];
  timeline: DeploymentTimelineEvent[];
}

// --- Incident Domain Models ---
export type IncidentSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
export type IncidentStatus = 'TRIGGERED' | 'INVESTIGATING' | 'MITIGATING' | 'CONTAINED' | 'RESOLVED';

export interface IncidentTimelineItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  actor: string;
  isAutomatic: boolean;
  type: 'TRIGGER' | 'ACTION' | 'MITIGATION' | 'ROLLBACK' | 'RESOLVE';
}

export interface Incident {
  id: string;
  organizationId: string;
  code: string; // e.g. "INC-482"
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string;
  durationFormatted: string;
  affectedServices: string[];
  relatedDeploymentId?: string;
  relatedDeploymentVersion?: string;
  relatedChangeId?: string;
  relatedChangeTitle?: string;
  rootCauseAnalysis: {
    summary: string;
    triggerMechanism: string;
    failureContainedBy: string;
    preventativeRecommendation: string;
  };
  metrics: {
    peakErrorRate: string;
    peakP95Latency: string;
    impactedRequests: number;
    impactedUsers: number;
  };
  timeline: IncidentTimelineItem[];
  actionsTaken: string[];
}

// --- Service Catalog & Topology Domain Models ---
export interface ServiceDependencyNode {
  id: string;
  name: string;
  type: 'SERVICE' | 'DATABASE' | 'QUEUE' | 'API_GATEWAY' | 'CACHE' | 'THIRD_PARTY';
  direction: 'UPSTREAM' | 'DOWNSTREAM';
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'DOWN';
  protocol: 'gRPC' | 'REST' | 'PostgreSQL' | 'Kafka' | 'Redis';
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  owner: {
    team: string;
    lead: string;
    slackChannel: string;
  };
  repository: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  currentRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  uptimePercentage: number;
  deploymentsCount: number;
  activeDeploymentsCount: number;
  incidentsCount: number;
  lastDeploymentAt: string;
  lastDeploymentVersion: string;
  telemetry: {
    errorRate: number;
    p95Latency: number;
    requestsPerSecond: number;
    cpuPercentage: number;
    memoryPercentage: number;
  };
  dependencies: ServiceDependencyNode[];
  dependents: ServiceDependencyNode[];
  tags: string[];
}

// --- Impact Graph Domain Models ---
export interface ImpactGraphNode {
  id: string;
  name: string;
  type: 'SERVICE' | 'DATABASE' | 'QUEUE' | 'API_GATEWAY' | 'CACHE' | 'THIRD_PARTY';
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  currentErrorRate: string;
  blastRadiusScore: number;
  environment: string;
}

export interface ImpactGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'SERVICE' | 'DATABASE' | 'QUEUE' | 'API_GATEWAY' | 'CACHE' | 'THIRD_PARTY';
  protocol: string;
}

export interface ImpactGraphResponse {
  nodes: ImpactGraphNode[];
  edges: ImpactGraphEdge[];
  metrics: {
    totalServices: number;
    tier1Services: number;
    criticalDatabases: number;
    healthyPercentage: number;
  };
}


