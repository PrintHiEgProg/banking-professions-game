// DevOps-инженер (DevSecOps): конвейер проверок, утро после релиза, ночные аварии, логи атаки, доступы, канарейка.
import { KNOWLEDGE } from '../data/professions.js';
import { STATIONS, ISSUES, MISSED, RELEASES, ACTIONS, INCIDENTS, LOG_TASKS, MEASURES, RESOURCES, PEOPLE, LOOKS } from '../data/devops.js';
import { el, openPanel, termBar, sleep, flash, tour, num, animateNumber } from '../ui.js';
import { person } from '../portraits.js';
import { setBeat, story } from '../story.js';

const LEARN = (ctx, learned) => (k) => {
  if (KNOWLEDGE[k] && ctx.learn(k)) learned.push(k);
};
const store = (ctx) => (ctx.prof.data.dv ||= { learned: [] });
const ava = (look, emo = 'neutral', cls = 'dv-ava') => el('div', { class: cls, html: person(look, emo) });
const hint = (ctx, text) => (ctx.state.difficulty === 'hard' ? null : el('div', { class: 'coach' }, text));
const hm = (base, add) => {
  const [h, m] = base.split(':').map(Number);
  const t = h * 60 + m + Math.round(add);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
// Пауза игры (меню, подсказка) — живые таймеры стоят
const waitActive = async (ctx, ms) => {
  let left = ms;
  while (left > 0) {
    await sleep(50);
    if (!ctx.isPaused()) left -= 50;
  }
};

// Мини-график: линия по последним значениям
function spark(cv, values, color, max) {
  const g = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  g.clearRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.lineWidth = 1;
  for (let y = h / 4; y < h; y += h / 4) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  if (values.length < 2) return;
  const step = w / (values.length - 1);
  g.beginPath();
  values.forEach((v, i) => {
    const y = h - 4 - (Math.min(v, max) / max) * (h - 8);
    i ? g.lineTo(i * step, y) : g.moveTo(0, y);
  });
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.stroke();
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.closePath();
  g.fillStyle = `${color}22`;
  g.fill();
}

// ═══════════════════════ Конвейер CI/CD (смены 1 и 5) ═══════════════════════
export function runPipeline(ctx, shift) {
  const { audio } = ctx;
  const rel = RELEASES[shift.n] || RELEASES[1];
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const easy = ctx.state.difficulty === 'easy';
  const hard = ctx.state.difficulty === 'hard';
  const track = ['build'];
  return new Promise((resolve) => {
    const panel = openPanel('devops pipe');
    const clock = el('span', { class: 'term-progress' }, `🕔 ${rel.now} · релиз в ${rel.deadline}`);
    panel.append(termBar(`CI/CD · Релиз: ${rel.feature}`, ctx, clock));
    const commitsEl = el('div', { class: 'dv-commits' }, el('h4', {}, '📝 Что в этом релизе'), rel.commits.map((c, i) => el('div', { class: 'dv-commit', 'data-i': i }, ava(c.look, 'neutral', 'dv-ava sm'), el('div', {}, el('b', {}, `${c.who} `, el('small', {}, `· ${c.role}`)), el('p', {}, c.text)))));
    const trackEl = el('div', { class: 'dv-track' });
    const tokens = el('div', { class: 'dv-tokens' }, rel.commits.map((c, i) => el('span', { class: 'dv-tok', 'data-i': i, style: { '--d': `${i * 0.05}s` } }, c.who[0])));
    const lane = el('div', { class: 'dv-lane' }, el('div', { class: 'dv-end src' }, '💻', el('small', {}, 'код')), trackEl, el('div', { class: 'dv-end prod' }, '🚀', el('small', {}, 'клиенты')), tokens);
    const budgetBar = el('div', { class: 'dv-budget' }, el('i'));
    const budgetTxt = el('b', {});
    const palette = el('div', { class: 'dv-palette' });
    const runBtn = el('button', { class: 'btn primary big' }, '▶ Запустить конвейер');
    const log = el('div', { class: 'dv-runlog' });
    const center = el('div', { class: 'dv-center' }, el('div', { class: 'dv-budget-row' }, el('span', {}, '⏱ Время проверок'), budgetBar, budgetTxt), el('small', { class: 'muted dv-budget-note' }, '💡 Оставь запас: найденные проблемы ещё нужно исправить и проверить снова'), lane, el('div', { class: 'dv-pal-head' }, el('h4', {}, '🧰 Станции проверки'), el('small', { class: 'muted' }, 'нажми — добавить в конвейер · нажми на станцию в конвейере — убрать')), palette, log);
    const side = el('div', { class: 'dv-side' }, ava(LOOKS.lesha, 'happy', 'dv-ava big'), el('b', {}, 'Лёша, тимлид DevOps'), el('p', { class: 'dv-say' }, shift.n === 1 ? `«До релиза ${rel.budget + rel.deployMin} минут: ${rel.budget} — на проверки и исправления, ${rel.deployMin} — на выкатку. Прочитай, что в релизе, и собери конвейер. Всё подряд — не успеем»` : `«Пятница, большой релиз, до выкатки час. Смотри, что именно в коде, — и помни: выкатываем постепенно»`), hint(ctx, '💡 Прочитай изменения слева: пароль в коде, старая библиотека, расчёты — какие станции это поймают? Быстрые проверки ставь первыми.'), runBtn);
    panel.append(el('div', { class: 'dv-grid pipe' }, commitsEl, center, side));

    const total = () => track.reduce((s, id) => s + STATIONS[id].min, 0);
    function drawBudget() {
      const t = total();
      budgetTxt.textContent = `${t} / ${rel.budget} мин`;
      budgetBar.firstChild.style.width = `${Math.min(100, (t / rel.budget) * 100)}%`;
      budgetBar.classList.toggle('over', t > rel.budget);
    }
    function drawTrack() {
      trackEl.innerHTML = '';
      track.forEach((id, i) => {
        const st = STATIONS[id];
        const node = el('button', { class: `dv-st${st.fixed ? ' fixed' : ''}`, 'data-id': id, title: st.desc }, el('span', { class: 'dv-st-ico' }, st.icon), el('b', {}, st.name), el('small', {}, `${st.min} мин`), el('i', { class: 'dv-st-bar' }));
        if (!st.fixed)
          node.addEventListener('click', () => {
            if (running) return;
            audio.click();
            track.splice(i, 1);
            drawTrack();
          });
        trackEl.append(node);
        if (i < track.length - 1) trackEl.append(el('span', { class: 'dv-arrow' }, '→'));
      });
      palette.querySelectorAll('.dv-card').forEach((c) => c.classList.toggle('used', track.includes(c.dataset.id)));
      drawBudget();
    }
    for (const [id, st] of Object.entries(STATIONS)) {
      if (st.fixed) continue;
      const card = el('button', { class: 'dv-card', 'data-id': id }, el('span', { class: 'dv-st-ico' }, st.icon), el('div', {}, el('b', {}, st.name, st.tag ? el('small', { class: 'dv-tag' }, st.tag) : null), el('small', {}, st.desc)), el('em', {}, `${st.min} мин`));
      card.addEventListener('click', () => {
        if (running || track.includes(id)) return;
        audio.click();
        track.push(id);
        drawTrack();
        if (id === 'manual') {
          log.innerHTML = '';
          log.append(el('div', { class: 'fb bad' }, '🐢 Два часа ручной проверки — релиз точно опоздает. Автоматические проверки быстрее и надёжнее'));
        }
      });
      palette.append(card);
    }
    drawTrack();
    setTimeout(() => tour('dv_pipe'), 450);

    let running = false;
    runBtn.addEventListener('click', run);
    // фишки коммитов едут над станцией (координаты внутри ленты — она может прокручиваться на телефоне)
    const pos = (i) => {
      const n = trackEl.querySelectorAll('.dv-st')[i];
      if (!n) return;
      tokens.style.transform = `translateX(${n.offsetLeft + n.offsetWidth / 2 - tokens.offsetWidth / 2}px)`;
      if (lane.scrollWidth > lane.clientWidth) lane.scrollTo({ left: n.offsetLeft - lane.clientWidth / 2 + n.offsetWidth / 2, behavior: 'smooth' });
    };

    async function run() {
      if (running) return;
      running = true;
      audio.click();
      runBtn.disabled = true;
      palette.classList.add('locked');
      learn('k_d_cicd');
      const outcomes = {};
      for (const c of rel.commits) for (const iss of c.issues) outcomes[iss] = 'missed';
      let time = 0;
      let rerun = 0;
      const recheck = new Set();
      tokens.classList.add('on');
      log.innerHTML = '';
      for (let i = 0; i < track.length; i++) {
        const id = track[i];
        const st = STATIONS[id];
        const node = trackEl.querySelectorAll('.dv-st')[i];
        pos(i);
        node.classList.add('busy');
        const bar = node.querySelector('.dv-st-bar');
        const ms = Math.min(2400, 260 + st.min * 130);
        bar.style.transition = `width ${ms}ms linear`;
        requestAnimationFrame(() => (bar.style.width = '100%'));
        await waitActive(ctx, ms);
        time += st.min;
        clock.textContent = `🕔 ${hm(rel.now, time + rerun)} · релиз в ${rel.deadline}`;
        const found = [];
        rel.commits.forEach((c, ci) => c.issues.forEach((iss) => st.catches?.includes(iss) && found.push({ iss, ci })));
        if (!found.length) {
          node.classList.replace('busy', 'pass');
          audio.blip(820);
          log.prepend(el('div', { class: 'dv-logline ok' }, `✓ ${st.name}: чисто`));
          continue;
        }
        node.classList.replace('busy', 'flag');
        audio.wrong();
        for (const f of found) {
          const opt = await triage(f, st);
          const real = !f.iss.endsWith('_fp');
          outcomes[f.iss] = opt.good ? 'good' : opt.part ? 'part' : 'bad';
          if (opt.k) learn(opt.k);
          if (real && (opt.good || opt.part)) {
            // исправили: разработчик чинит, а эту проверку потом прогоним ещё раз
            rerun += opt.extra;
            recheck.add(id);
            log.prepend(el('div', { class: 'dv-logline warn' }, `🛠 Исправляем «${ISSUES[f.iss].title.replace(/^\S+\s/, '')}»: +${opt.extra} мин`));
            if (f.iss === 'secret' || f.iss === 'typo') learn(f.iss === 'secret' ? 'k_d_secret' : 'k_d_supply');
          } else if (!real && opt.extra) {
            rerun += opt.extra;
            log.prepend(el('div', { class: 'dv-logline warn' }, `⌛ Ложная тревога стоила ${opt.extra} мин`));
          }
          rel.commits[f.ci] && trackEl.parentElement.querySelector(`.dv-tok[data-i="${f.ci}"]`)?.classList.add(opt.good ? 'fixed' : 'hurt');
          commitsEl.querySelector(`.dv-commit[data-i="${f.ci}"]`)?.classList.add(real ? (opt.good ? 'fixed' : 'hurt') : opt.good ? 'fp' : 'hurt');
          clock.textContent = `🕔 ${hm(rel.now, time + rerun)} · релиз в ${rel.deadline}`;
        }
        node.classList.replace('flag', 'pass');
      }
      // после исправлений — повторный прогон тех проверок, что нашли проблемы
      if (recheck.size) {
        log.prepend(el('div', { class: 'dv-logline' }, `♻️ Повторная проверка исправлений: ${[...recheck].map((x) => STATIONS[x].icon).join(' ')}`));
        for (const id of recheck) {
          const i = track.indexOf(id);
          const node = trackEl.querySelectorAll('.dv-st')[i];
          pos(i);
          node.classList.add('busy');
          await waitActive(ctx, 500);
          node.classList.remove('busy');
          rerun += STATIONS[id].min;
          clock.textContent = `🕔 ${hm(rel.now, time + rerun)} · релиз в ${rel.deadline}`;
        }
      }
      // быстрые проверки раньше медленных: о дыре узнаём через минуту, а не через десять
      const placed = track.filter((x) => x !== 'build');
      const firstSlow = placed.findIndex((x) => STATIONS[x].min >= 6);
      if (placed.length >= 2 && firstSlow !== 0 && placed.slice(firstSlow < 0 ? placed.length : firstSlow).every((x) => STATIONS[x].min >= 4 || x === 'sign')) learn('k_d_failfast');
      // выкатка
      const spent = time + rerun;
      const late = Math.max(0, spent - rel.budget);
      pos(track.length);
      tokens.style.transform = `translateX(${lane.scrollWidth - tokens.offsetWidth - 10}px)`;
      Object.assign(data, { outcomes, spent, late, rerun, track: [...track], shift: shift.n });
      const res = el('div', { class: `fb ${late ? 'bad' : 'good'}` }, late ? `⏰ Проверки заняли ${spent} мин — релиз опоздает на ${late} мин` : `✅ Проверки заняли ${spent} мин из ${rel.budget} — успеваем`);
      log.prepend(res);
      const deploy = el('button', { class: 'btn primary big pulse-hint' }, shift.n === 5 ? '🐤 К выкатке по шагам →' : '🚀 Выкатить клиентам');
      side.querySelector('.coach')?.remove();
      side.append(deploy);
      deploy.addEventListener('click', async () => {
        audio.click();
        deploy.disabled = true;
        if (shift.n === 5) {
          resolve(null);
          return;
        }
        audio.whoosh();
        const counter = el('b', {}, '0');
        const rocket = el('div', { class: 'dv-rocket' }, el('span', {}, '🚀'), el('div', {}, 'Обновили приложение: ', counter));
        center.append(rocket);
        animateNumber(counter, 0, rel.users, 2200, (v) => num(v));
        await sleep(2600);
        audio.success();
        resolve(null);
      });
    }

    function triage(f, st) {
      const iss = ISSUES[f.iss];
      const c = rel.commits[f.ci];
      let wrap = null;
      return new Promise((done) => {
        const box = el('div', { class: 'dv-triage' }, el('div', { class: 'dv-tr-head' }, el('span', {}, st.icon), el('b', {}, `${st.name} нашёл:`)), el('h3', {}, iss.title), el('code', {}, iss.code), el('small', { class: 'muted' }, `Автор: ${c.who} · ${c.text}`));
        const opts = el('div', { class: 'choices' });
        for (const o of iss.opts) {
          opts.append(
            el('button', { class: `choice ${easy ? (o.good ? 'calm' : o.part ? 'logic' : 'pressure') : 'logic'}`, onClick: async () => {
              audio.click();
              opts.querySelectorAll('button').forEach((b) => (b.disabled = true));
              const fbEl = el('div', { class: `fb ${o.good ? 'good' : 'bad'}` }, o.good ? '✅ Верно' : o.part ? `🟡 ${o.note}` : o.note ? `⚠️ ${o.note}` : '⚠️ Рискованно — посмотрим утром');
              if (!hard) box.append(fbEl);
              o.good ? audio.coin() : audio.wrong();
              await sleep(hard ? 500 : 1300);
              wrap.remove();
              done(o);
            } }, el('span', { class: 'choice-text' }, o.t)),
          );
        }
        box.append(opts);
        wrap = el('div', { class: 'dv-modal' }, box);
        panel.append(wrap);
      });
    }
  });
}

// Что вышло из найденного и пропущенного
function releaseConsequences(rel, d) {
  const cons = [];
  let bad = 0;
  let warn = 0;
  for (const [iss, out] of Object.entries(d.outcomes || {})) {
    if (iss.endsWith('_fp')) {
      if (out === 'missed') continue; // эту проверку не ставили — и ложной тревоги не было
      if (out !== 'good') {
        warn++;
        cons.push({ kind: 'warn', icon: '🌫', text: `Ложная тревога (${ISSUES[iss].title.replace(/^\S+\s/, '')}) задержала релиз — это был не настоящий пароль/дыра.` });
      } else cons.push({ kind: 'good', icon: '🌫', text: 'Ложную тревогу распознали — и не потеряли ни минуты.' });
      continue;
    }
    if (out === 'good') cons.push({ kind: 'good', icon: '🛡', text: { secret: 'Ключ платёжного сервиса — в хранилище секретов, старый отозван. Даже разобрав приложение, его не найти.', bug: 'Ошибку в комиссии поймали тесты — клиенты ничего не заметили.', cve: 'Старую библиотеку обновили. Ночью сканеры злоумышленников искали Log4Shell — и не нашли.', typo: 'Поддельный пакет «reqeusts» не попал в сборку: он воровал пароли у разработчиков в других компаниях.', unsigned: 'Сборку пересобрали и подписали — подменить её по дороге невозможно.', sqli: 'SQL-инъекцию закрыли до релиза.', image: 'Контейнер обновили — старых дыр нет.' }[iss] });
    else if (out === 'part') {
      warn++;
      cons.push({ kind: 'warn', icon: '🟡', text: iss === 'secret' ? 'Строчку с ключом стёрли, но он остался в истории репозитория — подрядчик мог его видеть. Ключ всё равно пришлось менять утром.' : 'Логи выключили — дыра закрыта, но если что-то случится, расследовать будет нечем.' });
    } else {
      bad++;
      cons.push({ kind: 'bad', icon: '🔴', text: MISSED[iss] });
    }
  }
  if (d.late) {
    warn++;
    cons.push({ kind: 'warn', icon: '⏰', text: `Релиз вышел на ${d.late} мин позже обещанного.` });
  }
  return { cons, bad, warn };
}

// ═══════════════════════ Смена 1: утро после релиза ═══════════════════════
export function runMorning(ctx, shift) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const rel = RELEASES[shift.n] || RELEASES[1];
  const { cons, bad, warn } = releaseConsequences(rel, data);
  if (!bad) cons.push({ kind: 'good', icon: '📱', text: `${num(rel.users)} клиентов уже обновились — «Копилка» понравилась: оценка 4,8 ★` });
  const stars = bad === 0 && warn <= 1 ? 3 : bad <= 1 ? 2 : 1;
  const score = Math.max(60, 480 - bad * 140 - warn * 50);
  return new Promise((resolve) => {
    const panel = openPanel('devops morning');
    panel.append(termBar('Мониторинг · Утро вторника, 09:00', ctx));
    const cards = el('div', { class: 'pf-cards' });
    const btn = el('button', { class: 'btn primary big hidden' }, 'Готово');
    panel.append(el('div', { class: 'pf-body' }, el('div', { class: 'calendar' }, el('div', { class: 'cal-page dv' }, el('small', {}, 'прошла'), el('b', {}, '1'), el('span', {}, 'ночь'))), cards, btn));
    audio.whoosh();
    (async () => {
      await sleep(900);
      for (const c of cons) {
        cards.append(el('div', { class: `pf-card ${c.kind === 'good' ? 'green' : c.kind === 'bad' ? 'red' : 'yellow'}` }, el('span', { class: 'pf-ava big-ico' }, c.icon), el('div', {}, el('p', {}, c.text))));
        c.kind === 'good' ? audio.coin() : c.kind === 'bad' ? audio.wrong() : audio.blip(400);
        await sleep(480);
      }
      btn.classList.remove('hidden');
      stars === 3 ? (audio.bigWin(), flash('green')) : audio.success();
    })();
    btn.addEventListener('click', () => {
      audio.click();
      ctx.addScore(score);
      ctx.prof.data.dv = null;
      resolve({
        stars,
        score,
        learned: [...new Set(data.learned)],
        consequencesTitle: 'Утро после релиза…',
        consequences: cons,
        stats: [['🛡', String(Object.entries(data.outcomes || {}).filter(([k, v]) => !k.endsWith('_fp') && v === 'good').length), 'дыр закрыто до релиза'], ['⏱', `${data.spent ?? 0} мин`, 'конвейер'], ['🔴', String(bad), 'дыр в бою']],
      });
    });
  });
}

