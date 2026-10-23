# ChangeGuard Backend Architecture

AI-Native Software Reliability & Autonomous Deployment Safety Control Plane.

## Overview

The ChangeGuard backend is structured in a feature-first, layered architecture built on **Node.js**, **Fastify**, **TypeScript**, and **MongoDB** (with automatic resilient in-memory fallback).

## Architectural Principles

1. **Layered Separation of Concerns**:
   - **Routes** (`*.routes.ts`): Define HTTP endpoints, HTTP verbs, and bind preHandler middlewares and validation schemas.
   - **Controllers** (`*.controller.ts`): Handle request extraction, reply formulation, and HTTP status codes.
   - **Services** (`*.service.ts`): Contain core business logic, domain rules, and workflow orchestration.
   - **Repositories / Models** (`*.repository.ts`, `*.model.ts`): Encapsulate database interactions (MongoDB collections and fallback stores).
   - **Validators** (`*.validator.ts`): Validate incoming payloads and request parameters.
   - **Types** (`*.types.ts`): Feature-scoped domain and DTO interfaces.

2. **Resilient Dual-Persistence**:
   - When MongoDB is running (`mongodb://127.0.0.1:27017/changeguard`), the database layer connects, ensures high-performance indexes, and persists all state.
   - When MongoDB is offline or in isolated test environments, an active in-memory document store transparently handles all operations without test failure.

3. **Tamper-Evident Immutability**:
   - Forensic audit logs (`audit_logs`) are strictly append-only. Mutation or deletion requests trigger `403 IMMUTABLE_RESOURCE`.

---

## Directory Structure

```text
backend/
├── src/
│   ├── app.ts                  # Fastify application setup, plugin & route registration
│   ├── server.ts               # Server bootstrapping, port listening, graceful shutdown
│   ├── index.ts                # Root export entry point
│   │
│   ├── config/                 # Centralized configuration
│   │   ├── env.ts              # Environment variables
│   │   ├── database.ts         # MongoDB & connection options
│   │   ├── cors.ts             # CORS allowlist & methods
│   │   └── index.ts            # Central config export
│   │
│   ├── errors/                 # Standardized error handling
│   │   ├── AppError.ts         # PRD-compliant AppError class
│   │   ├── error-codes.ts      # Error constants
│   │   └── index.ts
│   │
│   ├── middleware/             # HTTP middlewares & hooks
│   │   ├── auth.middleware.ts  # JWT verification, API Key lookup, RBAC guards
│   │   ├── error.middleware.ts # Standard error response formatter
│   │   ├── not-found.middleware.ts # 404 handler
│   │   ├── rate-limit.middleware.ts # Fastify rate limiter configuration
│   │   ├── request-logger.middleware.ts # Correlation ID tracking
│   │   ├── validate.middleware.ts # Request body/param validators
│   │   └── index.ts
│   │
│   ├── modules/                # Feature-based domain modules
│   │   ├── health/             # Health and readiness probes
│   │   ├── auth/               # User authentication, JWT issuance & SAML SSO
│   │   ├── team/               # Team member management & invitations
│   │   ├── api-keys/           # Programmatic API key issuance & revocation
│   │   ├── changes/            # Pull Request / commit ingestion & risk analysis
│   │   ├── policies/           # Release guardrails, rule sets & versioning
│   │   ├── approvals/          # Two-person governance sign-offs
│   │   ├── deployments/        # Progressive canary delivery, metrics & rollback
│   │   ├── services/           # Service catalog & dependency topology
│   │   ├── incidents/          # Automated incident triggering & post-mortem RCA
│   │   ├── impact-graph/       # Blast radius dependency graph
│   │   ├── audit/              # Append-only audit logging & CSV export
│   │   ├── integrations/       # External tool connections & health probes
│   │   ├── settings/           # Organization, AI & notification settings
│   │   ├── analytics/          # DORA metrics & calibration analytics
│   │   └── webhook/            # GitHub webhook processing & signature verification
│   │
│   ├── services/               # Reusable core analytical engines
│   │   ├── argoClient.ts       # Argo Rollouts traffic management simulator
│   │   ├── prometheusClient.ts # Prometheus telemetry simulator & breach injector
│   │   ├── verificationEngine.ts # Autonomous canary telemetry evaluation
│   │   ├── blastRadius.ts      # Graph BFS blast radius score calculator
│   │   ├── riskScorer.ts       # AI risk scoring & composite weighting engine
│   │   ├── historicalSimilarity.ts # Jaccard similarity & past incident matching
│   │   ├── policyEngine.ts     # Declarative policy rule evaluation
│   │   ├── sqlHazardDetector.ts # DDL hazard classification (6 hazard classes)
│   │   ├── auditWriter.ts      # Tamper-evident audit event recorder
│   │   ├── notificationDispatcher.ts # Alert notifications
│   │   └── saml.ts             # SAML 2.0 assertion parser
│   │
│   ├── db/                     # Database access layer
│   │   ├── index.ts            # Unified DB facade with fallback memory collections
│   │   ├── mongo.ts            # Native MongoDB client connection & index manager
│   │   └── seed.ts             # Database seeding script
│   │
│   ├── types/                  # TypeScript interfaces & types
│   │   ├── shared.ts           # Shared frontend/backend domain models
│   │   ├── fastify.d.ts        # Fastify request user augmentation
│   │   └── index.ts
│   │
│   ├── utils/                  # Reusable utilities
│   │   ├── api-response.ts     # Standardized JSON response formatters
│   │   ├── async-handler.ts    # Async wrapper helper
│   │   └── index.ts
│   │
│   └── tests/                  # Integration & unit test suites
│       ├── complete14StepDemo.test.ts # End-to-end 14-step demo verification
│       └── mongo.test.ts       # MongoDB persistence & immutability test
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment settings:
- `PORT=3000`
- `HOST=0.0.0.0`
- `NODE_ENV=development`
- `MONGODB_URI=mongodb://127.0.0.1:27017/changeguard`
- `MONGODB_DB_NAME=changeguard`
- `JWT_SECRET=changeguard_super_secret_jwt_key_at_least_32_characters_long`
- `CORS_ORIGIN=http://localhost:5173`

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm start
```

### 5. Run Test Suite

```bash
npm test
```

Runs all tests using Node.js native test runner and `tsx`.
