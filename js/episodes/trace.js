// Смена 5. «След денег»: доска расследования с нитями, выписки, дробление, цифровой след.
import { buildTrace } from '../data/chapter1.js';
import { el, openPanel, termBar, sleep, money, moneyShort, fmtTime, flash, animateNumber } from '../ui.js';
import { portrait } from '../portraits.js';

const SVG = {
  people:
    '<svg viewBox="0 0 48 48"><circle cx="17" cy="17" r="7" fill="#8a7a6a"/><circle cx="31" cy="17" r="7" fill="#a89888"/><path d="M5 41 Q17 25 29 41Z" fill="#8a7a6a"/><path d="M19 41 Q31 25 43 41Z" fill="#a89888"/></svg>',
  card: '<svg viewBox="0 0 48 48"><rect x="5" y="11" width="38" height="26" rx="4" fill="#4cc9f0"/><rect x="5" y="17" width="38" height="5" fill="#1b4a60"/><rect x="10" y="28" width="13" height="3" rx="1.5" fill="#e8f8ff"/></svg>',
  exchange:
    '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#9b6dff"/><path d="M14 20h19l-5-5M34 28H15l5 5" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  letter: (l, c) =>
    `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="${c}"/><text x="24" y="31.5" text-anchor="middle" font-size="21" font-weight="800" fill="#fff" font-family="Manrope,sans-serif">${l}</text></svg>`,
};

function avatar(id, n) {
  if (id === 'victim') return portrait('gran', 'worried');
  if (id === 'dima') return portrait('dima', 'worried');
  if (id === 'boss') return portrait('scammer');
  if (n.kind === 'victims') return SVG.people;
  if (n.kind === 'transit') return SVG.card;
  if (n.kind === 'exchange') return SVG.exchange;
  if (id === 'alina') return SVG.letter('А', '#e76f9a');
  if (id === 'kirill') return SVG.letter('К', '#4f8bd6');
  return '';
}

const STEPS = {
  1: { title: '💸 Куда ушли деньги?', text: 'Выписка Димы → нажми перевод, который ведёт дальше' },
  2: { title: '✂️ Дробление', text: 'Отметь ВСЕ одинаковые переводы с транзитной карты' },
  3: { title: '📱 Цифровой след', text: 'Обменник → найди устройство, которое есть у всех трёх дропов' },
  4: { title: '🎯 Куратор найден', text: 'Заморозь сеть, пока деньги не ушли в крипту' },
};

