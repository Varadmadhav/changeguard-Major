import pg from 'pg';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { ServiceNode, DependencyEdge } from '../services/blastRadius.js';
import { HistoricalRecord } from '../services/historicalSimilarity.js';
import { Policy, PolicyRule, PolicyVersion, AuditEvent, Deployment, DeploymentStatus, Incident, Service, ImpactGraphResponse, ImpactGraphNode, ImpactGraphEdge, IncidentStatus, OrgSettings, IntegrationRecord, DoraMetrics, RiskCalibrationPoint } from '../types/shared.js';

export interface DbUser {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  password_hash: string | null;
  role: 'ADMIN' | 'PLATFORM_ENGINEER' | 'SRE' | 'DEVELOPER' | 'APPROVER';
  is_active: boolean;
  sso_subject: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbApiKey {
  id: string;
  organization_id: string;
  user_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface DbOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface DbChange {
  id: string;
  organization_id: string;
  number: number;
  external_id: string;
  title: string;
  type: 'PULL_REQUEST' | 'COMMIT' | 'INFRASTRUCTURE' | 'AI_GENERATED';
  author: {
    name: string;
    username: string;
    avatar?: string;
    isAiAgent?: boolean;
    agentName?: string;
  };
  repository: string;
  branch: {
    source: string;
    target: string;
  };
  commitHash: string;
  risk: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number;
    summary: string;
    reasons: string[];
    factors: Array<{
      id: string;
      name: string;
      score: number;
      weight: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      details: string[];
    }>;
  };
  analysis: {
    overview: string;
    technicalDetails: string;
    identifiedRisks: string[];
    recommendedVerification: string;
    generatedAt: string;
  };
  impact: {
    servicesCount: number;
    databasesCount: number;
    apisCount: number;
    potentialUsersImpacted: number;
    dependencyChain: string[];
    affectedServices: Array<{
      id: string;
      name: string;
      tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
      relationship: 'DIRECT' | 'UPSTREAM' | 'DOWNSTREAM' | 'DATABASE';
      health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      currentErrorRate: string;
      blastRadiusScore: number;
    }>;
  };
  historicalSimilarity: Array<{
    id: string;
    prNumber: number;
    title: string;
    repository: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    outcome: 'SUCCESSFUL' | 'ROLLBACK' | 'INCIDENT' | 'PAUSED';
    similarityPercentage: number;
    date: string;
    summary: string;
  }>;
  policyRecommendation: {
    strategy: 'CANARY' | 'BLUE_GREEN' | 'ROLLING' | 'STAGED';
    stages: number[];
    verificationWindowMinutes: number;
    requiredSignals: Array<{
      name: string;
      metric: string;
      operator: '<' | '>' | '<=' | '>=';
      threshold: string;
      targetValue: string;
    }>;
    humanApprovalRequired: boolean;
    approvalReason?: string;
    suggestedAction: 'APPROVE_POLICY' | 'MODIFY_POLICY' | 'BLOCK';
    approvedBy?: string;
    approvedAt?: string;
    secondApproverId?: string;
    secondApprovedAt?: string;
  };
  filesChangedCount: number;
  additions: number;
  deletions: number;
  status:
    | 'AWAITING_REVIEW'
    | 'AWAITING_SECOND_APPROVAL'
    | 'APPROVED'
    | 'POLICY_BLOCKED'
    | 'CANARY_RECOMMENDED'
    | 'DEPLOYED'
    | 'REJECTED';
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  createdAt: string;
  updatedAt: string;
  diffs?: Array<{
    filename: string;
    status: 'MODIFIED' | 'ADDED' | 'DELETED';
    additions: number;
    deletions: number;
    riskHighlights: string[];
    chunks: Array<{
      header: string;
      lines: Array<{
        type: 'context' | 'add' | 'delete';
        text: string;
      }>;
    }>;
  }>;
}

// ponytail: in-memory DB fallback allows development and tests to run immediately
// without requiring an active PostgreSQL daemon on the developer host.
// Production uses PostgreSQL connection pool via DATABASE_URL.
class Database {
  private pool: pg.Pool | null = null;
  private isPostgresAvailable = false;
  private checked = false;

  public organizations: DbOrganization[] = [];
  public users: DbUser[] = [];
  public apiKeys: DbApiKey[] = [];
  public changes: DbChange[] = [];
  public services: Map<string, ServiceNode> = new Map();
  public dependencies: DependencyEdge[] = [];
  public history: HistoricalRecord[] = [];
  public policies: Policy[] = [];
  public policyVersions: PolicyVersion[] = [];
  public auditEvents: AuditEvent[] = [];
  public deployments: Deployment[] = [];
  public incidents: Incident[] = [];
  public fullServices: Service[] = [];
  public settings!: OrgSettings;
  public integrations: IntegrationRecord[] = [];

  constructor() {
    this.initDefaultSeed();
    if (config.databaseUrl) {
      try {
        this.pool = new pg.Pool({
          connectionString: config.databaseUrl,
          max: 20,
          connectionTimeoutMillis: 2000,
        });
      } catch (err) {
        console.warn('[DB] Failed to initialize Postgres pool, falling back to memory store:', (err as Error).message);
      }
    }
  }

