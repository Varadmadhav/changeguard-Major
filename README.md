# ChangeGuard
> **AI-Native Software Reliability & Autonomous Deployment Safety Control Plane**

ChangeGuard is an enterprise-grade software-change safety and progressive deployment control platform. It sits conceptually between continuous integration (CI/CD) and production observability, answering the critical question:

> *"Given this exact software change, the current system state, and historical behavior, how safely should this change be released?"*

---

## 1. The Core Problem & Philosophy

* **Traditional CI/CD** answers: *"Did the build and unit tests pass?"*
* **Observability (APM / OpenTelemetry)** answers: *"What is happening in production right now?"*
* **ChangeGuard** answers: *"What is the blast radius and failure probability of this exact commit, what canary release policy should be mandated, and how do we autonomously contain incidents before users are impacted?"*

```
Developer / AI Coding Agent
            ↓
      GitHub PR / Commit
            ↓
      ChangeGuard Ingestion
            ↓
       Change Analysis
            ↓
     Change Impact Analysis (Blast Radius)
            ↓
        Risk Engine (0-100 Score & Explanations)
            ↓
       Release Policy (Canary 5% → 25% → 50% → 100%)
            ↓
     Canary / Staged Rollout (Argo Rollouts)
            ↓
      Production Telemetry (Prometheus / OTel)
            ↓
    Verification Engine (Signal Threshold Evaluation)
            ↓
    ┌────────┴────────┐
    ↓                 ↓
 PROMOTE          PAUSE / ROLLBACK
    ↓                 ↓
 100% Traffic    Failure Contained (< 5% Blast Radius)
            ↓
      Outcome History & Learning Loop
```

---

## 2. Design System & UX Standards

ChangeGuard is engineered with a **Light-Mode-Only** enterprise developer infrastructure aesthetic, drawing inspiration from high-reliability platforms like Linear, Stripe, and Vercel:

* **Background**: `#F8F9FB`
* **Surfaces**: `#FFFFFF` (Primary), `#F4F5F7` (Secondary Subtle)
* **Borders**: `#E4E7EC` (Subtle), `#D0D5DD` (Strong)
* **Brand Primary**: `#2563EB` (ChangeGuard Blue)
* **Semantic Risk Tokens**:
  * **LOW**: Green (`#16A34A` / `bg-emerald-50`)
  * **MEDIUM**: Amber (`#D97706` / `bg-amber-50`)
  * **HIGH**: Orange (`#EA580C` / `bg-orange-50`)
  * **CRITICAL**: Red (`#DC2626` / `bg-rose-50`)
* **Typography**: Clean sans-serif (`Inter`) with monospace (`JetBrains Mono`) for commits, hashes, latencies, error percentages, and SQL DDL diffs.

---

## 3. Tech Stack

* **Framework**: React 18 + TypeScript (Strict)
* **Build Tooling**: Vite 6
* **Styling**: Tailwind CSS 3
* **Routing**: React Router DOM v6
* **Visualizations & Charts**: Recharts
* **Icons**: Lucide React
* **State & Simulation Engine**: React Context + Service Layer Architecture

---

## 4. Project Structure

