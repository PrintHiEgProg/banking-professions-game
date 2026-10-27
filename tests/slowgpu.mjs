// «Слабая видеокарта»: имя видеокарты обычное, но каждый кадр тормозит ~90 мс.
// Ждём, что игра сама переключится на быструю графику и покажет подсказку.
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.addInitScript(() => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    const orig = C.prototype.getParameter;
    C.prototype.getParameter = function (p) { return p === 0x9246 ? 'ANGLE (Intel, Intel(R) HD Graphics 520 Direct3D11)' : orig.call(this, p); };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.__slow = 0;
  window.requestAnimationFrame = (cb) => raf((t) => { if (window.__slow) { const e = performance.now() + window.__slow; while (performance.now() < e); } cb(t); });
});
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
console.log('после загрузки:', await page.evaluate(() => window.__bank.world.quality));
await page.fill('#nick', 'Тест');
await page.click('#btn-start', { noWaitAfter: true });
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
await page.evaluate(() => { window.__slow = 90; });
await page.waitForFunction(() => window.__bank.world.quality === 'low', null, { timeout: 40000 }).catch(() => {});
const r = await page.evaluate(() => ({ q: window.__bank.world.quality, low: document.body.classList.contains('gfx-low'), toast: document.querySelector('#toasts .toast .toast-text')?.textContent || null, saved: JSON.parse(localStorage.getItem('rubezh.settings.v1')).quality }));
console.log('после тормозов:', JSON.stringify(r));
await page.screenshot({ path: 'shots/slowgpu.png' });
console.log(r.q === 'low' && r.low && r.toast ? 'PASS' : 'FAIL');
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
