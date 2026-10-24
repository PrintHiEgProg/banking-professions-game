// Профиль стажёра (какая профессия подходит) и карточка результата, которой можно поделиться.
import { PROFESSIONS } from './data/professions.js';
import { TRAITS, TRAIT_IDS, BANK_PATH, careerProfile, whyLines } from './data/career.js';
import { audio } from './audio.js';
import { el } from './ui.js';
import { avatarSvg, portrait } from './portraits.js';
import { overlay, staffRank } from './screens.js';
import { MENTOR } from './story.js';
import { BRAND, brandImg, drawBrand } from './brand.js';
import { track } from './analytics.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const studyRow = (prof) => prof.life.find(([i]) => i === '🎓') || null;

function traitBars(traits, cls = '') {
  return el(
    'div',
    { class: `trait-bars ${cls}` },
    TRAIT_IDS.map((t) => el('div', { class: 'tb-row' }, el('span', { class: 'tb-ico' }, TRAITS[t].icon), el('b', {}, TRAITS[t].name), el('div', { class: 'tb-bar' }, el('i', { style: { width: pct(traits[t]) } })), el('small', {}, pct(traits[t])))),
  );
}

function triedStrip(cp) {
  return el(
    'div',
    { class: 'tried-strip' },
    PROFESSIONS.map((p) => el('span', { class: cp.tried.includes(p.id) ? 'on' : '', style: { '--pc': p.color }, title: p.title }, p.icon, el('i', {}, cp.tried.includes(p.id) ? '✓' : ''))),
  );
}

// Экран профиля. fresh — открылся сам, когда игрок попробовал нужное число профессий. preview — режим жюри.
export function profileCard(progress, { fresh = false, preview = false, source = 'other' } = {}) {
  return new Promise((resolve) => {
    const { box: card, close } = overlay('profile-card');
    const box = { append: (...kids) => card.append(...kids.filter(Boolean)), style: card.style };
    const cp = careerProfile(progress);
    track('profile_open', { prof: cp.ready ? cp.top.prof.id : null, data: { source, tried: cp.tried.length } });
    const { rank, stars } = staffRank(progress);
    const done = () => {
      audio.click();
      close();
      resolve();
    };
    box.append(
      el('div', { class: 'pf-top' }, el('span', { class: 'si-top' }, fresh ? '🎉 ПРОФИЛЬ ГОТОВ' : '🧭 ПРОФИЛЬ СТАЖЁРА'), brandImg('pf-brand')),
      el('div', { class: 'pf-head' }, el('div', { class: 'sb-photo', html: avatarSvg(progress.avatar || 0) }), el('div', {}, el('b', {}, progress.nickname), el('small', {}, `${rank} · ★ ${stars}`))),
    );
    const showResult = cp.ready || (preview && cp.tried.length > 0);
    if (!showResult) {
      box.append(
        el('h2', {}, 'Какая профессия банка — твоя?'),
        el('p', { class: 'muted' }, `Сыграй хотя бы одну смену в любых ${cp.need} кабинетах — и профиль покажет, какая работа подходит именно тебе.`),
        triedStrip(cp),
        el('p', { class: 'pf-count' }, `Попробовано: ${cp.tried.length} из ${cp.need} · всего профессий ${PROFESSIONS.length}`),
        cp.evidence > 0 ? el('h4', {}, 'Твой стиль — пока предварительно') : null,
        cp.evidence > 0 ? traitBars(cp.traits) : null,
        el('button', { class: 'btn primary', onClick: done }, 'Понятно'),
      );
      audio.notify();
      return;
    }
    const { top, second } = cp;
    const study = studyRow(top.prof);
    box.style.setProperty('--pc', top.prof.color);
    box.append(
      fresh ? el('div', { class: 'cert-mentor' }, el('span', { class: 'cm-ava', html: portrait('mentor', 'happy') }), el('p', {}, el('b', {}, `${MENTOR.name}: `), `«${progress.nickname}, ты заглянул(а) уже в ${cp.tried.length} кабинетов. Вот что я увидела»`)) : null,
      !cp.ready ? el('p', { class: 'pf-note' }, `Предварительно: попробовано ${cp.tried.length} из ${PROFESSIONS.length} профессий`) : null,
      el('div', { class: 'pf-match' }, el('small', {}, 'Тебе подходит'), el('div', { class: 'pf-prof' }, el('span', {}, top.prof.icon), el('b', {}, top.prof.full)), el('span', { class: 'pf-pill' }, `совпадение ${cp.match}%`)),
      el('ul', { class: 'pf-why' }, whyLines(cp).map((t) => el('li', {}, t))),
      second ? el('p', { class: 'pf-second' }, 'Ещё присмотрись: ', el('b', { style: { color: second.prof.color } }, `${second.prof.icon} ${second.prof.title}`)) : null,
      el('h4', {}, 'Твой стиль'),
      traitBars(cp.traits),
      el('h4', {}, 'Что дальше'),
      el(
        'div',
        { class: 'pf-next' },
        study ? el('div', { class: 'pf-step' }, el('span', {}, '🎓'), el('p', {}, el('b', {}, `${study[1]}: `), study[2])) : null,
        el(
          'div',
          { class: 'pf-bank' },
          el('div', { class: 'pf-bank-head' }, brandImg('pf-bank-logo'), el('p', {}, BANK_PATH.intro)),
          el('ol', {}, BANK_PATH.steps.map(([i, t]) => el('li', {}, el('span', {}, i), t))),
          el('a', { class: 'btn ghost small', href: BRAND.careerUrl, target: '_blank', rel: 'noopener', onClick: () => track('career_click', { prof: top.prof.id }) }, 'Карьера в «Центр-инвест» ↗'),
        ),
      ),
      el('h4', {}, 'Все профессии'),
      el(
        'div',
        { class: 'pf-rank' },
        cp.ranking.map((r, i) => el('div', { class: i === 0 ? 'top' : '', style: { '--pc': r.prof.color } }, el('span', {}, r.prof.icon), el('b', {}, r.prof.title), el('small', {}, r.like ? ['', '😐', '🙂', '😍'][r.like] : r.tried ? '' : 'не пробовал(а)'), el('div', { class: 'tb-bar' }, el('i', { style: { width: pct(Math.min(1, r.total)) } })))),
      ),
      el(
        'div',
        { class: 'row center' },
        el('button', { class: 'btn ghost', onClick: done }, 'Закрыть'),
        el('button', { class: 'btn primary big', onClick: async () => { audio.click(); await shareCard(progress, cp); } }, '📸 Карточка для друзей'),
      ),
    );
    fresh ? audio.bigWin() : audio.notify();
  });
}

