import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

/**
 * The Content-Security-Policy, as a meta tag because GitHub Pages cannot set
 * response headers.
 *
 * connect-src names the two zeepler regions and nothing else. To call a
 * dedicated deployment, add its base URL here.
 *
 * Added to the BUILT page only: the dev server injects an inline script for hot
 * reload, which `script-src 'self'` would block. scripts/check-csp.mjs fails CI
 * if a build ever comes out without it.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  'connect-src https://api.zeepler.com https://api.ca.zeepler.com',
  "style-src 'self'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig({
  plugins: [react(), tailwindcss(), csp()],
  // Relative, so the build works from a GitHub Pages project path
  // (/zeepler-web-starter/) and from the root of any other host.
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
