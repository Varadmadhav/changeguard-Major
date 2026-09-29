# ChangeGuard — Complete Team Demo & Presentation Guide
> **A Step-by-Step Interactive Walkthrough for Team Members, Evaluators, and Demonstrators**

---

## 📌 1. What is ChangeGuard? (Plain-English Summary)

In software engineering today:
* **CI/CD (GitHub Actions / Jenkins)** only checks: *"Did the code compile and did unit tests pass?"*
* **Observability (Datadog / Prometheus)** only checks: *"What is happening in production right now?"*

**ChangeGuard** bridges this critical gap. It sits directly between CI/CD and Production:
> **"Given this exact code change, database migration, and dependency graph, how risky is this release, how should it be progressively deployed (e.g. 5% canary), and how do we autonomously halt traffic if errors spike?"**

---

## 🚀 2. Getting Started (Launch the App)

1. Open your terminal in the project folder and run:
   ```bash
   npm run dev
   ```
2. Open your web browser and go to: **`http://localhost:5173`**
3. Ensure your browser is in standard light mode.

---

## 🎬 3. The Complete Step-by-Step Demo Journey

Follow these exact steps to demonstrate or test the full product workflow:

---

### 🔹 STEP 1: Change Ingestion & High-Risk Alert on Dashboard
* **Where to go**: Navigate to **`/dashboard`** (Overview).
* **What you see**:
  * At the very top, a prominent orange **Critical Attention Warning Panel** highlights:
    > **HIGH RISK CHANGE: PR #1824 • acme/checkout-service**  
    > *"Optimize checkout query & persist idempotency keys"*  
    > **Risk Score: 78 / 100 HIGH • Database migration detected • 2 historical rollbacks**
  * Below it, KPI cards display **Deployment Risk (68)**, **Active Rollouts (7)**, **Blocked Changes (3)**, and **Change Failure Rate (3.8%)**.
* **Action**: Click the blue button **`[Review Change & Safety Policy]`**.
* **What this means in plain English**:
  ChangeGuard automatically ingested a GitHub Pull Request via webhook, analyzed its code diff, and calculated that this change has elevated production risk *before* anyone deployed it.

---

### 🔹 STEP 2: Deep Change Risk Assessment
* **Where to go**: You are now on **`/changes/pr-1824`**.
* **What you see**:
  * **Risk Score Panel**: Shows **78 / 100 HIGH RISK** with **91% Confidence**.
  * **4 Risk Drivers Listed**:
    1. *Database schema migration on high-throughput `checkout_orders` table.*
    2. *Transactional dependency with downstream Payment Service v3.2.*
    3. *Large code complexity (+482 lines across 17 files).*
    4. *High semantic similarity to past production rollbacks.*
  * **ChangeGuard Analysis Box**: An engineering diagnosis explaining that lock contention could cause API gateway 504 timeouts.
* **Action**: Click on any of the expandable **Granular Risk Factors** (e.g. *Database Migration Risk 91%* or *Historical Risk 72%*).
* **What this means in plain English**:
  Instead of treating all PRs the same, ChangeGuard scores the exact architectural danger of the change so engineers know where failures could happen.

---

### 🔹 STEP 3: Inspect Code Diffs & Database Lock Warning
* **Where to go**: Scroll down on **`/changes/pr-1824`** to the **Code Changes & Safety Annotation** section.
* **What you see**:
  * The **Files Changed** tab shows TypeScript diffs with green additions and red deletions.
  * Click the **Database** tab: You will see the SQL migration file:
    ```sql
    ALTER TABLE checkout_orders ADD COLUMN idempotency_key VARCHAR(64);
    CREATE UNIQUE INDEX idx_checkout_orders_idempotency ON checkout_orders (idempotency_key);
    ```
  * ChangeGuard flags an amber warning: *“Warning: Missing CONCURRENTLY modifier on table receiving 18,000 queries/sec. This will lock incoming writes.”*
* **What this means in plain English**:
  ChangeGuard doesn't just read text; it understands infrastructure hazards like unindexed table locks that frequently crash high-traffic databases.

---

