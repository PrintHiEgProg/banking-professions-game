// Умный игрок за инкассатора: node cash.mjs <shift> [diff] [mode=good|bad] [shots=1] [w] [h]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [shiftArg = '1', diff = 'normal', mode = 'good', shotsArg = '1', wArg = '1366', hArg = '768'] = process.argv.slice(2);
const N = Number(shiftArg);
const shots = shotsArg === '1';
const mobile = wArg !== '1366';
const tag = `cash${N}-${diff}-${mode}${mobile ? `-${wArg}x${hArg}` : ''}`;
const ORDERS = {
  1: { easy: ['bakery', 'romashka', 'family'], normal: ['bakery', 'romashka', 'pharmacy', 'family'] },
  2: { easy: ['mall', 'romashka', 'gas'], normal: ['romashka', 'mall', 'gas', 'pizza'] },
  3: { easy: ['romashka', 'pharmacy', 'branch'], normal: ['romashka', 'pharmacy', 'branch'] },
  4: { easy: ['atm_mall', 'atm_station', 'atm_home'], normal: ['atm_mall', 'atm_station', 'family', 'atm_plant', 'atm_home'] },
  5: { easy: ['atm_mall', 'romashka', 'family'], normal: ['atm_mall', 'romashka', 'family', 'pizza'] },
};
const order = mode === 'good' ? ORDERS[N][diff === 'easy' ? 'easy' : 'normal'] : [...ORDERS[N][diff === 'easy' ? 'easy' : 'normal']].reverse();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
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
await page.click('#btn-start', { noWaitAfter: true });
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
await page.evaluate((st) => { const ps = window.__bank.progress.profs.cash; ps.unlocked = 5; ps.shift = st; window.__bank.enterRoomById('cash'); }, N);
await page.waitForTimeout(1500);
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(700);
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(1500);
await shot('1-room');
const ODD = ['смотрит на броневик', 'работающим мотором', 'Капюшон', 'фотографирует'];
const t0 = Date.now();
const flags = {};
while (Date.now() - t0 < 260000) {
  const st = await page.evaluate(() => ({
    wrap: document.querySelector('.screen-wrap.show .screen-card')?.className || null,
    panel: document.querySelector('#overlay-root.active .panel')?.className || null,
    target: window.__bank.target,
    plan: !!document.querySelector('.panel.plan .cm-svg'),
    stage: !document.querySelector('.dr-stage')?.classList.contains('hidden') && !!document.querySelector('.dr-stage .dr-card'),
    stageTitle: document.querySelector('.dr-stage:not(.hidden) .dr-card h3')?.textContent || '',
    vault: !!document.querySelector('.vt-body'),
    tail: document.querySelector('.mirror')?.dataset.car === 'tail',
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
    if (st.plan && !flags.plan) {
      flags.plan = 1;
      await page.waitForTimeout(600);
      await shot('2-map');
      for (const id of order) { await page.evaluate((id) => document.querySelector(`.cm-pt[data-id="${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), id); await page.waitForTimeout(150); }
      await page.waitForTimeout(500);
      await shot('3-route');
      await page.evaluate(() => document.querySelector('.ck-side .btn.primary').click());
      await page.waitForTimeout(800);
      continue;
    }
    if (st.panel.includes('drive') && !flags.obs) {
      flags.obs = 1;
      await page.evaluate(() => { window.__tails = 0; const m = document.querySelector('.mr-car'); new MutationObserver(() => { if (document.querySelector('.mirror').dataset.car === 'tail') window.__tails++; }).observe(m, { childList: true }); });
    }
    if (st.stage) {
      const t = st.stageTitle;
      const k = Object.keys(flags).length;
      await page.waitForTimeout(250);
      await shot(`4-stage-${k}`);
      flags['s' + k] = 1;
      if (t.includes('Распредели')) {
        await page.evaluate(() => { const want = { petrovich: 'driver', sasha: 'collector', igor: 'guard' }; for (const c of document.querySelectorAll('.crew-card')) c.querySelector(`button[data-r="${want[c.dataset.id]}"]`).click(); document.querySelector('.dr-card .btn.primary').click(); });
      } else if (t.includes('осмотрись')) {
        await page.evaluate(([odd, good]) => { const tiles = [...document.querySelectorAll('.st-tile')]; const o = tiles.find((x) => odd.some((s) => x.textContent.includes(s))); if (o && good) { o.click(); document.querySelector('.dr-card .btn.danger').click(); } else document.querySelector('.dr-card .btn.safe').click(); }, [ODD, mode === 'good']);
      } else if (t.includes('приём сумки')) {
        await page.evaluate((good) => { const torn = !!document.querySelector('.bag.torn'); const a = document.querySelector('.seal-tag b').textContent; const b = document.querySelector('.vedomost div b').textContent; const bad = torn || a !== b; document.querySelector(`.dr-card .btn.${bad === good ? 'danger' : 'safe'}`).click(); }, mode === 'good');
      } else if (t.includes('загрузка')) {
        await page.evaluate((good) => {
          const cs = [...document.querySelectorAll('.cassette')];
          for (let i = 0; i < cs.length; i++) {
            const v = Number(cs[i].querySelector('b').textContent.replace(/\D/g, ''));
            const bundles = [...document.querySelectorAll('.atm-tray .bundle')];
            const bb = good ? bundles.find((x) => Number(x.textContent.replace(/\D/g, '')) === v) : bundles[0];
            bb.click();
            document.querySelectorAll('.cassette')[i].click();
          }
          document.querySelector('.dr-card .btn.primary').click();
        }, mode === 'good');
      } else if (t.includes('перекрыта')) {
        await page.evaluate(() => { const bs = [...document.querySelectorAll('.dr-card .dr-btns button')]; bs.sort((a, b) => Number(a.textContent.match(/\+(\d+)/)[1]) - Number(b.textContent.match(/\+(\d+)/)[1])); bs[0].click(); });
      } else {
        await page.evaluate((good) => { const b = document.querySelector('.dr-card .btn.safe') || document.querySelector('.dr-card .btn.primary') || document.querySelector('.dr-card .dr-btns button'); (good ? b : document.querySelector('.dr-card .dr-btns button:last-child') || b).click(); }, mode === 'good');
      }
      await page.waitForTimeout(500);
      continue;
    }
    if (st.tail && mode === 'good' && !flags.reported) {
      const n = await page.evaluate(() => window.__tails);
      if (n >= 2) { flags.reported = 1; await shot('5-tail'); await page.evaluate(() => document.querySelector('.radio-btn').click()); await page.waitForTimeout(400); }
    }
    if (st.vault) {
      const did = await page.evaluate(() => {
        const steps = [...document.querySelectorAll('.vt-step:not(:disabled)')];
        if (steps.length) {
          const order = ['удостоверение', 'Сверить', 'Пересчитать', 'Расписаться'];
          for (const o of order) { const b = steps.find((s) => s.textContent.includes(o)); if (b) { b.click(); return 'step'; } }
        }
        const rows = [...document.querySelectorAll('.vt-row')].filter((r) => r.querySelector('.vt-act .btn'));
        if (rows.length && !document.querySelector('.vt-act .btn.on')) {
          for (const r of rows) { const bag = r.querySelector('.vt-bag'); const seal = r.querySelector('small').textContent.replace('ведомость: ', ''); const bad = bag.classList.contains('torn') || bag.querySelector('b').textContent !== seal; r.querySelectorAll('.vt-act .btn')[bad ? 1 : 0].click(); }
          return 'marks';
        }
        const done = document.querySelector('.vt-body > .btn.primary:not(:disabled)');
        if (done) { done.click(); return 'done'; }
        return null;
      });
      if (did && !flags['v' + did]) { flags['v' + did] = 1; await shot(`7-vault-${did}`); }
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(250);
    continue;
  }
  if (st.target) {
    await page.evaluate(() => window.__bank.hit());
    await page.waitForTimeout(1200);
    if (st.target === 'van') await shot('3b-van');
    continue;
  }
  await page.waitForTimeout(300);
}
console.log(`${tag}: ${Math.round((Date.now() - t0) / 1000)}s`);
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
