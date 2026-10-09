-- ChangeGuard PostgreSQL Database Schema (PRD Section 9.1)
-- Recommended RDBMS: PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  role            TEXT NOT NULL CHECK (role IN ('ADMIN','PLATFORM_ENGINEER','SRE','DEVELOPER','APPROVER')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sso_subject     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL,
  key_prefix      TEXT NOT NULL,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL,
  description             TEXT,
  tier                    TEXT NOT NULL CHECK (tier IN ('TIER_1','TIER_2','TIER_3')),
  owner_team              TEXT,
  owner_lead              TEXT,
  slack_channel           TEXT,
  repository              TEXT,
  tags                    TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Service Dependencies
CREATE TABLE IF NOT EXISTS service_dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  target_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dep_type        TEXT NOT NULL CHECK (dep_type IN ('SERVICE','DATABASE','QUEUE','API_GATEWAY','CACHE','THIRD_PARTY')),
  protocol        TEXT,
  verified_at     TIMESTAMPTZ,
  UNIQUE(source_id, target_id)
);

-- Changes (PRs / Commits)
CREATE TABLE IF NOT EXISTS changes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id             TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('PULL_REQUEST','COMMIT','INFRASTRUCTURE','AI_GENERATED')),
  title                   TEXT NOT NULL,
  repository              TEXT NOT NULL,
  source_branch           TEXT,
  target_branch           TEXT,
  commit_hash             TEXT,
  author_name             TEXT,
  author_username         TEXT,
  author_email            TEXT,
  is_ai_agent             BOOLEAN DEFAULT FALSE,
  files_changed_count     INTEGER DEFAULT 0,
  additions               INTEGER DEFAULT 0,
  deletions               INTEGER DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'AWAITING_REVIEW'
                          CHECK (status IN ('AWAITING_REVIEW','APPROVED','POLICY_BLOCKED','CANARY_RECOMMENDED','DEPLOYED','REJECTED')),
  environment             TEXT CHECK (environment IN ('PRODUCTION','STAGING','DEVELOPMENT')),
  pr_url                  TEXT,
  diff_stored_key         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, repository, external_id)
);
CREATE INDEX IF NOT EXISTS idx_changes_org ON changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status);

-- Risk Analyses
CREATE TABLE IF NOT EXISTS risk_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id           UUID NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  score               SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  level               TEXT NOT NULL CHECK (level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  confidence          SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  summary             TEXT,
  overview            TEXT,
  technical_details   TEXT,
  identified_risks    TEXT[],
  recommendations     TEXT,
  model_version       TEXT,
  analyzed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_analysis_change ON risk_analyses(change_id);

-- Risk Factors
CREATE TABLE IF NOT EXISTS risk_factors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID NOT NULL REFERENCES risk_analyses(id) ON DELETE CASCADE,
  factor_key      TEXT NOT NULL,
  name            TEXT NOT NULL,
  score           SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  weight          TEXT NOT NULL CHECK (weight IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description     TEXT,
  details         TEXT[],
  sort_order      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_risk_factors_analysis ON risk_factors(analysis_id);

-- Historical Similarity Records
CREATE TABLE IF NOT EXISTS historical_similarity (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id             UUID NOT NULL REFERENCES risk_analyses(id) ON DELETE CASCADE,
  reference_change_id     UUID REFERENCES changes(id) ON DELETE SET NULL,
  reference_external_id   TEXT NOT NULL,
  reference_title         TEXT,
  repository              TEXT,
  similarity_score        SMALLINT NOT NULL CHECK (similarity_score BETWEEN 0 AND 100),
  outcome                 TEXT CHECK (outcome IN ('SUCCESSFUL','ROLLBACK','INCIDENT','PAUSED')),
  summary                 TEXT,
  reference_date          DATE
);

-- Release Policy Recommendations
CREATE TABLE IF NOT EXISTS policy_recommendations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id                 UUID NOT NULL REFERENCES risk_analyses(id) ON DELETE CASCADE,
  strategy                    TEXT NOT NULL CHECK (strategy IN ('CANARY','BLUE_GREEN','ROLLING','STAGED')),
  stages                      INTEGER[] NOT NULL,
  verification_window_minutes INTEGER NOT NULL DEFAULT 10,
  human_approval_required     BOOLEAN NOT NULL DEFAULT FALSE,
  approval_reason             TEXT,
  suggested_action            TEXT NOT NULL CHECK (suggested_action IN ('APPROVE_POLICY','MODIFY_POLICY','BLOCK')),
  approved_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at                 TIMESTAMPTZ
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  environment         TEXT NOT NULL CHECK (environment IN ('PRODUCTION','STAGING','ALL')),
  tier_scope          TEXT NOT NULL CHECK (tier_scope IN ('ALL','TIER_1_ONLY','CRITICAL_SERVICES')),
  status              TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE','DRAFT','PAUSED')),
  enforcement_mode    TEXT NOT NULL DEFAULT 'DRY_RUN' CHECK (enforcement_mode IN ('ENFORCING','DRY_RUN')),
  owner               TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Policy Rules
CREATE TABLE IF NOT EXISTS policy_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  condition_name      TEXT NOT NULL,
  field               TEXT NOT NULL,
  operator            TEXT NOT NULL CHECK (operator IN ('>','<','>=','<=','==','contains')),
  threshold_value     TEXT NOT NULL,
  unit                TEXT,
  action              TEXT NOT NULL CHECK (action IN (
                        'REQUIRE_HUMAN_APPROVAL','REQUIRE_CANARY','PAUSE_ROLLOUT',
                        'ROLLBACK_DEPLOYMENT','BLOCK_MERGE','RESTRICT_OFF_PEAK_ONLY')),
  action_description  TEXT,
  is_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id              UUID REFERENCES services(id) ON DELETE SET NULL,
  change_id               UUID REFERENCES changes(id) ON DELETE SET NULL,
  version                 TEXT NOT NULL,
  previous_version        TEXT,
  environment             TEXT NOT NULL CHECK (environment IN ('PRODUCTION','STAGING','DEVELOPMENT')),
  status                  TEXT NOT NULL DEFAULT 'QUEUED'
                          CHECK (status IN ('QUEUED','MONITORING','PROMOTING','PROMOTED','PAUSED','ROLLING_BACK','ROLLED_BACK','FAILED','ABORTED')),
  strategy                TEXT NOT NULL CHECK (strategy IN ('CANARY','BLUE_GREEN','ROLLING','STAGED')),
  stages                  INTEGER[] NOT NULL,
  current_stage_index     INTEGER NOT NULL DEFAULT 0,
  current_traffic_pct     SMALLINT NOT NULL DEFAULT 0 CHECK (current_traffic_pct BETWEEN 0 AND 100),
  target_traffic_pct      SMALLINT NOT NULL DEFAULT 0 CHECK (target_traffic_pct BETWEEN 0 AND 100),
  health                  TEXT NOT NULL DEFAULT 'HEALTHY'
                          CHECK (health IN ('HEALTHY','WARNING','DEGRADED','CRITICAL')),
  risk_score              SMALLINT,
  risk_level              TEXT,
  paused_reason           TEXT,
  rollback_reason         TEXT,
  argo_rollout_name       TEXT,
  argo_namespace          TEXT,
  baseline_revision       TEXT,
  canary_revision         TEXT,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  optimistic_lock_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_deployments_org ON deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_service ON deployments(service_id);

-- Verification Signals
CREATE TABLE IF NOT EXISTS verification_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id   UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  metric_key      TEXT NOT NULL,
  promql          TEXT,
  operator        TEXT NOT NULL CHECK (operator IN ('>','<','>=','<=')),
  threshold       NUMERIC NOT NULL,
  unit            TEXT,
  status          TEXT NOT NULL DEFAULT 'PASSED' CHECK (status IN ('PASSED','WARNING','FAILED')),
  current_value   NUMERIC,
  evaluated_at    TIMESTAMPTZ
);

-- Telemetry Snapshots
CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id       UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_rate          NUMERIC(6,3),
  p95_latency_ms      NUMERIC(10,2),
  requests_per_min    INTEGER,
  cpu_utilization     NUMERIC(5,2),
  memory_utilization  NUMERIC(5,2),
  traffic_pct         SMALLINT
);
CREATE INDEX IF NOT EXISTS idx_telemetry_deployment ON telemetry_snapshots(deployment_id, captured_at DESC);

