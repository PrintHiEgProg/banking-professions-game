// Операционист банка: клиент у окна → понять запрос → документы → деньги → вежливо попрощаться.
// Ошибки не наказываются сразу: они возвращаются «через пару дней» в разборе смены.
import { TELLER_SHIFTS, OPS, PRODUCTS, PROBLEMS, RATES, SAFE_DIALOG, GRANDSON_DIALOG } from '../data/teller.js';
import { KNOWLEDGE } from '../data/professions.js';
import { el, openPanel, termBar, sleep, money, num, flash, animateNumber, tour } from '../ui.js';
import { setBeat } from '../story.js';
import { person } from '../portraits.js';
import { runDialog } from './dialog.js';

const TUNE = {
  easy: { decay: 4.5, hints: true, showChange: true, fxCalc: true },
  normal: { decay: 3, hints: false, showChange: true, fxCalc: true },
  hard: { decay: 1.8, hints: false, showChange: false, fxCalc: false },
};
const DENOMS = [5000, 1000, 500, 100, 50, 10];

function noteEl(v, extra = {}) {
  return el('button', { class: `note n${v}${extra.cls ? ` ${extra.cls}` : ''}`, ...extra.attrs }, el('b', {}, num(v)), el('i', { class: 'uv-mark' }));
}

