// Сохранение прогресса и настроек в localStorage браузера (без регистрации и сервера).
// Игра сохраняется автоматически: в начале каждой смены, после каждого задания и в конце смены.

const SAVE_KEY = 'bankjobs.save.v3';
const SETTINGS_KEY = 'rubezh.settings.v1';

const PROF_IDS = ['teller', 'credit', 'advisor', 'cash', 'security', 'hr', 'devops'];

export function newProfState() {
  return { shift: 1, stage: 0, unlocked: 1, best: {}, pending: null, data: {} };
}

export function newProgress(nickname, difficulty) {
  return {
    version: 3,
    nickname,
    difficulty,
    profs: Object.fromEntries(PROF_IDS.map((id) => [id, newProfState()])),
    stats: { clients: 0, money: 0, score: 0 },
    knowledge: [],
    // данные смен «Финансовой безопасности»
    evidence: [],
    rule: null,
    outcome: { call: null, trace: null },
    board: null,
    current: null,
    certificate: false,
    // сквозной сюжет недели: исходы историй, которые переходят между кабинетами (см. js/story.js)
    story: {},
    avatar: 0,
    savedAt: 0,
  };
}

// Чиним сохранение профессии, если оно осталось от старой версии игры или повредилось:
// номер смены 1–5, звёзды 1–3, служебные поля — нужного типа. Иначе кабинет может не открыться.
const clampInt = (v, min, max, def) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.min(max, Math.max(min, Math.round(Number(v)))) : def);
export function normalizeProf(ps) {
  const base = newProfState();
  const p = { ...base, ...(ps && typeof ps === 'object' ? ps : {}) };
  p.shift = clampInt(p.shift, 1, 5, 1);
  p.unlocked = Math.max(clampInt(p.unlocked, 1, 5, 1), p.shift);
  p.stage = clampInt(p.stage, 0, 9, 0);
  const best = {};
  if (p.best && typeof p.best === 'object') {
    for (const [k, b] of Object.entries(p.best)) {
      const n = Number(k);
      if (!(n >= 1 && n <= 5) || b == null) continue;
      const stars = typeof b === 'object' ? b.stars : b;
      best[n] = { stars: clampInt(stars, 1, 3, 1), score: Math.max(0, Number(b?.score) || 0) };
    }
  }
  p.best = best;
  // пройденные смены и следующая за ними всегда открыты
  const doneMax = Math.max(0, ...Object.keys(best).map(Number));
  p.unlocked = Math.max(p.unlocked, Math.min(5, doneMax + 1));
  if (!p.data || typeof p.data !== 'object') p.data = {};
  if (p.pending && typeof p.pending !== 'object') p.pending = null;
  return p;
}

export function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!data || data.version !== 3) return null;
    const base = newProgress(data.nickname, data.difficulty);
    const profs = { ...base.profs, ...(data.profs && typeof data.profs === 'object' ? data.profs : {}) };
    for (const id of PROF_IDS) profs[id] = normalizeProf(profs[id]);
    return { ...base, ...data, profs };
  } catch {
    return null;
  }
}

export function writeSave(progress) {
  try {
    progress.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // хранилище недоступно (приватный режим) — игра просто не сохраняется
  }
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // см. clearSave
  }
}
