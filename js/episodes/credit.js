// Кредитный эксперт: проверка документов, собеседование, расчёт нагрузки и решение.
// Результат решения виден не сразу — только «месяц спустя» на календаре.
import { CREDIT_SHIFTS, TERMS, payment } from '../data/credit.js';
import { KNOWLEDGE } from '../data/professions.js';
import { el, openPanel, termBar, sleep, money, flash, animateNumber } from '../ui.js';
import { setBeat } from '../story.js';
import { person } from '../portraits.js';
import { runDialog } from './dialog.js';

const LIGHT = (load) => (load <= 0.334 ? 'green' : load <= 0.5 ? 'yellow' : 'red');
const LIGHT_TEXT = { green: '🟢 посильно', yellow: '🟡 тяжело', red: '🔴 непосильно' };

function evaluate(c, d) {
  if (c.truth === 'fraud') return d.type === 'approve' ? { color: 'red', text: c.red, good: false } : { color: 'green', text: c.refused, good: true };
  if (c.truth === 'victim') {
    if (d.type === 'approve') return { color: 'red', text: c.red, good: false };
    return d.talked ? { color: 'green', text: c.saved, good: true } : { color: 'yellow', text: c.yellow, good: false };
  }
  if (c.truth === 'nobiz') return d.type === 'approve' ? { color: 'red', text: c.red, good: false } : { color: 'green', text: c.refused, good: true };
  if (d.type === 'refuse') return c.refuseOk ? { color: 'green', text: c.refused, good: true } : { color: 'grey', text: c.missed, good: false, missed: true };
  if (c.collateral && d.amount > c.collateral) return { color: 'red', text: c.red, good: false };
  const p = payment(d.amount, d.term) * (d.insurance ? 1.03 : 1);
  const color = LIGHT((p + c.debts) / c.income);
  if (color === 'green' && c.event) return d.insurance ? { color: 'green', text: c.insured, good: true, event: c.event } : { color: 'yellow', text: c.yellow, good: false, event: c.event };
  if (color === 'green') return { color, text: c.green || (d.amount < c.amount ? 'Взял меньше — платит спокойно, без просрочек ✅' : 'Платит вовремя ✅'), good: true };
  if (color === 'yellow') return { color, text: c.yellow || 'Платёж тяжёлый — бывают просрочки', good: false };
  return { color, text: c.red || 'Платёж непосильный — долговая яма 🕳', good: false };
}

