import { expect, test } from '@playwright/test';
import { FIELDS } from '../src/label/definition';

const apiKey = process.env.ZEEPLER_API_KEY ?? '';
const region = process.env.ZEEPLER_REGION === 'ca' ? 'Canada' : 'United States';

test.skip(!apiKey, 'Set ZEEPLER_API_KEY to a real key to run the release check.');

test('the live demo connects, and generates the example bin label', async ({ page }) => {
  // scripts/check-csp.mjs checks the CSP in the build; this checks the copy
  // GitHub Pages actually serves.
  const response = await page.goto('./');
  expect(response?.ok()).toBe(true);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    /connect-src https:\/\/api\.zeepler\.com https:\/\/api\.ca\.zeepler\.com;/,
  );

  // ⚠️ A failed fill's error carries the value it was typing, and Playwright
  // prints it and writes it to test-results/. Replace it with one that does not.
  try {
    await page.getByLabel('API key').fill(apiKey);
  } catch {
    throw new Error('Could not type the key into the API key input.');
  }
  await page.getByRole('radio', { name: region }).check();
  await page.getByRole('button', { name: 'Save key' }).click();

  await page.getByRole('button', { name: 'Test connection' }).click();
  const account = page.getByRole('region', { name: 'Account' }).getByRole('status');
  await expect(account).toHaveText(/^Connected\. Plan: .+\. \d+ (of \d+ free )?labels/, {
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Generate ZPL' }).click();
  const zpl = page.getByLabel('ZPL', { exact: true });
  await expect(zpl).toHaveValue(/^\^XA[\s\S]*\^XZ\s*$/, { timeout: 15_000 });

  // Each field is on the label, in the form it is printed (Qty 100, not 100,
  // which the description already holds). The examples hold none of ^, ~ or _,
  // which the API hex-escapes under ^FH, so each appears in the ZPL as written.
  const text = await zpl.inputValue();
  for (const field of FIELDS) {
    expect(text).toContain(field.toData ? field.toData(field.example) : field.example);
  }
});
