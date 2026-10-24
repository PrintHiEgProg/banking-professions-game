// Инкассатор: пять смен. Город — сетка кварталов 10×7, точки стоят на перекрёстках (x 0…10, y 0…7).
// Время в минутах от полуночи. Скорость — минут на квартал. Окно точки: [с, до]. Банкомат: empty — когда опустеет.
// Никаких погонь и стрельбы: герой — тот, кто заметил угрозу и действовал по протоколу.

export const GRID = { cols: 10, rows: 7 };
export const SERVICE = { shop: 10, atm: 15 };

export const DISTRICTS = [
  { name: 'Спальный район', x: [0, 3], y: [0, 2], color: '#2c3e50' },
  { name: 'Центр', x: [4, 6], y: [2, 4], color: '#3d2f4f' },
  { name: 'Вокзал', x: [7, 9], y: [0, 1], color: '#2f3b4f' },
  { name: 'Промзона', x: [0, 2], y: [4, 6], color: '#3a3328' },
];

// Что можно увидеть, осмотревшись перед выходом из машины
export const STREET = {
  dog: ['🐕', 'Пенсионер выгуливает собаку'],
  mom: ['👩‍👧', 'Мама с дочкой идут в магазин'],
  bus: ['🚌', 'Автобус на остановке'],
  courier: ['🛵', 'Курьер везёт заказ'],
  office: ['🧑‍💼', 'Мужчина спешит в офис'],
  parked: ['🚗', 'Пустая машина на парковке'],
  cat: ['🐈', 'Кот спит на скамейке'],
  kids: ['🧒', 'Школьники идут с уроков'],
  cart: ['🛒', 'Покупатель катит тележку'],
  janitor: ['🧹', 'Дворник метёт тротуар'],
  snowman: ['☃️', 'Дети лепят снеговика'],
  // подозрительное
  loiter: ['🧍', 'Стоит у входа уже 15 минут и смотрит на броневик'],
  engine: ['🚙', 'Машина с работающим мотором, внутри двое — никто не выходит'],
  hood: ['🥷', 'Капюшон и маска, хотя тепло. Ходит туда-сюда у двери'],
  photo: ['📸', 'Кто-то фотографирует броневик и номер'],
};
export const ODD = ['loiter', 'engine', 'hood', 'photo'];

// Машины в зеркале заднего вида
export const CARS = [
  ['🚕', 'жёлтое такси', 'В 412 ОК'],
  ['🚙', 'синий кроссовер', 'М 205 РА'],
  ['🚐', 'белый фургон', 'Т 880 ХЕ'],
  ['🚗', 'красный хэтчбек', 'Е 311 ВН'],
  ['🚌', 'автобус №12', '—'],
  ['🛻', 'зелёный пикап', 'К 559 СО'],
  ['🚓', 'патрульная машина', 'полиция'],
  ['🚚', 'грузовик с хлебом', 'Н 742 АМ'],
];
export const TAIL = ['🚘', 'серый седан', 'А 777 МР'];
export const TAIL_DECOY = ['🚘', 'серый седан', 'О 196 ТТ'];

export const CREW = [
  { id: 'petrovich', name: 'Петрович', note: 'водит броневик 20 лет', look: { style: 'bald', hair: '#9e9e9e', mustache: true, old: true, shirt: '#4b5563', bg: '#1f2937' }, role: 'driver' },
  { id: 'sasha', name: 'Саша', note: 'новичок, бегает быстрее всех', look: { style: 'short', hair: '#3b2a20', young: true, shirt: '#4b5563', bg: '#1f2937' }, role: 'collector' },
  { id: 'igor', name: 'Игорь', note: 'бывший охранник, всё замечает', look: { style: 'side', hair: '#1d1d1d', beard: true, shirt: '#4b5563', bg: '#1f2937', skin: 1 }, role: 'guard' },
];
// Хозяева точек — сквозные персонажи из других кабинетов
export const HOSTS = {
  bakery: { name: 'Светлана, хозяйка «Каравая»', look: { style: 'bun', hair: '#d9a066', shirt: '#ffffff', scarf: '#e76f51', bg: '#3a2e22', skin: 3 } },
};

export const ROLES = {
  driver: ['🚐', 'Водитель', 'не выходит из машины'],
  collector: ['💼', 'Сборщик', 'идёт за сумкой'],
  guard: ['🛡', 'Охранник', 'прикрывает сборщика'],
};

export const VAULT_STEPS = [
  ['🪪', 'Предъявить удостоверение'],
  ['🔢', 'Сверить пломбы с ведомостью'],
  ['💼', 'Пересчитать сумки'],
  ['✍️', 'Расписаться в журнале'],
];
export const VAULT_DECOY = ['🍔', 'Оставить сумки у двери и пойти на обед'];

const T = (h, m = 0) => h * 60 + m;

