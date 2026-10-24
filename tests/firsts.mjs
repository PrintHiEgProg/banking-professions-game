// Сквозной сюжет и первые смены: операционист → холл → кредит → холл → безопасность (1 и 4).
// node firsts.mjs [diff=normal] [mode=good|bad]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const [diff = 'normal', mode = 'good'] = process.argv.slice(2);
const good = mode === 'good';
const tag = `first-${diff}-${mode}`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
const shot = (name) => page.screenshot({ path: `shots/${tag}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:8765/index.html?debug');
await ev(() => { localStorage.clear(); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Тест');
await page.click(`.diff-btn[data-diff="${diff}"]`);
await page.click('#btn-start');
await wait(400);
await page.click('.intro-skip');
const met = await dismissMentor(page, `shots/${tag}-00-mentor.png`);
console.log('mentor welcome:', met);
await wait(600);
await shot('01-lobby');

async function startShift(prof, n) {
  await ev(([p, st]) => { const ps = window.__bank.progress.profs[p]; ps.unlocked = Math.max(ps.unlocked, st); window.__bank.enterRoomById(p); }, [prof, n]);
  await page.waitForSelector('.screen-wrap.show .screen-card.cabinet .map-card', { timeout: 15000 });
  await wait(500);
  await ev((st) => [...document.querySelectorAll('.screen-wrap.show .map-card')][st - 1]?.click(), n);
  await page.waitForSelector('.screen-wrap.show .screen-card.intro-card-shift .btn.primary', { timeout: 15000 });
  await wait(500);
  await page.click('.screen-wrap.show .screen-card.intro-card-shift .btn.primary');
  await wait(1300);
}
async function toLobby() {
  await page.click('.screen-wrap.show .btn.ghost');
  await wait(900);
  await page.click('.screen-wrap.show .btn.ghost');
  await wait(2600);
}
async function waitDebrief(name, limit = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limit) {
    if (await ev(() => !!document.querySelector('.screen-wrap.show .screen-card.debrief'))) {
      await wait(900);
      await shot(name);
      const stars = await ev(() => document.querySelectorAll('.screen-card .stars .on').length);
      const plot = await ev(() => [...document.querySelectorAll('.screen-card .cons.story p')].map((p) => p.textContent));
      console.log(`${name}: stars ${stars}; story: ${plot.join(' | ')}`);
      return true;
    }
    await wait(300);
  }
  console.log(`${name}: TIMEOUT`);
  return false;
}

// ─────────── Операционист, смена 1 ───────────
await startShift('teller', 1);
const T = await ev(async () => { const m = await import('/js/data/teller.js'); return { clients: m.TELLER_SHIFTS[1].clients.map((c) => ({ name: c.name, op: c.op, problem: c.problem || null, form: c.form, pay: c.pay, due: c.due })), ops: m.OPS }; });
const shotT = {};
let t0 = Date.now();
while (Date.now() - t0 < 180000) {
  if (await ev(() => !!document.querySelector('.screen-wrap.show .screen-card.debrief'))) break;
  const tgt = await ev(() => window.__bank.target);
  const st = await ev(() => ({ wrap: document.querySelector('.screen-wrap.show .screen-card')?.className, mode: window.__bank.mode, cur: window.__bank.progress.current, step: document.querySelector('.panel.teller .tl-step b')?.textContent || '', name: (document.querySelector('.panel.teller .tl-name')?.textContent || '').split(',')[0] }));
  if (!st.step && tgt) { await ev(() => window.__bank.hit()); await wait(1200); continue; }
  const c = T.clients.find((x) => x.name === st.name);
  if (process.env.DBG) console.log('T', JSON.stringify(st), tgt, !!c);
  if (st.step.startsWith('Что хочет клиент')) {
    if (c?.problem && !shotT.arrive) { shotT.arrive = 1; await wait(500); await shot('10-teller-climax-arrive'); }
    await ev((title) => [...document.querySelectorAll('.op-tile')].find((b) => b.querySelector('b').textContent === title)?.click(), T.ops[c.op].title);
    await wait(500);
    continue;
  }
  if (st.step.startsWith('Перенеси данные')) {
    if (c.problem && good) {
      if (!shotT.form) { shotT.form = 1; await shot('11-teller-climax-form'); }
      await page.click('.tl-work .btn.danger');
      await wait(300);
      await ev(() => [...document.querySelectorAll('.problem-box .btn')].find((b) => b.textContent.includes('мошенник'))?.click());
      await wait(700);
      continue;
    }
    for (let i = 0; i < c.form.length; i++) {
      await ev(([i, key]) => { document.querySelectorAll('.tl-work .slot')[i].click(); document.querySelector(`.tl-docview .chip[data-key="${key}"]`)?.click(); }, [i, c.form[i][0]]);
      await wait(150);
    }
    await ev(() => [...document.querySelectorAll('.tl-work .btn.primary')].find((b) => b.textContent.includes('Провести'))?.click());
    await wait(600);
    continue;
  }
  if (st.step.startsWith('Поговори')) {
    const has = await ev(() => !!document.querySelector('.dlg-choices button:not(:disabled)'));
    if (has) {
      if (!shotT.dlg) { shotT.dlg = 1; await shot('12-teller-climax-dialog'); }
      await ev(() => { const bs = [...document.querySelectorAll('.dlg-choices button:not(:disabled)')]; (bs.find((b) => b.classList.contains('logic')) || bs.find((b) => b.classList.contains('calm')) || bs[0]).click(); });
      await wait(400);
    } else await page.click('.dlg-lines').catch(() => {});
    await wait(300);
    continue;
  }
  if (st.step.includes('спасены') || st.step.includes('мошенникам')) {
    await wait(1600);
    await shot('13-teller-climax-rescue');
    await ev(() => [...document.querySelectorAll('.tl-work > .btn.primary')].pop()?.click());
    await wait(500);
    continue;
  }
  if (st.step.startsWith('Прими деньги')) {
    const target = await ev(() => Number((document.querySelector('.tl-work .cash-target b')?.textContent || '0').replace(/\D/g, '')));
    let left = target;
    for (const v of [5000, 1000, 500, 100, 50, 10]) while (left >= v) { await ev((v) => [...document.querySelectorAll('.denoms .note')].find((n) => Number(n.querySelector('b').textContent.replace(/\D/g, '')) === v).click(), v); left -= v; }
    await ev(() => [...document.querySelectorAll('.tl-work .btn.primary')].find((b) => /Выдать|Без сдачи/.test(b.textContent))?.click());
    await wait(500);
    continue;
  }
  if (st.step.startsWith('Попрощайся')) {
    await ev(() => document.querySelector('.tl-work .choice.calm')?.click());
    await wait(700);
    continue;
  }
  await wait(300);
}
await waitDebrief('14-teller-debrief');
console.log('story after teller:', JSON.stringify(await ev(() => window.__bank.progress.story)));
await toLobby();
await shot('15-lobby-news');

// ─────────── Кредитный эксперт, смена 1 ───────────
await startShift('credit', 1);
t0 = Date.now();
const shotC = {};
while (Date.now() - t0 < 150000) {
  if (await ev(() => !!document.querySelector('.screen-wrap.show .screen-card.debrief'))) break;
  const st = await ev(() => ({
    target: window.__bank.target,
    panel: document.querySelector('#overlay-root.active .panel')?.className || '',
    name: (document.querySelector('.panel.credit .cr-client .tl-name')?.textContent || '').split(',')[0],
    decide: !!document.querySelector('.panel.credit .decide .btn.safe'),
    talkBtn: !!document.querySelector('.panel.credit .talk-btn'),
    dlg: !!document.querySelector('.panel.credit .dlg-choices button:not(:disabled)'),
    rescue: !!document.querySelector('.panel.credit .rescue'),
    month: !!document.querySelector('.panel.credit.month .pf-body .btn.primary:not(.hidden)'),
  }));
  if (!st.panel && st.target) { await ev(() => window.__bank.hit()); await wait(1300); continue; }
  if (st.month) { await wait(600); await shot('22-credit-month'); await page.click('.panel.credit.month .pf-body .btn.primary'); await wait(800); continue; }
  if (st.rescue) { await wait(1600); await shot('21-credit-rescue'); await page.click('.panel.credit .cr-talk > .btn.primary'); await wait(1500); continue; }
  if (st.dlg) { await ev(() => { const bs = [...document.querySelectorAll('.panel.credit .dlg-choices button:not(:disabled)')]; (bs.find((b) => b.classList.contains('calm')) || bs[0]).click(); }); await wait(500); continue; }
  if (st.name === 'Максим' && st.decide && !st.talkBtn && !shotC.q) {
    shotC.q = 1;
    await shot('20-credit-maxim');
    if (good) { await ev(() => document.querySelector('.panel.credit .q-btn')?.click()); await wait(600); }
    else { await page.click('.panel.credit .decide .btn.safe'); await wait(1500); }
    continue;
  }
  if (st.talkBtn && good) { await page.click('.panel.credit .talk-btn'); await wait(800); continue; }
  if (st.decide && st.name === 'Денис') { await ev(() => [...document.querySelectorAll('.term-btns button')].find((b) => b.textContent === '24')?.click()); await wait(200); await page.click('.panel.credit .decide .btn.safe'); await wait(1500); continue; }
  if (st.decide && st.name === 'Анна') { await page.click('.panel.credit .decide .btn.safe'); await wait(1500); continue; }
  await page.click('.panel.credit .dlg-lines').catch(() => {});
  await wait(300);
}
await waitDebrief('23-credit-debrief');
await toLobby();
await shot('24-lobby-news');

// ─────────── Безопасность, смена 1 ───────────
await startShift('security', 1);
const M = await ev(async () => { const m = await import('/js/data/chapter1.js'); return { ids: window.__bank.ctx.diff.s1.messages, msgs: m.MESSAGES }; });
t0 = Date.now();
let shotS = 0;
while (Date.now() - t0 < 150000) {
  if (await ev(() => !!document.querySelector('.screen-wrap.show .screen-card.debrief'))) break;
  const st = await ev(() => ({ target: window.__bank.target, panel: !!document.querySelector('#overlay-root.active .panel.ep1'), prog: document.querySelector('.panel.ep1 .term-progress')?.textContent || '', next: !!document.querySelector('.panel.ep1 .result.show .btn.primary'), fin: !!document.querySelector('.ph-finale .btn.primary') }));
  if (st.fin) { await wait(1700); await shot('31-security-finale'); await page.click('.ph-finale .btn.primary'); await wait(1000); continue; }
  if (!st.panel && st.target) { await ev(() => window.__bank.hit()); await wait(1300); continue; }
  if (!st.panel) { await wait(300); continue; }
  if (st.next) { await page.click('.panel.ep1 .result.show .btn.primary'); await wait(500); continue; }
  const i = Number(st.prog.split('/')[0]) - 1;
  const m = M.msgs[M.ids[i]];
  if (!shotS) { shotS = 1; await wait(1500); await shot('30-security-live'); }
  if (m.fraud) {
    for (const [text, flag] of m.segments) if (flag) await ev((t) => [...document.querySelectorAll('.panel.ep1 .bubble .seg')].find((s) => s.textContent === t && !s.classList.contains('found'))?.click(), text);
    await wait(200);
    await page.click('.panel.ep1 .verdict .btn.danger');
  } else await page.click('.panel.ep1 .verdict .btn.safe');
  await wait(600);
}
await waitDebrief('32-security-debrief');

// ─────────── Безопасность, смена 4: Валентина Петровна узнаёт стажёра ───────────
await page.click('.screen-wrap.show .btn.ghost');
await wait(900);
await ev(() => { const ps = window.__bank.progress.profs.security; ps.unlocked = 5; });
await page.click('.screen-wrap.show .btn.ghost');
await wait(2600);
await startShift('security', 4);
t0 = Date.now();
while (Date.now() - t0 < 40000) {
  const st = await ev(() => ({ target: window.__bank.target, brief: document.querySelector('.panel.brief:not(.mentor) .btn.primary'), case: !!document.querySelector('.panel.ep2 .case-main') }));
  if (st.case) { await wait(1400); await shot('40-security-case'); break; }
  const briefBtn = await ev(() => { const b = document.querySelector('.panel.brief .btn.primary'); return b ? !b.classList.contains('hidden') : null; });
  if (briefBtn === false) { await page.click('.panel.brief .brief-lines').catch(() => {}); await wait(300); continue; }
  if (briefBtn === true) { await shot('39-security-brief'); await page.click('.panel.brief .btn.primary'); await wait(1500); continue; }
  if (st.target) { await ev(() => window.__bank.hit()); await wait(1400); continue; }
  await wait(300);
}
console.log('story:', JSON.stringify(await ev(() => window.__bank.progress.story)));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
