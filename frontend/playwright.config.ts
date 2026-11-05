import { defineConfig, devices } from '@playwright/test';

/**
 * Run with `npm run e2e` (it prepares the dedicated *_test database and builds the store).
 * The API runs with simulated payments (PAYMENTS_PROVIDER=fake) on its own port.
 */
const API_PORT = Number(process.env.E2E_API_PORT ?? 4100);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const WEB = `http://localhost:${WEB_PORT}`;
const databaseUrl = process.env.E2E_DATABASE_URL ?? '';

if (!/\/[^/]+_test(\?|$)/.test(databaseUrl)) {
  throw new Error(
    'E2E_DATABASE_URL must point to a database whose name ends in _test (use npm run e2e).',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'API',
      command: 'npx tsx src/server.ts',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        DATABASE_URL: databaseUrl,
        PAYMENTS_PROVIDER: 'fake',
        FRONTEND_URL: WEB,
        CORS_ORIGINS: WEB,
        PUBLIC_API_URL: `http://localhost:${API_PORT}`,
        UPLOAD_DIR: process.env.E2E_UPLOAD_DIR ?? '',
        RATE_LIMIT_LOGIN_MAX: '1000',
        RATE_LIMIT_REGISTER_MAX: '1000',
        RATE_LIMIT_CHECKOUT_MAX: '1000',
        LOG_LEVEL: 'warn',
      },
    },
    {
      name: 'Store',
      command: `npx next start -p ${WEB_PORT}`,
      url: WEB,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