### 🔹 STEP 4: Inspect Blast Radius & Historical Similarity
* **Where to go**: Look at the right column of **`/changes/pr-1824`**.
* **What you see**:
  * **Blast Radius & Potential Impact**:
    * Affected Services: **3** (*Checkout API, Payment Service, Order Service*)
    * Affected Databases: **1** (*PostgreSQL Primary Cluster*)
    * Potential Affected Users: **~18,400 concurrent shoppers**
    * Downstream Chain: `Checkout API → Payment Service → Order Service → PostgreSQL`
  * **Similar Historical Changes**:
    * Shows **PR #1682** (87% similarity) which previously failed and had to be rolled back.
* **What this means in plain English**:
  If this change breaks, ChangeGuard shows exactly who will be impacted, what upstream microservices will degrade, and reminds the team of past mistakes.

---

### 🔹 STEP 5: Approve the Recommended Release Policy
* **Where to go**: Look at the **Recommended Release Policy** card on **`/changes/pr-1824`**.
* **What you see**:
  * Recommended Strategy: **4-Stage Canary (5% → 25% → 50% → 100%)**.
  * Verification Window: **10 minutes per stage**.
  * Required Health Signals:
    * `HTTP Error Rate < 1.0%`
    * `P95 Latency < 500ms`
    * `Checkout Success Rate >= 99.0%`
* **Action**: Click the blue button **`[Approve Release Policy]`**.
* **What happens**:
  * Status updates to **`Policy Approved for Rollout`**.
  * A blue button **`[Open Deployment Control Room]`** appears at the top right. Click it.
* **What this means in plain English**:
  Because this PR is high risk, ChangeGuard refuses to release it to 100% of users immediately. It mandates a small canary exposure (5% first) and sets automated safety limits.

---

### 🔹 STEP 6: The Production Control Room (Canary In Progress)
* **Where to go**: You are now on **`/deployments/dep-checkout-284`**.
* **What you see**:
  * **Header**: `Checkout Service v2.8.4` • `PRODUCTION` • `CANARY IN PROGRESS`.
  * **Rollout Progress Bar**: Shows **42% of traffic exposed** on Stage 3.
  * **Live Health Metrics**:
    * **Error Rate**: `0.42%` (Healthy, below 1.0% threshold)
    * **P95 Latency**: `182ms` (Healthy, below 500ms limit)
    * **Throughput**: `12.8k requests/min`
    * **CPU / Memory**: `54%` / `67%`
  * **Autonomous Verification Signals**: 5 checkmarks showing all health criteria are passing.
  * **Live Telemetry Chart**: Plots live error rate and latency against red/amber policy limit lines.
* **What this means in plain English**:
  The new code is running in production, but only receiving a portion of traffic while ChangeGuard continuously tests telemetry against safety rules.

---

### 🔹 STEP 7: Simulate Telemetry Anomaly (The Core Safety Test)
* **Where to go**: Stay on **`/deployments/dep-checkout-284`**.
* **Action**:
  * Click the orange button **`[Simulate Telemetry Failure]`** (located in the dark banner or topbar).
* **What happens in real time**:
  1. **Telemetry Spikes**: Error rate jumps from `0.42%` → **`3.7%`** (breaching the `< 1.0%` policy limit). P95 latency spikes to **`840ms`**.
  2. **Automated Safety Containment**:
     * Status switches immediately from `MONITORING` → **`PAUSED`**.
     * Health badge turns **`CRITICAL (Red)`**.
     * Rollout progress is frozen at **`42%`** (preventing the remaining 58% of users from experiencing any errors).
  3. **Alerting**: The Topbar Notification Bell lights up with a critical notification:
     > *"ROLLOUT AUTOMATICALLY PAUSED: Checkout API exceeded configured error threshold (3.7% > 1.0%). Traffic held at 42%."*
* **What this means in plain English**:
  In a normal company, this bug would crash the app for 100% of users. In ChangeGuard, the Policy Engine detected the metric breach and **automatically halted the deployment in seconds without human delay**.

---

