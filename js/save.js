// Сохранение прогресса и настроек в localStorage браузера (без регистрации и сервера).
// Игра сохраняется автоматически: в начале каждой смены, после каждого задания и в конце смены.

const SAVE_KEY = 'bankjobs.save.v3';
const SETTINGS_KEY = 'rubezh.settings.v1';

const PROF_IDS = ['teller', 'credit', 'advisor', 'cash', 'security'];

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

export function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!data || data.version !== 3) return null;
    const base = newProgress(data.nickname, data.difficulty);
    return { ...base, ...data, profs: { ...base.profs, ...data.profs } };
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
