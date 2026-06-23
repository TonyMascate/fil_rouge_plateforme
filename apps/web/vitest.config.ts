import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

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
    exclude: ['**/node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'app/**/login/page.tsx',
        'app/**/register/page.tsx',
        'lib/utils.ts',
        'lib/error-messages.ts',
        'lib/form-errors.ts',
        'lib/useFormMutation.ts',
        'components/ui/button.tsx',
      ],
      exclude: ['**/*.spec.*', '**/*.config.*', '**/node_modules/**'],
    },
  },
});
