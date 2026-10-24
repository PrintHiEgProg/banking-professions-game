// Умный игрок за финансового консультанта: node advisor.mjs <shift> [diff] [mode=good|bad] [shots=1] [w] [h]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [shiftArg = '1', diff = 'normal', mode = 'good', shotsArg = '1', wArg = '1366', hArg = '768'] = process.argv.slice(2);
const N = Number(shiftArg);
const shots = shotsArg === '1';
const tag = `adv${N}-${diff}-${mode}${wArg !== '1366' ? `-${wArg}x${hArg}` : ''}`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: wArg !== '1366', isMobile: wArg !== '1366' });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
const shot = async (name) => { if (process.env.AUDIT) await audit(page, `${tag} ${name}`); if (shots) await page.screenshot({ path: `shots/${tag}-${name}.png` }); };
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Тест');
await page.click(`.diff-btn[data-diff="${diff}"]`);
await page.click('#btn-start');
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
await page.evaluate((st) => { const ps = window.__bank.progress.profs.advisor; ps.unlocked = 5; ps.shift = st; window.__bank.enterRoomById('advisor'); }, N);
await page.waitForTimeout(1500);
await shot('0-cabinet');
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(700);
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(1500);
await shot('1-room');
const SIGNS = ['30% в месяц', 'гарантированно!', 'Приведи друга', 'Успей до пятницы', 'Лицензия ЦБ', 'Telegram-бот'];
const t0 = Date.now();
let phase = 'plan';
let shotFlags = {};
while (Date.now() - t0 < 200000) {
  const st = await page.evaluate(() => ({
    wrap: document.querySelector('.screen-wrap.show .screen-card')?.className || null,
    panel: document.querySelector('#overlay-root.active .panel')?.className || null,
    target: window.__bank.target,
    choices: !!document.querySelector('.ad-choices button:not(:disabled)'),
    offer: !!document.querySelector('.ad-opts button:not(:disabled)'),
    flyer: !!document.querySelector('.ad-flyer') && !document.querySelector('.ad-talk'),
    dlg: !!document.querySelector('.dlg-choices button:not(:disabled)'),
    pipes: !!document.querySelector('.pipes'),
    go: !!document.querySelector('.ad-plan .btn.primary:not(:disabled)'),
    calc: !!document.querySelector('.ad-calc button'),
    ev: !!document.querySelector('.rw-event:not(.hidden) .rw-ev-btns button'),
    fin: !!document.querySelector('.rw-finale .btn.primary'),
  }));
  if (st.wrap) {
    if (st.wrap.includes('debrief')) {
      await page.waitForTimeout(1200);
      await shot('9-debrief');
      const info = await page.evaluate(() => ({ stars: document.querySelectorAll('.screen-card .stars .on').length, cons: [...document.querySelectorAll('.cons p')].map((p) => p.textContent), stats: [...document.querySelectorAll('.db-stats div')].map((d) => d.textContent), learned: [...document.querySelectorAll('.k-card b')].map((b) => b.textContent) }));
      console.log(JSON.stringify(info, null, 1));
      break;
    }
    await page.click('.screen-wrap.show .btn.primary').catch(() => {});
    await page.waitForTimeout(500);
    continue;
  }
  if (st.panel) {
    if (st.offer) {
      if (!shotFlags.offer) { shotFlags.offer = 1; await page.waitForTimeout(500); await shot('2-offer'); }
      await page.evaluate((good) => { const bs = [...document.querySelectorAll('.ad-opts button')]; (good ? bs.find((b) => b.textContent.replace(/\s/g, '').includes('31200')) : bs.find((b) => b.textContent.startsWith('0'))).click(); }, mode === 'good');
      await page.waitForTimeout(2600);
      continue;
    }
    if (st.choices) {
      if (!shotFlags.choices) { shotFlags.choices = 1; await page.waitForTimeout(500); await shot('2-explain'); }
      await page.evaluate((good) => { const bs = [...document.querySelectorAll('.ad-choices button')]; (good ? bs.find((b) => b.classList.contains('calm') && !b.disabled) : bs.find((b) => b.classList.contains('pressure') && !b.disabled) || bs.find((b) => !b.disabled))?.click(); }, mode === 'good');
      await page.waitForTimeout(1900);
      continue;
    }
    if (st.flyer) {
      if (!shotFlags.flyer) { shotFlags.flyer = 1; await page.waitForTimeout(500); await shot('2-flyer'); }
      await page.evaluate((signs) => { for (const sp of document.querySelectorAll('.ad-flyer .seg:not(.found)')) if (signs.some((s) => sp.textContent.includes(s))) { sp.click(); break; } }, SIGNS);
      await page.waitForTimeout(300);
      const go = await page.$('.ad-work .btn.primary:not(.hidden)');
      if (go) { await shot('3-flyer-done'); await go.click(); await page.waitForTimeout(800); }
      continue;
    }
    if (st.dlg) {
      if (!shotFlags.dlg) { shotFlags.dlg = 1; await page.waitForTimeout(300); await shot('3-talk'); }
      await page.evaluate((good) => { const bs = [...document.querySelectorAll('.dlg-choices button:not(:disabled)')]; (good ? bs.find((b) => b.classList.contains('logic')) || bs[0] : bs.find((b) => b.classList.contains('pressure'))).click(); }, mode === 'good');
      await page.waitForTimeout(1500);
      continue;
    }
    if (st.calc) {
      await page.evaluate(() => document.querySelector('.ad-calc button').click());
      await page.waitForTimeout(800);
      continue;
    }
    if (st.pipes && phase === 'plan') {
      if (!shotFlags.pipes) { shotFlags.pipes = 1; await page.waitForTimeout(600); await shot('4-pipes'); }
      if (mode === 'good') {
        await page.evaluate(() => {
          for (const r of document.querySelectorAll('.pp-row.kind-waste')) { if (r.dataset.state === 'open') r.click(); if (r.dataset.state === 'half') r.click(); }
          for (const r of document.querySelectorAll('.pp-row.kind-fun')) if (r.dataset.state === 'open') r.click();
          const cb = [...document.querySelectorAll('.seg-btns button')]; if (cb.length) cb[cb.length - 2].click();
          const dep = document.querySelector('.ad-prod[data-id="deposit"]') || document.querySelector('.ad-prod[data-id="saving"]'); if (dep) dep.click();
        });
      } else {
        await page.evaluate(() => { const r = document.querySelector('.pp-row.kind-need'); r?.click(); const w = document.querySelector('.pp-row.kind-waste'); w?.click(); w?.click(); });
      }
      await page.waitForTimeout(800);
      await shot('5-plan');
      await page.evaluate(() => document.querySelector('.ad-plan .btn.primary')?.click());
      phase = 'sent';
      await page.waitForTimeout(1000);
      continue;
    }
    if (st.ev) {
      if (!shotFlags['ev' + Object.keys(shotFlags).length]) { shotFlags['ev' + Object.keys(shotFlags).length] = 1; await shot(`6-event-${Object.keys(shotFlags).length}`); }
      await page.evaluate((good) => { const bs = [...document.querySelectorAll('.rw-ev-btns button')]; (good ? bs.find((b) => b.classList.contains('safe')) || bs.find((b) => b.classList.contains('primary')) || bs[0] : bs[bs.length - 1]).click(); }, mode === 'good');
      await page.waitForTimeout(400);
      continue;
    }
    if (st.fin) {
      await page.waitForTimeout(1500);
      await shot('8-finale');
      await page.click('.rw-finale .btn.primary');
      await page.waitForTimeout(800);
      continue;
    }
    if (st.panel.includes('rewind') && !shotFlags.rw) { shotFlags.rw = 1; await page.waitForTimeout(2500); await shot('6-rewind'); }
    if (st.panel.includes('rewind') && !shotFlags.bike && await page.evaluate(() => document.querySelectorAll('.rw-bike .bk-part.on').length >= 3 && document.querySelector('.rw-event').classList.contains('hidden'))) { shotFlags.bike = 1; await page.waitForTimeout(700); await shot('6b-rewind-bike'); }
    await page.waitForTimeout(300);
    continue;
  }
  if (st.target) {
    if (st.target === 'screen' && !shotFlags.scr) { shotFlags.scr = 1; await shot('5b-room-screen'); }
    await page.evaluate(() => window.__bank.hit());
    await page.waitForTimeout(1200);
    continue;
  }
  await page.waitForTimeout(300);
}
console.log(`${tag}: ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
