// Автовыбор графики: программный WebGL → «быстрая»; ручной выбор игрока не трогаем.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const [label, s] of [['авто', { sound: false }], ['старое сохранение high', { sound: false, quality: 'high' }], ['выбрал сам high', { sound: false, quality: 'high', qualityAuto: false }]]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://localhost:8765/index.html?debug');
  await page.evaluate((st) => { localStorage.clear(); localStorage.setItem('rubezh.settings.v1', JSON.stringify(st)); }, s);
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ q: window.__bank.world.quality, label: document.querySelector('#btn-quality span').textContent, saved: JSON.parse(localStorage.getItem('rubezh.settings.v1')).quality }));
  console.log(label.padEnd(24), JSON.stringify(r));
  await page.close();
}
await browser.close();