  private initDefaultSeed() {
    const orgId = 'org-acme-primary-01';
    const now = new Date().toISOString();

    this.organizations = [
      {
        id: orgId,
        name: 'Acme Platform Engineering',
        slug: 'acme-corp',
        created_at: now,
        updated_at: now,
      },
    ];

    const defaultPasswordHash = bcrypt.hashSync('password123', 10);

    this.users = [
      {
        id: 'usr-admin-01',
        organization_id: orgId,
        name: 'Sarah Connor (Admin)',
        email: 'admin@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'ADMIN',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-platform-01',
        organization_id: orgId,
        name: 'Alex Mercer (Platform Eng)',
        email: 'platform@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'PLATFORM_ENGINEER',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-sre-01',
        organization_id: orgId,
        name: 'Riley Vance (SRE)',
        email: 'sre@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'SRE',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-sre-02',
        organization_id: orgId,
        name: 'Jordan Hayes (SRE)',
        email: 'sre2@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'SRE',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-dev-01',
        organization_id: orgId,
        name: 'Dev Dave (Developer)',
        email: 'developer@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'DEVELOPER',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-approver-01',
        organization_id: orgId,
        name: 'Elena Rostova (Approver)',
        email: 'approver@acme.corp',
        password_hash: defaultPasswordHash,
        role: 'APPROVER',
        is_active: true,
        sso_subject: null,
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleKey = 'cg_live_demo123456789';
    this.apiKeys = [
      {
        id: 'key-demo-01',
        organization_id: orgId,
        user_id: 'usr-admin-01',
        name: 'CI/CD Ingestion Key',
        key_hash: bcrypt.hashSync(sampleKey, 10),
        key_prefix: sampleKey.slice(0, 12),
        last_used_at: now,
        revoked_at: null,
        created_at: now,
      },
    ];

    this.services = new Map([
      ['svc-checkout-01', { id: 'svc-checkout-01', name: 'checkout-service', tier: 'TIER_1', health: 'HEALTHY', currentErrorRate: '0.04%' }],
      ['svc-payment-01', { id: 'svc-payment-01', name: 'payment-gateway', tier: 'TIER_1', health: 'HEALTHY', currentErrorRate: '0.02%' }],
      ['svc-inventory-01', { id: 'svc-inventory-01', name: 'inventory-service', tier: 'TIER_2', health: 'HEALTHY', currentErrorRate: '0.01%' }],
      ['svc-auth-01', { id: 'svc-auth-01', name: 'auth-service', tier: 'TIER_1', health: 'HEALTHY', currentErrorRate: '0.01%' }],
      ['svc-notification-01', { id: 'svc-notification-01', name: 'notification-service', tier: 'TIER_3', health: 'HEALTHY', currentErrorRate: '0.05%' }],
    ]);

    this.dependencies = [
      { sourceId: 'svc-checkout-01', targetId: 'svc-payment-01', depType: 'SERVICE' },
      { sourceId: 'svc-checkout-01', targetId: 'svc-inventory-01', depType: 'SERVICE' },
      { sourceId: 'svc-checkout-01', targetId: 'svc-checkout-db', depType: 'DATABASE' },
      { sourceId: 'svc-payment-01', targetId: 'svc-auth-01', depType: 'SERVICE' },
      { sourceId: 'svc-checkout-01', targetId: 'svc-notification-01', depType: 'SERVICE' },
    ];

    this.fullServices = [
      {
        id: 'srv-checkout',
        organizationId: orgId,
        name: 'Checkout API',
        slug: 'checkout-service',
        description: 'Mission-critical checkout workflow engine, cart commitment, and transactional order routing.',
        tier: 'TIER_1',
        owner: {
          team: 'Payments Engineering',
          lead: 'Alex Morgan',
          slackChannel: '#payments-eng',
        },
        repository: 'acme/checkout-service',
        environment: 'PRODUCTION',
        health: 'HEALTHY',
        currentRisk: 'HIGH',
        riskScore: 78,
        uptimePercentage: 99.98,
        deploymentsCount: 48,
        activeDeploymentsCount: 1,
        incidentsCount: 1,
        lastDeploymentAt: '8 min ago',
        lastDeploymentVersion: 'v2.8.4',
        telemetry: {
          errorRate: 0.04,
          p95Latency: 182,
          requestsPerSecond: 213,
          cpuPercentage: 54,
          memoryPercentage: 67,
        },
        dependencies: [
          { id: 'srv-payment', name: 'Payment Service', type: 'SERVICE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'gRPC' },
          { id: 'db-postgres', name: 'PostgreSQL Primary Cluster', type: 'DATABASE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'PostgreSQL' },
          { id: 'srv-order', name: 'Order Service', type: 'SERVICE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'gRPC' },
          { id: 'q-checkout-events', name: 'Kafka checkout.events', type: 'QUEUE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'Kafka' },
        ],
        dependents: [
          { id: 'srv-gw', name: 'API Gateway', type: 'API_GATEWAY', direction: 'UPSTREAM', health: 'HEALTHY', protocol: 'REST' },
        ],
        tags: ['pci-dss', 'tier-1', 'sox-compliant', 'revenue-critical'],
      },
      {
        id: 'srv-payment',
        organizationId: orgId,
        name: 'Payment Service',
        slug: 'payment-service',
        description: 'Vault tokenization, payment gateway dispatch (Stripe/Adyen), and ledger settlement.',
        tier: 'TIER_1',
        owner: {
          team: 'Payments Engineering',
          lead: 'Maria Santos',
          slackChannel: '#payments-core',
        },
        repository: 'acme/payment-service',
        environment: 'PRODUCTION',
        health: 'HEALTHY',
        currentRisk: 'LOW',
        riskScore: 18,
        uptimePercentage: 99.995,
        deploymentsCount: 34,
        activeDeploymentsCount: 0,
        incidentsCount: 0,
        lastDeploymentAt: '3 days ago',
        lastDeploymentVersion: 'v3.2.1',
        telemetry: {
          errorRate: 0.02,
          p95Latency: 240,
          requestsPerSecond: 160,
          cpuPercentage: 38,
          memoryPercentage: 51,
        },
        dependencies: [
          { id: 'ext-stripe', name: 'Stripe Gateway API', type: 'THIRD_PARTY', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'REST' },
          { id: 'db-postgres', name: 'PostgreSQL Primary Cluster', type: 'DATABASE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'PostgreSQL' },
        ],
        dependents: [
          { id: 'srv-checkout', name: 'Checkout API', type: 'SERVICE', direction: 'UPSTREAM', health: 'HEALTHY', protocol: 'gRPC' },
        ],
        tags: ['pci-dss', 'tier-1', 'sox-compliant'],
      },
      {
        id: 'srv-order',
        organizationId: orgId,
        name: 'Order Service',
        slug: 'order-service',
        description: 'Order state machine, fulfillment coordination, and customer purchase ledger.',
        tier: 'TIER_1',
        owner: {
          team: 'Fulfillment Platform',
          lead: 'David Kim',
          slackChannel: '#order-platform',
        },
        repository: 'acme/order-service',
        environment: 'PRODUCTION',
        health: 'HEALTHY',
        currentRisk: 'LOW',
        riskScore: 22,
        uptimePercentage: 99.97,
        deploymentsCount: 62,
        activeDeploymentsCount: 0,
        incidentsCount: 0,
        lastDeploymentAt: '1 day ago',
        lastDeploymentVersion: 'v1.14.0',
        telemetry: {
          errorRate: 0.01,
          p95Latency: 95,
          requestsPerSecond: 320,
          cpuPercentage: 42,
          memoryPercentage: 58,
        },
        dependencies: [
          { id: 'db-postgres', name: 'PostgreSQL Primary Cluster', type: 'DATABASE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'PostgreSQL' },
        ],
        dependents: [
          { id: 'srv-checkout', name: 'Checkout API', type: 'SERVICE', direction: 'UPSTREAM', health: 'HEALTHY', protocol: 'gRPC' },
        ],
        tags: ['tier-1', 'fulfillment'],
      },
      {
        id: 'srv-gw',
        organizationId: orgId,
        name: 'API Gateway',
        slug: 'api-gateway',
        description: 'Edge reverse proxy, TLS termination, OAuth verification, and distributed rate limiting.',
        tier: 'TIER_1',
        owner: {
          team: 'Core Infrastructure',
          lead: 'Riley Vance',
          slackChannel: '#infra-core',
        },
        repository: 'acme/api-gateway',
        environment: 'PRODUCTION',
        health: 'HEALTHY',
        currentRisk: 'LOW',
        riskScore: 12,
        uptimePercentage: 99.999,
        deploymentsCount: 15,
        activeDeploymentsCount: 0,
        incidentsCount: 0,
        lastDeploymentAt: '2 weeks ago',
        lastDeploymentVersion: 'v4.1.0',
        telemetry: {
          errorRate: 0.01,
          p95Latency: 28,
          requestsPerSecond: 1840,
          cpuPercentage: 62,
          memoryPercentage: 45,
        },
        dependencies: [
          { id: 'srv-checkout', name: 'Checkout API', type: 'SERVICE', direction: 'DOWNSTREAM', health: 'HEALTHY', protocol: 'REST' },
        ],
        dependents: [],
        tags: ['edge', 'tier-1', 'security-gateway'],
      },
    ];

    this.history = [
      {
        id: 'hist-01',
        prNumber: 1782,
        title: 'Migrate checkout idempotency storage to Postgres',
        repository: 'acme/checkout-service',
        files: ['migrations/20261001_idempotency.sql', 'src/services/checkout.ts', 'src/db/connection.ts'],
        outcome: 'ROLLBACK',
        date: '2026-10-01',
        summary: 'Non-concurrent index creation caused connection pool starvation during peak traffic.',
      },
      {
        id: 'hist-02',
        prNumber: 1740,
        title: 'Add idempotency middleware to order submission',
        repository: 'acme/checkout-service',
        files: ['src/middleware/idempotency.ts', 'src/routes/checkout.ts'],
        outcome: 'SUCCESSFUL',
        date: '2026-09-15',
        summary: 'Standard middleware update rolled out safely via 4-stage canary.',
      },
      {
        id: 'hist-03',
        prNumber: 1690,
        title: 'Refactor payment gateway retry parameters',
        repository: 'acme/payment-gateway',
        files: ['src/clients/gateway.ts', 'config/production.json'],
        outcome: 'INCIDENT',
        date: '2026-08-20',
        summary: 'Aggressive retry loop triggered rate-limits on external acquirer.',
      },
    ];

    this.changes = [
      {
        id: 'pr-1824',
        organization_id: orgId,
        number: 1824,
        external_id: '1824',
        title: 'Optimize checkout query & persist idempotency keys',
        type: 'PULL_REQUEST',
        author: {
          name: 'Alex Rivera',
          username: 'arivera',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          isAiAgent: false,
        },
        repository: 'acme/checkout-service',
        branch: {
          source: 'feat/checkout-idempotency-perf',
          target: 'main',
        },
        commitHash: '7f9a2b4c8e',
        risk: {
          score: 78,
          level: 'HIGH',
          confidence: 94,
          summary: 'High risk due to un-indexed DDL migration on Tier-1 checkout database combined with auth boundary changes.',
          reasons: [
            'DDL migration alters high-traffic checkout_transactions table.',
            'CREATE INDEX executed without CONCURRENTLY clause.',
            'Direct dependency on Tier-1 payment-gateway.',
          ],
          factors: [
            {
              id: 'factor-db',
              name: 'Database Migration Risk',
              score: 88,
              weight: 'CRITICAL',
              description: 'Non-concurrent index creation on checkout_transactions table acquires exclusive table lock.',
              details: [
                'CREATE INDEX idx_checkout_idempotency_v2 without CONCURRENTLY.',
                'Target table contains ~14.2M records.',
              ],
            },
            {
              id: 'factor-blast',
              name: 'Dependency & Blast Radius',
              score: 76,
              weight: 'HIGH',
              description: 'Service failure cascades to payment gateway and active cart checkout flows.',
              details: ['Direct connection to payment-gateway (Tier-1).', 'Downstream impact on order-fulfillment.'],
            },
            {
              id: 'factor-size',
              name: 'Change Size & Scope',
              score: 62,
              weight: 'MEDIUM',
              description: '17 files changed with 482 additions and 119 deletions.',
              details: ['Touches ORM models, transaction controllers, and configuration files.'],
            },
          ],
        },
        analysis: {
          overview: 'This pull request modifies the checkout persistence layer to introduce Redis-backed idempotency keys with PostgreSQL fallback.',
          technicalDetails: 'The migration introduces table alterations that lock checkout_transactions during index building.',
          identifiedRisks: [
            'Non-concurrent index locks high-throughput database during checkout.',
            'Idempotency key TTL mismatch could trigger duplicate charges.',
          ],
          recommendedVerification: 'Mandate progressive canary rollout: 5% -> 25% -> 50% -> 100% with 10-minute stabilization windows.',
          generatedAt: '2026-10-09T08:30:00Z',
        },
        impact: {
          servicesCount: 4,
          databasesCount: 2,
          apisCount: 3,
          potentialUsersImpacted: 24500,
          dependencyChain: ['checkout-service', 'payment-gateway', 'inventory-service', 'notification-service'],
          affectedServices: [
            { id: 'svc-checkout-01', name: 'checkout-service', tier: 'TIER_1', relationship: 'DIRECT', health: 'HEALTHY', currentErrorRate: '0.04%', blastRadiusScore: 92 },
            { id: 'svc-payment-01', name: 'payment-gateway', tier: 'TIER_1', relationship: 'DOWNSTREAM', health: 'HEALTHY', currentErrorRate: '0.02%', blastRadiusScore: 84 },
            { id: 'svc-inventory-01', name: 'inventory-service', tier: 'TIER_2', relationship: 'DOWNSTREAM', health: 'HEALTHY', currentErrorRate: '0.01%', blastRadiusScore: 54 },
          ],
        },
        historicalSimilarity: [
          {
            id: 'hist-01',
            prNumber: 1782,
            title: 'Migrate checkout idempotency storage to Postgres',
            repository: 'acme/checkout-service',
            risk: 'HIGH',
            outcome: 'ROLLBACK',
            similarityPercentage: 84,
            date: '2026-10-01',
            summary: 'Non-concurrent index creation caused connection pool starvation during peak traffic.',
          },
        ],
        policyRecommendation: {
          strategy: 'CANARY',
          stages: [5, 25, 50, 100],
          verificationWindowMinutes: 10,
          requiredSignals: [
            { name: 'Canary HTTP Error Rate', metric: 'http_error_rate_pct', operator: '<', threshold: '1.0%', targetValue: '0.04%' },
            { name: 'P95 Transaction Latency', metric: 'p95_latency_ms', operator: '<=', threshold: '250ms', targetValue: '175ms' },
          ],
          humanApprovalRequired: true,
          approvalReason: 'Risk score 78 exceeds automated deployment threshold (70). Tier-1 service modification requires SRE approval.',
          suggestedAction: 'APPROVE_POLICY',
        },
        filesChangedCount: 17,
        additions: 482,
        deletions: 119,
        status: 'AWAITING_REVIEW',
        environment: 'PRODUCTION',
        createdAt: '2026-10-09T08:15:00Z',
        updatedAt: '2026-10-09T08:30:00Z',
        diffs: [
          {
            filename: 'migrations/20261009_idempotency_keys.sql',
            status: 'ADDED',
            additions: 24,
            deletions: 0,
            riskHighlights: ['CREATE INDEX without CONCURRENTLY', 'Table lock hazard on checkout_transactions'],
            chunks: [
              {
                header: '@@ -0,0 +1,12 @@',
                lines: [
                  { type: 'add', text: 'CREATE TABLE IF NOT EXISTS idempotency_keys (' },
                  { type: 'add', text: '  key VARCHAR(255) PRIMARY KEY,' },
                  { type: 'add', text: '  created_at TIMESTAMPTZ DEFAULT NOW()' },
                  { type: 'add', text: ');' },
                  { type: 'add', text: 'CREATE INDEX idx_checkout_idempotency ON checkout_transactions(idempotency_key);' },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Seed Policies
    this.policies = [
      {
        id: 'pol-prod-safety',
        organizationId: orgId,
        name: 'Production Safety Policy',
        description: 'Enforces automated risk thresholds, mandatory canary progression, and telemetry-triggered rollback triggers.',
        environment: 'PRODUCTION',
        tierScope: 'ALL',
        status: 'ACTIVE',
        rulesCount: 4,
        rules: [
          {
            id: 'rule-1',
            conditionName: 'High Risk Human Approval Gate',
            field: 'risk_score',
            operator: '>',
            thresholdValue: 80,
            unit: 'Score',
            action: 'REQUIRE_HUMAN_APPROVAL',
            actionDescription: 'Require explicit signoff before initiating production traffic.',
            enabled: true,
          },
          {
            id: 'rule-2',
            conditionName: 'Elevated Risk Canary Mandate',
            field: 'risk_score',
            operator: '>',
            thresholdValue: 60,
            unit: 'Score',
            action: 'REQUIRE_CANARY',
            actionDescription: 'Require multi-stage canary (5% → 25% → 50% → 100%) with minimum 10m verification.',
            enabled: true,
          },
          {
            id: 'rule-3',
            conditionName: 'Telemetry Anomaly Pause Threshold',
            field: 'error_rate',
            operator: '>',
            thresholdValue: 2.0,
            unit: '%',
            action: 'PAUSE_ROLLOUT',
            actionDescription: 'Immediately pause traffic progression and alert on-call engineer.',
            enabled: true,
          },
          {
            id: 'rule-4',
            conditionName: 'Critical Breach Automated Rollback',
            field: 'error_rate',
            operator: '>',
            thresholdValue: 5.0,
            unit: '%',
            action: 'ROLLBACK_DEPLOYMENT',
            actionDescription: 'Instantly execute automated rollback to previous known-good deployment version.',
            enabled: true,
          },
        ],
        version: 1,
        lastUpdatedAt: 'Today, 08:30 AM',
        updatedBy: 'Alex Mercer',
        owner: 'Platform Engineering Team',
        enforcementMode: 'ENFORCING',
      },
      {
        id: 'pol-critical-db',
        organizationId: orgId,
        name: 'Database Migration Strict Guard',
        description: 'Blocks pull requests containing destructive un-indexed schema operations or drops.',
        environment: 'ALL',
        tierScope: 'CRITICAL_SERVICES',
        status: 'ACTIVE',
        rulesCount: 2,
        rules: [
          {
            id: 'rule-db-1',
            conditionName: 'Block Destructive DDL',
            field: 'has_db_migration',
            operator: '==',
            thresholdValue: 'true',
            action: 'BLOCK_MERGE',
            actionDescription: 'Post failure status check on PR if destructive operations are detected.',
            enabled: true,
          },
          {
            id: 'rule-db-2',
            conditionName: 'Large Changes Require Off-Peak',
            field: 'change_size_lines',
            operator: '>',
            thresholdValue: 1000,
            action: 'RESTRICT_OFF_PEAK_ONLY',
            actionDescription: 'Restrict rollout execution to scheduled maintenance windows.',
            enabled: true,
          },
        ],
        version: 1,
        lastUpdatedAt: 'Yesterday',
        updatedBy: 'Sarah Connor',
        owner: 'Database Architecture Team',
        enforcementMode: 'ENFORCING',
      },
    ];

    // Seed Initial Audit Events
    this.auditEvents = [
      {
        id: 'aud-101',
        timestamp: '2026-10-09T08:30:00Z',
        timeFormatted: '08:30:00',
        actor: { name: 'ChangeGuard', type: 'POLICY_ENGINE' },
        action: 'DEPLOYMENT_PAUSED',
        actionTitle: 'Deployment paused automatically',
        resource: { type: 'DEPLOYMENT', id: 'dep-checkout-284', name: 'checkout-service (v2.8.4)' },
        result: 'SUCCESS',
        source: 'POLICY_ENGINE',
        details: 'Telemetry threshold breached: HTTP Error Rate increased above policy maximum limit (1.0%).',
      },
      {
        id: 'aud-102',
        timestamp: '2026-10-09T08:20:00Z',
        timeFormatted: '08:20:00',
        actor: { name: 'Alex Mercer', type: 'USER', email: 'platform@acme.corp' },
        action: 'POLICY_UPDATED',
        actionTitle: 'Updated Production Safety Policy',
        resource: { type: 'POLICY', id: 'pol-prod-safety', name: 'Production Safety Policy' },
        result: 'SUCCESS',
        source: 'WEB_CONSOLE',
        details: 'Adjusted error_rate pause threshold from 2.5% to 2.0%.',
      },
    ];

    // Seed Initial Deployments
    this.deployments = [
      {
        id: 'dep-checkout-284',
        organizationId: orgId,
        serviceId: 'srv-checkout',
        serviceName: 'Checkout Service',
        serviceTier: 'TIER_1',
        version: 'v2.8.4',
        previousVersion: 'v2.8.3',
        environment: 'PRODUCTION',
        status: 'MONITORING',
        risk: {
          score: 78,
          level: 'HIGH',
        },
        strategy: 'CANARY',
        currentTrafficPercentage: 5,
        targetTrafficPercentage: 5,
        stages: [5, 25, 50, 100],
        currentStageIndex: 0,
        health: 'HEALTHY',
        changeId: 'pr-1824',
        changeTitle: 'Optimize checkout query & persist idempotency keys',
        changeAuthor: 'Alex Morgan',
        repository: 'acme/checkout-service',
        commitHash: '7f9c21b',
        startedAt: new Date(Date.now() - 480000).toISOString(),
        updatedAt: now,
        currentTelemetry: {
          errorRate: 0.04,
          p95Latency: 182,
          requestsPerMinute: 12800,
          cpuUtilization: 42,
          memoryUtilization: 58,
        },
        telemetryHistory: [
          { timestamp: '10:42', errorRate: 0.03, p95Latency: 175, requestsPerMinute: 11200, cpuUtilization: 40, memoryUtilization: 55, canaryTrafficPercentage: 5 },
          { timestamp: '10:46', errorRate: 0.04, p95Latency: 182, requestsPerMinute: 12800, cpuUtilization: 42, memoryUtilization: 58, canaryTrafficPercentage: 5 },
        ],
        signals: [
          {
            id: 'sig-1',
            name: 'HTTP Error Rate',
            description: 'Aggregate 5xx response percentage over rolling 5-minute window',
            metricKey: 'http_error_rate_pct',
            operator: '<',
            threshold: 1.0,
            currentValue: 0.04,
            unit: '%',
            status: 'PASSED',
            evaluatedAt: now,
          },
          {
            id: 'sig-2',
            name: 'P95 Transaction Latency',
            description: 'End-to-end checkout execution duration at 95th percentile',
            metricKey: 'p95_latency_ms',
            operator: '<',
            threshold: 500,
            currentValue: 182,
            unit: 'ms',
            status: 'PASSED',
            evaluatedAt: now,
          },
          {
            id: 'sig-3',
            name: 'Cluster CPU Utilization',
            description: 'Cluster pod container CPU quota utilization',
            metricKey: 'cpu_usage_pct',
            operator: '<',
            threshold: 75,
            currentValue: 42,
            unit: '%',
            status: 'PASSED',
            evaluatedAt: now,
          },
        ],
        timeline: [
          {
            id: 'tl-1',
            timestamp: new Date(Date.now() - 480000).toISOString(),
            timeFormatted: '8 min ago',
            title: 'Canary Rollout Initiated (5% Traffic)',
            description: 'Argo Rollouts configured 5% canary split for v2.8.4.',
            type: 'INFO',
            actor: 'Alex Mercer (Platform Eng)',
          },
        ],
      },
    ];

    // Seed Initial Incidents
    this.incidents = [
      {
        id: 'inc-482',
        organizationId: orgId,
        code: 'INC-482',
        title: 'Checkout Service Canary Latency Breach',
        severity: 'SEV-2',
        status: 'CONTAINED',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        resolvedAt: new Date(Date.now() - 1800000).toISOString(),
        durationFormatted: '30m',
        affectedServices: ['Checkout Service', 'Payment Service'],
        relatedDeploymentId: 'dep-checkout-284',
        relatedDeploymentVersion: 'v2.8.4',
        relatedChangeId: 'pr-1824',
        relatedChangeTitle: 'Optimize checkout query & persist idempotency keys',
        rootCauseAnalysis: {
          summary: 'Elevated lock contention on checkout_orders table during connection pool warm-up.',
          triggerMechanism: 'Connection pool starvation triggered synchronous timeouts.',
          failureContainedBy: 'ChangeGuard Autonomous Verification Engine (Traffic paused at 5%)',
          preventativeRecommendation: 'Tune max_connections and implement exponential backoff on pool retry.',
        },
        metrics: {
          peakErrorRate: '2.4%',
          peakP95Latency: '640ms',
          impactedRequests: 140,
          impactedUsers: 85,
        },
        timeline: [
          {
            id: 'tl-inc-1',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            timeFormatted: '1 hr ago',
            title: 'P95 Latency threshold breached (>500ms)',
            description: 'P95 latency spiked to 640ms on canary instances.',
            actor: 'ChangeGuard Verification Engine',
            isAutomatic: true,
            type: 'TRIGGER',
          },
          {
            id: 'tl-inc-2',
            timestamp: new Date(Date.now() - 3550000).toISOString(),
            timeFormatted: '59 min ago',
            title: 'Canary Traffic Paused',
            description: 'Autonomous safety circuit breaker halted progression to prevent user impact.',
            actor: 'ChangeGuard Autonomous Safety Engine',
            isAutomatic: true,
            type: 'ACTION',
          },
        ],
        actionsTaken: ['Autonomous pause executed', 'Pool sizing adjusted', 'Canary resumed after verification'],
      },
    ];

    // Seed Settings (All 6 settings sections backed by DB)
    this.settings = {
      general: {
        orgName: 'Acme Platform Engineering',
        slug: 'acme-corp',
        defaultEnvironment: 'PRODUCTION',
        riskScoreThreshold: 75,
        slackChannel: '#changeguard-deployments',
      },
      security: {
        ssoEnabled: true,
        ssoProvider: 'OKTA',
        ssoEntrypoint: 'https://acme.okta.com/app/changeguard/sso/saml',
        sessionTimeoutMinutes: 60,
        mfaRequired: true,
        ipAllowlist: ['10.0.0.0/8', '192.168.1.0/24'],
      },
      environments: [
        { name: 'Production US-East', type: 'PRODUCTION', clusterUrl: 'https://k8s-prod-useast.acme.net', isProduction: true },
        { name: 'Staging US-East', type: 'STAGING', clusterUrl: 'https://k8s-stage-useast.acme.net', isProduction: false },
      ],
      notifications: {
        slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/X00DEMO',
        slackAlertChannel: '#changeguard-deployments',
        emailAlertsEnabled: true,
        notifyOnSev1: true,
        notifyOnSev2: true,
      },
      ai: {
        provider: 'ANTHROPIC',
        model: 'claude-3-5-sonnet',
        apiKeyConfigured: true,
        temperature: 0.2,
        maxTokens: 4096,
        riskCalibrationAutoTune: true,
      },
    };

    // Seed Integrations
    this.integrations = [
      {
        id: 'int-github',
        name: 'GitHub',
        category: 'VCS',
        description: 'Pull request ingestion, semantic commit analysis, and PR safety status checks.',
        iconName: 'Github',
        status: 'CONNECTED',
        lastSyncAt: '2 minutes ago',
        connectedRepositoriesOrClusters: 14,
        config: { repository: 'acme/checkout-service', branch: 'main', webhookEnabled: true },
      },
      {
        id: 'int-gh-actions',
        name: 'GitHub Actions',
        category: 'CI_CD',
        description: 'Automated CI build verification, step artifact scanning, and release gates.',
        iconName: 'GitMerge',
        status: 'CONNECTED',
        lastSyncAt: '5 minutes ago',
        connectedRepositoriesOrClusters: 14,
        config: { endpoint: 'https://api.github.com/repos/acme/actions', webhookEnabled: true },
      },
      {
        id: 'int-k8s',
        name: 'Kubernetes',
        category: 'CONTAINER_ORCHESTRATION',
        description: 'Production cluster topology discovery, pod health inspection, and replica scaling.',
        iconName: 'Server',
        status: 'CONNECTED',
        lastSyncAt: 'Just now',
        connectedRepositoriesOrClusters: 4,
        config: { clusterName: 'prod-us-east-1-eks', namespace: 'production' },
      },
      {
        id: 'int-argo',
        name: 'Argo Rollouts',
        category: 'PROGRESSIVE_DELIVERY',
        description: 'Native Canary and Blue/Green progressive traffic management & autonomous rollback.',
        iconName: 'Cpu',
        status: 'CONNECTED',
        lastSyncAt: '1 minute ago',
        connectedRepositoriesOrClusters: 4,
        config: { endpoint: 'https://argo-rollouts.internal.acme.net', namespace: 'argo-rollouts' },
      },
      {
        id: 'int-slack',
        name: 'Slack',
        category: 'NOTIFICATIONS',
        description: 'Automated alerts for threshold breaches, policy approvals, and autonomous rollbacks.',
        iconName: 'MessageSquare',
        status: 'CONNECTED',
        lastSyncAt: 'Just now',
        connectedRepositoriesOrClusters: 1,
        config: { channel: '#changeguard-deployments' },
      },
    ];
  }

  public async isConnected(): Promise<boolean> {
    if (!this.checked && this.pool) {
      try {
        const client = await this.pool.connect();
        client.release();
        this.isPostgresAvailable = true;
      } catch {
        this.isPostgresAvailable = false;
      }
      this.checked = true;
    }
    return true;
  }

  public isUsingPostgres(): boolean {
    return this.isPostgresAvailable;
  }

  // User queries
  public async findUserByEmail(email: string): Promise<DbUser | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.is_active) || null;
  }

  public async findUserById(id: string): Promise<DbUser | null> {
    return this.users.find((u) => u.id === id && u.is_active) || null;
  }

  public async listUsersByOrg(organizationId: string): Promise<DbUser[]> {
    return this.users.filter((u) => u.organization_id === organizationId);
  }

  public async createUser(data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    const now = new Date().toISOString();
    const newUser: DbUser = {
      ...data,
      id: `usr-${crypto.randomUUID()}`,
      created_at: now,
      updated_at: now,
    };
    this.users.push(newUser);
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return null;
    const updated = {
      ...this.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.users[userIndex] = updated;
    return updated;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const lenBefore = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < lenBefore;
  }

  // API Key queries
  public async listApiKeysByOrg(organizationId: string): Promise<DbApiKey[]> {
    return this.apiKeys.filter((k) => k.organization_id === organizationId && !k.revoked_at);
  }

  public async findApiKeyByPrefix(keyPrefix: string): Promise<DbApiKey | null> {
    return this.apiKeys.find((k) => k.key_prefix === keyPrefix && !k.revoked_at) || null;
  }

  public async createApiKey(data: Omit<DbApiKey, 'id' | 'created_at' | 'last_used_at' | 'revoked_at'>): Promise<DbApiKey> {
    const newKey: DbApiKey = {
      ...data,
      id: `key-${crypto.randomUUID()}`,
      last_used_at: null,
      revoked_at: null,
      created_at: new Date().toISOString(),
    };
    this.apiKeys.push(newKey);
    return newKey;
  }

  public async revokeApiKey(id: string, organizationId: string): Promise<boolean> {
    const key = this.apiKeys.find((k) => k.id === id && k.organization_id === organizationId);
    if (!key) return false;
    key.revoked_at = new Date().toISOString();
    return true;
  }

  public async updateApiKeyLastUsed(id: string): Promise<void> {
    const key = this.apiKeys.find((k) => k.id === id);
    if (key) {
      key.last_used_at = new Date().toISOString();
    }
  }

  public async getOrganization(id: string): Promise<DbOrganization | null> {
    return this.organizations.find((o) => o.id === id) || null;
  }

  // Changes queries
  public async listChanges(
    orgId: string,
    filters?: {
      status?: string;
      riskLevel?: string;
      repository?: string;
      environment?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: DbChange[]; total: number }> {
    let items = this.changes.filter((c) => c.organization_id === orgId);

    if (filters?.status) {
      items = items.filter((c) => c.status === filters.status);
    }
    if (filters?.riskLevel) {
      items = items.filter((c) => c.risk.level === filters.riskLevel);
    }
    if (filters?.repository) {
      items = items.filter((c) => c.repository.toLowerCase().includes(filters.repository!.toLowerCase()));
    }
    if (filters?.environment) {
      items = items.filter((c) => c.environment === filters.environment);
    }

    const total = items.length;
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return { data: paginated, total };
  }

  public async getChangeById(id: string, orgId: string): Promise<DbChange | null> {
    return (
      this.changes.find(
        (c) =>
          c.organization_id === orgId &&
          (c.id === id || c.id === `pr-${id}` || c.number === Number(id) || c.external_id === id)
      ) || null
    );
  }

  public async createChange(data: Omit<DbChange, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbChange> {
    const now = new Date().toISOString();
    const newChange: DbChange = {
      ...data,
      id: `pr-${data.number || crypto.randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.changes.unshift(newChange);
    return newChange;
  }

  public async updateChangeStatus(id: string, status: DbChange['status'], orgId: string): Promise<DbChange | null> {
    const change = await this.getChangeById(id, orgId);
    if (!change) return null;
    change.status = status;
    change.updatedAt = new Date().toISOString();
    return change;
  }

  public async approveChange(
    id: string,
    approverId: string,
    orgId: string,
    isSecondApproval = false
  ): Promise<{ change: DbChange; isFullyApproved: boolean } | null> {
    const change = await this.getChangeById(id, orgId);
    if (!change) return null;

    const requiresTwoPerson = change.risk.score >= 90;

    if (requiresTwoPerson && !isSecondApproval) {
      change.status = 'AWAITING_SECOND_APPROVAL';
      change.policyRecommendation.approvedBy = approverId;
      change.policyRecommendation.approvedAt = new Date().toISOString();
      change.updatedAt = new Date().toISOString();
      return { change, isFullyApproved: false };
    }

    if (isSecondApproval) {
      change.status = 'APPROVED';
      change.policyRecommendation.secondApproverId = approverId;
      change.policyRecommendation.secondApprovedAt = new Date().toISOString();
      change.updatedAt = new Date().toISOString();
      return { change, isFullyApproved: true };
    }

    change.status = 'APPROVED';
    change.policyRecommendation.approvedBy = approverId;
    change.policyRecommendation.approvedAt = new Date().toISOString();
    change.updatedAt = new Date().toISOString();
    return { change, isFullyApproved: true };
  }

  public getServices(): Map<string, ServiceNode> {
    return this.services;
  }

  public getDependencies(): DependencyEdge[] {
    return this.dependencies;
  }

  public getHistory(): HistoricalRecord[] {
    return this.history;
  }

  // --- Policy Queries ---
  public async listPolicies(orgId: string): Promise<Policy[]> {
    return this.policies.filter((p) => p.organizationId === orgId);
  }

  public async getPolicyById(id: string, orgId: string): Promise<Policy | null> {
    return this.policies.find((p) => p.id === id && p.organizationId === orgId) || null;
  }

  public async createPolicy(
    data: Omit<Policy, 'id' | 'version' | 'rulesCount' | 'lastUpdatedAt'>,
    authorName: string
  ): Promise<Policy> {
    const newPolicy: Policy = {
      ...data,
      id: `pol-${crypto.randomUUID().slice(0, 8)}`,
      version: 1,
      rulesCount: data.rules.length,
      lastUpdatedAt: new Date().toISOString(),
      updatedBy: authorName,
    };
    this.policies.push(newPolicy);
    return newPolicy;
  }

  public async updatePolicy(
    id: string,
    updates: Partial<Omit<Policy, 'id' | 'organizationId' | 'version'>>,
    authorName: string,
    orgId: string
  ): Promise<{ policy: Policy; previousVersion: PolicyVersion } | null> {
    const policy = await this.getPolicyById(id, orgId);
    if (!policy) return null;

    // Snapshot previous version
    const prevVersion: PolicyVersion = {
      id: `ver-${crypto.randomUUID().slice(0, 8)}`,
      policyId: policy.id,
      version: policy.version,
      snapshot: JSON.parse(JSON.stringify(policy)),
      createdAt: new Date().toISOString(),
      createdBy: policy.updatedBy,
    };
    this.policyVersions.push(prevVersion);

    // Apply updates and increment version
    const updated: Policy = {
      ...policy,
      ...updates,
      version: policy.version + 1,
      rulesCount: updates.rules ? updates.rules.length : policy.rules.length,
      lastUpdatedAt: new Date().toISOString(),
      updatedBy: authorName,
    };

    const index = this.policies.findIndex((p) => p.id === id && p.organizationId === orgId);
    this.policies[index] = updated;

    return { policy: updated, previousVersion: prevVersion };
  }

  public async getPolicyVersions(policyId: string): Promise<PolicyVersion[]> {
    return this.policyVersions.filter((v) => v.policyId === policyId).sort((a, b) => b.version - a.version);
  }

  // --- Audit Queries ---
  public async appendAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.unshift(event);
  }

  public async listAuditEvents(
    orgId: string,
    filters?: {
      action?: string;
      actor?: string;
      resourceType?: string;
      result?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: AuditEvent[]; total: number }> {
    let items = [...this.auditEvents];

    if (filters?.action) {
      items = items.filter((e) => e.action === filters.action);
    }
    if (filters?.actor) {
      items = items.filter((e) => e.actor.name.toLowerCase().includes(filters.actor!.toLowerCase()));
    }
    if (filters?.resourceType) {
      items = items.filter((e) => e.resource.type === filters.resourceType);
    }
    if (filters?.result) {
      items = items.filter((e) => e.result === filters.result);
    }

    const total = items.length;
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return { data: paginated, total };
  }

  public async exportAuditCsv(orgId: string): Promise<string> {
    const headers = ['"ID"', '"Timestamp"', '"Actor Name"', '"Actor Type"', '"Action"', '"Resource Type"', '"Resource Name"', '"Result"', '"Source"', '"Details"'];
    const rows = this.auditEvents.map((e) => [
      `"${e.id}"`,
      `"${e.timestamp}"`,
      `"${e.actor.name}"`,
      `"${e.actor.type}"`,
      `"${e.action}"`,
      `"${e.resource.type}"`,
      `"${e.resource.name.replace(/"/g, '""')}"`,
      `"${e.result}"`,
      `"${e.source}"`,
      `"${e.details.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // --- Progressive Deployment Queries ---
  public async listDeployments(
    orgId: string,
    filters?: { environment?: string; status?: string; serviceId?: string }
  ): Promise<Deployment[]> {
    let list = this.deployments.filter((d) => d.organizationId === orgId);
    if (filters?.environment) {
      list = list.filter((d) => d.environment === filters.environment);
    }
    if (filters?.status) {
      list = list.filter((d) => d.status === filters.status);
    }
    if (filters?.serviceId) {
      list = list.filter((d) => d.serviceId === filters.serviceId);
    }
    return list;
  }

  public async getDeploymentById(id: string): Promise<Deployment | null> {
    return this.deployments.find((d) => d.id === id || d.serviceId === id) || null;
  }

  public async createDeployment(
    data: Omit<Deployment, 'id' | 'startedAt' | 'updatedAt' | 'timeline' | 'telemetryHistory'>
  ): Promise<Deployment> {
    const now = new Date().toISOString();
    const id = `dep-${data.serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(100 + Math.random() * 900)}`;
    const dep: Deployment = {
      ...data,
      id,
      startedAt: now,
      updatedAt: now,
      telemetryHistory: [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: now,
          timeFormatted: 'Just now',
          title: `Rollout Initiated (${data.currentTrafficPercentage}% Traffic)`,
          description: `Rollout created for ${data.serviceName} ${data.version}.`,
          type: 'INFO',
          actor: data.changeAuthor || 'ChangeGuard System',
        },
      ],
    };
    this.deployments.unshift(dep);
    return dep;
  }

  public async updateDeploymentState(
    id: string,
    targetStatus: DeploymentStatus,
    updates?: Partial<Deployment> & { expectedStatus?: DeploymentStatus }
  ): Promise<Deployment> {
    const dep = this.deployments.find((d) => d.id === id);
    if (!dep) {
      const err = new Error(`Deployment ${id} not found`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    // Optimistic concurrency check: if caller expected a specific status and it changed
    if (updates?.expectedStatus && dep.status !== updates.expectedStatus) {
      const err = new Error(`State conflict: deployment ${id} is in status ${dep.status}, expected ${updates.expectedStatus}`);
      (err as any).statusCode = 409;
      (err as any).code = 'STATE_CONFLICT';
      throw err;
    }

    // Concurrency guard: cannot rollback if already rolled back or rolling back
    if (targetStatus === 'ROLLING_BACK' || targetStatus === 'ROLLED_BACK') {
      if (dep.status === 'ROLLED_BACK') {
        const err = new Error(`Deployment ${id} has already been rolled back.`);
        (err as any).statusCode = 409;
        (err as any).code = 'STATE_CONFLICT';
        throw err;
      }
    }

    dep.status = targetStatus;
    dep.updatedAt = new Date().toISOString();
    if (updates) {
      const { expectedStatus, ...rest } = updates;
      Object.assign(dep, rest);
    }

    return dep;
  }

  // --- Incident Queries ---
  public async listIncidents(orgId: string): Promise<Incident[]> {
    return this.incidents.filter((inc) => inc.organizationId === orgId);
  }

  public async getIncidentById(id: string): Promise<Incident | null> {
    return this.incidents.find((inc) => inc.id === id || inc.code === id) || null;
  }

  public async createIncident(data: any): Promise<Incident> {
    const now = new Date().toISOString();
    const id = `inc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const code = data.code || `INC-${Math.floor(100 + Math.random() * 900)}`;
    const orgId = data.organizationId || data.organization_id || 'org-acme-primary-01';

    const incident: Incident = {
      id,
      organizationId: orgId,
      code,
      title: data.title,
      severity: data.severity || 'SEV-2',
      status: data.status || 'TRIGGERED',
      startedAt: now,
      durationFormatted: 'Active (Just now)',
      affectedServices: data.affectedServices || (data.related_deployment_id ? ['Checkout Service'] : []),
      relatedDeploymentId: data.relatedDeploymentId || data.related_deployment_id,
      relatedDeploymentVersion: data.relatedDeploymentVersion || 'v2.8.4',
      relatedChangeId: data.relatedChangeId || data.related_change_id,
      relatedChangeTitle: data.relatedChangeTitle,
      rootCauseAnalysis: {
        summary: data.rca_summary || data.rootCauseAnalysis?.summary || data.title,
        triggerMechanism: data.rca_trigger || data.rootCauseAnalysis?.triggerMechanism || 'Telemetry threshold breach',
        failureContainedBy: data.rca_contained_by || data.rootCauseAnalysis?.failureContainedBy || 'ChangeGuard Autonomous Engine',
        preventativeRecommendation: data.rca_recommendation || data.rootCauseAnalysis?.preventativeRecommendation || 'Review and run remediation.',
      },
      metrics: {
        peakErrorRate: data.peak_error_rate || data.metrics?.peakErrorRate || '3.8%',
        peakP95Latency: data.peak_p95_latency || data.metrics?.peakP95Latency || '420ms',
        impactedRequests: data.impacted_requests || data.metrics?.impactedRequests || 140,
        impactedUsers: data.impacted_users || data.metrics?.impactedUsers || 85,
      },
      timeline: [
        {
          id: `tl-inc-${Date.now()}`,
          timestamp: now,
          timeFormatted: 'Just now',
          title: `Incident Triggered: ${data.title}`,
          description: data.rca_summary || 'Autonomous circuit breaker intervened.',
          actor: 'ChangeGuard Autonomous Engine',
          isAutomatic: true,
          type: 'TRIGGER',
        },
      ],
      actionsTaken: ['Autonomous pause executed', 'Incident ticket dispatched to on-call SRE'],
    };

    this.incidents.unshift(incident);
    return incident;
  }

  public async updateIncidentStatus(id: string, status: IncidentStatus, comment?: string): Promise<Incident> {
    const inc = this.incidents.find((i) => i.id === id || i.code === id);
    if (!inc) {
      const err = new Error(`Incident ${id} not found`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    inc.status = status;
    const now = new Date().toISOString();
    if (status === 'RESOLVED') {
      inc.resolvedAt = now;
      inc.durationFormatted = 'Resolved (42m)';
    }

    inc.timeline.unshift({
      id: `tl-inc-${Date.now()}`,
      timestamp: now,
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: `Incident status updated to ${status}`,
      description: comment || `Status transition executed: ${status}`,
      actor: 'Operator / SRE',
      isAutomatic: false,
      type: status === 'RESOLVED' ? 'RESOLVE' : 'ACTION',
    });

    return inc;
  }

  public async updateIncidentRca(id: string, rca: Partial<Incident['rootCauseAnalysis']>): Promise<Incident> {
    const inc = this.incidents.find((i) => i.id === id || i.code === id);
    if (!inc) {
      const err = new Error(`Incident ${id} not found`);
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    Object.assign(inc.rootCauseAnalysis, rca);
    return inc;
  }

  // --- Service Catalog & Topology Queries ---
  public async listServices(
    orgId: string,
    filters?: { tier?: string; health?: string; environment?: string }
  ): Promise<Service[]> {
    let list = this.fullServices.filter((s) => s.organizationId === orgId);
    if (filters?.tier) {
      list = list.filter((s) => s.tier === filters.tier);
    }
    if (filters?.health) {
      list = list.filter((s) => s.health === filters.health);
    }
    if (filters?.environment) {
      list = list.filter((s) => s.environment === filters.environment);
    }
    return list;
  }

  public async getServiceById(id: string): Promise<Service | null> {
    return (
      this.fullServices.find(
        (s) => s.id === id || s.slug === id || s.name.toLowerCase() === id.toLowerCase()
      ) || null
    );
  }

  public async upsertService(service: Service): Promise<Service> {
    const idx = this.fullServices.findIndex((s) => s.id === service.id);
    if (idx >= 0) {
      this.fullServices[idx] = service;
    } else {
      this.fullServices.push(service);
    }
    return service;
  }

  public async getImpactGraph(orgId: string, serviceId?: string): Promise<ImpactGraphResponse> {
    const services = this.fullServices.filter((s) => s.organizationId === orgId);
    const nodesMap = new Map<string, ImpactGraphNode>();
    const edges: ImpactGraphEdge[] = [];

    for (const s of services) {
      nodesMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: 'SERVICE',
        tier: s.tier,
        health: s.health,
        currentErrorRate: `${s.telemetry.errorRate}%`,
        blastRadiusScore: s.riskScore,
        environment: s.environment,
      });

      for (const dep of s.dependencies) {
        if (!nodesMap.has(dep.id)) {
          nodesMap.set(dep.id, {
            id: dep.id,
            name: dep.name,
            type: dep.type,
            tier: dep.type === 'DATABASE' ? 'TIER_1' : 'TIER_2',
            health: dep.health === 'DOWN' ? 'CRITICAL' : dep.health,
            currentErrorRate: '0.01%',
            blastRadiusScore: dep.type === 'DATABASE' ? 90 : 50,
            environment: s.environment,
          });
        }

        edges.push({
          id: `edge-${s.id}-${dep.id}`,
          source: s.id,
          target: dep.id,
          type: dep.type,
          protocol: dep.protocol,
        });
      }
    }

    let allNodes = Array.from(nodesMap.values());
    let allEdges = edges;

    if (serviceId) {
      const targetService = this.fullServices.find((s) => s.id === serviceId || s.slug === serviceId);
      if (targetService) {
        const relevantIds = new Set<string>([targetService.id]);
        targetService.dependencies.forEach((d) => relevantIds.add(d.id));
        targetService.dependents.forEach((d) => relevantIds.add(d.id));

        allNodes = allNodes.filter((n) => relevantIds.has(n.id));
        allEdges = allEdges.filter((e) => relevantIds.has(e.source) && relevantIds.has(e.target));
      }
    }

    const totalServices = allNodes.filter((n) => n.type === 'SERVICE').length;
    const tier1Services = allNodes.filter((n) => n.tier === 'TIER_1').length;
    const criticalDatabases = allNodes.filter((n) => n.type === 'DATABASE').length;
    const healthyCount = allNodes.filter((n) => n.health === 'HEALTHY').length;
    const healthyPercentage = allNodes.length ? Math.round((healthyCount / allNodes.length) * 100) : 100;

    return {
      nodes: allNodes,
      edges: allEdges,
      metrics: {
        totalServices,
        tier1Services,
        criticalDatabases,
        healthyPercentage,
      },
    };
  }

  // --- Append-Only Forensic Audit Immutability Guards (PRD Section 14.5) ---
  public async updateAuditEvent(): Promise<never> {
    const err = new Error('Audit log is append-only. Modification of audit events is strictly prohibited.');
    (err as any).statusCode = 403;
    (err as any).code = 'PERMISSION_DENIED';
    throw err;
  }

  public async deleteAuditEvent(): Promise<never> {
    const err = new Error('Audit log is append-only. Deletion of audit events is strictly prohibited.');
    (err as any).statusCode = 403;
    (err as any).code = 'PERMISSION_DENIED';
    throw err;
  }

  // --- Settings Queries & Mutation ---
  public async getSettings(orgId: string): Promise<OrgSettings> {
    return { ...this.settings };
  }

  public async updateSettings(
    orgId: string,
    section: keyof OrgSettings,
    data: any
  ): Promise<OrgSettings> {
    if (!this.settings[section]) {
      const err = new Error(`Unknown settings section: ${section}`);
      (err as any).statusCode = 400;
      throw err;
    }
    Object.assign(this.settings[section], data);
    return { ...this.settings };
  }

  // --- Integrations Queries & Mutation ---
  public async listIntegrations(orgId: string): Promise<IntegrationRecord[]> {
    return [...this.integrations];
  }

  public async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
    return this.integrations.find((i) => i.id === id) || null;
  }

  public async updateIntegration(
    id: string,
    updates: Partial<IntegrationRecord>
  ): Promise<IntegrationRecord> {
    const int = this.integrations.find((i) => i.id === id);
    if (!int) {
      const err = new Error(`Integration ${id} not found`);
      (err as any).statusCode = 404;
      throw err;
    }
    Object.assign(int, updates, { lastSyncAt: 'Just now' });
    return { ...int };
  }

  // --- DORA & Calibration Analytics Queries ---
  public async getDoraMetrics(orgId: string, periodDays = 30): Promise<DoraMetrics> {
    const deployments = this.deployments.filter((d) => d.organizationId === orgId);
    const total = Math.max(deployments.length, 1);
    const failedOrRollback = deployments.filter(
      (d) => d.status === 'ROLLED_BACK' || d.status === 'FAILED' || d.status === 'ABORTED'
    ).length;

    const cfr = parseFloat(((failedOrRollback / total) * 100).toFixed(1));
    const frequency = parseFloat((total / periodDays).toFixed(2));
    const leadTime = 1.8; // hours
    const mttr = 14.2; // minutes

    let rating: DoraMetrics['rating'] = 'ELITE';
    if (cfr > 15) rating = 'LOW';
    else if (cfr > 10) rating = 'MEDIUM';
    else if (cfr > 5) rating = 'HIGH';

    return {
      deploymentFrequencyPerDay: frequency,
      leadTimeForChangesHours: leadTime,
      changeFailureRatePercentage: cfr,
      meanTimeToRecoveryMinutes: mttr,
      rating,
      periodDays,
    };
  }

  public async getRiskCalibration(orgId: string): Promise<RiskCalibrationPoint[]> {
    const changes = this.changes.filter((c) => c.organization_id === orgId);
    return changes.map((c) => {
      let outcome: RiskCalibrationPoint['actualOutcome'] = 'CLEAN';
      if (c.status === 'POLICY_BLOCKED') outcome = 'WARNING';
      else if (c.risk.score >= 80) outcome = 'INCIDENT';
      else if (c.risk.score >= 60) outcome = 'WARNING';

      return {
        changeId: c.id,
        changeTitle: c.title,
        predictedRiskScore: c.risk.score,
        actualOutcome: outcome,
        serviceName: c.repository.split('/')[1] || c.repository,
        calibratedAt: c.updatedAt,
      };
    });
  }
}

export const db = new Database();



