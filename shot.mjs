import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME });
for (const [name, width] of [['desktop', 1100], ['phone', 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto('http://127.0.0.1:4179/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `/tmp/brand-${name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(name, 'horizontal overflow:', overflow);
}
await browser.close();
