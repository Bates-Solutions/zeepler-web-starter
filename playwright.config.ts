import { defineConfig, devices } from '@playwright/test';

const starterUrl = process.env.STARTER_URL ?? 'https://bates-solutions.github.io/zeepler-web-starter/';

/**
 * The release check: the live demo, a real key, a real label. It is run by
 * hand before a release (`npm run release-check`, see CONTRIBUTING.md), never
 * in CI, because it needs a key and each run uses one label.
 *
 * ⚠️ The key is typed into the page, so nothing that records the page is
 * turned on: no trace, screenshot or video. A failure still prints its error
 * and writes test-results/<test>/error-context.md, and Playwright puts the
 * arguments of a failed action in both, so the spec never lets the error from
 * typing the key reach the reporter.
 */
export default defineConfig({
  testDir: './e2e',
  // Not *.test.ts or *.spec.ts, so Vitest never picks it up.
  testMatch: '*.live.ts',
  reporter: 'list',
  retries: 0,
  use: {
    // With a trailing slash, so goto('./') stays on a project path such as /zeepler-web-starter/.
    baseURL: starterUrl.replace(/\/?$/, '/'),
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
