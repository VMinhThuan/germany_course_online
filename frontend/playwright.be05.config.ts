import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /be05-release\.spec\.ts$/,
  outputDir: './test-results/be05-isolated',
  // The accessibility sweep scans 37 route/viewport combinations in one test.
  timeout: 360_000,
  expect: { timeout: 20_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './playwright-report/be05-isolated', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium-be05-isolated', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:server',
      cwd: '../backend',
      url: 'http://127.0.0.1:4141/health',
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { NODE_ENV: 'test' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:4141/api/v1' },
    },
  ],
})
