// Игрок за DevOps-инженера: node devops.mjs <shift> [diff] [mode=good|bad] [shots=1] [w] [h] [story=]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [shiftArg = '1', diff = 'normal', mode = 'good', shotsArg = '1', wArg = '1366', hArg = '768', storyArg = ''] = process.argv.slice(2);
const N = Number(shiftArg);
const good = mode === 'good';
const shots = shotsArg === '1';
const mobile = wArg !== '1366';
const tag = `dv${N}-${diff}-${mode}${mobile ? `-${wArg}x${hArg}` : ''}${storyArg ? `-${storyArg}` : ''}`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('crash', () => console.log('PAGE CRASH'));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
const shotFlags = {};
const shot = async (name, once = true) => {
  if (once && shotFlags[name]) return;
  shotFlags[name] = 1;
  if (process.env.AUDIT) await audit(page, `${tag} ${name}`);
  if (shots) await page.screenshot({ path: `shots/${tag}-${name}.png` });
};
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
await page.evaluate(({ st, story }) => {
  const p = window.__bank.progress;
  p.story.gran = 'saved';
  if (story === 'insider') p.story.insider = 'hired';
  if (story === 'access') p.story.mashaAccess = ['mail', 'training', 'cash', 'clients'];
  const ps = p.profs.devops;
  ps.unlocked = 5;
  ps.shift = st;
  window.__bank.enterRoomById('devops');
}, { st: N, story: storyArg });
await page.waitForTimeout(1500);
await shot('0-cabinet');
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(700);
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(1500);
await shot('1-room');

