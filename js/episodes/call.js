// Смена 4. «Безопасный счёт»: проверки по делу и живой разговор с клиенткой.
// Время измеряется ходами, а не секундами: пока игрок читает, ничего не тикает.
import { CALL, CLIENT, EVIDENCE, KNOWLEDGE, SIGNALS } from '../data/chapter1.js';
import { el, openPanel, closePanel, termBar, sleep, money, typeText, skipTyping, flash, VOICE } from '../ui.js';
import { portrait } from '../portraits.js';

const TAGS = {
  calm: { icon: '🤝', label: 'Поддержка' },
  logic: { icon: '💡', label: 'Довод' },
  evidence: { icon: '🔍', label: 'Улика' },
  pressure: { icon: '⚡', label: 'Напор' },
};
const PANIC = 75;
const MIN_TURNS = 6; // столько ходов нужно на сам разговор

const clamp = (v) => Math.max(0, Math.min(100, v));

export function runCall(ctx) {
  const { audio } = ctx;
  const cfg = ctx.diff.s4;
  // Сквозной сюжет: если у окна кассы её уже спасали, она узнаёт голос и доверяет больше
  const metAtTeller = ctx.state.story?.gran === 'saved';
  const st = { turns: cfg.turns, trust: cfg.trust + (metAtTeller ? 15 : 0), fear: 60, ended: false, evidence: new Set(ctx.state.evidence || []), learned: [] };
  const pipBoxes = [];

  const learn = (k) => {
    if (k && ctx.learn(k)) {
      st.learned.push(k);
      return true;
    }
    return false;
  };

  function renderTurns() {
    for (const box of pipBoxes) {
      box.innerHTML = '';
      for (let i = 0; i < cfg.turns; i++) box.append(el('i', { class: i < st.turns ? 'on' : '' }));
      box.classList.toggle('low', st.turns <= 2);
    }
  }

  function spend(n = 1) {
    st.turns = Math.max(0, st.turns - n);
    renderTurns();
  }

  const turnsEl = () => {
    const box = el('div', { class: 'pips' });
    pipBoxes.push(box);
    return el('div', { class: 'turns' }, el('span', {}, '⏳ Ходы'), box);
  };

  return new Promise((resolve) => {
    const finish = (result) => {
      audio.heartbeat(0);
      resolve(result);
    };

    // ─────────────── Фаза А: карточка дела и проверки ───────────────
    function phaseCase() {
      const panel = openPanel('ep2');
      panel.append(termBar('Дело №0412 · перевод приостановлен', ctx, turnsEl()));
      renderTurns();

      const r = ctx.state.rule;
      const caughtByRule = r && CLIENT.sig.filter((s) => r.signals.includes(s)).length >= r.threshold;
      const ruleBanner = caughtByRule
        ? el('div', { class: 'rule-hit' }, el('b', {}, '⚙️ Сработало твоё правило'), el('span', {}, r.signals.map((s) => SIGNALS[s].icon).join(' ')))
        : el('div', { class: 'rule-hit base' }, el('b', {}, '⚙️ Сработала модель банка'));

      const riskNum = el('b', {}, '0%');
      const riskBar = el('i');
      const main = el(
        'div',
        { class: 'case-main' },
        ruleBanner,
        metAtTeller ? el('div', { class: 'rule-hit met' }, el('b', {}, '🧾 Она тебя знает'), el('span', {}, 'Вы встречались у окна кассы · доверие +15')) : null,
        el('div', { class: 'risk' }, el('span', {}, 'РИСК'), riskNum, el('div', { class: 'risk-bar' }, riskBar)),
        el('div', { class: 'client' }, el('div', { class: 'client-ava', html: portrait('gran', 'worried') }), el('div', {}, el('b', {}, CLIENT.short), el('span', {}, `${CLIENT.age} года · клиентка 31 год`))),
        el('div', { class: 'op' }, el('b', { class: 'amount' }, money(CLIENT.amount)), el('span', {}, `→ ${CLIENT.recipient} ${CLIENT.card}`)),
        el('div', { class: 'sig-row' }, el('span', {}, '⚠ 💰 ×12'), el('span', {}, '⚠ 👤 новый'), el('span', {}, '⚠ 📞 38 мин на линии')),
      );

      const checks = el('div', { class: 'checks' });
      const found = el('div', { class: 'found-ev' });
      const callBtn = el('button', { class: 'btn primary big call-btn', onClick: () => startCall() }, '📞 Позвонить клиентке');
      const side = el('div', { class: 'case-side' }, el('h3', {}, '🔍 Проверки ', el('small', { class: 'muted' }, '1 проверка = 1 ход')), checks, found, callBtn);
      panel.append(el('div', { class: 'case-grid' }, main, side));

      const addFound = (id) => {
        const ev = EVIDENCE[id];
        found.append(el('div', { class: 'ev-card' }, el('span', { class: 'ev-ico' }, ev.icon), el('div', {}, el('b', {}, ev.action), el('span', {}, ev.result))));
      };
      const refreshChecks = () => {
        checks.querySelectorAll('.check').forEach((b) => {
          if (!st.evidence.has(b.dataset.id)) b.disabled = st.turns - 1 < MIN_TURNS;
        });
      };
      for (const [id, ev] of Object.entries(EVIDENCE)) {
        const b = el('button', { class: 'check', 'data-id': id }, el('span', {}, `${ev.icon} ${ev.action}`), el('small', {}, '−1 ход'));
        if (st.evidence.has(id)) b.disabled = true;
        b.addEventListener('click', async () => {
          if (st.evidence.has(id) || st.turns - 1 < MIN_TURNS) return;
          audio.click();
          b.disabled = true;
          b.classList.add('loading');
          spend(1);
          await sleep(500);
          b.classList.remove('loading');
          st.evidence.add(id);
          ctx.state.evidence = [...st.evidence];
          audio.pin();
          addFound(id);
          refreshChecks();
        });
        checks.append(b);
      }
      for (const id of st.evidence) addFound(id);
      refreshChecks();

      const t0 = performance.now();
      const anim = (now) => {
        const k = Math.min(1, (now - t0) / 1200);
        const v = Math.round(94 * (1 - Math.pow(1 - k, 3)));
        riskNum.textContent = `${v}%`;
        riskBar.style.transform = `scaleX(${v / 100})`;
        if (k < 1) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      audio.alarm(false);
    }

    async function startCall() {
      audio.click();
      closePanel();
      await ctx.focus('phone');
      ctx.world.setPhone('call', 'Валентина П.');
      audio.ringback(true);
      await sleep(2200);
      audio.ringback(false);
      audio.pickup();
      phaseCall();
    }

    // ─────────────── Фаза Б: разговор ───────────────
    function phaseCall() {
      const panel = openPanel('ep2 call');
      const ava = el('div', { class: 'call-ava', html: portrait('gran', 'worried') });
      const trustFill = el('i');
      const fearFill = el('i');
      const trustVal = el('b');
      const fearVal = el('b');
      const second = el('div', { class: 'second-line' }, el('span', { class: 'sl-ava', html: portrait('scammer') }), el('b', {}, '📞 «Майор» на второй линии'));
      const confirm = el('div', { class: 'confirm-screen' }, el('b', {}, money(CLIENT.amount)), el('div', { class: 'confirm-btn' }, 'Подтвердить'));
      const left = el(
        'div',
        { class: 'call-left' },
        ava,
        el('div', { class: 'call-name' }, el('b', {}, CLIENT.short)),
        el('div', { class: 'meter trust' }, el('div', { class: 'meter-head' }, el('span', {}, '💚 Доверие'), trustVal), el('div', { class: 'meter-bar' }, trustFill)),
        el('div', { class: 'meter fear' }, el('div', { class: 'meter-head' }, el('span', {}, '😨 Страх'), fearVal), el('div', { class: 'meter-bar' }, fearFill)),
        turnsEl(),
        second,
        confirm,
      );
      const transcript = el('div', { class: 'transcript', 'aria-live': 'polite' });
      const choicesBox = el('div', { class: 'choices' });
      const right = el('div', { class: 'call-right' }, transcript, choicesBox);
      panel.append(termBar('Звонок клиентке', ctx), el('div', { class: 'call-grid' }, left, right));
      transcript.addEventListener('click', () => skipTyping());
      renderTurns();

      // Переписка всегда прокручена к последней реплике — даже когда блок ответов меняет высоту
      const scrollEnd = () => (transcript.scrollTop = transcript.scrollHeight);
      const ro = new ResizeObserver(scrollEnd);
      ro.observe(transcript);

      function renderMeters() {
        trustFill.style.transform = `scaleX(${st.trust / 100})`;
        fearFill.style.transform = `scaleX(${st.fear / 100})`;
        trustVal.textContent = String(st.trust);
        fearVal.textContent = st.fear >= PANIC ? `${st.fear} · паника` : String(st.fear);
        left.classList.toggle('panic', st.fear >= PANIC);
        trustFill.parentElement.classList.toggle('goal', st.trust >= cfg.win);
        audio.heartbeat(st.ended ? 0 : 62 + st.fear * 0.75);
      }
      trustFill.parentElement.style.setProperty('--goal', `${cfg.win}%`);
      fearFill.parentElement.style.setProperty('--panic', `${PANIC}%`);
      renderMeters();

      function delta(meter, d) {
        if (!d) return;
        const node = el('span', { class: `delta ${d > 0 ? 'up' : 'down'}` }, `${d > 0 ? '+' : ''}${d}`);
        meter.querySelector('.meter-head').append(node);
        setTimeout(() => node.remove(), 1500);
      }

      async function say(line) {
        if (line.who === 'sys') {
          transcript.append(el('div', { class: 'line sys' }, line.text));
          scrollEnd();
          await sleep(500);
          return;
        }
        if (line.emo) ava.innerHTML = portrait('gran', line.emo);
        const txt = el('p');
        transcript.append(el('div', { class: 'line gran' }, txt));
        ava.classList.add('speaking');
        await typeText(txt, line.text, { speed: 22, voice: VOICE.gran, onTick: scrollEnd });
        ava.classList.remove('speaking');
        scrollEnd();
        await sleep(200);
      }

      function sayMe(text) {
        transcript.append(el('div', { class: 'line me' }, el('p', {}, text)));
        scrollEnd();
      }

      function chip(text, kind = 'lesson') {
        transcript.append(el('div', { class: `line ${kind}` }, text));
        scrollEnd();
      }

      function choose(choices) {
        choicesBox.innerHTML = '';
        return new Promise((res) => {
          for (const ch of choices) {
            const tag = TAGS[ch.tag];
            const text = ch.text.replace('{name}', ctx.state.nickname);
            let locked = null;
            let need = null;
            if (ch.k) {
              const k = KNOWLEDGE[ch.k];
              if (ctx.state.knowledge.includes(ch.k)) need = `${k.icon} ${k.title}`;
              else locked = `нужно знание ${k.icon} ${k.title}`;
            }
            if (ch.ev) {
              const ev = EVIDENCE[ch.ev];
              if (st.evidence.has(ch.ev)) need = `${ev.icon} ${ev.action}`;
              else locked = `нужна проверка ${ev.icon} ${ev.action}`;
            }
            const weak = !locked && (ch.tag === 'logic' || ch.tag === 'evidence') && st.fear >= PANIC && ch.trust > 0;
            const b = el(
              'button',
              { class: `choice ${ch.tag}${locked ? ' locked' : ''}` },
              el('span', { class: `tag ${ch.tag}` }, `${tag.icon} ${tag.label}`),
              need ? el('span', { class: 'need' }, need) : null,
              weak ? el('span', { class: 'weak', title: 'Она в панике — доводы слышит вполуха' }, '½ паника') : null,
              el('span', { class: 'choice-text' }, locked ? `🔒 ${locked}` : text),
            );
            if (locked) b.disabled = true;
            else
              b.addEventListener('click', () => {
                audio.click();
                choicesBox.innerHTML = '';
                res({ ...ch, text });
              });
            choicesBox.append(b);
          }
          scrollEnd();
        });
      }

      async function run() {
        await say({ who: 'sys', text: '📞 Гудки… щелчок' });
        let id = CALL.start;
        while (id !== 'final') {
          const node = CALL.nodes[id];

          if (node.type === 'hold') {
            for (const l of node.lines) await say(l);
            second.classList.add('show');
            const hold = el('div', { class: 'line hold' }, '⏸ Удержание…');
            transcript.append(hold);
            scrollEnd();
            audio.heartbeat(0);
            audio.holdMusic(node.holdMs);
            await sleep(node.holdMs);
            hold.remove();
            second.classList.remove('show');
            st.fear = clamp(st.fear + node.fear);
            delta(left.querySelector('.fear'), node.fear);
            renderMeters();
            flash('red');
            for (const l of node.after) await say(l);
            id = node.next;
            continue;
          }

          if (node.type === 'chat') {
            const chat = el('div', { class: 'mini-chat' }, el('div', { class: 'mc-head' }, el('span', { class: 'mc-ava', html: portrait('masha', 'happy') }), '💬 пишет внучке'));
            transcript.append(chat);
            for (const m of node.chat) {
              const msg = el('div', { class: `mc-msg ${m.from} typing` }, '…');
              chat.append(msg);
              scrollEnd();
              await sleep(m.from === 'masha' ? 1200 : 700);
              msg.classList.remove('typing');
              msg.textContent = m.text;
              audio.notify();
              scrollEnd();
              await sleep(350);
            }
            st.trust = clamp(st.trust + node.trust);
            st.fear = clamp(st.fear + node.fear);
            delta(left.querySelector('.trust'), node.trust);
            delta(left.querySelector('.fear'), node.fear);
            renderMeters();
            for (const l of node.after) await say(l);
            id = node.next;
            continue;
          }

          if (node.second) second.classList.add('show');
          for (const l of node.lines) await say(l);
          if (node.confirmScreen) confirm.classList.add('show');
          if (st.turns <= 0) return end('time');
          const ch = await choose(node.choices);
          second.classList.remove('show');
          sayMe(ch.text);
          spend(1);

          let dTrust = ch.trust;
          if ((ch.tag === 'logic' || ch.tag === 'evidence') && st.fear >= PANIC && dTrust > 0) {
            dTrust = Math.round(dTrust / 2);
            chip('😨 В панике доводы слышны вполуха — сначала успокой', 'note');
            learn('k_calm');
          }
          st.trust = clamp(st.trust + dTrust);
          st.fear = clamp(st.fear + ch.fear);
          delta(left.querySelector('.trust'), dTrust);
          delta(left.querySelector('.fear'), ch.fear);
          renderMeters();
          if (dTrust < 0) audio.wrong();
          else audio.coin();

          if (st.trust <= 0) return end('trust');
          if (ch.reply) await say({ who: 'gran', ...ch.reply });
          if (ch.lesson) {
            const k = KNOWLEDGE[ch.lesson];
            learn(ch.lesson);
            chip(`💡 ${k.icon} ${k.title}: ${k.text}`);
          }
          id = ch.next;
        }
        return end(st.trust >= cfg.win ? 'win' : 'final');
      }

      async function end(reason) {
        if (st.ended) return;
        st.ended = true;
        choicesBox.innerHTML = '';
        audio.heartbeat(0);
        const won = reason === 'win';
        const lines = won ? CALL.win : reason === 'trust' ? CALL.loseTrust : reason === 'time' ? CALL.loseTime : CALL.loseFinal;
        confirm.classList.add('show');
        for (const l of lines) await say(l);
        confirm.classList.add(won ? 'cancelled' : 'done');
        confirm.querySelector('.confirm-btn').textContent = won ? '✓ Отменён' : '✗ Отправлен';
        audio.hangup();
        ctx.world.setPhone('off');
        learn('k_calm');
        ro.disconnect();

        const box = el('div', { class: `call-result ${won ? 'won' : 'lost'}` });
        if (won) {
          audio.bigWin();
          flash('green');
          box.append(
            el('h2', {}, `🎉 ${money(CLIENT.amount)} спасены`),
            el('div', { class: 'res-stats' }, el('span', {}, `💚 доверие ${st.trust}`), el('span', {}, `⏳ ходов осталось ${st.turns}`)),
            el('button', { class: 'btn primary', onClick: () => done(true, false) }, 'Положить трубку'),
          );
        } else {
          audio.fail();
          flash('red');
          const why = { trust: '💔 Она перестала верить', time: '⏳ Ходы закончились', final: '😨 Страх оказался сильнее' }[reason];
          box.append(
            el('h2', {}, `💸 ${money(CLIENT.amount)} ушли мошенникам`),
            el('p', {}, `${why}. Сначала успокой → потом объясняй.`),
            el(
              'div',
              { class: 'irina-note' },
              el('span', { class: 'mini-ava', html: portrait('irina', 'worried') }),
              el('p', {}, 'Деньги ещё можно догнать по цепочке!'),
            ),
            el(
              'div',
              { class: 'row' },
              el('button', { class: 'btn ghost', onClick: () => done(false, true) }, '↺ Ещё раз'),
              el('button', { class: 'btn primary', onClick: () => done(false, false) }, 'Догнать деньги →'),
            ),
          );
        }
        right.append(box);
        right.classList.add('ended');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function done(won, retry) {
        audio.click();
        const score = won ? 500 + st.trust * 2 + st.turns * 20 : 50;
        ctx.addScore(score);
        if (won) {
          ctx.addMoney(CLIENT.amount);
          ctx.world.state.stopped += 1;
        }
        finish({
          won,
          retry,
          score,
          stars: won ? (st.trust >= 80 ? 3 : 2) : 1,
          learned: st.learned,
          stats: [
            [won ? '🎉' : '💸', won ? 'спасены' : 'потеряны', money(CLIENT.amount)],
            ['💚', String(st.trust), 'доверие клиентки'],
            ['🔍', `${st.evidence.size}/3`, 'проверок сделано'],
          ],
        });
      }

      run();
    }

    phaseCase();
  });
}