-- Deployment Timeline Events
CREATE TABLE IF NOT EXISTS deployment_timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id   UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL CHECK (event_type IN ('INFO','SUCCESS','WARNING','DANGER','SYSTEM')),
  actor           TEXT,
  metadata        JSONB
);
CREATE INDEX IF NOT EXISTS idx_timeline_deployment ON deployment_timeline_events(deployment_id, occurred_at DESC);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                      TEXT NOT NULL,
  title                     TEXT NOT NULL,
  severity                  TEXT NOT NULL CHECK (severity IN ('SEV-1','SEV-2','SEV-3','SEV-4')),
  status                    TEXT NOT NULL DEFAULT 'TRIGGERED'
                            CHECK (status IN ('TRIGGERED','INVESTIGATING','MITIGATING','CONTAINED','RESOLVED')),
  related_deployment_id     UUID REFERENCES deployments(id) ON DELETE SET NULL,
  related_change_id         UUID REFERENCES changes(id) ON DELETE SET NULL,
  rca_summary               TEXT,
  rca_trigger               TEXT,
  rca_contained_by          TEXT,
  rca_recommendation        TEXT,
  peak_error_rate           TEXT,
  peak_p95_latency          TEXT,
  impacted_requests         INTEGER,
  impacted_users            INTEGER,
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at               TIMESTAMPTZ,
  UNIQUE(organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- Incident Timeline Items
CREATE TABLE IF NOT EXISTS incident_timeline_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title           TEXT NOT NULL,
  description     TEXT,
  actor           TEXT,
  is_automatic    BOOLEAN NOT NULL DEFAULT FALSE,
  item_type       TEXT NOT NULL CHECK (item_type IN ('TRIGGER','ACTION','MITIGATION','ROLLBACK','RESOLVE'))
);

-- Affected Services per Incident
CREATE TABLE IF NOT EXISTS incident_affected_services (
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  service_id   UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  PRIMARY KEY (incident_id, service_name)
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'DISCONNECTED'
                      CHECK (status IN ('CONNECTED','DISCONNECTED','ERROR','CONFIGURING')),
  config              JSONB NOT NULL DEFAULT '{}',
  encrypted_secrets   TEXT,
  last_sync_at        TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, category, name)
);

-- Audit Events (append-only)
CREATE TABLE IF NOT EXISTS audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name      TEXT NOT NULL,
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('USER','SYSTEM','POLICY_ENGINE','AI_AGENT')),
  actor_email     TEXT,
  action          TEXT NOT NULL,
  action_title    TEXT NOT NULL,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('SERVICE','DEPLOYMENT','CHANGE','POLICY','INTEGRATION','USER','SETTING')),
  resource_id     TEXT NOT NULL,
  resource_name   TEXT NOT NULL,
  result          TEXT NOT NULL CHECK (result IN ('SUCCESS','WARNING','FAILED')),
  source          TEXT NOT NULL,
  details         TEXT,
  metadata        JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events(resource_type, resource_id);
