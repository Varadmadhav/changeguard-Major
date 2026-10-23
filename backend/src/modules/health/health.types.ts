export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadyStatus {
  status: 'ready' | 'not_ready';
  database: 'mongodb_connected' | 'memory_fallback_active';
  timestamp: string;
}
