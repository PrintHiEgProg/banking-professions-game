// Superset за HTTPS-прокси (Caddy): гость видит дашборд; admin входит по форме и остаётся на https
import { chromium } from 'playwright';
const base = process.argv[2] || 'https://localhost';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${base}/superset/dashboard/professii-hr/?standalone=1`);
await page.waitForSelector('.dashboard-component-chart-holder', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(10000);
const guest = await page.evaluate(() => ({
  charts: document.querySelectorAll('.dashboard-component-chart-holder').length,
  numbers: [...document.querySelectorAll('.header-line')].map((e) => e.textContent.trim()).slice(0, 4),
  errors: document.querySelectorAll('.alert-danger, [data-test="error-message"], .ant-alert-error').length,
}));
console.log('guest', JSON.stringify(guest));
await page.goto(`${base}/login/`);
await page.fill('#username', 'admin');
await page.fill('#password', 'admin');
await Promise.all([page.waitForNavigation(), page.click('input[type=submit], button[type=submit]')]);
await page.waitForTimeout(1500);
const me = await page.evaluate(async () => (await fetch('/api/v1/me/')).status);
console.log('admin', page.url(), 'me', me);
await browser.close();
