// HR-специалист: вакансия → собеседование → проверка → решение → испытательный срок.
// Каждая смена копит решения в ctx.prof.data.hr, а календарь «испытательный срок» показывает, что из них вышло.
import { KNOWLEDGE } from '../data/professions.js';
import { VACANCIES, QUESTIONS, SKILLS, CANDIDATES_1, CHECKS_1, PRESSURE_1, STAR, STAR_TRAPS, STAR_TOPICS, CANDIDATES_3, PRESSURE_3, SCREEN_REQS, RESUMES, CHECK_REQUESTS, BINS, CANDIDATES_4, DAY_SLOTS, DAY_CARDS, ACCESS_ITEMS, MASHA_TALK, LOOKS } from '../data/hr.js';
import { el, openPanel, termBar, sleep, flash, tour } from '../ui.js';
import { person } from '../portraits.js';
import { setBeat, story } from '../story.js';
import { runDialog } from './dialog.js';

const LEARN = (ctx, learned) => (k) => {
  if (KNOWLEDGE[k] && ctx.learn(k)) learned.push(k);
};
const store = (ctx) => (ctx.prof.data.hr ||= { learned: [] });
const ava = (look, emo = 'neutral', cls = 'hr-ava') => el('div', { class: cls, html: person(look, emo) });
const stars = (n) => '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 3 - n));
const hint = (ctx, text) => (ctx.state.difficulty === 'hard' ? null : el('div', { class: 'coach' }, text));

// ═══════════════════════ Смена 1: вакансия без дискриминации ═══════════════════════
export function runVacancy(ctx, shift) {
  const { audio } = ctx;
  const v = VACANCIES[shift.n] || VACANCIES[1];
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const bad = v.segments.filter((s) => s.bad).length;
  const hard = ctx.state.difficulty === 'hard';
  let found = 0;
  let wrong = 0;
  return new Promise((resolve) => {
    const panel = openPanel('hr vac');
    const prog = el('span', { class: 'term-progress' }, hard ? 'Нарушений найдено: 0' : `Нарушений: 0 из ${bad}`);
    panel.append(termBar('HR · Новая вакансия', ctx, prog));
    const fb = el('div', { class: 'feedback' });
    const fine = el('div', { class: 'hr-fine bad' }, el('b', {}, '⚖️ Риск штрафа'), el('span', {}, 'до 15 000 ₽'), el('small', {}, 'за дискриминацию в объявлении'));
    const paper = el('div', { class: 'hr-ad' }, el('div', { class: 'hr-ad-head' }, el('small', {}, 'ЧЕРНОВИК ОБЪЯВЛЕНИЯ'), el('b', {}, `Вакансия: ${v.title}`)));
    const publish = el('button', { class: 'btn primary big' }, '📢 Опубликовать');
    for (const seg of v.segments) {
      const b = el('button', { class: 'hr-seg' }, el('span', { class: 'hr-seg-t' }, seg.t));
      b.addEventListener('click', () => {
        if (b.classList.contains('struck') || b.classList.contains('kept')) return;
        if (seg.bad) {
          audio.stamp();
          b.classList.add('struck');
          if (seg.fix) b.append(el('span', { class: 'hr-fix' }, `→ ${seg.fix}`));
          found++;
          say(`🚫 ${seg.bad}`, 'good');
          learn('k_h_ad');
          if (/детей/.test(seg.t)) learn('k_h_forbidden');
          if (/лет/.test(seg.t)) learn('k_h_age');
        } else {
          audio.wrong();
          wrong++;
          b.classList.add('kept');
          say('✓ Это требование про работу — оставляем', 'bad');
        }
        prog.textContent = hard ? `Нарушений найдено: ${found}` : `Нарушений: ${found} из ${bad}`;
        if (found === bad) {
          fine.className = 'hr-fine ok';
          fine.innerHTML = '';
          fine.append(el('b', {}, '✅ Вакансия честная'), el('span', {}, 'штрафа не будет'), el('small', {}, 'и откликнется больше хороших людей'));
          publish.classList.add('pulse-hint');
        }
      });
      paper.append(b);
    }
    function say(text, kind) {
      fb.innerHTML = '';
      fb.append(el('div', { class: `fb ${kind}` }, text));
    }
    const left = el(
      'div',
      { class: 'hr-side' },
      el('div', { class: 'hr-req' }, ava(v.from.look), el('div', {}, el('b', {}, v.from.name), el('small', {}, v.from.role)), el('p', {}, `«${v.request}»`)),
      hint(ctx, '👆 Нажимай на строки, которые нарушают закон: пол, возраст, внешность, прописка, дети. Требования про работу — оставь.'),
      hard ? null : el('div', { class: 'hr-law' }, el('b', {}, '⚖️ Закон'), el('p', {}, 'В вакансии нельзя требовать пол, возраст, место жительства, национальность, «без детей» — если этого не требует сам закон для профессии (565-ФЗ, ст. 53).')),
    );
    panel.append(el('div', { class: 'hr-grid' }, left, el('div', { class: 'hr-center' }, paper), el('div', { class: 'hr-side' }, fine, publish, fb)));
    setTimeout(() => tour('hr_vac'), 450);
    publish.addEventListener('click', async () => {
      audio.click();
      publish.disabled = true;
      data.vac = { missed: bad - found, wrong };
      paper.classList.add('published');
      const views = el('b', {}, '0');
      fb.innerHTML = '';
      fb.append(el('div', { class: 'fb good' }, '📢 Опубликовано! Откликов: ', views));
      const target = 37 - (bad - found) * 6;
      for (let i = 1; i <= target; i += 3) {
        views.textContent = String(Math.min(i, target));
        audio.blip(600 + i * 6);
        await sleep(40);
      }
      views.textContent = String(target);
      await sleep(700);
      resolve(null);
    });
  });
}

// ═══════════════════════ Смены 1 и 3: собеседование ═══════════════════════
export function runInterview(ctx, shift) {
  return shift.n === 3 ? runStar(ctx, shift) : runBasic(ctx, shift);
}

function interviewFrame(ctx, title, cands) {
  const panel = openPanel('hr iv');
  const prog = el('span', { class: 'term-progress' });
  panel.append(termBar(title, ctx, prog));
  const queue = el('div', { class: 'hr-queue' }, cands.map((c) => el('div', { class: 'hr-q', 'data-id': c.id }, ava(c.look, 'neutral', 'hr-q-ava'), el('b', {}, c.name), el('small', { class: 'hr-q-st' }, 'ждёт'))));
  const card = el('div', { class: 'hr-cand' });
  const right = el('div', { class: 'hr-ask' });
  panel.append(el('div', { class: 'hr-grid iv' }, queue, card, right));
  const setQ = (id, text, cls = '') => {
    const q = queue.querySelector(`[data-id="${id}"]`);
    if (!q) return;
    q.className = `hr-q ${cls}`;
    q.querySelector('.hr-q-st').textContent = text;
  };
  return { panel, prog, queue, card, right, setQ };
}

function candHead(c, emo = 'neutral') {
  const face = ava(c.look, emo, 'hr-ava big');
  const head = el('div', { class: 'hr-cand-head' }, face, el('div', {}, el('b', { class: 'tl-name' }, `${c.name}, ${c.age}`), el('div', { class: 'hr-resume' }, c.resume.map(([i, t]) => el('div', {}, el('span', {}, i), el('span', {}, t))))));
  return { head, face, setEmo: (e) => (face.innerHTML = person(c.look, e)) };
}

