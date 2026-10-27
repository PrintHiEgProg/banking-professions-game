// Экраны вне смен: карточка кабинета, терминал очереди, разбор смены, итоги профессии, альбом, сертификат.
import { BRIEF, FINALE } from './data/chapter1.js';
import { PROFESSIONS, KNOWLEDGE, KNOWLEDGE_GROUPS, knowledgeOf, RANK_NAMES } from './data/professions.js';
import { audio } from './audio.js';
import { el, sleep, openPanel, closePanel, typeText, skipTyping, starsEl, knowledgeCard, num, VOICE } from './ui.js';
import { portrait, avatarSvg, person } from './portraits.js';
import { MENTOR, weekSummary, thanksNotes } from './story.js';
import { LIKES } from './data/career.js';
import { brandImg } from './brand.js';

export function overlay(cls) {
  const box = el('div', { class: `screen-card ${cls}` });
  const wrap = el('div', { class: 'screen-wrap' }, box);
  document.body.append(wrap);
  const show = () => wrap.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(show));
  // на медленном компьютере кадры 3D могут идти редко — окно всё равно должно появиться
  setTimeout(show, 150);
  const close = () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 350);
  };
  return { box, close, wrap };
}

// «★★☆»: защита от странных чисел в старых сохранениях
const starText = (n) => {
  const k = Math.max(0, Math.min(3, Math.round(Number(n) || 0)));
  return '★'.repeat(k) + '☆'.repeat(3 - k);
};

export const profStars = (ps) => Object.values(ps?.best || {}).reduce((s, b) => s + b.stars, 0);
export const profDone = (ps) => Object.keys(ps?.best || {}).length;
const rankOf = (stars) => RANK_NAMES.find(([min]) => stars >= min)[1];

// Полоса из 5 навыков профессии: пройденные смены подсвечены
export function skillStrip(prof, ps, highlight = 0) {
  return el(
    'div',
    { class: 'skill-strip' },
    prof.shifts.map((s) => {
      const best = ps?.best[s.n];
      return el(
        'div',
        { class: `skill${best ? ' done' : ''}${s.n === highlight ? ' now' : ''}` },
        el('span', { class: 'skill-ico' }, s.icon),
        el('small', {}, s.skill),
        best ? el('span', { class: 'skill-stars' }, '★'.repeat(Math.max(0, Math.min(3, Math.round(Number(best.stars) || 0))))) : null,
      );
    }),
  );
}

function lifeRows(prof) {
  return el('div', { class: 'prof-rows' }, prof.life.map(([i, t, d]) => el('div', {}, el('span', {}, i), el('b', {}, t), el('span', {}, d))));
}

// Карточка у двери кабинета в холле
export function professionCard(prof, ps) {
  return new Promise((resolve) => {
    const { box, close } = overlay('prof-card');
    box.style.setProperty('--pc', prof.color);
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    const done = profDone(ps);
    box.append(
      el('div', { class: 'pc-icon' }, prof.icon),
      el('h1', {}, prof.full),
      el('p', { class: 'si-goal' }, prof.tagline),
      skillStrip(prof, ps),
      el('div', { class: 'pc-progress' }, done ? `★ ${profStars(ps)} / 15 · пройдено смен: ${done}/5` : '5 смен · 5 сторон профессии'),
      el('div', { class: 'row center' }, el('button', { class: 'btn ghost', onClick: () => pick(false) }, '← Назад'), el('button', { class: 'btn primary big', onClick: () => pick(true) }, '🚪 Войти в кабинет')),
    );
    audio.notify();
  });
}

// Терминал электронной очереди: быстрый выбор профессии
export function kioskMenu(progress) {
  return new Promise((resolve) => {
    const { box, close } = overlay('kiosk');
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    box.append(
      el('div', { class: 'si-top' }, '🎫 ЭЛЕКТРОННАЯ ОЧЕРЕДЬ'),
      el('h2', {}, 'Выбери профессию'),
      el(
        'div',
        { class: 'kiosk-list' },
        PROFESSIONS.map((p) => {
          const ps = progress.profs[p.id];
          return el(
            'button',
            { class: 'kiosk-btn', style: { '--pc': p.color }, onClick: () => pick(p.id) },
            el('span', { class: 'kb-ico' }, p.icon),
            el('span', { class: 'kb-text' }, el('b', {}, p.full), el('small', {}, p.tagline)),
            el('span', { class: 'kb-stars' }, profDone(ps) ? `★ ${profStars(ps)}` : 'новое'),
          );
        }),
      ),
      el('button', { class: 'btn ghost', onClick: () => pick(null) }, 'Закрыть'),
    );
    audio.notify();
  });
}

