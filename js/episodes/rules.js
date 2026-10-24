// Смена 3. «Правило»: собери антифрод-правило из сигналов и проверь его на вчерашних операциях.
// Главная мысль профессии без лекций: строгое правило ловит всех, но бьёт по честным; мягкое — пропускает мошенников.
import { RULE_DATA, SIGNALS } from '../data/chapter1.js';
import { el, openPanel, termBar, sleep, flash } from '../ui.js';

const ORDER = ['amount', 'city', 'night', 'device', 'to', 'call'];

export function evaluateRule(rule, ops) {
  return ops.map((sig) => sig.filter((s) => rule.signals.includes(s)).length >= rule.threshold);
}

export function runRules(ctx) {
  const { audio } = ctx;
  const cfg = ctx.diff.s3;
  const ops = [...RULE_DATA.fraud.map((sig) => ({ sig, fraud: true })), ...RULE_DATA.honest.map((sig) => ({ sig, fraud: false }))];
  // Перемешиваем детерминированно, чтобы точки выглядели как живые данные
  ops.sort((a, b) => ((a.sig.join('').length * 7 + (a.fraud ? 3 : 0)) % 11) - ((b.sig.join('').length * 7 + (b.fraud ? 3 : 0)) % 11));
  const rule = { signals: [], threshold: 2 };
  let runs = 0;
  let lastRes = null;

  return new Promise((resolve) => {
    const panel = openPanel('rules');
    const runsInfo = el('div', { class: 'term-progress' }, cfg.runs ? `попыток: ${cfg.runs}` : 'запуски без ограничений');
    panel.append(termBar('Антифрод-правило №1', ctx, runsInfo));

    // ── конструктор ──
    const chips = el('div', { class: 'r-chips' });
    for (const id of ORDER) {
      const s = SIGNALS[id];
      const chip = el('button', { class: 'r-chip', 'aria-pressed': 'false' }, el('span', { class: 'r-ico' }, s.icon), el('span', {}, s.label));
      chip.addEventListener('click', () => {
        audio.click();
        const on = !rule.signals.includes(id);
        rule.signals = on ? [...rule.signals, id] : rule.signals.filter((x) => x !== id);
        chip.classList.toggle('on', on);
        chip.setAttribute('aria-pressed', String(on));
        renderPreview();
      });
      chips.append(chip);
    }
    const thr = el('div', { class: 'r-thr' });
    for (const n of [1, 2, 3]) {
      const b = el('button', { class: `r-thr-btn${n === rule.threshold ? ' on' : ''}` }, `≥ ${n}`);
      b.addEventListener('click', () => {
        audio.click();
        rule.threshold = n;
        thr.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        renderPreview();
      });
      thr.append(b);
    }
    const preview = el('div', { class: 'r-preview' });
    const runBtn = el('button', { class: 'btn primary big', onClick: run }, '▶ Проверить на вчерашних данных');
    const builder = el(
      'div',
      { class: 'r-builder' },
      el('div', { class: 'r-step' }, el('span', { class: 'r-n' }, '1'), el('b', {}, 'Сигналы')),
      chips,
      el('div', { class: 'r-step' }, el('span', { class: 'r-n' }, '2'), el('b', {}, 'Сколько сигналов для блокировки')),
      thr,
      preview,
      runBtn,
    );

    // ── симуляция ──
    const goal = el('div', { class: 'r-goal' }, el('span', {}, '🎯 Цель:'), el('b', {}, '🕵️ 10/10'), el('b', {}, '😠 ≤ 1'), el('span', { class: 'muted' }, '= ★★★'));
    const field = el('div', { class: 'r-field' }, el('div', { class: 'r-bin block' }, el('span', {}, '🛑 Заблокировано')), el('div', { class: 'r-bin pass' }, el('span', {}, '✅ Пропущено')));
    const legend = el('div', { class: 'r-legend' }, el('span', {}, el('i', { class: 'dot fraud' }), 'мошенник'), el('span', {}, el('i', { class: 'dot honest' }), 'честный клиент'));
    const results = el('div', { class: 'r-results' });
    const applyBtn = el('button', { class: 'btn primary', onClick: apply, disabled: true }, '✔ Применить правило');
    const sim = el('div', { class: 'r-sim' }, goal, field, legend, results, applyBtn);
    panel.append(el('div', { class: 'rules-body' }, builder, sim));

    // точки
    const dots = ops.map((op) => {
      const d = el('span', { class: `r-dot ${op.fraud ? 'fraud' : 'honest'}`, title: op.sig.map((s) => SIGNALS[s].icon).join(' ') || 'без сигналов' });
      field.append(d);
      return d;
    });

    function layoutDots(blocked) {
      const fw = field.clientWidth;
      const fh = field.clientHeight;
      const size = Math.max(12, Math.min(22, Math.floor(fw / 30)));
      const gap = size + 4;
      const binW = fw / 2;
      const cols = Math.max(4, Math.floor((binW - 16) / gap));
      const counters = [0, 0];
      dots.forEach((d, i) => {
        d.style.width = d.style.height = `${size}px`;
        let x;
        let y;
        if (!blocked) {
          const perRow = Math.max(8, Math.floor((fw - 16) / gap));
          x = 8 + (i % perRow) * gap;
          y = 40 + Math.floor(i / perRow) * gap;
        } else {
          const bin = blocked[i] ? 0 : 1;
          const k = counters[bin]++;
          x = bin * binW + 8 + (k % cols) * gap;
          y = 40 + Math.floor(k / cols) * gap;
        }
        d.style.transform = `translate(${x}px, ${Math.min(y, fh - size - 4)}px)`;
      });
    }

    function renderPreview() {
      preview.innerHTML = '';
      if (!rule.signals.length) {
        preview.append(el('span', { class: 'muted' }, '👆 Выбери сигналы'));
        runBtn.disabled = true;
        return;
      }
      runBtn.disabled = cfg.runs && runs >= cfg.runs;
      preview.append(el('span', {}, '🛑 если '), el('b', {}, `≥ ${rule.threshold}`), el('span', {}, ' из '), el('b', { class: 'r-icons' }, rule.signals.map((s) => SIGNALS[s].icon).join(' ')));
    }

    async function run() {
      if (!rule.signals.length) return;
      if (cfg.runs && runs >= cfg.runs) return;
      runs++;
      if (cfg.runs) runsInfo.textContent = `попыток: ${cfg.runs - runs}`;
      audio.whoosh();
      runBtn.disabled = true;
      const blocked = evaluateRule(rule, ops.map((o) => o.sig));
      dots.forEach((d, i) => {
        d.classList.remove('miss', 'fp');
        d.style.transitionDelay = `${i * 18}ms`;
      });
      layoutDots(blocked);
      await sleep(900 + ops.length * 18);
      const caught = ops.filter((o, i) => o.fraud && blocked[i]).length;
      const fp = ops.filter((o, i) => !o.fraud && blocked[i]).length;
      const missed = ops.filter((o, i) => o.fraud && !blocked[i]);
      const wrong = ops.filter((o, i) => !o.fraud && blocked[i]);
      dots.forEach((d, i) => {
        d.style.transitionDelay = '0ms';
        if (ops[i].fraud && !blocked[i]) d.classList.add('miss');
        if (!ops[i].fraud && blocked[i]) d.classList.add('fp');
      });
      const stars = caught === 10 && fp <= 1 ? 3 : caught >= 8 && fp <= 2 ? 2 : 1;
      lastRes = { caught, fp, stars, rule: { signals: [...rule.signals], threshold: rule.threshold } };

      results.innerHTML = '';
      results.append(
        el(
          'div',
          { class: 'r-score' },
          el('div', { class: caught === 10 ? 'good' : 'bad' }, el('b', {}, `🕵️ ${caught}/10`), el('span', {}, 'мошенников поймано')),
          el('div', { class: fp <= 1 ? 'good' : 'bad' }, el('b', {}, `😠 ${fp}`), el('span', {}, 'честных заблокировано')),
          el('div', { class: 'r-stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
        ),
      );
      const sigIcons = (o) => o.sig.map((s) => SIGNALS[s].icon).join('') || '—';
      if (missed.length) results.append(el('div', { class: 'r-list miss' }, el('span', {}, '💸 Ушли:'), missed.map((o) => el('code', {}, sigIcons(o)))));
      if (wrong.length) results.append(el('div', { class: 'r-list fp' }, el('span', {}, '😠 Зря:'), wrong.map((o) => el('code', {}, sigIcons(o)))));
      results.append(
        el(
          'div',
          { class: 'r-tip' },
          stars === 3 ? '🎯 Отличное правило!' : missed.length ? '💡 Посмотри сигналы ушедших — добавь их' : '💡 Убери сигнал, который часто бывает у честных',
        ),
      );
      if (stars === 3) {
        audio.bigWin();
        flash('green');
      } else audio.success();
      applyBtn.disabled = false;
      renderPreview();
    }

    function apply() {
      if (!lastRes) return;
      audio.click();
      const score = lastRes.caught * 30 - lastRes.fp * 20 + lastRes.stars * 50;
      ctx.addScore(Math.max(0, score));
      const learned = ['k_rule', 'k_fp', 'k_data'].filter((k) => ctx.learn(k));
      resolve({
        stars: lastRes.stars,
        score,
        rule: lastRes.rule,
        learned,
        stats: [
          ['🕵️', `${lastRes.caught}/10`, 'мошенников поймано'],
          ['😠', String(lastRes.fp), 'честных заблокировано'],
          ['⚙️', lastRes.rule.signals.map((s) => SIGNALS[s].icon).join(' '), `порог ≥ ${lastRes.rule.threshold}`],
        ],
      });
    }

    renderPreview();
    requestAnimationFrame(() => layoutDots(null));
    const onResize = () => layoutDots(lastRes ? evaluateRule(lastRes.rule, ops.map((o) => o.sig)) : null);
    window.addEventListener('resize', onResize);
    applyBtn.addEventListener('click', () => window.removeEventListener('resize', onResize));
  });
}