export function runCredit(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const easy = diff === 'easy';
  const hard = diff === 'hard';
  const data = CREDIT_SHIFTS[shift.n];
  const clients = data.clients;
  const decisions = [];
  const learned = [];
  const learn = (k) => {
    if (ctx.learn(k)) learned.push(k);
  };

  return new Promise((resolve) => {
    const panel = openPanel('credit');
    const prog = el('span', { class: 'term-progress' });
    panel.append(termBar('Кредитный отдел', ctx, prog));
    const left = el('div', { class: 'cr-client' });
    const stepEl = el('div', { class: 'cr-step' });
    const center = el('div', { class: 'cr-center' }, stepEl);
    const right = el('div', { class: 'cr-calc' });
    panel.append(el('div', { class: 'cr-grid' }, left, center, right));

    function serve(c, idx) {
      return new Promise((done) => {
        prog.textContent = `📝 Заявка ${idx + 1}/${clients.length}`;
        left.innerHTML = '';
        center.querySelectorAll(':scope > :not(.cr-step)').forEach((n) => n.remove());
        right.innerHTML = '';
        stepEl.innerHTML = '';
        stepEl.append(el('span', { class: 'r-n' }, '1'), el('b', {}, 'Проверь документы и реши'));
        let income = c.declared || c.income;
        let incomeVerified = !c.declared;
        let talked = false;
        let asked = 0;
        const found = new Set();
        const selected = [];

        // ─── клиент ───
        const ava = el('div', { class: 'cr-ava enter', html: person(c.look, 'neutral') });
        left.append(
          ava,
          el('b', { class: 'tl-name' }, `${c.name}, ${c.age}`),
          el('div', { class: 'cr-request' }, el('span', { class: 'cr-goal' }, c.goalIcon), el('div', {}, el('small', {}, 'Хочет кредит'), el('b', {}, money(c.amount)), el('small', {}, `на ${c.term} мес · ${c.goal}`))),
        );
        const line = typeof c.say === 'function' ? c.say(ctx.state) : c.say;
        if (line) left.append(el('div', { class: 'tl-bubble pop' }, line));
        if (c.friend) left.append(el('div', { class: 'flag warn' }, `👤 Пришёл с другом — ${c.friend}`));
        if (c.coach && c.coach[diff]) left.append(el('div', { class: 'coach' }, c.coach[diff]));
        if (c.climax) {
          audio.startMusic('tension');
          audio.heartbeat(80);
        }
        if (data.scoring) {
          const ok = c.score >= 60;
          left.append(el('div', { class: `robot ${ok ? 'yes' : 'no'}` }, el('span', {}, '🤖'), el('div', {}, el('small', {}, 'Скоринг банка'), el('b', {}, `${c.score}/100 · ${ok ? 'одобрить' : 'отказать'}`))));
        }
        const answers = el('div', { class: 'cr-answers' });
        if (c.questions) {
          const qbox = el('div', { class: 'cr-questions' }, el('small', { class: 'muted' }, '❓ Спроси клиента'));
          for (const [icon, q, who, a, key] of c.questions) {
            const b = el('button', { class: 'q-btn' }, `${icon} ${q}`);
            b.addEventListener('click', () => {
              audio.click();
              b.disabled = true;
              asked++;
              learn('k_c_interview');
              const fromFriend = who === 'friend';
              const ans = el('div', { class: `answer${fromFriend ? ' friend' : ''}` }, el('small', {}, fromFriend ? `👤 ${c.friend} (вместо ${c.nameGen || c.name})` : `🗣 ${c.name}`));
              if (key) {
                const chip = el('button', { class: 'chip fact', 'data-key': key }, a);
                chip.addEventListener('click', () => toggleFact(key, chip));
                ans.append(chip);
              } else ans.append(el('p', {}, a));
              answers.append(ans);
              if (fromFriend) ava.innerHTML = person(c.look, 'worried');
              if (c.truth === 'victim' && !left.querySelector('.talk-btn')) {
                const t = el('button', { class: 'btn ghost talk-btn' }, '🗣 Поговорить наедине');
                t.addEventListener('click', talk);
                left.append(t);
              }
            });
            qbox.append(b);
          }
          left.append(qbox, answers);
        }

        // ─── документы ───
        const tabs = el('div', { class: 'tl-docs' });
        const view = el('div', { class: 'cr-docview' });
        const tools = el('div', { class: 'row' });
        const conflictBtn = el('button', { class: 'btn ghost small', disabled: true }, '⚡ Не сходится');
        const fakeBtn = el('button', { class: 'btn ghost small', disabled: true }, '🖨 Подделка');
        const fb = el('div', { class: 'feedback' });
        const foundList = el('div', { class: 'cr-found' });
        tools.append(conflictBtn, fakeBtn);
        center.append(tabs, view, el('small', { class: 'muted' }, '👆 Отметь два факта, которые не сходятся, — или один подозрительный'), tools, fb, foundList);
        const factEls = {};
        function renderDoc(d, btn) {
          tabs.querySelectorAll('.doc-btn').forEach((x) => x.classList.toggle('on', x === btn));
          view.innerHTML = '';
          const card = el('div', { class: `doc doc-${d.id}` }, el('div', { class: 'doc-title' }, `${d.icon} ${d.title}`));
          if (d.photo) card.append(el('div', { class: 'doc-photo' }, el('div', { class: 'ph', html: person(d.photo, 'neutral') }), el('div', { class: 'ph live', html: person(c.look, 'neutral') }), el('small', {}, 'фото в паспорте · лицо клиента')));
          if (d.id === 'biz' && c.revenue) {
            const max = Math.max(...c.revenue, 1);
            const bars = c.revenue.map((v) => el('i', { style: { height: `${Math.max(3, (v / max) * 100)}%` } }, el('span', {}, v ? String(v) : '0')));
            card.append(el('div', { class: 'rev-chart' }, bars), el('small', {}, 'Выручка по месяцам, тыс. ₽'));
          }
          for (const [label, value, key, flag] of d.rows) {
            const chip = el('button', { class: `chip fact${flag === 'fake' ? ' odd' : ''}${selected.includes(key) ? ' sel' : ''}${found.has(key) ? ' found' : ''}`, 'data-key': key }, value);
            chip.addEventListener('click', () => toggleFact(key, chip));
            factEls[key] = chip;
            card.append(el('div', { class: 'doc-row' }, el('span', {}, label), chip));
          }
          view.append(card);
        }
        c.docs.forEach((d, i) => {
          const b = el('button', { class: 'doc-btn' }, el('span', {}, d.icon), el('b', {}, d.title));
          b.addEventListener('click', () => renderDoc(d, b));
          tabs.append(b);
          if (i === 0) renderDoc(d, b);
        });
        function toggleFact(key, chip) {
          audio.blip(500);
          const i = selected.indexOf(key);
          if (i >= 0) selected.splice(i, 1);
          else {
            selected.push(key);
            if (selected.length > 2) selected.shift();
          }
          document.querySelectorAll('.panel.credit .chip.fact').forEach((x) => x.classList.toggle('sel', selected.includes(x.dataset.key)));
          conflictBtn.disabled = selected.length !== 2;
          fakeBtn.disabled = selected.length !== 1;
        }
        function say(text, kind) {
          fb.innerHTML = '';
          fb.append(el('div', { class: `fb ${kind}` }, text));
        }
        conflictBtn.addEventListener('click', () => {
          const pair = (c.conflicts || []).find(([a, b]) => selected.includes(a) && selected.includes(b));
          if (!pair) {
            audio.wrong();
            say('✓ Эти факты не противоречат друг другу', 'bad');
            return;
          }
          markFound(pair[0], pair[1], `⚡ ${pair[2]}`);
          learn('k_c_docs');
          if (pair[0] === 'sal_doc' || pair[1] === 'sal_doc') {
            income = c.income;
            incomeVerified = true;
            say(`⚡ ${pair[2]}. Считаем по выписке: ${money(c.income)}`, 'good');
            renderCalc();
          }
        });
        fakeBtn.addEventListener('click', () => {
          const key = selected[0];
          const isFake = c.docs.some((d) => d.rows.some((r) => r[2] === key && r[3] === 'fake'));
          if (!isFake) {
            audio.wrong();
            say('✓ Тут ничего подозрительного', 'bad');
            return;
          }
          markFound(key, null, key === 'photo' ? '🪪 Фото в паспорте — другой человек' : '🖨 Печать с ошибкой — справка поддельная');
          learn('k_c_fake');
        });
        function markFound(a, b, text) {
          if (found.has(a) && (!b || found.has(b))) return;
          found.add(a);
          if (b) found.add(b);
          audio.stamp();
          [a, b].filter(Boolean).forEach((k) => document.querySelectorAll(`.panel.credit .chip.fact[data-key="${k}"]`).forEach((x) => x.classList.add('found')));
          foundList.append(el('div', { class: 'cons bad' }, el('span', {}, '🚩'), el('p', {}, text)));
          selected.length = 0;
          conflictBtn.disabled = fakeBtn.disabled = true;
          if (!fb.textContent.startsWith('⚡')) say(text, 'good');
        }

        // ─── калькулятор и решение ───
        let amount = c.amount;
        let term = c.term;
        let insurance = false;
        function renderCalc() {
          right.innerHTML = '';
          const p = Math.round(payment(amount, term) * (insurance ? 1.03 : 1));
          const load = (p + c.debts) / income;
          const color = LIGHT(load);
          const step = c.amount > 500000 ? 50000 : 10000;
          const amountIn = el('input', { type: 'range', min: String(step), max: String(c.amount), step: String(step), value: String(amount) });
          amountIn.addEventListener('input', () => {
            amount = Number(amountIn.value);
            renderCalc();
          });
          const terms = el('div', { class: 'term-btns' }, TERMS.map((t) => {
            const b = el('button', { class: `r-thr-btn${t === term ? ' on' : ''}` }, String(t));
            b.addEventListener('click', () => {
              audio.click();
              term = t;
              renderCalc();
            });
            return b;
          }));
          const add = (...kids) => right.append(...kids.filter(Boolean));
          add(
            el('h4', {}, '🧮 Калькулятор'),
            el('div', { class: 'calc-row' }, el('span', {}, 'Сумма'), el('b', {}, money(amount))),
            amountIn,
            el('div', { class: 'calc-row' }, el('span', {}, 'Срок, мес'), el('b', {}, String(term))),
            terms,
            el('div', { class: 'calc-row big' }, el('span', {}, 'Платёж в месяц'), el('b', {}, money(p))),
            el('div', { class: 'calc-row' }, el('span', {}, c.business ? 'Прибыль бизнеса' : incomeVerified ? 'Доход (проверен)' : 'Доход (по справке)'), el('b', {}, money(income))),
            c.debts ? el('div', { class: 'calc-row' }, el('span', {}, 'Другие кредиты'), el('b', {}, `${money(c.debts)} / мес`)) : null,
            c.collateral ? el('div', { class: `calc-row${amount > c.collateral ? ' warnrow' : ''}` }, el('span', {}, '🚗 Залог стоит'), el('b', {}, money(c.collateral))) : null,
          );
          const loadBox = el('div', { class: `load ${hard ? 'plain' : color}` });
          if (hard) loadBox.append(el('span', {}, `Платежи ${money(p + c.debts)} из дохода ${money(income)}`), el('small', {}, 'Правило: не больше ⅓'));
          else loadBox.append(el('b', {}, `${Math.round(load * 100)}%`), el('span', {}, easy ? LIGHT_TEXT[color] : 'нагрузка'), el('small', {}, 'норма ≤ 33%'));
          right.append(loadBox);
          if (data.insurance) {
            const ins = el('button', { class: `btn ghost small ins${insurance ? ' on' : ''}` }, insurance ? '☂️ Страховка: да (+3%)' : '☂️ Страховка: нет');
            ins.addEventListener('click', () => {
              insurance = !insurance;
              audio.click();
              renderCalc();
            });
            right.append(ins);
          }
          const ok = el('button', { class: 'btn safe big' }, '✅ Одобрить');
          const no = el('button', { class: 'btn danger big' }, '❌ Отказать');
          ok.addEventListener('click', () => decide('approve'));
          no.addEventListener('click', () => decide('refuse'));
          right.append(el('div', { class: 'decide' }, ok, no));
        }
        renderCalc();

        async function talk() {
          audio.click();
          left.querySelector('.talk-btn')?.remove();
          right.innerHTML = '';
          right.append(el('div', { class: 'decided' }, '🗣 Разговор наедине…', el('small', {}, `${c.friend} ждёт в коридоре`)));
          stepEl.innerHTML = '';
          stepEl.append(el('span', { class: 'r-n' }, '🗣'), el('b', {}, 'Поговори с клиентом без друга'));
          const box = el('div', { class: 'cr-talk' });
          center.querySelectorAll(':scope > :not(.cr-step)').forEach((n) => (n.style.display = 'none'));
          center.append(box);
          const r = await runDialog(box, ctx, { name: c.name, look: c.look, script: c.talk, intro: `👤 ${c.friend} вышел в коридор` });
          talked = r.won;
          learn('k_c_victim');
          if (c.climax && c.rescue) await rescue(box, r.won);
          decide('refuse');
        }

        function rescue(box, won) {
          audio.heartbeat(0);
          audio.startMusic('calm');
          box.innerHTML = '';
          const big = el('div', { class: 'rs-big' }, money(0));
          const btn = el('button', { class: 'btn primary big' }, 'Дальше →');
          box.append(
            el(
              'div',
              { class: `rescue${won ? '' : ' bad'}` },
              el('div', { class: 'rs-ava', html: person(c.look, won ? 'cry' : 'worried') }),
              el('div', { class: 'rs-title' }, won ? '🛡 ЧУЖОЙ ДОЛГ НЕ ПОВИС НА МАКСИМЕ' : '😔 МАКСИМ НЕ ПОВЕРИЛ'),
              big,
              el('p', { class: 'rs-quote' }, won ? c.rescue.won : c.rescue.lost),
              el('p', { class: 'muted small' }, won ? c.rescue.wonNote : c.rescue.lostNote),
            ),
            btn,
          );
          animateNumber(big, 0, c.amount, 1400, money);
          if (won) {
            flash('green');
            audio.bigWin();
          } else audio.fail();
          return new Promise((r) => btn.addEventListener('click', () => {
            audio.click();
            r();
          }));
        }

        async function decide(type) {
          audio.click();
          const d = { id: c.id, name: c.name, look: c.look, goalIcon: c.goalIcon, goal: c.goal, type, amount, term, insurance, talked, shift: shift.n };
          const out = evaluate(c, d);
          d.out = out;
          decisions.push(d);
          if (c.climax) {
            audio.heartbeat(0);
            audio.startMusic('calm');
          }
          if (c.story === 'maxim') setBeat(ctx.state, 'maxim', out.good ? 'saved' : 'lost');
          if (c.story === 'artyomCredit') setBeat(ctx.state, 'artyomCredit', out.good ? 'good' : 'bad');
          if (c.story === 'bakery') setBeat(ctx.state, 'bakery', type === 'approve' ? 'good' : 'bad');
          if (type === 'approve' && amount !== c.amount && out.good) learn('k_c_soft');
          if (type === 'approve' && out.good && !c.collateral && !c.business) learn('k_c_load');
          if (c.collateral && out.good) learn('k_c_collateral');
          if (c.business && out.good) learn('k_c_business');
          if (data.scoring && out.good && (c.score >= 60) !== (type === 'approve')) learn('k_c_scoring');
          if (insurance && out.good && c.event) learn('k_c_insurance');
          right.innerHTML = '';
          right.append(el('div', { class: `decided ${type}` }, type === 'approve' ? `✅ Одобрено ${money(amount)} на ${term} мес` : '❌ Отказ', el('small', {}, 'Что будет дальше — узнаем позже 📅')));
          type === 'approve' ? audio.coin() : audio.stamp();
          ava.innerHTML = person(c.look, type === 'approve' ? 'happy' : talked ? 'cry' : 'worried');
          await sleep(1100);
          done();
        }
      });
    }

    (async () => {
      for (let i = 0; i < clients.length; i++) await serve(clients[i], i);
      ctx.prof.data.decisions = decisions;
      ctx.prof.data.learned = learned;
      resolve(null);
    })();
  });
}