// ─────────────────────────── карточка результата (PNG) ───────────────────────────
function loadSvg(svg) {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard(progress, cp = careerProfile(progress)) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px Manrope, "Segoe UI", Arial, sans-serif`;
  try {
    await Promise.all([document.fonts.load(F(800, 72)), document.fonts.load(F(600, 30))]);
  } catch {
    // шрифт не загрузился — рисуем системным
  }
  const prof = cp.top.prof;
  const { rank, stars } = staffRank(progress);
  // фон
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0f3d29');
  g.addColorStop(1, '#050b09');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 160, 20, W * 0.8, 160, 700);
  glow.addColorStop(0, `${prof.color}55`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(125,255,192,0.05)';
  for (let y = 30; y < H; y += 46) for (let x = 30; x < W; x += 46) ctx.fillRect(x, y, 4, 4);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // шапка: логотип банка (если есть) и название игры
  const hasLogo = drawBrand(ctx, 60, 50, 430, 124, { plateColor: '#ffffff', pad: 0.16 });
  ctx.fillStyle = '#7dffc0';
  ctx.font = F(800, 38);
  if (hasLogo) {
    ctx.textAlign = 'right';
    ctx.fillText('ПРОФЕССИИ', W - 70, 92);
    ctx.font = F(600, 30);
    ctx.fillStyle = '#cfe9dc';
    ctx.fillText('в Банке', W - 70, 134);
  } else {
    ctx.fillText('🏦 ПРОФЕССИИ В БАНКЕ', 70, 110);
  }
  // аватар
  ctx.textAlign = 'center';
  const ava = await loadSvg(avatarSvg(progress.avatar || 0));
  const cx = W / 2;
  const cy = 360;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.fillStyle = '#173326';
  ctx.fill();
  ctx.clip();
  if (ava) ctx.drawImage(ava, cx - 150, cy - 150, 300, 300);
  ctx.restore();
  ctx.lineWidth = 10;
  ctx.strokeStyle = prof.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 155, 0, Math.PI * 2);
  ctx.stroke();
  // имя и звание
  ctx.fillStyle = '#ffffff';
  ctx.font = F(800, 66);
  ctx.fillText(progress.nickname, cx, 575);
  ctx.fillStyle = '#9fc9b5';
  ctx.font = F(600, 32);
  ctx.fillText(`${rank} · ★ ${stars}`, cx, 635);
  // профессия
  ctx.fillStyle = '#cfe9dc';
  ctx.font = F(800, 30);
  ctx.fillText('МОЯ ПРОФЕССИЯ В БАНКЕ', cx, 725);
  ctx.font = F(800, 92);
  ctx.fillText(prof.icon, cx, 815);
  ctx.font = F(800, 66);
  ctx.fillStyle = prof.color;
  // длинное полное название (в две строки) — заменяем коротким, чтобы хватило места стилю игры
  const full = wrap(ctx, prof.full, W - 160);
  const lines = full.length > 1 ? wrap(ctx, prof.title, W - 160) : full;
  lines.forEach((l, i) => ctx.fillText(l, cx, 912 + i * 74));
  let y = 912 + (lines.length - 1) * 74 + 72;
  ctx.font = F(800, 30);
  const pill = `совпадение ${cp.match}%`;
  const pw = ctx.measureText(pill).width + 56;
  rr(ctx, cx - pw / 2, y - 26, pw, 52, 26);
  ctx.fillStyle = prof.color;
  ctx.fill();
  ctx.fillStyle = '#04140c';
  ctx.fillText(pill, cx, y + 1);
  // стиль игры: строки ужимаются, чтобы не наезжать на подвал при любом числе сторон стиля
  y += 66;
  const rowH = Math.min(50, (H - 100 - y) / TRAIT_IDS.length);
  ctx.textAlign = 'left';
  for (const t of TRAIT_IDS) {
    const v = cp.traits[t];
    ctx.fillStyle = '#ffffff';
    ctx.font = F(700, rowH < 46 ? 28 : 30);
    ctx.fillText(`${TRAITS[t].icon} ${TRAITS[t].name}`, 110, y);
    rr(ctx, 470, y - 13, 420, 26, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    rr(ctx, 470, y - 13, Math.max(26, 420 * v), 26, 13);
    ctx.fillStyle = prof.color;
    ctx.fill();
    ctx.fillStyle = '#cfe9dc';
    ctx.textAlign = 'right';
    ctx.fillText(pct(v), 975, y);
    ctx.textAlign = 'left';
    y += rowH;
  }
  // подвал
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dffc0';
  ctx.font = F(800, 32);
  const host = location.host && !/localhost|127\.0\.0\.1/.test(location.host) ? location.host : 'Профессии в Банке';
  ctx.fillText(`А тебе какая подходит? → ${host}`, cx, H - 62);
  return c;
}

export async function shareCard(progress, cp) {
  const { box, close } = overlay('share-card');
  box.append(el('div', { class: 'si-top' }, '📸 КАРТОЧКА ДЛЯ ДРУЗЕЙ'), el('p', { class: 'muted small' }, 'Рисую…'));
  let canvas;
  try {
    canvas = await renderShareCard(progress, cp);
  } catch (e) {
    console.warn('Карточка не нарисовалась', e);
  }
  box.innerHTML = '';
  return new Promise((resolve) => {
    const done = () => {
      audio.click();
      close();
      resolve();
    };
    if (!canvas) {
      box.append(el('p', {}, 'Не получилось нарисовать карточку на этом устройстве.'), el('button', { class: 'btn primary', onClick: done }, 'Закрыть'));
      return;
    }
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const name = 'moya-professiya-v-banke.png';
      const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
      const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      box.append(
        el('div', { class: 'si-top' }, '📸 КАРТОЧКА ДЛЯ ДРУЗЕЙ'),
        el('img', { class: 'share-img', src: url, alt: 'Карточка результата' }),
        el(
          'div',
          { class: 'row center' },
          el('button', { class: 'btn ghost', onClick: () => { URL.revokeObjectURL(url); done(); } }, 'Закрыть'),
          canShare ? el('button', { class: 'btn ghost', onClick: async () => { track('share_card', { prof: cp.top.prof.id, data: { action: 'share' } }); try { await navigator.share({ files: [file], title: 'Профессии в Банке', text: `Мне подходит: ${cp.top.prof.full}. А тебе?` }); } catch { /* отменили */ } } }, '📤 Поделиться') : null,
          el('a', { class: 'btn primary', href: url, download: name, onClick: () => { audio.coin(); track('share_card', { prof: cp.top.prof.id, data: { action: 'download' } }); } }, '⬇ Скачать'),
        ),
      );
    }, 'image/png');
  });
}

