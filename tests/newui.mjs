// Снимки общих экранов с 7 профессиями: титул, терминал, стенд, профиль, карточка, альбом, сертификат
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const [wArg = '1366', hArg = '768'] = process.argv.slice(2);
const mobile = wArg !== '1366';
const tag = mobile ? `ui-${wArg}x${hArg}` : 'ui';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('crash', () => console.log('PAGE CRASH'));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) console.log('console', m.text().slice(0, 300)); });
const S = (n) => page.screenshot({ path: `shots/${tag}-${n}.png` });
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await S('00-title');
await page.fill('#nick', 'Тест');
await page.click('#btn-start', { noWaitAfter: true });
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page);
// прогресс: сыграно по смене в 6 профессиях, разные звёзды и «нравится»
await page.evaluate(() => {
  const p = window.__bank.progress;
  const set = { teller: [2, 2], credit: [1, 1], advisor: [2, 2], cash: [3, 3], security: [3, 2], hr: [3, 3], devops: [3, 3] };
  for (const [id, [s, like]] of Object.entries(set)) { p.profs[id].best = { 1: { stars: s, score: 100 }, 2: { stars: s, score: 100 } }; p.profs[id].like = like; }
  p.story = { ...p.story, insider: 'caught', stuffing: 'stopped', masha: 'stayed', night: 'held', gran: 'saved' };
});
await page.evaluate(() => { window.__bank.interact({ id: 'kiosk' }); });
await page.waitForTimeout(1500);
await S('01-kiosk');
await page.click('.screen-wrap.show .btn.ghost');
await page.waitForTimeout(1500);
await page.waitForTimeout(1500);
await page.click('#btn-badge');
await page.waitForTimeout(1200);
await S('02a-badge');
await page.click('.screen-wrap.show .btn.primary');
await page.waitForTimeout(1800);
await S('02-profile');
await page.evaluate(() => document.querySelector('.screen-wrap.show .screen-card').scrollTo(0, 99999));
await page.waitForTimeout(400);
await S('03-profile-bottom');
const share = await page.$('.screen-wrap.show .btn:has-text("Карточка")');
if (share) {
  await share.click();
  await page.waitForTimeout(2500);
  await S('04-share');
}
await page.evaluate(() => document.querySelectorAll('.screen-wrap').forEach((w) => w.remove()));
await page.waitForTimeout(800);
await page.click('#btn-album');
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('.screen-wrap.show .screen-card').scrollTo(0, 99999));
await page.waitForTimeout(300);
await S('05-album-bottom');
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
