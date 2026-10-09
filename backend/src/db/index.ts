import pg from 'pg';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { ServiceNode, DependencyEdge } from '../services/blastRadius.js';
import { HistoricalRecord } from '../services/historicalSimilarity.js';

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
  };
  filesChangedCount: number;
  additions: number;
  deletions: number;
  status:
    | 'AWAITING_REVIEW'
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

    // Services Catalog Seed
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

    // Seed default change: PR #1824
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

  public async approveChange(id: string, approverId: string, orgId: string): Promise<DbChange | null> {
    const change = await this.getChangeById(id, orgId);
    if (!change) return null;
    change.status = 'APPROVED';
    change.policyRecommendation.approvedBy = approverId;
    change.policyRecommendation.approvedAt = new Date().toISOString();
    change.updatedAt = new Date().toISOString();
    return change;
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
}

export const db = new Database();
