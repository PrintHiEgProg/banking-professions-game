// DOM-помощники: панели, всплывающие сообщения, задачи, счётчики, печатная машинка.
import { audio } from './audio.js';
import { portrait, NAMES, avatarSvg } from './portraits.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function money(n) {
  return `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
}

export function num(n) {
  return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ───────── печатная машинка (клик/пробел — дописать сразу) ─────────
let currentSkip = null;
export function skipTyping() {
  if (currentSkip) currentSkip();
}

export function typeText(node, text, { speed = 16, voice = null, onTick = null } = {}) {
  return new Promise((resolve) => {
    let i = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      node.textContent = text;
      if (onTick) onTick();
      if (currentSkip === finish) currentSkip = null;
      resolve();
    };
    const timer = setInterval(() => {
      i += 1;
      node.textContent = text.slice(0, i);
      if (voice && i % 3 === 0 && text[i - 1] !== ' ') audio.blip(voice);
      if (onTick && i % 8 === 0) onTick();
      if (i >= text.length) finish();
    }, speed);
    currentSkip = finish;
  });
}

// ───────── сообщения от персонажей ─────────
export function toast({ who = 'irina', emo = 'neutral', text, title, duration = 7000, cls = '' }) {
  const root = $('#toasts');
  const t = el(
    'div',
    { class: `toast ${cls || who}`, role: 'status' },
    el('div', { class: 'toast-ava', html: portrait(who, emo) }),
    el('div', { class: 'toast-body' }, el('div', { class: 'toast-name', text: title || NAMES[who] || '' }), el('div', { class: 'toast-text', text })),
  );
  root.append(t);
  audio.notify();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  const remove = () => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  };
  setTimeout(remove, duration);
  t.addEventListener('click', remove);
  while (root.children.length > 3) root.firstElementChild.remove();
}

let captionTimer = null;
export function caption(text, ms = 3800) {
  const c = $('#caption');
  c.textContent = text;
  c.classList.add('show');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => c.classList.remove('show'), ms);
}

export function setObjective(text) {
  const box = $('#objective');
  const t = $('#objective-text');
  if (!text) {
    box.classList.remove('show');
    return;
  }
  if (t.textContent === text && box.classList.contains('show')) return;
  t.textContent = text;
  box.classList.remove('pulse');
  void box.offsetWidth;
  box.classList.add('show', 'pulse');
}

// ───────── счётчики HUD ─────────
const shown = { clients: 0, money: 0, score: 0 };
export function updateStats(stats, animate = true) {
  const set = (key, id, fmt) => {
    const node = $(id);
    const from = shown[key];
    const to = stats[key];
    shown[key] = to;
    if (!animate || from === to) {
      node.textContent = fmt(to);
      return;
    }
    animateNumber(node, from, to, 1100, fmt);
    node.parentElement.classList.remove('bump');
    void node.offsetWidth;
    node.parentElement.classList.add('bump');
  };
  set('clients', '#stat-clients', num);
  set('money', '#stat-money', money);
  set('score', '#stat-score', num);
}

export function animateNumber(node, from, to, ms, fmt = num) {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function flash(kind = 'red') {
  const f = $('#flash');
  f.className = '';
  void f.offsetWidth;
  f.className = `on ${kind}`;
}

// ───────── оверлейные панели (экраны терминала) ─────────
export function openPanel(className = '') {
  for (const t of document.querySelectorAll('#toasts .toast')) t.classList.remove('show');
  const root = $('#overlay-root');
  root.innerHTML = '';
  const p = el('div', { class: `panel ${className}` });
  root.append(p);
  root.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('show')));
  return p;
}

export function closePanel() {
  const root = $('#overlay-root');
  const p = root.firstElementChild;
  root.classList.remove('active');
  if (p) {
    p.classList.remove('show');
    setTimeout(() => p.remove(), 320);
  }
}

export function termBar(title, ctx, extra = null) {
  return el(
    'div',
    { class: 'term-bar' },
    el('div', { class: 'term-dots' }, el('i'), el('i'), el('i')),
    el('div', { class: 'term-title' }, title),
    extra,
    el('div', { class: 'term-user' }, el('span', { class: 'tu-ava', html: avatarSvg(ctx.state.avatar || 0) }), ctx.state.nickname),
    el('button', { class: 'tour-btn', 'aria-label': 'Как играть', title: 'Как играть', onClick: (e) => { const id = e.currentTarget.dataset.tour; if (id) tour(id, { force: true }); } }, '❓'),
  );
}

export function badge(text, kind = '') {
  return el('span', { class: `badge ${kind}` }, text);
}

// Ряд звёзд: n из max
export function starsEl(n, max = 3) {
  return el('div', { class: 'stars', 'aria-label': `${n} из ${max}` }, Array.from({ length: max }, (_, i) => el('span', { class: i < n ? 'on' : '' }, '★')));
}

// Карточка знания: иконка + заголовок + короткая строка
export function knowledgeCard(k, fresh = false) {
  return el('div', { class: `k-card${fresh ? ' fresh' : ''}` }, el('span', { class: 'k-icon' }, k.icon), el('div', {}, el('b', {}, k.title), el('span', {}, k.text)));
}

// Значок «Сохранено» в углу экрана
let saveTimer = null;
export function showSaved() {
  const b = $('#save-badge');
  if (!b) return;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => b.classList.remove('show'), 2200);
}

// Скругление сумм: 583000 → «583 тыс. ₽»
export function moneyShort(n) {
  const a = Math.abs(n);
  if (a >= 1000) return `${num(Math.round(a / 1000))} тыс. ₽`;
  return money(a);
}

export const VOICE = { gran: 420, irina: 560, mentor: 500, masha: 760, dima: 360, sys: 300, scammer: 240 };

// ───────── обучение: подсветка элемента и короткая подсказка ─────────
// Показывается один раз на устройстве; повторить можно кнопкой «❓» в шапке окна.
// Пока подсказка на экране, игра стоит на паузе (таймеры, настроение клиента, броневик).
const TOURS_KEY = 'bank.tours.v1';
const TOURS = {};
let tourOn = false;
export const isTourActive = () => tourOn;
export function defineTours(map) {
  Object.assign(TOURS, map);
}
function toursSeen() {
  try {
    return JSON.parse(localStorage.getItem(TOURS_KEY)) || {};
  } catch {
    return {};
  }
}
function markTour(id) {
  try {
    const s = toursSeen();
    s[id] = 1;
    localStorage.setItem(TOURS_KEY, JSON.stringify(s));
  } catch {
    // хранилище недоступно — подсказка просто покажется ещё раз
  }
}
function toursOff() {
  try {
    return localStorage.getItem('bank.notours') === '1';
  } catch {
    return false;
  }
}
export function resetTours() {
  try {
    localStorage.removeItem(TOURS_KEY);
  } catch {
    // нечего сбрасывать
  }
}

export function tour(id, { force = false } = {}) {
  const steps = (TOURS[id] || []).filter((s) => !s.when || s.when());
  const helpBtn = document.querySelector('#overlay-root .panel .tour-btn');
  if (helpBtn && steps.length) helpBtn.dataset.tour = id;
  if (!steps.length || tourOn || (!force && (toursSeen()[id] || toursOff()))) return Promise.resolve();
  tourOn = true;
  markTour(id);
  return new Promise((resolve) => {
    const root = el('div', { id: 'tour', role: 'dialog', 'aria-live': 'polite' });
    const hole = el('div', { class: 'tour-hole' });
    const bubble = el('div', { class: 'tour-bubble' });
    root.append(hole, bubble);
    document.body.append(root);
    let i = -1;
    let target = null;
    const finish = () => {
      window.removeEventListener('resize', place);
      root.remove();
      tourOn = false;
      resolve();
    };
    function place() {
      if (!target || !target.isConnected) return;
      const r = target.getBoundingClientRect();
      const pad = 6;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(4, r.left - pad);
      const y = Math.max(4, r.top - pad);
      const w = Math.min(vw - 8, r.right + pad) - x;
      const h = Math.min(vh - 8, r.bottom + pad) - y;
      Object.assign(hole.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px` });
      const bw = Math.min(360, vw - 24);
      bubble.style.width = `${bw}px`;
      const bh = bubble.offsetHeight;
      const below = y + h + 12;
      const above = y - 12 - bh;
      let top = below + bh <= vh - 8 ? below : above >= 8 ? above : Math.max(8, vh - bh - 8);
      if (top < 8) top = 8;
      const left = Math.min(Math.max(12, x + w / 2 - bw / 2), vw - bw - 12);
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
    }
    function next() {
      i++;
      while (i < steps.length && !document.querySelector(steps[i].sel)) i++;
      if (i >= steps.length) return finish();
      const s = steps[i];
      target = [...document.querySelectorAll(s.sel)].find((n) => n.offsetParent !== null) || document.querySelector(s.sel);
      try {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {
        // старый браузер
      }
      bubble.innerHTML = '';
      const last = i === steps.length - 1 || !steps.slice(i + 1).some((x) => document.querySelector(x.sel));
      bubble.append(
        el('div', { class: 'tb-head' }, el('span', {}, '💡 Как играть'), el('small', {}, `${i + 1}/${steps.length}`)),
        el('p', {}, s.text),
        el(
          'div',
          { class: 'tb-btns' },
          last ? null : el('button', { class: 'btn ghost small', onClick: (e) => { e.stopPropagation(); finish(); } }, 'Пропустить'),
          el('button', { class: 'btn primary small', onClick: (e) => { e.stopPropagation(); next(); } }, last ? 'Понятно ✓' : 'Дальше →'),
        ),
      );
      requestAnimationFrame(place);
      setTimeout(place, 260);
      bubble.querySelector('.btn.primary').focus({ preventScroll: true });
    }
    root.addEventListener('click', next);
    window.addEventListener('resize', place);
    next();
  });
}
