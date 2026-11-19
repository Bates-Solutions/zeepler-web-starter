// Runs the release check (playwright test). The key comes from the first
// argument, `npm run release-check -- zpl_...`, or else from ZEEPLER_API_KEY.
// Any further arguments go to Playwright.
//
// ⚠️ The key is never printed. It reaches Playwright through the environment,
// not its command line.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const env = { ...process.env };
if (args[0]?.startsWith('zpl_')) env.ZEEPLER_API_KEY = args.shift();
else if (args[0] && !args[0].startsWith('-')) {
  console.error('The key must start zpl_. Copy it from your zeepler dashboard.');
  process.exit(1);
}

const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'test', ...args], { stdio: 'inherit', env });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
