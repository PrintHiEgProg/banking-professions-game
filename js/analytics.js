// Анонимная статистика для HR банка: какие профессии выбирают подростки, что им нравится, что советует профиль.
// Без имён и регистрации: случайный id браузера (не связан с ником), события игры и цифры.
// Никнейм, IP и свободный текст не отправляются. Выключается в меню («Статистика: выкл»)
// и автоматически, если в браузере включено «Не отслеживать».
// На Vercel события уходят в /api/events (функция в папке api/ → Postgres → дашборд Superset).
// Локально статистика выключена: включить — открыть игру с ?stats=1 через tests/devserver.mjs
// (или задать localStorage['bank.analytics.endpoint']).
const ID_KEY = 'bank.anon.v1';
const OFF_KEY = 'bank.analytics.off';
const AGE = { easy: '7-10', normal: '11-13', hard: '14+' };

const rnd = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    return null;
  }
  return v;
}

// ?stats=1 — включить отправку на свой же адрес /api/events и локально (для tests/devserver.mjs)
try {
  if (new URLSearchParams(location.search).get('stats') === '1') store('bank.analytics.endpoint', '/api/events');
} catch {
  // старый браузер
}

function endpoint() {
  const custom = store('bank.analytics.endpoint');
  if (custom) return custom;
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.)/.test(location.hostname);
  const api = document.querySelector('meta[name="bank-api"]')?.content;
  return local || !api ? null : `${api}/events`;
}

let anon = store(ID_KEY);
let returning = !!anon;
if (!anon) {
  anon = rnd();
  store(ID_KEY, anon);
}
const sess = rnd();
const queue = [];
let ctx = { age: null, device: null };
let timer = null;

export const analyticsOn = () => store(OFF_KEY) !== '1' && navigator.doNotTrack !== '1' && !!endpoint();
export const analyticsAllowed = () => store(OFF_KEY) !== '1' && navigator.doNotTrack !== '1';
export function setAnalytics(on) {
  store(OFF_KEY, on ? null : '1');
  if (!on) queue.length = 0;
}

export function setContext({ difficulty, device } = {}) {
  if (difficulty) ctx.age = AGE[difficulty] || null;
  if (device) ctx.device = device;
}

export function track(ev, { prof = null, shift = null, stars = null, value = null, data = null } = {}) {
  if (!analyticsOn()) return;
  queue.push({ ev, anon, sess, t: Date.now(), prof, shift, stars, value, age: ctx.age, device: ctx.device, data });
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(flush, 8000);
}

export function flush(beacon = false) {
  clearTimeout(timer);
  timer = null;
  const url = endpoint();
  if (!queue.length || !url) return;
  const body = JSON.stringify({ events: queue.splice(0, 50) });
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    // статистика не должна мешать игре
  }
}

addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true));
addEventListener('pagehide', () => flush(true));

export function sessionStart(device) {
  ctx.device = device;
  track('session_start', { data: { returning } });
}