function runBasic(ctx, shift) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const cands = CANDIDATES_1;
  const LIMIT = 3;
  const iv = { illegal: 0, empty: 0, asked: 0, evidence: {}, flags: {} };
  const s = story(ctx.state);
  return new Promise((resolve) => {
    const f = interviewFrame(ctx, 'HR · Собеседование: операционист', cands);
    (async () => {
      for (let i = 0; i < cands.length; i++) await interview(cands[i], i);
      await checks();
      await decision();
    })();

    function interview(c, idx) {
      return new Promise((done) => {
        f.prog.textContent = `🗣 Кандидат ${idx + 1}/${cands.length}`;
        f.setQ(c.id, 'на собеседовании', 'now');
        f.card.innerHTML = '';
        f.right.innerHTML = '';
        const { head, setEmo } = candHead(c);
        const lines = el('div', { class: 'hr-lines' });
        const chips = el('div', { class: 'hr-chips' });
        f.card.append(head, chips, lines);
        if (c.insider && s.maxim) lines.append(el('div', { class: 'line sys' }, `💭 Руслан… Где-то ты это имя уже слышал(а). ${s.maxim === 'saved' ? 'Не тот ли это «друг», что привёл Максима за чужим кредитом?' : 'Кажется, так звали «друга» Максима в кредитном отделе.'}`));
        let left = LIMIT;
        const leftEl = el('b', {}, String(left));
        const qbox = el('div', { class: 'hr-qs' });
        const next = el('button', { class: 'btn ghost', disabled: true }, idx < cands.length - 1 ? 'Спасибо, следующий →' : 'Спасибо! Все кандидаты →');
        f.right.append(el('h4', {}, '❓ Вопросы кандидату'), el('small', { class: 'muted' }, 'Осталось вопросов: ', leftEl), qbox, hint(ctx, '🎯 Спрашивай про работу. Вопросы про детей, возраст и веру задавать нельзя.'), next);
        if (idx === 0) setTimeout(() => tour('hr_iv'), 450);
        const ev = (iv.evidence[c.id] = {});
        for (const [qid, q] of Object.entries(QUESTIONS)) {
          const b = el('button', { class: `q-btn hr-qb ${ctx.state.difficulty === 'easy' ? q.kind : ''}` }, `${q.icon} ${q.text}`);
          b.addEventListener('click', async () => {
            if (left <= 0) return;
            audio.click();
            b.disabled = true;
            left--;
            leftEl.textContent = String(left);
            iv.asked++;
            next.disabled = false;
            lines.append(el('div', { class: 'line me' }, el('p', {}, q.text)));
            const [ans, score, flag] = c.answers[qid];
            if (q.kind === 'bad') {
              iv.illegal++;
              setEmo('angry');
              audio.wrong();
              lines.append(el('div', { class: 'line gran' }, el('p', {}, ans)), el('div', { class: 'line law' }, `⚖️ ${q.law}`));
              learn('k_h_forbidden');
            } else if (q.kind === 'empty') {
              iv.empty++;
              setEmo('surprised');
              lines.append(el('div', { class: 'line gran' }, el('p', {}, ans)), el('div', { class: 'line sys' }, '🌫 Ответ ничего не сказал о работе'));
            } else {
              learn('k_h_ask');
              setEmo(score >= 2 ? 'happy' : score < 0 ? 'neutral' : 'worried');
              lines.append(el('div', { class: 'line gran' }, el('p', {}, ans)));
              const sk = SKILLS[q.skill];
              ev[q.skill] = score;
              chips.append(el('span', { class: `hr-chip ${score < 0 ? 'red' : score >= 3 ? 'top' : ''}` }, score < 0 ? flag : `${sk.icon} ${sk.name} ${stars(score)}`));
              if (score < 0) iv.flags[c.id] = (iv.flags[c.id] || 0) + 1;
              audio.coin();
            }
            lines.scrollTop = lines.scrollHeight;
            if (left <= 0) qbox.querySelectorAll('button').forEach((x) => (x.disabled = true));
          });
          qbox.append(b);
        }
        next.addEventListener('click', () => {
          audio.click();
          f.setQ(c.id, Object.keys(ev).length ? `${Object.keys(ev).length} ответа по делу` : 'без ответов по делу', 'done');
          done();
        });
      });
    }

    // ─── проверка: согласие → запросы ───
    function checks() {
      return new Promise((done) => {
        f.prog.textContent = '🛡 Проверка кандидатов';
        f.card.innerHTML = '';
        f.right.innerHTML = '';
        data.checks = { consentFirst: true, done: 0, traps: 0, found: {} };
        const cols = el('div', { class: 'hr-checks' });
        const fb = el('div', { class: 'feedback' });
        f.card.append(el('h3', { class: 'hr-h' }, '🛡 Проверка вместе со службой безопасности'), hint(ctx, '✍️ Сначала попроси согласие кандидата — без него проверять нельзя. Потом выбери проверки.'), cols, fb);
        const say = (t, k) => {
          fb.innerHTML = '';
          fb.append(el('div', { class: `fb ${k}` }, t));
        };
        for (const c of cands) {
          const col = el('div', { class: 'hr-check-col' });
          let consent = false;
          const sign = el('button', { class: 'btn ghost small hr-sign' }, '✍️ Попросить согласие');
          const list = el('div', { class: 'hr-check-list' });
          sign.addEventListener('click', async () => {
            audio.click();
            sign.disabled = true;
            sign.classList.add('signing');
            sign.textContent = '✍️ подписывает…';
            await sleep(650);
            consent = true;
            sign.replaceWith(el('div', { class: 'hr-signed' }, '✅ Согласие подписано'));
            learn('k_h_consent');
            audio.stamp();
          });
          for (const ch of CHECKS_1) {
            const b = el('button', { class: `hr-ck${ch.allowed === false ? ' trap' : ''}` }, el('span', {}, ch.icon), el('b', {}, ch.name), el('small', {}, ch.hint || ''));
            b.addEventListener('click', async () => {
              audio.click();
              if (ch.allowed === false) {
                data.checks.traps++;
                b.disabled = true;
                b.classList.add('denied');
                say(`🚫 ${ch.why}`, 'bad');
                if (ch.id === 'record') learn('k_h_record');
                audio.wrong();
                return;
              }
              if (!consent) {
                data.checks.consentFirst = false;
                say('✍️ Сначала согласие: проверять человека без его согласия нельзя (ст. 86 ТК РФ)', 'bad');
                sign.classList.add('pulse-hint');
                audio.wrong();
                return;
              }
              b.disabled = true;
              b.classList.add('loading');
              await sleep(500);
              const [st, text] = c.checks[ch.id];
              b.classList.remove('loading');
              b.classList.add(st);
              b.querySelector('small').textContent = text;
              data.checks.done++;
              if (st === 'bad') {
                data.checks.found[c.id] = (data.checks.found[c.id] || 0) + 1;
                audio.wrong();
                if (ch.id === 'diploma') learn('k_h_registry');
                if (ch.id === 'sb') learn('k_h_insider');
              } else audio.blip(700);
            });
            list.append(b);
          }
          col.append(el('div', { class: 'hr-check-head' }, ava(c.look, 'neutral', 'hr-q-ava'), el('b', {}, `${c.name}, ${c.age}`)), sign, list);
          cols.append(col);
        }
        const go = el('button', { class: 'btn primary big' }, 'К решению →');
        go.addEventListener('click', () => {
          audio.click();
          done();
        });
        f.right.append(el('h4', {}, '📋 Что можно проверять'), el('p', { class: 'muted small' }, 'Только то, что нужно для работы, и только с согласия. Сведения у третьих лиц — с письменного согласия кандидата.'), go);
        setTimeout(() => tour('hr_chk1'), 400);
      });
    }

    // ─── решение: кому предложение ───
    function decision() {
      f.prog.textContent = '🤝 Решение';
      f.card.innerHTML = '';
      f.right.innerHTML = '';
      const fb = el('div', { class: 'hr-press' });
      const evRow = (c) => {
        const ev = iv.evidence[c.id] || {};
        const found = data.checks.found[c.id] || 0;
        const flags = iv.flags[c.id] || 0;
        return el(
          'button',
          { class: 'hr-offer', 'data-id': c.id },
          ava(c.look, 'neutral', 'hr-q-ava'),
          el('div', {}, el('b', {}, `${c.name}, ${c.age}`), el('div', { class: 'hr-mini' }, Object.entries(ev).filter(([, v]) => v > 0).map(([k, v]) => el('span', {}, `${SKILLS[k].icon}${stars(v)}`)), flags ? el('span', { class: 'red' }, `🚩×${flags}`) : null, found ? el('span', { class: 'red' }, `🛡 проверка: ${found} ✗`) : null)),
        );
      };
      const list = el('div', { class: 'hr-offers' }, cands.map(evRow));
      const none = el('button', { class: 'btn ghost' }, '🙅 Никого — ищем дальше');
      let report = false;
      const insider = cands.find((c) => c.insider);
      const canReport = (data.checks.found[insider.id] || 0) > 0 || (iv.flags[insider.id] || 0) > 0;
      const rep = canReport ? el('label', { class: 'hr-report' }, el('input', { type: 'checkbox' }), el('span', {}, `🛡 Передать данные ${insider.name}а в службу безопасности`)) : null;
      rep?.querySelector('input').addEventListener('change', (e) => {
        report = e.target.checked;
        audio.click();
      });
      f.card.append(el('h3', { class: 'hr-h' }, '🤝 Кому сделать предложение о работе?'), list, none, rep, fb);
      f.right.append(el('h4', {}, '🧭 Как решать'), el('p', { class: 'muted small' }, 'Сравни ответы по делу и результаты проверки. Пол, возраст и «бойкость» — не критерии.'));
      return new Promise((resolve2) => {
        list.querySelectorAll('.hr-offer').forEach((b) =>
          b.addEventListener('click', () => {
            audio.click();
            pick(b.dataset.id);
          }),
        );
        none.addEventListener('click', () => {
          audio.click();
          pick(null);
        });
        let pressured = false;
        async function pick(id) {
          if (id === 'olga' && !pressured) {
            pressured = true;
            const p = PRESSURE_1;
            fb.innerHTML = '';
            const box = el('div', { class: 'hr-pressure' }, ava(p.look, 'angry', 'hr-q-ava'), el('div', {}, el('b', {}, p.who), el('p', {}, `«${p.say}»`)));
            const btns = el('div', { class: 'choices' });
            fb.append(box, btns);
            audio.notify();
            for (const ch of p.choices) {
              btns.append(
                el('button', { class: `choice ${ch.good ? 'calm' : 'pressure'}`, onClick: async () => {
                  audio.click();
                  btns.remove();
                  box.append(el('p', { class: 'hr-reply' }, `«${ch.reply}»`));
                  data.pressure = ch.id;
                  if (ch.good) learn('k_h_age');
                  await sleep(1200);
                  finish(ch.good ? 'olga' : 'ruslan');
                } }, el('span', { class: 'choice-text' }, ch.text)),
              );
            }
            return;
          }
          finish(id);
        }
        async function finish(id) {
          list.querySelectorAll('button').forEach((x) => (x.disabled = true));
          none.disabled = true;
          data.iv = { hired: id, illegal: iv.illegal, empty: iv.empty, asked: iv.asked, reported: report && canReport };
          const c = cands.find((x) => x.id === id);
          f.card.querySelector('.hr-offers')?.after(el('div', { class: `decided ${id ? 'approve' : 'refuse'}` }, id ? `🤝 Предложение — ${c.name}` : '🙅 Вакансия остаётся открытой', el('small', {}, 'Как человек покажет себя — увидим на испытательном сроке ⏳')));
          id ? audio.coin() : audio.stamp();
          setBeat(ctx.state, 'insider', data.iv.reported ? 'caught' : id === 'ruslan' ? 'hired' : 'refused');
          await sleep(1300);
          resolve2();
          resolve(null);
        }
      });
    }
  });
}

