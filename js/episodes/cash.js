// Инкассатор: планирование маршрута → выезд → сдача ценностей в хранилище.
// Экшен строится на бдительности и правилах: заметить хвост, осмотреться, проверить пломбу, не нарушать процедуру.
import { CASH_SHIFTS, GRID, DISTRICTS, STREET, ODD, CARS, TAIL, TAIL_DECOY, CREW, ROLES, VAULT_STEPS, VAULT_DECOY, SERVICE, HOSTS, fmt, pointsFor, legPath, legTime, schedule, sameAsYesterday } from '../data/cash.js';
import { KNOWLEDGE } from '../data/professions.js';
import { el, openPanel, termBar, sleep, flash, tour } from '../ui.js';
import { person } from '../portraits.js';
import { story, setBeat, bakeryLine } from '../story.js';

const TUNE = {
  easy: { warn: true, colors: true, mpm: 190, tiles: 4, sealHint: true, seenTag: true },
  normal: { warn: true, colors: false, mpm: 150, tiles: 6, sealHint: false, seenTag: false },
  hard: { warn: false, colors: false, mpm: 120, tiles: 6, sealHint: false, seenTag: false, decoy: true, shuffleCassettes: true },
};
const S = 100;
const PAD = 60;
const X = (x) => PAD + x * S;
const Y = (y) => PAD + y * S;
const NS = 'http://www.w3.org/2000/svg';
const DENOMS = [100, 500, 1000, 5000];
const svgEl = (tag, attrs = {}, text = null) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
// Детерминированная «случайность» — смена всегда одинакова при переигровке
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function shuffled(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function data(ctx) {
  ctx.prof.data.cash = ctx.prof.data.cash || { order: null, sec: [], notes: [], learned: [], errs: [], van: [], times: {}, flags: {} };
  return ctx.prof.data.cash;
}

// ─────────────────────────── карта города (SVG) ───────────────────────────
function cityMap(cfg, pts, { yesterday = null } = {}) {
  const W = PAD * 2 + GRID.cols * S;
  const H = PAD * 2 + GRID.rows * S;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'cm-svg' });
  svg.append(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#151b22', rx: 26 }));
  const r = rng(7);
  const deco = ['🏠', '🏢', '🌳', '🏫', '🏠', '🏢', '🏬', '🌳', '🏥', '🏭'];
  for (let bx = 0; bx < GRID.cols; bx++) {
    for (let by = 0; by < GRID.rows; by++) {
      const d = DISTRICTS.find((z) => bx >= z.x[0] && bx <= z.x[1] && by >= z.y[0] && by <= z.y[1]);
      const park = (bx === 3 && by === 4) || (bx === 9 && by === 6);
      svg.append(svgEl('rect', { x: X(bx) + 12, y: Y(by) + 12, width: S - 24, height: S - 24, rx: 10, fill: park ? '#1f4d33' : d ? d.color : '#232c36' }));
      const ico = park ? '🌳' : d?.name === 'Промзона' ? '🏭' : deco[Math.floor(r() * deco.length)];
      if (r() < 0.55 || park) svg.append(svgEl('text', { x: X(bx) + S / 2, y: Y(by) + S / 2 + 12, 'font-size': 34, 'text-anchor': 'middle', opacity: 0.45 }, ico));
    }
  }
  for (const d of DISTRICTS) svg.append(svgEl('text', { x: X(d.x[0]) + 16, y: Y(d.y[0]) + 30, class: 'cm-district' }, d.name.toUpperCase()));
  // улицы
  const streets = svgEl('g', { class: 'cm-streets' });
  for (let x = 0; x <= GRID.cols; x++) streets.append(svgEl('line', { x1: X(x), y1: Y(0), x2: X(x), y2: Y(GRID.rows) }));
  for (let y = 0; y <= GRID.rows; y++) streets.append(svgEl('line', { x1: X(0), y1: Y(y), x2: X(GRID.cols), y2: Y(y) }));
  svg.append(streets);
  if (cfg.traffic) {
    const z = cfg.traffic;
    svg.append(svgEl('rect', { x: X(z.x[0]) - 20, y: Y(z.y[0]) - 20, width: (z.x[1] - z.x[0]) * S + 40, height: (z.y[1] - z.y[0]) * S + 40, rx: 20, class: 'cm-jam' }));
    svg.append(svgEl('text', { x: X(z.x[0]), y: Y(z.y[1]) + 50, class: 'cm-jam-label' }, `🚦 пробки ${fmt(z.from)}–${fmt(z.to)}`));
  }
  const pathFor = (order, back = true) => {
    const stops = [cfg.depot, ...order.map((id) => pts.find((p) => p.id === id)), ...(back ? [cfg.depot] : [])];
    let d = `M${X(stops[0].x)} ${Y(stops[0].y)}`;
    for (let i = 1; i < stops.length; i++) for (const [x, y] of legPath(stops[i - 1], stops[i]).slice(1)) d += ` L${X(x)} ${Y(y)}`;
    return d;
  };
  if (yesterday) {
    svg.append(svgEl('path', { d: pathFor(yesterday), class: 'cm-yesterday' }));
  }
  const route = svgEl('path', { d: '', class: 'cm-route' });
  svg.append(route);
  const extra = svgEl('g');
  svg.append(extra);
  // хранилище
  const dep = svgEl('g', { class: 'cm-depot', transform: `translate(${X(cfg.depot.x)} ${Y(cfg.depot.y)})` });
  dep.append(svgEl('rect', { x: -40, y: -40, width: 80, height: 80, rx: 16 }), svgEl('text', { y: 14, 'font-size': 44, 'text-anchor': 'middle' }, '🏦'), svgEl('text', { y: 68, class: 'cm-label' }, 'Хранилище'));
  svg.append(dep);
  if (cfg.police) {
    const pol = svgEl('g', { class: 'cm-police', transform: `translate(${X(cfg.police.x)} ${Y(cfg.police.y)})` });
    pol.append(svgEl('circle', { r: 30 }), svgEl('text', { y: 12, 'font-size': 34, 'text-anchor': 'middle' }, '🚓'), svgEl('text', { y: 58, class: 'cm-label' }, 'Полиция'));
    svg.append(pol);
  }
  const ptEls = {};
  for (const p of pts) {
    const g = svgEl('g', { class: `cm-pt ${p.type}`, 'data-id': p.id, transform: `translate(${X(p.x)} ${Y(p.y)})` });
    g.append(svgEl('circle', { r: 56, class: 'cm-hit' }), svgEl('circle', { r: 38, class: 'cm-dot' }), svgEl('text', { y: 14, 'font-size': 40, 'text-anchor': 'middle' }, p.icon), svgEl('text', { y: 66, class: 'cm-label' }, p.short), svgEl('text', { y: 92, class: 'cm-win' }, p.type === 'atm' ? `пустеет ${fmt(p.empty)}` : `${fmt(p.win[0])}–${fmt(p.win[1])}`));
    const badge = svgEl('g', { class: 'cm-badge', transform: 'translate(30 -30)' });
    badge.append(svgEl('circle', { r: 20 }), svgEl('text', { y: 8, 'text-anchor': 'middle' }, ''));
    g.append(badge);
    ptEls[p.id] = g;
    svg.append(g);
  }
  const van = svgEl('g', { class: 'cm-van hidden', transform: `translate(${X(cfg.depot.x)} ${Y(cfg.depot.y)})` });
  van.append(svgEl('circle', { r: 34 }), svgEl('text', { y: 13, 'font-size': 40, 'text-anchor': 'middle' }, '🚐'));
  svg.append(van);
  const wrap = el('div', { class: 'cm-wrap' });
  wrap.append(svg);
  return {
    wrap,
    svg,
    pts: ptEls,
    extra,
    setRoute(order) {
      route.setAttribute('d', order.length ? pathFor(order, order.length === pts.length) : '');
      for (const p of pts) {
        const i = order.indexOf(p.id);
        ptEls[p.id].classList.toggle('in', i >= 0);
        ptEls[p.id].querySelector('.cm-badge text').textContent = i >= 0 ? String(i + 1) : '';
      }
    },
    vanAt(x, y) {
      van.classList.remove('hidden');
      van.setAttribute('transform', `translate(${x} ${y})`);
    },
    mark(id, cls) {
      ptEls[id]?.classList.add(cls);
    },
    drop(x, y, icon, label, cls = '') {
      const g = svgEl('g', { class: `cm-drop ${cls}`, transform: `translate(${X(x)} ${Y(y)})` });
      g.append(svgEl('circle', { r: 30 }), svgEl('text', { y: 12, 'font-size': 34, 'text-anchor': 'middle' }, icon));
      if (label) g.append(svgEl('text', { y: 58, class: 'cm-label' }, label));
      extra.append(g);
      return g;
    },
  };
}