export const CASH_SHIFTS = {
  1: {
    start: T(9),
    speed: 4,
    depot: { x: 1, y: 6 },
    police: { x: 4, y: 1 },
    points: [
      { id: 'bakery', type: 'shop', icon: '🥖', title: 'Пекарня «Каравай»', short: 'Пекарня', x: 4, y: 5, win: [T(9), T(9, 45)], seal: 'К-1027', look: ['dog', 'bus', 'cat'], host: 'bakery' },
      { id: 'romashka', type: 'shop', icon: '🏪', title: 'Магазин «Ромашка»', short: 'Ромашка', x: 2, y: 2, win: [T(9), T(11)], seal: 'Р-4417', bag: 'torn', look: ['kids', 'janitor', 'parked'] },
      { id: 'pharmacy', type: 'shop', icon: '💊', title: 'Аптека «Здоровье»', short: 'Аптека', x: 6, y: 1, win: [T(9, 30), T(11)], seal: 'А-5520', look: ['office', 'courier', 'mom'], easy: false },
      { id: 'family', type: 'shop', icon: '🛒', title: 'Супермаркет «Семья»', short: 'Семья', x: 8, y: 4, win: [T(10, 15), T(12)], seal: 'С-6631', look: ['cart', 'parked', 'dog'] },
    ],
    // кульминация первой смены: за броневиком едет хвост
    drive: [{ leg: 2, type: 'tail' }],
    coachTail: true,
    storyTail: true,
    tailLen: 6,
    tip: 'Пекарня закрывает кассу рано — подумай, с кого начать. А в пути поглядывай в зеркало',
  },
  2: {
    start: T(10),
    speed: 4,
    depot: { x: 1, y: 6 },
    points: [
      { id: 'mall', type: 'shop', icon: '🏬', title: 'ТЦ «Горизонт»', short: 'Горизонт', x: 5, y: 3, win: [T(10), T(13)], seal: 'Г-3108', look: ['cart', 'mom', 'office'] },
      { id: 'romashka', type: 'shop', icon: '🏪', title: 'Магазин «Ромашка»', short: 'Ромашка', x: 2, y: 2, win: [T(10), T(13)], seal: 'Р-4418', bag: 'number', bagSeal: 'Р-4481', look: ['kids', 'janitor', 'dog'] },
      { id: 'gas', type: 'shop', icon: '⛽', title: 'АЗС «Дон»', short: 'АЗС', x: 8, y: 5, win: [T(10), T(13)], seal: 'Д-7720', look: ['parked', 'courier', 'bus'] },
      { id: 'pizza', type: 'shop', icon: '🍕', title: 'Пиццерия «Мама Мия»', short: 'Пиццерия', x: 6, y: 6, win: [T(10, 30), T(13)], seal: 'П-9012', look: ['courier', 'cat', 'office'], easy: false },
    ],
    yesterday: ['romashka', 'mall', 'pizza', 'gas'],
    drive: [{ leg: 2, type: 'coffee' }],
    vaultOrder: true,
    tip: 'Вчерашний маршрут — пунктиром. Сегодня нужен другой',
  },
  3: {
    start: T(13),
    speed: 4,
    depot: { x: 1, y: 6 },
    police: { x: 4, y: 1 },
    points: [
      { id: 'pharmacy', type: 'shop', icon: '💊', title: 'Аптека «Здоровье»', short: 'Аптека', x: 6, y: 1, win: [T(13), T(15)], seal: 'А-5521', look: ['mom', 'dog', 'courier'] },
      { id: 'branch', type: 'shop', icon: '🏢', title: 'Отделение банка', short: 'Отделение', x: 8, y: 3, win: [T(13, 30), T(15, 30)], seal: 'Б-1200', look: ['office', 'parked', 'bus'], odd: 'loiter', drill: true },
      { id: 'romashka', type: 'shop', icon: '🏪', title: 'Магазин «Ромашка»', short: 'Ромашка', x: 3, y: 3, win: [T(13), T(15, 30)], seal: 'Р-4419', look: ['kids', 'cat', 'janitor'] },
    ],
    drive: [{ leg: 2, type: 'tail' }],
    decoy: true,
    tip: 'Серых седанов в городе много — сверяй номер в зеркале',
  },
  4: {
    start: T(16),
    speed: 4,
    depot: { x: 1, y: 6 },
    traffic: { x: [4, 7], y: [2, 5], from: T(16, 30), to: T(19), k: 2, label: 'Пятница: пробки в центре' },
    points: [
      { id: 'atm_mall', type: 'atm', icon: '🏧', title: 'Банкомат в ТЦ «Горизонт»', short: 'ТЦ', x: 5, y: 3, empty: T(17), people: 'в пятницу в ТЦ толпа', look: ['cart', 'mom', 'kids'] },
      { id: 'atm_station', type: 'atm', icon: '🏧', title: 'Банкомат у вокзала', short: 'Вокзал', x: 9, y: 1, empty: T(17, 40), people: 'вечерние электрички', look: ['bus', 'office', 'courier'] },
      { id: 'family', type: 'shop', icon: '🛒', title: 'Супермаркет «Семья»', short: 'Семья', x: 8, y: 4, win: [T(16), T(18)], seal: 'С-6632', look: ['cart', 'parked', 'dog'], easy: false },
      { id: 'atm_plant', type: 'atm', icon: '🏧', title: 'Банкомат завода «Прогресс»', short: 'Завод', x: 2, y: 5, empty: T(19), people: 'смена закончилась', look: ['office', 'bus', 'janitor'], easy: false },
      { id: 'atm_home', type: 'atm', icon: '🏧', title: 'Банкомат в спальном районе', short: 'Спальный', x: 1, y: 1, empty: T(21), people: 'спокойно', look: ['dog', 'kids', 'cat'] },
    ],
    tip: 'Где больше людей — там банкомат опустеет раньше',
  },
  5: {
    start: T(18, 30),
    speed: 6,
    snow: true,
    depot: { x: 1, y: 6 },
    points: [
      { id: 'atm_mall', type: 'atm', icon: '🏧', title: 'Банкомат в ТЦ «Горизонт»', short: 'ТЦ', x: 5, y: 3, empty: T(19, 30), people: 'субботний вечер', look: ['cart', 'snowman', 'mom'] },
      { id: 'family', type: 'shop', icon: '🛒', title: 'Супермаркет «Семья»', short: 'Семья', x: 8, y: 4, win: [T(18, 30), T(21, 30)], seal: 'С-6633', look: ['cart', 'parked', 'snowman'] },
      { id: 'romashka', type: 'shop', icon: '🏪', title: 'Магазин «Ромашка»', short: 'Ромашка', x: 2, y: 2, win: [T(18, 30), T(21, 30)], seal: 'Р-4420', look: ['kids', 'janitor', 'dog'], odd: 'engine', driverAsk: true },
      { id: 'pizza', type: 'shop', icon: '🍕', title: 'Пиццерия «Мама Мия»', short: 'Пиццерия', x: 6, y: 6, win: [T(19), T(22, 30)], seal: 'П-9013', look: ['courier', 'snowman', 'cat'], easy: false },
    ],
    yesterday: ['atm_mall', 'family', 'pizza', 'romashka'],
    drive: [{ leg: 2, type: 'closure' }],
    crew: true,
    tip: 'Снег — едем медленнее. И не так, как вчера',
  },
};