// Хаб внутри кабинета: смены профессии
export function cabinetCard(prof, ps) {
  return new Promise((resolve) => {
    const { box, close } = overlay('cabinet');
    box.style.setProperty('--pc', prof.color);
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    const next = Math.min(Math.max(1, Number(ps.shift) || 1), 5);
    box.append(
      el('div', { class: 'si-top' }, `КАБИНЕТ · ${prof.full.toUpperCase()}`),
      el('h1', {}, `${prof.icon} ${prof.title}`),
      el(
        'div',
        { class: 'shift-map' },
        prof.shifts.map((s) => {
          const open = s.n <= ps.unlocked;
          const best = ps.best[s.n];
          const card = el(
            'button',
            { class: `map-card${open ? '' : ' locked'}${s.n === next ? ' current' : ''}`, disabled: !open },
            el('span', { class: 'map-n' }, String(s.n)),
            el('span', { class: 'map-ico' }, open ? s.icon : '🔒'),
            el('b', {}, s.title),
            el('small', {}, s.skill),
            el('span', { class: 'map-stars' }, best ? starText(best.stars) : ''),
          );
          if (open) card.addEventListener('click', () => pick(s.n));
          return card;
        }),
      ),
      el('h4', {}, 'А в жизни'),
      lifeRows(prof),
      el(
        'div',
        { class: 'row center' },
        el('button', { class: 'btn ghost', onClick: () => pick('lobby') }, '← В холл'),
        el('button', { class: 'btn primary big', onClick: () => pick(next) }, ps.stage ? `▶ Продолжить смену ${next}` : `▶ Смена ${next}: ${prof.shifts[next - 1].title}`),
      ),
    );
  });
}

export function shiftIntro(prof, shift) {
  return new Promise((resolve) => {
    const { box, close } = overlay('intro-card-shift');
    box.style.setProperty('--pc', prof.color);
    const go = () => {
      audio.click();
      close();
      resolve();
    };
    box.append(
      el('div', { class: 'si-top' }, `${prof.icon} ${prof.title.toUpperCase()} · СМЕНА ${shift.n}/5 · ${shift.day.toUpperCase()}, ${shift.time}`),
      el('div', { class: 'si-icon' }, shift.icon),
      el('h1', {}, shift.title),
      el('div', { class: 'si-skill' }, `Навык: ${shift.skill}`),
      el('p', { class: 'si-goal' }, shift.goal),
      el('div', { class: 'si-bullets' }, shift.bullets.map(([i, t]) => el('div', {}, el('span', {}, i), el('b', {}, t)))),
      el('button', { class: 'btn primary big', onClick: go }, '▶ Начать смену'),
    );
    audio.stamp();
    box.querySelector('button').focus({ preventScroll: true });
  });
}

