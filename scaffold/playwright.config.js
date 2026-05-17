import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node utils/build.js && npx --yes serve dist -l 3000',
    port: 3000,
    reuseExistingServer: false,
  },
});
