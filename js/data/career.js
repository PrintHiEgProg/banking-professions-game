// Профиль стажёра: какая профессия банка подходит игроку.
// Считается из того, что игра уже сохраняет: звёзды за каждую смену, исходы сюжетных историй
// и ответ «Как тебе эта работа?» после смены. Отдельного теста нет — профиль складывается из игры.
import { PROFESSIONS } from './professions.js';

// Четыре стороны стиля игры
export const TRAITS = {
  people: { icon: '🗣', name: 'Общение', strong: 'находишь подход к людям: успокоить, объяснить, переубедить' },
  numbers: { icon: '📊', name: 'Расчёт', strong: 'считаешь, сравниваешь и решаешь на холодную голову' },
  attention: { icon: '🔎', name: 'Внимательность', strong: 'замечаешь детали, которые другие пропускают' },
  pressure: { icon: '⚡', name: 'Выдержка', strong: 'не теряешься, когда время идёт и ставки высоки' },
  tech: { icon: '🧩', name: 'Системность', strong: 'видишь, как всё устроено, и чинишь причину, а не симптом' },
};
export const TRAIT_IDS = Object.keys(TRAITS);

// Чему учит каждая смена (вес стороны стиля). Хорошо сыграл смену — эти стороны растут.
const SHIFT_TRAITS = {
  teller: [
    { people: 0.4, attention: 0.3, numbers: 0.3 },
    { attention: 0.6, numbers: 0.4 },
    { attention: 0.5, people: 0.5 },
    { people: 0.4, attention: 0.4, pressure: 0.2 },
    { numbers: 0.6, attention: 0.2, pressure: 0.2 },
  ],
  credit: [
    { numbers: 0.5, attention: 0.3, people: 0.2 },
    { attention: 0.8, numbers: 0.2 },
    { people: 0.6, attention: 0.4 },
    { numbers: 0.5, attention: 0.3, tech: 0.2 },
    { numbers: 0.8, people: 0.2 },
  ],
  advisor: [
    { numbers: 0.4, people: 0.3, tech: 0.2, attention: 0.1 },
    { numbers: 0.6, people: 0.4 },
    { numbers: 0.7, people: 0.3 },
    { people: 0.8, numbers: 0.2 },
    { people: 0.4, numbers: 0.3, attention: 0.3 },
  ],
  cash: [
    { pressure: 0.3, attention: 0.3, tech: 0.2, numbers: 0.2 },
    { attention: 0.8, pressure: 0.2 },
    { attention: 0.5, pressure: 0.5 },
    { pressure: 0.6, numbers: 0.4 },
    { pressure: 0.6, numbers: 0.2, attention: 0.2 },
  ],
  security: [
    { attention: 0.8, pressure: 0.2 },
    { pressure: 0.6, attention: 0.4 },
    { numbers: 0.4, tech: 0.4, attention: 0.2 },
    { people: 0.6, pressure: 0.4 },
    { attention: 0.4, numbers: 0.3, tech: 0.3 },
  ],
  hr: [
    { people: 0.5, attention: 0.3, pressure: 0.2 },
    { attention: 0.6, people: 0.4 },
    { people: 0.6, attention: 0.4 },
    { attention: 0.6, numbers: 0.2, people: 0.2 },
    { people: 0.8, pressure: 0.2 },
  ],
  devops: [
    { tech: 0.5, attention: 0.3, pressure: 0.2 },
    { tech: 0.4, pressure: 0.6 },
    { attention: 0.6, tech: 0.4 },
    { tech: 0.5, attention: 0.5 },
    { tech: 0.5, pressure: 0.3, attention: 0.2 },
  ],
};

// Ключевые моменты сюжета говорят о стиле больше, чем звёзды
const MOMENTS = [
  { test: (s) => (s.gran ? s.gran === 'saved' : null), w: { people: 1, pressure: 0.6 } },
  { test: (s) => (s.maxim ? s.maxim === 'saved' : null), w: { people: 1, attention: 0.5 } },
  { test: (s) => (s.misha ? !!s.mishaScam : null), w: { attention: 0.8 } },
  { test: (s) => (s.misha ? s.misha === 'reached' : null), w: { numbers: 0.8 } },
  { test: (s) => (s.tail ? s.tail === 'caught' : null), w: { attention: 0.8, pressure: 0.8 } },
  { test: (s) => (s.call ? s.call === 'won' : null), w: { people: 1, pressure: 1 } },
  { test: (s) => (s.curator ? s.curator === 'found' : null), w: { attention: 0.8, numbers: 0.6 } },
  { test: (s) => (s.bakery ? s.bakery === 'good' : null), w: { numbers: 0.8 } },
  { test: (s) => (s.artyomCredit ? s.artyomCredit === 'good' : null), w: { numbers: 0.5, people: 0.3 } },
  { test: (s) => (s.insider ? s.insider !== 'hired' : null), w: { attention: 0.8, people: 0.4 } },
  { test: (s) => (s.masha ? s.masha === 'stayed' : null), w: { people: 1 } },
  { test: (s) => (s.night ? s.night === 'held' : null), w: { pressure: 0.8, tech: 0.4 } },
  { test: (s) => (s.stuffing ? s.stuffing === 'stopped' : null), w: { attention: 0.6, tech: 0.6 } },
  { test: (s) => (s.qr ? s.qr === 'smooth' : null), w: { tech: 0.6, pressure: 0.4 } },
];

