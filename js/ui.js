// DOM-помощники: панели, всплывающие сообщения, задачи, счётчики, печатная машинка.
import { audio } from './audio.js';
import { portrait, NAMES } from './portraits.js';

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
    el('div', { class: 'term-user' }, `👤 ${ctx.state.nickname}`),
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