// ═══════════════════════════ ФАЗА 1: планирование маршрута ═══════════════════════════
export function runPlan(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const tune = TUNE[diff] || TUNE.normal;
  const cfg = CASH_SHIFTS[shift.n];
  const pts = pointsFor(cfg, diff);
  const D = data(ctx);
  Object.assign(D, { order: null, sec: [], notes: [], learned: [], errs: [], van: [], times: {}, flags: {} });
  const learn = (k) => {
    if (ctx.learn(k)) D.learned.push(k);
  };
  const order = [];

  return new Promise((resolve) => {
    const panel = openPanel('cash plan');
    panel.append(termBar('Диспетчерская · план маршрута', ctx, el('span', { class: 'term-progress' }, `🕘 выезд в ${fmt(cfg.start)}`)));
    const yesterday = cfg.yesterday ? cfg.yesterday.filter((id) => pts.some((p) => p.id === id)) : null;
    const map = cityMap(cfg, pts, { yesterday });
    const list = el('div', { class: 'ck-list' });
    const sum = el('div', { class: 'ck-sum' });
    const warn = el('div', { class: 'ck-warn' });
    const go = el('button', { class: 'btn primary big', disabled: true }, '✓ Утвердить маршрут');
    const reset = el('button', { class: 'btn ghost small' }, '↺ Заново');
    const side = el(
      'div',
      { class: 'ck-side' },
      el('div', { class: 'ck-tip' }, `💡 ${cfg.tip}`),
      yesterday ? el('div', { class: 'ck-legend' }, el('i', { class: 'yest' }), 'вчерашний маршрут') : null,
      cfg.snow ? el('div', { class: 'ck-legend snow' }, '❄️ Снегопад: квартал — 6 минут вместо 4') : null,
      el('div', { class: 'ck-head' }, el('b', {}, '🗺 Маршрут'), reset),
      list,
      sum,
      warn,
      go,
    );
    const mapBox = el('div', { class: 'ck-map' }, el('p', { class: 'muted small tip' }, '👆 Нажимай на точки по порядку объезда. Нажми на точку в маршруте ещё раз — уберёшь её и следующие'), map.wrap);
    panel.append(el('div', { class: 'ck-grid' }, mapBox, side));
    setTimeout(() => tour('cash_plan'), 500);

    for (const p of pts) {
      map.pts[p.id].addEventListener('click', () => {
        const i = order.indexOf(p.id);
        if (i >= 0) order.splice(i);
        else order.push(p.id);
        audio.pin();
        render();
      });
    }
    reset.addEventListener('click', () => {
      order.length = 0;
      audio.click();
      render();
    });

    function render() {
      map.setRoute(order);
      const sch = schedule(cfg, order, pts);
      list.innerHTML = '';
      list.append(el('div', { class: 'ck-row depot' }, el('span', {}, '🏦'), el('b', {}, 'Хранилище'), el('small', {}, `выезд ${fmt(cfg.start)}`)));
      for (const s of sch.stops) {
        const p = pts.find((x) => x.id === s.id);
        let chip = el('span', { class: 'ck-chip ok' }, '✓ успеваем');
        if (s.late) chip = el('span', { class: 'ck-chip bad' }, `⚠ опоздание ${s.late} мин`);
        else if (s.emptyFor) chip = el('span', { class: 'ck-chip bad' }, `😠 пустой ${s.emptyFor} мин`);
        else if (s.wait) chip = el('span', { class: 'ck-chip wait' }, `⏳ ждём ${s.wait} мин`);
        if (!tune.warn) chip = el('span', { class: 'ck-chip' }, '');
        list.append(
          el(
            'div',
            { class: `ck-row ${p.type}` },
            el('span', {}, p.icon),
            el('div', {}, el('b', {}, p.title), el('small', {}, p.type === 'atm' ? `опустеет в ${fmt(p.empty)} · ${p.people}` : `окно ${fmt(p.win[0])}–${fmt(p.win[1])}`)),
            el('div', { class: 'ck-eta' }, el('b', {}, fmt(s.arrive)), chip),
          ),
        );
      }
      const left = pts.filter((p) => !order.includes(p.id));
      if (left.length) list.append(el('div', { class: 'ck-row empty' }, el('span', {}, '➕'), el('small', {}, `Осталось добавить: ${left.map((p) => p.icon).join(' ')}`)));
      else list.append(el('div', { class: 'ck-row depot' }, el('span', {}, '🏦'), el('b', {}, 'Обратно в хранилище'), el('small', {}, `к ${fmt(sch.back)}`)));
      sum.innerHTML = '';
      sum.append(el('span', {}, `🛣 ${sch.km} кварталов`), el('span', {}, `⛽ ${sch.km <= 34 ? 'топлива хватит' : 'топлива впритык'}`));
      warn.innerHTML = '';
      const same = order.length === pts.length && sameAsYesterday(cfg, order, pts);
      if (same) warn.append(el('div', { class: 'fb bad' }, '⚠ Точно как вчера! Одинаковый маршрут легко вычислить — это опасно'));
      if (tune.warn && order.length === pts.length) {
        const late = sch.stops.filter((s) => s.late || s.emptyFor).length;
        if (late) warn.append(el('div', { class: 'fb bad' }, `⚠ Не успеваем в ${late} ${late === 1 ? 'точку' : 'точки'}`));
        else if (!same) warn.append(el('div', { class: 'fb good' }, '✓ Все окна соблюдены'));
      }
      go.disabled = order.length !== pts.length;
    }
    render();

    go.addEventListener('click', () => {
      audio.click();
      const sch = schedule(cfg, order, pts);
      const same = sameAsYesterday(cfg, order, pts);
      D.order = [...order];
      learn('k_i_window');
      if (cfg.yesterday) {
        learn('k_i_route');
        if (same) {
          D.sec.push(['🔁', 'Маршрут совпал со вчерашним — его могли вычислить', 20]);
        } else D.notes.push(['🔀', 'Маршрут не такой, как вчера — его не вычислить', 'good']);
      }
      if (shift.n === 4 && !sch.stops.some((s) => s.emptyFor)) learn('k_i_priority');
      D.planned = sch.stops.map((s) => ({ id: s.id, arrive: s.arrive }));
      audio.stamp();
      resolve(null);
    });
  });
}

