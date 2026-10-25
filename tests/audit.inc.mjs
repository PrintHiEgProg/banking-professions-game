// Аудит интерфейса: что выходит за экран, торчит из панели или обрезано без прокрутки
import fs from 'node:fs';
export const AUDIT_LOG = new URL('./audit.log', import.meta.url).pathname;
export async function audit(page, label) {
  const issues = await page.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const out = [];
    const sel = (n) => {
      if (!n || !n.tagName) return '?';
      const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      return `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${cls ? '.' + cls : ''}`;
    };
    const visible = (n) => {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = n.getBoundingClientRect();
      return r.width > 0.5 && r.height > 0.5;
    };
    const scrollY = (n) => ['auto', 'scroll'].includes(getComputedStyle(n).overflowY);
    const scrollX = (n) => ['auto', 'scroll'].includes(getComputedStyle(n).overflowX);
    const inScroll = (n, root, axis) => {
      for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) if (axis === 'x' ? scrollX(p) && p.scrollWidth > p.clientWidth : scrollY(p)) return true;
      return false;
    };
    if (document.documentElement.scrollWidth > vw + 1) out.push(`страница скроллится вбок: ${document.documentElement.scrollWidth}px > ${vw}px`);
    const fixed = '#overlay-root .panel.show, .screen-wrap.show .screen-card, #toasts .toast.show, #hover-label.show, #caption.show, #objective.show, #hud, #hud-buttons, #tut.show, .tour-bubble, #title:not(.gone) .title-inner, #pause:not(.hidden) .menu-card, #howto:not(.hidden) .menu-card';
    for (const r of document.querySelectorAll(fixed)) {
      if (!visible(r)) continue;
      const b = r.getBoundingClientRect();
      const scr = scrollY(r) || inScroll(r, document.body, 'y');
      if (b.left < -2 || b.right > vw + 2) out.push(`${sel(r)} за экраном по ширине: ${Math.round(b.left)}…${Math.round(b.right)} из ${vw}`);
      if ((b.top < -2 && !scr) || (b.bottom > vh + 2 && !scr)) out.push(`${sel(r)} за экраном по высоте: ${Math.round(b.top)}…${Math.round(b.bottom)} из ${vh}`);
    }
    for (const root of document.querySelectorAll('#overlay-root .panel.show, .screen-wrap.show .screen-card, .tour-bubble, #title:not(.gone) .title-inner')) {
      if (!visible(root)) continue;
      const rb = root.getBoundingClientRect();
      let n = 0;
      for (const el of root.querySelectorAll('*')) {
        if (n > 6) break;
        if (!visible(el) || el.closest('svg') && el.tagName !== 'svg') continue;
        const b = el.getBoundingClientRect();
        const left = Math.min(rb.left, 0) - 2;
        const right = Math.max(rb.right, 0) + 2;
        if ((b.right > right || b.left < left) && !inScroll(el, root, 'x')) {
          // торчит за правый край панели (и не в горизонтальной прокрутке)
          if (b.right > Math.min(rb.right, vw) + 2 || b.left < Math.max(rb.left, 0) - 2) {
            out.push(`${sel(el)} торчит из ${sel(root)}: ${Math.round(b.left)}…${Math.round(b.right)} (панель ${Math.round(rb.left)}…${Math.round(rb.right)})`);
            n++;
          }
        }
      }
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(el);
        if (!visible(el) || !el.children.length) continue;
        if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 6 && el.clientHeight > 40) out.push(`обрезано по высоте без прокрутки: ${sel(el)} ${el.scrollHeight}>${el.clientHeight}`);
        if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 40 && !/nowrap/.test(cs.whiteSpace)) out.push(`обрезано по ширине: ${sel(el)} ${el.scrollWidth}>${el.clientWidth}`);
      }
    }
    // «сломанный» текст: [object …], undefined, NaN в видимых окнах
    for (const root of document.querySelectorAll('#overlay-root .panel.show, .screen-wrap.show .screen-card, .tour-bubble, #objective.show, #caption.show')) {
      const t = root.innerText || '';
      const m = t.match(/\[object \w+\]|\bundefined\b|\bNaN\b|\bnull\b/);
      if (m) out.push(`сломанный текст «${m[0]}» в ${sel(root)}: …${t.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\s+/g, ' ')}…`);
    }
    // кнопки, до которых не добраться: за пределами экрана и без прокрутки к ним
    for (const btn of document.querySelectorAll('#overlay-root .panel.show button, .screen-wrap.show button')) {
      if (!visible(btn)) continue;
      const b = btn.getBoundingClientRect();
      if ((b.bottom > vh + 2 || b.top < -2) && !inScroll(btn, document.body, 'y')) out.push(`кнопка вне экрана без прокрутки: «${btn.textContent.trim().slice(0, 30)}» ${Math.round(b.top)}…${Math.round(b.bottom)}`);
      if ((b.right > vw + 2 || b.left < -2) && !inScroll(btn, document.body, 'x')) out.push(`кнопка за экраном по ширине: «${btn.textContent.trim().slice(0, 30)}» ${Math.round(b.left)}…${Math.round(b.right)}`);
    }
    // фиксированные элементы HUD не должны наезжать друг на друга
    const hudEls = ['#objective.show', '#stats', '#hud-buttons', '#tut.show', '#toasts .toast.show', '#joystick'].map((q) => [...document.querySelectorAll(q)]).flat().filter(visible);
    const btns = document.querySelector('#hud-buttons');
    for (const a of hudEls) for (const b of hudEls) {
      if (a === b || a.contains(b) || b.contains(a)) continue;
      const r1 = a.getBoundingClientRect();
      const r2 = b.getBoundingClientRect();
      const ix = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
      const iy = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
      if (ix > 4 && iy > 4 && (a === btns || a.id === 'objective' || a.id === 'stats') && sel(a) < sel(b)) out.push(`наезжают друг на друга: ${sel(a)} и ${sel(b)}`);
    }
    // окно поверх кнопок HUD: заголовок окна не должен прятаться под ними
    if (btns && visible(btns)) {
      const br = btns.getBoundingClientRect();
      for (const p of document.querySelectorAll('#overlay-root .panel.show .brief-head, #overlay-root .panel.show .term-title, #overlay-root .panel.show .term-user, #overlay-root .panel.show .tour-btn')) {
        if (!visible(p)) continue;
        const r = p.getBoundingClientRect();
        if (Math.min(r.right, br.right) - Math.max(r.left, br.left) > 4 && Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top) > 4) out.push(`кнопки HUD закрывают ${sel(p)}`);
      }
    }
    return [...new Set(out)];
  });
  const vp = page.viewportSize();
  if (issues.length) fs.appendFileSync(AUDIT_LOG, `## ${vp.width}x${vp.height} ${label}\n${issues.map((x) => '- ' + x).join('\n')}\n`);
  return issues;
}
