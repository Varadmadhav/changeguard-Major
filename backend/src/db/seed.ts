import { connectMongo, closeMongo, isMongoConnected, getMongoDb } from './mongo.js';
import { db } from './index.js';

async function main() {
  console.log('[ChangeGuard Seed] Connecting to MongoDB...');
  await db.isConnected();

  if (!isMongoConnected()) {
    console.error('[ChangeGuard Seed] MongoDB connection failed. Please ensure MongoDB is running.');
    process.exit(1);
  }

  const database = getMongoDb();
  if (!database) {
    console.error('[ChangeGuard Seed] No database instance found.');
    process.exit(1);
  }

  console.log('[ChangeGuard Seed] Verifying seeded collections in MongoDB:');
  const collections = [
    'audit_logs',
    'incidents',
    'deployments',
    'services',
    'policies',
    'changes',
    'integrations',
    'settings',
    'users',
    'api_keys',
  ];

  for (const name of collections) {
    const count = await database.collection(name).countDocuments();
    console.log(`  - ${name.padEnd(20)}: ${count} documents`);
  }

  console.log('[ChangeGuard Seed] Seed completed successfully.');
  await closeMongo();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[ChangeGuard Seed] Error:', err);
  await closeMongo();
  process.exit(1);
});