// ═══════════════════════════ ФАЗА 2: выезд ═══════════════════════════
export function runDrive(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const tune = TUNE[diff] || TUNE.normal;
  const cfg = CASH_SHIFTS[shift.n];
  const pts = pointsFor(cfg, diff);
  const D = data(ctx);
  const order = D.order || pts.map((p) => p.id);
  const r = rng(shift.n * 101 + 7);
  const learn = (k) => {
    if (ctx.learn(k)) D.learned.push(k);
  };
  const sec = (icon, text, pen) => D.sec.push([icon, text, pen]);
  const good = (icon, text) => D.notes.push([icon, text, 'good']);
  const err = (icon, text) => D.errs.push([icon, text]);
  D.van = [];
  D.times = {};
  D.atms = [];
  const events = cfg.drive || [];
  let clock = cfg.start;
  let fast = false;
  let paused = false;

  return new Promise((resolve) => {
    const panel = openPanel('cash drive');
    const clockEl = el('b', { class: 'ck-clock' }, fmt(clock));
    const fastBtn = el('button', { class: 'btn ghost small' }, '⏩');
    panel.append(termBar('Броневик · на маршруте', ctx, el('span', { class: 'term-progress' }, '🕘 ', clockEl), fastBtn));
    fastBtn.addEventListener('click', () => {
      fast = !fast;
      fastBtn.classList.toggle('on', fast);
      audio.click();
    });
    const map = cityMap(cfg, pts);
    map.setRoute(order);
    // зеркало и рация
    const mirrorCar = el('div', { class: 'mr-car' }, el('span', {}, '…'));
    const mirrorTxt = el('small', { class: 'mr-txt' }, 'дорога пустая');
    const mirror = el('div', { class: 'mirror' }, el('div', { class: 'mr-glass' }, mirrorCar), mirrorTxt);
    const radio = el('button', { class: 'btn danger radio-btn' }, '📻 Сообщить о хвосте');
    const statusEl = el('div', { class: 'dr-status' }, '🚐 Выезжаем из хранилища');
    const log = el('div', { class: 'dr-log' });
    const stage = el('div', { class: 'dr-stage hidden' });
    const side = el('div', { class: 'dr-side' }, el('h4', {}, '🪞 Зеркало заднего вида'), mirror, radio, statusEl, log);
    const mapBox = el('div', { class: 'ck-map dr-map' }, map.wrap, stage);
    panel.append(el('div', { class: 'ck-grid drive' }, mapBox, side));
    if (cfg.snow) panel.classList.add('snowing');

    function addLog(icon, text, kind = '') {
      log.prepend(el('div', { class: `dr-log-row ${kind}` }, el('span', {}, icon), el('p', {}, el('b', {}, `${fmt(clock)} `), text)));
      while (log.children.length > 7) log.lastElementChild.remove();
    }
    function status(t) {
      statusEl.textContent = t;
    }
    function tickClock() {
      clockEl.textContent = fmt(clock);
    }

    // ─── зеркало: кто едет сзади ───
    const tailEv = events.find((e) => e.type === 'tail');
    let mirrorN = 0;
    let tailFrom = -1;
    let tailSeen = 0;
    let tailOn = false;
    let tailDone = false;
    let decoyShown = false;
    function updateMirror() {
      mirrorN++;
      let car = null;
      const tailLen = cfg.tailLen || 4;
      if (tailOn && tailSeen < tailLen) {
        car = TAIL;
        tailSeen++;
      } else {
        if (tailOn && tailSeen >= tailLen && !tailDone) {
          tailDone = true;
          tailOn = false;
          if (!D.flags.tailReported) {
            sec('🚘', `Серый седан ${TAIL[2]} ехал за вами несколько кварталов — его никто не заметил`, 30);
            addLog('🚘', 'Серый седан свернул в переулок…', 'bad');
            if (cfg.storyTail) setBeat(ctx.state, 'tail', 'missed');
            radio.classList.remove('pulse-hint');
          }
        }
        if ((tune.decoy || cfg.decoy) && tailEv && !decoyShown && tailFrom < 0 && mirrorN === 2) {
          car = TAIL_DECOY;
          decoyShown = true;
        } else car = r() < 0.25 ? null : CARS[Math.floor(r() * CARS.length)];
      }
      mirrorCar.classList.remove('pop');
      void mirrorCar.offsetWidth;
      mirrorCar.classList.add('pop');
      if (!car) {
        mirrorCar.innerHTML = '';
        mirrorCar.append(el('span', { class: 'mr-empty' }, '🛣'));
        mirrorTxt.textContent = 'сзади никого';
        mirror.dataset.car = '';
        return;
      }
      mirrorCar.innerHTML = '';
      mirrorCar.append(el('span', {}, car[0]), el('em', {}, car[2]));
      mirrorTxt.textContent = car[1];
      mirror.dataset.car = car === TAIL ? 'tail' : 'other';
      if (car === TAIL && tune.seenTag && tailSeen >= 2) mirrorTxt.textContent = `${car[1]} · 👀 уже видели!`;
      if (car === TAIL && cfg.coachTail && diff !== 'hard' && tailSeen === 2 && !D.flags.tailReported) {
        status(`🪞 Серый седан ${TAIL[2]} снова сзади… Совпадение? Или хвост?`);
        radio.classList.add('pulse-hint');
        audio.heartbeat(90);
      }
    }

    // Сообщить о хвосте можно в любой момент: если броневик стоит на точке, сообщение уйдёт, как только тронемся
    let pendingRadio = false;
    radio.addEventListener('click', () => {
      if (D.flags.tailReported) return;
      audio.click();
      if (paused || !stage.classList.contains('hidden')) {
        pendingRadio = true;
        radio.classList.add('queued');
        status('📻 Сообщим диспетчеру, как только закончим здесь');
        return;
      }
      reportTail();
    });
    async function flushRadio() {
      if (!pendingRadio || D.flags.tailReported) return;
      pendingRadio = false;
      radio.classList.remove('queued');
      await reportTail();
    }
    async function reportTail() {
      paused = true;
      const isTail = mirror.dataset.car === 'tail' || (tailOn && tailSeen > 0);
      if (isTail && tailSeen >= 2) {
        D.flags.tailReported = true;
        tailOn = false;
        tailDone = true;
        radio.classList.remove('pulse-hint');
        audio.heartbeat(0);
        const v = await choice(
          '📻 Диспетчер: «Хвост? Что делаете?»',
          `За вами ${TAIL[1]} ${TAIL[2]} уже ${tailSeen} ${tailSeen < 5 ? 'поворота' : 'поворотов'}. Действуй по протоколу.`,
          [
            ['🚓 Свернуть с маршрута — к отделу полиции', 'police', 'safe'],
            ['🏎 Оторваться: газ в пол', 'race', 'ghost'],
            ['🛑 Остановиться и выяснить, что им нужно', 'stop', 'ghost'],
            ['🤷 Ехать дальше как ни в чём не бывало', 'ignore', 'ghost'],
          ],
        );
        if (cfg.storyTail) setBeat(ctx.state, 'tail', v === 'police' ? 'caught' : 'missed');
        if (v === 'police') {
          learn('k_i_tail');
          good('🚓', `Заметили хвост ${TAIL[2]}, сообщили диспетчеру и уехали к полиции — машину задержали`);
          addLog('🚓', 'Едем к отделу полиции. Седан отстал — его остановил патруль', 'good');
          D.flags.police = true;
          clock += 8;
          tickClock();
          if (cfg.police) {
            map.drop(cfg.police.x, cfg.police.y, '✅', '', 'ok');
          }
          flash('green');
          audio.success();
        } else {
          sec('🚘', v === 'race' ? 'Гонка с деньгами в машине — опасно для всех вокруг' : v === 'stop' ? 'Остановились выяснять — именно этого и ждали преступники' : 'Заметили хвост, но ничего не сделали', 25);
          addLog('⚠', 'Это против протокола. Хорошо, что обошлось', 'bad');
          audio.wrong();
        }
      } else if (isTail) {
        addLog('📻', 'Диспетчер: «Одна машина за спиной — ещё не хвост. Наблюдай»');
      } else {
        sec('📻', 'Ложная тревога: диспетчер проверил — за вами никого', 5);
        addLog('📻', 'Диспетчер: «Проверили — чисто». Ложная тревога', 'bad');
        audio.wrong();
      }
      paused = false;
    }

    // ─── окно выбора поверх карты ───
    function choice(title, text, opts, extra = null) {
      return new Promise((done) => {
        stage.innerHTML = '';
        stage.classList.remove('hidden');
        const card = el('div', { class: 'dr-card' }, el('h3', {}, title), text ? el('p', {}, text) : null, extra);
        const row = el('div', { class: 'dr-btns' });
        for (const [label, v, cls] of opts) row.append(el('button', { class: `btn ${cls || 'ghost'}`, onClick: () => { audio.click(); stage.classList.add('hidden'); done(v); } }, label));
        card.append(row);
        stage.append(card);
        audio.notify();
      });
    }

    // ─── движение броневика по улицам ───
    function animateTo(ax, ay, bx, by, minutes) {
      return new Promise((done) => {
        const ms = (minutes * tune.mpm) / (fast ? 3 : 1);
        const t0 = performance.now();
        let pausedAt = 0;
        const stepF = (now) => {
          if (paused || ctx.isPaused()) {
            if (!pausedAt) pausedAt = now;
            requestAnimationFrame(stepF);
            return;
          }
          if (pausedAt) {
            const shift = now - pausedAt;
            pausedAt = 0;
            stepF.t0 = (stepF.t0 || t0) + shift;
          }
          const k = Math.min(1, (now - (stepF.t0 || t0)) / ms);
          map.vanAt(ax + (bx - ax) * k, ay + (by - ay) * k);
          if (k < 1) requestAnimationFrame(stepF);
          else done();
        };
        requestAnimationFrame(stepF);
      });
    }
    async function drive(from, to, legIdx) {
      const path = legPath(from, to);
      for (let i = 1; i < path.length; i++) {
        const [x0, y0] = path[i - 1];
        const [x1, y1] = path[i];
        const n = Math.abs(x1 - x0) + Math.abs(y1 - y0);
        // по кварталу: зеркало обновляется каждые два квартала
        for (let s = 0; s < n; s++) {
          const ax = x0 + ((x1 - x0) / n) * s;
          const ay = y0 + ((y1 - y0) / n) * s;
          const bx = x0 + ((x1 - x0) / n) * (s + 1);
          const by = y0 + ((y1 - y0) / n) * (s + 1);
          const minutes = legTime(cfg, { x: ax, y: ay }, { x: bx, y: by }, clock);
          await animateTo(X(ax), Y(ay), X(bx), Y(by), minutes);
          clock += minutes;
          tickClock();
          if (s % 2 === 1 || s === n - 1) updateMirror();
          while (paused) await sleep(150);
          await flushRadio();
          // перекрытие посреди перегона
          const cl = events.find((e) => e.type === 'closure' && e.leg === legIdx && !e.done);
          if (cl && i === 1 && s === 0) {
            cl.done = true;
            const dx = Math.sign(x1 - x0);
            const dy = Math.sign(y1 - y0);
            await closure(bx + dx * 0.5, by + dy * 0.5);
          }
        }
      }
    }

    async function closure(x, y) {
      paused = true;
      map.drop(x, y, '🚧', 'перекрыто', 'bad');
      audio.alarm(false);
      const k = cfg.snow ? 1.5 : 1;
      const opts = shuffled(
        [
          [`↪ Объезд дворами · +${Math.round(6 * k)} мин`, Math.round(6 * k), 'ghost'],
          [`🏙 Через центр · +${Math.round(15 * k)} мин, там пробка`, Math.round(15 * k), 'ghost'],
          [`⏳ Ждать, пока откроют · +30 мин`, 30, 'ghost'],
        ],
        r,
      );
      const v = await choice('🚧 Улица перекрыта', 'Впереди ремонт трубы, проезда нет. Как поедем?', opts);
      clock += v;
      tickClock();
      map.extra.lastElementChild?.classList.add('passed');
      if (v === Math.round(6 * k)) {
        learn('k_i_detour');
        good('🚧', 'Перекрытие объехали самым быстрым путём');
        addLog('↪', `Объезд: +${v} мин`, 'good');
      } else {
        err('🚧', `Перекрытие: выбрали долгий объезд (+${v} мин)`);
        addLog('🚧', `Потеряли ${v} мин на объезде`, 'bad');
      }
      paused = false;
    }

    // ─── процедуры на точке ───
    async function lookAround(p, first) {
      const tiles = shuffled([...new Set([...p.look, ...shuffled(Object.keys(STREET).filter((k) => !ODD.includes(k) && k !== 'snowman'), r).slice(0, 4)])].slice(0, tune.tiles - (p.odd ? 1 : 0)).concat(p.odd ? [p.odd] : []), r);
      let picked = null;
      const grid = el('div', { class: 'street' });
      for (const id of tiles) {
        const [ico, txt] = STREET[id];
        const t = el('button', { class: 'st-tile' }, el('span', {}, ico), el('small', {}, txt));
        t.addEventListener('click', () => {
          picked = picked === id ? null : id;
          grid.querySelectorAll('.st-tile').forEach((b) => b.classList.remove('on'));
          if (picked) t.classList.add('on');
          flagBtn.disabled = !picked;
          audio.blip(500);
        });
        grid.append(t);
      }
      const flagBtn = el('button', { class: 'btn danger', disabled: true }, '🚩 Подозрительно — сообщить');
      const clearBtn = el('button', { class: 'btn safe' }, '✅ Всё спокойно — выходим');
      paused = true;
      stage.innerHTML = '';
      stage.classList.remove('hidden');
      const card = el('div', { class: 'dr-card wide' }, el('h3', {}, `👀 ${p.title}: осмотрись перед выходом`), el('p', { class: 'muted small' }, first ? 'Прежде чем открыть дверь, посмотри на улицу. Есть что-то странное? Нажми на это.' : 'Есть что-то странное? Нажми на это.'), grid, el('div', { class: 'dr-btns row2' }, clearBtn, flagBtn));
      stage.append(card);
      const v = await new Promise((done) => {
        clearBtn.addEventListener('click', () => done('clear'));
        flagBtn.addEventListener('click', () => done(picked));
      });
      audio.click();
      if (v === 'clear') {
        if (p.odd) {
          sec(STREET[p.odd][0], `${p.title}: не заметили «${STREET[p.odd][1].toLowerCase()}»`, 20);
          addLog('⚠', 'Вышли, не заметив подозрительного', 'bad');
          if (p.drill) D.flags.drill = 'missed';
        } else {
          learn('k_i_look');
          addLog('👀', 'Осмотрелись — чисто');
        }
      } else if (v === p.odd) {
        learn('k_i_look');
        if (p.drill) D.flags.drill = 'caught';
        good(STREET[p.odd][0], `${p.title}: заметили — ${STREET[p.odd][1].toLowerCase()}. Объехали квартал, вызвали охрану`);
        addLog('🚩', 'Сообщили диспетчеру. Объезжаем квартал — +5 мин', 'good');
        clock += 5;
        tickClock();
        flash('green');
        audio.success();
        await choice('📻 Диспетчер', 'Принято. Охрана объекта уже вышла. Подождите пару минут и работайте.', [['👍 Понял', 'ok', 'primary']]);
      } else if (p.odd) {
        sec('🚩', `${p.title}: насторожились не из-за того — «${STREET[p.odd][1].toLowerCase()}» пропустили`, 10);
        addLog('⚠', 'Ложная тревога, а настоящая угроза — рядом', 'bad');
        if (p.drill) D.flags.drill = 'missed';
      } else {
        sec('📻', `${p.title}: ложная тревога («${STREET[v][1].toLowerCase()}»)`, 5);
        addLog('📻', 'Диспетчер: «Проверили — это обычный прохожий»', 'bad');
      }
      stage.classList.add('hidden');
      paused = false;
    }

    async function crewSetup() {
      paused = true;
      const pick = {};
      const cards = CREW.map((c) => {
        const btns = el('div', { class: 'crew-roles' });
        for (const [rid, [ico, name]] of Object.entries(ROLES)) {
          const b = el('button', { class: 'r-thr-btn', 'data-r': rid }, `${ico} ${name}`);
          b.addEventListener('click', () => {
            for (const k of Object.keys(pick)) if (pick[k] === rid) delete pick[k];
            pick[c.id] = rid;
            audio.click();
            renderCrew();
          });
          btns.append(b);
        }
        return el('div', { class: 'crew-card', 'data-id': c.id }, el('div', { class: 'crew-ava', html: person(c.look, 'neutral') }), el('div', {}, el('b', {}, c.name), el('small', {}, c.note)), btns);
      });
      const go = el('button', { class: 'btn primary', disabled: true }, '🚐 Выезжаем');
      function renderCrew() {
        for (const card of cards) card.querySelectorAll('button').forEach((b) => b.classList.toggle('on', pick[card.dataset.id] === b.dataset.r));
        go.disabled = Object.keys(pick).length !== 3;
      }
      const v = await new Promise((done) => {
        stage.innerHTML = '';
        stage.classList.remove('hidden');
        go.addEventListener('click', () => done(pick));
        stage.append(el('div', { class: 'dr-card wide' }, el('h3', {}, '🧑‍✈️ Ты старший бригады. Распредели роли'), el('p', { class: 'muted small' }, Object.values(ROLES).map(([i, n, d]) => `${i} ${n} — ${d}`).join(' · ')), el('div', { class: 'crew' }, cards), go));
      });
      audio.click();
      stage.classList.add('hidden');
      const wrong = CREW.filter((c) => v[c.id] !== c.role);
      if (v.petrovich !== 'driver') sec('🚐', 'За руль в снегопад посадили не самого опытного водителя', 15);
      else if (wrong.length) err('🧑‍✈️', 'Сборщик и охранник перепутаны: быстрый — за сумкой, внимательный — прикрывает');
      if (!wrong.length) good('🧑‍✈️', 'Роли в бригаде распределены верно');
      paused = false;
    }

    async function driverAsk(p) {
      const v = await choice('🚐 Петрович', '«Давай я сам сбегаю за сумкой — Саша долго копается. А то замёрзнем!»', [
        ['✋ Нет: водитель всегда остаётся в машине', 'no', 'safe'],
        ['👌 Давай, только быстро', 'yes', 'ghost'],
      ]);
      learn('k_i_driver');
      if (v === 'no') good('🚐', `${p.short}: водитель остался за рулём — машина готова уехать в любую секунду`);
      else {
        sec('🚐', `${p.short}: водитель вышел из машины — броневик остался без водителя`, 25);
        addLog('⚠', 'Водитель вышел из машины. Обошлось — но это грубое нарушение', 'bad');
      }
    }

    async function coffee() {
      paused = true;
      const v = await choice('☕ Саша', '«Давай заскочим за кофе? Две минуты, тут рядом!»', [
        ['✋ Нет: с ценностями — никаких остановок', 'no', 'safe'],
        ['☕ Ладно, только быстро', 'yes', 'ghost'],
      ]);
      learn('k_i_rules');
      if (v === 'no') {
        good('☕', 'Отказались от остановки за кофе — деньги в машине');
        addLog('✋', 'Кофе — после смены');
      } else {
        sec('☕', 'Остановились за кофе с ценностями в машине. Ничего не случилось — но это нарушение', 25);
        addLog('☕', '+5 мин на кофе. Нарушение', 'bad');
        clock += 5;
        tickClock();
      }
      paused = false;
    }

    function sealView(p) {
      const bagSeal = p.bagSeal || p.seal;
      const torn = p.bag === 'torn';
      const diffChars = (a, b) => [...a].map((ch, i) => el('span', { class: tune.sealHint && ch !== b[i] ? 'df' : '' }, ch));
      return el(
        'div',
        { class: 'seal-row' },
        el('div', { class: `bag${torn ? ' torn' : ''}` }, el('span', { class: 'bag-ico' }, '💼'), el('div', { class: 'seal-tag' }, el('small', {}, 'пломба'), el('b', {}, ...diffChars(bagSeal, p.seal)), el('em', {}, torn ? '💔 надорвана' : '🔒 целая'))),
        el('div', { class: 'vedomost' }, el('small', {}, '📋 Ведомость'), el('b', {}, p.title), el('div', {}, 'Пломба № ', el('b', {}, ...diffChars(p.seal, bagSeal))), el('small', {}, `сумка 1 из 1`)),
      );
    }

    async function takeBag(p) {
      const bad = !!p.bag;
      const host = p.host && HOSTS[p.host];
      const extra = host ? el('div', {}, el('div', { class: 'host-line' }, el('span', { class: 'host-ava', html: person(host.look, 'happy') }), el('p', {}, el('b', {}, `${host.name}: `), bakeryLine(ctx.state))), sealView(p)) : sealView(p);
      if (host && p.host === 'bakery' && !story(ctx.state).bakery) setBeat(ctx.state, 'bakeryCash', true);
      const v = await choice(`💼 ${p.title}: приём сумки`, 'Сверь номер пломбы с ведомостью и проверь, цела ли пломба.', [
        ['✍️ Принять и расписаться', 'take', 'safe'],
        ['⛔ Не принимать — составить акт', 'refuse', 'danger'],
      ], extra);
      const bagSeal = p.bagSeal || p.seal;
      if (v === 'take') {
        D.van.push({ id: p.id, title: p.title, icon: p.icon, seal: p.seal, bagSeal, state: p.bag || 'ok' });
        if (bad) {
          sec('💼', `${p.title}: приняли сумку ${p.bag === 'torn' ? 'с надорванной пломбой' : `с чужим номером пломбы (${bagSeal} вместо ${p.seal})`}`, 25);
          addLog('💼', 'Сумка принята', 'bad');
        } else addLog('💼', `Сумка ${p.seal} принята`);
        audio.coin();
      } else {
        D.van.push({ id: p.id, title: p.title, icon: p.icon, seal: p.seal, bagSeal, state: 'refused', why: p.bag });
        if (bad) {
          learn('k_i_seal');
          good('⛔', `${p.title}: сумку ${p.bag === 'torn' ? 'с надорванной пломбой' : 'с чужим номером пломбы'} не приняли, составили акт`);
          addLog('⛔', 'Акт составлен, сумку не берём', 'good');
          audio.stamp();
        } else {
          err('⛔', `${p.title}: отказались от нормальной сумки — магазин остался без инкассации`);
          addLog('⛔', 'Отказались зря — пломба была в порядке', 'bad');
          audio.wrong();
        }
      }
    }

    async function loadAtm(p) {
      const bundles = shuffled(DENOMS, r);
      const cassettes = tune.shuffleCassettes ? shuffled(DENOMS, r) : DENOMS;
      const placed = {};
      let sel = null;
      const tray = el('div', { class: 'atm-tray' });
      const slots = el('div', { class: 'atm-slots' });
      const close = el('button', { class: 'btn primary', disabled: true }, '🔒 Закрыть банкомат');
      function render() {
        tray.innerHTML = '';
        for (const v of bundles) {
          if (Object.values(placed).includes(v)) continue;
          const b = el('button', { class: `note n${v} bundle${sel === v ? ' sel' : ''}${tune.colors ? '' : ' plain'}` }, el('b', {}, v.toLocaleString('ru-RU')), el('i', { class: 'uv-mark' }));
          b.addEventListener('click', () => {
            sel = sel === v ? null : v;
            audio.blip(600);
            render();
          });
          tray.append(b);
        }
        if (!tray.children.length) tray.append(el('small', { class: 'muted' }, 'все пачки в кассетах'));
        slots.innerHTML = '';
        cassettes.forEach((c, i) => {
          const v = placed[i];
          const s = el('button', { class: `cassette${tune.colors ? ` c${c}` : ''}${v ? ' full' : ''}` }, el('small', {}, `кассета ${i + 1}`), el('b', {}, `${c.toLocaleString('ru-RU')} ₽`), v ? el('span', { class: `note n${v} mini${tune.colors ? '' : ' plain'}` }, el('b', {}, v.toLocaleString('ru-RU'))) : el('span', { class: 'slot-empty' }, 'пусто'));
          s.addEventListener('click', () => {
            if (v) {
              delete placed[i];
              audio.click();
            } else if (sel != null) {
              placed[i] = sel;
              sel = null;
              audio.pin();
            }
            render();
          });
          slots.append(s);
        });
        close.disabled = Object.keys(placed).length !== DENOMS.length;
      }
      render();
      paused = true;
      stage.innerHTML = '';
      stage.classList.remove('hidden');
      stage.append(el('div', { class: 'dr-card wide' }, el('h3', {}, `🏧 ${p.title}: загрузка`), el('p', { class: 'muted small' }, '👆 Нажми на пачку, потом на кассету. Номинал к номиналу!'), el('h4', {}, 'Пачки купюр'), tray, el('h4', {}, 'Кассеты банкомата'), slots, close));
      await new Promise((done) => close.addEventListener('click', done));
      audio.click();
      const ok = cassettes.every((c, i) => placed[i] === c);
      D.atms.push({ id: p.id, title: p.title, ok });
      if (ok) {
        learn('k_i_cassette');
        addLog('🏧', `${p.short}: кассеты заряжены`, 'good');
        audio.coin();
      } else {
        const wrong = cassettes.map((c, i) => [c, placed[i]]).find(([c, v]) => c !== v);
        err('🏧', `${p.title} выдаёт ${wrong[1].toLocaleString('ru-RU')} ₽ вместо ${wrong[0].toLocaleString('ru-RU')} ₽ — перепутаны кассеты`);
        addLog('🏧', 'Кассеты перепутаны…', 'bad');
        audio.wrong();
      }
      stage.classList.add('hidden');
      paused = false;
    }

    (async () => {
      map.vanAt(X(cfg.depot.x), Y(cfg.depot.y));
      updateMirror();
      await sleep(400);
      await tour('cash_drive');
      await sleep(200);
      if (cfg.crew) await crewSetup();
      if (cfg.snow) addLog('❄️', 'Снегопад: едем медленнее');
      let at = cfg.depot;
      for (let i = 0; i < order.length; i++) {
        const p = pts.find((x) => x.id === order[i]);
        const legIdx = i + 1;
        if (events.some((e) => e.type === 'coffee' && e.leg === legIdx)) await coffee();
        if (tailEv && tailEv.leg === legIdx && tailFrom < 0) {
          tailFrom = mirrorN;
          tailOn = true;
        }
        status(`🚐 Едем: ${p.icon} ${p.title}`);
        await drive(at, p, legIdx);
        at = p;
        // прибыли
        D.times[p.id] = clock;
        const lateBy = p.type === 'shop' ? clock - p.win[1] : clock - p.empty;
        if (p.type === 'shop' && clock < p.win[0]) {
          addLog('⏳', `${p.short}: ждём открытия кассы до ${fmt(p.win[0])}`);
          clock = p.win[0];
          tickClock();
        }
        if (lateBy > 0) {
          addLog(p.type === 'atm' ? '😠' : '⏰', p.type === 'atm' ? `${p.short}: банкомат пустой уже ${lateBy} мин, люди злятся` : `${p.short}: опоздали на ${lateBy} мин`, 'bad');
          map.mark(p.id, 'late');
        } else map.mark(p.id, 'done');
        status(`🛑 ${p.icon} ${p.title}`);
        await lookAround(p, i === 0);
        if (p.driverAsk) await driverAsk(p);
        if (p.type === 'shop') await takeBag(p);
        else await loadAtm(p);
        await flushRadio();
        clock += SERVICE[p.type];
        tickClock();
      }
      status('🏦 Возвращаемся в хранилище');
      await drive(at, cfg.depot, order.length + 1);
      D.back = clock;
      if (tailEv && !D.flags.tailReported && !tailDone) {
        sec('🚘', `Серый седан ${TAIL[2]} ехал за вами — его никто не заметил`, 30);
        if (cfg.storyTail) setBeat(ctx.state, 'tail', 'missed');
      }
      audio.heartbeat(0);
      status('🏦 Приехали. Сдай ценности в хранилище');
      addLog('🏦', 'Маршрут завершён', 'good');
      audio.success();
      await sleep(900);
      resolve(null);
    })();
  });
}

