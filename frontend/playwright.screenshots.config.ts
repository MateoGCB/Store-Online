import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * `npm run screenshots`: regenerates the README screenshots (docs/screenshots/). It reuses
 * the e2e setup (dedicated *_test database, demo mode, production build of the store) and
 * only runs e2e/screenshots.capture.ts, which `npm run e2e` never picks up.
 */
export default defineConfig({
  ...base,
  testMatch: '**/screenshots.capture.ts',
  reporter: 'list',
});
