import { config } from './env.js';

export interface CorsConfig {
  origin: (string | RegExp)[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export const corsConfig: CorsConfig = {
  origin: [
    config.corsOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
};
