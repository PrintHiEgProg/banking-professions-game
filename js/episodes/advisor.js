// Финансовый консультант: клиент с мечтой → разбор денег (трубы) → план → перемотка времени.
// Главная фишка — перемотка: месяцы летят, падают соблазны, подарки и беды, и жизнь проверяет план.
import { ADVISOR_SHIFTS, PRODUCTS, STYLE_TAGS, MONTHS, SEASON, CUT_FACTOR, income, monthlyFree, forecast, amountAt } from '../data/advisor.js';
import { KNOWLEDGE } from '../data/professions.js';
import { el, openPanel, termBar, sleep, money, num, flash } from '../ui.js';
import { person } from '../portraits.js';
import { runDialog } from './dialog.js';
import { setBeat } from '../story.js';

// Велосипед Миши: детали появляются по мере того, как растёт копилка
const NS = 'http://www.w3.org/2000/svg';
const BIKE_PARTS = [
  '<g><circle cx="52" cy="92" r="27"/><path d="M52 65v54M25 92h54M33 73l38 38M71 73l-38 38" class="spoke"/></g>',
  '<g><circle cx="168" cy="92" r="27"/><path d="M168 65v54M141 92h54M149 73l38 38M187 73l-38 38" class="spoke"/></g>',
  '<path d="M52 92 L96 92 L134 52 L78 52 Z M96 92 L78 52" class="frame"/>',
  '<path d="M168 92 L146 40 M136 36 L158 31" class="frame"/>',
  '<path d="M78 52 L76 42 M64 40 L90 40" class="seat"/>',
  '<g><circle cx="96" cy="92" r="8" class="gear"/><path d="M52 92 L96 92 M96 92 L106 104 M96 92 L86 80" class="chain"/></g>',
  '<g class="bell"><path d="M44 58 L44 26 L64 33 L44 40" class="flag"/><circle cx="152" cy="33" r="5" class="ding"/></g>',
];
function bikeSVG() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 128');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = BIKE_PARTS.map((p, i) => `<g class="bk-part" data-i="${i}">${p}</g>`).join('');
  return svg;
}

const TUNE = {
  easy: { hints: true, showDate: true, tick: 700, flyer: 2, wait: 25 },
  normal: { hints: false, showDate: true, tick: 560, flyer: 3, wait: 35 },
  hard: { hints: false, showDate: false, tick: 440, flyer: 4, wait: 45 },
};
const NEXT = { open: 'half', half: 'closed', closed: 'open' };
const VALVE = { open: '🟢', half: '🟡', closed: '🔴' };
const VALVE_TEXT = { open: 'открыт', half: 'наполовину', closed: 'закрыт' };

const monthName = (m) => MONTHS[(m - 1 + 12 * 10) % 12];
const season = (m) => SEASON[(m - 1 + 12 * 10) % 12];
const plural = (n, a, b, c) => {
  const k = Math.abs(n) % 100;
  const k1 = k % 10;
  if (k > 10 && k < 20) return c;
  if (k1 > 1 && k1 < 5) return b;
  if (k1 === 1) return a;
  return c;
};
const months = (n) => `${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}`;
const graphemes = (str) => (typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(str)].map((x) => x.segment) : Array.from(str)).filter((c) => c.trim());
const mon = (n) => `${n} мес`;

function clientHead(cfg, look = cfg.client.look) {
  const c = cfg.client;
  const avas = el('div', { class: 'ad-avas' }, el('div', { class: 'ad-ava', html: person(look, 'neutral') }), cfg.client.look2 ? el('div', { class: 'ad-ava two', html: person(cfg.client.look2, 'neutral') }) : null);
  return {
    avas,
    setEmo(emo) {
      avas.querySelectorAll('.ad-ava').forEach((a, i) => (a.innerHTML = person(i ? c.look2 : look, emo)));
    },
    setLook(lk, emo = 'neutral') {
      look = lk;
      avas.querySelector('.ad-ava').innerHTML = person(lk, emo);
      avas.querySelector('.ad-ava.two')?.classList.toggle('hidden', lk !== c.look);
    },
  };
}

function goalCard(cfg) {
  const g = cfg.goal;
  return el('div', { class: 'ad-goal' }, el('span', { class: 'ad-goal-ico' }, g.icon), el('div', {}, el('small', {}, 'Мечта'), el('b', {}, g.title), el('span', {}, `${money(g.price)} · ${g.when}`)));
}

function trustMeter() {
  const fill = el('i');
  const val = el('b', {}, '50');
  const box = el('div', { class: 'ad-trust' }, el('div', { class: 'meter-head' }, el('span', {}, '💚 Доверие'), val), el('div', { class: 'meter-bar' }, fill));
  return {
    box,
    set(v) {
      fill.style.transform = `scaleX(${Math.max(0, Math.min(100, v)) / 100})`;
      val.textContent = String(Math.round(v));
      fill.parentElement.dataset.level = v >= 60 ? 'ok' : v >= 35 ? 'mid' : 'low';
    },
  };
}