```
src/
├── components/
│   ├── layout/            # AppShell, Sidebar, Topbar, Breadcrumbs, CommandPalette, NotificationCenter
│   ├── common/            # Badge, RiskBadge, StatusBadge, Button, Modal, ConfirmDialog, Tabs, SearchInput, Skeleton
│   ├── dashboard/         # MetricCard, AttentionPanel, DeploymentSafetyChart, HealthOverview, ActiveRolloutsTable, RecentChangesList
│   ├── changes/           # ChangeTable, ChangeFilters, RiskScorePanel, RiskFactorsList, ChangeGuardAnalysis, ChangeImpactView, DiffViewer, HistoricalSimilarity, ReleasePolicyCard
│   ├── deployments/       # DeploymentTable, RolloutProgressBar, TelemetryCards, VerificationSignals, DeploymentTimeline, DeploymentActions, LiveTelemetryChart, SimulateFailureBanner
│   ├── services/          # ServiceTable, ServiceDependencies
│   ├── incidents/         # IncidentTable
│   ├── graph/             # ImpactGraph, GraphInspector
│   ├── policies/          # PolicyCard, PolicyEditorModal
│   ├── analytics/         # DoraMetricsRow, AnalyticsCharts
│   ├── integrations/      # IntegrationCard, IntegrationConfigModal
│   └── settings/          # SettingsLayout
├── pages/
│   ├── Dashboard/         # Command center overview & KPI summary
│   ├── Changes/           # Ingested changes list & filters
│   ├── ChangeDetail/      # Deep change risk analysis, AST diff, blast radius & release policy
│   ├── Deployments/       # Active and past canary delivery pipelines
│   ├── DeploymentDetail/  # Production Control Room with live telemetry & autonomous actions
│   ├── Services/          # Microservice catalog & reliability SLAs
│   ├── ServiceDetail/     # Topology, dependencies & incident history
│   ├── Incidents/         # Real-time incidents & postmortems
│   ├── IncidentDetail/    # Root-cause analysis, mitigation timeline & linked entities
│   ├── ImpactGraph/       # Interactive SVG multi-tier blast radius dependency graph
│   ├── Policies/          # Production safety policies & interactive rule editor
│   ├── Analytics/         # DORA metrics, risk calibration & service failure rates
│   ├── Integrations/      # GitHub, Kubernetes, Argo Rollouts, Prometheus, OTel, Slack
│   ├── AuditLog/          # Immutable trace of operator and autonomous controller actions
│   └── Settings/          # General, Team & RBAC, Security, Environments, Notifications, AI
├── context/
│   └── SimulationContext.tsx # Live demo state manager (error injection, pause, promote, rollback, audit trail)
├── data/                  # Strongly typed mock datasets
├── services/              # Clean API abstraction layer (ready for REST/gRPC backend replacement)
├── types/                 # TypeScript interfaces for all domain models
├── hooks/                 # Custom reusable data hooks
├── utils/                 # Formatters, color mappers, and Tailwind class merge utilities
├── routes/
│   └── AppRoutes.tsx      # Application routing matrix
├── App.tsx
└── main.tsx
```

---

## 5. Complete Application Route Matrix

| Route | Description |
|---|---|
| `/dashboard` | Executive command center with KPI row, 30-day velocity chart, and critical attention alert |
| `/changes` | Software changes list with filters (Pull Requests, Commits, Infra, AI-Generated, Blocked) |
| `/changes/:id` | Change intelligence with 78/100 risk score, DDL diff viewer, blast radius, and policy recommendation |
| `/deployments` | Progressive delivery pipelines (Active, Completed, Rolled Back, Failed) |
| `/deployments/:id` | Production Control Room with live canary stages (5%→25%→50%→100%), telemetry charts, and actions |
| `/services` | Microservice catalog with uptime SLAs, owners, and active deployment states |
| `/services/:id` | Service deep dive with upstream callers, downstream databases, and incident history |
| `/incidents` | Production incidents, containment status, and blast radius metrics |
| `/incidents/:id` | Incident postmortem with root cause analysis, timeline, and linked PR/Deployment entities |
| `/impact-graph` | Interactive topology graph with node inspector and high-risk propagation highlight |
| `/policies` | Release guardrail policies and interactive rule threshold editor modal |
| `/analytics` | DORA metrics (Deployment frequency, MTTR, MTTD, CFR) and risk score calibration |
| `/integrations` | Connector status & configuration for GitHub, Argo Rollouts, Kubernetes, Prometheus, Slack |
| `/audit-log` | Comprehensive audit trail of all manual signoffs and autonomous safety enforcements |
| `/settings/general` | Organization identity, default environment, and light theme configuration |
| `/settings/team` | Team members and role-based access control (Admin, Platform Eng, SRE, Developer) |
| `/settings/security` | Single Sign-On (SAML/Okta), two-person approval gates, and API key management |
| `/settings/environments` | Kubernetes cluster bindings (Production, Staging, Dev) |
| `/settings/notifications`| Notification rules and webhook dispatch toggles |
| `/settings/ai` | Risk engine heuristics, similarity embedding models, and zero-data-retention isolation |

---

## 6. Team Major Project Module Ownership

To cleanly divide development among team members, the architecture is separated into 5 clear domains sharing a unified type and service contract:

### 👤 Member 1 — Application Shell, Dashboard & Global Experience
* **Modules**: `src/components/layout/*`, `src/pages/Dashboard/*`, `src/context/*`, `src/components/common/*`
* **Key Deliverables**: App shell, Command Palette (`Ctrl+K`/`Cmd+K`), notification center, global breadcrumbs, top-level KPI metrics, and 30-day velocity visualization.

### 👤 Member 2 — Change Intelligence & Release Policy Engine
* **Modules**: `src/pages/Changes/*`, `src/pages/ChangeDetail/*`, `src/components/changes/*`, `src/services/changes.service.ts`
* **Key Deliverables**: PR ingestion view, 0-100 deterministic risk scoring, granular risk factors, code AST diff viewer with database DDL warnings, historical similarity matching, and recommended canary release policies.

