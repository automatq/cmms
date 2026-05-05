import { defineConfig, devices } from '@playwright/test'

const baseURL =
  process.env.E2E_BASE_URL || 'https://cmms-web-production.up.railway.app'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // Each test signs up a fresh user → org. The Railway API is on a small
  // instance and chokes on more than ~2 concurrent signups, so cap workers
  // low. Bump if/when the API moves to a larger plan.
  workers: 2,
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