// ─── Смена 3: STAR ───
function runStar(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const cands = CANDIDATES_3;
  const ASKS = 3;
  const res = { illegal: 0, empty: 0, quality: {} };
  return new Promise((resolve) => {
    const f = interviewFrame(ctx, 'HR · Собеседование: кредитный эксперт', cands);
    (async () => {
      for (let i = 0; i < cands.length; i++) await interview(cands[i], i);
      await decide();
    })();

    function interview(c, idx) {
      return new Promise((done) => {
        f.prog.textContent = `⭐ Кандидат ${idx + 1}/${cands.length}`;
        f.setQ(c.id, 'на собеседовании', 'now');
        f.card.innerHTML = '';
        f.right.innerHTML = '';
        const { head, setEmo } = candHead(c);
        const board = el('div', { class: 'star-board' });
        const lines = el('div', { class: 'hr-lines' });
        f.card.append(head, board, lines);
        let total = 0;
        let filled = 0;
        let topicI = 0;
        const runTopic = () => {
          const topic = STAR_TOPICS[topicI];
          const slots = {};
          const row = el('div', { class: 'star-row' }, el('div', { class: 'star-q' }, `${topic.icon} ${topic.title}`), el('div', { class: 'star-slots' }, STAR.map((s) => (slots[s.key] = el('div', { class: 'star-slot empty' }, el('span', {}, s.icon), el('b', {}, s.name), el('small', {}, '—'))))));
          board.append(row);
          lines.append(el('div', { class: 'line me' }, el('p', {}, topic.title)));
          // ответ на сам вопрос — ситуация
          const answerSlot = (key) => {
            const [text, q] = c.star[topic.id][key];
            const slot = slots[key];
            slot.className = `star-slot q${Math.max(0, q)}${q < 0 ? ' red' : ''}`;
            slot.querySelector('small').textContent = q >= 2 ? 'факты' : q === 1 ? 'общие слова' : q < 0 ? '🚩 тревожно' : '🌫 туман';
            lines.append(el('div', { class: 'line gran' }, el('p', {}, text)));
            total += q;
            filled++;
            setEmo(q >= 2 ? 'happy' : q < 0 ? 'neutral' : 'worried');
            lines.scrollTop = lines.scrollHeight;
          };
          answerSlot('S');
          let left = ASKS;
          const leftEl = el('b', {}, String(left));
          const qbox = el('div', { class: 'hr-qs' });
          f.right.innerHTML = '';
          f.right.append(el('h4', {}, '⭐ Уточни по STAR'), el('small', { class: 'muted' }, 'Уточнений осталось: ', leftEl), qbox, hint(ctx, '⭐ Ситуацию кандидат уже рассказал. Узнай задачу, что сделал лично он и чем всё закончилось.'));
          if (idx === 0 && topicI === 0) setTimeout(() => tour('hr_star'), 450);
          const asks = [...STAR.filter((s) => s.key !== 'S').map((s) => ({ star: s })), ...STAR_TRAPS.map((t) => ({ trap: t }))];
          for (const a of asks) {
            const label = a.star ? `${a.star.icon} ${a.star.ask}` : `${a.trap.icon} ${a.trap.text}`;
            const b = el('button', { class: `q-btn hr-qb ${ctx.state.difficulty === 'easy' ? (a.trap ? a.trap.kind : 'good') : ''}` }, label);
            b.addEventListener('click', async () => {
              if (left <= 0) return;
              audio.click();
              b.disabled = true;
              left--;
              leftEl.textContent = String(left);
              lines.append(el('div', { class: 'line me' }, el('p', {}, a.star ? a.star.ask : a.trap.text)));
              if (a.star) {
                learn('k_h_star');
                answerSlot(a.star.key);
                audio.coin();
              } else if (a.trap.kind === 'bad') {
                res.illegal++;
                setEmo('angry');
                lines.append(el('div', { class: 'line gran' }, el('p', {}, c.married_answer)), el('div', { class: 'line law' }, `⚖️ ${a.trap.law}`));
                learn('k_h_forbidden');
                audio.wrong();
              } else {
                res.empty++;
                lines.append(el('div', { class: 'line gran' }, el('p', {}, c.halo_answer)), el('div', { class: 'line sys' }, `🌫 ${a.trap.note}`));
                learn('k_h_halo');
                audio.blip(300);
              }
              lines.scrollTop = lines.scrollHeight;
              if (left <= 0) {
                qbox.querySelectorAll('button').forEach((x) => (x.disabled = true));
                await sleep(900);
                topicI++;
                if (topicI < STAR_TOPICS.length) runTopic();
                else {
                  res.quality[c.id] = total / (STAR_TOPICS.length * 4 * 2);
                  f.setQ(c.id, `STAR: ${Math.round(res.quality[c.id] * 100)}%`, 'done');
                  const nb = el('button', { class: 'btn primary' }, idx < cands.length - 1 ? 'Следующий кандидат →' : 'К решению →');
                  nb.addEventListener('click', () => {
                    audio.click();
                    done();
                  });
                  f.right.append(nb);
                }
              }
            });
            qbox.append(b);
          }
        };
        runTopic();
      });
    }

    function decide() {
      return new Promise((done) => {
        f.prog.textContent = '🤝 Решение';
        f.card.innerHTML = '';
        f.right.innerHTML = '';
        const fb = el('div', { class: 'hr-press' });
        const list = el(
          'div',
          { class: 'hr-offers' },
          cands.map((c) => el('button', { class: 'hr-offer', 'data-id': c.id }, ava(c.look, 'neutral', 'hr-q-ava'), el('div', {}, el('b', {}, `${c.name}, ${c.age}`), el('div', { class: 'hr-mini' }, el('span', {}, `⭐ STAR ${Math.round((res.quality[c.id] || 0) * 100)}%`), c.halo ? el('span', {}, '🎓 красный диплом') : null)))),
        );
        const none = el('button', { class: 'btn ghost' }, '🙅 Никого — ищем дальше');
        f.card.append(el('h3', { class: 'hr-h' }, '🤝 Кого берём кредитным экспертом?'), list, none, fb);
        f.right.append(el('h4', {}, '⭐ Подсказка'), el('p', { class: 'muted small' }, 'Хороший ответ — конкретный: что было, что сделал сам, чем кончилось. «Мы всей командой» и «в целом по отделу» — туман.'));
        let pressured = false;
        const pick = async (id) => {
          if (id === 'denis' && !pressured) {
            pressured = true;
            const p = PRESSURE_3;
            const box = el('div', { class: 'hr-pressure' }, ava(p.look, 'angry', 'hr-q-ava'), el('div', {}, el('b', {}, p.who), el('p', {}, `«${p.say}»`)));
            const btns = el('div', { class: 'choices' });
            fb.append(box, btns);
            audio.notify();
            for (const ch of p.choices)
              btns.append(
                el('button', { class: `choice ${ch.good ? 'calm' : 'pressure'}`, onClick: async () => {
                  audio.click();
                  btns.remove();
                  box.append(el('p', { class: 'hr-reply' }, `«${ch.reply}»`));
                  data.pressure = ch.id;
                  learn('k_h_halo');
                  await sleep(1200);
                  finish(ch.good ? 'denis' : 'veronika');
                } }, el('span', { class: 'choice-text' }, ch.text)),
              );
            return;
          }
          finish(id);
        };
        list.querySelectorAll('.hr-offer').forEach((b) => b.addEventListener('click', () => (audio.click(), pick(b.dataset.id))));
        none.addEventListener('click', () => (audio.click(), pick(null)));
        async function finish(id) {
          list.querySelectorAll('button').forEach((x) => (x.disabled = true));
          none.disabled = true;
          data.iv = { hired: id, illegal: res.illegal, empty: res.empty, quality: res.quality };
          const c = cands.find((x) => x.id === id);
          list.after(el('div', { class: `decided ${id ? 'approve' : 'refuse'}` }, id ? `🤝 Предложение — ${c.name}` : '🙅 Ищем дальше', el('small', {}, 'Как человек покажет себя — увидим на испытательном сроке ⏳')));
          id ? audio.coin() : audio.stamp();
          await sleep(1300);
          done();
          resolve(null);
        }
      });
    }
  });
}