export function debrief(prof, shift, res, ps, isLast, plot = [], promo = null, onLike = null) {
  return new Promise((resolve) => {
    const { box, close } = overlay('debrief');
    box.style.setProperty('--pc', prof.color);
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    const learned = (res.learned || []).filter((k) => KNOWLEDGE[k]);
    const cons = res.consequences || [];
    const add = (...kids) => box.append(...kids.filter(Boolean));
    add(
      el('div', { class: 'si-top' }, `✓ ${prof.title.toUpperCase()} · СМЕНА ${shift.n} ЗАВЕРШЕНА`),
      el('h1', {}, `${shift.icon} ${shift.title}`),
      starsEl(res.stars || 1),
      el('div', { class: 'db-stats' }, (res.stats || []).map(([i, v, l]) => el('div', {}, el('span', { class: 'db-ico' }, i), el('b', {}, v), el('small', {}, l)))),
      cons.length ? el('h4', {}, res.consequencesTitle || 'Через пару дней…') : null,
      cons.length ? el('div', { class: 'cons-list' }, cons.map((c) => el('div', { class: `cons ${c.kind || ''}` }, el('span', {}, c.icon), el('p', {}, c.text)))) : null,
      promo ? el('div', { class: 'promo' }, el('b', {}, `🎉 Повышение: ${promo.rank}!`), el('small', {}, 'Звёзды за смены складываются в звание. Твой пропуск обновлён'), badgeEl(promo.progress)) : null,
      plot.length ? el('h4', {}, '🧵 Сюжет недели') : null,
      plot.length ? el('div', { class: 'cons-list' }, plot.map(([i, t]) => el('div', { class: 'cons story' }, el('span', {}, i), el('p', {}, t)))) : null,
      learned.length ? el('h4', {}, 'Новые знания') : null,
      learned.length ? el('div', { class: 'k-grid' }, learned.map((k) => knowledgeCard(KNOWLEDGE[k], true))) : null,
      el('h4', {}, 'Профессия по кусочкам'),
      skillStrip(prof, ps, shift.n),
      onLike ? likeRow(ps.like, onLike) : null,
      el(
        'div',
        { class: 'row center' },
        el('button', { class: 'btn ghost', onClick: () => pick('cabinet') }, '← В кабинет'),
        el('button', { class: 'btn ghost db-retry', title: 'Сыграть эту смену ещё раз — в зачёт идёт лучший результат', onClick: () => pick('retry') }, '↻ Переиграть'),
        el('button', { class: 'btn primary big', onClick: () => pick('next') }, isLast ? 'Итоги профессии →' : 'Следующая смена →'),
      ),
      el('div', { class: 'db-saved' }, (res.stars || 1) < 3 ? '💾 Прогресс сохранён · переиграй смену, чтобы собрать ★★★ — в зачёт идёт лучший результат' : '💾 Прогресс сохранён'),
    );
    audio.bigWin();
  });
}

// «Как тебе эта работа?» — один тап, ответ идёт в профиль стажёра
function likeRow(current, onLike) {
  const row = el('div', { class: 'like-row', role: 'radiogroup', 'aria-label': 'Как тебе эта работа?' }, el('span', {}, 'Как тебе эта работа?'));
  for (const [v, icon, label] of LIKES) {
    row.append(
      el('button', {
        class: `like-btn${current === v ? ' on' : ''}`,
        role: 'radio',
        'aria-checked': current === v ? 'true' : 'false',
        title: label,
        onClick: (e) => {
          audio.click();
          for (const b of row.querySelectorAll('.like-btn')) {
            b.classList.toggle('on', b === e.currentTarget);
            b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false');
          }
          onLike(v);
        },
      }, el('span', {}, icon), el('small', {}, label)),
    );
  }
  return row;
}

export function professionSummary(prof, ps, diff, allDone) {
  return new Promise((resolve) => {
    const { box, close } = overlay('summary-card-wrap');
    box.style.setProperty('--pc', prof.color);
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    const stars = profStars(ps);
    const score = Math.round(Object.values(ps.best).reduce((s, b) => s + b.score, 0) * diff.scoreMul);
    box.append(
      el('div', { class: 'si-top' }, `${prof.icon} ВСЕ 5 СМЕН ПРОЙДЕНЫ`),
      el('div', { class: 'sum-prof' }, prof.full),
      el('h1', { class: 'rank' }, `${rankOf(stars)} · ${prof.title.toLowerCase()}`),
      el('div', { class: 'sum-line' }, el('b', {}, `★ ${stars} / 15`), el('span', {}, `${num(score)} очков · «${diff.name}» ×${diff.scoreMul}`)),
      el('h4', {}, 'Чем занимается специалист'),
      skillStrip(prof, ps),
      lifeRows(prof),
      el(
        'div',
        { class: 'row center' },
        el('button', { class: 'btn ghost', onClick: () => pick('cabinet') }, '← В кабинет'),
        el('button', { class: 'btn primary big', onClick: () => pick('lobby') }, allDone ? '🏆 Получить сертификат' : '🚪 В холл — к другой профессии'),
      ),
    );
    audio.bigWin();
  });
}