export function runTrace(ctx) {
  const { audio } = ctx;
  const cfg = ctx.diff.s5;
  const clientLost = ctx.state.outcome.call === 'lost';
  const T = buildTrace(clientLost);
  const st = { step: 1, time: cfg.time, mistakes: 0, ended: false, selected: new Set(), current: null, flowing: true, frozen: false };

  return new Promise((resolve) => {
    const panel = openPanel('ep3');
    const timer = el('b', { class: 'timer' }, fmtTime(st.time));
    panel.append(termBar('Доска расследований', ctx, el('div', { class: 'term-timer' }, el('span', {}, '⏳ до вывода в крипту'), timer)));

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('strings');
    const inner = el('div', { class: 'board-inner' });
    inner.append(svg);
    const board = el('div', { class: 'cork' }, inner);
    const stepHead = el('div', { class: 'step-head' });
    const view = el('div', { class: 'node-view' });
    const feedback = el('div', { class: 'feedback' });
    const side = el('div', { class: 'trace-side' }, stepHead, feedback, view);
    panel.append(el('div', { class: 'trace' }, board, side));

    // ───────── узлы ─────────
    const nodeEls = {};
    for (const [id, n] of Object.entries(T.nodes)) {
      n.id = id;
      const node = el(
        'button',
        { class: `node kind-${n.kind}`, 'data-id': id },
        el('span', { class: 'pin' }),
        el('span', { class: 'node-ava', html: avatar(id, n) }),
        el('b', {}, n.title),
        el('small', {}, n.sub),
        el('span', { class: 'node-stamp' }, 'ЗАМОРОЖЕНО'),
      );
      node.addEventListener('click', () => select(id));
      if (!n.visible) node.classList.add('hidden');
      inner.append(node);
      nodeEls[id] = node;
    }

    const animated = new Set(T.links.map((l, i) => i));
    const particles = [];

    function isPortrait() {
      return inner.clientWidth < inner.clientHeight * 0.95;
    }

    // Позиция карточки в пикселях; карточки не вылезают за края доски.
    function xy(n) {
      const w = inner.clientWidth;
      const h = inner.clientHeight;
      const p = isPortrait();
      const node = nodeEls[n.id];
      const hw = (node?.offsetWidth || 120) / 2 + 6;
      const hh = (node?.offsetHeight || 96) / 2 + 10;
      const x = (((p ? n.y : n.x) / 100) * w);
      const y = (((p ? n.x : n.y) / 100) * h);
      return [Math.max(hw, Math.min(w - hw, x)), Math.max(hh, Math.min(h - hh, y))];
    }

    function layout() {
      for (const n of Object.values(T.nodes)) {
        const [x, y] = xy(n);
        nodeEls[n.id].style.left = `${x}px`;
        nodeEls[n.id].style.top = `${y}px`;
      }
      drawStrings();
    }

    function curve(a, b) {
      const [x1, y1] = xy(a);
      const [x2, y2] = xy(b);
      const mx = (x1 + x2) / 2;
      const my = Math.max(y1, y2) + Math.min(60, Math.abs(x2 - x1) * 0.18 + 18);
      return { x1, y1, mx, my, x2, y2, d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}` };
    }

    function drawStrings() {
      svg.setAttribute('viewBox', `0 0 ${inner.clientWidth} ${inner.clientHeight}`);
      svg.innerHTML = '';
      inner.querySelectorAll('.string-tag').forEach((t) => t.remove());
      T.links.forEach((l, i) => {
        if (!l.visible) return;
        const a = T.nodes[l.from];
        const b = T.nodes[l.to];
        if (!a.visible || !b.visible) return;
        const c = curve(a, b);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', c.d);
        path.setAttribute('class', `string ${l.kind}${st.frozen ? ' frozen' : ''}`);
        if (!animated.has(i)) {
          animated.add(i);
          path.setAttribute('pathLength', '1');
          path.classList.add('draw');
          requestAnimationFrame(() => requestAnimationFrame(() => path.classList.add('drawn')));
        }
        svg.append(path);
        if (l.label) {
          const tag = el('span', { class: `string-tag ${l.kind}${st.frozen ? ' frozen' : ''}` }, l.label);
          tag.style.transform = `translate(${(c.x1 + 2 * c.mx + c.x2) / 4}px, ${(c.y1 + 2 * c.my + c.y2) / 4}px) translate(-50%, -50%)`;
          inner.append(tag);
        }
      });
    }

    function link(from, to, kind = 'money', label = null) {
      T.links.push({ from, to, kind, label, visible: true });
      if (kind === 'money') spawnParticles(T.links.length - 1);
    }

    function reveal(id) {
      T.nodes[id].visible = true;
      nodeEls[id].classList.remove('hidden');
      nodeEls[id].classList.add('appear');
      layout();
      audio.pin();
    }

    // ───────── частицы денег на нитях ─────────
    function spawnParticles(linkIndex) {
      for (let k = 0; k < 3; k++) {
        const dot = el('span', { class: 'money-dot' }, '₽');
        inner.append(dot);
        particles.push({ dot, link: linkIndex, phase: k / 3 });
      }
    }
    if (clientLost) spawnParticles(0);

    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!ctx.isPaused() && !st.ended && st.step < 5 && cfg.realtime) {
        st.time -= dt * cfg.realtime;
        if (st.time <= 0) timeOut();
        renderTime();
      }
      for (const p of particles) {
        const l = T.links[p.link];
        const a = T.nodes[l.from];
        const b = T.nodes[l.to];
        if (!st.flowing || !a.visible || !b.visible) {
          p.dot.style.opacity = '0';
          continue;
        }
        p.phase = (p.phase + dt * 0.35) % 1;
        const c = curve(a, b);
        const t = p.phase;
        const x = (1 - t) * (1 - t) * c.x1 + 2 * (1 - t) * t * c.mx + t * t * c.x2;
        const y = (1 - t) * (1 - t) * c.y1 + 2 * (1 - t) * t * c.my + t * t * c.y2;
        p.dot.style.opacity = String(Math.sin(Math.PI * t));
        p.dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    function renderTime() {
      timer.textContent = fmtTime(st.time);
      timer.classList.toggle('low', st.time <= 30);
    }

    function penalty(text) {
      st.mistakes++;
      st.time = Math.max(0, st.time - cfg.penalty);
      renderTime();
      const d = el('span', { class: 'time-delta' }, `−${cfg.penalty} с`);
      timer.parentElement.append(d);
      setTimeout(() => d.remove(), 1300);
      audio.wrong();
      say(text, 'bad');
      if (st.time <= 0) timeOut();
    }

    function say(text, kind = 'info') {
      feedback.innerHTML = '';
      feedback.append(el('div', { class: `fb ${kind}` }, text));
    }

    function renderStep() {
      const s = STEPS[st.step];
      stepHead.innerHTML = '';
      stepHead.append(el('div', { class: 'step-n' }, st.step <= 3 ? `Шаг ${st.step} из 3` : 'Финал'), el('h3', {}, s.title), el('p', {}, s.text));
      stepHead.classList.remove('flash');
      void stepHead.offsetWidth;
      stepHead.classList.add('flash');
      for (const n of Object.values(nodeEls)) n.classList.remove('pulse');
      const target = { 1: 'dima', 2: 'transit', 3: 'exchange', 4: null }[st.step];
      if (target) nodeEls[target].classList.add('pulse');
      if (st.step === 4) {
        stepHead.append(el('button', { class: 'btn freeze big', onClick: freeze }, '❄ Заморозить сеть'));
      }
    }

    // ───────── карточка выбранного узла ─────────
    function select(id) {
      if (st.ended) return;
      st.current = id;
      audio.click();
      for (const [k, n] of Object.entries(nodeEls)) n.classList.toggle('selected', k === id);
      const n = T.nodes[id];
      view.innerHTML = '';
      view.append(el('div', { class: 'nv-head' }, el('span', { class: 'nv-ava', html: avatar(id, n) }), el('div', {}, el('b', {}, n.title), el('small', {}, n.sub))));
      if (n.info) view.append(el('p', { class: 'nv-info' }, n.info));

      if (n.tx) view.append(statement(id, n));
      if (st.step >= 3 && n.devices) {
        view.append(el('h4', {}, '📱 Входы в приложение'), el('div', { class: 'dev-list' }, n.devices.map((d) => el('span', { class: `dev${d.endsWith(T.answerDevice) && st.step > 3 ? ' match' : ''}` }, d))));
        if (st.step === 3) view.append(el('p', { class: 'muted' }, '👉 Сравни всех троих на карточке обменника'));
      }
      if (id === 'exchange' && st.step >= 3) view.append(deviceGrid());
      if (id === 'victim') view.append(el('p', { class: 'nv-info' }, clientLost ? '💸 Её 340 тыс. ₽ ушли Диме — ещё можно заморозить' : '🛡 Её перевод отменён. Другим повезло меньше'));
      if (n.kind === 'victims') view.append(el('p', { class: 'nv-info' }, '📍 Таганрог, Азов, Батайск… Все поверили «банку» или «ФСБ»'));
      if (window.matchMedia('(max-width: 820px)').matches) view.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function statement(id, n) {
      const step1 = st.step === 1 && id === 'dima';
      const step2 = st.step === 2 && id === 'transit';
      const table = el('div', { class: 'stmt' }, el('div', { class: 'stmt-head' }, el('span', {}, 'Время'), el('span', {}, 'Контрагент'), el('span', {}, 'Сумма')));
      for (const tx of n.tx) {
        const out = tx.a < 0;
        const row = el(
          'div',
          { class: `stmt-row ${out ? 'out' : 'in'}` },
          el('span', {}, tx.t),
          el('span', {}, tx.who),
          el('b', {}, `${out ? '−' : '+'}${money(Math.abs(tx.a))}`),
        );
        if (step1) {
          row.classList.add('pick');
          row.addEventListener('click', () => pickStep1(tx, row));
        }
        if (step2 && out) {
          row.classList.add('check');
          row.prepend(el('i', { class: 'box' }));
          row.addEventListener('click', () => {
            audio.click();
            if (st.selected.has(tx)) st.selected.delete(tx);
            else st.selected.add(tx);
            row.classList.toggle('on', st.selected.has(tx));
            linkBtn.textContent = `🧵 Связать (${st.selected.size})`;
            linkBtn.disabled = st.selected.size === 0;
          });
        }
        table.append(row);
      }
      let linkBtn = null;
      if (step2) {
        st.selected.clear();
        linkBtn = el('button', { class: 'btn primary', onClick: checkStep2, disabled: true }, '🧵 Связать (0)');
        return el('div', {}, el('h4', {}, '🧾 Выписка · отметь исходящие'), table, linkBtn);
      }
      return el('div', {}, el('h4', {}, step1 ? '🧾 Выписка · нажми нужный перевод' : '🧾 Выписка'), table);
    }

    function deviceGrid() {
      const drops = ['dima', 'alina', 'kirill'];
      const grid = el('div', { class: 'dev-grid' });
      for (const d of drops) {
        const col = el('div', { class: 'dev-col' }, el('b', {}, T.nodes[d].title));
        for (const dev of T.nodes[d].devices) {
          const chip = el('button', { class: `dev${st.step > 3 && dev.endsWith(T.answerDevice) ? ' match' : ''}` }, dev);
          if (st.step === 3) chip.addEventListener('click', () => pickDevice(dev, chip));
          col.append(chip);
        }
        grid.append(col);
      }
      return el('div', {}, el('h4', {}, '📱 Кто входил в приложения дропов'), grid);
    }

    // ───────── проверки шагов ─────────
    async function pickStep1(tx, row) {
      if (st.step !== 1 || st.ended) return;
      if (tx.a > 0) return penalty('⬅ Это входящий. Нужен исходящий (−)');
      if (!tx.go) {
        row.classList.add('wrong');
        return penalty(tx.why);
      }
      row.classList.add('right');
      audio.success();
      say('✅ Почти всё ушло на одну карту — это транзит', 'good');
      st.step = 2;
      reveal('transit');
      link('dima', 'transit', 'money', moneyShort(tx.a));
      drawStrings();
      await sleep(700);
      for (const id of ['alina', 'kirill']) {
        reveal(id);
        link(id, 'transit', 'money');
        drawStrings();
        await sleep(450);
      }
      reveal('others');
      link('others', 'alina', 'money');
      link('others', 'kirill', 'money');
      drawStrings();
      await sleep(400);
      say('🕸 Туда же несут деньги ещё два дропа. Это сеть', 'good');
      renderStep();
      select('transit');
    }

    async function checkStep2() {
      if (st.step !== 2 || st.ended) return;
      const n = T.nodes.transit;
      const splits = n.tx.filter((t) => t.split);
      const extra = [...st.selected].filter((t) => !t.split);
      const missing = splits.filter((t) => !st.selected.has(t));
      if (extra.length) return penalty(`❌ «${extra[0].who}» — ${extra[0].why || 'не то'}`);
      if (missing.length) return penalty(`✂️ Не все части: их ${splits.length} одинаковых`);
      audio.success();
      st.step = 3;
      reveal('exchange');
      link('transit', 'exchange', 'money', `${splits.length} × ${moneyShort(splits[0].a)}`);
      drawStrings();
      say('✂️ Дробление: сумму делят, чтобы обойти лимиты', 'good');
      await sleep(600);
      renderStep();
      select('exchange');
    }

    async function pickDevice(dev, chip) {
      if (st.step !== 3 || st.ended) return;
      if (!dev.endsWith(T.answerDevice)) {
        chip.classList.add('wrong');
        return penalty('❌ Есть только у одного. Ищи общее у всех трёх');
      }
      st.step = 4;
      audio.bigWin();
      flash('green');
      view.querySelectorAll('.dev').forEach((d) => {
        if (d.textContent.endsWith(T.answerDevice)) d.classList.add('match');
      });
      say('🎯 #A7F3 входил ко всем трём — это телефон куратора', 'good');
      await sleep(700);
      reveal('boss');
      for (const d of ['dima', 'alina', 'kirill']) link('boss', d, 'control');
      link('exchange', 'boss', 'money');
      drawStrings();
      renderStep();
      await sleep(300);
      select('boss');
    }

    async function freeze() {
      if (st.step !== 4 || st.ended) return;
      st.step = 5;
      st.ended = true;
      st.flowing = false;
      stepHead.querySelector('.btn.freeze')?.remove();
      audio.whoosh();
      for (const id of ['dima', 'alina', 'kirill', 'transit', 'exchange', 'boss']) {
        T.nodes[id].frozen = true;
        nodeEls[id].classList.add('frozen');
        audio.freeze();
        await sleep(280);
      }
      st.frozen = true;
      drawStrings();
      board.classList.add('frozen');
      const sum = el('b', {}, money(0));
      const res = el(
        'div',
        { class: 'trace-result won' },
        el('h2', {}, '❄ Сеть заморожена'),
        el('div', { class: 'frozen-sum' }, sum),
        el('div', { class: 'res-chips' }, el('span', {}, `👥 ${T.victims} человек могут вернуть деньги`), el('span', {}, '🚔 Куратор передан полиции')),
        el('div', { class: 'lesson-card' }, el('b', {}, '💳 Дроп = соучастник'), el('p', {}, '«Подработка: дай карту за 5000» — это преступление, а не работа.')),
        el('button', { class: 'btn primary', onClick: () => done(true) }, 'Готово ✓'),
      );
      side.innerHTML = '';
      side.append(res);
      animateNumber(sum, 0, T.frozen, 1600, money);
      audio.bigWin();
    }

    function timeOut() {
      if (st.ended) return;
      st.ended = true;
      st.time = 0;
      renderTime();
      audio.fail();
      flash('red');
      side.innerHTML = '';
      side.append(
        el(
          'div',
          { class: 'trace-result lost' },
          el('h2', {}, '⏳ Деньги ушли в крипту'),
          el('p', {}, 'Заморозить уже не выйдет. Попробуй быстрее!'),
          el(
            'div',
            { class: 'row' },
            el('button', { class: 'btn ghost', onClick: () => done(false, true) }, '↺ Ещё раз'),
            el('button', { class: 'btn primary', onClick: () => done(false, false) }, 'Продолжить'),
          ),
        ),
      );
    }

    function done(success, retry = false) {
      audio.click();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', layout);
      const snapshot = {
        frozen: success,
        nodes: Object.fromEntries(Object.entries(T.nodes).map(([k, n]) => [k, { ...n, tx: undefined, devices: undefined }])),
        links: T.links.filter((l) => l.visible),
      };
      const score = success ? 400 + Math.round(st.time) - st.mistakes * 20 : 30;
      if (!retry) {
        ctx.addScore(Math.max(0, score));
        if (success) {
          ctx.addMoney(T.frozen);
          ctx.world.state.stopped += 1;
        }
      }
      resolve({
        success,
        retry,
        score,
        mistakes: st.mistakes,
        frozen: success ? T.frozen : 0,
        board: snapshot,
        stars: success ? (st.mistakes === 0 ? 3 : st.mistakes <= 2 ? 2 : 1) : 1,
        learned: success ? ['k_drop', 'k_split', 'k_device'].filter((k) => ctx.learn(k)) : [],
        stats: [
          ['❄', moneyShort(success ? T.frozen : 0), 'заморожено'],
          ['❌', String(st.mistakes), 'ошибок в расследовании'],
          ['🎯', success ? 'найден' : 'ушёл', 'куратор'],
        ],
      });
    }

    window.addEventListener('resize', layout);
    renderStep();
    say('🧵 Нити = движение денег · карточки открываются', 'info');
    requestAnimationFrame(() => {
      layout();
      select('dima');
    });
  });
}
