import { MongoClient, Db, Collection, IndexSpecification } from 'mongodb';
import { config } from '../config/env.js';
import type {
  AuditEvent,
  Deployment,
  Incident,
  Service,
  Policy,
  OrgSettings,
  IntegrationRecord,
} from '../types/shared.js';
import type { DbUser, DbApiKey, DbChange, DbOrganization } from './index.js';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let isConnecting = false;

export async function connectMongo(): Promise<Db | null> {
  if (db && isConnected) {
    return db;
  }
  if (isConnecting) {
    return null;
  }

  isConnecting = true;
  try {
    const uri = config.mongodbUri;
    const dbName = config.mongodbDbName;

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`[MongoDB] Connected to database '${dbName}' at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    // Ensure indexes for fast lookups & unique constraints
    await initializeIndexes(db);

    return db;
  } catch (err) {
    console.warn(
      `[MongoDB] Direct connection to MongoDB failed (${(err as Error).message}). Using active in-memory document store.`
    );
    isConnected = false;
    db = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

async function initializeIndexes(database: Db): Promise<void> {
  try {
    // 1. Audit Logs (fast forensic timeline & filtering)
    await database.collection('audit_logs').createIndexes([
      { key: { timestamp: -1 }, name: 'idx_audit_timestamp' },
      { key: { 'resource.id': 1 }, name: 'idx_audit_resource_id' },
      { key: { action: 1 }, name: 'idx_audit_action' },
      { key: { source: 1 }, name: 'idx_audit_source' },
    ]);

    // 2. Incidents (lookups by ID, code, status)
    await database.collection('incidents').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_incidents_id' },
      { key: { code: 1 }, name: 'idx_incidents_code' },
      { key: { status: 1 }, name: 'idx_incidents_status' },
      { key: { startedAt: -1 }, name: 'idx_incidents_started' },
    ]);

    // 3. Deployments (progressive rollout & active monitoring)
    await database.collection('deployments').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_deployments_id' },
      { key: { serviceId: 1 }, name: 'idx_deployments_service_id' },
      { key: { status: 1 }, name: 'idx_deployments_status' },
    ]);

    // 4. Services (microservice catalog & SLAs)
    await database.collection('services').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_services_id' },
      { key: { slug: 1 }, name: 'idx_services_slug' },
      { key: { tier: 1 }, name: 'idx_services_tier' },
    ]);

    // 5. Policies (release guardrails)
    await database.collection('policies').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_policies_id' },
      { key: { status: 1 }, name: 'idx_policies_status' },
    ]);

    // 6. Changes (PR & commit risk intelligence)
    await database.collection('changes').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_changes_id' },
      { key: { number: 1 }, name: 'idx_changes_number' },
      { key: { status: 1 }, name: 'idx_changes_status' },
    ]);

    // 7. Integrations (third-party connectors)
    await database.collection('integrations').createIndexes([
      { key: { id: 1 }, unique: true, name: 'idx_integrations_id' },
      { key: { status: 1 }, name: 'idx_integrations_status' },
    ]);

    // 8. Settings (organization-scoped configuration)
    await database.collection('settings').createIndexes([
      { key: { organization_id: 1 }, unique: true, name: 'idx_settings_org_id' },
    ]);

    // 9. Users & RBAC
    await database.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, name: 'idx_users_email' },
      { key: { id: 1 }, unique: true, name: 'idx_users_id' },
    ]);

    // 10. API Keys
    await database.collection('api_keys').createIndexes([
      { key: { key_prefix: 1, key_hash: 1 }, name: 'idx_api_keys_lookup' },
      { key: { id: 1 }, unique: true, name: 'idx_api_keys_id' },
    ]);
  } catch (err) {
    console.warn('[MongoDB] Index creation warning:', (err as Error).message);
  }
}

export function isMongoConnected(): boolean {
  return isConnected && db !== null;
}

export function getMongoDb(): Db | null {
  return db;
}

export function getMongoClient(): MongoClient | null {
  return client;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    try {
      await client.close();
    } catch {
      // ignore close errors
    } finally {
      client = null;
      db = null;
      isConnected = false;
    }
  }
}

// Typed Collection Accessors
export function getAuditCollection(): Collection<AuditEvent> | null {
  return db ? db.collection<AuditEvent>('audit_logs') : null;
}

export function getIncidentsCollection(): Collection<Incident> | null {
  return db ? db.collection<Incident>('incidents') : null;
}

export function getDeploymentsCollection(): Collection<Deployment> | null {
  return db ? db.collection<Deployment>('deployments') : null;
}

export function getServicesCollection(): Collection<Service> | null {
  return db ? db.collection<Service>('services') : null;
}

export function getPoliciesCollection(): Collection<Policy> | null {
  return db ? db.collection<Policy>('policies') : null;
}

export function getChangesCollection(): Collection<DbChange> | null {
  return db ? db.collection<DbChange>('changes') : null;
}

export function getIntegrationsCollection(): Collection<IntegrationRecord> | null {
  return db ? db.collection<IntegrationRecord>('integrations') : null;
}

export function getSettingsCollection(): Collection<{ organization_id: string; settings: OrgSettings }> | null {
  return db ? db.collection<{ organization_id: string; settings: OrgSettings }>('settings') : null;
}

export function getUsersCollection(): Collection<DbUser> | null {
  return db ? db.collection<DbUser>('users') : null;
}

export function getApiKeysCollection(): Collection<DbApiKey> | null {
  return db ? db.collection<DbApiKey>('api_keys') : null;
}
