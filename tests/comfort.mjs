// Проверка удобств: обучения безопасности, подсказка «💡», УФ-лампа, пауза с настройками.
// node comfort.mjs <scenario> [w] [h]
//   flow | rules | call | trace | teller2 | pause
import { chromium } from 'playwright';
import fs from 'node:fs';
import { dismissMentor } from './mentor.inc.mjs';
const [scenario = 'flow', wArg = '1366', hArg = '768'] = process.argv.slice(2);
const mobile = Number(wArg) < 900;
const out = 'shots/comfort';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
const tag = `${scenario}-${wArg}`;
const shot = (n) => page.screenshot({ path: `${out}/${tag}-${n}.png` });

if (scenario === 'title') {
  await shot('title');
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  await browser.close();
  process.exit(0);
}

await page.fill('#nick', 'Тест');
await page.click('.diff-btn[data-diff="normal"]');
await page.click('#btn-start', { noWaitAfter: true });
await page.waitForTimeout(400);
await page.click('.intro-skip');
// обучение в холле закрываем — оно не про это
await dismissMentor(page);

if (scenario === 'pause') {
  await page.evaluate(() => document.querySelector('#btn-pause').click());
  await page.waitForTimeout(500);
  await shot('pause');
  const info = await page.evaluate(() => ({
    full: !document.querySelector('#p-full').classList.contains('hidden'),
    diff: document.querySelector('#p-diff').textContent,
    scroll: document.querySelector('#pause .menu-card').scrollHeight > document.querySelector('#pause .menu-card').clientHeight,
  }));
  console.log('pause', JSON.stringify(info));
  // сложность по кругу, громкость и крупный текст
  await page.click('#p-diff');
  await page.click('#p-text');
  await page.evaluate(() => { const s = document.querySelector('#p-sens'); s.value = '1.8'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
  await shot('pause-changed');
  const after = await page.evaluate(() => ({ diff: window.__bank.progress.difficulty, big: document.documentElement.classList.contains('big-text'), sens: window.__bank.controls.sensMul, saved: JSON.parse(localStorage.getItem('rubezh.settings.v1')) }));
  console.log('after', JSON.stringify(after));
  await page.click('#p-resume');
  await page.waitForTimeout(400);
  await shot('lobby-bigtext');
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  await browser.close();
  process.exit(0);
}

const map = { flow: ['security', 2, 'flow'], rules: ['security', 3, 'rules'], call: ['security', 4, 'ep2'], trace: ['security', 5, 'ep3'], teller2: ['teller', 2, 'teller'] };
const [prof, st, want] = map[scenario];
await page.evaluate(([p, s]) => { const ps = window.__bank.progress.profs[p]; ps.unlocked = 5; ps.shift = s; window.__bank.enterRoomById(p); }, [prof, st]);
await page.waitForTimeout(1400);

const seenTours = new Set();
const t0 = Date.now();
let phase = 'go';
let mistakes = 0;
let hintShot = false;
while (Date.now() - t0 < 200000) {
  const s = await page.evaluate(() => {
    const bubble = document.querySelector('#tour .tour-bubble');
    const wrap = document.querySelector('.screen-wrap.show .screen-card');
    const panel = document.querySelector('#overlay-root.active .panel');
    const help = document.querySelector('#overlay-root .panel .tour-btn');
    return {
      tour: bubble ? (help?.dataset.tour || '?') + ':' + bubble.querySelector('.tb-head small')?.textContent : null,
      hintPop: !!document.querySelector('#hint-pop'),
      hintReady: document.body.classList.contains('hint-ready'),
      wrap: wrap ? wrap.className : null,
      panel: panel ? panel.className : null,
      target: window.__bank.target,
    };
  });
  if (s.tour) {
    if (!seenTours.has(s.tour)) {
      seenTours.add(s.tour);
      await page.waitForTimeout(350);
      await shot(`tour-${s.tour.replace(/[^a-z0-9]+/gi, '_')}`);
      console.log('tour', s.tour);
    }
    await page.click('#tour .tour-bubble .btn.primary');
    await page.waitForTimeout(250);
    continue;
  }
  if (s.hintPop) {
    if (!hintShot) {
      await shot('hint-pop');
      await page.click('#hint-pop .btn.ghost').catch(() => {});
      await page.waitForTimeout(200);
      await shot('hint-pop2');
      hintShot = true;
      console.log('hint popup', await page.evaluate(() => document.querySelector('#hint-pop .hc-head small').textContent));
    }
    await page.click('#hint-pop .btn.primary');
    await page.waitForTimeout(250);
    continue;
  }
  if (s.wrap) {
    if (s.wrap.includes('debrief')) {
      await page.evaluate(() => document.querySelector('.screen-card.debrief').scrollTo(0, 99999));
      await page.waitForTimeout(300);
      await shot('debrief');
      const db = await page.evaluate(() => ({ btns: [...document.querySelectorAll('.screen-card.debrief .row.center .btn')].map((b) => b.textContent), stats: [...document.querySelectorAll('.db-stats > div')].map((d) => d.textContent) }));
      console.log('debrief', JSON.stringify(db));
      break;
    }
    await page.click('.screen-wrap.show .btn.primary').catch(() => {});
    await page.waitForTimeout(400);
    continue;
  }
  if (s.panel && s.panel.includes(want)) {
    // как живой игрок: сначала смотрим на окно — за это время успевает показаться обучение
    if (!globalThis.__waited) { globalThis.__waited = 1; await page.waitForTimeout(2500); continue; }
    if (s.hintReady && !hintShot) {
      await page.waitForTimeout(300);
      await shot('hint-ready');
      await page.click('#overlay-root .panel .hint-btn');
      await page.waitForTimeout(300);
      continue;
    }
    // делаем ошибки, чтобы проверить подсказку, потом доигрываем как получится
    const did = await page.evaluate((sc) => {
      const q = (sel) => [...document.querySelectorAll(sel)].filter((b) => b.offsetParent !== null && !b.disabled);
      if (sc === 'flow') { const b = q('.flow-btns .btn.danger')[0]; if (b) { b.click(); return 'block'; } }
      if (sc === 'rules') {
        const chips = q('.r-chip');
        if (chips.length && !document.querySelector('.r-chip.on')) { chips.forEach((c) => c.click()); return 'chips'; }
        const run = q('.r-builder .btn.primary')[0]; if (run) { run.click(); return 'run'; }
        const ap = q('.r-sim .btn.primary')[0]; if (ap) { ap.click(); return 'apply'; }
      }
      if (sc === 'call') {
        const call = q('.call-btn')[0]; if (call) { call.click(); return 'call'; }
        const pr = q('.choice.pressure')[0] || q('.choice')[0]; if (pr) { pr.click(); return 'choice'; }
        const end = q('.call-result .btn.primary')[0]; if (end) { end.click(); return 'end'; }
        const l = document.querySelector('.transcript'); if (l) l.click();
      }
      if (sc === 'trace') {
        const n = q('.node:not(.hidden)'); if (n.length) { n[Math.floor(Math.random() * n.length)].click(); return 'node'; }
      }
      if (sc === 'teller2') {
        const uv = q('.uv-btn')[0];
        if (uv && !window.__uvShot) { window.__uvShot = 1; return 'uv-before'; }
        if (uv && window.__uvShot === 1) { uv.click(); window.__uvShot = 2; return 'uv-on'; }
        const call = q('.op-grid .op-tile, .op-grid button')[0]; if (call) { call.click(); return 'op'; }
        const prim = q('.panel .btn.primary')[0]; if (prim) { prim.click(); return 'prim'; }
      }
      const prim = q('.panel .btn.primary')[0]; if (prim) { prim.click(); return 'prim'; }
      return null;
    }, scenario);
    if (did === 'uv-before' || did === 'uv-on') { await page.waitForTimeout(300); await shot(did); }
    if (did) mistakes++;
    await page.waitForTimeout(scenario === 'flow' ? 800 : 400);
    continue;
  }
  if (s.panel) {
    // брифинги и диалоги: дописать текст и нажать главную кнопку
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('#overlay-root .panel .btn.primary')].find((x) => x.offsetParent !== null && !x.disabled && !x.classList.contains('hidden'));
      if (b) b.click();
      else document.querySelector('#overlay-root .panel .brief-lines, #overlay-root .panel .dlg-lines, #overlay-root .panel .transcript')?.click();
    });
    await page.waitForTimeout(300);
    continue;
  }
  if (s.target) {
    await page.evaluate(() => window.__bank.hit());
    await page.waitForTimeout(900);
    continue;
  }
  await page.waitForTimeout(300);
}
console.log('tours seen:', [...seenTours].join(' | '));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