// Что важнее всего в каждой профессии
export const PROF_NEEDS = {
  teller: { people: 0.35, attention: 0.35, numbers: 0.2, pressure: 0.1 },
  credit: { numbers: 0.45, attention: 0.35, people: 0.2 },
  advisor: { people: 0.45, numbers: 0.45, attention: 0.1 },
  cash: { pressure: 0.45, attention: 0.4, numbers: 0.15 },
  security: { attention: 0.45, pressure: 0.3, people: 0.15, numbers: 0.1 },
  hr: { people: 0.5, attention: 0.3, pressure: 0.1, numbers: 0.1 },
  devops: { tech: 0.45, attention: 0.3, pressure: 0.25 },
};

// «Как тебе эта работа?» — ответ после смены
export const LIKES = [
  [3, '😍', 'Очень!'],
  [2, '🙂', 'Нормально'],
  [1, '😐', 'Не моё'],
];

// Путь в банк — по странице «Карьера» банка «Центр-инвест»
export const BANK_PATH = {
  intro: 'В банке «Центр-инвест» есть оплачиваемая стажировка: гибкий график, наставник и можно попробовать разные направления.',
  steps: [
    ['📝', 'Заявка на сайте банка'],
    ['🎓', 'Ускоренное обучение «Банковское дело»'],
    ['🏦', 'Работа в отделении — с наставником'],
  ],
};

const triedOf = (progress) => PROFESSIONS.filter((p) => Object.keys(progress.profs[p.id]?.best || {}).length > 0).map((p) => p.id);

// Профиль готов, когда попробовано столько профессий (любых)
export const PROFILE_NEED = Math.min(5, PROFESSIONS.length);

export function careerProfile(progress) {
  const tried = triedOf(progress);
  const score = Object.fromEntries(TRAIT_IDS.map((t) => [t, 0]));
  const max = Object.fromEntries(TRAIT_IDS.map((t) => [t, 0]));
  const add = (w, perf) => {
    for (const [t, v] of Object.entries(w)) {
      score[t] += v * perf;
      max[t] += v;
    }
  };
  // звёзды за смены: 3★ — всё получилось, 1★ — пока трудно
  for (const p of PROFESSIONS) {
    const best = progress.profs[p.id]?.best || {};
    for (const [n, b] of Object.entries(best)) {
      const w = SHIFT_TRAITS[p.id]?.[Number(n) - 1];
      if (w) add(w, (b.stars - 1) / 2);
    }
  }
  const s = progress.story || {};
  for (const m of MOMENTS) {
    const r = m.test(s);
    if (r !== null) add(m.w, r ? 1 : 0);
  }
  // сглаживание: по одной смене не делаем громких выводов
  const traits = Object.fromEntries(TRAIT_IDS.map((t) => [t, (score[t] + 0.6 * 0.5) / (max[t] + 0.6)]));
  const evidence = TRAIT_IDS.reduce((a, t) => a + max[t], 0);

  const ranking = PROFESSIONS.map((p) => {
    const need = PROF_NEEDS[p.id];
    const fit = TRAIT_IDS.reduce((a, t) => a + (need[t] || 0) * traits[t], 0);
    const best = Object.values(progress.profs[p.id]?.best || {});
    const perf = best.length ? best.reduce((a, b) => a + b.stars, 0) / (best.length * 3) : null;
    const like = progress.profs[p.id]?.like ?? null;
    const interest = like ? (like - 1) / 2 : null;
    // интерес важнее всего: работа, которая нравится, получается лучше со временем
    let total = fit * 0.4 + (perf ?? fit) * 0.25 + (interest ?? 0.5) * 0.35;
    if (!best.length) total *= 0.85;
    return { prof: p, fit, perf, like, interest, total, tried: best.length > 0 };
  }).sort((a, b) => b.total - a.total);

  const top = ranking[0];
  const mine = TRAIT_IDS.slice().sort((a, b) => traits[b] - traits[a]);
  const needTop = Object.entries(PROF_NEEDS[top.prof.id]).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const shared = mine.slice(0, 2).filter((t) => needTop.slice(0, 2).includes(t));
  const match = Math.round(Math.min(97, Math.max(55, 45 + top.total * 55)));
  return {
    tried,
    ready: tried.length >= PROFILE_NEED,
    need: PROFILE_NEED,
    traits,
    topTraits: mine.slice(0, 2),
    evidence,
    ranking,
    top,
    second: ranking[1],
    shared,
    match,
  };
}

// Короткие причины «почему именно эта профессия»
export function whyLines(cp) {
  const { top, shared, topTraits } = cp;
  const L = [];
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const mine = topTraits.map((t) => `${TRAITS[t].icon} ${TRAITS[t].name.toLowerCase()}`).join(' и ');
  const need = shared.map((t) => TRAITS[t].name.toLowerCase());
  const tail = need.length === 2 ? `${cap(need[0])} и ${need[1]} — главное в этой работе.` : need.length ? `${cap(need[0])} — главное в этой работе.` : 'В этой работе они тоже пригодятся.';
  L.push(`Твои сильные стороны — ${mine}. ${tail}`);
  if (top.like === 3) L.push('Тебе понравилась эта работа 😍 — а это главное.');
  else if (top.like === 2) L.push('Работа зашла 🙂 — попробуй ещё пару смен, чтобы понять наверняка.');
  if (top.perf != null && top.perf >= 0.8) L.push(`Смены получаются отлично: ★ ${Math.round(top.perf * 30) / 10} в среднем.`);
  else if (top.perf != null && top.perf >= 0.55) L.push('Смены получаются уверенно — и есть куда расти.');
  return L;
}