export function runTeller(ctx, shift) {
  const { audio } = ctx;
  const diff = ctx.state.difficulty;
  const tune = TUNE[diff] || TUNE.normal;
  const data = TELLER_SHIFTS[shift.n];
  const clients = data.clients.filter((c) => !(c.hard && diff !== 'hard') && !(c.easy === false && diff === 'easy'));
  const res = { served: 0, mistakes: 0, moodSum: 0, cons: [], learned: [], good: 0 };
  const learn = (k) => {
    if (ctx.learn(k)) res.learned.push(k);
  };
  const cons = (icon, text, kind = 'bad') => res.cons.push({ icon, text, kind });
  const mistake = () => res.mistakes++;

  return new Promise((resolve) => {
    const panel = openPanel('teller');
    const queueEl = el('span', { class: 'term-progress' });
    panel.append(termBar('Окно №3 · операционист', ctx, queueEl));

    const ava = el('div', { class: 'tl-ava' });
    const nameEl = el('b', { class: 'tl-name' });
    const moodFill = el('i');
    const moodIco = el('span', {}, '😊');
    const bubble = el('div', { class: 'tl-bubble' });
    const flags = el('div', { class: 'tl-flags' });
    const left = el('div', { class: 'tl-client' }, ava, nameEl, el('div', { class: 'tl-mood' }, moodIco, el('div', { class: 'meter-bar' }, moodFill)), bubble, flags);
    const stageTitle = el('div', { class: 'tl-step' });
    const work = el('div', { class: 'tl-work' });
    const deskList = el('div', { class: 'tl-docs' });
    const docView = el('div', { class: 'tl-docview' });
    const right = el('div', { class: 'tl-desk' }, el('h4', {}, '🗂 На столе'), deskList, docView);
    panel.append(el('div', { class: 'tl-grid' }, left, el('div', { class: 'tl-center' }, stageTitle, work), right));

    let mood = 80;
    let moodTimer = null;
    let cur = null;
    let emoOverride = null;
    function setMood(v) {
      mood = Math.max(0, Math.min(100, v));
      moodFill.style.transform = `scaleX(${mood / 100})`;
      moodFill.parentElement.dataset.level = mood >= 65 ? 'ok' : mood >= 35 ? 'mid' : 'low';
      moodIco.textContent = mood >= 65 ? '😊' : mood >= 35 ? '😐' : '😠';
      if (cur) ava.innerHTML = person(cur.look, emoOverride || (mood >= 65 ? 'happy' : mood >= 35 ? 'neutral' : 'angry'));
    }
    function say(text, kind = '') {
      bubble.textContent = text;
      bubble.className = `tl-bubble ${kind}`;
      void bubble.offsetWidth;
      bubble.classList.add('pop');
      audio.blip(420);
    }
    function step(n, title) {
      stageTitle.innerHTML = '';
      stageTitle.append(el('span', { class: 'r-n' }, String(n)), el('b', {}, title));
      work.innerHTML = '';
    }

    // ─── документы на столе ───
    let docHandler = null;
    let hintKey = null;
    function showDocs(docs) {
      deskList.innerHTML = '';
      docView.innerHTML = '';
      if (!docs || !docs.length) {
        deskList.append(el('p', { class: 'muted small' }, 'Пусто'));
        return;
      }
      docs.forEach((d, i) => {
        const b = el('button', { class: 'doc-btn' }, el('span', {}, d.icon), el('b', {}, d.title));
        b.addEventListener('click', () => openDoc(d, b));
        deskList.append(b);
        if (i === 0) openDoc(d, b);
      });
    }
    function openDoc(d, btn) {
      deskList.querySelectorAll('.doc-btn').forEach((x) => x.classList.toggle('on', x === btn));
      docView.innerHTML = '';
      const card = el('div', { class: `doc ${d.hand ? 'hand' : ''} doc-${d.id}` }, el('div', { class: 'doc-title' }, `${d.icon} ${d.title}`));
      if (d.photo) {
        card.append(el('div', { class: 'doc-photo' }, el('div', { class: 'ph', html: person(d.photo, 'neutral') }), el('div', { class: 'ph live', html: person(cur.look, 'neutral') }), el('small', {}, 'фото в паспорте · лицо клиента')));
      }
      for (const [label, value, key] of d.rows) {
        const chip = el('button', { class: 'chip', 'data-key': key }, value);
        chip.addEventListener('click', () => docHandler && docHandler({ value, key, hand: !!d.hand, chip }));
        if (tune.hints && hintKey && key === hintKey && !d.hand) chip.classList.add('hint');
        card.append(el('div', { class: 'doc-row' }, el('span', {}, label), chip));
      }
      docView.append(card);
    }
    function refreshHints(key) {
      hintKey = key;
      if (!tune.hints) return;
      docView.querySelectorAll('.chip').forEach((c) => c.classList.toggle('hint', c.dataset.key === key && !c.closest('.hand')));
    }

    // ─── этап 1: что хочет клиент ───
    function stageOp(c) {
      step(1, 'Что хочет клиент? Выбери операцию');
      return new Promise((done) => {
        const grid = el('div', { class: 'op-grid' });
        for (const [id, op] of Object.entries(OPS)) {
          const b = el('button', { class: 'op-tile' }, el('span', { class: 'op-ico' }, op.icon), el('b', {}, op.title), el('small', {}, op.sub));
          b.addEventListener('click', () => {
            if (id === c.op) {
              audio.coin();
              learn('k_t_request');
              done();
            } else {
              audio.wrong();
              b.classList.add('wrong');
              b.disabled = true;
              setMood(mood - 10);
              say(c.wrongOp || 'Нет, я про другое…', 'annoyed');
            }
          });
          grid.append(b);
        }
        work.append(grid);
        setTimeout(() => tour('teller'), 450);
      });
    }

    // ─── выбор проблемы ───
    function pickProblem(allowed) {
      return new Promise((done) => {
        const box = el('div', { class: 'problem-box' }, el('b', {}, '⚠ Что не так?'));
        for (const id of allowed) {
          const p = PROBLEMS[id];
          const b = el('button', { class: 'btn ghost' }, `${p.icon} ${p.title}`);
          b.addEventListener('click', () => {
            audio.click();
            box.remove();
            done(id);
          });
          box.append(b);
        }
        const cancel = el('button', { class: 'btn ghost small' }, '↩ Всё в порядке');
        cancel.addEventListener('click', () => {
          box.remove();
          done(null);
        });
        box.append(cancel);
        work.append(box);
      });
    }

    async function falseAlarm() {
      audio.wrong();
      setMood(mood - 15);
      say('Что-то не так? У меня всё в порядке…', 'annoyed');
      mistake();
    }

    // Клиент с проблемой: вежливый отказ или разговор
    async function handleProblem(c) {
      if (c.problem === 'safe') {
        step(3, 'Поговори с клиенткой');
        showDocs([]);
        const script = c.dialog === 'grandson' ? GRANDSON_DIALOG : SAFE_DIALOG;
        const r = await runDialog(work, ctx, { name: c.name, look: c.look, script, intro: '📞 Клиентка держит телефон у уха' });
        if (r.won) {
          cons('💚', `${c.name} положила трубку. ${money(c.sum)} остались у неё`, 'good');
          learn('k_safe');
          setMood(90);
        } else {
          cons('💔', `${c.name} всё-таки перевела ${money(c.sum)} мошенникам`);
          mistake();
          setMood(20);
        }
        if (c.story) setBeat(ctx.state, c.story, r.won ? 'saved' : 'lost');
        if (c.climax) await rescue(c, r.won);
        return;
      }
      step(3, 'Откажи — но вежливо');
      learn(c.problem === 'young' ? 'k_t_age' : 'k_t_passport');
      await new Promise((done) => {
        const [good, bad] = c.polite;
        const opts = [[good, true], [bad, false]].sort(() => (c.name.length % 2 ? 1 : -1));
        for (const [text, ok] of opts) {
          const b = el('button', { class: `choice ${ok ? 'calm' : 'pressure'}` }, el('span', { class: 'choice-text' }, text));
          b.addEventListener('click', () => {
            audio.click();
            if (ok) {
              setMood(mood + 10);
              say(c.problem === 'young' ? 'Ладно… Завтра с мамой приду!' : 'Э-э… я, пожалуй, пойду.', '');
              cons(c.problem === 'young' ? '🧒' : '🪪', c.problem === 'young' ? `${c.name} пришёл с мамой — оформили детскую карту` : 'Мошенник с чужим паспортом ушёл ни с чем', 'good');
            } else {
              setMood(mood - 25);
              say('…', 'annoyed');
              cons('😠', c.problem === 'young' ? 'Мама Тимура пожаловалась: «Нагрубили ребёнку»' : 'Счёт открыли по чужому паспорту — мошенник получил карту');
              mistake();
            }
            done();
          });
          work.append(b);
        }
      });
    }

    // Кульминация: спасли сбережения клиента — или нет
    function rescue(c, won) {
      emoOverride = won ? 'happy' : 'cry';
      setMood(won ? Math.max(mood, 90) : Math.min(mood, 25));
      say(won ? 'Я положила трубку… Спасибо вам!' : 'Он сказал, что так надо…', won ? '' : 'annoyed');
      step(won ? '🛡' : '💔', won ? 'Сбережения спасены' : 'Деньги ушли мошенникам');
      showDocs([]);
      audio.heartbeat(0);
      audio.startMusic('calm');
      const big = el('div', { class: 'rs-big' }, money(0));
      const btn = el('button', { class: 'btn primary big' }, 'Дальше →');
      work.append(
        el(
          'div',
          { class: `rescue${won ? '' : ' bad'}` },
          el('div', { class: 'rs-ava', html: person(c.look, won ? 'cry' : 'worried') }),
          el('div', { class: 'rs-title' }, won ? '🛡 СПАСЕНО ОТ МОШЕННИКОВ' : '💸 УШЛО МОШЕННИКАМ'),
          big,
          el('p', { class: 'rs-quote' }, (won ? c.thanks : c.lostQuote).replace('{name}', ctx.state.nickname)),
          el('p', { class: 'muted small' }, won ? c.wonNote : c.lostNote),
        ),
        btn,
      );
      animateNumber(big, 0, c.sum, 1400, money);
      if (won) {
        flash('green');
        audio.bigWin();
      } else {
        flash('red');
        audio.fail();
      }
      return new Promise((r) => btn.addEventListener('click', () => {
        audio.click();
        r();
      }));
    }

    // ─── этап 2: перенести данные из документов ───
    function stageForm(c) {
      step(2, 'Перенеси данные в программу');
      showDocs(c.docs);
      const values = {};
      let active = 0;
      const slots = c.form.map(([key, label], i) => {
        const slot = el('button', { class: 'slot' }, el('small', {}, label), el('b', {}, '—'));
        slot.addEventListener('click', () => {
          active = i;
          renderActive();
        });
        return slot;
      });
      const okBtn = el('button', { class: 'btn primary', disabled: true }, '✓ Провести');
      const probBtn = el('button', { class: 'btn danger' }, '⚠ Проблема');
      work.append(el('div', { class: 'form' }, slots), el('div', { class: 'row' }, probBtn, okBtn), el('p', { class: 'muted small tip' }, '👉 Выбери поле, потом нажми на нужную строку в документе'));
      setTimeout(() => tour('teller_form'), 350);
      const coach = c.coach && c.coach[diff];
      if (coach) {
        work.append(el('div', { class: 'coach' }, coach));
        probBtn.classList.add('pulse-hint');
      }
      function renderActive() {
        slots.forEach((s, i) => s.classList.toggle('active', i === active));
        refreshHints(c.form[active]?.[0]);
      }
      renderActive();
      return new Promise((done) => {
        docHandler = ({ value, key, hand, chip }) => {
          if (active < 0 || active >= c.form.length) return;
          const [fkey] = c.form[active];
          values[fkey] = { value, key, hand };
          slots[active].querySelector('b').textContent = value;
          slots[active].classList.add('filled');
          chip.classList.add('used');
          audio.pin();
          if (tune.hints && key !== fkey) {
            slots[active].classList.add('shake');
            setTimeout(() => slots[active]?.classList.remove('shake'), 500);
          }
          const nextEmpty = c.form.findIndex(([k]) => !values[k]);
          active = nextEmpty;
          renderActive();
          okBtn.disabled = Object.keys(values).length < c.form.length;
        };
        probBtn.addEventListener('click', async () => {
          audio.click();
          const allowed = c.op === 'transfer' ? ['safe', 'photo'] : c.op === 'open' ? ['photo', 'young'] : ['photo', 'young', 'safe'];
          const id = await pickProblem(allowed);
          if (!id) return;
          if (id === c.problem) {
            docHandler = null;
            done({ problem: id });
          } else falseAlarm();
        });
        okBtn.addEventListener('click', () => {
          docHandler = null;
          done({ values });
        });
      });
    }

    function expectedValue(c, key) {
      if (c.expect && c.expect[key]) return c.expect[key];
      const docs = [...c.docs].sort((a, b) => (a.hand ? 1 : 0) - (b.hand ? 1 : 0));
      for (const d of docs) for (const [, v, k] of d.rows) if (k === key) return v;
      return null;
    }

    function checkForm(c, values) {
      let wrongTypo = null;
      let wrong = 0;
      for (const [key] of c.form) {
        const got = values[key];
        if (!got || got.value !== expectedValue(c, key)) {
          wrong++;
          if (got?.hand) wrongTypo = got.value;
        }
      }
      if (!wrong) {
        audio.success();
        learn(c.op === 'open' ? 'k_t_passport' : 'k_t_req');
        if (c.docs.some((d) => d.hand) && c.op === 'open') learn('k_t_typo');
        return true;
      }
      mistake();
      if (wrongTypo && c.op === 'open') cons('✍️', `${c.name}: карта выпущена на имя «${wrongTypo}» — перевыпуск`, 'warn');
      else cons('🧾', `${c.name}: ошибка в реквизитах — деньги ушли не туда, клиент вернулся 😠`);
      return false;
    }

    // ─── деньги: собрать сумму купюрами ───
    function composer(target, title, showTarget = true) {
      return new Promise((done) => {
        const tray = el('div', { class: 'tray' });
        const sumEl = el('b', {}, '0 ₽');
        let given = [];
        const render = () => {
          tray.innerHTML = '';
          given.forEach((v, i) => {
            const n = noteEl(v);
            n.addEventListener('click', () => {
              given.splice(i, 1);
              render();
            });
            tray.append(n);
          });
          const s = given.reduce((a, b) => a + b, 0);
          sumEl.textContent = money(s);
          sumEl.parentElement.classList.toggle('ok', s === target);
        };
        const denoms = el('div', { class: 'denoms' });
        for (const v of DENOMS) {
          const b = noteEl(v);
          b.addEventListener('click', () => {
            audio.blip(600);
            given.push(v);
            given.sort((a, b2) => b2 - a);
            render();
          });
          denoms.append(b);
        }
        const giveBtn = el('button', { class: 'btn primary' }, '✓ Выдать');
        giveBtn.addEventListener('click', () => done(given.reduce((a, b) => a + b, 0)));
        const reset = el('button', { class: 'btn ghost small' }, '↺');
        reset.addEventListener('click', () => {
          given = [];
          render();
        });
        work.append(
          el('div', { class: 'cash-target' }, el('span', {}, title), showTarget ? el('b', {}, money(target)) : el('b', {}, '?')),
          el('small', { class: 'muted' }, '👇 Нажимай на купюры'),
          denoms,
          el('div', { class: 'tray-row' }, el('span', {}, 'Выдаёшь: ', sumEl), reset),
          tray,
          giveBtn,
        );
        render();
      });
    }

    async function stageChange(c) {
      step(3, 'Прими деньги и выдай сдачу');
      const paid = c.pay.reduce((a, b) => a + b, 0);
      const change = paid - c.due;
      work.append(el('div', { class: 'pay-row' }, el('span', {}, `К оплате: ${money(c.due)}`), el('span', {}, 'Клиент дал:'), el('div', { class: 'notes-inline' }, c.pay.map((v) => noteEl(v)))));
      if (change === 0) {
        await new Promise((r) => work.append(el('button', { class: 'btn primary', onClick: r }, '✓ Без сдачи')));
        return;
      }
      if (!tune.showChange) work.append(el('p', { class: 'muted small' }, `Посчитай сдачу: ${num(paid)} − ${num(c.due)}`));
      const given = await composer(change, 'Сдача:', tune.showChange);
      if (given === change) {
        audio.coin();
        learn('k_t_change');
      } else {
        mistake();
        cons('💵', `Касса не сошлась на ${money(Math.abs(given - change))}: сдача ${money(given)} вместо ${money(change)}`, 'warn');
      }
    }

    // ─── взнос: пересчитать, проверить под УФ-лампой ───
    function stageCount(c) {
      step(2, 'Пересчитай деньги');
      return new Promise((done) => {
        let uv = false;
        const counted = new Set();
        let revealed = false;
        const notesBox = el('div', { class: 'notes-box' });
        const countEl = el('b', {}, '0 ₽');
        const notes = c.notes.map((v, i) => {
          const n = noteEl(v, { cls: c.fake === i ? 'fake' : '' });
          n.addEventListener('click', () => {
            if (uv) {
              if (c.fake === i && !revealed) {
                revealed = true;
                n.classList.add('caught');
                audio.stamp();
                learn('k_t_fake');
                say('Что там? Что-то не так?', 'annoyed');
              } else audio.blip(300);
              return;
            }
            if (counted.has(i)) return;
            counted.add(i);
            n.classList.add('counted');
            audio.blip(700);
            const s = [...counted].reduce((a, k) => a + c.notes[k], 0);
            countEl.textContent = money(s);
            okBtn.disabled = counted.size < c.notes.length;
          });
          notesBox.append(n);
          return n;
        });
        const uvBtn = el('button', { class: 'btn ghost uv-btn', title: 'Под лампой у настоящих купюр светятся защитные волокна' }, '🔦 УФ-лампа');
        const UV_TIP = ['🔦 Под УФ-лампой у настоящей купюры светятся защитные волокна и полоска', '✨ Светится — настоящая. Не светится — подделка: нажми на неё и «⚠ Проблема»'];
        const uvTip = el('small', { class: 'muted uv-tip' }, UV_TIP[0]);
        uvBtn.addEventListener('click', () => {
          uv = !uv;
          audio.click();
          notesBox.classList.toggle('uv', uv);
          uvBtn.classList.toggle('on', uv);
          uvTip.textContent = UV_TIP[uv ? 1 : 0];
          uvTip.classList.toggle('on', uv);
        });
        const okBtn = el('button', { class: 'btn primary', disabled: true }, `✓ Зачислить ${money(c.claim)}`);
        const probBtn = el('button', { class: 'btn danger' }, '⚠ Проблема');
        work.append(
          el('div', { class: 'cash-target' }, el('span', {}, 'Клиент говорит:'), el('b', {}, money(c.claim))),
          el('small', { class: 'muted' }, '👆 Нажми на каждую купюру, чтобы пересчитать'),
          notesBox,
          el('div', { class: 'tray-row' }, el('span', {}, 'Посчитано: ', countEl), uvBtn),
          uvTip,
          el('div', { class: 'row' }, probBtn, okBtn),
        );
        setTimeout(() => tour('teller_cash'), 350);
        probBtn.addEventListener('click', async () => {
          audio.click();
          const id = await pickProblem(['fake', 'count']);
          if (!id) return;
          if (id !== c.problem) return falseAlarm();
          say(c.reply, '');
          if (id === 'fake') {
            notes[c.fake].classList.add('caught');
            learn('k_t_fake');
            step(3, 'Что делать с подделкой?');
            const opts = [['🗂 Изъять и составить акт', true], ['↩ Вернуть клиенту', false], ['🤷 Принять, раз уж принёс', false]];
            for (const [text, ok] of opts) {
              const b = el('button', { class: `choice ${ok ? 'calm' : 'pressure'}` }, el('span', { class: 'choice-text' }, text));
              b.addEventListener('click', () => {
                audio.click();
                if (ok) cons('🔦', 'Подделку изъяли и передали в полицию — её больше никто не получит', 'good');
                else {
                  mistake();
                  cons('💵', text.includes('Вернуть') ? 'Подделку вернули — она снова пошла по магазинам' : 'Фальшивые 5 000 ₽ попали в кассу — недостача');
                }
                done();
              });
              work.append(b);
            }
          } else {
            learn('k_t_count');
            cons('🔢', `Зачислили ${money(c.notes.reduce((a, b) => a + b, 0))} — ровно столько, сколько принесли`, 'good');
            setMood(mood + 5);
            done();
          }
        });
        okBtn.addEventListener('click', () => {
          if (c.problem === 'fake') {
            mistake();
            cons('💵', 'Фальшивые 5 000 ₽ приняли в кассу — недостача');
          } else if (c.problem === 'count') {
            mistake();
            cons('🔢', `Зачислили ${money(c.claim)}, а в кассе меньше — недостача ${money(c.claim - c.notes.reduce((a, b) => a + b, 0))}`);
          } else {
            audio.coin();
            learn('k_t_count');
          }
          done();
        });
      });
    }

    function stageProduct(c) {
      step(3, 'Подбери продукт под цель клиента');
      return new Promise((done) => {
        const grid = el('div', { class: 'op-grid' });
        for (const [id, p] of Object.entries(PRODUCTS)) {
          const b = el('button', { class: 'op-tile' }, el('span', { class: 'op-ico' }, p.icon), el('b', {}, p.title), el('small', {}, p.sub));
          b.addEventListener('click', () => {
            if (id === c.product) {
              audio.success();
              learn('k_t_product');
            } else {
              audio.wrong();
              mistake();
              setMood(mood - 10);
              cons(p.icon, `${c.name}: «${p.title}» не подошла — пришлось переоформлять`, 'warn');
            }
            done();
          });
          grid.append(b);
        }
        work.append(grid);
      });
    }

    async function stageFx(c) {
      step(2, `Клиент продаёт ${c.eur} € банку. Какой курс?`);
      showDocs([{ id: 'passport', icon: '🛂', title: 'Загранпаспорт', rows: [['Name', 'John Smith', 'x'], ['Nationality', 'GBR', 'x']] }]);
      const ok = await new Promise((done) => {
        const board = el('div', { class: 'fx-board' }, el('div', {}, el('span', {}, '€ Банк покупает'), el('b', {}, RATES.buy.toFixed(2))), el('div', {}, el('span', {}, '€ Банк продаёт'), el('b', {}, RATES.sell.toFixed(2))));
        const bBuy = el('button', { class: 'btn safe' }, `По курсу покупки ${RATES.buy.toFixed(2)}`);
        const bSell = el('button', { class: 'btn ghost' }, `По курсу продажи ${RATES.sell.toFixed(2)}`);
        bBuy.addEventListener('click', () => done(true));
        bSell.addEventListener('click', () => done(false));
        work.append(board, el('div', { class: 'row' }, bBuy, bSell));
      });
      if (ok) learn('k_t_fx');
      else {
        mistake();
        cons('💱', `Обменяли по курсу продажи — банк потерял ${money(c.eur * (RATES.sell - RATES.buy))}`, 'warn');
      }
      const rate = ok ? RATES.buy : RATES.sell;
      const total = Math.round(c.eur * rate);
      step(3, 'Сколько рублей выдать?');
      let amount = total;
      if (tune.fxCalc) work.append(el('div', { class: 'cash-target' }, el('span', {}, `${c.eur} × ${rate.toFixed(2)} =`), el('b', {}, money(total))));
      else {
        amount = await new Promise((done) => {
          const opts = [total, Math.round(c.eur * (ok ? RATES.sell : RATES.buy)), c.eur * 100].sort((a, b) => a - b);
          work.append(el('p', {}, `${c.eur} € × ${rate.toFixed(2)} = ?`));
          for (const o of opts) {
            const b = el('button', { class: 'btn ghost' }, money(o));
            b.addEventListener('click', () => done(o));
            work.append(b);
          }
        });
        if (amount !== total) {
          mistake();
          cons('🧮', `Ошибка в расчёте: выдали ${money(amount)} вместо ${money(total)}`, 'warn');
        }
        step(3, 'Выдай рубли');
      }
      const given = await composer(amount, 'Выдать:');
      if (given !== amount) {
        mistake();
        cons('💵', `Выдали ${money(given)} вместо ${money(amount)}`, 'warn');
      } else audio.coin();
    }

    async function stageBlock(c) {
      step(2, 'Найди карту клиентки и заблокируй — быстро!');
      showDocs([{ id: 'passport', icon: '🪪', title: 'Паспорт', rows: [['ФИО', `${c.name} Лебедева`, 'fio'], ['Серия и номер', '60 15 246810', 'pass']] }]);
      const t0 = performance.now();
      await new Promise((done) => {
        const find = el('button', { class: 'btn primary' }, '🔎 Найти клиента по паспорту');
        find.addEventListener('click', () => {
          audio.click();
          find.remove();
          say(c.hint, 'annoyed');
          for (const [last4, sub] of c.cards) {
            const b = el('button', { class: 'card-pick' }, el('b', {}, `💳 ${last4}`), el('small', {}, sub));
            b.addEventListener('click', () => {
              if (last4 !== c.right) {
                audio.wrong();
                b.classList.add('wrong');
                mistake();
                cons('💳', 'Заблокировали не ту карту — пришлось разблокировать', 'warn');
                return;
              }
              audio.stamp();
              b.classList.add('blocked');
              b.append(el('span', { class: 'lock' }, '🔒 ЗАБЛОКИРОВАНА'));
              done();
            });
            work.append(b);
          }
        });
        work.append(find);
      });
      const sec = (performance.now() - t0) / 1000;
      learn('k_t_block');
      if (sec > 25) cons('⏱', `Пока искали карту (${Math.round(sec)} с), с неё успели списать 3 000 ₽`, 'warn');
      else cons('🔒', `Карту заблокировали за ${Math.round(sec)} с — деньги целы`, 'good');
      await sleep(700);
      step(3, 'Успокой клиентку');
      await new Promise((done) => {
        const opts = [['🤝 «Карта заблокирована, деньги в безопасности. Новую выпустим за 3 дня»', 15], ['😐 «Готово.»', 0], ['😠 «Надо было следить за картой!»', -30]];
        for (const [text, d] of opts) {
          const b = el('button', { class: `choice ${d > 0 ? 'calm' : d < 0 ? 'pressure' : 'logic'}` }, el('span', { class: 'choice-text' }, text));
          b.addEventListener('click', () => {
            setMood(mood + d);
            say(d > 0 ? 'Фух… Спасибо вам огромное!' : d < 0 ? 'Вот спасибо, утешили…' : 'Ну… ладно.', d < 0 ? 'annoyed' : '');
            done();
          });
          work.append(b);
        }
      });
    }

    function stageBye(c) {
      step('✓', 'Попрощайся с клиентом');
      return new Promise((done) => {
        const opts = [
          ['😊 «Всего доброго! Хорошего дня!»', 10],
          ['😐 «Следующий.»', -5],
          ['😠 «Не задерживайте очередь!»', -30],
        ];
        for (const [text, d] of opts) {
          const b = el('button', { class: `choice ${d > 0 ? 'calm' : d < -10 ? 'pressure' : 'logic'}` }, el('span', { class: 'choice-text' }, text));
          b.addEventListener('click', () => {
            audio.click();
            setMood(mood + d);
            if (d > 0) learn('k_t_kind');
            if (d < -10) cons('😠', `${c.name}: «Нагрубили!» — жалоба в книге отзывов`, 'warn');
            done();
          });
          work.append(b);
        }
      });
    }

    // ─── один клиент от и до ───
    async function serve(c) {
      cur = c;
      emoOverride = c.climax ? 'scared' : null;
      setMood(80);
      ava.classList.remove('leave');
      ava.classList.add('enter');
      nameEl.textContent = `${c.name}, ${c.age}`;
      flags.innerHTML = '';
      if (c.onPhone) flags.append(el('span', { class: 'flag warn' }, '📞 говорит по телефону'));
      if (c.hurry) flags.append(el('span', { class: 'flag' }, '⏱ очень спешит'));
      showDocs([]);
      audio.notify();
      say(c.sayAfterCall && ctx.state.outcome?.call ? c.sayAfterCall : c.say);
      if (c.climax) {
        audio.startMusic('tension');
        audio.heartbeat(84);
        flash('red');
      }
      clearInterval(moodTimer);
      moodTimer = setInterval(() => {
        if (!ctx.isPaused()) setMood(mood - 1);
      }, tune.decay * (c.hurry ? 400 : 1000));

      await stageOp(c);
      if (c.op === 'deposit') await stageCount(c);
      else if (c.op === 'fx') await stageFx(c);
      else if (c.op === 'block') await stageBlock(c);
      else {
        const r = await stageForm(c);
        if (r.problem) await handleProblem(c);
        else {
          if (c.problem === 'safe') {
            mistake();
            cons('💔', `${c.name} ${c.lostText}`);
            if (c.story) setBeat(ctx.state, c.story, 'lost');
            if (c.climax) await rescue(c, false);
          } else if (c.problem === 'young') {
            mistake();
            cons('🧒', 'Карту оформили 12-летнему без родителей — нарушение правил');
          } else if (c.problem === 'photo') {
            mistake();
            cons('🪪', 'Мошенник открыл счёт по чужому паспорту');
          } else checkForm(c, r.values);
          if (!c.problem) {
            if (c.op === 'pay') await stageChange(c);
            if (c.op === 'withdraw') {
              step(3, 'Выдай наличные');
              const g = await composer(c.give, 'Выдать:');
              if (g !== c.give) {
                mistake();
                cons('💵', `Выдали ${money(g)} вместо ${money(c.give)}`, 'warn');
              } else audio.coin();
            }
            if (c.op === 'open' && c.product) await stageProduct(c);
          }
        }
      }
      showDocs([]);
      await stageBye(c);
      clearInterval(moodTimer);
      res.moodSum += mood;
      res.served++;
      if (mood >= 85 && res.good < 2) {
        res.good++;
        cons('😊', `${c.name}: «Спасибо, всё быстро и понятно!»`, 'good');
      }
      ava.classList.remove('enter');
      ava.classList.add('leave');
      await sleep(500);
    }

    (async () => {
      for (let i = 0; i < clients.length; i++) {
        queueEl.textContent = `👥 в очереди: ${clients.length - i}`;
        await serve(clients[i]);
      }
      clearInterval(moodTimer);
      const avg = Math.round(res.moodSum / Math.max(1, res.served));
      const stars = res.mistakes === 0 ? 3 : res.mistakes <= 2 ? 2 : 1;
      const score = res.served * 60 + avg * 2 - res.mistakes * 30;
      ctx.addScore(Math.max(0, score));
      resolve({
        stars,
        score,
        learned: res.learned,
        mistakes: res.mistakes,
        consequences: res.cons.sort((a, b) => (a.kind === 'good' ? 1 : 0) - (b.kind === 'good' ? 1 : 0)).slice(0, 6),
        stats: [
          ['👥', String(res.served), 'клиентов обслужено'],
          ['😊', `${avg}%`, 'настроение клиентов'],
          ['⚠', String(res.mistakes), 'ошибок'],
        ],
      });
    })();
  });
}

