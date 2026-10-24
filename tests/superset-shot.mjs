// Скриншот дашборда Superset + проверка, что ни один график не упал
import { chromium } from 'playwright';
const [base = 'http://127.0.0.1:8088', out = 'shots/superset-dashboard.png'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`${base}/login/`);
await page.fill('#username', 'admin');
await page.fill('#password', 'admin');
await Promise.all([page.waitForNavigation(), page.click('[type=submit]')]);
await page.goto(`${base}/superset/dashboard/professii-hr/?standalone=1`);
await page.waitForSelector('.dashboard-component-chart-holder', { timeout: 60000 });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => ({
  charts: document.querySelectorAll('.dashboard-component-chart-holder').length,
  errors: [...document.querySelectorAll('.alert-danger, [data-test="error-message"], .error-message, .ant-alert-error')].map((e) => e.textContent.trim().slice(0, 200)),
  loading: document.querySelectorAll('.loading').length,
  height: document.body.scrollHeight,
}));
console.log(JSON.stringify(info));
await page.setViewportSize({ width: 1440, height: Math.min(4000, info.height + 40) });
await page.waitForTimeout(3000);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
