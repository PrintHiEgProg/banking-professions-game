// Приём анонимной статистики игры → Postgres (Vercel Serverless Function, путь /api/events).
// Что храним: случайный id браузера (не связан с именем), событие, профессию, смену, звёзды, оценку,
// возрастную группу по выбранной сложности и тип устройства. Ник, IP, User-Agent и любой свободный текст
// НЕ сохраняются. Базу задаёт переменная окружения DATABASE_URL (или POSTGRES_URL) — её создаёт
// интеграция Neon/Postgres в Vercel → Storage. Нет базы — функция отвечает 204 и ничего не пишет.
import pg from 'pg';

const EVENTS = new Set(['session_start', 'game_start', 'tutorial_done', 'cabinet_enter', 'shift_start', 'shift_end', 'like', 'profile_ready', 'profile_open', 'career_click', 'share_card', 'certificate', 'hints_used', 'shift_retry', 'difficulty_change']);
const PROFS = new Set(['teller', 'credit', 'advisor', 'cash', 'security', 'hr', 'devops']);
const AGES = new Set(['7-10', '11-13', '14+']);
const DEVICES = new Set(['mobile', 'tablet', 'desktop']);
const DATA_KEYS = new Set(['top', 'second', 'match', 'people', 'numbers', 'attention', 'pressure', 'tech', 'source', 'action', 'tried', 'returning', 'duration', 'avatar']);
const ID = /^[a-z0-9-]{8,40}$/i;

let pool = null;
let ready = null;
function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new pg.Pool({ connectionString: url, max: 3, ssl: local ? false : { rejectUnauthorized: false } });
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS game_events (
        id          bigserial PRIMARY KEY,
        received_at timestamptz NOT NULL DEFAULT now(),
        client_ts   timestamptz,
        anon_id     text NOT NULL,
        session_id  text,
        event       text NOT NULL,
        prof        text,
        shift       smallint,
        stars       smallint,
        value       real,
        age_group   text,
        device      text,
        source      text NOT NULL DEFAULT 'game',
        data        jsonb
      );
      CREATE INDEX IF NOT EXISTS game_events_event_idx ON game_events (event, received_at);
      CREATE INDEX IF NOT EXISTS game_events_anon_idx ON game_events (anon_id);
    `);
  }
  return pool;
}

const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);

function clean(e) {
  if (!e || typeof e !== 'object' || !EVENTS.has(e.ev) || !ID.test(e.anon || '')) return null;
  const data = {};
  if (e.data && typeof e.data === 'object') {
    for (const [k, v] of Object.entries(e.data)) {
      if (!DATA_KEYS.has(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) data[k] = Math.round(v * 1000) / 1000;
      else if (typeof v === 'boolean') data[k] = v;
      else if (typeof v === 'string' && (PROFS.has(v) || /^[a-z_]{1,20}$/.test(v))) data[k] = v;
    }
  }
  const ts = typeof e.t === 'number' && Math.abs(Date.now() - e.t) < 7 * 864e5 ? new Date(e.t) : null;
  return [
    ts,
    e.anon,
    ID.test(e.sess || '') ? e.sess : null,
    e.ev,
    PROFS.has(e.prof) ? e.prof : null,
    int(e.shift, 1, 5),
    int(e.stars, 0, 3),
    num(e.value, -1000, 100000),
    AGES.has(e.age) ? e.age : null,
    DEVICES.has(e.device) ? e.device : null,
    Object.keys(data).length ? JSON.stringify(data) : null,
  ];
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'bad json' });
    }
  }
  const list = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
  const rows = list.map(clean).filter(Boolean);
  const p = db();
  if (!p || !rows.length) return res.status(204).end();
  try {
    await ready;
    const values = [];
    const marks = rows.map((r, i) => {
      values.push(...r);
      const b = i * 11;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11}::jsonb)`;
    });
    await p.query(`INSERT INTO game_events (client_ts, anon_id, session_id, event, prof, shift, stars, value, age_group, device, data) VALUES ${marks.join(',')}`, values);
    return res.status(204).end();
  } catch (err) {
    console.error('analytics insert failed', err.message);
    return res.status(500).json({ error: 'db' });
  }
}