// Конец дня: найти операцию, из-за которой касса не сошлась
export function runRecon(ctx, shift) {
  const { audio } = ctx;
  const data = TELLER_SHIFTS[shift.n].recon;
  const easy = ctx.state.difficulty === 'easy';
  const prev = ctx.prof.pending || { stars: 3, score: 0, learned: [], consequences: [], stats: [] };
  let wrongPicks = 0;
  const expectedGiven = (r) => (r[3] < 0 ? -r[3] : r[4] - r[3]);
  const received = data.rows.reduce((s, r) => s + r[4], 0);
  const program = data.start + received - data.rows.reduce((s, r) => s + expectedGiven(r), 0);
  const actual = data.start + received - data.rows.reduce((s, r) => s + r[5], 0);

  return new Promise((resolve) => {
    const panel = openPanel('teller recon');
    panel.append(termBar('Сверка кассы · конец дня', ctx));
    const fb = el('div', { class: 'feedback' });
    const table = el('div', { class: 'stmt recon' }, el('div', { class: 'stmt-head' }, el('span', {}, 'Время'), el('span', {}, 'Операция'), el('span', {}, 'К оплате'), el('span', {}, 'Получено'), el('span', {}, 'Выдано'), easy ? el('span', {}, 'Должно быть') : null));
    data.rows.forEach((r, i) => {
      const row = el(
        'div',
        { class: `stmt-row pick${easy ? ' easy' : ''}` },
        el('span', {}, r[0]),
        el('span', {}, `${r[1]} · ${r[2]}`),
        el('span', {}, money(Math.abs(r[3]))),
        el('span', {}, money(r[4])),
        el('b', {}, money(r[5])),
        easy ? el('span', { class: 'muted' }, money(expectedGiven(r))) : null,
      );
      row.addEventListener('click', () => {
        if (i !== data.wrong) {
          audio.wrong();
          wrongPicks++;
          row.classList.add('wrong');
          fb.innerHTML = '';
          fb.append(el('div', { class: 'fb bad' }, '✓ Здесь всё сходится. Ищи дальше'));
          return;
        }
        audio.bigWin();
        flash('green');
        row.classList.add('right');
        ctx.learn('k_t_recon');
        fb.innerHTML = '';
        fb.append(
          el('div', { class: 'fb good' }, `🎯 Сдача ${money(r[5])} вместо ${money(expectedGiven(r))} — лишние ${money(r[5] - expectedGiven(r))}. Касса сошлась!`),
          el('button', { class: 'btn primary', onClick: finish }, 'Закрыть кассу ✓'),
        );
      });
      table.append(row);
    });
    panel.append(
      el(
        'div',
        { class: 'recon-body' },
        el('div', { class: 'db-stats' }, el('div', {}, el('span', { class: 'db-ico' }, '🖥'), el('b', {}, money(program)), el('small', {}, 'по программе')), el('div', {}, el('span', { class: 'db-ico' }, '🗃'), el('b', {}, money(actual)), el('small', {}, 'в ящике кассы')), el('div', { class: 'bad' }, el('span', { class: 'db-ico' }, '⚠'), el('b', {}, money(actual - program)), el('small', {}, 'разница'))),
        el('p', { class: 'muted' }, '👆 Найди операцию, где ошиблись: сдача = получено − к оплате'),
        table,
        fb,
      ),
    );
    function finish() {
      audio.click();
      const stars = Math.min(prev.stars, wrongPicks === 0 ? 3 : wrongPicks <= 2 ? 2 : 1);
      const learned = [...(prev.learned || []), ...(ctx.state.knowledge.includes('k_t_recon') ? ['k_t_recon'] : [])];
      ctx.addScore(Math.max(0, 200 - wrongPicks * 40));
      resolve({
        ...prev,
        stars,
        score: (prev.score || 0) + 200 - wrongPicks * 40,
        learned: [...new Set(learned)].filter((k) => KNOWLEDGE[k]),
        consequences: [{ icon: '⚖️', text: `Касса сошлась: нашли лишние ${money(1000)} в сдаче Геннадию`, kind: 'good' }, ...(prev.consequences || [])].slice(0, 6),
        stats: [prev.stats?.[0] || ['👥', '3', 'клиента'], ['⚖️', wrongPicks ? `${wrongPicks} ${wrongPicks === 1 ? 'промах' : wrongPicks < 5 ? 'промаха' : 'промахов'}` : 'с первого раза', 'сверка кассы'], prev.stats?.[2] || ['⚠', '0', 'ошибок']],
      });
    }
  });
}
