import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  webServer: {
    command: 'npm run dev -- --port 5183',
    port: 5183,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5183',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
