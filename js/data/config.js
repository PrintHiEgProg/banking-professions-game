// Глобальные настройки игры и уровни сложности.
// Баланс каждой смены задаётся здесь: s1…s5 — смены главы 1.

export const GAME = {
  title: 'РУБЕЖ',
  profession: 'Специалист по финансовой безопасности',
  chapter: 'Глава 1. Первая неделя',
  version: '2.0.0',
};

export const DIFFICULTY = {
  easy: {
    id: 'easy',
    name: 'Стажёр',
    desc: 'Больше времени и подсказок',
    scoreMul: 1,
    s1: { messages: ['m1', 'm3', 'm2'], hints: 3, msgTime: 0 },
    s2: { count: 8, cardTime: 11 },
    s3: { runs: 0 },
    s4: { turns: 12, trust: 50, win: 45 },
    s5: { time: 420, penalty: 20, realtime: 0 },
  },
  normal: {
    id: 'normal',
    name: 'Аналитик',
    desc: 'Сбалансированный режим',
    scoreMul: 1.5,
    s1: { messages: ['m1', 'm3', 'm2', 'm4'], hints: 1, msgTime: 0 },
    s2: { count: 10, cardTime: 8 },
    s3: { runs: 0 },
    s4: { turns: 10, trust: 40, win: 55 },
    s5: { time: 300, penalty: 30, realtime: 0.5 },
  },
  hard: {
    id: 'hard',
    name: 'Эксперт',
    desc: 'Мало времени, без подсказок',
    scoreMul: 2,
    s1: { messages: ['m1', 'm3', 'm2', 'm4', 'm5', 'm6'], hints: 0, msgTime: 30 },
    s2: { count: 12, cardTime: 5.5 },
    s3: { runs: 4 },
    s4: { turns: 8, trust: 30, win: 62 },
    s5: { time: 240, penalty: 45, realtime: 1 },
  },
};

// Ранг по сумме звёзд за 5 смен (максимум 15).
export const RANKS = [
  [15, 'Главный специалист'],
  [13, 'Ведущий специалист'],
  [10, 'Специалист'],
  [6, 'Младший специалист'],
  [0, 'Стажёр'],
];
