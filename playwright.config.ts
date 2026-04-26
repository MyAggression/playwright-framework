import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 2,
  reporter: [['html'], ['list']],

  globalTimeout: 10 * 60 * 1000,
  timeout: 30 * 1000,

  use: {
    baseURL: process.env.BASE_URL ?? 'https://the-internet.herokuapp.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  expect: {
    timeout: 10 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