// ═══════════════════════ Смена 2: ночное дежурство ═══════════════════════
export function runIncident(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const hard = ctx.state.difficulty === 'hard';
  const NORMAL = { err: 0.4, lat: 180, cpu: 32, disk: 58, rps: 1 };
  const MAX = { err: 50, lat: 5000, cpu: 100, disk: 100, rps: 60 };
  const TILES = [
    ['err', '❗ Ошибки', '%', '#ff4d5e'],
    ['lat', '⏱ Ответ', 'мс', '#ffb020'],
    ['cpu', '🧠 Процессоры', '%', '#5b8cff'],
    ['disk', '💾 Диск', '%', '#9b6dff'],
    ['rps', '🌐 Трафик', '×', '#3ddc84'],
  ];
  const hist = Object.fromEntries(TILES.map(([k]) => [k, Array(40).fill(NORMAL[k])]));
  const res = { affected: 0, wrong: 0, perIncident: [] };
  return new Promise((resolve) => {
    const panel = openPanel('devops inc');
    const clock = el('span', { class: 'term-progress' }, '🌙 03:10');
    panel.append(termBar('Мониторинг · Ночное дежурство', ctx, clock));
    const banner = el('div', { class: 'dv-alert' }, '🟢 Всё спокойно');
    const tiles = el('div', { class: 'dv-tiles' });
    const tileEls = {};
    for (const [k, name, unit, color] of TILES) {
      const cv = el('canvas', { width: 220, height: 70 });
      const v = el('b', {}, '');
      tiles.append(el('div', { class: 'dv-tile', 'data-k': k }, el('div', { class: 'dv-tile-h' }, el('span', {}, name), v), cv));
      tileEls[k] = { cv, v, unit, color };
    }
    const events = el('div', { class: 'dv-events' });
    const hurt = el('b', {}, '0');
    const acts = el('div', { class: 'dv-acts' });
    const fb = el('div', { class: 'feedback' });
    panel.append(el('div', { class: 'dv-grid inc' }, el('div', { class: 'dv-mon' }, banner, tiles), el('div', { class: 'dv-mid' }, el('h4', {}, '🧾 Что происходило'), events, fb), el('div', { class: 'dv-side' }, el('div', { class: 'dv-hurt' }, el('span', {}, '😟 Клиентов не смогли войти'), hurt), el('h4', {}, '🛠 Действия'), acts, hint(ctx, '📈 Посмотри, какой график «сломался» и что случилось перед этим. Сломалось после релиза — откатывай. Диск полный — логи. Трафик ×50 — DDoS.'))));
    let cur = null;
    let gameMin = 0;
    let target = { ...NORMAL };
    let live = { ...NORMAL };
    let busy = false;
    let stop = false;
    let stopRaf = false;
    const draw = () => {
      for (const [k] of TILES) {
        const t = tileEls[k];
        spark(t.cv, hist[k], t.color, MAX[k]);
        const v = live[k];
        t.v.textContent = k === 'rps' ? `×${v.toFixed(v < 10 ? 1 : 0)}` : `${Math.round(v)}${t.unit === 'мс' ? ' мс' : t.unit}`;
        const badNow = k === 'err' ? v > 5 : k === 'lat' ? v > 1000 : k === 'cpu' ? v > 90 : k === 'disk' ? v > 90 : v > 5;
        t.v.parentElement.parentElement.classList.toggle('bad', badNow);
      }
    };
    // «живые» графики: значения плавно идут к цели, с шумом
    (async () => {
      let acc = 0;
      while (!stopRaf) {
        await sleep(120);
        if (ctx.isPaused()) continue;
        acc += 120;
        for (const [k] of TILES) {
          live[k] += (target[k] - live[k]) * 0.18;
          const noise = k === 'disk' ? 0 : (Math.random() - 0.5) * (k === 'lat' ? 60 : k === 'rps' ? 0.2 : 1.6);
          live[k] = Math.max(0, live[k] + noise * 0.3);
        }
        if (acc >= 480) {
          acc = 0;
          for (const [k] of TILES) {
            hist[k].push(live[k]);
            hist[k].shift();
          }
        }
        draw();
      }
    })();
    for (const a of ACTIONS) {
      const b = el('button', { class: 'dv-act', 'data-id': a.id }, el('span', {}, a.icon), a.name);
      b.addEventListener('click', () => act(a.id));
      acts.append(b);
    }
    acts.querySelectorAll('button').forEach((b) => (b.disabled = true));
    setTimeout(() => tour('dv_inc'), 450);
    // игровое время идёт: 1 секунда = 1 минута; пока авария — клиенты страдают
    (async () => {
      while (!stop) {
        await waitActive(ctx, 1000);
        if (stop) break;
        gameMin++;
        if (cur) {
          const rate = Math.round(18 + live.err * 3.2);
          cur.affected += rate;
          res.affected += rate;
          hurt.textContent = num(res.affected);
          clock.textContent = `🌙 ${hm(cur.inc.time, gameMin)}`;
        }
      }
    })();

    (async () => {
      await waitActive(ctx, 1600);
      for (const inc of INCIDENTS) {
        await runOne(inc);
        await waitActive(ctx, 900);
      }
      stop = true;
      await postmortem();
    })();

    function runOne(inc) {
      return new Promise((done) => {
        cur = { inc, affected: 0, wrong: 0, done };
        gameMin = 0;
        target = { ...inc.metrics };
        if (inc.id === 'disk') target.disk = 99;
        banner.className = 'dv-alert on';
        banner.textContent = `${inc.alert} · ${inc.time}`;
        events.innerHTML = '';
        fb.innerHTML = '';
        inc.events.forEach((e, i) => setTimeout(() => events.append(el('div', { class: 'dv-ev' }, e)), 200 + i * 350));
        audio.alarm(true);
        setTimeout(() => audio.alarm(false), 1600);
        flash('red');
        acts.querySelectorAll('button').forEach((b) => (b.disabled = false));
      });
    }

    async function act(id) {
      if (!cur || busy) return;
      busy = true;
      audio.click();
      const inc = cur.inc;
      const name = ACTIONS.find((a) => a.id === id).name;
      events.append(el('div', { class: 'dv-ev me' }, `▶ ${name}`));
      if (id === inc.fix) {
        acts.querySelectorAll('button').forEach((b) => (b.disabled = true));
        target = { ...NORMAL, disk: inc.id === 'disk' ? 41 : NORMAL.disk };
        fb.innerHTML = '';
        fb.append(el('div', { class: 'fb good' }, '✅ Графики возвращаются в норму'));
        learn(inc.k);
        audio.success();
        await waitActive(ctx, 2200);
        banner.className = 'dv-alert ok';
        banner.textContent = `🟢 Починено за ${gameMin} мин`;
        res.perIncident.push({ id: inc.id, min: gameMin, affected: cur.affected, wrong: cur.wrong });
        const d = cur.done;
        cur = null;
        busy = false;
        d();
        return;
      }
      cur.wrong++;
      res.wrong++;
      audio.wrong();
      fb.innerHTML = '';
      fb.append(el('div', { class: `fb ${id === inc.partial ? 'warn' : 'bad'}` }, `${id === inc.partial ? '🟡' : '⚠️'} ${inc.notes[id]}`));
      if (id === inc.partial) target = { ...target, err: target.err * 0.6, cpu: 92, lat: target.lat * 0.6 };
      if (id === 'restart') {
        const keep = { ...target };
        target = { ...NORMAL, disk: target.disk };
        await waitActive(ctx, 1600);
        target = keep;
      }
      // неверное действие стоит времени
      await waitActive(ctx, id === 'wake' ? 3000 : 1400);
      if (id === 'wake') {
        gameMin += 7;
        cur.affected += 300;
        res.affected += 300;
        hurt.textContent = num(res.affected);
      }
      busy = false;
    }

    function postmortem() {
      return new Promise((done) => {
        stopRaf = true;
        panel.querySelector('.dv-grid').remove();
        const body = el('div', { class: 'dv-pm' });
        panel.append(body);
        clock.textContent = '☀️ 09:30 · разбор';
        let picked = 0;
        const lessons = {};
        body.append(el('h2', {}, '📝 Разбор аварий — без поиска виноватых'), el('p', { class: 'muted' }, 'Утром команда разбирает ночь: что починить, чтобы это не повторилось? Не «кто виноват», а «почему так вышло».'));
        for (const inc of INCIDENTS) {
          const row = el('div', { class: 'dv-pm-row' }, el('b', {}, `${inc.time} · ${inc.alert.replace(/^\S+\s/, '')}`));
          const opts = el('div', { class: 'choices' });
          for (const l of inc.lesson)
            opts.append(
              el('button', { class: 'choice logic', onClick: () => {
                if (lessons[inc.id]) return;
                audio.click();
                lessons[inc.id] = l;
                opts.querySelectorAll('button').forEach((b) => (b.disabled = true));
                row.append(el('div', { class: `fb ${l.good ? 'good' : 'bad'}` }, l.good ? '✅ Чиним причину' : `⚠️ ${l.note}`));
                if (l.good) {
                  learn('k_d_blameless');
                  if (l.k) learn(l.k);
                  audio.coin();
                } else audio.wrong();
                picked++;
                if (picked === INCIDENTS.length) finish(lessons);
              } }, el('span', { class: 'choice-text' }, l.t)),
            );
          row.append(opts);
          body.append(row);
        }
        setTimeout(() => tour('dv_pm'), 400);
        async function finish(ls) {
          await sleep(900);
          const good = Object.values(ls).filter((l) => l.good).length;
          const affected = res.affected;
          const starsN = affected < 1400 && res.wrong <= 1 && good === 3 ? 3 : affected < 2600 && good >= 2 ? 2 : 1;
          const score = Math.max(80, 520 - Math.round(affected / 12) - res.wrong * 30 + good * 40);
          ctx.addScore(score);
          ctx.prof.data.dv = null;
          setBeat(ctx.state, 'night', starsN >= 2 ? 'held' : 'rough');
          const cons = res.perIncident.map((p) => {
            const inc = INCIDENTS.find((i) => i.id === p.id);
            return { kind: p.wrong === 0 ? 'good' : p.wrong <= 1 ? 'warn' : 'bad', icon: inc.alert.split(' ')[0], text: `${inc.time} — починено за ${p.min} мин${p.wrong ? `, неверных действий: ${p.wrong}` : ' с первого раза'}. Пострадало клиентов: ${num(p.affected)}.` };
          });
          cons.push({ kind: good === 3 ? 'good' : 'warn', icon: '📝', text: good === 3 ? 'На разборе выбрали правильные меры: канарейка, ротация логов, защита от DDoS. Такие аварии больше не повторятся.' : 'Часть мер на разборе — мимо: похожая авария может повториться.' });
          done();
          resolve({ stars: starsN, score, learned: [...new Set(data.learned)], consequencesTitle: 'Утро после дежурства…', consequences: cons, stats: [['😟', num(affected), 'клиентов не смогли войти'], ['🛠', String(res.wrong), 'лишних действий'], ['📝', `${good}/3`, 'верных выводов']] });
        }
      });
    }
  });
}

