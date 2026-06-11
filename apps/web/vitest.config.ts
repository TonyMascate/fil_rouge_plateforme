import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Reproduit l'alias "@/*" du tsconfig.json de Next.js
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['components/**', 'lib/**', 'app/**'],
      exclude: [
        '**/*.spec.*',
        '**/*.config.*',
        'lib/auth.ts',       // server-only, ne tourne pas en jsdom
        'lib/pricing-data.ts',
        '**/node_modules/**',
      ],
    },
  },
});