### 🔹 STEP 8: Safe 1-Click Rollback to Baseline
* **Where to go**: Stay on **`/deployments/dep-checkout-284`**.
* **Action**:
  * Under **Deployment Control Room Actions**, click the red button **`[Execute Rollback]`** (or click **`[Rollback to Baseline (v2.8.3)]`** in the banner).
  * A security dialog opens confirming target rollback revision: **v2.8.3 (Known Good Baseline)**.
  * Click **`[Rollback Deployment]`**.
* **What happens**:
  * Status updates to **`ROLLED BACK`**.
  * Live traffic drops to **`0%`**.
  * Telemetry immediately recovers to safe baseline (`0.08%` error rate, `160ms` latency).
* **What this means in plain English**:
  Traffic is instantly routed back to the previous stable software version, completely containing the blast radius.

---

### 🔹 STEP 9: Forensic Audit Trail & Postmortem Investigation
1. **View the Audit Trail (`/audit-log`)**:
   * Click **Audit Log** in the sidebar.
   * See the complete forensic timeline:
     * `Policy Engine` → `DEPLOYMENT_PAUSED` (Automated threshold breach).
     * `Alex Morgan` → `ROLLBACK_EXECUTED` (Restored v2.8.3 in 14s).
     * `Alex Morgan` → `APPROVAL_GRANTED` (PR #1824 approval).
2. **View the Incident Postmortem (`/incidents/inc-482`)**:
   * Click **Incidents** in the sidebar → Open **INC-482**.
   * View the Root Cause Analysis, peak error metrics, and blast containment summary (340 users impacted before pause vs 18,400 total).
3. **Explore the Topology Graph (`/impact-graph`)**:
   * Click **Impact Graph** in the sidebar.
   * Click on **Checkout API** or **PostgreSQL Primary** to view dependencies, callers, and risk propagation in the side inspector.

---

## 🛠️ 4. Additional Feature Modules Tour

| Feature | Route | What It Does |
|---|---|---|
| **Impact Graph** | `/impact-graph` | Visualizes multi-tier microservice dependencies, databases, queues, and gateways. Lets engineers click any node to inspect blast radius. |
| **Release Policies** | `/policies` | Policy manager. Click **`[Configure]`** to open the **Policy Editor Modal** and test adding/editing risk thresholds and rollback rules. |
| **DORA Analytics** | `/analytics` | Tracks Deployment Frequency (14.2/day), Change Failure Rate (3.8%), MTTD (4.2m), and MTTR (8.5m) with interactive charts. |
| **Integrations** | `/integrations` | Manages connectors for GitHub, Kubernetes, Argo Rollouts, Prometheus, OpenTelemetry, Slack, and Jira with configuration dialogs. |
| **Settings & RBAC** | `/settings/*` | Configure organization preferences, team roles (Admin, SRE, Developer), SAML SSO, two-person approvals, and AI risk heuristics. |
| **Command Palette** | Press `Ctrl+K` / `Cmd+K` | Instant global search across PRs, deployments, services, incidents, and navigation actions. |

---

## 💬 5. Frequently Asked Questions for Project Presentations

### Q1: "How is ChangeGuard different from GitHub Actions or Jenkins?"
> **Answer**: GitHub Actions only compiles code and runs unit tests. It does not know if production traffic will fail, does not understand database lock contention, and cannot monitor or autonomously pause canary rollouts in Kubernetes. ChangeGuard sits *after* CI and controls progressive production exposure.

### Q2: "How is ChangeGuard different from Datadog or Prometheus?"
> **Answer**: Datadog/Prometheus are passive monitoring tools that alert you *after* an outage has already broken production for everyone. ChangeGuard is an **active safety control plane** that automatically connects specific Git commits to progressive traffic stages and executes autonomous rollbacks to contain failure to small canary fractions.

### Q3: "How will this frontend connect to our real backend later?"
> **Answer**: The entire frontend uses a modular service layer (`src/services/*`). Currently, it simulates responses from mock data. When the backend team implements the REST/gRPC endpoints (`GET /api/changes`, `POST /api/deployments/:id/rollback`, etc.), we only need to update the service functions without changing any UI components.

---

## 🔄 Resetting the Demo
At any point after testing, click the **`[Reset Demo State]`** button in the Topbar to restore all mock data and metrics back to their initial state for your next presentation!
