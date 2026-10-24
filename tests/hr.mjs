// Игрок за HR-специалиста: node hr.mjs <shift> [diff] [mode=good|bad] [shots=1] [w] [h]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [shiftArg = '1', diff = 'normal', mode = 'good', shotsArg = '1', wArg = '1366', hArg = '768'] = process.argv.slice(2);
const N = Number(shiftArg);
const good = mode === 'good';
const shots = shotsArg === '1';
const mobile = wArg !== '1366';
const tag = `hr${N}-${diff}-${mode}${mobile ? `-${wArg}x${hArg}` : ''}`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
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
await page.evaluate((story) => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); }, null);
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Тест');
await page.click(`.diff-btn[data-diff="${diff}"]`);
await page.click('#btn-start', { noWaitAfter: true });
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
await page.evaluate((st) => {
  const p = window.__bank.progress;
  p.story.maxim = 'saved';
  p.story.gran = 'saved';
  const ps = p.profs.hr;
  ps.unlocked = 5;
  ps.shift = st;
  window.__bank.enterRoomById('hr');
}, N);
await page.waitForTimeout(1500);
await shot('0-cabinet');
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(700);
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(1500);
await shot('1-room');

const BAD_SEG = ['Девушка', 'славянской', 'Прописка', 'Без детей'];
const GOOD_Q = ['недовольным клиентом', 'ошиблись с деньгами', 'работать в банке'];
const BAD_Q = ['дети', 'возраст', 'верующий'];
const INVITE = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0];
const BIN_OF = { 'Погашена': 3, 'Медкомиссия и тест': 0, 'Водительский стаж': 0, 'кражу': 2, 'Брат': 3, 'Медкомиссия пройдена': 0, 'Долг': 1, 'Отец': 3, 'профсоюзе': 3 };
const t0 = Date.now();
let lastAct = Date.now();
let badChecks = 0;
while (Date.now() - t0 < 240000) {
  const st = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      wrap: q('.screen-wrap.show .screen-card')?.className || null,
      panel: q('#overlay-root.active .panel')?.className || null,
      target: window.__bank.target,
      seg: !!q('.hr-seg:not(.struck):not(.kept)') && !!q('.hr-ad:not(.published)'),
      qs: [...document.querySelectorAll('.hr-qs button:not(:disabled)')].map((b) => b.textContent),
      next: q('.hr-ask > .btn:not(:disabled)')?.textContent || null,
      sign: !!q('.hr-check-col .hr-sign:not(:disabled)'),
      ck: !!q('.hr-ck:not(:disabled):not(.trap)'),
      offer: !!q('.hr-offer:not(:disabled)'),
      pressure: !!q('.hr-press .choice:not(:disabled)'),
      cv: q('.hr-cv-head small')?.textContent || null,
      cvBusy: !!q('.hr-cv.out-yes, .hr-cv.out-no'),
      rq: !!q('.hr-rq:not(:disabled)') && !!q('.hr-req-list') && !q('.hr-rq.on.right, .hr-rq.right, .hr-rq.wrong, .hr-rq.miss, .hr-rq.skip'),
      consent: !!q('.hr-consent .hr-sign:not(:disabled)'),
      find: !!q('.hr-find:not(.right):not(.wrong)'),
      slot: !!q('.onb-card:not(.used)') && !!q('.onb-slot:not(.full)'),
      dlg: !!q('.dlg-choices button:not(:disabled)'),
      sideBtn: [...document.querySelectorAll('.hr-side .btn:not(:disabled), .hr-ask .btn.primary:not(:disabled)')].map((b) => b.textContent),
      prob: !!q('.panel.hr.prob .btn.primary:not(.hidden)'),
      vacPub: !!q('.hr-side .btn.primary.big:not(:disabled)') && !!q('.hr-ad:not(.published)'),
    };
  });
  if (Date.now() - lastAct > 30000) {
    console.log('STUCK', JSON.stringify(st));
    await shot('stuck', false);
    break;
  }
  const act = async (fn, wait = 400) => {
    await page.evaluate(fn.f, fn.a);
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
  if (st.prob) {
    await page.waitForTimeout(600);
    await shot('8-probation');
    await act({ f: () => document.querySelector('.panel.hr.prob .btn.primary').click() }, 900);
    continue;
  }
  // вакансия
  if (st.panel.includes('vac')) {
    await shot('2-vacancy');
    if (st.seg) {
      const clicked = await page.evaluate(({ bad, good }) => {
        const segs = [...document.querySelectorAll('.hr-seg:not(.struck):not(.kept)')];
        const pick = good ? segs.find((s) => bad.some((b) => s.textContent.includes(b))) : segs.find((s) => !bad.some((b) => s.textContent.includes(b)));
        if (pick) pick.click();
        return !!pick;
      }, { bad: BAD_SEG, good });
      lastAct = Date.now();
      await page.waitForTimeout(350);
      if (clicked) continue;
    }
    if (st.vacPub) {
      await shot('3-vacancy-done');
      await act({ f: () => document.querySelector('.hr-side .btn.primary.big').click() }, 2400);
    } else await page.waitForTimeout(300);
    continue;
  }
  // собеседование и STAR
  if (st.panel.includes('iv')) {
    if (st.pressure) {
      await shot('6-pressure');
      await act({ f: (g) => { const b = [...document.querySelectorAll('.hr-press .choice')]; (g ? b.find((x) => x.classList.contains('calm')) : b.find((x) => x.classList.contains('pressure'))).click(); }, a: good }, 2000);
      continue;
    }
    if (st.offer) {
      await shot('5-decision');
      await act({ f: ({ g, n }) => {
        const rep = document.querySelector('.hr-report input');
        if (g && rep && !rep.checked) rep.click();
        const id = n === 3 ? (g ? 'denis' : 'veronika') : g ? 'olga' : 'ruslan';
        document.querySelector(`.hr-offer[data-id="${id}"]`).click();
      }, a: { g: good, n: N } }, 900);
      continue;
    }
    if (st.sign && good) {
      await shot('4-checks');
      await act({ f: () => document.querySelector('.hr-check-col .hr-sign:not(:disabled)').click() }, 900);
      continue;
    }
    if (st.ck) {
      await act({ f: (g) => { const all = [...document.querySelectorAll('.hr-ck:not(:disabled)')]; const b = g ? all.find((x) => !x.classList.contains('trap')) : all[0]; b.click(); }, a: good }, 650);
      if (!good && ++badChecks >= 3) {
        // плохой игрок: пару раз жмёт без согласия, потом сдаётся и идёт к решению
        await act({ f: () => [...document.querySelectorAll('.hr-ask .btn.primary')].find((b) => b.textContent.includes('К решению')).click() }, 700);
      }
      continue;
    }
    if (st.sideBtn.some((t) => t.includes('К решению')) && !st.ck) {
      await shot('4b-checks-done');
      await act({ f: () => [...document.querySelectorAll('.hr-ask .btn.primary')].find((b) => b.textContent.includes('К решению')).click() }, 700);
      continue;
    }
    if (st.qs.length) {
      await shot(N === 3 ? '2-star' : '2-interview');
      const did = await page.evaluate(({ g, n, goodQ, badQ }) => {
        const bs = [...document.querySelectorAll('.hr-qs button:not(:disabled)')];
        let b;
        if (n === 3) b = g ? bs.find((x) => /задача|ВЫ|закончилось/.test(x.textContent)) : bs.find((x) => /диплом|замужем/.test(x.textContent)) || bs[0];
        else b = g ? bs.find((x) => goodQ.some((q) => x.textContent.includes(q))) : bs.find((x) => badQ.some((q) => x.textContent.includes(q))) || bs[0];
        if (b) b.click();
        return !!b;
      }, { g: good, n: N, goodQ: GOOD_Q, badQ: BAD_Q });
      lastAct = Date.now();
      await page.waitForTimeout(did ? 700 : 300);
      if (did) continue;
    }
    if (st.next) {
      await shot('3-answers');
      await act({ f: () => document.querySelector('.hr-ask > .btn:not(:disabled)').click() }, 800);
      continue;
    }
    await page.waitForTimeout(300);
    continue;
  }
  // поток резюме
  if (st.panel.includes('scr')) {
    if (st.cv && !st.cvBusy) {
      const i = Number(st.cv.match(/(\d+) из/)[1]) - 1;
      if (i === 0) await shot('2-resume');
      if (i === 4) await shot('3-resume-5');
      const invite = good ? INVITE[i] : 1 - INVITE[i];
      await act({ f: (inv) => document.querySelector(inv ? '.hr-btns .btn.safe' : '.hr-btns .btn.danger').click(), a: invite }, 1200);
      continue;
    }
    await page.waitForTimeout(400);
    continue;
  }
  // проверка инкассаторов
  if (st.panel.includes('chk')) {
    if (st.rq) {
      await shot('2-requests');
      await act({ f: (g) => {
        const want = g ? ['несудимости', 'Медкомиссия', 'Долги'] : ['религию', 'профсоюзе', 'родственников'];
        for (const b of document.querySelectorAll('.hr-rq')) if (want.some((w) => b.textContent.includes(w))) b.click();
        [...document.querySelectorAll('.hr-side .btn.primary')].find((b) => b.textContent.includes('Отправить')).click();
      }, a: good }, 1200);
      continue;
    }
    if (st.consent) {
      await shot('3-consent');
      await act({ f: () => document.querySelector('.hr-consent .hr-sign:not(:disabled)').click() }, 900);
      continue;
    }
    if (st.find) {
      await shot('4-dossier');
      await act({ f: ({ g, map }) => {
        for (const f of document.querySelectorAll('.hr-find')) {
          const t = f.textContent;
          const key = Object.keys(map).find((k) => t.includes(k));
          const right = key != null ? map[key] : 0;
          const idx = g ? right : (right + 1) % 4;
          f.querySelectorAll('.hr-bin')[idx].click();
        }
        [...document.querySelectorAll('.hr-side .btn.primary')].find((b) => b.textContent.includes('Проверить')).click();
      }, a: { g: good, map: BIN_OF } }, 1800);
      await shot('5-dossier-checked');
      continue;
    }
    if (st.offer) {
      await shot('6-decision');
      await act({ f: (g) => {
        if (g) [...document.querySelectorAll('.hr-side .btn')].find((b) => b.textContent.includes('Обсудить'))?.click();
        document.querySelector(`.hr-offer[data-id="${g ? 'sergey' : 'igor'}"]`).click();
      }, a: good }, 1500);
      continue;
    }
    const nx = st.sideBtn.find((t) => /Дальше|К решению/.test(t));
    if (nx) {
      await act({ f: (txt) => [...document.querySelectorAll('.hr-side .btn')].find((b) => b.textContent === txt).click(), a: nx }, 800);
      continue;
    }
    await page.waitForTimeout(300);
    continue;
  }
  // первый день
  if (st.panel.includes('onb')) {
    if (st.dlg) {
      await shot('5-talk');
      await act({ f: (g) => { const bs = [...document.querySelectorAll('.dlg-choices button:not(:disabled)')]; (g ? bs.find((b) => b.classList.contains('calm')) || bs[0] : bs.find((b) => b.classList.contains('pressure')) || bs[0]).click(); }, a: good }, 2200);
      continue;
    }
    if (st.slot) {
      await shot('2-plan');
      await act({ f: (g) => {
        const order = g ? ['pass', 'mentor', 'safety', 'tour', 'lunch', 'talk'] : ['alone', 'test', 'paper', 'pass', 'mentor', 'lunch'];
        const id = order.find((x) => !document.querySelector(`.onb-card[data-id="${x}"]`).classList.contains('used'));
        document.querySelector(`.onb-card[data-id="${id}"]`).click();
      }, a: good }, 250);
      continue;
    }
    if (st.sideBtn.some((t) => t.includes('План готов'))) {
      await shot('3-plan-full');
      await act({ f: () => [...document.querySelectorAll('.hr-side .btn')].find((b) => b.textContent.includes('План готов')).click() }, 3000);
      continue;
    }
    if (st.sideBtn.some((t) => t.includes('Заявка в IT'))) {
      await shot('4-access');
      await act({ f: (g) => {
        const want = g ? ['почта', 'Учебная', 'Касса'] : ['база клиентов', 'администратора', 'почта'];
        for (const b of document.querySelectorAll('.hr-rq')) if (want.some((w) => b.textContent.includes(w))) b.click();
        [...document.querySelectorAll('.hr-side .btn')].find((b) => b.textContent.includes('Заявка в IT')).click();
      }, a: good }, 3000);
      continue;
    }
    await page.waitForTimeout(300);
    continue;
  }
  await page.waitForTimeout(300);
}
if (!shotFlags['9-debrief']) { await shot('end', false); console.log('END STATE', JSON.stringify(await page.evaluate(() => ({ panel: document.querySelector('#overlay-root.active .panel')?.className, wrap: document.querySelector('.screen-wrap.show .screen-card')?.className, target: window.__bank.target, prog: document.querySelector('.term-progress')?.textContent })))); }
const story = await page.evaluate(() => JSON.stringify(window.__bank.progress.story));
console.log('story', story);
console.log(`${tag} time=${Math.round((Date.now() - t0) / 1000)}s`);
console.log(errors.length ? errors.join('\n---\n') : 'NO ERRORS');
await browser.close();
