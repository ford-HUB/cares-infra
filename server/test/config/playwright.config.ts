import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Portal validation suites on the Vite dev server; `/api/**` is stubbed, so no backend runs. */
const PORTAL_URL = process.env.PORTAL_URL ?? 'http://localhost:5173';
const SITE_DIR = path.resolve(__dirname, '../../../site');

export default defineConfig({
  testDir: path.resolve(__dirname, '..'),
  testMatch: ['app-integration-spec.ts', 'integration/**/*-integration-spec.ts'],
  outputDir: path.resolve(__dirname, '../integration/.results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: path.resolve(__dirname, '../integration/.report'), open: 'never' }]],
  use: {
    baseURL: PORTAL_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PORTAL_URL
    ? undefined
    : {
        command: 'pnpm dev --port 5173 --strictPort',
        cwd: SITE_DIR,
        url: PORTAL_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
