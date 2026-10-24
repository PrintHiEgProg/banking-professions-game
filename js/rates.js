// Курсы валют ЦБ РФ для табло и бегущей строки в холле.
// Официальный XML ЦБ (cbr.ru/scripts/XML_daily.asp) нельзя читать из браузера с чужого сайта (нет CORS),
// поэтому берём те же курсы ЦБ в JSON с зеркала cbr-xml-daily.ru:
//   • на Vercel — через свой адрес /api/cbr (прокси в vercel.json, браузер ничего не блокирует);
//   • локально — напрямую с зеркала;
//   • нет сети — примерные курсы, табло честно пишет «пример».
// Ответ кешируется в браузере на 6 часов: ЦБ обновляет курсы раз в день.
const CACHE_KEY = 'bank.rates.v1';
const TTL = 6 * 60 * 60 * 1000;
const CODES = ['USD', 'EUR', 'CNY'];
export const RATE_META = {
  USD: { sign: '$', name: 'доллар' },
  EUR: { sign: '€', name: 'евро' },
  CNY: { sign: '¥', name: 'юань' },
};
// Покупка и продажа в игре — от курса ЦБ с примерной маржой банка
export const SPREAD = { buy: 0.975, sell: 1.025 };

const FALLBACK = { live: false, date: null, rows: { USD: { value: 89.2, prev: 89.2 }, EUR: { value: 96.5, prev: 96.5 }, CNY: { value: 12.1, prev: 12.1 } } };

function sources() {
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.)/.test(location.hostname);
  const direct = 'https://www.cbr-xml-daily.ru/daily_json.js';
  const api = document.querySelector('meta[name="bank-api"]')?.content;
  return local || !api ? [direct] : [`${api}/cbr`, direct];
}

function parse(json) {
  const rows = {};
  for (const c of CODES) {
    const v = json?.Valute?.[c];
    if (!v || !(v.Value > 0)) return null;
    const n = v.Nominal || 1;
    rows[c] = { value: v.Value / n, prev: (v.Previous || v.Value) / n };
  }
  const date = json.Date ? new Date(json.Date) : null;
  return { live: true, date: date && !isNaN(date) ? date.toISOString() : null, rows };
}

async function fetchJson(url) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl?.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctl?.signal, cache: 'no-cache' });
    if (!r.ok) return null;
    return parse(await r.json());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let pending = null;
export function getRates() {
  if (pending) return pending;
  pending = (async () => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && Date.now() - c.savedAt < TTL && c.rows) return c;
    } catch {
      // нет хранилища — просто запросим
    }
    for (const url of sources()) {
      const data = await fetchJson(url);
      if (data) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
        } catch {
          // не сохранилось — не страшно
        }
        return data;
      }
    }
    return FALLBACK;
  })();
  return pending;
}

export const fmtRate = (v) => v.toFixed(2).replace('.', ',');
export const trend = (r) => (r.value > r.prev + 0.0001 ? '▲' : r.value < r.prev - 0.0001 ? '▼' : '•');
export function rateDate(data, withYear = false) {
  if (!data?.date) return '';
  const d = new Date(data.date);
  return d.toLocaleDateString('ru-RU', withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit' });
}