// Сертификат за все профессии: какая подошла лучше всего
export function certificate(progress) {
  return new Promise((resolve) => {
    const { box, close } = overlay('certificate');
    const rows = PROFESSIONS.map((p) => [p, profStars(progress.profs[p.id])]).sort((a, b) => b[1] - a[1]);
    const best = rows[0][0];
    const week = weekSummary(progress);
    box.append(
      brandImg('cert-brand'),
      el('div', { class: 'si-top' }, '🏆 СЕРТИФИКАТ СТАЖЁРА'),
      el('h1', {}, progress.nickname),
      el('p', { class: 'si-goal' }, `Пройдены все ${PROFESSIONS.length} профессий банка`),
      el('div', { class: 'cert-mentor' }, el('span', { class: 'cm-ava', html: portrait('mentor', 'happy') }), el('p', {}, el('b', {}, `${MENTOR.name}: `), `«${progress.nickname}, банк держится на людях — внимательных, честных и смелых. Приходи к нам после колледжа или вуза: место стажёра за тобой»`)),
      week.length ? el('h4', {}, '🧵 Как прошла неделя') : null,
      week.length ? el('div', { class: 'cons-list' }, week.map((w) => el('div', { class: `cons ${w.good ? 'good' : 'bad'}` }, el('span', {}, w.icon), el('p', {}, w.text)))) : null,
      el('div', { class: 'cert-list' }, rows.map(([p, s]) => el('div', { style: { '--pc': p.color } }, el('span', {}, p.icon), el('b', {}, p.full), el('span', { class: 'kb-stars' }, `★ ${s}/15`)))),
      el('div', { class: 'cert-best', style: { '--pc': best.color } }, el('small', {}, 'Лучше всего получилось'), el('b', {}, `${best.icon} ${best.full}`)),
      el('div', { class: 'row center' }, el('button', { class: 'btn ghost', onClick: () => { audio.click(); close(); resolve(); } }, 'В холл'), el('button', { class: 'btn primary', onClick: () => { audio.click(); close(); resolve('profile'); } }, '🧭 Профиль стажёра')),
    );
    audio.bigWin();
  });
}

export function album(progress) {
  return new Promise((resolve) => {
    const { box, close } = overlay('album');
    const total = Object.keys(KNOWLEDGE).length;
    const known = Object.keys(KNOWLEDGE).filter((k) => progress.knowledge.includes(k)).length;
    box.append(el('h2', {}, `📒 Знания ${known}/${total}`));
    for (const [pid] of KNOWLEDGE_GROUPS) {
      const p = PROFESSIONS.find((x) => x.id === pid);
      const ids = knowledgeOf(pid);
      const have = ids.filter((k) => progress.knowledge.includes(k)).length;
      box.append(
        el('h4', { class: 'album-h', style: { '--pc': p.color } }, `${p.icon} ${p.full} · ${have}/${ids.length}`),
        el(
          'div',
          { class: 'k-grid' },
          ids.map((k) => (progress.knowledge.includes(k) ? knowledgeCard(KNOWLEDGE[k]) : el('div', { class: 'k-card locked' }, el('span', { class: 'k-icon' }, '?'), el('div', {}, el('b', {}, '???'), el('span', {}, 'ещё не открыто'))))),
        ),
      );
    }
    box.append(el('button', { class: 'btn primary', onClick: () => { audio.click(); close(); resolve(); } }, 'Закрыть'));
  });
}