// ═══════════════════════ Смена 2: поток резюме ═══════════════════════
export function runScreen(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const s = story(ctx.state);
  const feedbackNow = ctx.state.difficulty !== 'hard';
  const decisions = [];
  let blind = false;
  let blindUsed = false;
  return new Promise((resolve) => {
    const panel = openPanel('hr scr');
    const prog = el('span', { class: 'term-progress' }, `📥 1/${RESUMES.length}`);
    panel.append(termBar('HR · Отклики на стажировку', ctx, prog));
    const blindBtn = el('button', { class: 'btn ghost small hr-blind' }, '🙈 Слепой режим: выкл');
    blindBtn.addEventListener('click', () => {
      audio.click();
      blind = !blind;
      blindUsed ||= blind;
      if (blind) learn('k_h_blind');
      blindBtn.textContent = `🙈 Слепой режим: ${blind ? 'вкл' : 'выкл'}`;
      blindBtn.classList.toggle('on', blind);
      render();
    });
    const reqs = el(
      'div',
      { class: 'hr-reqs' },
      el('b', {}, `📌 ${SCREEN_REQS.title}`),
      el('small', {}, 'Обязательно:'),
      SCREEN_REQS.must.map(([i, t]) => el('div', { class: 'must' }, el('span', {}, i), t)),
      el('small', {}, 'Желательно:'),
      SCREEN_REQS.nice.map(([i, t]) => el('div', { class: 'nice' }, el('span', {}, i), t)),
      blindBtn,
      hint(ctx, '🙈 Слепой режим прячет имя, возраст, фото и личное — остаются только навыки. Так проще не ошибиться.'),
    );
    const card = el('div', { class: 'hr-cv-wrap' });
    const fb = el('div', { class: 'feedback' });
    const no = el('button', { class: 'btn danger big' }, '✗ Отказать');
    const yes = el('button', { class: 'btn safe big' }, '✓ Пригласить');
    const tray = el('div', { class: 'hr-tray' });
    panel.append(el('div', { class: 'hr-grid scr' }, reqs, el('div', { class: 'hr-center' }, card, el('div', { class: 'hr-btns' }, no, yes), fb), el('div', { class: 'hr-side' }, el('h4', {}, '🗂 Решения'), tray)));
    let idx = 0;
    function render() {
      const r = RESUMES[idx];
      if (!r) return;
      card.innerHTML = '';
      const lines = r.storyLine && s.maxim === 'saved' ? [...r.lines, '«Банк однажды уберёг меня от чужого кредита — хочу так же помогать другим»'] : r.lines;
      card.append(
        el(
          'div',
          { class: `hr-cv${blind ? ' blind' : ''}` },
          el('div', { class: 'hr-cv-head' }, blind ? el('div', { class: 'hr-ava big anon' }, '👤') : ava(r.look, 'neutral', 'hr-ava big'), el('div', {}, el('b', {}, blind ? `Кандидат №${idx + 1}` : `${r.name}, ${r.age}`), el('small', {}, `Резюме ${idx + 1} из ${RESUMES.length}`))),
          el('div', { class: 'hr-cv-lines' }, lines.map((l) => el('div', {}, `• ${l}`)), r.personal.map((l) => el('div', { class: 'personal' }, blind ? '• ▒▒▒▒▒▒ (скрыто)' : `• ${l}`))),
        ),
      );
      prog.textContent = `📥 ${idx + 1}/${RESUMES.length}`;
    }
    render();
    setTimeout(() => tour('hr_scr'), 450);
    let busy = false;
    async function decide(invite) {
      if (busy) return;
      busy = true;
      const r = RESUMES[idx];
      const right = invite === r.invite;
      decisions.push({ id: r.id, invite, right });
      audio[invite ? 'coin' : 'stamp']();
      if (right && r.k) learn(r.k);
      if (r.gap && invite) learn('k_h_gap');
      tray.prepend(el('div', { class: `hr-tray-i ${invite ? 'yes' : 'no'}${feedbackNow ? (right ? ' right' : ' wrong') : ''}` }, ava(r.look, 'neutral', 'hr-q-ava'), el('span', {}, r.name), el('b', {}, invite ? '✓' : '✗')));
      if (feedbackNow) {
        fb.innerHTML = '';
        fb.append(el('div', { class: `fb ${right ? 'good' : 'bad'}` }, `${right ? '✅' : '⚠️'} ${r.why}`));
        if (!right) audio.wrong();
      }
      card.firstElementChild?.classList.add(invite ? 'out-yes' : 'out-no');
      await sleep(feedbackNow ? 900 : 380);
      idx++;
      busy = false;
      if (idx < RESUMES.length) render();
      else {
        yes.disabled = no.disabled = true;
        data.screen = { decisions, blind: blindUsed };
        card.innerHTML = '';
        card.append(el('div', { class: 'decided approve' }, `📨 Приглашено: ${decisions.filter((d) => d.invite).length}`, el('small', {}, 'Что из этого вышло — через месяц стажировки ⏳')));
        await sleep(1200);
        resolve(null);
      }
    }
    yes.addEventListener('click', () => decide(true));
    no.addEventListener('click', () => decide(false));
  });
}

