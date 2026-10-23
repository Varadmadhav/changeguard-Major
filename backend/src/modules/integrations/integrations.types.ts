import { IntegrationRecord } from '../../types/shared.js';

export type IntegrationItem = IntegrationRecord;

export interface TestIntegrationResult {
  connected: boolean;
  status: string;
  latencyMs: number;
  message: string;
}