// Разговор с наставником в холле: приветствие, новости отделения, совет
export function mentorTalk(progress, { lines = [], news = [], tip = null, btn = 'Понятно', emo = 'happy', extra = null } = {}) {
  return new Promise((resolve) => {
    const panel = openPanel('brief mentor');
    const body = el('div', { class: 'brief-lines' });
    const button = el('button', { class: 'btn primary hidden' }, btn);
    panel.append(
      el(
        'div',
        { class: 'brief-card' },
        el('div', { class: 'brief-head' }, el('div', { class: 'brief-ava speaking', html: portrait('mentor', emo) }), el('div', {}, el('b', {}, MENTOR.name), el('small', {}, `🏦 ${MENTOR.role} · наставник стажёров`))),
        body,
        button,
      ),
    );
    panel.addEventListener('click', (e) => {
      if (e.target !== button) skipTyping();
    });
    (async () => {
      for (const l of lines) {
        const p = el('p');
        body.append(p);
        await typeText(p, l.replace('{name}', progress.nickname), { speed: 14, voice: VOICE.mentor });
        await sleep(180);
      }
      if (news.length) body.append(el('h4', {}, '📰 Новости отделения'), el('div', { class: 'cons-list' }, news.map((t) => el('div', { class: 'cons story' }, el('span', {}, '🧵'), el('p', {}, t)))));
      if (tip) body.append(el('div', { class: 'mentor-tip' }, tip));
      if (extra) body.append(extra);
      panel.querySelector('.brief-ava').classList.remove('speaking');
      button.classList.remove('hidden');
      button.focus({ preventScroll: true });
    })();
    button.addEventListener('click', () => {
      audio.click();
      closePanel();
      resolve();
    });
  });
}

// Звание стажёра растёт вместе со звёздами
export function staffRank(progress) {
  const stars = PROFESSIONS.reduce((s, p) => s + profStars(progress.profs[p.id]), 0);
  // первые звания — за первые успехи; старшие — доля от всех звёзд, сколько бы ни было профессий
  const max = PROFESSIONS.length * 15;
  const r = [[Math.round(max * 0.87), 'Эксперт банка'], [Math.round(max * 0.67), 'Ведущий специалист'], [30, 'Специалист'], [10, 'Младший специалист'], [0, 'Стажёр']].find(([m]) => stars >= m)[1];
  return { stars, rank: r };
}

// Пропуск сотрудника: аватар, имя, звание
export function badgeEl(progress) {
  const { stars, rank } = staffRank(progress);
  const done = PROFESSIONS.reduce((s, p) => s + profDone(progress.profs[p.id]), 0);
  return el(
    'div',
    { class: 'staff-badge' },
    el('div', { class: 'sb-top' }, el('span', {}, '🏦 БАНК · ОТДЕЛЕНИЕ №1'), el('span', {}, 'ПРОПУСК')),
    el('div', { class: 'sb-body' }, el('div', { class: 'sb-photo', html: avatarSvg(progress.avatar || 0) }), el('div', {}, el('small', {}, 'сотрудник'), el('b', {}, progress.nickname), el('span', { class: 'sb-rank' }, rank), el('small', {}, `★ ${stars}/${PROFESSIONS.length * 15} · смен ${done}/${PROFESSIONS.length * 5}`))),
    el('div', { class: 'sb-strip' }, PROFESSIONS.map((p) => el('span', { class: profDone(progress.profs[p.id]) ? 'on' : '', style: { '--pc': p.color }, title: p.title }, p.icon))),
  );
}

export function badgeCard(progress) {
  return new Promise((resolve) => {
    const { box, close } = overlay('badge-card');
    const notes = thanksNotes(progress);
    box.append(
      el('div', { class: 'si-top' }, '🪪 МОЙ ПРОПУСК'),
      badgeEl(progress),
      el('p', { class: 'muted small' }, notes.length ? `💌 Благодарностей от клиентов: ${notes.length}. Они висят на стене в холле.` : '💌 Помоги клиентам — и они напишут тебе на стену благодарностей в холле.'),
      el('div', { class: 'row center' }, el('button', { class: 'btn ghost', onClick: () => { audio.click(); close(); resolve(); } }, 'Закрыть'), el('button', { class: 'btn primary', onClick: () => { audio.click(); close(); resolve('profile'); } }, '🧭 Профиль стажёра')),
    );
    audio.notify();
  });
}

// Стена благодарностей в холле
export function thanksBoard(progress) {
  return new Promise((resolve) => {
    const { box, close } = overlay('thanks-card');
    const notes = thanksNotes(progress);
    box.append(
      el('div', { class: 'si-top' }, '💌 СТЕНА БЛАГОДАРНОСТЕЙ'),
      el('h2', {}, notes.length ? `Тебе написали: ${notes.length}` : 'Пока пусто'),
      notes.length
        ? el('div', { class: 'notes-grid' }, notes.map((n, i) => el('div', { class: `note-card c${i % 5}` }, el('span', { class: 'nc-ico', html: n.look ? portrait(n.look, 'happy') : '' }, n.look ? '' : n.icon), el('p', {}, n.text), el('small', {}, `— ${n.from}`))))
        : el('p', { class: 'muted' }, 'Помоги клиентам в кабинетах — и они напишут сюда. Каждая записка — это человек, которому ты правда помог.'),
      el('button', { class: 'btn primary', onClick: () => { audio.click(); close(); resolve(); } }, 'Закрыть'),
    );
    audio.notify();
  });
}