// ═══════════════════════════ ФАЗА 3: хранилище ═══════════════════════════
export function runVault(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const cfg = CASH_SHIFTS[shift.n];
  const pts = pointsFor(cfg, diff);
  const D = data(ctx);
  const r = rng(shift.n * 31 + 3);
  const learn = (k) => {
    if (ctx.learn(k)) D.learned.push(k);
  };
  const van = D.van || [];
  let vaultErr = 0;

  return new Promise((resolve) => {
    const panel = openPanel('cash vault');
    panel.append(termBar('Хранилище · сдача ценностей', ctx));
    const body = el('div', { class: 'vt-body' });
    panel.append(body);

    async function procedure() {
      const steps = shuffled([...VAULT_STEPS.map((s, i) => [...s, i]), [...VAULT_DECOY, -1]], r);
      let next = 0;
      let wrong = 0;
      const seq = el('div', { class: 'vt-seq' }, VAULT_STEPS.map((_, i) => el('i', {}, String(i + 1))));
      const grid = el('div', { class: 'vt-steps' });
      return new Promise((done) => {
        for (const [ico, text, idx] of steps) {
          const b = el('button', { class: 'vt-step' }, el('span', {}, ico), el('b', {}, text));
          b.addEventListener('click', () => {
            if (idx === -1) {
              D.sec.push(['🍔', 'Хотели оставить сумки у двери без присмотра', 15]);
              b.classList.add('wrong');
              b.disabled = true;
              audio.wrong();
              return;
            }
            if (idx !== next) {
              wrong++;
              b.classList.remove('shake');
              void b.offsetWidth;
              b.classList.add('shake');
              audio.wrong();
              return;
            }
            b.disabled = true;
            b.classList.add('done');
            b.append(el('em', {}, String(next + 1)));
            seq.children[next].classList.add('on');
            next++;
            audio.pin();
            if (next === VAULT_STEPS.length) {
              learn('k_i_rules');
              if (wrong >= 2) D.errs.push(['📋', `Процедура сдачи: ${wrong} ${wrong < 5 ? 'ошибки' : 'ошибок'} в порядке действий`]);
              setTimeout(done, 700);
            }
          });
          grid.append(b);
        }
        body.innerHTML = '';
        body.append(el('div', { class: 'tl-step' }, el('span', { class: 'r-n' }, '1'), el('b', {}, 'Процедура: что делаем по порядку?')), el('p', { class: 'muted small' }, '👆 Нажимай действия в правильном порядке. Одно из них — лишнее'), seq, grid);
      });
    }

    async function reconcile(n) {
      body.innerHTML = '';
      const bags = van.filter((b) => b.state !== 'refused');
      const refused = van.filter((b) => b.state === 'refused');
      const marks = {};
      const done = el('button', { class: 'btn primary big', disabled: !!bags.length }, '🏦 Сдать в хранилище');
      const rows = el('div', { class: 'vt-rows' });
      for (const b of bags) {
        const ok = el('button', { class: 'btn ghost small' }, '✓ Сходится');
        const no = el('button', { class: 'btn ghost small' }, '✗ Акт');
        const row = el('div', { class: 'vt-row' }, el('span', { class: 'vt-ico' }, b.icon), el('div', {}, el('b', {}, b.title), el('small', {}, `ведомость: ${b.seal}`)), el('div', { class: `vt-bag ${b.state}` }, el('small', {}, 'сумка'), el('b', {}, b.bagSeal), el('em', {}, b.state === 'torn' ? '💔 надорвана' : '🔒 целая')), el('div', { class: 'vt-act' }, ok, no));
        const set = (v) => {
          marks[b.id] = v;
          ok.classList.toggle('on', v === 'ok');
          no.classList.toggle('on', v === 'act');
          audio.click();
          done.disabled = Object.keys(marks).length !== bags.length;
        };
        ok.addEventListener('click', () => set('ok'));
        no.addEventListener('click', () => set('act'));
        rows.append(row);
      }
      for (const b of refused) rows.append(el('div', { class: 'vt-row refused' }, el('span', { class: 'vt-ico' }, b.icon), el('div', {}, el('b', {}, b.title), el('small', {}, `ведомость: ${b.seal}`)), el('div', { class: 'vt-bag refused' }, el('small', {}, 'сумки нет'), el('b', {}, '⛔ акт')), el('div', { class: 'vt-act' }, el('small', { class: 'muted' }, 'не принята на точке'))));
      for (const a of D.atms || []) rows.append(el('div', { class: 'vt-row atm' }, el('span', { class: 'vt-ico' }, '🏧'), el('div', {}, el('b', {}, a.title), el('small', {}, 'старые кассеты')), el('div', { class: 'vt-bag' }, el('small', {}, 'кассеты'), el('b', {}, '4 / 4')), el('div', { class: 'vt-act' }, el('small', { class: 'muted' }, '✓ сданы'))));
      body.append(el('div', { class: 'tl-step' }, el('span', { class: 'r-n' }, String(n)), el('b', {}, 'Сверь сумки с ведомостью')), el('p', { class: 'muted small' }, bags.length ? '🔢 Номер пломбы на сумке должен совпадать с ведомостью, а пломба — быть целой' : 'Сегодня только банкоматы — сдай старые кассеты'), el('div', { class: 'vt-count' }, `💼 В машине: ${bags.length} · ⛔ по актам: ${refused.length}${(D.atms || []).length ? ` · 🏧 кассеты: ${(D.atms || []).length}` : ''}`), rows, done);
      await new Promise((res) => done.addEventListener('click', res));
      audio.click();
      for (const b of bags) {
        const bad = b.state !== 'ok' || b.bagSeal !== b.seal;
        if (bad && marks[b.id] === 'ok') {
          vaultErr++;
          D.sec.push(['🏦', `${b.title}: сумку с ${b.state === 'torn' ? 'надорванной пломбой' : 'чужим номером'} сдали как нормальную`, 15]);
        } else if (!bad && marks[b.id] === 'act') {
          vaultErr++;
          D.errs.push(['🏦', `${b.title}: на нормальную сумку составили акт — лишняя проверка`]);
        } else if (bad) {
          learn('k_i_seal');
          D.notes.push(['🏦', `${b.title}: проблемную сумку заметили хотя бы в хранилище`, 'warn']);
        }
      }
      if (!vaultErr) learn('k_i_vault');
    }

    function finish() {
      const secScore = Math.max(0, 100 - D.sec.reduce((s, x) => s + x[2], 0));
      const late = [];
      const empty = [];
      for (const p of pts) {
        const t = D.times?.[p.id];
        if (t == null) continue;
        if (p.type === 'shop' && t > p.win[1]) late.push([p, t - p.win[1]]);
        if (p.type === 'atm' && t > p.empty) empty.push([p, t - p.empty]);
      }
      const timeErr = late.length + empty.length;
      const procErr = D.errs.length;
      const stars = secScore >= 90 && timeErr === 0 && procErr === 0 ? 3 : secScore >= 70 && timeErr <= 1 && procErr <= 1 ? 2 : 1;
      const score = Math.max(0, secScore * 3 + (pts.length - timeErr) * 40 - procErr * 30);
      ctx.addScore(score);
      if (empty.length === 0 && pts.some((p) => p.type === 'atm')) learn('k_i_priority');
      const cons = [];
      for (const [p, m] of empty) cons.push({ icon: '😠', text: `Новости: у банкомата «${p.short}» ${m} мин стояла очередь — он был пустой`, kind: 'bad' });
      for (const [p, m] of late) cons.push({ icon: '⏰', text: `${p.title}: приехали на ${m} мин позже — кассиры ждали`, kind: 'warn' });
      for (const [icon, text] of D.sec) cons.push({ icon, text, kind: 'bad' });
      for (const [icon, text] of D.errs) cons.push({ icon, text, kind: 'warn' });
      if (D.flags.drill === 'caught') cons.push({ icon: '🎓', text: 'Учебная проверка СБ: подозрительный человек у отделения был сотрудником безопасности. Ты его заметил!', kind: 'good' });
      if (D.flags.drill === 'missed') cons.push({ icon: '🎓', text: 'Учебная проверка СБ: человек у отделения был сотрудником безопасности. Ты его не заметил — в жизни это мог быть грабитель', kind: 'bad' });
      for (const [icon, text] of D.notes) cons.push({ icon, text, kind: 'good' });
      if (!empty.length && pts.some((p) => p.type === 'atm')) cons.push({ icon: '🏧', text: 'Новости: банкоматы работали весь вечер — город даже не заметил вашей работы', kind: 'good' });
      const onTime = pts.length - timeErr;
      resolve({
        stars,
        score,
        learned: [...new Set(D.learned)].filter((k) => KNOWLEDGE[k]),
        consequencesTitle: 'Новости и разбор смены',
        consequences: cons.slice(0, 7),
        stats: [
          ['🛡', `${secScore}/100`, 'безопасность'],
          ['⏰', `${onTime}/${pts.length}`, 'точек вовремя'],
          ['📋', String(procErr + vaultErr), 'ошибок в процедурах'],
        ],
      });
    }

    (async () => {
      let n = 1;
      if (cfg.vaultOrder) {
        await procedure();
        n = 2;
      }
      await reconcile(n);
      body.innerHTML = '';
      const stamp = el('div', { class: 'vt-stamp' }, 'ПРИНЯТО');
      body.append(el('div', { class: 'vt-done' }, el('div', { class: 'vt-door' }, '🏦'), stamp, el('p', {}, 'Ценности в хранилище. Смена окончена.')));
      audio.stamp();
      flash('green');
      await sleep(1600);
      finish();
    })();
  });
}

