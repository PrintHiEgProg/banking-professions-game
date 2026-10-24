// Обезьянка: проходит смены профессии случайными кликами и ловит ошибки.
// node monkey.mjs <prof> [shifts=5] [diff=normal] [seed=1] [shotsPrefix]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const [prof = 'teller', shiftsArg = '5', diff = 'normal', seedArg = '1', prefix = '', startArg = '1'] = process.argv.slice(2);
const SHIFTS = Number(shiftsArg);
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Тест');
await page.click(`.diff-btn[data-diff="${diff}"]`);
await page.click('#btn-start');
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
await page.evaluate(([p, st]) => { const ps = window.__bank.progress.profs[p]; ps.unlocked = 5; ps.shift = st; window.__bank.enterRoomById(p); }, [prof, Number(startArg)]);
await page.waitForTimeout(1400);
let debriefs = 0;
const t0 = Date.now();
const seenPanels = new Set();
let clicks = 0;
while (Date.now() - t0 < 240000) {
  const state = await page.evaluate(() => {
    const wrap = document.querySelector('.screen-wrap.show .screen-card');
    const panel = document.querySelector('#overlay-root.active .panel');
    return { wrap: wrap ? wrap.className : null, panel: panel ? panel.className : null, target: window.__bank.target, mode: window.__bank.mode };
  });
  if (state.wrap) {
    if (state.wrap.includes('debrief')) {
      debriefs++;
      if (prefix) await page.screenshot({ path: `shots/${prefix}-debrief${debriefs}.png` });
      const stars = await page.evaluate(() => document.querySelectorAll('.screen-card .stars .on').length);
      console.log(`debrief ${debriefs}: stars ${stars}`);
      if (debriefs >= SHIFTS) break;
    }
    if (state.wrap.includes('summary-card-wrap')) { console.log('summary reached'); break; }
    await page.click('.screen-wrap.show .btn.primary').catch(() => {});
    await page.waitForTimeout(500);
    continue;
  }
  if (state.panel) {
    const key = state.panel.replace(/\s*show\s*/, ' ').trim();
    if (!seenPanels.has(key)) {
      seenPanels.add(key);
      await page.waitForTimeout(700);
      if (prefix) await page.screenshot({ path: `shots/${prefix}-${seenPanels.size}-${key.replace(/[^a-z0-9]+/gi, '_')}.png` });
    }
    const did = await page.evaluate(([r1, r2, r3]) => {
      const els = [...document.querySelectorAll('#overlay-root .panel button:not(:disabled), #overlay-root .panel input[type=range]')].filter((b) => b.offsetParent !== null);
      if (!els.length) return false;
      const prim = els.filter((b) => b.classList.contains('primary') || b.classList.contains('safe') || b.classList.contains('calm'));
      const pool = prim.length && r1 < 0.4 ? prim : els;
      const e = pool[Math.floor(r2 * pool.length)];
      if (e.tagName === 'INPUT') { e.value = String(Number(e.min) + r3 * (Number(e.max) - Number(e.min))); e.dispatchEvent(new Event('input', { bubbles: true })); }
      else e.click();
      return true;
    }, [rnd(), rnd(), rnd()]);
    if (did) clicks++;
    await page.waitForTimeout(120);
    continue;
  }
  if (state.target) {
    await page.evaluate(() => window.__bank.hit());
    await page.waitForTimeout(900);
    continue;
  }
  await page.waitForTimeout(300);
}
if (prefix) await page.screenshot({ path: `shots/${prefix}-end.png` });
console.log(`prof=${prof} diff=${diff} debriefs=${debriefs} clicks=${clicks} time=${Math.round((Date.now() - t0) / 1000)}s`);
console.log('panels:', [...seenPanels].join(' | '));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
