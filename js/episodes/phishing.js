// Смена 1. «Рассылка»: найди улики в сообщениях и вынеси вердикт.
// Заблокировать сообщение можно, только показав хотя бы одну улику — так игрок учится видеть признаки, а не угадывать.
import { MESSAGES, KNOWLEDGE } from '../data/chapter1.js';
import { el, openPanel, termBar, num, flash, sleep, animateNumber, tour } from '../ui.js';

const CHANNEL_ICON = { SMS: '✉', 'Мессенджер': '💬', 'Почта': '@' };

export function runPhishing(ctx) {
  const { audio } = ctx;
  const cfg = ctx.diff.s1;
  const ids = cfg.messages;
  const res = { correct: 0, total: ids.length, flagsFound: 0, flagsTotal: 0, falseAlarms: 0, clients: 0, score: 0, learned: [] };
  let hintsLeft = cfg.hints;

  const learn = (k) => {
    if (k && ctx.learn(k)) {
      res.learned.push(k);
      return true;
    }
    return false;
  };
  const score = (n) => {
    res.score += n;
    ctx.addScore(n);
  };

  return new Promise((resolve) => {
    const panel = openPanel('ep1');
    const progress = el('div', { class: 'term-progress' });
    // Рассылка идёт прямо сейчас: счётчик ушедших СМС растёт, пока ты разбираешь жалобы
    let sent = 3120;
    const sentEl = el('b', {}, num(sent));
    const live = el('div', { class: 'ph-live' }, el('i', { class: 'dot' }), 'Рассылка идёт: ', sentEl, ' SMS');
    const liveTimer = setInterval(() => {
      if (ctx.isPaused()) return;
      sent += 7 + Math.floor(Math.random() * 9);
      sentEl.textContent = num(sent);
    }, 380);
    panel.append(termBar('Жалобы клиентов', ctx, el('div', { class: 'row' }, live, progress)));

    const queue = el('div', { class: 'ep1-queue' });
    const center = el('div', { class: 'ep1-center' });
    const side = el('div', { class: 'ep1-side' });
    const guide = el('div', { class: 'guide' }, el('span', {}, '① 👆 Найди улики'), el('i', {}, '→'), el('span', {}, '② ⚖️ Вынеси вердикт'));
    panel.append(el('div', { class: 'ep1-body' }, queue, el('div', { class: 'ep1-mid' }, guide, center), side));

    const queueItems = ids.map((id, i) => {
      const m = MESSAGES[id];
      const item = el(
        'div',
        { class: 'q-item' },
        el('span', { class: 'q-icon' }, CHANNEL_ICON[m.channel] || '✉'),
        el('span', { class: 'q-text' }, el('b', {}, m.sender), el('small', {}, m.channel)),
        el('span', { class: 'q-status' }, String(i + 1)),
      );
      queue.append(item);
      return item;
    });

    let rafId = 0;
    const stopTimer = () => cancelAnimationFrame(rafId);

    function showMessage(i) {
      stopTimer();
      const m = MESSAGES[ids[i]];
      const flagIds = Object.keys(m.flags);
      res.flagsTotal += flagIds.length;
      const found = new Set();
      let decided = false;
      let falseHere = 0;

      progress.textContent = `${i + 1} / ${ids.length}`;
      queueItems.forEach((q, k) => q.classList.toggle('current', k === i));
      center.innerHTML = '';
      side.innerHTML = '';

      const bubble = el('div', { class: `bubble ch-${m.channel === 'Почта' ? 'mail' : 'msg'}` });
      const segEls = {};
      for (const [text, flagId] of m.segments) {
        const seg = el('span', { class: 'seg', role: 'button', tabindex: '0' }, text);
        if (flagId) segEls[flagId] = seg;
        const act = () => onSeg(seg, flagId);
        seg.addEventListener('click', act);
        seg.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            act();
          }
        });
        bubble.append(seg);
      }
      const stamp = el('div', { class: 'stamp' });
      const timerBar = el('div', { class: 'msg-timer' }, el('i'));
      const tip = el('div', { class: 'seg-tip' });
      center.append(
        el(
          'div',
          { class: 'phone-mock' },
          el('div', { class: 'pm-notch' }),
          el(
            'div',
            { class: 'pm-head' },
            el('div', { class: 'pm-ava' }, m.sender.slice(0, 1)),
            el('div', {}, el('b', {}, m.sender), el('small', {}, m.senderSub)),
            el('span', { class: 'pm-time' }, m.time),
          ),
          el('div', { class: 'pm-channel' }, m.channel),
          bubble,
          cfg.msgTime ? timerBar : null,
          stamp,
        ),
        tip,
      );
      // Первое сообщение: подсвечиваем первую улику, чтобы показать механику без слов
      if (i === 0 && flagIds.length) segEls[flagIds[0]].classList.add('hint');

      const counter = el('span', { class: 'ev-count' }, '0');
      const list = el('div', { class: 'ev-list' }, el('div', { class: 'ev-empty' }, '👆 Тапни на подозрительную фразу'));
      const hintBtn = el('button', { class: 'btn ghost small', onClick: useHint }, `💡 ${hintsLeft}`);
      if (hintsLeft <= 0 || !flagIds.length) hintBtn.disabled = true;
      const fraudBtn = el('button', { class: 'btn danger', onClick: () => decide(true), disabled: true }, el('span', {}, '🛑 Фишинг'), el('small', {}, 'нужна улика'));
      const safeBtn = el('button', { class: 'btn safe', onClick: () => decide(false) }, '✅ Настоящее');
      const verdictBox = el('div', { class: 'verdict' }, fraudBtn, safeBtn);
      const result = el('div', { class: 'result' });
      side.append(el('div', { class: 'side-head' }, el('h3', {}, 'Улики ', counter), cfg.hints ? hintBtn : null), list, verdictBox, result);

      function onSeg(seg, flagId) {
        if (decided) return;
        if (flagId) {
          if (found.has(flagId)) return;
          found.add(flagId);
          res.flagsFound++;
          seg.classList.add('found');
          seg.classList.remove('hint');
          seg.dataset.n = found.size;
          audio.pin();
          score(10);
          counter.textContent = String(found.size);
          addEvidence(m.flags[flagId], found.size);
          fraudBtn.disabled = false;
          fraudBtn.querySelector('small')?.remove();
          tip.classList.remove('show');
        } else {
          seg.classList.remove('nope');
          void seg.offsetWidth;
          seg.classList.add('nope');
          audio.wrong();
          tip.textContent = m.fraud ? '🙂 Тут всё обычно' : '🙂 Тут всё в порядке';
          tip.classList.add('show');
          falseHere++;
          if (falseHere <= 3) {
            res.falseAlarms++;
            score(-5);
          }
        }
      }

      function addEvidence(flag, n) {
        list.querySelector('.ev-empty')?.remove();
        const k = flag.k ? KNOWLEDGE[flag.k] : null;
        const body = el('div', { class: 'ev-body' }, el('b', {}, `${k ? `${k.icon} ` : '❗ '}${flag.short}`));
        if (flag.link) {
          const url = el('div', { class: 'url-check' });
          for (const [part, bad] of flag.link) url.append(el('span', { class: bad ? 'bad' : '', title: bad || '' }, part));
          const notes = flag.link.filter(([, bad]) => bad).map(([part, bad]) => el('span', { class: 'url-note' }, `${part.trim()} — ${bad}`));
          body.append(url, el('div', { class: 'url-notes' }, notes));
        }
        if (k && learn(flag.k)) body.append(el('span', { class: 'learned' }, `+ ${k.icon} ${k.title}`));
        list.append(el('div', { class: 'ev-item' }, el('span', { class: 'ev-n' }, String(n)), body));
        list.scrollTop = list.scrollHeight;
      }

      function useHint() {
        const left = flagIds.filter((f) => !found.has(f));
        if (!left.length || hintsLeft <= 0 || decided) return;
        hintsLeft--;
        audio.click();
        segEls[left[0]].classList.add('hint');
        hintBtn.textContent = `💡 ${hintsLeft}`;
        if (hintsLeft <= 0) hintBtn.disabled = true;
      }

      async function decide(saysFraud, timedOut = false) {
        if (decided) return;
        decided = true;
        stopTimer();
        fraudBtn.disabled = safeBtn.disabled = hintBtn.disabled = true;
        tip.classList.remove('show');
        const ok = !timedOut && saysFraud === m.fraud;
        for (const f of flagIds) if (!found.has(f)) segEls[f].classList.add('missed');

        stamp.textContent = timedOut ? '⏱ ВРЕМЯ' : ok ? (m.fraud ? 'ФИШИНГ' : 'ЧИСТО') : 'ОШИБКА';
        stamp.className = `stamp show ${ok ? (m.fraud ? 'red' : 'green') : 'amber'}`;
        audio.stamp();
        queueItems[i].classList.add(ok ? 'ok' : 'bad');

        if (ok) {
          res.correct++;
          score(50);
          setTimeout(() => audio.success(), 180);
          if (m.fraud) {
            res.clients += m.reach;
            ctx.addClients(m.reach);
            ctx.world.state.stopped += 1;
            result.append(el('div', { class: 'res-big good' }, `🛡 +${num(m.reach)} клиентов защищено`));
          } else {
            result.append(el('div', { class: 'res-big good' }, '✅ Верно, это настоящее'));
            if (m.k && learn(m.k)) result.append(el('span', { class: 'learned' }, `+ ${KNOWLEDGE[m.k].icon} ${KNOWLEDGE[m.k].title}`));
          }
        } else {
          setTimeout(() => audio.fail(), 180);
          flash('red');
          result.append(el('div', { class: 'res-big bad' }, timedOut ? '⏱ Не успели — рассылка ушла' : m.fraud ? '💸 Это был фишинг' : '😕 Это было настоящее'));
        }
        result.append(el('p', {}, m.verdict));
        const last = i === ids.length - 1;
        const next = el(
          'button',
          {
            class: 'btn primary',
            onClick: () => {
              audio.click();
              if (last) finish();
              else showMessage(i + 1);
            },
          },
          last ? 'Готово ✓' : 'Дальше →',
        );
        result.append(next);
        result.classList.add('show');
        await sleep(50);
        next.focus({ preventScroll: true });
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      if (cfg.msgTime) {
        let left = cfg.msgTime;
        let last = performance.now();
        const fill = timerBar.firstChild;
        const tick = (now) => {
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          if (!ctx.isPaused()) left -= dt;
          fill.style.transform = `scaleX(${Math.max(0, left / cfg.msgTime)})`;
          timerBar.classList.toggle('low', left < 8);
          if (left <= 0) decide(false, true);
          else rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      }
    }

    function finish() {
      stopTimer();
      clearInterval(liveTimer);
      const acc = res.correct / res.total;
      const flagRate = res.flagsTotal ? res.flagsFound / res.flagsTotal : 1;
      res.stars = acc === 1 && flagRate >= 0.7 ? 3 : acc >= 0.75 ? 2 : 1;
      res.stats = [
        ['⚖️', `${res.correct}/${res.total}`, 'верных вердиктов'],
        ['🔍', `${res.flagsFound}/${res.flagsTotal}`, 'улик найдено'],
        ['🛡', num(res.clients), 'клиентов защищено'],
      ];
      // Финал смены: атака отбита
      const all = res.correct === res.total;
      const big = el('div', { class: 'rs-big' }, '0');
      const btn = el('button', { class: 'btn primary big' }, '🔕 Отбой тревоги');
      panel.append(
        el(
          'div',
          { class: 'ph-finale' },
          el(
            'div',
            { class: `rescue${all ? '' : ' bad'}` },
            el('div', { class: 'rs-title' }, all ? '🛡 АТАКА ОТБИТА' : '⚠ АТАКА ОСТАНОВЛЕНА НЕ ПОЛНОСТЬЮ'),
            big,
            el('p', {}, 'клиентов не получили мошеннические сообщения'),
            el('p', { class: 'muted small' }, `Рассылка успела уйти на ${num(sent)} номеров. Одно СМС дошло до Валентины Петровны, 72 года, — запомни это имя: мошенники от неё не отстанут.`),
            btn,
          ),
        ),
      );
      animateNumber(big, 0, res.clients, 1500, num);
      flash(all ? 'green' : 'red');
      all ? audio.bigWin() : audio.success();
      btn.focus({ preventScroll: true });
      btn.addEventListener('click', () => {
        audio.click();
        resolve(res);
      });
    }

    showMessage(0);
    setTimeout(() => tour('phishing'), 500);
  });
}