// ═══════════════════════ Смена 4: проверка кандидатов в инкассаторы ═══════════════════════
export function runCheck(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const chk = { reqWrong: 0, reqMissing: 0, sortRight: 0, sortTotal: 0, hired: null, consents: 0 };
  return new Promise((resolve) => {
    const panel = openPanel('hr chk');
    const prog = el('span', { class: 'term-progress' }, '1/4 · Запрос в СБ');
    panel.append(termBar('HR + Служба безопасности · Инкассатор', ctx, prog));
    const body = el('div', { class: 'hr-chk-body' });
    const side = el('div', { class: 'hr-side' });
    panel.append(el('div', { class: 'hr-grid chk' }, body, side));
    const fb = el('div', { class: 'feedback' });
    const say = (t, k) => {
      fb.innerHTML = '';
      fb.append(el('div', { class: `fb ${k}` }, t));
    };
    (async () => {
      await requests();
      await consents();
      await sorting();
      await decide();
      data.chk = chk;
      resolve(null);
    })();

    function requests() {
      return new Promise((done) => {
        body.innerHTML = '';
        side.innerHTML = '';
        const picked = new Set();
        const list = el('div', { class: 'hr-req-list' });
        for (const r of CHECK_REQUESTS) {
          const b = el('button', { class: 'hr-rq' }, el('span', {}, r.icon), el('b', {}, r.name), el('i', {}, ''));
          b.addEventListener('click', () => {
            audio.click();
            if (picked.has(r.id)) picked.delete(r.id);
            else picked.add(r.id);
            b.classList.toggle('on', picked.has(r.id));
            b.querySelector('i').textContent = picked.has(r.id) ? '✓' : '';
          });
          list.append(b);
        }
        const send = el('button', { class: 'btn primary big' }, '📨 Отправить запрос в СБ');
        body.append(el('h3', { class: 'hr-h' }, '📨 Что попросить проверить у кандидатов в инкассаторы?'), hint(ctx, '⚖️ Инкассатор работает с оружием и чужими деньгами — тут закон требует больше проверок. Но и у этих проверок есть границы.'), list, fb);
        side.append(el('div', { class: 'hr-law' }, el('b', {}, '⚖️ Справка о несудимости'), el('p', {}, 'Её требуют не везде, а только там, где закон не допускает людей с судимостью: учителя, вооружённая охрана, инкассаторы с оружием и некоторые другие.')), send);
        setTimeout(() => tour('hr_chk'), 450);
        send.addEventListener('click', async () => {
          audio.click();
          const wrong = CHECK_REQUESTS.filter((r) => !r.ok && picked.has(r.id));
          const missing = CHECK_REQUESTS.filter((r) => r.ok && !picked.has(r.id));
          chk.reqWrong = wrong.length;
          chk.reqMissing = missing.length;
          list.querySelectorAll('.hr-rq').forEach((b, i) => {
            const r = CHECK_REQUESTS[i];
            b.disabled = true;
            b.classList.add(r.ok ? (picked.has(r.id) ? 'right' : 'miss') : picked.has(r.id) ? 'wrong' : 'skip');
            b.append(el('small', {}, r.why));
          });
          if (picked.has('record')) learn('k_h_record');
          if (wrong.length || missing.length) {
            audio.wrong();
            say(`${wrong.length ? `🚫 Лишнее: ${wrong.map((r) => r.name.toLowerCase()).join(', ')} — СБ вернула запрос. ` : ''}${missing.length ? `⚠️ Не хватало: ${missing.map((r) => r.name.toLowerCase()).join(', ')} — добавили.` : ''}`, 'bad');
          } else {
            audio.success();
            say('✅ Ровно то, что нужно для этой работы, — и ничего лишнего', 'good');
          }
          if (wrong.some((r) => r.id === 'family')) learn('k_h_family');
          send.disabled = true;
          const nx = el('button', { class: 'btn primary' }, 'Дальше →');
          side.append(nx);
          nx.addEventListener('click', () => (audio.click(), done()));
        });
      });
    }

    function consents() {
      return new Promise((done) => {
        prog.textContent = '2/4 · Согласие';
        body.innerHTML = '';
        side.innerHTML = '';
        fb.innerHTML = '';
        const row = el('div', { class: 'hr-consents' });
        let signed = 0;
        for (const c of CANDIDATES_4) {
          const b = el('button', { class: 'btn ghost hr-sign' }, '✍️ Подписать согласие');
          const sheet = el('div', { class: 'hr-consent' }, ava(c.look, 'neutral', 'hr-ava'), el('b', {}, `${c.name}, ${c.age}`), el('div', { class: 'hr-resume' }, c.resume.map(([i, t]) => el('div', {}, el('span', {}, i), el('span', {}, t)))), el('small', { class: 'muted' }, 'Согласие на обработку персональных данных и проверку'), b);
          b.addEventListener('click', async () => {
            audio.click();
            b.disabled = true;
            b.classList.add('signing');
            await sleep(600);
            b.replaceWith(el('div', { class: 'hr-signed' }, '✅ Подписано'));
            sheet.classList.add('ok');
            audio.stamp();
            signed++;
            chk.consents = signed;
            learn('k_h_consent');
            if (signed === CANDIDATES_4.length) {
              await sleep(400);
              done();
            }
          });
          row.append(sheet);
        }
        body.append(el('h3', { class: 'hr-h' }, '✍️ Согласие кандидатов на проверку'), row);
        side.append(el('div', { class: 'hr-law' }, el('b', {}, '✍️ Зачем'), el('p', {}, 'Сведения о человеке у третьих лиц (приставы, бывшие работодатели) получают только с его письменного согласия (ст. 86 ТК РФ).')));
      });
    }

    function sorting() {
      return new Promise((done) => {
        prog.textContent = '3/4 · Досье';
        body.innerHTML = '';
        side.innerHTML = '';
        const cards = [];
        const grid = el('div', { class: 'hr-dossier' });
        for (const c of CANDIDATES_4) {
          const col = el('div', { class: 'hr-dos-col' }, el('div', { class: 'hr-check-head' }, ava(c.look, 'neutral', 'hr-q-ava'), el('b', {}, `${c.name}, ${c.age}`)));
          for (const fnd of c.findings) {
            const bins = el('div', { class: 'hr-bins' });
            const card = el('div', { class: 'hr-find' }, el('div', { class: 'hr-find-t' }, el('span', {}, fnd.icon), el('span', {}, fnd.text)), bins);
            for (const bn of BINS) {
              const b = el('button', { class: 'hr-bin', title: `${bn.name}: ${bn.desc}` }, `${bn.icon} ${bn.short}`);
              b.addEventListener('click', () => {
                if (checked) return;
                audio.click();
                card.dataset.pick = bn.id;
                bins.querySelectorAll('.hr-bin').forEach((x) => x.classList.toggle('on', x === b));
                card.classList.add('picked');
                check.disabled = cards.some((x) => !x.el.dataset.pick);
              });
              bins.append(b);
            }
            cards.push({ el: card, fnd, c });
            col.append(card);
          }
          grid.append(col);
        }
        const check = el('button', { class: 'btn primary big', disabled: true }, '🔎 Проверить разбор');
        body.append(el('h3', { class: 'hr-h' }, '🗂 Досье от службы безопасности: разложи находки'), hint(ctx, 'Служба безопасности проверила кандидатов с их согласия. Реши, что из найденного важно для работы инкассатора, а что учитывать нельзя'), grid);
        side.append(el('h4', {}, '🗂 Как разложить'), ...BINS.map((b) => el('div', { class: 'hr-bin-legend' }, el('b', {}, `${b.icon} ${b.name}`), el('small', {}, b.desc))), check);
        setTimeout(() => tour('hr_dossier'), 450);
        let checked = false;
        check.addEventListener('click', async () => {
          if (checked) return;
          checked = true;
          audio.click();
          check.disabled = true;
          for (const x of cards) {
            const right = x.el.dataset.pick === x.fnd.bin;
            chk.sortTotal++;
            if (right) chk.sortRight++;
            x.el.classList.add(right ? 'right' : 'wrong');
            x.el.querySelectorAll('.hr-bin').forEach((b) => (b.disabled = true));
            const correct = BINS.find((b) => b.id === x.fnd.bin);
            x.el.append(el('small', { class: 'hr-why' }, `${right ? '✓' : `✗ Верно: ${correct.icon} ${correct.name}.`} ${x.fnd.why || ''}`));
            if (right && x.fnd.k) learn(x.fnd.k);
            right ? audio.blip(760) : audio.wrong();
            await sleep(160);
          }
          const nx = el('button', { class: 'btn primary' }, 'К решению →');
          side.append(el('p', { class: 'muted small' }, `Верно: ${chk.sortRight} из ${chk.sortTotal}`), nx);
          nx.addEventListener('click', () => (audio.click(), done()));
        });
      });
    }

    function decide() {
      return new Promise((done) => {
        prog.textContent = '4/4 · Решение';
        body.innerHTML = '';
        side.innerHTML = '';
        const list = el('div', { class: 'hr-offers' }, CANDIDATES_4.map((c) => el('button', { class: 'hr-offer', 'data-id': c.id }, ava(c.look, 'neutral', 'hr-q-ava'), el('div', {}, el('b', {}, `${c.name}, ${c.age}`), el('div', { class: 'hr-mini' }, c.findings.map((f) => el('span', {}, f.icon)))))));
        const none = el('button', { class: 'btn ghost' }, '🙅 Никого');
        const talk = el('div', { class: 'hr-talk' });
        body.append(el('h3', { class: 'hr-h' }, '🤝 Кого берём в инкассаторы?'), list, none, talk);
        const anton = CANDIDATES_4.find((c) => c.talk);
        side.append(el('h4', {}, '💬 Поговорить'), el('button', { class: 'btn ghost small', onClick: (e) => { audio.click(); e.currentTarget.disabled = true; talk.append(el('div', { class: 'line gran' }, el('p', {}, anton.talk))); chk.talked = true; } }, `💬 Обсудить долг с ${anton.name}ом`));
        const pick = async (id) => {
          audio.click();
          list.querySelectorAll('button').forEach((x) => (x.disabled = true));
          none.disabled = true;
          chk.hired = id;
          const c = CANDIDATES_4.find((x) => x.id === id);
          list.after(el('div', { class: `decided ${id ? 'approve' : 'refuse'}` }, id ? `🤝 В бригаду — ${c.name}` : '🙅 Ищем дальше', el('small', {}, 'Что будет дальше — через три месяца ⏳')));
          id ? audio.coin() : audio.stamp();
          await sleep(1200);
          done();
        };
        list.querySelectorAll('.hr-offer').forEach((b) => b.addEventListener('click', () => pick(b.dataset.id)));
        none.addEventListener('click', () => pick(null));
      });
    }
  });
}