// Календарь: месяц (или полгода) спустя — кто платит, а кто нет
export function runMonth(ctx, shift) {
  const { audio } = ctx;
  const decisions = ctx.prof.data.decisions || [];
  const final = shift.n === 5;
  const portfolio = [...(ctx.prof.data.portfolio || []).filter((p) => p.shift !== shift.n), ...decisions];
  const show = final ? portfolio : decisions;
  const learned = [...(ctx.prof.data.learned || [])];
  if (decisions.some((d) => d.out.missed || d.out.color === 'red') && ctx.learn('k_c_both')) learned.push('k_c_both');

  return new Promise((resolve) => {
    const panel = openPanel('credit month');
    panel.append(termBar(final ? 'Портфель за неделю · полгода спустя' : 'Портфель · месяц спустя', ctx));
    const cal = el('div', { class: 'calendar' }, el('div', { class: 'cal-page' }, el('small', {}, 'прошло'), el('b', {}, final ? '6' : '1'), el('span', {}, final ? 'месяцев' : 'месяц')));
    const cards = el('div', { class: 'pf-cards' });
    const report = el('div', { class: 'db-stats' });
    const btn = el('button', { class: 'btn primary big hidden' }, 'Готово');
    panel.append(el('div', { class: 'pf-body' }, cal, cards, report, btn));
    audio.whoosh();
    (async () => {
      await sleep(1200);
      for (const d of show) {
        const o = d.out;
        cards.append(
          el(
            'div',
            { class: `pf-card ${o.color}` },
            el('span', { class: 'pf-ava', html: person(d.look, o.color === 'green' ? 'happy' : o.color === 'red' ? 'cry' : 'worried') }),
            el('div', {}, el('b', {}, `${d.goalIcon} ${d.name}`), el('small', {}, d.type === 'approve' ? `одобрено ${money(d.amount)}` : 'отказ'), o.event ? el('small', { class: 'pf-event' }, `⚡ ${o.event}`) : null, el('p', {}, o.text)),
          ),
        );
        o.color === 'green' ? audio.coin() : o.color === 'red' ? audio.wrong() : audio.blip(400);
        await sleep(final ? 380 : 650);
      }
      const given = show.filter((d) => d.type === 'approve').reduce((s, d) => s + d.amount, 0);
      const goodN = decisions.filter((d) => d.out.good).length;
      const fraudStopped = show.filter((d) => d.out.good && d.type !== 'approve' && /мошенн|чужой|поддел|схем/.test(d.out.text)).length;
      report.append(
        el('div', {}, el('span', { class: 'db-ico' }, '💰'), el('b', {}, money(given)), el('small', {}, 'выдано кредитов')),
        el('div', {}, el('span', { class: 'db-ico' }, '✅'), el('b', {}, `${goodN}/${decisions.length}`), el('small', {}, 'верных решений за смену')),
        el('div', {}, el('span', { class: 'db-ico' }, '🛡'), el('b', {}, String(fraudStopped)), el('small', {}, 'схем остановлено')),
      );
      btn.classList.remove('hidden');
      goodN === decisions.length ? audio.bigWin() : audio.success();
      if (goodN === decisions.length) flash('green');
    })();
    btn.addEventListener('click', () => {
      audio.click();
      const goodN = decisions.filter((d) => d.out.good).length;
      const stars = goodN === decisions.length ? 3 : goodN >= decisions.length - 1 ? 2 : 1;
      const score = goodN * 150;
      ctx.addScore(score);
      ctx.prof.data.portfolio = portfolio;
      ctx.prof.data.decisions = [];
      resolve({
        stars,
        score,
        learned: [...new Set(learned)].filter((k) => KNOWLEDGE[k]),
        consequencesTitle: final ? 'Полгода спустя…' : 'Месяц спустя…',
        consequences: decisions.map((d) => ({ icon: { green: '🟢', yellow: '🟡', red: '🔴', grey: '⚪' }[d.out.color], text: `${d.name}: ${d.out.text}`, kind: d.out.good ? 'good' : d.out.color === 'red' ? 'bad' : 'warn' })),
        stats: [
          ['✅', `${goodN}/${decisions.length}`, 'верных решений'],
          ['🟢', String(decisions.filter((d) => d.out.color === 'green').length), 'довольных заёмщиков'],
          ['🔴', String(decisions.filter((d) => d.out.color === 'red').length), 'в долговой яме'],
        ],
      });
    });
  });
}