// ─────────────────────────── расчёты маршрута (без DOM) ───────────────────────────
export const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min) % 60).padStart(2, '0')}`;

export function pointsFor(cfg, diff) {
  return cfg.points.filter((p) => !(p.easy === false && diff === 'easy'));
}

// Путь по улицам: сначала по горизонтали, потом по вертикали
export function legPath(a, b) {
  const pts = [[a.x, a.y]];
  if (a.x !== b.x && a.y !== b.y) pts.push([b.x, a.y]);
  pts.push([b.x, b.y]);
  return pts;
}

function inZone(z, x, y) {
  return x >= z.x[0] && x <= z.x[1] && y >= z.y[0] && y <= z.y[1];
}

// Минуты на перегон: каждый квартал отдельно — в пробке медленнее
export function legTime(cfg, a, b, t) {
  const path = legPath(a, b);
  let minutes = 0;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const n = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    for (let s = 0; s < n; s++) {
      const mx = x0 + ((x1 - x0) / n) * (s + 0.5);
      const my = y0 + ((y1 - y0) / n) * (s + 0.5);
      const z = cfg.traffic;
      const jam = z && inZone(z, mx, my) && t + minutes >= z.from && t + minutes < z.to;
      minutes += cfg.speed * (jam ? z.k : 1);
    }
  }
  return minutes;
}

export function blocks(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Расписание по маршруту: прибытие, ожидание, опоздание, пустые банкоматы
export function schedule(cfg, order, pts, extra = {}) {
  let t = cfg.start;
  let at = cfg.depot;
  let km = 0;
  const stops = [];
  for (const id of order) {
    const p = pts.find((x) => x.id === id);
    t += legTime(cfg, at, p, t) + (extra[id] || 0);
    km += blocks(at, p);
    const arrive = t;
    let wait = 0;
    let late = 0;
    let emptyFor = 0;
    if (p.type === 'shop') {
      if (t < p.win[0]) {
        wait = p.win[0] - t;
        t = p.win[0];
      }
      if (arrive > p.win[1]) late = arrive - p.win[1];
    } else if (arrive > p.empty) emptyFor = arrive - p.empty;
    t += SERVICE[p.type];
    stops.push({ id, arrive, wait, late, emptyFor, leave: t });
    at = p;
  }
  const back = t + legTime(cfg, at, cfg.depot, t);
  km += blocks(at, cfg.depot);
  return { stops, back, km };
}

export function sameAsYesterday(cfg, order, pts) {
  if (!cfg.yesterday) return false;
  const y = cfg.yesterday.filter((id) => pts.some((p) => p.id === id));
  return y.length === order.length && y.every((id, i) => order[i] === id);
}
