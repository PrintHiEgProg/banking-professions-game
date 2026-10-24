// Профиль стажёра, карьерный стенд, карточка результата, логотип (на нейтральной заглушке), живые люди, двери.
// node profile.mjs [w] [h] [logo=1|0]
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { dismissMentor } from './mentor.inc.mjs';
import { audit } from './audit.inc.mjs';
const [wArg = '1366', hArg = '768', logoArg = '1'] = process.argv.slice(2);
const W = Number(wArg);
const tag = `pf-${wArg}x${hArg}${logoArg === '1' ? '' : logoArg === '2' ? '-deck' : '-nologo'}`;
const mobile = W < 900;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctxB = await browser.newContext({ viewport: { width: W, height: Number(hArg) }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
const page = await ctxB.newPage();
if (logoArg === '2') await page.route('**/brand/*.png', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(new URL('./blank.png', import.meta.url)) }));
if (logoArg === '1') await page.route('**/brand/logo.png', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(new URL('./placeholder-logo.png', import.meta.url)) }));
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL') && !m.text().includes('404')) errors.push('console: ' + m.text()); });
const shot = async (n) => { console.log('shot', n); const i = await audit(page, `${tag} ${n}`); if (i.length) console.log(`[${n}]`, i.join(' | ')); await page.screenshot({ path: `shots/${tag}-${n}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
page.setDefaultTimeout(9000);
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Константин');
await page.click('.av-btn:nth-child(3)');
await wait(300);
await shot('00-title');
await page.click('#btn-start');
await wait(400);
await page.click('.intro-skip');
await dismissMentor(page, null);
await wait(400);
const pose = async (pos, yaw, pitch = -0.05, ms = 900) => { await page.evaluate(([p, y, pt]) => window.__bank.controls.setPose(p, y, pt), [pos, yaw, pitch]); await wait(ms); };
// холл с логотипом: табло, ролл-ап
await pose([0, 1.62, 6.6], 0);
await shot('01-lobby');
// двери вблизи: не должно быть «штриховки»
await pose([-6.2, 1.62, -1.0], Math.PI / 2 + 0.55, 0);
await shot('02-doors-left');
await pose([0, 1.62, -4.6], 0, 0.05);
await shot('03-door-security');
// люди смотрят на игрока: подойти к наставнику
const headYaw = () => page.evaluate(() => { const r = window.__bank.world.rooms.lobby; let m = null; r.scene?.traverse?.((o) => { if (!m && o.userData?.head && o.parent?.userData?.interactId === 'mentor') m = o; }); return m ? [+m.userData.head.rotation.y.toFixed(2), +m.rotation.y.toFixed(2)] : null; });
console.log('mentor head/body before', JSON.stringify(await headYaw()));
await pose([0.6, 1.62, 4.4], -0.9, -0.05, 2500);
console.log('mentor head/body near', JSON.stringify(await headYaw()));
await shot('04-mentor-looks');
await pose([-3.0, 1.62, 3.4], 2.6, -0.1, 2200);
await shot('05-sofa-looks');
// карьерный стенд: профиль ещё закрыт
await pose([5.9, 1.62, -0.9], -Math.PI / 2, 0, 900);
await shot('06-career-stand-empty');
await page.evaluate(() => { window.__bank.interact({ id: 'career' }); });
await wait(1800);
await shot('07-profile-locked');
await page.click('.screen-wrap.show .btn.primary');
await wait(1500);
// подставить прогресс: 5 профессий попробованы (первые смены), ответы «понравилось» и исходы историй
await page.evaluate(() => {
  const p = window.__bank.progress;
  const set = (id, stars, like) => { p.profs[id].best = Object.fromEntries(stars.map((s, i) => [i + 1, { stars: s, score: 300 }])); p.profs[id].like = like; };
  set('teller', [2], 2);
  set('credit', [3, 2], 2);
  set('advisor', [2], 1);
  set('cash', [3], 3);
  set('security', [3, 3], 3);
  Object.assign(p.story, { gran: 'saved', maxim: 'lost', misha: 'failed', tail: 'caught', call: 'won' });
  p.profileShown = false;
});
// выйти из холла и вернуться — наставник покажет профиль сам
await page.evaluate(() => window.__bank.enterRoomById('credit'));
await wait(2500);
// карточка кабинета: «← В холл»
await page.evaluate(() => document.querySelector('.screen-wrap.show .btn.ghost')?.click());
await wait(3500);
const fresh = await page.evaluate(() => !!document.querySelector('.screen-card.profile-card .pf-match'));
console.log('profile revealed on lobby entry:', fresh);
await wait(1800);
await shot('08-profile-fresh');
await page.evaluate(() => document.querySelector('.screen-card.profile-card').scrollTo(0, 99999));
await wait(400);
await shot('09-profile-bottom');
// карточка для друзей
await page.click('.screen-card.profile-card .btn.primary');
await page.waitForSelector('.share-img', { timeout: 15000 });
await wait(800);
await shot('10-share');
const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('.share-card a.btn.primary');
const d = await dl;
if (d) { await d.saveAs(`shots/${tag}-card.png`); console.log('downloaded', d.suggestedFilename()); } else console.log('no download event');
await page.click('.share-card .btn.ghost');
await wait(600);
await page.click('.screen-card.profile-card .row.center .btn.ghost');
await wait(1500);
// стенд теперь показывает результат
await pose([5.9, 1.62, -0.9], -Math.PI / 2, 0, 900);
await shot('11-career-stand-ready');
console.log('profileShown', await page.evaluate(() => window.__bank.progress.profileShown));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