### 👤 Member 3 — Progressive Delivery & Deployment Control Room
* **Modules**: `src/pages/Deployments/*`, `src/pages/DeploymentDetail/*`, `src/components/deployments/*`, `src/services/deployments.service.ts`
* **Key Deliverables**: Production Control Room, live canary progression (5%→25%→50%→100%), real-time telemetry threshold verification charts, and operator action dialogs (Promote, Pause, Rollback, Abort).

### 👤 Member 4 — Reliability Engineering, Topology & Incidents
* **Modules**: `src/pages/Services/*`, `src/pages/Incidents/*`, `src/pages/ImpactGraph/*`, `src/components/graph/*`, `src/components/services/*`, `src/components/incidents/*`
* **Key Deliverables**: Interactive SVG service topology graph with real-time risk propagation, microservice registry, and incident root cause analysis postmortems.

### 👤 Member 5 — Platform Governance, Policies, Integrations & Audit
* **Modules**: `src/pages/Policies/*`, `src/pages/Analytics/*`, `src/pages/Integrations/*`, `src/pages/AuditLog/*`, `src/pages/Settings/*`, `src/services/policies.service.ts`
* **Key Deliverables**: Policy threshold editor modal, DORA & calibration analytics, connector configuration modals, immutable audit logging, and team settings.

---

## 7. Interactive Demo User Journey (Presentation Script)

ChangeGuard includes a built-in **Presentation Simulation Controller** to prove the full product lifecycle:

1. **Step 1 — Ingestion**: Open `/dashboard`. Notice the **Critical Attention Alert** flagging `PR #1824` (High Risk 78/100, Database migration detected).
2. **Step 2 — Risk Analysis**: Click **Review Change & Safety Policy**. On `/changes/pr-1824`, inspect the 78/100 risk score, DDL migration diff (missing `CONCURRENTLY`), and the downstream blast radius (~18,400 potential users across 3 services).
3. **Step 3 — Policy Approval**: Click **Approve Release Policy** to mandate the 4-stage Canary (5% → 25% → 50% → 100%).
4. **Step 4 — Control Room**: Navigate to `/deployments/dep-checkout-284`. Observe the canary in progress at 42% traffic with normal telemetry (Error Rate 0.42%, P95 Latency 182ms).
5. **Step 5 — Failure Injection**: Click the **Simulate Failure Scenario** button in the Topbar or banner.
6. **Step 6 — Autonomous Containment**: Watch the error rate spike from `0.42%` → `3.7%`. The ChangeGuard Policy Engine immediately halts the canary, switching status from `MONITORING` → `PAUSED`, while dispatching an instant alert notification.
7. **Step 7 — Operator Rollback**: Click **Execute Rollback**. Confirm the rollback dialog to revert traffic to baseline version `v2.8.3`.
8. **Step 8 — Audit Log**: Open `/audit-log`. Notice the complete, timestamped forensic record of the automated pause and operator rollback.

---

## 8. Future Backend API Contracts

The frontend service layer (`src/services/*`) is designed to map directly to real backend endpoints without requiring UI refactoring:

```typescript
// Change Analysis APIs
POST   /api/changes/analyze           // Ingest GitHub webhook & trigger ML risk model
GET    /api/changes                   // Retrieve scored PRs & commits
GET    /api/changes/:id               // Retrieve risk breakdown, diffs & policy recommendations

// Progressive Delivery & Rollout Controller APIs
GET    /api/deployments               // Query Argo Rollouts status
GET    /api/deployments/:id           // Query live telemetry & verification signals
POST   /api/deployments/:id/promote   // Advance canary traffic percentage
POST   /api/deployments/:id/pause     // Halt traffic progression
POST   /api/deployments/:id/rollback  // Revert pods to baseline image

// Topology & Reliability APIs
GET    /api/services                  // Query service registry & uptime
GET    /api/impact-graph              // Query OTel distributed dependency graph
GET    /api/incidents                 // Query active and resolved incident records

// Governance APIs
GET    /api/policies                  // Retrieve active guardrail policies
POST   /api/policies                  // Create or update safety rules
GET    /api/analytics                 // Retrieve DORA metrics & risk calibration curves
GET    /api/audit-log                 // Query immutable audit events
GET    /api/integrations              // Query connection status of VCS & clusters
```

---

## 9. Running Locally

### Prerequisites
* Node.js v18+ or v22+
* npm, yarn, or pnpm

### Installation & Development

```bash
# Clone the repository
git clone <repo-url>
cd changeguard

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Compile TypeScript and bundle for production
npm run build

# Preview production build locally
npm run preview
```

---

## 10. License

Built for university major project presentation and enterprise software-change safety research.