// ═══════════════════════════ ШАГ 1: разбор денег и план ═══════════════════════════
export function runAdvisor(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const tune = TUNE[diff] || TUNE.normal;
  const cfg = ADVISOR_SHIFTS[shift.n];
  const plan = {
    cuts: {},
    cushion: 0,
    product: cfg.products[0],
    trust: 50,
    mistakes: [],
    notes: [],
    learned: [],
    needTried: [],
    strict: false,
    pyramidWon: null,
    calcOk: null,
  };
  const learn = (k) => {
    if (ctx.learn(k)) plan.learned.push(k);
  };
  const note = (icon, text, kind = 'good') => plan.notes.push({ icon, text, kind });
  const mistake = (icon, text) => {
    plan.mistakes.push(text);
    note(icon, text, 'bad');
  };

  return new Promise((resolve) => {
    const panel = openPanel('advisor');
    const stepInfo = el('span', { class: 'term-progress' }, `${cfg.goal.icon} ${cfg.client.name}`);
    panel.append(termBar('Кабинет финансового консультанта', ctx, stepInfo));

    // ─── слева: клиент ───
    const head = clientHead(cfg);
    const trust = trustMeter();
    const bubble = el('div', { class: 'tl-bubble' });
    const left = el(
      'div',
      { class: 'ad-client' },
      head.avas,
      el('b', { class: 'tl-name' }, cfg.client.age ? `${cfg.client.name}, ${cfg.client.age}` : cfg.client.name),
      el('small', { class: 'muted' }, cfg.client.about),
      goalCard(cfg),
      cfg.lumpText ? el('div', { class: 'ad-lump' }, '✉️ ', cfg.lumpText) : null,
      trust.box,
      bubble,
    );
    const stepEl = el('div', { class: 'tl-step ad-step' });
    const work = el('div', { class: 'ad-work' });
    const center = el('div', { class: 'ad-center' }, stepEl, work);
    const right = el('div', { class: 'ad-plan' });
    panel.append(el('div', { class: 'ad-grid' }, left, center, right));

    function setTrust(v) {
      plan.trust = Math.max(0, Math.min(100, v));
      trust.set(plan.trust);
      head.setEmo(plan.trust >= 60 ? 'happy' : plan.trust >= 35 ? 'neutral' : 'angry');
    }
    function say(text, kind = '') {
      bubble.textContent = text;
      bubble.className = `tl-bubble ${kind}`;
      void bubble.offsetWidth;
      bubble.classList.add('pop');
      audio.blip(440);
    }
    function step(n, title) {
      stepEl.innerHTML = '';
      stepEl.append(el('span', { class: 'r-n' }, String(n)), el('b', {}, title));
      work.innerHTML = '';
    }
    setTrust(plan.trust);
    say(cfg.hello);
    right.append(el('div', { class: 'ad-plan-wait' }, el('span', {}, '📋'), el('p', {}, 'Сначала поговори с клиентом — потом план')));

    // ─── объяснить по-человечески ───
    function explain(ex, n, title) {
      step(n, title);
      say(ex.q);
      return new Promise((done) => {
        const box = el('div', { class: 'choices ad-choices' });
        const opts = [...ex.options].sort((a, b) => (a.text.length % 3) - (b.text.length % 3));
        for (const o of opts) {
          const [ico, label] = STYLE_TAGS[o.tag];
          const b = el('button', { class: `choice ${o.trust > 0 ? 'calm' : o.trust < -10 ? 'pressure' : 'logic'}` }, el('span', { class: `tag style-${o.tag}` }, `${ico} ${label}`), el('span', { class: 'choice-text' }, o.text));
          b.addEventListener('click', async () => {
            audio.click();
            box.querySelectorAll('button').forEach((x) => (x.disabled = true));
            b.classList.add('picked');
            setTrust(plan.trust + o.trust);
            o.trust > 0 ? audio.coin() : audio.wrong();
            say(o.reply, o.trust < 0 ? 'annoyed' : '');
            if (o.trust < 0) mistake('🗣', `${ex.who || cfg.client.name}: объяснение не зашло (${label.toLowerCase()})`);
            await sleep(1500);
            done(o);
          });
          box.append(b);
        }
        work.append(el('p', { class: 'muted small tip' }, '🗣 Как объяснить, чтобы понял именно этот человек?'), box);
      });
    }

    // ─── кредитное предложение: найти переплату ───
    function offer(n) {
      const o = cfg.offer;
      const total = o.pay * o.months;
      const over = total - o.price;
      step(n, 'Сколько Артём переплатит?');
      say(cfg.hello);
      return new Promise((done) => {
        const ad = el(
          'div',
          { class: 'ad-offer' },
          el('div', { class: 'ad-offer-top' }, `🏬 ${o.shop}`),
          el('div', { class: 'ad-offer-big' }, '📱 iPhone'),
          el('div', { class: 'ad-offer-pay' }, el('small', {}, 'всего'), el('b', {}, money(o.pay)), el('small', {}, 'в месяц!')),
          el('div', { class: 'ad-offer-fine' }, `Цена ${money(o.price)} · ${o.months} платежа · кредит`),
        );
        const q = diff === 'easy' ? `${num(o.pay)} × ${o.months} = ${num(total)}. А переплата?` : diff === 'normal' ? `${num(o.pay)} × ${o.months} − ${num(o.price)} = ?` : 'Сколько он переплатит банку?';
        const opts = diff === 'hard' ? [over, over - 7200, over + 6600, 0] : [over, o.pay, 0];
        const grid = el('div', { class: 'ad-opts' });
        for (const v of [...opts].sort((a, b) => a - b)) {
          const b = el('button', { class: 'btn ghost' }, v === 0 ? '0 ₽ — «выгодно же»' : money(v));
          b.addEventListener('click', async () => {
            grid.querySelectorAll('button').forEach((x) => (x.disabled = true));
            const ok = v === over;
            b.classList.add(ok ? 'right' : 'wrong');
            if (ok) {
              audio.success();
              learn('k_a_overpay');
              note('💸', `Нашли переплату: ${money(over)} сверху за айфон`);
            } else {
              audio.wrong();
              mistake('🧮', `Ошибка в расчёте переплаты: на самом деле ${money(over)}`);
            }
            const bars = el(
              'div',
              { class: 'ad-bars' },
              el('div', {}, el('span', {}, 'Цена'), el('i', { style: { width: `${(o.price / total) * 100}%` } }), el('b', {}, money(o.price))),
              el('div', { class: 'over' }, el('span', {}, 'Отдаст'), el('i', { style: { width: '100%' } }), el('b', {}, money(total))),
              el('p', {}, `💸 Переплата ${money(over)} — это четверть айфона`),
            );
            work.append(bars);
            await sleep(2200);
            done();
          });
          grid.append(b);
        }
        work.append(ad, el('p', { class: 'ad-q' }, q), grid);
      });
    }

    // ─── листовка пирамиды: найди признаки ───
    function flyer(n) {
      const f = cfg.flyer;
      const need = tune.flyer;
      step(n, `Найди признаки пирамиды (${need} из ${f.segments.filter((s) => s[1]).length})`);
      say(cfg.hello);
      return new Promise((done) => {
        let found = 0;
        const list = el('div', { class: 'ev-list ad-signs' });
        const counter = el('b', {}, `0/${need}`);
        const go = el('button', { class: 'btn primary hidden' }, '🗣 Поговорить с Олегом');
        go.addEventListener('click', () => {
          audio.click();
          done();
        });
        const card = el('div', { class: 'ad-flyer' }, el('div', { class: 'ad-flyer-title' }, f.title));
        const body = el('p', { class: 'ad-flyer-text' });
        for (const [text, why] of f.segments) {
          if (text.trim().length < 3 && !why) {
            body.append(text);
            continue;
          }
          const s = el('span', { class: 'seg' }, text);
          s.addEventListener('click', () => {
            if (s.classList.contains('found')) return;
            if (!why) {
              audio.wrong();
              s.classList.remove('nope');
              void s.offsetWidth;
              s.classList.add('nope');
              return;
            }
            found++;
            s.classList.add('found');
            s.dataset.n = String(found);
            audio.stamp();
            list.append(el('div', { class: 'ev-item' }, el('span', { class: 'ev-n' }, String(found)), el('div', { class: 'ev-body' }, el('b', {}, text), el('p', {}, why))));
            counter.textContent = `${found}/${need}`;
            if (found === need) {
              learn('k_a_pyramid');
              note('🔺', `Нашли ${need} ${plural(need, 'признак', 'признака', 'признаков')} пирамиды в листовке`);
              go.classList.remove('hidden');
              audio.success();
              say('Ну… может, ты и прав. Но друг же получил деньги!', '');
            }
            if (found === f.segments.filter((x) => x[1]).length) note('🕵️', 'Нашли все признаки пирамиды до единого');
          });
          body.append(s);
        }
        card.append(body);
        work.append(el('p', { class: 'muted small tip' }, '👆 Нажимай на фразы, которые выдают пирамиду'), card, el('div', { class: 'ad-found' }, el('span', {}, '🚩 Признаки: '), counter), list, go);
      });
    }

    async function talk(n) {
      step(n, 'Отговори Олега от «Золотого Роста»');
      const box = el('div', { class: 'ad-talk' });
      work.append(box);
      trust.box.classList.add('hidden');
      const script = { ...cfg.talk, start: plan.trust, win: Math.min(90, plan.trust + 22) };
      const r = await runDialog(box, ctx, { name: cfg.client.name, look: cfg.client.look, script, intro: '🔺 Олег крутит в руках листовку фонда' });
      trust.box.classList.remove('hidden');
      plan.pyramidWon = r.won;
      setTrust(r.trust);
      if (r.won) {
        note('🛡', 'Олег не понёс 100 000 ₽ в пирамиду — они пойдут на учёбу дочки');
        say('Убедил. Деньги дочки в пирамиду не понесу. Давай план!');
      } else {
        mistake('💔', 'Олег не послушал и отнёс 100 000 ₽ в «Золотой Рост»');
        say('Всё равно вложу. А план давай — на остальное.', 'annoyed');
        setTrust(Math.max(plan.trust, 40));
      }
      await sleep(1600);
    }

    // ─── трубы денежного потока + план ───
    function pipes(n) {
      step(n, 'Разбери, куда утекают деньги');
      say(cfg.expenses.some((e) => e.kind === 'waste') ? 'Вот всё, на что уходят деньги. Помогите!' : 'Вот мои расходы.');
      const inc = income(cfg);
      const maxAmount = Math.max(...cfg.expenses.map((e) => e.amount));
      let touched = false;

      const restVal = el('b');
      const restRow = el('div', { class: 'pp-rest' }, el('span', { class: 'pp-rest-ico' }, cfg.goal.icon), el('div', {}, el('small', {}, 'Остаток течёт в копилку'), restVal));
      const rows = cfg.expenses.map((e) => {
        const valve = el('button', { class: 'pp-valve', 'aria-label': `Кран: ${e.title}` });
        const water = el('i', { class: 'pp-water' });
        const pipe = el('div', { class: 'pp-pipe' }, water);
        const amt = el('b', { class: 'pp-amt' });
        const row = el('div', { class: `pp-row kind-${e.kind}${tune.hints && e.kind === 'waste' ? ' hint' : ''}` }, valve, pipe, el('div', { class: 'pp-label' }, el('span', { class: 'pp-ico' }, e.icon), el('span', { class: 'pp-title' }, e.title), amt));
        valve.addEventListener('click', () => turn(e, row));
        row.addEventListener('click', (ev) => {
          if (ev.target !== valve) turn(e, row);
        });
        return { e, row, valve, water, amt };
      });
      const list = el('div', { class: 'pp-list' }, rows.map((r) => r.row));
      const flow = el(
        'div',
        { class: 'pipes' },
        el('div', { class: 'pp-in' }, cfg.incomes.map(([i, t, v]) => el('div', { class: 'pp-src' }, el('span', {}, i), el('small', {}, t), el('b', {}, `+${num(v)}`)))),
        el('div', { class: 'pp-wallet' }, el('span', {}, '👛'), el('b', {}, `Приходит ${money(inc)} в месяц`)),
        list,
        restRow,
      );
      work.append(el('p', { class: 'muted small tip' }, tune.hints ? '👆 Нажимай на кран: открыт → наполовину → закрыт. ✂️ — подсказка, где лишнее' : '👆 Нажимай на кран: открыт → наполовину → закрыт'), flow);

      function turn(e, row) {
        if (e.kind === 'need') {
          audio.wrong();
          row.classList.remove('shake');
          void row.offsetWidth;
          row.classList.add('shake');
          say(e.say, 'annoyed');
          if (!plan.needTried.includes(e.id)) {
            plan.needTried.push(e.id);
            setTrust(plan.trust - 10);
            learn('k_a_need');
            if (plan.needTried.length === 1) mistake('🍞', `Попробовали урезать нужное: «${e.title}»`);
          }
          return;
        }
        const st = plan.cuts[e.id] || 'open';
        const next = NEXT[st];
        plan.cuts[e.id] = next;
        audio.click();
        if (!touched) {
          touched = true;
          learn('k_a_flow');
        }
        if (next === 'closed' || next === 'half') {
          audio.blip(next === 'closed' ? 300 : 380);
          if (next === 'closed') say(e.say, e.kind === 'fun' ? 'annoyed' : '');
          if (e.kind === 'waste' && next === 'closed') learn('k_a_cut');
        }
        render();
      }

      // ─── план справа ───
      right.innerHTML = '';
      const jarFill = el('i');
      const jarVal = el('b');
      const jarPct = el('small', { class: 'muted' });
      const jar = el('div', { class: 'ad-jar' }, el('div', { class: 'ad-jar-glass' }, jarFill, el('span', { class: 'ad-jar-ico' }, cfg.goal.icon)), el('div', {}, el('small', {}, 'В копилку цели'), jarVal, jarPct));
      right.append(el('h4', {}, '🎯 План'), jar);

      let cushionBtns = null;
      if (cfg.cushion) {
        cushionBtns = el('div', { class: 'seg-btns' });
        for (const v of cfg.cushion.steps) {
          const b = el('button', { class: 'r-thr-btn', 'data-v': String(v) }, v ? num(v) : '0');
          b.addEventListener('click', () => {
            audio.click();
            plan.cushion = v;
            if (v > 0) learn('k_a_cushion');
            render();
          });
          cushionBtns.append(b);
        }
        right.append(el('div', { class: 'ad-sec' }, el('div', { class: 'ad-sec-h' }, el('span', {}, '🛟 Подушка безопасности'), el('small', {}, `запас ${money(cfg.cushion.target)}`)), el('small', { class: 'muted' }, '₽ в месяц, пока подушка не наполнится — потом всё в цель'), cushionBtns));
      }
      let prodBox = null;
      if (cfg.products.length > 1) {
        prodBox = el('div', { class: 'ad-prods' });
        for (const id of cfg.products) {
          const p = PRODUCTS[id];
          const b = el('button', { class: 'ad-prod', 'data-id': id }, el('span', { class: 'ad-prod-ico' }, p.icon), el('div', {}, el('b', {}, p.title), el('small', {}, diff === 'easy' ? p.sub.replace(/\d+% в год/, p.rate ? (p.rate > 0.1 ? 'проценты больше' : 'проценты есть') : 'без процентов') : p.sub)));
          b.addEventListener('click', () => {
            audio.click();
            plan.product = id;
            if (id === 'deposit') learn('k_a_deposit');
            if (id === 'saving') learn('k_a_saving');
            render();
          });
          prodBox.append(b);
        }
        right.append(el('div', { class: 'ad-sec' }, el('div', { class: 'ad-sec-h' }, el('span', {}, '🏦 Где копить')), prodBox));
      }
      const comfort = el('div', { class: 'ad-comfort' });
      const fc = el('div', { class: 'ad-forecast' });
      const goBtn = el('button', { class: 'btn primary big' }, '⏩ План готов');
      right.append(comfort, fc, goBtn);

      function render() {
        const free = monthlyFree(cfg, plan.cuts);
        for (const r of rows) {
          const st = plan.cuts[r.e.id] || 'open';
          const v = r.e.amount * CUT_FACTOR[st];
          r.valve.textContent = VALVE[st];
          r.valve.title = `Кран ${VALVE_TEXT[st]}`;
          r.row.dataset.state = st;
          r.water.style.width = `${Math.max(st === 'closed' ? 0 : 8, (v / maxAmount) * 100)}%`;
          r.amt.textContent = st === 'closed' ? '0 ₽' : `−${num(v)}`;
        }
        restVal.textContent = free > 0 ? `${money(free)} в месяц` : free === 0 ? '0 ₽ — всё утекает!' : `${money(free)} — в минусе!`;
        restRow.classList.toggle('dry', free <= 0);
        const toGoal = Math.max(0, free - (cfg.cushion ? Math.min(plan.cushion, free) : 0));
        jarVal.textContent = `${money(toGoal)} / мес`;
        const byDeadline = Math.max(0, Math.min(1, amountAt(cfg, plan, cfg.goal.months) / cfg.goal.price));
        jarFill.style.height = `${byDeadline * 100}%`;
        jarPct.textContent = `к сроку: ${Math.round(byDeadline * 100)}% от ${money(cfg.goal.price)}`;
        cushionBtns?.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === plan.cushion));
        prodBox?.querySelectorAll('.ad-prod').forEach((b) => b.classList.toggle('on', b.dataset.id === plan.product));

        // комфорт: сколько радостей осталось
        const soft = cfg.expenses.filter((e) => e.kind !== 'need');
        const softAll = soft.reduce((s, e) => s + e.amount, 0);
        const softLeft = soft.reduce((s, e) => s + e.amount * CUT_FACTOR[plan.cuts[e.id] || 'open'], 0);
        const funLeft = soft.filter((e) => e.kind === 'fun').some((e) => (plan.cuts[e.id] || 'open') !== 'closed');
        plan.strict = !funLeft && softLeft === 0;
        comfort.innerHTML = '';
        comfort.className = `ad-comfort${plan.strict ? ' strict' : ''}`;
        comfort.append(el('span', {}, plan.strict ? '😣' : '😊'), el('div', {}, el('small', {}, 'Радости в жизни'), el('div', { class: 'meter-bar' }, el('i', { style: { transform: `scaleX(${softAll ? softLeft / softAll : 1})` } }))));
        if (plan.strict) comfort.append(el('em', {}, 'Слишком строго — может сорваться'));

        // прогноз
        const f = forecast(cfg, plan);
        fc.innerHTML = '';
        const ok = f.months <= cfg.goal.months;
        const shown = tune.showDate || !Number.isFinite(f.months);
        const cells = el('div', { class: 'ad-timeline' });
        const span = Math.max(cfg.goal.months, Math.min(Number.isFinite(f.months) ? f.months : cfg.goal.months + 3, cfg.goal.months + 6));
        const stepM = cfg.long ? 6 : 1;
        for (let m = stepM; m <= span; m += stepM) {
          const isGoal = shown && Number.isFinite(f.months) && f.months > m - stepM && f.months <= m;
          cells.append(el('i', { class: `${m <= f.months || !shown ? '' : 'after'}${m === cfg.goal.months || (cfg.long && m === cfg.goal.months) ? ' dl' : ''}${isGoal ? ' hit' : ''}` }, isGoal ? cfg.goal.icon : m === cfg.goal.months ? '🏁' : ''));
        }
        fc.append(
          ...[el('div', { class: 'ad-fc-line' }, el('span', {}, '📅'), shown ? el('b', { class: ok ? 'ok' : 'bad' }, Number.isFinite(f.months) ? `Накопим за ${months(f.months)}` : 'Не накопим никогда!') : el('b', {}, '❓ Срок посчитай сам'), el('small', {}, `нужно — за ${mon(cfg.goal.months)}`)),
          cells,
          shown && f.interest > 1 ? el('small', { class: 'ad-int' }, `☃️ Проценты добавят ≈ ${money(f.interest)}`) : null,
          ].filter(Boolean),
        );
        goBtn.disabled = free <= 0;
        goBtn.textContent = free <= 0 ? '⛔ Сначала перекрой лишнее' : ok || !shown ? '⏩ План готов — перемотать время' : '⏩ Запустить (не успеваем к сроку!)';
      }
      render();

      return new Promise((done) => {
        goBtn.addEventListener('click', async () => {
          audio.click();
          if (!tune.showDate) {
            // Сложная: срок нужно посчитать самому
            const f = forecast(cfg, plan);
            const real = f.months;
            const box = el('div', { class: 'ad-calc' }, el('p', {}, `🧮 ${money(monthlyFree(cfg, plan.cuts))} в месяц. За сколько месяцев накопим ${money(cfg.goal.price)}${cfg.lump ? ` (уже есть ${money(cfg.lump)})` : ''}?`));
            const opts = [real, real + 2, Math.max(1, real - 2)].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
            goBtn.disabled = true;
            const pick = await new Promise((res) => {
              for (const v of opts) box.append(el('button', { class: 'btn ghost', onClick: () => res(v) }, mon(v)));
              right.append(box);
            });
            box.remove();
            plan.calcOk = pick === real;
            if (plan.calcOk) {
              audio.success();
              note('🧮', `Срок посчитан верно: ${months(real)}`);
            } else {
              audio.wrong();
              mistake('🧮', `Ошиблись в расчёте срока: на самом деле ${months(real)}`);
            }
          }
          learn('k_a_need');
          if (plan.strict) setTrust(plan.trust - 10);
          if (plan.strict) note('😣', 'План без единой радости — клиенту будет тяжело', 'warn');
          done();
        });
      });
    }

    // ─── сценарий шага ───
    (async () => {
      let n = 1;
      if (cfg.offer) await offer(n++);
      if (cfg.flyer) {
        await flyer(n++);
        await talk(n++);
      }
      if (cfg.explain) await explain(cfg.explain, n++, 'Объясни по-человечески');
      if (cfg.explainPair) {
        let good = 0;
        for (const ex of cfg.explainPair) {
          head.setLook(ex.look);
          left.querySelector('.tl-name').textContent = ex.who;
          const o = await explain(ex, n++, `Объясни: ${ex.who}`);
          if (o.trust > 0) good++;
        }
        head.setLook(cfg.client.look);
        left.querySelector('.tl-name').textContent = `${cfg.client.name}, ${cfg.client.age}`;
        if (good === cfg.explainPair.length) {
          learn('k_a_style');
          note('🗣', 'Объяснили и Артёму, и бабушке — каждому на своём языке');
        }
      }
      await pipes(n++);
      ctx.prof.data.plan = plan;
      resolve(null);
    })();
  });
}

