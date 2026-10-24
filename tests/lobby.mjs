// Холл: титульный экран с выбором стажёра, приветствие с пропуском, отделение банка, живой холл
import { chromium } from 'playwright';
import { dismissMentor } from './mentor.inc.mjs';
const [wArg = '1366', hArg = '768'] = process.argv.slice(2);
const tag = `lobby-${wArg}x${hArg}`;
const mobile = Number(wArg) < 900;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) }, hasTouch: mobile, isMobile: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `shots/${tag}-${n}.png` });
await page.goto('http://localhost:8765/index.html?debug');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bank.notours', '1'); localStorage.setItem('rubezh.settings.v1', JSON.stringify({ quality: 'low', sound: false })); });
await page.reload();
await page.waitForFunction(() => !document.querySelector('#loading.show'), null, { timeout: 30000 });
await page.fill('#nick', 'Егор');
await page.click('.av-btn:nth-child(3)');
await shot('0-title');
await page.click('#btn-start');
await page.waitForTimeout(400);
await page.click('.intro-skip');
await dismissMentor(page, `shots/${tag}-1-welcome.png`);
await page.waitForTimeout(800);
await shot('2-lobby');
const poses = [[[0, 1.62, 6.6], 0], [[-2, 1.62, 1.5], 0.6], [[3, 1.62, 1.0], -0.5], [[-5.5, 1.62, -1], 1.57], [[5, 1.62, 3.5], -2.4]];
await page.evaluate(() => { const p = window.__bank.progress; Object.assign(p.story, { gran: 'saved', call: 'won', maxim: 'saved', misha: 'reached', mishaScam: true, artyom: 'reached', bakery: 'good', tail: 'caught' }); window.__bank.world.rooms.lobby.setStory(p); });
for (const [i, [pos, yaw]] of poses.entries()) {
  await page.evaluate(([pos, yaw]) => window.__bank.controls.setPose(pos, yaw, -0.08), [pos, yaw]);
  await page.waitForTimeout(500);
  await shot(`3-pose${i}`);
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