// ═══════════════════════ Смена 3: атака в логах ═══════════════════════
const IPS = ['185.220.101.7'];
function makeLogs(s) {
  const users = ['anna.k', 'petrov77', 'svetlana.m', 'iv.ivanov', 'olga.s', 'dmitry_r', 'kate.b', 'artem.k', 'marina.v', 'sergey88', 'n.orlova', 'max.t', 'elena.p', 'tim.z', 'alex.n'];
  const homeIps = ['46.39.12.8', '95.153.3.21', '178.76.200.4', '91.215.7.33', '217.118.80.2'];
  const lines = [];
  let t = 12 * 3600 + 38 * 60;
  const ts = () => {
    t += 1 + Math.floor(Math.random() * 3);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  for (let i = 0; i < 70; i++) {
    const r = Math.random();
    if (i === 8) lines.push({ t: ts(), ip: '103.75.11.90', user: 'contractor.oleg', ev: 'ВХОД · выгрузка отчётов 2 ГБ', ok: true, kind: 'insider', note: 'из другой страны' });
    if (i === 16) lines.push({ t: ts(), ip: IPS[0], user: 'v.petrovna', ev: 'ВХОД', ok: true, kind: 'taken', note: 'новое устройство' });
    if (i % 9 === 4) lines.push({ t: ts(), ip: '95.153.40.12', user: 'misha.k', ev: 'неверный пароль', ok: false, kind: 'kid', note: 'iPhone Миши' });
    if (r < 0.55) lines.push({ t: ts(), ip: IPS[0], user: users[Math.floor(Math.random() * users.length)], ev: 'неверный пароль', ok: false, kind: 'stuff' });
    else lines.push({ t: ts(), ip: homeIps[Math.floor(Math.random() * homeIps.length)], user: users[Math.floor(Math.random() * users.length)], ev: Math.random() < 0.85 ? 'ВХОД' : 'неверный пароль', ok: true, kind: 'normal' });
  }
  for (const l of lines) if (l.kind === 'normal' && l.ev !== 'ВХОД') l.ok = false;
  return lines;
}
const KIND_OPTS = [
  { id: 'stuff', t: '🔁 Подбор паролей' },
  { id: 'taken', t: '🔓 Взломанный вход' },
  { id: 'insider', t: '🕵️ Подозрительный сотрудник' },
  { id: 'none', t: '🙂 Не атака' },
];
export function runLogs(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const s = story(ctx.state);
  const lines = makeLogs(s);
  const found = new Set();
  const applied = new Set();
  let falsePos = 0;
  let threat = 0;
  let stopped = false;
  return new Promise((resolve) => {
    const panel = openPanel('devops logs');
    const prog = el('span', { class: 'term-progress' }, '🔎 0/3');
    panel.append(termBar('Логи входа в мобильный банк · live', ctx, prog));
    const tasks = el('div', { class: 'dv-tasks' }, LOG_TASKS.map((t) => el('div', { class: 'dv-task', 'data-id': t.id }, el('span', {}, t.icon), el('p', {}, t.text), el('i', {}, ''))));
    const threatEl = el('b', {}, '0');
    const filters = el('div', { class: 'dv-filters' });
    const table = el('div', { class: 'dv-log' });
    const pop = el('div', { class: 'dv-pop hidden' });
    const fb = el('div', { class: 'feedback' });
    const meas = el('div', { class: 'dv-meas' });
    const done = el('button', { class: 'btn primary big', disabled: true }, '✅ Атака отбита');
    panel.append(
      el(
        'div',
        { class: 'dv-grid logs' },
        el('div', { class: 'dv-side' }, el('div', { class: 'dv-hurt' }, el('span', {}, '🎯 Аккаунтов перебрали'), threatEl), el('h4', {}, '🔎 Найди в логах'), tasks, hint(ctx, '🔁 Подбор паролей: один адрес — много разных логинов и ошибок. Взлом — успешный вход с того же адреса. 🙂 А много ошибок у одного человека с его же телефона — просто забыл пароль.')),
        el('div', { class: 'dv-mid' }, filters, table, pop, fb),
        el('div', { class: 'dv-side' }, el('h4', {}, '🛡 Меры защиты'), meas, done),
      ),
    );
    let filter = 'all';
    for (const [id, label] of [['all', 'Все'], ['fail', 'Только ошибки'], ['ok', 'Успешные входы'], ['ip', `Адрес ${IPS[0]}`]]) {
      const b = el('button', { class: `dv-flt${id === 'all' ? ' on' : ''}` }, label);
      b.addEventListener('click', () => {
        audio.click();
        filter = id;
        filters.querySelectorAll('.dv-flt').forEach((x) => x.classList.toggle('on', x === b));
        render();
      });
      filters.append(b);
    }
    let shown = 18;
    function render() {
      table.innerHTML = '';
      const vis = lines.slice(0, shown).filter((l) => (filter === 'fail' ? !l.ok : filter === 'ok' ? l.ok : filter === 'ip' ? l.ip === IPS[0] : true));
      for (const l of vis.slice().reverse()) {
        const row = el('button', { class: `dv-row${l.ok ? '' : ' fail'}${l.marked ? ' marked' : ''}` }, el('span', {}, l.t), el('span', {}, l.ip), el('span', {}, l.user), el('span', {}, l.ok ? `✓ ${l.ev}` : `✗ ${l.ev}`), el('small', {}, l.note || ''));
        row.addEventListener('click', (e) => openPop(l, e.currentTarget));
        table.append(row);
      }
    }
    render();
    function openPop(l, row) {
      audio.click();
      pop.innerHTML = '';
      pop.classList.remove('hidden');
      pop.append(el('b', {}, `${l.user} · ${l.ip}`), el('small', {}, 'Что это?'));
      for (const o of KIND_OPTS) {
        pop.append(
          el('button', { class: 'btn ghost small', onClick: () => {
            pop.classList.add('hidden');
            classify(l, o.id, row);
          } }, o.t),
        );
      }
      const r = row.getBoundingClientRect();
      const pr = pop.parentElement.getBoundingClientRect();
      pop.style.top = `${Math.min(pr.height - 190, r.bottom - pr.top + 4)}px`;
    }
    function classify(l, kind, row) {
      const truth = l.kind === 'normal' || l.kind === 'kid' ? 'none' : l.kind;
      fb.innerHTML = '';
      if (kind !== truth) {
        if (l.kind === 'kid' && kind !== 'none') {
          falsePos++;
          fb.append(el('div', { class: 'fb bad' }, '🙂 Это Миша — забыл пароль, пробует со своего же телефона. Не атака, а ложная тревога'));
          learn('k_d_fp');
        } else fb.append(el('div', { class: 'fb bad' }, truth === 'none' ? '🙂 Обычный вход клиента — ничего подозрительного' : '🤔 Не совсем: посмотри на адрес, время и что произошло'));
        audio.wrong();
        return;
      }
      if (truth === 'none') {
        fb.append(el('div', { class: 'fb good' }, l.kind === 'kid' ? '✅ Верно: Миша просто забыл пароль. Ложная тревога распознана' : '✅ Обычный вход'));
        audio.blip(700);
        return;
      }
      if (found.has(truth)) return;
      found.add(truth);
      l.marked = true;
      row.classList.add('marked');
      tasks.querySelector(`[data-id="${truth}"]`).classList.add('done');
      tasks.querySelector(`[data-id="${truth}"] i`).textContent = '✓';
      prog.textContent = `🔎 ${found.size}/3`;
      audio.stamp();
      const msg = {
        stuff: `✅ ${IPS[0]} перебирает чужие логины — это подбор паролей. Пароли, видимо, утекли с другого сайта`,
        taken: `🔓 Вход в аккаунт v.petrovna с адреса атакующего! ${s.gran || s.call ? 'Это Валентина Петровна — та самая. Мошенники добрались и до её приложения' : 'Это Валентина Петровна, 72 года'}`,
        insider: '🕵️ Учётка подрядчика Олега: вход из другой страны и выгрузка 2 ГБ отчётов. А договор с ним вчера закончился!',
      }[truth];
      fb.append(el('div', { class: 'fb good' }, msg));
      drawMeasures();
      done.disabled = found.size < 3;
    }
    function drawMeasures() {
      meas.innerHTML = '';
      for (const m of MEASURES) {
        if (m.need && !found.has(m.need)) continue;
        const on = applied.has(m.id);
        const b = el('button', { class: `dv-act${on ? ' on' : ''}`, disabled: on }, el('span', {}, m.icon), m.name);
        b.addEventListener('click', () => {
          audio.click();
          applied.add(m.id);
          if (m.k) learn(m.k);
          fb.innerHTML = '';
          fb.append(el('div', { class: `fb ${m.good ? 'good' : 'bad'}` }, m.good ? `✅ ${m.name}` : `${m.part ? '🟡' : '⚠️'} ${m.note}`));
          m.good ? audio.coin() : audio.wrong();
          if (m.id === 'ratelimit') stopped = true;
          drawMeasures();
        });
        meas.append(b);
      }
    }
    drawMeasures();
    setTimeout(() => tour('dv_logs'), 450);
    // поток: новые строки, счётчик перебранных аккаунтов растёт, пока нет лимита попыток
    let live = true;
    (async () => {
      while (live) {
        await waitActive(ctx, 900);
        if (!live) break;
        if (shown < lines.length) {
          shown++;
          if (!document.querySelector('.dv-pop:not(.hidden)')) render();
        }
        if (!stopped) {
          threat += 37 + Math.floor(Math.random() * 20);
          threatEl.textContent = num(threat);
        }
      }
    })();
    done.addEventListener('click', () => {
      audio.click();
      live = false;
      const goodM = MEASURES.filter((m) => m.good && applied.has(m.id)).length;
      const badM = MEASURES.filter((m) => !m.good && !m.part && applied.has(m.id)).length;
      const neededM = MEASURES.filter((m) => m.good).length;
      const starsN = goodM === neededM && !badM && falsePos === 0 && threat < 900 ? 3 : goodM >= 3 && badM === 0 ? 2 : 1;
      const score = Math.max(60, 120 * goodM - 90 * badM - 40 * falsePos - Math.round(threat / 20) + 100);
      ctx.addScore(score);
      ctx.prof.data.dv = null;
      setBeat(ctx.state, 'stuffing', applied.has('reset') ? 'stopped' : 'missed');
      const cons = [
        applied.has('ratelimit') ? { kind: 'good', icon: '🚦', text: 'Лимит попыток остановил подбор: боты упёрлись в капчу.' } : { kind: 'bad', icon: '🔁', text: 'Без лимита попыток боты перебирали пароли до утра.' },
        applied.has('2fa') ? { kind: 'good', icon: '📲', text: 'Код подтверждения с нового устройства: даже с верным паролем мошенники не вошли ни в один аккаунт.' } : { kind: 'warn', icon: '📲', text: 'Без второго фактора угаданный пароль = вход в чужой банк.' },
        applied.has('reset') ? { kind: 'good', icon: '🔒', text: `Сессию мошенников в аккаунте Валентины Петровны сбросили, ей позвонили и сменили пароль — деньги целы.` } : { kind: 'bad', icon: '🔓', text: 'Мошенники остались в аккаунте Валентины Петровны — отдел безопасности ловил их переводы вручную.' },
        applied.has('contractor') ? { kind: 'good', icon: '🚪', text: 'Учётку бывшего подрядчика заблокировали. Оказалось, её пароль утёк вместе с его ноутбуком.' } : { kind: 'bad', icon: '🕵️', text: 'Через учётку бывшего подрядчика выгрузили ещё отчёты.' },
      ];
      if (badM) cons.push({ kind: 'bad', icon: '📴', text: 'Слишком грубая мера ударила по честным клиентам — жалобы в поддержку.' });
      if (falsePos) cons.push({ kind: 'warn', icon: '🙂', text: 'Мишу по ошибке приняли за атакующего — ему заблокировали вход на день.' });
      resolve({ stars: starsN, score, learned: [...new Set(data.learned)], consequencesTitle: 'К вечеру…', consequences: cons, stats: [['🔎', `${found.size}/3`, 'находок в логах'], ['🛡', `${goodM}/${neededM}`, 'верных мер'], ['🎯', num(threat), 'аккаунтов перебрали']] });
    });
  });
}

// ═══════════════════════ Смена 4: таблица доступов ═══════════════════════
export function runAccess(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const s = story(ctx.state);
  const people = PEOPLE.map((p) => ({ ...p, have: [...p.have] }));
  // Заявка HR на стажёра из смены «Первый день» — какие доступы попросили
  if (s.mashaAccess) {
    const map = { mail: 'mail', training: 'training', cash: 'abs', clients: 'clients', admin: 'prod' };
    people[0].have = s.mashaAccess.map((x) => map[x]).filter(Boolean);
    people[0].ticket = `Заявка HR (из смены «Первый день»): ${people[0].have.length ? people[0].have.map((r) => RESOURCES.find((x) => x.id === r).name.toLowerCase()).join(', ') : 'пусто'}`;
  }
  if (s.insider === 'hired') people.push({ id: 'ruslan', name: 'Руслан', role: 'операционист на испытательном сроке', look: LOOKS.ruslan, have: ['mail', 'abs', 'clients'], need: [], ticket: '🚨 Система: «Руслан выгружает базу клиентов на флешку»', alert: true, why: { clients: 'Выгрузка базы — утечка. Доступы закрыть немедленно и сообщить в безопасность', abs: 'Пока идёт расследование — без доступа', mail: 'Пока идёт расследование — без доступа' } });
  return new Promise((resolve) => {
    const panel = openPanel('devops acc');
    panel.append(termBar('Доступы · заявки и аудит прав', ctx, el('span', { class: 'term-progress' }, '🔐 Минимум прав')));
    const tickets = el('div', { class: 'dv-tickets' }, people.map((p) => el('div', { class: `dv-ticket${p.alert ? ' alert' : ''}` }, ava(p.look, p.alert ? 'angry' : 'neutral', 'dv-ava sm'), el('p', {}, p.ticket))));
    const table = el('table', { class: 'dv-matrix' });
    const head = el('tr', {}, el('th', {}, ''), RESOURCES.map((r) => el('th', { title: r.name }, el('span', {}, r.icon), el('small', {}, r.name))));
    table.append(head);
    for (const p of people) {
      const tr = el('tr', { class: p.alert ? 'alert' : '' }, el('th', { class: 'dv-who' }, ava(p.look, 'neutral', 'dv-ava xs'), el('div', {}, el('b', {}, p.name), el('small', {}, p.role))));
      for (const r of RESOURCES) {
        const on = p.have.includes(r.id);
        const td = el('td', {}, el('button', { class: `dv-cell${on ? ' on' : ''}`, 'aria-label': `${p.name}: ${r.name}` }, on ? '✓' : ''));
        td.firstChild.addEventListener('click', (e) => {
          audio.click();
          const i = p.have.indexOf(r.id);
          i >= 0 ? p.have.splice(i, 1) : p.have.push(r.id);
          e.currentTarget.classList.toggle('on', p.have.includes(r.id));
          e.currentTarget.textContent = p.have.includes(r.id) ? '✓' : '';
        });
        tr.append(td);
      }
      table.append(tr);
    }
    const apply = el('button', { class: 'btn primary big' }, '✅ Применить и провести аудит');
    const fb = el('div', { class: 'dv-acc-res' });
    panel.append(el('div', { class: 'dv-grid acc' }, el('div', { class: 'dv-side' }, el('h4', {}, '📨 Заявки и сигналы'), tickets, hint(ctx, '🔐 Каждому — только то, что нужно для работы. Ушедшим — ничего. Админ на боевых серверах — почти никому.')), el('div', { class: 'dv-mid' }, el('div', { class: 'dv-matrix-wrap' }, table), el('small', { class: 'dv-scroll-hint' }, '↔ Таблицу можно листать вбок'), fb, apply)));
    setTimeout(() => tour('dv_acc'), 450);
    apply.addEventListener('click', async () => {
      audio.click();
      apply.disabled = true;
      table.querySelectorAll('.dv-cell').forEach((b) => (b.disabled = true));
      let right = 0;
      let total = 0;
      const cons = [];
      people.forEach((p, pi) => {
        const row = table.querySelectorAll('tr')[pi + 1];
        const extra = p.have.filter((x) => !p.need.includes(x));
        const miss = p.need.filter((x) => !p.have.includes(x));
        RESOURCES.forEach((r, ri) => {
          total++;
          const ok = p.need.includes(r.id) === p.have.includes(r.id);
          if (ok) right++;
          row.querySelectorAll('td')[ri].classList.add(ok ? 'right' : 'wrong');
        });
        if (!extra.length && !miss.length) cons.push(p.alert ? { kind: 'good', icon: '🛡', text: `${p.name}: все доступы закрыты за минуту, служба безопасности уведомлена — база клиентов не ушла.` } : { kind: 'good', icon: '✅', text: `${p.name}: доступы ровно по работе.` });
        else {
          if (extra.length) cons.push({ kind: p.alert || p.id === 'oleg' ? 'bad' : 'warn', icon: '⚠️', text: `${p.name}: лишнее — ${extra.map((x) => RESOURCES.find((r) => r.id === x).name.toLowerCase()).join(', ')}. ${p.why?.[extra[0]] || 'Лишний доступ — лишний риск.'}` });
          if (miss.length) cons.push({ kind: 'warn', icon: '⛔', text: `${p.name}: не хватает — ${miss.map((x) => RESOURCES.find((r) => r.id === x).name.toLowerCase()).join(', ')}. Человек не сможет работать.` });
        }
        if (p.id === 'oleg' && !p.have.length) learn('k_d_offboard');
        if (p.alert && !p.have.length) setBeat(ctx.state, 'insider', 'caught');
      });
      if (right / total > 0.85) learn('k_d_least');
      const acc = right / total;
      const starsN = acc >= 0.97 ? 3 : acc >= 0.85 ? 2 : 1;
      const score = Math.round(acc * 500);
      fb.append(el('div', { class: `fb ${starsN === 3 ? 'good' : 'bad'}` }, `Аудит: верно ${right} из ${total} ячеек`));
      starsN === 3 ? audio.bigWin() : audio.success();
      await sleep(1600);
      ctx.addScore(score);
      ctx.prof.data.dv = null;
      resolve({ stars: starsN, score, learned: [...new Set(data.learned)], consequencesTitle: 'Через неделю аудит службы безопасности…', consequences: cons, stats: [['🔐', `${right}/${total}`, 'ячеек верно'], ['🚪', people.find((p) => p.id === 'oleg').have.length ? '✗' : '✓', 'подрядчик отключён'], ['⚙️', people.filter((p) => p.have.includes('prod')).length ? '✗' : '✓', 'нет лишних админов']] });
    });
  });
}

// ═══════════════════════ Смена 5: канареечный релиз ═══════════════════════
export function runCanary(ctx, shift) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const rel = RELEASES[shift.n] || RELEASES[5];
  const STAGES = [1, 10, 50, 100];
  let stage = 0;
  let version = 1;
  let hurt = 0;
  let wrongRollback = 0;
  let stoppedAt = null;
  let caughtAt = null;
  let stageToken = 0;
  const errOld = [];
  const errNew = [];
  return new Promise((resolve) => {
    const panel = openPanel('devops canary');
    const prog = el('span', { class: 'term-progress' }, '🐤 1%');
    panel.append(termBar(`Выкатка по шагам · ${rel.feature}`, ctx, prog));
    const stagesEl = el('div', { class: 'dv-stages' }, STAGES.map((p, i) => el('div', { class: `dv-stage${i === 0 ? ' now' : ''}` }, `${p}%`)));
    const cv = el('canvas', { width: 640, height: 220, class: 'dv-chart' });
    const legend = el('div', { class: 'dv-legend' }, el('span', { class: 'old' }, '— старая версия'), el('span', { class: 'new' }, '— новая версия'));
    const users = el('b', {}, '0');
    const hurtEl = el('b', {}, '0');
    const reviews = el('div', { class: 'dv-reviews' });
    const nextBtn = el('button', { class: 'btn primary' }, '▶ Дальше: 10%');
    const backBtn = el('button', { class: 'btn danger' }, '↩️ Откатить');
    const flagBtn = el('button', { class: 'btn ghost' }, '🚩 Выключить функцию флагом');
    const fb = el('div', { class: 'feedback' });
    panel.append(el('div', { class: 'dv-grid can' }, el('div', { class: 'dv-mid' }, stagesEl, el('h4', {}, '❗ Ошибки, %'), cv, legend, fb), el('div', { class: 'dv-side' }, el('div', { class: 'dv-hurt' }, el('span', {}, '📱 На новой версии'), users), el('div', { class: 'dv-hurt bad' }, el('span', {}, '😖 Столкнулись с ошибкой'), hurtEl), el('h4', {}, '⭐ Отзывы'), reviews, hint(ctx, '🐤 Смотри на красную линию: если новая версия ошибается чаще старой — не выкатывай дальше. Откат или флаг — и чиним.'), el('div', { class: 'dv-can-btns' }, nextBtn, flagBtn, backBtn))));
    learn('k_d_canary');
    setTimeout(() => tour('dv_canary'), 450);
    const draw = () => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.strokeStyle = 'rgba(255,255,255,0.07)';
      for (let y = 0; y <= 10; y += 2) {
        const yy = cv.height - 10 - (y / 10) * (cv.height - 20);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(cv.width, yy);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.font = '12px JetBrains Mono, monospace';
        g.fillText(`${y}%`, 4, yy - 3);
      }
      const line = (arr, color) => {
        if (arr.length < 2) return;
        g.beginPath();
        arr.forEach((v, i) => {
          const x = 30 + (i / 59) * (cv.width - 40);
          const y = cv.height - 10 - (Math.min(v, 10) / 10) * (cv.height - 20);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.strokeStyle = color;
        g.lineWidth = 3;
        g.stroke();
      };
      line(errOld, '#8fb3a4');
      line(errNew, '#ff4d5e');
    };
    let live = true;
    let ticks = 0;
    const share = () => (stoppedAt != null ? 0 : STAGES[stage]);
    const broken = () => version === 1 && STAGES[stage] >= 10 && stoppedAt == null;
    (async () => {
      while (live) {
        await waitActive(ctx, 300);
        ticks++;
        const eOld = 0.4 + Math.random() * 0.3;
        const eNew = stoppedAt != null ? NaN : broken() && ticks > 3 ? 6.5 + Math.random() * 2.5 : 0.4 + Math.random() * 0.35;
        errOld.push(eOld);
        errNew.push(Number.isNaN(eNew) ? eOld : eNew);
        if (errOld.length > 60) errOld.shift(), errNew.shift();
        const onNew = Math.round((rel.users * share()) / 100);
        users.textContent = num(onNew);
        if (broken() && ticks > 3) {
          hurt += Math.round(onNew * 0.0015) + 1;
          hurtEl.textContent = num(hurt);
          if (ticks % 7 === 0) addReview(false);
        } else if (ticks % 11 === 0 && share()) addReview(true);
        draw();
      }
    })();
    const GOOD = ['★★★★★ Перевёл по QR за 3 секунды!', '★★★★★ Удобно, спасибо!', '★★★★☆ Наконец-то QR', '★★★★★ Работает огонь'];
    const BAD = ['★☆☆☆☆ Вылетает при сканировании QR (Android 12)', '★☆☆☆☆ Приложение закрывается само!', '★★☆☆☆ Не могу перевести — белый экран'];
    function addReview(good) {
      const arr = good ? GOOD : BAD;
      reviews.prepend(el('div', { class: `dv-rev ${good ? 'ok' : 'bad'}` }, arr[Math.floor(Math.random() * arr.length)]));
      while (reviews.children.length > 5) reviews.lastChild.remove();
    }
    const setStage = (i) => {
      stage = i;
      ticks = 0;
      stagesEl.querySelectorAll('.dv-stage').forEach((x, k) => {
        x.classList.toggle('now', k === i);
        x.classList.toggle('done', k < i);
      });
      prog.textContent = `🐤 ${STAGES[i]}%${version > 1 ? ' · версия с исправлением' : ''}`;
      // на каждом шаге релиз «настаивается»: смотрим на графики, прежде чем идти дальше
      const label = i < STAGES.length - 1 ? `▶ Дальше: ${STAGES[i + 1]}%` : '🏁 Готово: 100%';
      nextBtn.disabled = true;
      nextBtn.textContent = '⏳ Наблюдаем за графиками…';
      const my = ++stageToken;
      waitActive(ctx, 2600).then(() => {
        if (my !== stageToken || stoppedAt != null || !live) return;
        nextBtn.disabled = false;
        nextBtn.textContent = label;
      });
    };
    setStage(0);
    nextBtn.addEventListener('click', async () => {
      audio.click();
      if (broken() && ticks > 3) {
        fb.innerHTML = '';
        fb.append(el('div', { class: 'fb bad' }, '⚠️ Новая версия ошибается в 15 раз чаще старой — а ты выкатываешь её ещё большему числу людей'));
        audio.wrong();
      }
      if (stage < STAGES.length - 1) {
        setStage(stage + 1);
        audio.whoosh();
        return;
      }
      finish();
    });
    async function stopRelease(how) {
      audio.click();
      if (!broken()) {
        wrongRollback++;
        fb.innerHTML = '';
        fb.append(el('div', { class: 'fb bad' }, '🤔 Графики в норме — откатывать нечего. Релиз задержался зря'));
        audio.wrong();
        return;
      }
      stoppedAt = STAGES[stage];
      caughtAt = STAGES[stage];
      learn(how === 'flag' ? 'k_d_canary' : 'k_d_rollback');
      nextBtn.disabled = backBtn.disabled = flagBtn.disabled = true;
      fb.innerHTML = '';
      fb.append(el('div', { class: 'fb good' }, how === 'flag' ? '🚩 Функцию выключили флагом — приложение работает как раньше. Катя чинит сканер QR…' : '↩️ Откатили на старую версию. Катя чинит сканер QR…'));
      audio.success();
      await waitActive(ctx, 2600);
      version = 2;
      stoppedAt = null;
      fb.innerHTML = '';
      fb.append(el('div', { class: 'fb good' }, '🛠 Исправление готово и прошло конвейер. Снова по шагам — с 1%'));
      nextBtn.disabled = backBtn.disabled = flagBtn.disabled = false;
      setStage(0);
    }
    backBtn.addEventListener('click', () => stopRelease('rollback'));
    flagBtn.addEventListener('click', () => stopRelease('flag'));
    async function finish() {
      live = false;
      if (version === 1) {
        // сломанную версию выкатили всем: ошибка у каждого пятнадцатого
        hurt += Math.round(rel.users / 15);
        hurtEl.textContent = num(hurt);
      }
      nextBtn.disabled = backBtn.disabled = flagBtn.disabled = true;
      const counter = el('b', {}, '0');
      panel.querySelector('.dv-mid').append(el('div', { class: 'dv-rocket' }, el('span', {}, '🐤'), el('div', {}, 'Переводят по QR: ', counter)));
      animateNumber(counter, 0, rel.users, 1800, (v) => num(v));
      audio.bigWin();
      await sleep(2300);
      const pipe = releaseConsequences(rel, data);
      const caught = version > 1;
      const cons = [...pipe.cons];
      cons.push(caught ? { kind: hurt < 300 ? 'good' : 'warn', icon: '🐤', text: `Ошибку сканера QR заметили на ${caughtAt}% — с ней столкнулись ${num(hurt)} клиентов вместо 120 000.` } : { kind: 'bad', icon: '💥', text: `Сломанная версия дошла до всех: с ошибкой столкнулись ${num(hurt)} клиентов. В понедельник — разбор и извинения.` });
      if (wrongRollback) cons.push({ kind: 'warn', icon: '🤔', text: 'Откатывали без причины — релиз задержался.' });
      cons.push(caught ? { kind: 'good', icon: '📱', text: `Понедельник: ${num(rel.users)} клиентов переводят по QR-коду.` } : { kind: 'warn', icon: '📱', text: 'К понедельнику исправление всё-таки выкатили — но отзывы в магазине приложений уже испорчены.' });
      const starsN = pipe.bad === 0 && caught && hurt < 300 && pipe.warn <= 1 ? 3 : pipe.bad <= 1 && caught ? 2 : 1;
      const score = Math.max(80, 600 - pipe.bad * 150 - pipe.warn * 40 - Math.round(hurt / 5) - wrongRollback * 40);
      ctx.addScore(score);
      ctx.prof.data.dv = null;
      setBeat(ctx.state, 'qr', caught ? 'smooth' : 'rough');
      resolve({ stars: starsN, score, learned: [...new Set(data.learned)], consequencesTitle: 'Выходные позади…', consequences: cons, stats: [['🐤', caught ? `на ${caughtAt}%` : '—', 'поймали ошибку'], ['😖', num(hurt), 'клиентов с ошибкой'], ['🛡', String(Object.entries(data.outcomes || {}).filter(([k, v]) => !k.endsWith('_fp') && v === 'good').length), 'дыр закрыто']] });
    }
  });
}