// ═══════════════════════ Смена 5: первый день стажёрки ═══════════════════════
export function runOnboard(ctx) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const s = story(ctx.state);
  const onb = {};
  return new Promise((resolve) => {
    const panel = openPanel('hr onb');
    const prog = el('span', { class: 'term-progress' }, '1/3 · План дня');
    panel.append(termBar('HR · Первый день стажёрки', ctx, prog));
    const body = el('div', { class: 'hr-onb-body' });
    const side = el('div', { class: 'hr-side' });
    panel.append(el('div', { class: 'hr-grid onb' }, body, side));
    const gran = s.gran === 'saved' || s.call === 'won';
    const intro = gran ? 'Маша, 18 лет, первокурсница. Та самая внучка Валентины Петровны: «Бабушка столько про вас рассказывала — я тоже хочу помогать людям!»' : 'Маша, 18 лет, первокурсница-экономист. Летняя стажировка операционистом. Очень волнуется.';
    (async () => {
      await plan();
      await access();
      await talk();
      data.onb = onb;
      resolve(null);
    })();

    function plan() {
      return new Promise((done) => {
        const slots = DAY_SLOTS.map((t) => ({ t, card: null }));
        const slotEls = el('div', { class: 'onb-slots' });
        const pool = el('div', { class: 'onb-pool' });
        const fb = el('div', { class: 'feedback' });
        const ok = el('button', { class: 'btn primary big', disabled: true }, '✅ План готов');
        const draw = () => {
          slotEls.innerHTML = '';
          slots.forEach((sl, i) =>
            slotEls.append(
              el('button', { class: `onb-slot${sl.card ? ' full' : ''}`, onClick: () => { if (!sl.card) return; audio.click(); sl.card = null; draw(); } }, el('span', { class: 'onb-t' }, sl.t), sl.card ? el('span', {}, `${sl.card.icon} ${sl.card.text}`) : el('small', {}, i === slots.findIndex((x) => !x.card) ? '← выбери дело справа' : '…')),
            ),
          );
          pool.querySelectorAll('.onb-card').forEach((b) => b.classList.toggle('used', slots.some((sl) => sl.card?.id === b.dataset.id)));
          ok.disabled = slots.some((sl) => !sl.card);
        };
        for (const cd of DAY_CARDS) {
          const b = el('button', { class: 'onb-card', 'data-id': cd.id }, el('span', {}, cd.icon), cd.text);
          b.addEventListener('click', () => {
            if (slots.some((sl) => sl.card?.id === cd.id)) return;
            const free = slots.find((sl) => !sl.card);
            if (!free) return;
            audio.click();
            free.card = cd;
            draw();
          });
          pool.append(b);
        }
        body.append(el('div', { class: 'onb-intro' }, el('div', { class: 'hr-ava big', html: person(LOOKS.masha, 'worried') }), el('p', {}, intro)), el('h3', { class: 'hr-h' }, '🗓 Составь первый день Маши'), el('div', { class: 'onb-plan' }, slotEls, pool), fb);
        side.append(hint(ctx, '🗓 Новичку важно: пропуск и место, наставник, безопасность, команда — и разговор в конце дня. Не бросай его сразу «в бой».'), ok);
        draw();
        setTimeout(() => tour('hr_onb'), 450);
        ok.addEventListener('click', async () => {
          audio.click();
          ok.disabled = true;
          const chosen = slots.map((sl) => sl.card);
          onb.planGood = chosen.filter((c) => c.good).length;
          onb.planBad = chosen.filter((c) => !c.good);
          onb.passFirst = chosen[0]?.first === true;
          onb.talkLast = chosen[5]?.last === true;
          fb.innerHTML = '';
          const notes = [...onb.planBad.map((c) => `✗ ${c.icon} ${c.why}`), onb.passFirst ? null : '⚠️ Сначала — пропуск и рабочее место: без них никуда', onb.talkLast ? null : '💡 Разговор «как прошёл день» лучше ставить в конце'].filter(Boolean);
          fb.append(el('div', { class: `fb ${notes.length ? 'bad' : 'good'}` }, notes.length ? notes.join(' · ') : '✅ Отличный первый день: спокойно, по шагам, с людьми'));
          notes.length ? audio.wrong() : audio.success();
          if (!onb.planBad.length) learn('k_h_onboard');
          await sleep(notes.length ? 2600 : 1400);
          done();
        });
      });
    }

    function access() {
      return new Promise((done) => {
        prog.textContent = '2/3 · Доступы';
        body.innerHTML = '';
        side.innerHTML = '';
        const picked = new Set();
        const list = el('div', { class: 'hr-req-list' });
        for (const a of ACCESS_ITEMS) {
          const b = el('button', { class: 'hr-rq' }, el('span', {}, a.icon), el('b', {}, a.text), el('i', {}, ''));
          b.addEventListener('click', () => {
            audio.click();
            picked.has(a.id) ? picked.delete(a.id) : picked.add(a.id);
            b.classList.toggle('on', picked.has(a.id));
            b.querySelector('i').textContent = picked.has(a.id) ? '✓' : '';
          });
          list.append(b);
        }
        const send = el('button', { class: 'btn primary big' }, '📨 Заявка в IT');
        const fb = el('div', { class: 'feedback' });
        body.append(el('h3', { class: 'hr-h' }, '🔐 Заявка на доступы для Маши'), el('p', { class: 'muted' }, 'Заявку исполнит DevOps-инженер. Отметь, что нужно стажёру-операционисту на первые недели.'), list, fb);
        side.append(send);
        send.addEventListener('click', async () => {
          audio.click();
          send.disabled = true;
          onb.accessRight = ACCESS_ITEMS.filter((a) => a.need === picked.has(a.id)).length;
          onb.accessExtra = ACCESS_ITEMS.filter((a) => !a.need && picked.has(a.id)).length;
          onb.accessMiss = ACCESS_ITEMS.filter((a) => a.need && !picked.has(a.id)).length;
          story(ctx.state).mashaAccess = [...picked];
          list.querySelectorAll('.hr-rq').forEach((b, i) => {
            const a = ACCESS_ITEMS[i];
            const right = a.need === picked.has(a.id);
            b.disabled = true;
            b.classList.add(right ? 'right' : 'wrong');
            if (a.why && picked.has(a.id)) b.append(el('small', {}, a.why));
          });
          const allRight = onb.accessRight === ACCESS_ITEMS.length;
          fb.append(el('div', { class: `fb ${allRight ? 'good' : 'bad'}` }, allRight ? '✅ Ровно то, что нужно. Лишний доступ — лишний риск' : `${onb.accessExtra ? '⚠️ Лишние доступы — риск утечки. ' : ''}${onb.accessMiss ? '⚠️ Без нужного доступа стажёр весь день просидит без дела.' : ''}`));
          allRight ? audio.success() : audio.wrong();
          await sleep(allRight ? 1300 : 2400);
          done();
        });
      });
    }

    function talk() {
      return new Promise((done) => {
        prog.textContent = '3/3 · Вечер';
        body.innerHTML = '';
        side.innerHTML = '';
        const box = el('div', { class: 'cr-talk' });
        body.append(el('h3', { class: 'hr-h' }, '💬 17:00 — Маша заглянула в кабинет'), box);
        side.append(hint(ctx, '🤝 Поддержи и помоги разложить по шагам. Давить в первый день — верный способ потерять человека.'));
        runDialog(box, ctx, { name: 'Маша, стажёр', look: LOOKS.masha, script: MASHA_TALK }).then(async (r) => {
          onb.trust = r.trust;
          onb.won = r.won;
          setBeat(ctx.state, 'masha', r.won ? 'stayed' : 'left');
          await sleep(500);
          done();
        });
      });
    }
  });
}

