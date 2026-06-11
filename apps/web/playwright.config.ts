import { defineConfig, devices } from '@playwright/test';
import { E2E_JWT_SECRET, API_URL } from './e2e/helpers/constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    // En local, réutilise le dev server existant (évite le conflit de .next/dev/lock).
    // En CI, démarre un serveur frais avec le secret JWT de test.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
      NEXT_PUBLIC_CLOUDFRONT_DOMAIN: 'https://test.cloudfront.net',
      JWT_ACCESS_SECRET: E2E_JWT_SECRET,
    },
  },
});
