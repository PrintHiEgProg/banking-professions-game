// Все экраны вне смен: титул, приветствие с пропуском, холл, терминал, двери, кабинет, заставка смены,
// пауза, «Как играть», альбом, пропуск, стена благодарностей, подсказки обучения.
// node screens.mjs [w] [h] [tours=0|1]
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [wArg = '1366', hArg = '768', toursArg = '0'] = process.argv.slice(2);
const tag = `scr-${wArg}x${hArg}`;
const mobile = Number(wArg) < 900;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
const shot = async (n) => { console.log('shot', n); const i = await audit(page, `${tag} ${n}`); if (i.length) console.log(`[${n}]`, i.join(' | ')); await page.screenshot({ path: `shots/${tag}-${n}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
page.setDefaultTimeout(9000);
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate((tours) => { localStorage.clear(); if (tours !== '1') localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); }, toursArg);
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Константин');
await page.click('.av-btn:nth-child(2)');
await shot('00-title');
await page.click('#btn-start');
await wait(400);
await page.click('.intro-skip');
await page.waitForSelector('.panel.brief.mentor .btn.primary:not(.hidden)', { timeout: 20000 }).catch(() => {});
for (let i = 0; i < 8; i++) { if (await page.$('.panel.brief.mentor .btn.primary:not(.hidden)')) break; await page.click('.panel.brief.mentor .brief-lines').catch(() => {}); await wait(250); }
await shot('00b-welcome');
await dismissMentor(page, null);
await wait(300);
await page.evaluate(() => { const p = window.__bank.progress; Object.assign(p.story, { gran: 'saved', call: 'won', maxim: 'saved', misha: 'reached', mishaScam: true, artyom: 'reached', bakery: 'good', tail: 'caught' }); window.__bank.world.rooms.lobby.setStory(p); });
await wait(900);
await shot('01-lobby-tutorial');
const tap = async (sel) => { await page.click(sel); await wait(700); };
// терминал очереди
await page.evaluate(() => { window.__bank.interact({ id: 'kiosk' }); });
await wait(1800);
await shot('02-kiosk');
await tap('.screen-wrap.show .btn.ghost');
await wait(1200);
// дверь кабинета
await page.evaluate(() => { window.__bank.interact({ id: 'door_credit' }); });
await wait(1800);
await shot('03-door-card');
await tap('.screen-wrap.show .btn.ghost');
await wait(1200);
// наставник
await page.evaluate(() => { window.__bank.interact({ id: 'mentor' }); });
await wait(1500);
for (let i = 0; i < 8; i++) { await page.click('.panel.brief.mentor .brief-lines').catch(() => {}); await wait(200); }
await wait(600);
await shot('04-mentor-news');
await page.click('.panel.brief.mentor .btn.primary');
await wait(1500);
// стена благодарностей
await page.evaluate(() => { window.__bank.interact({ id: 'thanks' }); });
await wait(1800);
await shot('05-thanks');
await tap('.screen-wrap.show .btn.primary');
await wait(1200);
// пропуск, альбом, пауза, «как играть»
await tap('#btn-badge');
await shot('06-badge');
// из пропуска — в профиль стажёра (пока закрыт: профессии ещё не попробованы)
await tap('.screen-wrap.show .btn.primary');
await wait(600);
await shot('06b-profile');
await tap('.screen-wrap.show .btn.primary');
if (mobile) { await tap('#btn-pause'); await tap('#p-album'); } else await tap('#btn-album');
await shot('07-album');
await tap('.screen-wrap.show .btn.primary');
await tap('#btn-pause');
await shot('08-pause');
await tap('#p-howto');
await shot('09-howto');
await tap('#howto-close');
await tap('#p-resume');
// кабинет и заставка смены
await page.evaluate(() => { window.__bank.progress.profs.cash.unlocked = 5; window.__bank.enterRoomById('cash'); });
await page.waitForSelector('.screen-wrap.show .screen-card.cabinet', { timeout: 15000 });
await wait(600);
await shot('10-cabinet');
await page.click('.screen-wrap.show .screen-card.cabinet .btn.primary');
await page.waitForSelector('.screen-wrap.show .screen-card.intro-card-shift', { timeout: 15000 });
await wait(600);
await shot('11-shift-intro');
await page.click('.screen-wrap.show .screen-card.intro-card-shift .btn.primary');
await wait(1500);
await page.evaluate(() => window.__bank.hit());
await wait(2200);
await shot('12-cash-plan');
if (toursArg === '1') {
  for (let i = 0; i < 4; i++) { if (!(await page.$('.tour-bubble'))) break; await shot(`13-tour-${i}`); await page.click('.tour-bubble .btn.primary'); await wait(500); }
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
