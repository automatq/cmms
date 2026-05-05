import { defineConfig, devices } from '@playwright/test'

const baseURL =
  process.env.E2E_BASE_URL || 'https://maintek.app'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // Each test signs up a fresh user → org. After tuning the API for
  // parallel signups (numReplicas=2, UV_THREADPOOL_SIZE=16, pg pool=20),
  // 4 concurrent workers should run cleanly.
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
