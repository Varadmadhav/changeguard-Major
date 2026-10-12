
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/services/canary.controller.test.ts',
      'src/services/deployment.api.test.ts',
      'src/services/deployments.state.test.ts',
      'src/services/failure.rollback.test.ts',
      'src/services/fastify.integration.test.ts',
      'src/services/ui.persistence.test.ts',
    ],

  },
});