// Звонок руководителя смены (финансовая безопасность, смена 4)
export function briefingCall(ctx) {
  return new Promise((resolve) => {
    const panel = openPanel('brief');
    const lines = el('div', { class: 'brief-lines' });
    const btn = el('button', { class: 'btn primary hidden' }, 'Принято');
    panel.append(
      el(
        'div',
        { class: 'brief-card' },
        el('div', { class: 'brief-head' }, el('div', { class: 'brief-ava speaking', html: portrait('irina', 'worried') }), el('div', {}, el('b', {}, 'Ирина Викторовна'), el('small', {}, '📞 руководитель смены'))),
        lines,
        btn,
      ),
    );
    panel.addEventListener('click', (e) => {
      if (e.target !== btn) skipTyping();
    });
    (async () => {
      const story = ctx.state.story || {};
      const extra = story.gran === 'saved' ? ['Это Валентина Петровна — та самая, которую на днях отговорили от перевода у окна кассы. Тебя она знает. Мошенники вернулись.'] : story.gran === 'lost' ? ['Это Валентина Петровна. У окна кассы её обманули — и мошенники вернулись за остальным.'] : [];
      for (const l of [...BRIEF, ...extra]) {
        const p = el('p');
        lines.append(p);
        await typeText(p, l, { speed: 16, voice: VOICE.irina });
        await sleep(250);
      }
      panel.querySelector('.brief-ava').classList.remove('speaking');
      if (ctx.learn('k_safe')) lines.append(knowledgeCard(KNOWLEDGE.k_safe, true));
      btn.classList.remove('hidden');
      btn.focus({ preventScroll: true });
    })();
    btn.addEventListener('click', () => {
      audio.click();
      audio.hangup();
      closePanel();
      resolve();
    });
  });
}

// Переписка с Машей в финале профессии «Финансовая безопасность»
export function mashaChat(variant) {
  return new Promise((resolve) => {
    const panel = openPanel('chat-phone');
    const msgs = el('div', { class: 'cp-msgs' });
    const btn = el('button', { class: 'btn primary hidden' }, 'Закончить смену');
    panel.append(
      el(
        'div',
        { class: 'cp-phone' },
        el('div', { class: 'cp-head' }, el('span', { class: 'cp-ava', html: portrait('masha', 'happy') }), el('div', {}, el('b', {}, 'Маша'), el('small', {}, 'внучка Валентины Петровны'))),
        msgs,
        btn,
      ),
    );
    (async () => {
      const all = [...FINALE.masha[variant], ...FINALE.masha.dima];
      for (let i = 0; i < all.length; i++) {
        if (i === FINALE.masha[variant].length) await sleep(700);
        const typing = el('div', { class: 'cp-msg typing' }, el('i'), el('i'), el('i'));
        msgs.append(typing);
        msgs.scrollTop = msgs.scrollHeight;
        await sleep(600 + all[i].length * 12);
        typing.classList.remove('typing');
        typing.textContent = all[i];
        audio.notify();
        msgs.scrollTop = msgs.scrollHeight;
        await sleep(350);
      }
      btn.classList.remove('hidden');
      btn.focus({ preventScroll: true });
    })();
    btn.addEventListener('click', () => {
      audio.click();
      closePanel();
      resolve();
    });
  });
}

export function confirmBox(text, yes, no) {
  return new Promise((resolve) => {
    const { box, close } = overlay('confirm');
    const pick = (v) => {
      audio.click();
      close();
      resolve(v);
    };
    box.append(el('p', { style: { whiteSpace: 'pre-line' } }, text), el('div', { class: 'row center' }, no ? el('button', { class: 'btn ghost', onClick: () => pick(false) }, no) : null, el('button', { class: 'btn primary', onClick: () => pick(true) }, yes)));
  });
}