// ═══════════════════════════ ШАГ 2: перемотка времени ═══════════════════════════
export function runRewind(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const tune = TUNE[diff] || TUNE.normal;
  const cfg = ADVISOR_SHIFTS[shift.n];
  const plan = ctx.prof.data.plan || { cuts: {}, cushion: 0, product: cfg.products[0], trust: 50, mistakes: [], notes: [], learned: [], needTried: [], strict: false, pyramidWon: true };
  const product = PRODUCTS[plan.product] || PRODUCTS.piggy;
  const notes = [...(plan.notes || [])];
  const mistakes = [...(plan.mistakes || [])];
  const learned = [...(plan.learned || [])];
  const learn = (k) => {
    if (ctx.learn(k)) learned.push(k);
  };
  const note = (icon, text, kind = 'good') => notes.push({ icon, text, kind });
  const mistake = (icon, text) => {
    mistakes.push(text);
    note(icon, text, 'bad');
  };

  const s = {
    m: 0,
    goal: cfg.flyer && plan.pyramidWon === false ? 0 : cfg.lump || 0,
    cushion: 0,
    price: cfg.goal.price,
    interest: 0,
    lostInterest: 0,
    trust: plan.trust ?? 50,
    debts: [],
    reached: 0,
    alt: cfg.compare === 'pyramid' ? 100000 : 0,
    altPaid: 0,
    fast: false,
  };
  const free = monthlyFree(cfg, plan.cuts);
  const limit = cfg.long ? cfg.goal.months + 12 : Math.max(cfg.goal.months + 4, 12);

  return new Promise((resolve) => {
    const panel = openPanel('advisor rewind');
    const speedBtn = el('button', { class: 'btn ghost small' }, '⏩ Быстрее');
    panel.append(termBar('⏩ Перемотка времени', ctx, speedBtn));
    speedBtn.addEventListener('click', () => {
      s.fast = !s.fast;
      speedBtn.classList.toggle('on', s.fast);
      speedBtn.textContent = s.fast ? '⏩⏩ ×3' : '⏩ Быстрее';
      audio.click();
    });

    // ─── шапка: месяц ───
    const monthBig = el('b', {}, '—');
    const monthSub = el('small', {}, '');
    const seasonIco = el('span', { class: 'rw-season' }, '⏳');
    const strip = el('div', { class: 'rw-strip' });
    const stripCells = [];
    const stripN = cfg.long ? Math.ceil(limit / 6) : limit;
    for (let i = 1; i <= stripN; i++) {
      const m = cfg.long ? i * 6 : i;
      const c = el('i', { class: m === cfg.goal.months ? 'dl' : '' }, cfg.long ? (m % 12 === 0 ? `${m / 12}г` : '') : season(m));
      stripCells.push([m, c]);
      strip.append(c);
    }
    // ─── дорожка к цели ───
    const fill = el('i', { class: 'rw-fill' });
    const runner = el('span', { class: 'rw-runner' }, product.icon);
    const goalEnd = el('div', { class: 'rw-goal' }, el('span', {}, cfg.goal.icon), el('b', {}, money(s.price)));
    const savedEl = el('b', { class: 'rw-saved' }, money(s.goal));
    const track = el('div', { class: 'rw-track' }, el('div', { class: 'rw-bar' }, fill, runner), goalEnd);
    // ─── банки ───
    const jarGoal = el('b', {}, money(s.goal));
    const jarCush = el('b', {}, money(0));
    const jarInt = el('b', {}, money(0));
    const trustEl = trustMeter();
    trustEl.set(s.trust);
    const jars = el(
      'div',
      { class: 'rw-jars' },
      el('div', {}, el('span', {}, product.icon), el('small', {}, product.title), jarGoal),
      cfg.cushion ? el('div', {}, el('span', {}, '🛟'), el('small', {}, `Подушка (${money(cfg.cushion.target)})`), jarCush) : null,
      product.rate ? el('div', { class: 'int' }, el('span', { class: 'rw-snow' }, '☃️'), el('small', {}, 'Проценты'), jarInt) : null,
      el('div', { class: 'trust' }, trustEl.box),
    );
    // ─── сравнение: кредит / пирамида ───
    let altBox = null;
    let altFill = null;
    let altText = null;
    if (cfg.compare === 'credit') {
      altFill = el('i');
      altText = el('small', {}, '');
      altBox = el('div', { class: 'rw-alt credit' }, el('span', { class: 'rw-alt-ico' }, '💳'), el('div', {}, el('b', {}, 'Если бы взял в кредит'), el('div', { class: 'rw-alt-bar' }, altFill), altText));
    }
    if (cfg.compare === 'pyramid') {
      altFill = el('i');
      altText = el('small', {}, '');
      altBox = el('div', { class: 'rw-alt pyr' }, el('span', { class: 'rw-alt-ico' }, '🔺'), el('div', {}, el('b', {}, plan.pyramidWon === false ? 'Деньги Олега в «Золотом Росте»' : 'Деньги друга в «Золотом Росте»'), el('div', { class: 'rw-alt-bar' }, altFill), altText));
    }
    const log = el('div', { class: 'rw-log' });
    const eventBox = el('div', { class: 'rw-event hidden' });
    let bike = null;
    let bikeLabel = null;
    let bikeParts = 0;
    if (cfg.assemble) {
      bike = bikeSVG();
      bikeLabel = el('small', {}, `Деталей: 0 из ${cfg.assemble.length}`);
      bike = el('div', { class: 'rw-bike' }, bike, bikeLabel);
    }
    const stage = el('div', { class: 'rw-stage' }, el('div', { class: 'rw-head' }, seasonIco, el('div', {}, monthBig, monthSub), el('div', { class: 'rw-head-saved' }, el('small', {}, 'Накоплено'), savedEl)), strip, track, bike, altBox, jars, log);
    panel.append(el('div', { class: 'rw-body' }, stage, eventBox));

    function addLog(icon, text, kind = '') {
      const row = el('div', { class: `rw-log-row ${kind}` }, el('span', {}, icon), el('p', {}, el('b', {}, s.m ? `${monthName(s.m)}: ` : ''), text));
      log.prepend(row);
      while (log.children.length > 6) log.lastElementChild.remove();
    }
    function floatText(text, kind = 'up') {
      const f = el('span', { class: `rw-float ${kind}` }, text);
      track.append(f);
      setTimeout(() => f.remove(), 1400);
    }
    function render() {
      const k = Math.max(0, Math.min(1, s.goal / s.price));
      fill.style.transform = `scaleX(${k})`;
      runner.style.left = `${k * 100}%`;
      goalEnd.querySelector('b').textContent = money(s.price);
      savedEl.textContent = money(Math.max(0, s.goal));
      jarGoal.textContent = money(Math.max(0, s.goal));
      jarCush.textContent = money(s.cushion);
      jarInt.textContent = money(s.interest);
      const snow = panel.querySelector('.rw-snow');
      if (snow) snow.style.transform = `scale(${1 + Math.min(1.6, s.interest / Math.max(1, s.price) * 4)})`;
      trustEl.set(s.trust);
      if (bike) {
        const n = cfg.assemble.filter(([t]) => k >= t - 1e-9).length;
        bike.querySelectorAll('.bk-part').forEach((g, i) => g.classList.toggle('on', i < n));
        if (n > bikeParts) {
          const [, name] = cfg.assemble[n - 1];
          floatText(`🔧 ${name}`, 'up');
          audio.pin();
          bike.classList.remove('bump');
          void bike.offsetWidth;
          bike.classList.add('bump');
        }
        bikeParts = n;
        bikeLabel.textContent = n >= cfg.assemble.length ? '🚲 Велосипед собран!' : `Деталей: ${n} из ${cfg.assemble.length}`;
      }
      for (const [m, c] of stripCells) {
        c.classList.toggle('past', m <= s.m);
        c.classList.toggle('now', cfg.long ? m - 6 < s.m && m >= s.m : m === s.m);
        c.classList.toggle('late', m > cfg.goal.months && m <= s.m);
      }
      if (cfg.compare === 'credit') {
        const total = cfg.offer.pay * cfg.offer.months;
        altFill.style.transform = `scaleX(${s.altPaid / total})`;
        altText.textContent = `заплачено ${money(s.altPaid)} из ${money(total)} · осталось ${Math.max(0, cfg.offer.months - s.m)} платежей`;
      }
      if (cfg.compare === 'pyramid') {
        altFill.style.transform = `scaleX(${Math.min(1, s.alt / 250000)})`;
        altText.textContent = s.alt > 0 ? `«на счёте» ${money(s.alt)}` : '💥 0 ₽ — фонд исчез';
        altBox.classList.toggle('dead', s.alt <= 0);
      }
    }

    // ─── карточка события: пауза перемотки ───
    function eventCard(ev, body, choices) {
      return new Promise((done) => {
        eventBox.innerHTML = '';
        eventBox.classList.remove('hidden');
        const card = el('div', { class: `rw-ev-card type-${ev.type}` }, el('div', { class: 'rw-ev-ico' }, ev.icon), el('small', {}, `${monthName(s.m)} · месяц ${s.m}`), el('h3', {}, ev.title), typeof body === 'string' ? el('p', {}, body) : body);
        const row = el('div', { class: 'rw-ev-btns' });
        for (const [label, val, cls] of choices) {
          row.append(
            el(
              'button',
              {
                class: `btn ${cls || 'ghost'}`,
                onClick: () => {
                  audio.click();
                  eventBox.classList.add('hidden');
                  done(val);
                },
              },
              label,
            ),
          );
        }
        card.append(row);
        eventBox.append(card);
        audio.notify();
        card.querySelector('button')?.focus({ preventScroll: true });
      });
    }
    function delayText(cost) {
      if (free <= 0) return '';
      const n = Math.max(1, Math.round(cost / free));
      return `${cfg.goal.icon} отъехал на ${mon(n)}`;
    }
    function takeFromGoal(amount) {
      s.goal -= amount;
      floatText(`−${num(amount)}`, 'down');
    }

    async function handle(ev) {
      if (ev.type === 'temptation') {
        learn('k_a_temptation');
        const v = await eventCard(ev, ev.text, [
          ['🙅 Посоветовать подождать', 'wait', 'safe'],
          ['🛍 Пусть покупает', 'buy', 'ghost'],
        ]);
        if (v === 'wait' && s.trust >= tune.wait) {
          addLog('🙅', `${ev.wait}`, 'good');
          note(ev.icon, `Удержались от соблазна: ${ev.title.toLowerCase()} (${money(ev.cost)})`);
          s.trust = Math.min(100, s.trust + 5);
          audio.coin();
        } else {
          takeFromGoal(ev.cost);
          audio.wrong();
          if (v === 'wait') {
            addLog('😤', `Не послушал(а) — доверия мало. Минус ${money(ev.cost)}. ${delayText(ev.cost)}`, 'bad');
            mistake(ev.icon, `Клиент не послушал совета: ${ev.title.toLowerCase()} −${money(ev.cost)}. Доверия было мало`);
          } else {
            addLog('🛍', `Купили. Минус ${money(ev.cost)}. ${delayText(ev.cost)}`, 'bad');
            mistake(ev.icon, `Посоветовали купить: ${ev.title.toLowerCase()} −${money(ev.cost)}, ${delayText(ev.cost)}`);
          }
        }
      }
      if (ev.type === 'scam') {
        const v = await eventCard(ev, ev.text, [
          ['🛑 Это обман — не переводить', 'no', 'safe'],
          ['💸 Пусть переведёт — вдруг правда', 'send', 'ghost'],
        ]);
        if (v === 'no' && s.trust >= tune.wait) {
          learn('k_a_double');
          flash('green');
          audio.success();
          await eventCard({ ...ev, icon: '🛡', title: 'Не попался!' }, 'Миша написал «удвоителям»: «Сначала вы мне 2 000». Аккаунт тут же заблокировали — это были мошенники.\n\nНикто не отдаёт деньги вдвое просто так. Если обещают — тебя хотят обмануть.', [['💪 Так им и надо', 'ok', 'primary']]);
          addLog('🛡', 'Не перевёл «удвоителям» — это были мошенники', 'good');
          note('🎣', 'Миша не попался на «удвоим деньги» — 1 000 ₽ остались в копилке');
          s.trust = Math.min(100, s.trust + 5);
          setBeat(ctx.state, 'mishaScam', true);
        } else {
          takeFromGoal(ev.cost);
          learn('k_a_double');
          flash('red');
          audio.fail();
          await eventCard({ ...ev, icon: '💸', title: 'Деньги пропали' }, `${v === 'no' ? 'Миша не послушал — доверия было мало. ' : ''}Он перевёл 1 000 ₽ — и аккаунт «удвоителей» исчез. Ни 2 000, ни скина.\n\nЕсли обещают вернуть больше, чем ты дал, — это всегда обман.`, [['😞 Запомню', 'ok', 'primary']]);
          addLog('💸', `«Удвоители» забрали ${money(ev.cost)}. ${delayText(ev.cost)}`, 'bad');
          mistake('🎣', `Мошенники «удвоили» деньги: −${money(ev.cost)}`);
        }
      }
      if (ev.type === 'gift') {
        const choices = [['🎯 В копилку цели', 'goal', 'safe']];
        if (cfg.cushion) choices.push(['🛟 В подушку', 'cushion', 'ghost']);
        choices.push(['🎉 Потратить на радость', 'spend', 'ghost']);
        const v = await eventCard(ev, ev.text, choices);
        if (v === 'goal') {
          s.goal += ev.amount;
          floatText(`+${num(ev.amount)}`);
          addLog('🎁', `+${money(ev.amount)} в копилку цели`, 'good');
          note('🎁', `${ev.title}: ${money(ev.amount)} ушли в копилку — цель ближе`);
          audio.coin();
        } else if (v === 'cushion') {
          s.cushion += ev.amount;
          addLog('🛟', `+${money(ev.amount)} в подушку`, 'good');
          note('🛟', `${ev.title} ушла в подушку — запас стал больше`);
        } else {
          addLog('🎉', `${money(ev.amount)} потрачены на радость`, '');
          note('🎉', `${ev.title}: потратили на радость — цель не приблизилась`, 'warn');
        }
      }
      if (ev.type === 'emergency') {
        const fromCush = Math.min(s.cushion, ev.cost);
        s.cushion -= fromCush;
        const rest = ev.cost - fromCush;
        learn('k_a_cushion');
        learn('k_a_microloan');
        if (!rest) {
          await eventCard(ev, `${ev.text}\n\n🛟 Подушка выручила: ${money(ev.cost)} взяли из запаса. Копилка цели не тронута!\n\nБез подушки пришлось бы брать из цели или микрозайм — и вернуть ${money(Math.round(ev.cost * 1.5))}.`, [['👍 Отлично', 'ok', 'primary']]);
          addLog('🛟', `Подушка оплатила ${money(ev.cost)}`, 'good');
          note('🛟', `${ev.title}: подушка выручила — цель не пострадала`);
          flash('green');
          audio.success();
        } else {
          const lock = product.lock && s.goal > 0;
          const body = `${ev.text}${fromCush ? `\n\n🛟 В подушке было только ${money(fromCush)}.` : '\n\n🛟 Подушки нет.'} Где взять ещё ${money(rest)}?${lock ? '\n\n🔒 Деньги на вкладе: если снять раньше срока — проценты сгорят.' : ''}`;
          const v = await eventCard(ev, body, [
            [lock ? `🔓 Закрыть вклад досрочно` : `🎯 Взять из копилки цели`, 'goal', 'ghost'],
            [`📉 Взять микрозайм (вернуть ${money(Math.round(rest * 1.5))})`, 'loan', 'ghost'],
          ]);
          if (cfg.cushion) mistake('🛟', `${ev.title}: подушки не хватило — пришлось искать деньги`);
          if (v === 'goal') {
            takeFromGoal(rest);
            if (lock) {
              const burned = Math.round(s.interest - s.lostInterest);
              s.goal -= burned;
              s.lostInterest = s.interest;
              learn('k_a_deposit');
              addLog('🔓', `Вклад закрыт досрочно: −${money(rest)}, сгорели проценты ${money(burned)}`, 'bad');
              mistake('🔓', `Вклад пришлось закрыть раньше срока — сгорели проценты ${money(burned)}`);
            } else addLog(ev.icon, `Взяли ${money(rest)} из копилки. ${delayText(rest)}`, 'bad');
            s.trust = Math.max(0, s.trust - 10);
          } else {
            learn('k_a_microloan');
            s.debts.push({ from: s.m + 1, to: s.m + 3, pay: Math.round((rest * 1.5) / 3) });
            addLog('📉', `Микрозайм ${money(rest)} — вернуть ${money(Math.round(rest * 1.5))} за 3 месяца`, 'bad');
            mistake('📉', `Микрозайм: взяли ${money(rest)}, вернули ${money(Math.round(rest * 1.5))}`);
          }
          audio.wrong();
        }
      }
      if (ev.type === 'inflation') {
        learn('k_a_inflation');
        const before = s.price;
        s.price = Math.round((cfg.goal.price * (1 + (cfg.inflation || 0.07) * (s.m / 12))) / 100) * 100;
        const up = s.price - before;
        const interestText = product.rate ? `${product.icon} ${product.title}: проценты уже принесли ${money(s.interest - s.lostInterest)} — ${s.interest - s.lostInterest >= s.price - cfg.goal.price ? 'и догнали цены!' : 'почти догоняют цены'}` : `🐷 В конверте проценты не растут: деньги лежат, а путёвка дорожает`;
        floatText(`+${num(up)} цена`, 'down');
        goalEnd.classList.remove('away');
        void goalEnd.offsetWidth;
        goalEnd.classList.add('away');
        await eventCard(ev, `${ev.text}: было ${money(before)}, стало ${money(s.price)} (+${money(up)}).\n\n${interestText}`, [['Понятно', 'ok', 'primary']]);
        addLog('📈', `Цена выросла на ${money(up)}`, product.rate ? '' : 'bad');
        if (!product.rate && !notes.some((x) => x.icon === '📈')) mistake('📈', 'Деньги лежали в конверте без процентов — инфляция их «съела»');
        else if (product.rate && !notes.some((x) => x.icon === '📈')) note('📈', `Цены выросли, но ${product.title.toLowerCase()} принёс проценты`);
      }
      if (ev.type === 'newmodel') {
        const before = s.price;
        s.price = Math.round(before * (1 - ev.pct));
        floatText(`−${num(before - s.price)} цена`, 'up');
        await eventCard(ev, `${ev.text}: было ${money(before)}, стало ${money(s.price)}.\n\nТот, кто взял в кредит, переплачивает за «старую» модель. А Артём купит дешевле!`, [['🙌 Круто', 'ok', 'primary']]);
        addLog('🆕', `Айфон подешевел на ${money(before - s.price)}`, 'good');
        note('🆕', 'Подождать оказалось выгодно: айфон подешевел');
      }
      if (ev.type === 'pyramid') {
        if (ev.stage === 1) s.alt = Math.round(s.alt * 1.3);
        if (ev.stage === 3) s.alt = 0;
        render();
        if (ev.stage === 3) {
          flash('red');
          audio.fail();
          const mine = plan.pyramidWon === false;
          await eventCard(ev, `${ev.text}${mine ? '\n\n💔 Среди них — 100 000 ₽ Олега.' : '\n\n🛡 Деньги Олега в безопасности — он тебя послушал.'}`, [[mine ? '😞 Эх…' : '😮 Вот это да', 'ok', 'primary']]);
          addLog('💥', mine ? 'Фонд исчез вместе со 100 000 ₽ Олега' : 'Фонд исчез. Друг Олега потерял всё', 'bad');
        } else {
          addLog(ev.icon, ev.text, ev.stage === 1 ? '' : 'bad');
          await sleep(600);
        }
      }
      if (ev.type === 'snowball') {
        learn('k_a_compound');
        const body = el(
          'div',
          { class: 'rw-snowball' },
          el('span', { class: 'rw-snow-big', style: { fontSize: `${2.4 + Math.min(4, s.interest / 70000)}rem` } }, product.rate ? '☃️' : '🐷'),
          el('p', {}, `${ev.text}.`),
          el('p', {}, product.rate ? `Проценты за всё время: ${money(s.interest)}. Каждый год их больше — проценты начисляются и на прошлые проценты.` : '🐷 В копилке процентов нет — снежный ком не катится.'),
        );
        await eventCard(ev, body, [['☃️ Катим дальше', 'ok', 'primary']]);
        addLog('☃️', `Проценты: уже ${money(s.interest)}`, 'good');
      }
      render();
    }

    async function breakdown() {
      const cost = Math.round(Math.max(500, free * 0.6) / 100) * 100;
      takeFromGoal(cost);
      s.trust = Math.max(0, s.trust - 10);
      await eventCard({ type: 'breakdown', icon: '😣', title: 'Срыв' }, `План был слишком строгим — ни одной радости. ${cfg.client.name} не выдержал(а) и потратил(а) ${money(cost)} за один раз.\n\nНе все радости нужно резать: оставь немного — и план выдержит.`, [['😔 Понятно', 'ok', 'primary']]);
      addLog('😣', `Срыв: −${money(cost)}`, 'bad');
      mistake('😣', `Слишком строгий план: клиент сорвался и потратил ${money(cost)}`);
      render();
    }

    (async () => {
      render();
      await sleep(600);
      addLog('⏩', `План: ${money(Math.max(0, free))} в месяц${plan.cushion ? `, из них ${money(plan.cushion)} в подушку` : ''} · ${product.icon} ${product.title}`);
      if (cfg.flyer && plan.pyramidWon === false) addLog('🔺', '100 000 ₽ Олега ушли в «Золотой Рост»', 'bad');
      const events = [...cfg.events];
      for (s.m = 1; s.m <= limit; s.m++) {
        // деньги за месяц
        const debt = s.debts.filter((d) => s.m >= d.from && s.m <= d.to).reduce((a, d) => a + d.pay, 0);
        const flow = free - debt;
        const toCush = cfg.cushion ? Math.max(0, Math.min(plan.cushion, cfg.cushion.target - s.cushion, flow)) : 0;
        s.cushion += toCush;
        const i = s.goal > 0 ? (s.goal * product.rate) / 12 : 0;
        s.interest += i;
        s.goal += flow - toCush + i;
        if (cfg.compare === 'credit') s.altPaid = Math.min(cfg.offer.pay * cfg.offer.months, s.altPaid + cfg.offer.pay);
        monthBig.textContent = cfg.long ? `Год ${Math.ceil(s.m / 12)} · месяц ${s.m}` : `Месяц ${s.m}`;
        monthSub.textContent = `${monthName(s.m)}${debt ? ` · платёж по займу −${num(debt)}` : ''}`;
        seasonIco.textContent = season(s.m);
        seasonIco.classList.remove('tick');
        void seasonIco.offsetWidth;
        seasonIco.classList.add('tick');
        if (!cfg.long || s.m % 3 === 0) floatText(`+${num(Math.round(flow - toCush + i))}`);
        render();
        audio.blip(520 + Math.min(400, (s.goal / s.price) * 400));
        const tick = (cfg.long ? 150 : tune.tick) / (s.fast ? 3 : 1);
        await sleep(tick);
        while (ctx.isPaused()) await sleep(200);
        if (plan.strict && s.m === 3) await breakdown();
        for (const ev of events.filter((e) => e.m === s.m)) await handle(ev);
        if (s.goal >= s.price) {
          s.reached = s.m;
          break;
        }
        if (s.m === cfg.goal.months && !s.reached) {
          addLog('🏁', `Срок вышел — до цели не хватает ${money(s.price - s.goal)}`, 'bad');
          audio.wrong();
        }
      }
      await finale();
    })();

    async function finale() {
      const onTime = s.reached && s.reached <= cfg.goal.months;
      if (!s.reached) mistake('🏁', `Цель не достигнута: не хватило ${money(s.price - s.goal)}`);
      else if (!onTime) mistake('🏁', `Накопили, но позже срока: за ${months(s.reached)} вместо ${months(cfg.goal.months)}`);
      if (cfg.products.length > 1) {
        learn('k_a_saving');
        learn('k_a_deposit');
      }
      if (cfg.long) learn('k_a_compound');
      const scene = el('div', { class: `rw-finale${s.reached ? '' : ' fail'}` });
      const sceneIcons = cfg.assemble && s.reached
        ? el('div', { class: 'rw-scene ride' }, el('div', { class: 'rw-bike done' }, bikeSVG(), el('span', { class: 'rider' }, '🧒')))
        : el('div', { class: 'rw-scene' }, ...(s.reached ? graphemes(cfg.finale.scene) : ['⏳', cfg.goal.icon, '❓']).map((c, i) => el('span', { style: { animationDelay: `${i * 0.15}s` } }, c)));
      if (cfg.assemble && s.reached) sceneIcons.querySelectorAll('.bk-part').forEach((g) => g.classList.add('on'));
      if (cfg.story) setBeat(ctx.state, cfg.story, s.reached ? 'reached' : 'failed');
      const lines = [];
      if (s.reached) lines.push(el('h2', {}, onTime ? '🎉 Мечта сбылась!' : '⌛ Сбылось — но позже, чем хотели'), el('p', {}, cfg.finale.text), el('p', { class: 'muted' }, `${cfg.goal.icon} ${cfg.goal.title} — за ${months(s.reached)} (план: ${months(cfg.goal.months)})`));
      else lines.push(el('h2', {}, '😕 Не накопили'), el('p', {}, `Прошло ${months(limit)}, а до цели не хватает ${money(s.price - s.goal)}.`));
      if (cfg.compare === 'credit' && s.reached) {
        const left = Math.max(0, cfg.offer.months - s.reached);
        lines.push(el('div', { class: 'rw-vs' }, el('div', {}, el('small', {}, '💳 Кредит'), el('b', {}, money(cfg.offer.pay * cfg.offer.months)), el('small', {}, `ещё ${left} ${plural(left, 'платёж', 'платежа', 'платежей')}`)), el('div', { class: 'win' }, el('small', {}, '🐷 Накопил'), el('b', {}, money(s.price)), el('small', {}, 'и никому не должен'))));
      }
      if (cfg.compare === 'pyramid') {
        lines.push(el('div', { class: 'rw-vs' }, el('div', {}, el('small', {}, '🔺 «Золотой Рост»'), el('b', {}, '0 ₽'), el('small', {}, 'фонд исчез')), el('div', { class: 'win' }, el('small', {}, `${product.icon} План`), el('b', {}, money(s.goal)), el('small', {}, `из них проценты ${money(s.interest)}`))));
      }
      const btn = el('button', { class: 'btn primary big' }, '✓ Закончить смену');
      scene.append(sceneIcons, ...lines);
      // Сарафанное радио: последняя смена собирает всех довольных клиентов недели
      ctx.prof.data.outcomes = { ...(ctx.prof.data.outcomes || {}), [shift.n]: !!onTime };
      if (shift.n === 5) {
        const outs = ctx.prof.data.outcomes;
        const refs = Object.entries(ADVISOR_SHIFTS)
          .filter(([n]) => outs[n] || ctx.prof.best[n]?.stars >= 2)
          .map(([, c]) => c.referral);
        scene.append(el('div', { class: 'rw-radio' }, el('h4', {}, `📣 Сарафанное радио · ${refs.length} ${plural(refs.length, 'рекомендация', 'рекомендации', 'рекомендаций')}`), refs.length ? el('div', { class: 'cons-list' }, refs.map((r) => el('div', { class: 'cons good' }, el('p', {}, r)))) : el('p', { class: 'muted' }, 'Пока никто не рекомендует — довольные клиенты приводят друзей'), el('p', { class: 'muted small' }, refs.length >= 4 ? '🏆 Практика растёт: кабинету выделили второй стол и стажёра!' : 'Чем больше довольных клиентов — тем больше практика')));
      }
      scene.append(btn);
      eventBox.innerHTML = '';
      eventBox.classList.remove('hidden');
      eventBox.append(scene);
      s.reached ? (audio.bigWin(), flash('green')) : audio.fail();
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        audio.click();
        const errs = mistakes.length;
        const stars = onTime ? (errs === 0 ? 3 : errs <= 2 ? 2 : 1) : 1;
        const score = Math.max(0, (onTime ? 300 : s.reached ? 150 : 60) + Math.round(s.trust) - errs * 40 + Math.round(s.interest / 1000));
        ctx.addScore(score);
        ctx.addClients(1);
        const good = notes.filter((x) => x.kind === 'good');
        const bad = notes.filter((x) => x.kind !== 'good');
        resolve({
          stars,
          score,
          learned: [...new Set(learned)].filter((k) => KNOWLEDGE[k]),
          consequencesTitle: 'Что показала перемотка',
          consequences: [
            { icon: s.reached ? (onTime ? '🎉' : '⌛') : '😕', text: s.reached ? `${cfg.client.name}: ${cfg.goal.title.toLowerCase()} — за ${months(s.reached)} (нужно было за ${cfg.goal.months})` : `${cfg.client.name}: до цели не хватило ${money(s.price - s.goal)}`, kind: onTime ? 'good' : 'bad' },
            ...bad,
            ...good,
          ].slice(0, 6),
          stats: [
            ['📅', s.reached ? mon(s.reached) : '—', `до цели (нужно ${cfg.goal.months})`],
            product.rate ? ['☃️', money(s.interest - s.lostInterest), 'принесли проценты'] : ['💚', String(Math.round(s.trust)), 'доверие клиента'],
            ['⚠', String(errs), plural(errs, 'ошибка', 'ошибки', 'ошибок')],
          ],
        });
      });
    }
  });
}
