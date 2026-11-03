// Fails unless the built page carries the policy vite.config.ts defines, as
// the first thing in <head>, so nothing can load before it applies.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const meta = /<head>\s*<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
const required = [
  "default-src 'self'",
  "script-src 'self'",
  'connect-src https://api.zeepler.com https://api.ca.zeepler.com',
  "base-uri 'none'",
  "form-action 'none'",
];

if (!meta) {
  console.error('dist/index.html has no Content-Security-Policy meta tag at the start of <head>.');
  process.exit(1);
}
// Vite writes the quotes as &#39;, which a browser decodes before reading the policy.
const policy = meta[1].replaceAll('&#39;', "'").replaceAll('&quot;', '"');
const missing = required.filter((directive) => !policy.includes(directive));
if (missing.length) {
  console.error(`The Content-Security-Policy is missing: ${missing.join(', ')}`);
  process.exit(1);
}
if (/<script(?![^>]*\bsrc=)/.test(html)) {
  console.error('dist/index.html has an inline script, which the policy blocks.');
  process.exit(1);
}
console.log('Content-Security-Policy present.');
