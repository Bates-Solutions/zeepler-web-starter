import { defineConfig, devices } from '@playwright/test';

/**
 * The release check: the live demo, a real key, a real label. It is run by
 * hand before a release (`npm run release-check`, see CONTRIBUTING.md), never
 * in CI, because it needs a key and each run uses one label.
 *
 * ⚠️ The key is typed into the page, so nothing that records the page or its
 * steps is turned on: no trace, screenshot or video, and the list reporter,
 * which prints test names only.
 */
export default defineConfig({
  testDir: './e2e',
  // Not *.test.ts or *.spec.ts, so Vitest never picks it up.
  testMatch: '*.live.ts',
  reporter: 'list',
  retries: 0,
  use: {
    baseURL: process.env.STARTER_URL ?? 'https://bates-solutions.github.io/zeepler-web-starter/',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
