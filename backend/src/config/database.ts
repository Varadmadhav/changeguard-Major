import { config } from './env.js';

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  maxPoolSize: number;
}

export const databaseConfig: DatabaseConfig = {
  uri: config.mongodbUri,
  dbName: config.mongodbDbName,
  serverSelectionTimeoutMS: 2500,
  connectTimeoutMS: 2500,
  maxPoolSize: 20,
};
