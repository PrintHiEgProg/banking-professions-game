// Смена 2. «Поток»: живой поток платежей. Решай быстро: пропустить или заблокировать.
// Почти без текста: отклонения от привычек клиента подсвечены ⚠, решение — свайпом, кнопкой или стрелками.
import { FLOW_CARDS } from '../data/chapter1.js';
import { el, openPanel, termBar, money, moneyShort, flash, sleep, tour } from '../ui.js';

const COLORS = ['#e76f51', '#2a9d8f', '#8e7dbe', '#e9a23b', '#4f8bd6', '#d1495b'];
const HINT = { amount: (c) => `×${c.x}`, city: () => 'не свой город', night: () => 'ночь', device: () => 'впервые', to: () => 'впервые', call: () => 'на телефоне' };

export function runFlow(ctx) {
  const { audio } = ctx;
  const cfg = ctx.diff.s2;
  const cards = FLOW_CARDS.slice(0, cfg.count);
  const showCount = ctx.state.difficulty !== 'hard';
  const res = { caught: 0, fraudTotal: 0, passed: 0, honestTotal: 0, mistakes: 0, saved: 0, score: 0 };
  for (const c of cards) {
    if (c.fraud) res.fraudTotal++;
    else res.honestTotal++;
  }

  return new Promise((resolve) => {
    const panel = openPanel('flow');
    const progress = el('div', { class: 'term-progress' }, `1 / ${cards.length}`);
    panel.append(termBar('Поток операций', ctx, progress));

    const cCaught = el('b', {}, '0');
    const cPassed = el('b', {}, '0');
    const cErr = el('b', {}, '0');
    const legend = el(
      'div',
      { class: 'flow-top' },
      el('div', { class: 'flow-rule' }, el('span', { class: 'ok' }, '✅ 0–1 ⚠ → пропусти'), el('span', { class: 'bad' }, '🛑 2+ ⚠ → блокируй')),
      el('div', { class: 'flow-score' }, el('span', {}, '🛑 ', cCaught), el('span', {}, '✅ ', cPassed), el('span', {}, '❌ ', cErr)),
    );
    const stack = el('div', { class: 'flow-stack' });
    const feedback = el('div', { class: 'flow-fb' });
    const blockBtn = el('button', { class: 'btn danger big', onClick: () => decide(true) }, '🛑 Блок', el('kbd', {}, '←'));
    const passBtn = el('button', { class: 'btn safe big', onClick: () => decide(false) }, '✅ Пропустить', el('kbd', {}, '→'));
    panel.append(el('div', { class: 'flow-body' }, legend, stack, feedback, el('div', { class: 'flow-btns' }, blockBtn, passBtn)));

    let idx = 0;
    let cardEl = null;
    let busy = false;
    let left = 0;
    let raf = 0;
    let last = 0;

    function rowEl(icon, value, sig, card) {
      const bad = card.sig.includes(sig);
      return el('div', { class: `f-row${bad ? ' warn' : ''}` }, el('span', { class: 'f-ico' }, icon), el('span', { class: 'f-val' }, value), bad ? el('span', { class: 'f-flag' }, `⚠ ${HINT[sig](card)}`) : null);
    }

    function render() {
      const c = cards[idx];
      progress.textContent = `${idx + 1} / ${cards.length}`;
      const timer = el('div', { class: 'f-timer' }, el('i'));
      cardEl = el(
        'div',
        { class: 'f-card enter' },
        el(
          'div',
          { class: 'f-head' },
          el('span', { class: 'f-ava', style: { background: COLORS[idx % COLORS.length] } }, c.name[0]),
          el('div', {}, el('b', {}, `${c.name}, ${c.age}`), el('small', {}, c.what)),
          showCount ? el('span', { class: `f-count${c.sig.length >= 2 ? ' hot' : ''}` }, `⚠ ${c.sig.length}`) : null,
        ),
        rowEl('💰', money(c.amount), 'amount', c),
        rowEl('📍', c.city, 'city', c),
        rowEl('🕒', c.time, 'night', c),
        rowEl('📱', c.device === 'своё' ? 'своё устройство' : 'новое устройство', 'device', c),
        rowEl('👤', c.to, 'to', c),
        c.call ? rowEl('📞', 'идёт звонок', 'call', c) : null,
        timer,
      );
      stack.innerHTML = '';
      if (idx + 1 < cards.length) stack.append(el('div', { class: 'f-card ghost' }));
      stack.append(cardEl);
      requestAnimationFrame(() => cardEl.classList.remove('enter'));
      bindSwipe(cardEl);
      // Первая карточка без таймера — разобраться в механике
      left = idx === 0 ? Infinity : cfg.cardTime;
      last = performance.now();
      const fill = timer.firstChild;
      if (idx === 0) {
        timer.classList.add('off');
        stack.append(el('div', { class: 'f-tutor' }, '⚠ = привычки клиента нарушены. Посчитай ⚠ и реши'));
        setTimeout(() => tour('flow'), 450);
      }
      cancelAnimationFrame(raf);
      const tick = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!ctx.isPaused() && !busy && Number.isFinite(left)) {
          left -= dt;
          fill.style.transform = `scaleX(${Math.max(0, left / cfg.cardTime)})`;
          timer.classList.toggle('low', left < 2.5);
          if (left <= 0) {
            decide(false, true);
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    function bindSwipe(card) {
      let sx = null;
      let dx = 0;
      card.addEventListener('pointerdown', (e) => {
        if (busy) return;
        sx = e.clientX;
        dx = 0;
        card.setPointerCapture(e.pointerId);
        card.classList.add('drag');
      });
      card.addEventListener('pointermove', (e) => {
        if (sx == null) return;
        dx = e.clientX - sx;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        card.classList.toggle('lean-block', dx < -40);
        card.classList.toggle('lean-pass', dx > 40);
      });
      const end = () => {
        if (sx == null) return;
        sx = null;
        card.classList.remove('drag', 'lean-block', 'lean-pass');
        if (dx < -90) decide(true);
        else if (dx > 90) decide(false);
        else card.style.transform = '';
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    }

    function say(icon, text, kind) {
      feedback.innerHTML = '';
      feedback.append(el('div', { class: `fb ${kind}` }, `${icon} ${text}`));
    }

    async function decide(block, timedOut = false) {
      // после последней карточки кнопки ещё видны: лишний клик не должен ничего ломать
      if (busy || !cardEl || idx >= cards.length) return;
      busy = true;
      cancelAnimationFrame(raf);
      stack.querySelector('.f-tutor')?.remove();
      const c = cards[idx];
      const card = cardEl;
      card.classList.add(block ? 'out-left' : 'out-right');
      if (block && c.fraud) {
        res.caught++;
        res.saved += c.amount;
        res.score += 40;
        ctx.addScore(40);
        ctx.addMoney(c.amount);
        audio.stamp();
        setTimeout(() => audio.coin(), 120);
        say('🛑', `Мошенник остановлен · +${moneyShort(c.amount)}`, 'good');
      } else if (!block && !c.fraud) {
        res.passed++;
        res.score += 20;
        ctx.addScore(20);
        audio.coin();
        say('✅', 'Честный платёж прошёл', 'good');
      } else if (block && !c.fraud) {
        res.mistakes++;
        audio.wrong();
        say('😠', `Заблокирован честный платёж — ${c.name} без покупки`, 'bad');
      } else {
        res.mistakes++;
        audio.fail();
        flash('red');
        say(timedOut ? '⏱' : '💸', `${timedOut ? 'Не успели!' : 'Пропущен мошенник!'} −${moneyShort(c.amount)}`, 'bad');
      }
      cCaught.textContent = String(res.caught);
      cPassed.textContent = String(res.passed);
      cErr.textContent = String(res.mistakes);
      await sleep(650);
      idx++;
      busy = false;
      if (idx >= cards.length) return finish();
      render();
    }

    const onKey = (e) => {
      if (e.code === 'ArrowLeft') decide(true);
      if (e.code === 'ArrowRight') decide(false);
    };
    window.addEventListener('keydown', onKey);

    function finish() {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      busy = true;
      cardEl = null;
      blockBtn.disabled = true;
      passBtn.disabled = true;
      res.stars = res.mistakes === 0 ? 3 : res.mistakes <= 2 ? 2 : 1;
      res.learned = ['k_profile', 'k_signals', 'k_balance'].filter((k) => ctx.learn(k));
      res.stats = [
        ['🛑', `${res.caught}/${res.fraudTotal}`, 'мошенников остановлено'],
        ['✅', `${res.passed}/${res.honestTotal}`, 'честных платежей прошло'],
        ['💰', moneyShort(res.saved), 'спасено'],
      ];
      resolve(res);
    }

    render();
  });
}

