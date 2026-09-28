import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://www.liverpool.com.mx';
const isCI = !!process.env.CI;
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 2 : undefined,
  timeout: isCI ? 120_000 : 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isCI
    ? [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['list'],
        ['github'],
      ]
    : [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['list'],
      ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: DESKTOP_VIEWPORT,
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: DESKTOP_VIEWPORT } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: DESKTOP_VIEWPORT } },
  ],
});