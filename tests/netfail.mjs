// Плохая связь: первые запросы файла кабинета обрываются → игра повторяет и открывает кабинет;
// файл недоступен совсем → окно «Перезагрузить», без пустых окон. node netfail.mjs [prof=devops]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const [prof = 'devops'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const mode of (process.argv[3] ? [process.argv[3]] : ['flaky', 'down'])) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  let fails = 0;
  await page.route(new RegExp(`/js/(rooms|episodes)/${prof}\\.js`), (r) => {
    if (mode === 'down' || fails < 2) { fails++; return r.abort('internetdisconnected'); }
    return r.continue();
  });
  await page.goto('http://localhost:8765/index.html?debug');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
  await page.fill('#nick', 'Тест'); await page.click('#btn-start', { noWaitAfter: true }); await page.waitForTimeout(400); await page.click('.intro-skip'); await dismissMentor(page);
  await page.evaluate((p) => { window.__bank.enterRoomById(p); }, prof);
  await page.waitForFunction(() => document.querySelector('.screen-wrap.show .screen-card button.primary'), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ card: document.querySelector('.screen-wrap.show .screen-card')?.className, text: document.querySelector('.screen-wrap.show .screen-card')?.innerText.slice(0, 120).replace(/\s+/g, ' ') }));
  console.log(mode, 'fails', fails, JSON.stringify(r));
  await page.screenshot({ path: `shots/net-${mode}.png` });
  await page.close();
}
await browser.close();