// ═══════════════════════ Календарь: испытательный срок ═══════════════════════
const OUT = {
  olga: ['green', 'Ольга Викторовна — лучший операционист квартала: ни одной ошибки в кассе, клиенты пишут благодарности 💐'],
  timur: ['yellow', 'Тимур освоился, но дважды ошибся в реквизитах. Наставник помогает — растёт.'],
  ruslan: ['red', 'На второй неделе Руслан пытался выгрузить базу клиентов. Служба безопасности остановила — уволен. Утечку едва предотвратили 😱'],
  none1: ['grey', 'Вакансия провисела ещё месяц — коллеги работали за двоих.'],
  denis: ['green', 'Денис за три месяца остановил две мошеннические заявки, а его заёмщики платят вовремя.'],
  veronika: ['red', 'Вероника одобряла кредиты всем подряд ради плана — треть ушла в просрочку. Испытательный срок не прошла.'],
  none3: ['grey', 'Кредитный отдел месяц работал без эксперта — очередь на заявки выросла.'],
  sergey: ['green', 'Сергей — надёжный и спокойный. Его бригада ни разу не опоздала на маршрут.'],
  anton: ['green', 'С Антоном договорились о графике погашения долга. Работает аккуратно — и долг почти закрыт.'],
  igor: ['red', 'Игоря не допустили к служебному оружию: непогашенная судимость. Договор расторгли, бригада месяц работала втроём.'],
  none4: ['grey', 'Бригада инкассаторов месяц работала втроём вместо четверых.'],
};
export function runProbation(ctx, shift) {
  const { audio } = ctx;
  const data = store(ctx);
  const learn = LEARN(ctx, data.learned);
  const n = shift.n;
  const cons = [];
  const stats = [];
  let points = 0;
  learn('k_h_probation');
  if (n === 1) {
    const vac = data.vac || { missed: 0, wrong: 0 };
    const iv = data.iv || {};
    const ck = data.checks || { consentFirst: true, traps: 0 };
    if (vac.missed === 0) {
      points += 1;
      cons.push(['good', '📢', 'Честная вакансия: 37 откликов, никаких жалоб и штрафов.']);
    } else cons.push(['bad', '📢', `В вакансии осталось нарушений: ${vac.missed}. Кандидат пожаловался — банку выписали штраф и попросили переписать объявление.`]);
    if (!iv.illegal) {
      points += 1;
      cons.push(['good', '🗣', 'На собеседованиях — только вопросы по делу. Кандидаты ушли с хорошим впечатлением о банке.']);
    } else cons.push(['bad', '🗣', `Запретных вопросов: ${iv.illegal}. Кандидатка рассказала об этом в соцсетях — неприятно для репутации банка.`]);
    const o = OUT[iv.hired || 'none1'];
    cons.push([o[0] === 'green' ? 'good' : o[0] === 'red' ? 'bad' : 'warn', '⏳', o[1]]);
    points += iv.hired === 'olga' ? 1.5 : iv.hired === 'timur' ? 0.8 : 0;
    if (iv.reported) {
      points += 0.5;
      cons.push(['good', '🛡', 'Данные Руслана помогли службе безопасности: он вербовал «дропов» для сети мошенников. Ещё одна ниточка к их куратору.']);
    } else if (iv.hired !== 'ruslan') cons.push(['warn', '🕵️', 'Руслан ушёл искать работу в другой банк. Жаль, что про него не узнала служба безопасности.']);
    if (!ck.consentFirst) {
      points -= 0.5;
      cons.push(['warn', '✍️', 'Проверку начали без согласия кандидата — так нельзя, юрист сделал замечание.']);
    }
    stats.push(['📢', `${4 - (vac.missed || 0)}/4`, 'нарушений убрано'], ['🗣', String(iv.illegal || 0), 'запретных вопросов'], ['🤝', iv.hired ? CANDIDATES_1.find((c) => c.id === iv.hired).name : '—', 'принят(а)']);
  }
  if (n === 2) {
    const sc = data.screen || { decisions: [] };
    const right = sc.decisions.filter((d) => d.right).length;
    points = right >= 9 ? 3.5 : right >= 7 ? 2.2 : 1;
    for (const d of sc.decisions) {
      const r = RESUMES.find((x) => x.id === d.id);
      if (d.invite) cons.push([r.invite ? 'good' : 'warn', r.invite ? '✅' : '⚠️', `${r.name}: ${r.later}`]);
      else if (r.invite) cons.push(['bad', '😔', `${r.name} ${r.f ? 'получила отказ — и ушла' : 'получил отказ — и ушёл'} в другой банк. ${r.why}`]);
    }
    if (sc.blind) cons.push(['good', '🙈', 'Слепой отбор: решения — только по навыкам.']);
    stats.push(['✅', `${right}/${sc.decisions.length}`, 'верных решений'], ['📨', String(sc.decisions.filter((d) => d.invite).length), 'приглашено'], ['🙈', sc.blind ? 'да' : 'нет', 'слепой режим']);
  }
  if (n === 3) {
    const iv = data.iv || {};
    const o = OUT[iv.hired || 'none3'];
    cons.push([o[0] === 'green' ? 'good' : o[0] === 'red' ? 'bad' : 'warn', '⏳', o[1]]);
    points += iv.hired === 'denis' ? 2 : 0;
    if (!iv.illegal) points += 1;
    else cons.push(['bad', '💍', 'Вопрос про семейное положение — кандидат пожаловался руководителю.']);
    if (data.pressure === 'facts') {
      points += 0.5;
      cons.push(['good', '😇', 'Ты не поддался(ась) эффекту ореола: решение — по фактам, а не по диплому.']);
    }
    const q = iv.quality || {};
    stats.push(['⭐', `${Math.round((q.denis || 0) * 100)}%`, 'STAR у Дениса'], ['⭐', `${Math.round((q.veronika || 0) * 100)}%`, 'STAR у Вероники'], ['🗣', String(iv.illegal || 0), 'запретных вопросов']);
  }
  if (n === 4) {
    const ck = data.chk || {};
    const o = OUT[ck.hired || 'none4'];
    cons.push([o[0] === 'green' ? 'good' : o[0] === 'red' ? 'bad' : 'warn', '⏳', o[1]]);
    points += ck.hired === 'sergey' ? 1.5 : ck.hired === 'anton' ? (ck.talked ? 1.3 : 1) : 0;
    if (!ck.reqWrong && !ck.reqMissing) {
      points += 1;
      cons.push(['good', '📨', 'Запрос в СБ — ровно по закону: справка о несудимости, медкомиссия, долги. Ничего лишнего.']);
    } else cons.push(['warn', '📨', 'В запросе были ошибки — СБ вернула его на доработку, потеряли день.']);
    const acc = ck.sortTotal ? ck.sortRight / ck.sortTotal : 0;
    if (acc >= 0.8) points += 1;
    cons.push([acc >= 0.8 ? 'good' : 'warn', '🗂', `Досье разобрано верно на ${Math.round(acc * 100)}%. ${acc >= 0.8 ? 'Ни один человек не пострадал из-за чужих ошибок или родственников.' : 'Кто-то мог пострадать из-за того, что к работе не относится.'}`]);
    stats.push(['🗂', `${ck.sortRight || 0}/${ck.sortTotal || 0}`, 'находок разложено верно'], ['📨', ck.reqWrong || ck.reqMissing ? '✗' : '✓', 'запрос в СБ'], ['🤝', ck.hired ? CANDIDATES_4.find((c) => c.id === ck.hired).name : '—', 'принят']);
  }
  if (n === 5) {
    const o = data.onb || {};
    const planOk = (o.planBad || []).length === 0;
    if (planOk) points += 1;
    if (o.accessRight === ACCESS_ITEMS.length) points += 1;
    if (o.won) points += 1.5;
    cons.push(o.won ? ['good', '🎒', 'Маша прошла испытательный срок и осталась в банке. «Здесь меня не бросили одну — это главное».'] : ['bad', '🎒', 'Через две недели Маша ушла: «Я так и не поняла, справляюсь ли». Первые дни решают многое.']);
    cons.push([planOk ? 'good' : 'warn', '🗓', planOk ? 'Первый день прошёл спокойно: наставник, команда, инструктаж.' : 'В первый день было слишком много стресса.']);
    cons.push([o.accessRight === ACCESS_ITEMS.length ? 'good' : 'warn', '🔐', o.accessExtra ? 'Лишние доступы DevOps-инженер потом отозвал на проверке прав.' : o.accessMiss ? 'Без нужного доступа Маша полдня просидела без дела.' : 'Доступы — ровно по работе. DevOps-инженер выдал их за 10 минут.']);
    stats.push(['💚', `${o.trust ?? 0}`, 'доверие Маши'], ['🗓', `${o.planGood ?? 0}/6`, 'дел в плане по делу'], ['🔐', `${o.accessRight ?? 0}/${ACCESS_ITEMS.length}`, 'доступов верно']);
  }
  const starsN = points >= 3.4 ? 3 : points >= 2 ? 2 : 1;
  const score = Math.round(points * 120);

  return new Promise((resolve) => {
    const panel = openPanel('hr prob');
    panel.append(termBar(n === 2 || n === 5 ? 'Месяц спустя' : 'Испытательный срок · 3 месяца спустя', ctx));
    const cal = el('div', { class: 'calendar' }, el('div', { class: 'cal-page' }, el('small', {}, 'прошло'), el('b', {}, n === 2 || n === 5 ? '1' : '3'), el('span', {}, n === 2 || n === 5 ? 'месяц' : 'месяца')));
    const cards = el('div', { class: 'pf-cards' });
    const btn = el('button', { class: 'btn primary big hidden' }, 'Готово');
    panel.append(el('div', { class: 'pf-body' }, cal, cards, btn));
    audio.whoosh();
    (async () => {
      await sleep(1100);
      for (const [kind, icon, text] of cons) {
        cards.append(el('div', { class: `pf-card ${kind === 'good' ? 'green' : kind === 'bad' ? 'red' : 'yellow'}` }, el('span', { class: 'pf-ava big-ico' }, icon), el('div', {}, el('p', {}, text))));
        kind === 'good' ? audio.coin() : kind === 'bad' ? audio.wrong() : audio.blip(400);
        await sleep(520);
      }
      btn.classList.remove('hidden');
      starsN === 3 ? (audio.bigWin(), flash('green')) : audio.success();
    })();
    btn.addEventListener('click', () => {
      audio.click();
      ctx.addScore(score);
      const learned = [...new Set(data.learned)];
      ctx.prof.data.hr = null;
      resolve({
        stars: starsN,
        score,
        learned,
        consequencesTitle: n === 2 || n === 5 ? 'Месяц спустя…' : 'Три месяца спустя…',
        consequences: cons.map(([kind, icon, text]) => ({ icon, text, kind })),
        stats,
      });
    });
  });
}