const PIPE = { 1: good ? ['secrets', 'sca', 'tests', 'sign'] : ['manual', 'tests'], 5: good ? ['secrets', 'sign', 'sca', 'image', 'tests', 'sast'] : ['tests', 'secrets'] };
const NEED = { masha: ['mail', 'training', 'abs'], gosha: ['mail', 'code', 'logs'], oleg: [], irina: ['mail', 'logs', 'clients'], ci: ['code', 'secrets'], ruslan: [] };
const RES = ['mail', 'training', 'abs', 'clients', 'code', 'logs', 'secrets', 'prod'];
const t0 = Date.now();
let lastAct = Date.now();
let built = false;
let canaryFixed = false;
let badMisclicked = false;
while (Date.now() - t0 < 260000) {
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      wrap: q('.screen-wrap.show .screen-card')?.className || null,
      panel: q('#overlay-root.active .panel')?.className || null,
      target: window.__bank.target,
      modal: !!q('.dv-modal .choice:not(:disabled)'),
      run: [...document.querySelectorAll('.dv-side .btn.primary.big:not(:disabled)')].some((b) => b.textContent.includes('Запустить')),
      mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0,
      deploy: !!q('.dv-side .btn.pulse-hint:not(:disabled)'),
      morning: !!q('.panel.devops.morning .btn.primary:not(.hidden)'),
      alert: q('.dv-alert')?.textContent || '',
      acts: !!q('.dv-acts .dv-act:not(:disabled)'),
      pm: !!q('.dv-pm-row .choice:not(:disabled)'),
      rows: document.querySelectorAll('.dv-row').length,
      tasks: [...document.querySelectorAll('.dv-task.done')].map((t) => t.dataset.id),
      meas: [...document.querySelectorAll('.dv-meas .dv-act:not(:disabled)')].map((b) => b.textContent),
      logsDone: !!q('.panel.devops.logs .dv-side .btn.primary:not(:disabled)'),
      matrix: !!q('.dv-cell:not(:disabled)'),
      stage: q('.dv-stage.now')?.textContent || null,
      hurt: Number((q('.dv-hurt.bad b')?.textContent || '0').replace(/\D/g, '')),
      next: !!q('.dv-can-btns .btn.primary:not(:disabled)'),
      flag: !!q('.dv-can-btns .btn.ghost:not(:disabled)'),
      canFb: q('.panel.devops.canary .feedback')?.textContent || '',
    };
  });
  if (Date.now() - lastAct > 35000) {
    console.log('STUCK', JSON.stringify(st));
    await shot('stuck', false);
    break;
  }
  const act = async (f, a, wait = 400) => {
    if (process.env.TRACE) console.log('act', String(f).slice(0, 70), st.mem);
    await page.evaluate(f, a);
    lastAct = Date.now();
    await page.waitForTimeout(wait);
  };
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
    lastAct = Date.now();
    continue;
  }
  if (!st.panel) {
    if (st.target) {
      await page.evaluate(() => window.__bank.hit && window.__bank.hit());
      lastAct = Date.now();
    }
    await page.waitForTimeout(500);
    continue;
  }
  if (st.panel.includes('pipe')) {
    if (st.modal) {
      await shot('3-triage');
      await act((g) => { const bs = [...document.querySelectorAll('.dv-modal .choice')]; (g ? bs[0] : bs[bs.length - 1]).click(); }, good, 1800);
      continue;
    }
    if (!built) {
      await shot('2-pipeline');
      await act((ids) => { for (const id of ids) document.querySelector(`.dv-card[data-id="${id}"]`).click(); }, PIPE[N], 600);
      built = true;
      await shot('2b-built');
      continue;
    }
    if (st.run) {
      await act(() => [...document.querySelectorAll('.dv-side .btn.primary.big')].find((b) => b.textContent.includes('Запустить')).click(), null, 1000);
      continue;
    }
    if (st.deploy) {
      await shot('4-deploy');
      await act(() => document.querySelector('.dv-side .btn.pulse-hint').click(), null, 3200);
      await shot('5-deployed');
      continue;
    }
    await page.waitForTimeout(300);
    continue;
  }
  if (st.panel.includes('morning')) {
    if (st.morning) {
      await page.waitForTimeout(500);
      await shot('6-morning');
      await act(() => document.querySelector('.panel.devops.morning .btn.primary').click(), null, 900);
    } else await page.waitForTimeout(400);
    continue;
  }
  if (st.panel.includes('inc')) {
    if (st.pm) {
      await shot('5-postmortem');
      await act((g) => { for (const row of document.querySelectorAll('.dv-pm-row')) { const bs = row.querySelectorAll('.choice:not(:disabled)'); if (bs.length) (g ? bs[0] : bs[bs.length - 1]).click(); } }, good, 1800);
      continue;
    }
    if (st.acts) {
      const which = /входе|Ошибки/.test(st.alert) ? 'rollback' : /Диск/.test(st.alert) ? 'logs' : /Трафик/.test(st.alert) ? 'ddos' : null;
      if (!which) {
        await page.waitForTimeout(400);
        continue;
      }
      await page.waitForTimeout(2200);
      await shot(`2-incident-${which}`);
      await act((w) => document.querySelector(`.dv-act[data-id="${w}"]`).click(), good ? which : 'restart', good ? 3000 : 3500);
      if (!good) await act((w) => document.querySelector(`.dv-act[data-id="${w}"]`)?.click(), which, 3000);
      continue;
    }
    await page.waitForTimeout(400);
    continue;
  }
  if (st.panel.includes('logs')) {
    await shot('2-logs');
    const want = ['stuff', 'taken', 'insider'].find((k) => !st.tasks.includes(k));
    if (want) {
      const gg = good || badMisclicked;
      if (!good) badMisclicked = true;
      const ok = await page.evaluate(({ want, g }) => {
        const rows = [...document.querySelectorAll('.dv-row')];
        const match = { stuff: (t) => t.includes('185.220.101.7') && t.includes('неверный'), taken: (t) => t.includes('v.petrovna'), insider: (t) => t.includes('contractor.oleg') }[want];
        const row = g ? rows.find((r) => match(r.textContent)) : rows.find((r) => r.textContent.includes('misha.k')) || rows.find((r) => match(r.textContent));
        if (!row) return false;
        row.click();
        const label = { stuff: 'Подбор', taken: 'Взломанный', insider: 'сотрудник' }[want];
        const b = [...document.querySelectorAll('.dv-pop .btn')].find((x) => x.textContent.includes(g ? label : 'Подбор'));
        b.click();
        return true;
      }, { want, g: gg });
      lastAct = Date.now();
      await page.waitForTimeout(ok ? 700 : 900);
      if (!good && ok) {
        // плохой игрок ошибся один раз — дальше играет нормально
        good || (await page.evaluate(() => 0));
      }
      if (ok) continue;
    }
    if (st.meas.length) {
      const pick = st.meas.find((m) => (good ? /Лимит|Код подтверждения|Сбросить|подрядчика/.test(m) : /Выключить|Запретить|один адрес/.test(m)));
      if (pick) {
        await act((txt) => [...document.querySelectorAll('.dv-meas .dv-act')].find((b) => b.textContent === txt).click(), pick, 500);
        continue;
      }
    }
    if (st.logsDone && !want) {
      await shot('3-logs-done');
      await act(() => document.querySelector('.panel.devops.logs .dv-side .btn.primary').click(), null, 1200);
      continue;
    }
    await page.waitForTimeout(600);
    continue;
  }
  if (st.panel.includes('acc')) {
    if (st.matrix) {
      await shot('2-access');
      await act(({ need, res, g }) => {
        const rows = [...document.querySelectorAll('.dv-matrix tr')].slice(1);
        const ids = ['masha', 'gosha', 'oleg', 'irina', 'ci', 'ruslan'];
        rows.forEach((tr, i) => {
          const want = g ? need[ids[i]] : ['mail', 'prod', 'clients'];
          tr.querySelectorAll('.dv-cell').forEach((c, j) => {
            const on = c.classList.contains('on');
            if (on !== want.includes(res[j])) c.click();
          });
        });
        document.querySelector('.panel.devops.acc .btn.primary').click();
      }, { need: NEED, res: RES, g: good }, 2600);
      await shot('3-audit');
      continue;
    }
    await page.waitForTimeout(400);
    continue;
  }
  if (st.panel.includes('canary')) {
    await shot('2-canary');
    if (st.stage === '10%' && !canaryFixed && st.hurt > 0 && st.flag) {
      await page.waitForTimeout(1200);
      await shot('3-canary-broken');
      if (good) {
        await act(() => document.querySelector('.dv-can-btns .btn.ghost').click(), null, 3600);
        canaryFixed = true;
        continue;
      }
    }
    if (st.next) {
      if (good && st.stage === '10%' && !canaryFixed) {
        await page.waitForTimeout(400);
        lastAct = Date.now();
        continue;
      }
      await page.waitForTimeout(600);
      if (st.stage === '100%') await shot('4-canary-100');
      await act(() => document.querySelector('.dv-can-btns .btn.primary').click(), null, 700);
      continue;
    }
    await page.waitForTimeout(400);
    continue;
  }
  await page.waitForTimeout(300);
}
const story = await page.evaluate(() => JSON.stringify(window.__bank.progress.story));
console.log('story', story);
console.log(`${tag} time=${Math.round((Date.now() - t0) / 1000)}s`);
console.log(errors.length ? errors.join('\n---\n') : 'NO ERRORS');
await browser.close();
