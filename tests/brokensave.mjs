// Кабинет не должен «зависать» пустым окном: старое/повреждённое сохранение и ошибка внутри кабинета.
// node brokensave.mjs [prof=advisor] [w] [h]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [prof = 'advisor', wArg = '1366', hArg = '768'] = process.argv.slice(2);
const mobile = Number(wArg) < 900;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource|сломалось-нарочно/.test(m.text())) errors.push('console: ' + m.text()); });
const out = 'shots/broken';
fs.mkdirSync(out, { recursive: true });
const shot = (n) => page.screenshot({ path: `${out}/${prof}-${wArg}-${n}.png` });
const state = () => page.evaluate(() => ({
  mode: window.__bank?.mode,
  wrap: document.querySelector('.screen-wrap.show .screen-card')?.className || null,
  buttons: [...document.querySelectorAll('.screen-wrap.show .screen-card button')].map((b) => b.textContent.trim().slice(0, 30)),
  text: document.querySelector('.screen-wrap.show .screen-card p')?.innerText.slice(0, 200) || null,
  fade: document.querySelector('#fade').classList.contains('on'),
}));
await page.goto('http://localhost:8765/index.html?debug');
// повреждённое сохранение «из старой версии»
await page.evaluate((p) => {
  localStorage.clear();
  localStorage.setItem('bank.notours', '1');
  localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false, nickname: 'Тест' }));
  const ids = ['teller', 'credit', 'advisor', 'cash', 'security', 'hr', 'devops'];
  const profs = Object.fromEntries(ids.map((id) => [id, { shift: 1, stage: 0, unlocked: 1, best: {}, pending: null, data: {} }]));
  profs[p] = { shift: 0, stage: '0', unlocked: 0, best: { 1: { stars: 7, score: 100 }, 2: 3, 6: { stars: 2 } }, data: null, pending: 'x' };
  localStorage.setItem('bankjobs.save.v3', JSON.stringify({ version: 3, nickname: 'Тест', difficulty: 'normal', profs, stats: { clients: 0, money: 0, score: 0 }, knowledge: [], evidence: [], rule: null, outcome: { call: null, trace: null }, board: null, current: null, certificate: false, story: {}, avatar: 0, savedAt: Date.now(), profileShown: true, mentorMet: true, tutorialDone: true }));
}, prof);
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.click('#btn-continue', { noWaitAfter: true });
await page.waitForTimeout(2500);
// приветствие наставника, если есть
for (let i = 0; i < 20; i++) {
  const b = await page.$('.panel.brief.mentor .btn.primary:not(.hidden)');
  if (b) { await b.click(); await page.waitForTimeout(1200); break; }
  await page.click('.panel.brief.mentor .brief-lines').catch(() => {});
  if (!(await page.$('.panel.brief.mentor'))) break;
  await page.waitForTimeout(300);
}
await page.waitForFunction(() => window.__bank?.mode === 'lobby' && !document.querySelector('.panel.brief'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);
await page.evaluate((p) => { window.__bank.interact({ id: `door_${p}` }); }, prof);
await page.waitForFunction(() => document.querySelector('.screen-wrap.show .screen-card.prof-card button.primary'), null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.primary')?.click());
await page.waitForFunction(() => document.querySelector('.screen-wrap.show .screen-card.cabinet button.primary'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(500);
let s = await state();
console.log('1 повреждённое сохранение → кабинет:', JSON.stringify(s));
console.log('  состояние профессии:', JSON.stringify(await page.evaluate((p) => window.__bank.progress.profs[p], prof)));
await shot('1-cabinet');
const okCabinet = s.wrap?.includes('cabinet') && s.buttons.some((b) => b.includes('Смена'));

// ошибка внутри кабинета: setShift падает
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.ghost')?.click());
await page.waitForFunction(() => window.__bank.mode === 'lobby' && !document.querySelector('.screen-wrap.show'), null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
await page.evaluate((p) => { const r = window.__bank.world.rooms[p]; r.__orig = r.setShift; r.setShift = () => { throw new Error('сломалось-нарочно'); }; window.__bank.interact({ id: `door_${p}` }); }, prof);
await page.waitForFunction(() => document.querySelector('.screen-wrap.show .screen-card.prof-card button.primary'), null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.primary')?.click());
await page.waitForFunction(() => document.querySelector('.screen-wrap.show .screen-card.confirm'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(500);
s = await state();
console.log('2 ошибка в кабинете → окно восстановления:', JSON.stringify(s));
await shot('2-recover');
const okRecover1 = s.wrap?.includes('confirm') && s.buttons.length === 2 && !s.fade;
// «Начать смену заново» — снова падает → вторая попытка предлагает сброс
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.primary')?.click());
await page.waitForTimeout(3500);
s = await state();
console.log('3 повтор → второе окно:', JSON.stringify(s));
await shot('3-recover2');
const okRecover2 = s.wrap?.includes('confirm') && s.buttons.some((b) => b.includes('Сбросить'));
// чиним «поломку» и жмём «Сбросить и войти» — кабинет открывается
await page.evaluate((p) => { const r = window.__bank.world.rooms[p]; r.setShift = r.__orig; }, prof);
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.primary')?.click());
await page.waitForTimeout(3500);
s = await state();
console.log('4 после сброса:', JSON.stringify(s));
await shot('4-after');
const okAfter = s.wrap?.includes('cabinet');
console.log(okCabinet && okRecover1 && okRecover2 && okAfter ? 'PASS' : 'FAIL', { okCabinet, okRecover1, okRecover2, okAfter });
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
