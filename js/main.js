// «Профессии в Банке»: титульный экран → холл банка → кабинеты профессий → смены.
import { World } from './world.js';
import { Controls } from './controls.js';
import { audio } from './audio.js';
import { DIFFICULTY } from './data/config.js';
import { PROFESSIONS, PROF, KNOWLEDGE } from './data/professions.js';
import { loadSave, writeSave, clearSave, loadSettings, saveSettings, newProgress } from './save.js';
import { $, el, sleep, toast, caption, setObjective, closePanel, typeText, skipTyping, flash, showSaved, num, isTourActive, initHints, setHintShift, endHintShift, hintPenalty } from './ui.js';
import './tours.js';
import { loadBrand } from './brand.js';
import { track, setContext, sessionStart, analyticsAllowed, setAnalytics } from './analytics.js';
import { profileCard } from './profile.js';
import { careerProfile } from './data/career.js';
import { shiftIntro, debrief, professionSummary, certificate, album, professionCard, kioskMenu, cabinetCard, briefingCall, mashaChat, confirmBox, profStars, profDone, mentorTalk, badgeEl, badgeCard, thanksBoard, staffRank } from './screens.js';
import { AVATARS, avatarSvg } from './portraits.js';
import { story, setBeat, takeNews, recentNews, teaser, welcomeLines, MENTOR } from './story.js';
import { buildLobby } from './rooms/lobby.js';
import { runPhishing } from './episodes/phishing.js';
import { runFlow } from './episodes/flow.js';
import { runRules } from './episodes/rules.js';
import { runCall } from './episodes/call.js';
import { runTrace } from './episodes/trace.js';

const settings = { sound: true, quality: null, nickname: '', difficulty: 'normal', jury: false, avatar: 0, joy: 'left', bigText: false, sens: 1, musicVol: 1, sfxVol: 1, ...loadSettings() };
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.documentElement.classList.toggle('big-text', !!settings.bigText);
audio.setVolumes({ music: settings.musicVol, sfx: settings.sfxVol });

// Полный экран: на Android и компьютере — Fullscreen API; на iPhone его нет — подсказка «На экран Домой»
const docEl = document.documentElement;
const fsAvail = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const fsOffer = () => !isStandalone() && (fsAvail || isIOS);
// На телефоне (Android) вход в игру сразу разворачивает её на весь экран — адресная строка не мешает
function autoFullscreen() {
  if (!isTouch || !fsAvail || isFull() || isStandalone() || Math.min(innerWidth, innerHeight) >= 700) return;
  try {
    const r = (docEl.requestFullscreen || docEl.webkitRequestFullscreen).call(docEl, { navigationUI: 'hide' });
    if (r && r.catch) r.catch(() => {});
  } catch {
    // браузер отказал — играем как есть
  }
}
async function toggleFullscreen() {
  audio.init();
  audio.click();
  if (fsAvail) {
    try {
      if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else await (docEl.requestFullscreen || docEl.webkitRequestFullscreen).call(docEl, { navigationUI: 'hide' });
    } catch {
      // браузер отказал — ничего страшного
    }
    return;
  }
  if (isIOS) await confirmBox('Чтобы играть во весь экран на iPhone: нажми «Поделиться» ⬆️ внизу Safari → «На экран „Домой“». Игра откроется со значка, как приложение — без адресной строки.', 'Понятно', null);
}
if (!settings.quality) settings.quality = isTouch || Math.min(window.innerWidth, window.innerHeight) < 600 ? 'low' : 'high';

let world;
let controls;
let progress = null;
let mode = 'title'; // title | lobby | room
let currentProf = null;
let paused = false;
let busy = false;
let attractAngle = 0;
let target = null;
let targetHit = null;

const TARGET_LABEL = { laptop: 'Ноутбук', folder: 'Папка СБ', door: 'Дверь', rack: 'Серверы', monitor: 'Монитор', phone: 'Телефон', board: 'Доска', window: 'Окно', wall: 'Видеостена', radar: 'Монитор', kiosk: 'Терминал', call: 'Кнопка вызова', cashbox: 'Касса', docs: 'Заявки', calendar: 'Календарь', table: 'Столик', screen: 'Экран', map: 'Карта', van: 'Броневик', vault: 'Хранилище', mentor: 'Наставник' };

// Подписи к предметам офиса финансовой безопасности
const SECURITY_CAPTIONS = {
  monitor: 'Главный терминал.',
  feed: 'Лента операций в реальном времени. «СТОП» — антифрод остановил сам.',
  radar: 'Антифрод-радар: риск каждой операции за доли секунды.',
  wall: 'Видеостена: атаки на клиентов по всей Ростовской области.',
  mug: '☕ Кофе давно остыл.',
  poster: 'Плакат: «Звонят из банка? Положи трубку и позвони сам».',
  colleague: 'Стол Саши. Стикер: «Удачи на смене! Кофе — в ящике».',
  rack: 'Серверы антифрод-системы. Мигают — значит, работают.',
  plant: '🪴 Фикус Борис. Пережил трёх руководителей.',
  window: 'Ростов. Где-то там кому-то звонит «служба безопасности банка».',
  board: 'Доска расследований.',
  phone: 'Телефон. Пока тихо.',
};

const ctx = {
  state: null,
  diff: null,
  world: null,
  audio,
  prof: null,
  profession: null,
  shift: null,
  isPaused: () => paused || isTourActive(),
  focus: (name) => {
    const f = world.focusPose(name);
    return f ? controls.flyTo(f.pos, f.look, 1.0) : Promise.resolve();
  },
  addScore(n) {
    progress.stats.score = Math.max(0, progress.stats.score + n);
    refreshHud();
  },
  addClients(n) {
    progress.stats.clients += n;
  },
  addMoney(n) {
    progress.stats.money += n;
    if (world.room === 'security') world.setNumbers({ saved: progress.stats.money });
  },
  learn(k) {
    if (progress.knowledge.includes(k)) return false;
    progress.knowledge.push(k);
    refreshHud();
    return true;
  },
};

function save() {
  if (!progress) return;
  if (writeSave(progress)) showSaved();
}

function refreshHud() {
  if (!progress) return;
  const stars = PROFESSIONS.reduce((s, p) => s + profStars(progress.profs[p.id]), 0);
  const set = (id, v) => {
    const n = $(id);
    if (n.textContent === v) return;
    n.textContent = v;
    n.parentElement.classList.remove('bump');
    void n.offsetWidth;
    n.parentElement.classList.add('bump');
  };
  set('#stat-clients', `${stars}/${PROFESSIONS.length * 15}`);
  set('#stat-money', `${progress.knowledge.length}/${Object.keys(KNOWLEDGE).length}`);
  set('#stat-score', num(progress.stats.score));
}

// ─────────────────────────── запуск ───────────────────────────
async function boot() {
  try {
    loadBrand();
    world = new World($('#scene'), { quality: settings.quality });
  } catch (e) {
    console.error(e);
    $('#loading').innerHTML = '<p>Не получилось запустить 3D-графику. Откройте игру в свежем Chrome, Firefox, Safari или Edge.</p>';
    return;
  }
  ctx.world = world;
  world.registerRoom('lobby', buildLobby);
  world.setRoom('lobby');
  controls = new Controls(world, $('#scene'), { onHover, onClick: interact, onMiss, onLock });
  controls.sensMul = settings.sens || 1;
  initHints({ isPaused: () => paused || isTourActive() });
  document.body.classList.toggle('can-lock', controls.lockAvailable);
  document.body.classList.toggle('touch', isTouch);
  sessionStart(isTouch ? (Math.min(innerWidth, innerHeight) >= 700 ? 'tablet' : 'mobile') : 'desktop');
  audio.setMuted(!settings.sound);
  world.setSky('night');

  window.addEventListener('resize', () => world.resize());
  const overlayRoot = $('#overlay-root');
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (mode === 'title') attract(dt);
    world.throttle = overlayRoot.classList.contains('active') || !!document.querySelector('.screen-wrap.show');
    controls.update(dt);
    tickTutorial();
    if (world.room === 'security' && currentProf?.id === 'security' && progress?.profs.security.shift === 1 && target && !paused) world.state.threat += dt * 2.4;
    world.ambientOk = mode === 'lobby' && !paused && !busy;
    world.update(dt);
    updateTargetArrow();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  await Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(1500)]);
  world.redrawStatic();
  setupTitle();
  setupMenus();
  $('#loading').classList.remove('show');

  if (new URLSearchParams(location.search).has('debug')) {
    window.__bank = { get progress() { return progress; }, get mode() { return mode; }, get target() { return target; }, world, controls, ctx, enterRoomById: (id) => enterRoom(PROF[id]), hit: () => targetHit && targetHit(), interact: (item) => interact({ label: '', ...item }) };
  }
}

function attract(dt) {
  attractAngle += dt * 0.05;
  const cam = world.camera;
  cam.position.set(Math.sin(attractAngle) * 5, 2.4, 3.5 + Math.cos(attractAngle * 0.8) * 1.5);
  cam.lookAt(0, 1.8, -4);
}

// ─────────────────────────── титульный экран ───────────────────────────
function setupTitle() {
  const nick = $('#nick');
  const saved = loadSave();
  nick.value = settings.nickname || saved?.nickname || '';
  let diff = saved?.difficulty || settings.difficulty || 'normal';
  const diffBtns = [...document.querySelectorAll('.diff-btn')];
  const renderDiff = () =>
    diffBtns.forEach((b) => {
      b.classList.toggle('on', b.dataset.diff === diff);
      b.setAttribute('aria-checked', String(b.dataset.diff === diff));
    });
  diffBtns.forEach((b) =>
    b.addEventListener('click', () => {
      audio.init();
      audio.click();
      diff = b.dataset.diff;
      renderDiff();
    }),
  );
  renderDiff();

  // Выбор стажёра: лицо, с которым игрок проходит неделю
  let avatar = saved?.avatar ?? settings.avatar ?? 0;
  const avBox = $('#avatars');
  avBox.innerHTML = '';
  const avBtns = AVATARS.map((_, i) => {
    const b = el('button', { class: 'av-btn', role: 'radio', 'aria-label': `Стажёр ${i + 1}`, html: avatarSvg(i) });
    b.addEventListener('click', () => {
      audio.init();
      audio.click();
      avatar = i;
      settings.avatar = i;
      avBtns.forEach((x, k) => {
        x.classList.toggle('on', k === i);
        x.setAttribute('aria-checked', String(k === i));
      });
    });
    avBox.append(b);
    return b;
  });
  avBtns.forEach((x, k) => x.classList.toggle('on', k === avatar));

  // Полоска профессий с прогрессом
  const strip = $('#prof-strip');
  strip.innerHTML = '';
  for (const p of PROFESSIONS) {
    const ps = saved?.profs[p.id];
    strip.append(el('div', { class: 'ps-item', style: { '--pc': p.color } }, el('span', {}, p.icon), el('b', {}, p.title), el('small', {}, profDone(ps) ? `★ ${profStars(ps)} · ${profDone(ps)}/5` : '5 смен')));
  }

  const readName = () => nick.value.trim().replace(/\s+/g, ' ').slice(0, 18) || 'Стажёр';
  const fresh = () => {
    settings.nickname = readName();
    settings.difficulty = diff;
    settings.avatar = avatar;
    saveSettings(settings);
    clearSave();
    return { ...newProgress(settings.nickname, diff), avatar };
  };

  const cont = $('#btn-continue');
  const start = $('#btn-start');
  if (saved) {
    const where = saved.current ? `${PROF[saved.current].icon} ${PROF[saved.current].title}` : '🏦 холл банка';
    cont.classList.remove('hidden');
    $('#continue-info').textContent = `${saved.nickname} · ${where}`;
    start.textContent = 'Новая игра';
    start.classList.replace('primary', 'ghost');
    cont.addEventListener('click', () => {
      audio.init();
      audio.resume();
      autoFullscreen();
      begin(saved, false);
    });
  }
  start.addEventListener('click', async () => {
    audio.init();
    audio.resume();
    autoFullscreen();
    if (saved && saved.knowledge.length) {
      const ok = await confirmBox('Начать заново? Весь прогресс будет сброшен.', 'Начать заново', 'Отмена');
      if (!ok) return;
    }
    begin(fresh(), true);
  });
  nick.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (saved ? cont : start).click();
  });
}

function setupMenus() {
  const renderSettings = () => {
    for (const s of ['#btn-sound-title span', '#p-sound span']) $(s).textContent = settings.sound ? 'вкл' : 'выкл';
    for (const s of ['#btn-quality span', '#p-quality span']) $(s).textContent = settings.quality === 'high' ? 'высокая' : 'быстрая';
    $('#btn-jury span').textContent = settings.jury ? 'все открыты (режим жюри)' : 'по порядку';
    for (const s of ['#btn-joy span', '#p-joy span']) $(s).textContent = settings.joy === 'right' ? 'справа' : 'слева';
    for (const s of ['#btn-text span', '#p-text span']) $(s).textContent = settings.bigText ? 'крупный' : 'обычный';
    $('#p-diff span').textContent = { easy: 'лёгкая', normal: 'средняя', hard: 'сложная' }[progress?.difficulty || settings.difficulty] || 'средняя';
    $('#p-diff small').textContent = { easy: 'больше времени и подсказок', normal: 'обычный темп', hard: 'без подсказок' }[progress?.difficulty || settings.difficulty] || '';
    for (const s of ['#btn-full-title', '#p-full']) $(s).classList.toggle('hidden', !fsOffer());
    $('#p-full span').textContent = isFull() ? '⛶ Обычный экран' : '⛶ Во весь экран';
    $('#p-music').value = String(settings.musicVol);
    $('#p-sfx').value = String(settings.sfxVol);
    $('#p-sens').value = String(settings.sens);
    $('#p-sens-val').textContent = `×${Number(settings.sens).toFixed(1)}`;
    $('#btn-stats span').textContent = analyticsAllowed() ? 'анонимная' : 'выкл';
    document.body.classList.toggle('joy-right', settings.joy === 'right');
    document.body.classList.toggle('muted', !settings.sound);
  };
  const toggleSound = () => {
    audio.init();
    settings.sound = !settings.sound;
    audio.setMuted(!settings.sound);
    saveSettings(settings);
    renderSettings();
    audio.click();
  };
  const toggleQuality = () => {
    settings.quality = settings.quality === 'high' ? 'low' : 'high';
    world.setQuality(settings.quality);
    saveSettings(settings);
    renderSettings();
  };
  $('#btn-sound-title').addEventListener('click', toggleSound);
  $('#p-sound').addEventListener('click', toggleSound);
  $('#btn-sound').addEventListener('click', toggleSound);
  $('#btn-quality').addEventListener('click', toggleQuality);
  $('#btn-jury').addEventListener('click', () => {
    audio.init();
    audio.click();
    settings.jury = !settings.jury;
    saveSettings(settings);
    renderSettings();
  });
  $('#p-quality').addEventListener('click', toggleQuality);
  // Джойстик слева или справа — кому как удобнее (левши, телефон в одной руке)
  const toggleJoy = () => {
    audio.init();
    audio.click();
    settings.joy = settings.joy === 'right' ? 'left' : 'right';
    saveSettings(settings);
    renderSettings();
  };
  $('#btn-joy').addEventListener('click', toggleJoy);
  $('#btn-stats').addEventListener('click', () => {
    audio.init();
    audio.click();
    setAnalytics(!analyticsAllowed());
    renderSettings();
  });
  $('#p-joy').addEventListener('click', toggleJoy);

  // Крупный текст — для телефонов и тех, кому мелко
  const toggleText = () => {
    audio.init();
    audio.click();
    settings.bigText = !settings.bigText;
    document.documentElement.classList.toggle('big-text', settings.bigText);
    saveSettings(settings);
    renderSettings();
    world?.resize();
  };
  $('#btn-text').addEventListener('click', toggleText);
  $('#p-text').addEventListener('click', toggleText);

  // Сложность можно поменять посреди игры: действует со следующего задания
  $('#p-diff').addEventListener('click', () => {
    if (!progress) return;
    audio.click();
    const order = ['easy', 'normal', 'hard'];
    const next = order[(order.indexOf(progress.difficulty) + 1) % order.length];
    progress.difficulty = next;
    settings.difficulty = next;
    ctx.diff = DIFFICULTY[next] || DIFFICULTY.normal;
    setContext({ difficulty: next });
    saveSettings(settings);
    save();
    renderSettings();
    track('difficulty_change', { data: { action: next } });
  });

  // Громкость музыки и звуков, чувствительность камеры
  const slider = (sel, key, apply) => {
    const inp = $(sel);
    inp.addEventListener('input', () => {
      settings[key] = Number(inp.value);
      apply(settings[key]);
      renderSettings();
    });
    inp.addEventListener('change', () => {
      saveSettings(settings);
      if (key === 'sfxVol') audio.coin();
    });
  };
  slider('#p-music', 'musicVol', (v) => audio.setVolumes({ music: v }));
  slider('#p-sfx', 'sfxVol', (v) => audio.setVolumes({ sfx: v }));
  slider('#p-sens', 'sens', (v) => (controls.sensMul = v));

  for (const s of ['#btn-full-title', '#p-full']) $(s).addEventListener('click', async () => {
    await toggleFullscreen();
    renderSettings();
  });
  document.addEventListener('fullscreenchange', renderSettings);
  document.addEventListener('webkitfullscreenchange', renderSettings);
  renderSettings();

  const howto = $('#howto');
  const openHowto = () => howto.classList.remove('hidden');
  $('#btn-howto').addEventListener('click', openHowto);
  $('#p-howto').addEventListener('click', openHowto);
  $('#howto-close').addEventListener('click', () => howto.classList.add('hidden'));

  const openAlbum = async () => {
    if (!progress) return;
    const wasPaused = paused;
    $('#pause').classList.add('hidden');
    if (!wasPaused) setPaused(true, false);
    await album(progress);
    setPaused(false);
  };
  $('#btn-album').addEventListener('click', openAlbum);
  $('#btn-badge').addEventListener('click', async () => {
    if (!progress) return;
    const wasPaused = paused;
    $('#pause').classList.add('hidden');
    if (!wasPaused) setPaused(true, false);
    if ((await badgeCard(progress)) === 'profile') await profileCard(progress, { preview: settings.jury, source: 'badge' });
    setPaused(false);
  });
  $('#p-album').addEventListener('click', openAlbum);

  $('#btn-pause').addEventListener('click', () => setPaused(true));
  $('#p-resume').addEventListener('click', () => setPaused(false));
  $('#p-lobby').addEventListener('click', () => {
    setPaused(false);
    leaveRoom(true);
  });
  $('#p-menu').addEventListener('click', () => {
    save();
    location.reload();
  });
  $('#target-arrow').addEventListener('click', faceTarget);
  $('#objective').addEventListener('click', faceTarget);
  $('#objective').classList.add('clickable');
  $('#objective').title = 'Нажми, чтобы повернуться к цели';
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && mode !== 'title') {
      if (!howto.classList.contains('hidden')) howto.classList.add('hidden');
      else setPaused(!paused);
    }
    if ((e.code === 'Space' || e.code === 'Enter') && document.querySelector('.transcript, .brief-card, .dlg-lines')) {
      if (!(e.target instanceof HTMLButtonElement)) skipTyping();
    }
  });
}

function setPaused(p, showMenu = true) {
  if (mode === 'title') return;
  paused = p;
  $('#pause').classList.toggle('hidden', !p || !showMenu);
  $('#p-lobby').classList.toggle('hidden', mode !== 'room');
  if (p && progress?.savedAt) {
    const d = new Date(progress.savedAt);
    const where = currentProf ? `${currentProf.title}, смена ${progress.profs[currentProf.id].shift}` : 'холл банка';
    $('#p-saved').textContent = `💾 Сохранено в ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${where}`;
  }
  if (p) {
    controls.releaseMouse();
    controls.setEnabled(false);
  } else if (!busy) controls.setEnabled(true);
  if (p) audio.heartbeat(0);
}

// ─────────────────────────── вход в игру ───────────────────────────
async function begin(p, withIntro) {
  progress = p;
  // Режим жюри: все смены всех профессий открыты сразу, чтобы показать любую сторону профессии
  if (settings.jury) for (const id of Object.keys(progress.profs)) progress.profs[id].unlocked = 5;
  ctx.state = progress;
  ctx.diff = DIFFICULTY[progress.difficulty] || DIFFICULTY.normal;
  setContext({ difficulty: progress.difficulty });
  if (withIntro) track('game_start', { data: { avatar: progress.avatar || 0 } });
  $('#title').classList.add('gone');
  if (withIntro) await playIntro();
  $('#hud').classList.remove('hidden');
  $('#hud-buttons').classList.remove('hidden');
  if (progress.avatar == null) progress.avatar = settings.avatar || 0;
  $('#btn-badge').innerHTML = avatarSvg(progress.avatar);
  audio.startAmbient();
  audio.setRain(0);
  refreshHud();
  showControlsHint();
  const resumeProf = progress.current && progress.profs[progress.current]?.stage > 0 ? PROF[progress.current] : null;
  if (resumeProf) enterRoom(resumeProf);
  else enterLobby();
}

function showControlsHint() {
  const hint = $('#controls-hint');
  hint.textContent = isTouch ? 'Веди пальцем — осмотреться · Джойстик — ходить · Тап по двери — войти' : controls.lockAvailable ? 'Кликни — камера за мышью · WASD — ходить · Shift — бег · E — действие · Esc — отпустить мышь' : 'Зажми мышь — осмотреться · WASD — ходить · Клик по двери — войти';
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 8000);
}

async function playIntro() {
  const box = $('#intro');
  const textBox = box.querySelector('.intro-text');
  textBox.innerHTML = '';
  box.classList.add('show');
  let skipped = false;
  let waitResolve = null;
  box.querySelector('.intro-skip').onclick = (e) => {
    e.stopPropagation();
    skipped = true;
    skipTyping();
    if (waitResolve) waitResolve();
  };
  box.onclick = () => {
    skipTyping();
    if (waitResolve) waitResolve();
  };
  audio.startMusic('calm');
  const lines = ['Понедельник. Первая неделя стажировки в банке.', 'Семь кабинетов — семь профессий: операционист, кредитный эксперт, консультант, инкассатор, безопасность, HR и DevOps.', `Одна неделя, за которую многое случится. Тебя уже ждут, ${progress.nickname}.`];
  for (const line of lines) {
    if (skipped) break;
    const p = el('p');
    textBox.append(p);
    await typeText(p, line, { speed: 28, voice: 300 });
    if (skipped) break;
    await Promise.race([sleep(1000), new Promise((r) => (waitResolve = r))]);
    waitResolve = null;
  }
  box.classList.add('titlecard');
  audio.stamp();
  await sleep(skipped ? 400 : 1600);
  box.classList.remove('show', 'titlecard');
  box.onclick = null;
}

async function fadeTo(fn) {
  const f = $('#fade');
  f.classList.add('on');
  await sleep(380);
  await fn();
  await sleep(80);
  f.classList.remove('on');
}

// ─────────────────────────── холл ───────────────────────────
async function enterLobby() {
  setHintShift(null);
  mode = 'lobby';
  currentProf = null;
  ctx.prof = null;
  ctx.profession = null;
  target = null;
  targetHit = null;
  busy = true;
  controls.setEnabled(false);
  setObjective(null);
  progress.current = null;
  save();
  for (const t of document.querySelectorAll('#toasts .toast')) t.remove();
  await fadeTo(() => {
    const room = world.setRoom('lobby');
    controls.setArea(room.bounds, room.obstacles);
    controls.dropFocus();
    controls.setPose(room.spawn.pos, room.spawn.yaw, -0.05);
    for (const p of PROFESSIONS) room.setProgress(p.id, profStars(progress.profs[p.id]), profDone(progress.profs[p.id]));
    room.setStory?.(progress);
    room.setCareer?.(careerProfile(progress));
    audio.alarm(false);
    audio.ring(false);
    audio.heartbeat(0);
    audio.setRain(0);
    audio.startMusic('calm');
  });
  mode = 'lobby';
  world.setMarker('kiosk');
  setObjective('Выбери кабинет или возьми талон в терминале');
  busy = false;
  if (!paused) controls.setEnabled(true);
  const st = story(progress);
  if (!st.met) {
    // Первый день: наставник встречает стажёра
    st.met = true;
    save();
    busy = true;
    controls.setEnabled(false);
    world.setMarker(null);
    await sleep(350);
    if (mode === 'lobby') await ctx.focus('mentor');
    if (mode === 'lobby') await mentorTalk(progress, { lines: welcomeLines(), btn: '🚪 Пойду выбирать кабинет', extra: el('div', { class: 'welcome-badge' }, el('h4', {}, '🪪 Держи пропуск стажёра'), badgeEl(progress)) });
    if (mode === 'lobby') {
      await controls.returnFromFocus();
      world.setMarker('kiosk');
      busy = false;
      if (!paused) controls.setEnabled(true);
      startTutorial();
    }
  } else {
    const fresh = takeNews(progress, 2);
    if (fresh.length) {
      save();
      fresh.forEach((t, i) => setTimeout(() => mode === 'lobby' && toast({ who: 'mentor', emo: 'happy', title: `${MENTOR.name} · новости отделения`, text: t, duration: 9000 }), 700 + i * 1800));
    }
  }
  const allDone = PROFESSIONS.every((p) => profDone(progress.profs[p.id]) === 5);
  if (allDone && !progress.certificate) {
    progress.certificate = true;
    save();
    busy = true;
    controls.setEnabled(false);
    track('certificate');
    if ((await certificate(progress)) === 'profile') await profileCard(progress, { preview: settings.jury, source: 'certificate' });
    busy = false;
    controls.setEnabled(true);
  }
  if (careerProfile(progress).ready && !progress.profileShown && mode === 'lobby') await revealProfile();
}

// Попробовано достаточно профессий — наставник показывает профиль стажёра
async function revealProfile() {
  progress.profileShown = true;
  save();
  const wasBusy = busy;
  busy = true;
  controls.setEnabled(false);
  const cp = careerProfile(progress);
  track('profile_ready', { prof: cp.top.prof.id, value: cp.match, data: { second: cp.second.prof.id, ...cp.traits, tried: cp.tried.length } });
  await profileCard(progress, { fresh: true, source: 'auto' });
  world.rooms.lobby?.setCareer?.(careerProfile(progress));
  busy = wasBusy;
  if (!busy && !paused && mode === 'lobby') controls.setEnabled(true);
}

// ─────────────────────────── обучение управлению в холле ───────────────────────────
// Учим делом: три шага отмечаются сами, когда игрок их выполняет.
let tut = null;
function startTutorial() {
  const st = story(progress);
  if (st.tut || tut) return;
  const lock = controls.lockAvailable;
  const steps = [
    ['look', isTouch ? '👆 Веди пальцем по экрану — осмотрись' : lock ? '🖱 Кликни по экрану и поводи мышью — осмотрись' : '🖱 Зажми мышь и поведи — осмотрись'],
    ['walk', isTouch ? `🕹 Джойстик ${settings.joy === 'right' ? 'справа' : 'слева'} внизу — пройдись` : '⌨️ Пройдись: W A S D · Shift — бег'],
    ['use', isTouch ? '🎫 Нажми на терминал очереди или на дверь' : '🎫 Наведи прицел на терминал или дверь и нажми E'],
  ];
  const rows = steps.map(([id, t]) => el('li', { 'data-id': id }, el('i'), el('span', {}, t)));
  const box = el('div', { id: 'tut', role: 'status' }, el('b', {}, '🎓 Обучение'), el('ol', {}, rows));
  document.body.append(box);
  document.body.classList.add('has-tut');
  // на узком экране — сразу под карточкой задачи, какой бы высоты она ни была
  const placeTut = () => {
    if (!box.isConnected) return window.removeEventListener('resize', placeTut);
    const narrow = window.innerWidth <= 600 && window.innerHeight > 520;
    box.style.top = narrow ? `${Math.round($('#objective').getBoundingClientRect().bottom + 10)}px` : '';
  };
  placeTut();
  setTimeout(placeTut, 400);
  window.addEventListener('resize', placeTut);
  requestAnimationFrame(() => box.classList.add('show'));
  tut = { box, done: new Set(), yaw: controls.yaw, turn: 0, pos: world.camera.position.clone(), walk: 0 };
}
function tutorialDone(id) {
  if (!tut || tut.done.has(id)) return;
  tut.done.add(id);
  tut.box.querySelector(`li[data-id="${id}"]`)?.classList.add('done');
  audio.coin();
  if (tut.done.size === 3) {
    const box = tut.box;
    tut = null;
    document.body.classList.remove('has-tut');
    story(progress).tut = true;
    save();
    track('tutorial_done');
    setTimeout(() => {
      box.classList.remove('show');
      setTimeout(() => box.remove(), 400);
      toast({ who: 'mentor', emo: 'happy', title: MENTOR.name, text: 'Отлично! Управление освоено. Теперь выбирай кабинет — в первой смене каждой профессии самое интересное 🚪' });
    }, 900);
  }
}
function tickTutorial() {
  if (!tut || mode !== 'lobby' || !controls.enabled) return;
  const d = Math.abs(controls.yaw - tut.yaw);
  tut.yaw = controls.yaw;
  if (d < 1) tut.turn += d;
  if (tut.turn > 0.9) tutorialDone('look');
  const p = world.camera.position;
  tut.walk += Math.hypot(p.x - tut.pos.x, p.z - tut.pos.z);
  tut.pos.copy(p);
  if (tut.walk > 2.2) tutorialDone('walk');
}

function mentorChat() {
  const done = PROFESSIONS.reduce((s, p) => s + profDone(progress.profs[p.id]), 0);
  const fresh = takeNews(progress, 3);
  const news = fresh.length ? fresh : recentNews(progress, 3);
  const untouched = PROFESSIONS.filter((p) => !profDone(progress.profs[p.id]));
  const all = PROFESSIONS.length * 5;
  const lines = [done === 0 ? 'Не знаешь, с чего начать? Любая дверь — хороший выбор. В первой смене каждой профессии — самое интересное.' : done >= all ? `Все ${all} смен позади! Ты попробовал(а) себя везде — это редкость.` : `Пройдено смен: ${done} из ${all}. Хороший темп, {name}!`];
  const cp = careerProfile(progress);
  const tip = untouched.length ? `💡 Загляни к профессии «${untouched[0].title}» ${untouched[0].icon} — там ждёт первая смена. ${cp.ready ? 'Твой профиль стажёра уже готов — он на карьерном стенде у стены справа.' : `Попробуешь ${cp.need} профессий — на карьерном стенде у стены справа появится твой профиль: какая работа подходит тебе.`}` : '💡 Твой профиль стажёра — на карьерном стенде у стены справа. Переиграй смены на три звезды — лучший результат сохраняется.';
  save();
  return { lines, news, tip, btn: 'Спасибо!' };
}

async function lobbyInteract(item) {
  tutorialDone('use');
  if (item.id === 'mentor') {
    busy = true;
    controls.setEnabled(false);
    world.setMarker(null);
    await ctx.focus('mentor');
    await mentorTalk(progress, mentorChat());
    await controls.returnFromFocus();
    busy = false;
    controls.setEnabled(true);
    world.setMarker('kiosk');
    return;
  }
  if (item.id === 'kiosk') {
    busy = true;
    controls.setEnabled(false);
    world.setMarker(null);
    await ctx.focus('kiosk');
    const id = await kioskMenu(progress);
    if (id) return openDoor(PROF[id], true);
    await controls.returnFromFocus();
    busy = false;
    controls.setEnabled(true);
    world.setMarker('kiosk');
    return;
  }
  if (item.id.startsWith('door_')) return openDoor(PROF[item.id.slice(5)]);
  if (item.id === 'career') {
    busy = true;
    controls.setEnabled(false);
    world.setMarker(null);
    await ctx.focus('career');
    await profileCard(progress, { preview: settings.jury, source: 'stand' });
    if (careerProfile(progress).ready) progress.profileShown = true;
    await controls.returnFromFocus();
    busy = false;
    controls.setEnabled(true);
    world.setMarker('kiosk');
    return;
  }
  if (item.id === 'thanks') {
    busy = true;
    controls.setEnabled(false);
    world.setMarker(null);
    await ctx.focus('thanks');
    await thanksBoard(progress);
    await controls.returnFromFocus();
    busy = false;
    controls.setEnabled(true);
    world.setMarker('kiosk');
    return;
  }
  const cap = world.rooms.lobby?.captions?.[item.id];
  if (cap) caption(typeof cap === 'function' ? cap() : cap, 5200);
}

async function openDoor(prof, fromKiosk = false) {
  busy = true;
  controls.setEnabled(false);
  world.setMarker(null);
  if (fromKiosk) controls.dropFocus();
  await ctx.focus(`door_${prof.id}`);
  const go = await professionCard(prof, progress.profs[prof.id]);
  if (!go) {
    await controls.returnFromFocus();
    busy = false;
    controls.setEnabled(true);
    world.setMarker('kiosk');
    return;
  }
  audio.whoosh();
  enterRoom(prof);
}

// ─────────────────────────── кабинет профессии ───────────────────────────
async function enterRoom(prof) {
  if ($('#overlay-root').classList.contains('active')) closePanel();
  if (tut) {
    tut.box.remove();
    tut = null;
    document.body.classList.remove('has-tut');
  }
  mode = 'room';
  currentProf = prof;
  track('cabinet_enter', { prof: prof.id });
  ctx.profession = prof;
  ctx.prof = progress.profs[prof.id];
  progress.current = prof.id;
  busy = true;
  controls.setEnabled(false);
  setObjective(null);
  await fadeTo(async () => {
    if (!world.rooms[prof.room] && !world.builders[prof.room]) {
      const mod = await import(`./rooms/${prof.room}.js`);
      world.registerRoom(prof.room, mod.build);
    }
    const room = world.setRoom(prof.room);
    controls.setArea(room.bounds, room.obstacles);
    controls.dropFocus();
    controls.setPose(room.spawn.pos, room.spawn.yaw, -0.06);
    setupShift(prof, prof.shifts[Math.min(ctx.prof.shift, 5) - 1]);
  });
  save();
  if (ctx.prof.stage > 0) playShift(prof, ctx.prof.shift);
  else cabinetLoop(prof);
}

async function cabinetLoop(prof) {
  busy = true;
  controls.setEnabled(false);
  setObjective(null);
  world.setMarker(null);
  const choice = await cabinetCard(prof, progress.profs[prof.id]);
  if (choice === 'lobby') return enterLobby();
  playShift(prof, choice);
}

async function leaveRoom(force = false) {
  if (mode !== 'room') return;
  if (!force) {
    busy = true;
    controls.setEnabled(false);
    const ok = await confirmBox('Выйти в холл? Прогресс смены сохранится.', 'В холл', 'Остаться');
    busy = false;
    if (!ok) {
      controls.setEnabled(true);
      return;
    }
  }
  closePanel();
  save();
  enterLobby();
}

// Подготовка комнаты к смене
function setupShift(prof, shift) {
  if (prof.id === 'security') return setupSecurityWorld(shift);
  const room = world.rooms[prof.room];
  if (room.setShift) room.setShift(shift.n);
  if (room.setProf) room.setProf(progress.profs[prof.id]);
  audio.alarm(false);
  audio.setRain(0);
  audio.startMusic('calm');
}

function setupSecurityWorld(shift) {
  world.setSky(shift.sky);
  world.setClock(shift.time);
  audio.setRain(shift.sky === 'night' ? 1 : 0);
  world.setAlarm(false);
  audio.alarm(false);
  world.setWall(shift.n === 2 ? 'flow' : 'normal');
  world.setMain({ 1: 'alert', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'board' }[shift.n]);
  world.setRadarMode(shift.n === 3 ? 'rules' : 'radar');
  world.setPhone('off');
  world.setBoard(progress.board);
  world.setNumbers({ saved: progress.stats.money });
  if (shift.n === 1) {
    world.setAlarm(true);
    world.setWall('attack');
    audio.alarm(true);
  }
  audio.startMusic(shift.n >= 4 || shift.n === 1 ? 'tension' : 'calm');
}

async function playShift(prof, n) {
  const ps = progress.profs[prof.id];
  const shift = prof.shifts[n - 1];
  if (ps.shift !== n) {
    ps.shift = n;
    ps.stage = 0;
    ps.pending = null;
  }
  ctx.shift = shift;
  busy = true;
  controls.setEnabled(false);
  setupShift(prof, shift);
  const room = world.rooms[prof.room];
  controls.dropFocus();
  controls.setPose(room.spawn.pos, room.spawn.yaw, -0.06);
  if (ps.stage === 0) await shiftIntro(prof, shift);
  save();
  setHintShift(`${prof.id}:${n}`);
  const shiftT0 = performance.now();
  track('shift_start', { prof: prof.id, shift: n });

  let hello = shift.hello;
  if (prof.id === 'security' && n === 5) hello = progress.outcome.call === 'won' ? 'Валентина Петровна спасена. Но Дима — только звено. К доске!' : 'Деньги Валентины Петровны ещё в цепочке. Догоним — к доске!';
  if (hello && ps.stage === 0) setTimeout(() => toast({ who: 'irina', emo: n === 1 ? 'worried' : 'neutral', text: hello.replace('{name}', progress.nickname) }), 500);
  if (prof.id === 'security' && n === 1) flash('red');

  for (let i = ps.stage; i < shift.steps.length; i++) {
    const step = shift.steps[i];
    prepareStep(prof, step);
    await waitForTarget(step);
    const res = await runStep(prof, shift, step);
    if (res) ps.pending = res;
    ps.stage = i + 1;
    save();
    if (step.run !== 'dawn') await controls.returnFromFocus();
  }

  const rankBefore = staffRank(progress).rank;
  const readyBefore = careerProfile(progress).ready;
  const res = { ...(ps.pending || { stars: 1, stats: [] }) };
  const stars = res.stars || 1;
  // Подсказки: −10% очков смены за каждую (не больше 30%), звёзды остаются
  const hintsUsed = endHintShift();
  if (hintsUsed) {
    const k = hintPenalty(hintsUsed);
    const cut = Math.round(Math.max(0, res.score || 0) * k);
    if (cut > 0) {
      res.score -= cut;
      ctx.addScore(-cut);
    }
    res.stats = [...(res.stats || []), ['💡', String(hintsUsed), `${hintsUsed === 1 ? 'подсказка' : 'подсказки'} · −${Math.round(k * 100)}% очков`]];
    track('hints_used', { prof: prof.id, shift: n, value: hintsUsed });
  }
  track('shift_end', { prof: prof.id, shift: n, stars, value: Math.round((performance.now() - shiftT0) / 1000) });
  const prev = ps.best[n];
  if (!prev || stars > prev.stars || (stars === prev.stars && (res.score || 0) > prev.score)) ps.best[n] = { stars, score: Math.max(0, res.score || 0) };
  ps.unlocked = Math.max(ps.unlocked, Math.min(5, n + 1));
  ps.pending = null;
  const last = n === 5;
  ps.shift = last ? 5 : n + 1;
  ps.stage = 0;
  ps.data = { ...ps.data, [`s${n}`]: undefined };
  save();
  refreshHud();
  setObjective(null);
  world.setMarker(null);
  const rankAfter = staffRank(progress).rank;
  const promo = rankAfter !== rankBefore ? { rank: rankAfter, progress } : null;
  if (promo) $('#btn-badge').classList.add('bump');
  const choice = await debrief(prof, shift, res, ps, last, teaser(prof.id, n, progress), promo, (v) => {
    ps.like = v;
    save();
    track('like', { prof: prof.id, shift: n, value: v });
  });
  if (!readyBefore && careerProfile(progress).ready && !progress.profileShown) await revealProfile();
  if (choice === 'retry') {
    track('shift_retry', { prof: prof.id, shift: n, stars });
    return playShift(prof, n);
  }
  if (last && choice === 'next') {
    const allDone = PROFESSIONS.every((p) => profDone(progress.profs[p.id]) === 5);
    const r = await professionSummary(prof, ps, ctx.diff, allDone && !progress.certificate);
    if (r === 'lobby') return enterLobby();
    return cabinetLoop(prof);
  }
  if (choice === 'next') return playShift(prof, n + 1);
  return cabinetLoop(prof);
}

function prepareStep(prof, step) {
  if (prof.id !== 'security') return;
  if (step.run === 'brief') {
    setTimeout(() => {
      if (target !== 'phone') return;
      world.setPhone('ring', 'Ирина В.');
      audio.ring(true);
      flash('red');
    }, 900);
  }
  if (step.run === 'call') {
    world.setAlarm(true);
    world.setWall('attack');
    world.setMain('case');
  }
  if (step.run === 'dawn') {
    world.setAlarm(false);
    world.setWall('clear');
    world.setMain('ok');
    audio.startMusic('calm');
    toast({ who: 'irina', emo: 'happy', text: `Ты — молодец, ${progress.nickname}. Смотри, светает.` });
  }
}

function waitForTarget(step) {
  target = step.target;
  setObjective(step.objective);
  world.setMarker(step.target);
  busy = false;
  if (!paused) controls.setEnabled(true);
  return new Promise((resolve) => {
    targetHit = () => {
      targetHit = null;
      target = null;
      busy = true;
      controls.setEnabled(false);
      world.setMarker(null);
      $('#hover-label').classList.remove('show');
      document.body.style.cursor = '';
      resolve();
    };
  });
}

// Задания смен: имя из данных → механика
async function episode(file, fn, focus) {
  await ctx.focus(focus);
  const mod = await import(`./episodes/${file}.js`);
  const r = await mod[fn](ctx, ctx.shift);
  closePanel();
  return r;
}

const RUNNERS = {
  teller: (step) => episode('teller', 'runTeller', step.target),
  teller_recon: (step) => episode('teller', 'runRecon', step.target),
  credit: (step) => episode('credit', 'runCredit', step.target),
  credit_month: (step) => episode('credit', 'runMonth', step.target),
  advisor: (step) => episode('advisor', 'runAdvisor', step.target),
  advisor_rewind: (step) => episode('advisor', 'runRewind', step.target),
  cash_plan: (step) => episode('cash', 'runPlan', step.target),
  cash_drive: (step) => episode('cash', 'runDrive', step.target),
  cash_vault: (step) => episode('cash', 'runVault', step.target),
  async phishing() {
    await ctx.focus('monitor');
    const r = await runPhishing(ctx);
    closePanel();
    world.setAlarm(false);
    world.setWall('normal');
    world.setMain('ok');
    audio.alarm(false);
    return r;
  },
  async flow() {
    await ctx.focus('wall');
    const r = await runFlow(ctx);
    closePanel();
    return r;
  },
  async rules() {
    await ctx.focus('radar');
    const r = await runRules(ctx);
    closePanel();
    progress.rule = r.rule;
    world.setRadarMode('radar');
    return r;
  },
  async brief() {
    audio.ring(false);
    world.setPhone('call', 'Ирина В.');
    audio.pickup();
    await ctx.focus('phone');
    await briefingCall(ctx);
    world.setPhone('off');
    return null;
  },
  async call() {
    let r;
    do {
      await ctx.focus('monitor');
      r = await runCall(ctx);
      closePanel();
      world.setPhone('off');
    } while (r.retry);
    progress.outcome.call = r.won ? 'won' : 'lost';
    setBeat(progress, 'call', progress.outcome.call);
    world.setAlarm(false);
    world.setWall('normal');
    return r;
  },
  async trace() {
    await ctx.focus('board');
    let r;
    do {
      r = await runTrace(ctx);
      closePanel();
      if (r.retry) await sleep(300);
    } while (r.retry);
    progress.outcome.trace = r.success ? 'frozen' : 'escaped';
    setBeat(progress, 'curator', r.success ? 'found' : 'escaped');
    progress.board = r.board;
    world.setBoard(r.board);
    return r;
  },
  async dawn() {
    await ctx.focus('window');
    world.setClock('05:48');
    audio.startMusic('dawn');
    audio.setRain(0);
    caption('Светает…', 3000);
    await world.animateSky('night', 'dawn', 7000);
    world.setPhone('msg', 'Маша: Здравствуйте!..');
    audio.notify();
    await sleep(600);
    const variant = progress.outcome.call === 'won' ? 'saved' : progress.outcome.trace === 'frozen' ? 'frozen' : 'lost';
    await mashaChat(variant);
    world.setPhone('off');
    return null;
  },
};

async function runStep(prof, shift, step) {
  try {
    // 'файл:функция' — механика из js/episodes/ без отдельной записи в RUNNERS
    if (!RUNNERS[step.run] && step.run.includes(':')) {
      const [file, fn] = step.run.split(':');
      return await episode(file, fn, step.target);
    }
    return await RUNNERS[step.run](step);
  } catch (e) {
    console.error(e);
    closePanel();
    return { stars: 1, stats: [] };
  }
}

// ─────────────────────────── взаимодействие ───────────────────────────
function onHover(item, mouse) {
  const label = $('#hover-label');
  document.body.classList.toggle('aim', !!item && !item.far);
  if (!item || mode === 'title') {
    label.classList.remove('show');
    document.body.style.cursor = '';
    return;
  }
  const isTarget = target === item.id || (mode === 'lobby' && (item.id === 'kiosk' || item.id === 'mentor' || item.id.startsWith('door_')));
  const key = mouse.center ? 'E' : isTouch ? 'тап' : 'клик';
  label.textContent = item.far ? `${item.label} · 🚶 подойди ближе` : isTarget ? `${item.label} · ${key}` : `${item.label} · ${key} — рассмотреть`;
  label.classList.toggle('target', isTarget && !item.far);
  label.classList.toggle('far', !!item.far);
  label.classList.toggle('center', !!mouse.center);
  if (mouse.center) {
    label.style.left = '50%';
    label.style.top = `calc(50% + 26px)`;
  } else {
    label.style.left = `${Math.min(mouse.x + 16, window.innerWidth - 220)}px`;
    label.style.top = `${mouse.y + 18}px`;
  }
  label.classList.add('show');
  if (!mouse.center) {
    const w = label.offsetWidth;
    const h = label.offsetHeight;
    label.style.left = `${Math.max(8, Math.min(mouse.x + 16, window.innerWidth - w - 8))}px`;
    label.style.top = `${Math.max(8, Math.min(mouse.y + 18, window.innerHeight - h - 8))}px`;
  }
  document.body.style.cursor = mouse.center ? '' : 'pointer';
}

// Мышь захвачена или отпущена: подсказка «кликни, чтобы осмотреться»
function onLock(locked) {
  document.body.classList.toggle('locked', locked);
  if (locked) $('#controls-hint').classList.remove('show');
}

function interact(item) {
  if (busy || paused || mode === 'title') return;
  audio.click();
  if (mode === 'lobby') return lobbyInteract(item);
  if (target === item.id && targetHit) return targetHit();
  if (item.id === 'exit' || (currentProf?.id === 'security' && item.id === 'door')) return leaveRoom();
  const room = world.rooms[world.room];
  const cap = (currentProf?.id === 'security' ? SECURITY_CAPTIONS[item.id] : null) || room.captions?.[item.id];
  if (cap) caption(cap);
}

// Клик рядом с целью задания засчитываем как клик по цели.
function onMiss(ndc) {
  if (busy || paused || mode !== 'room' || !target) return;
  const r = world.targetScreenRect(target);
  const pad = 0.06;
  if (r && ndc.x > r.minX - pad && ndc.x < r.maxX + pad && ndc.y > r.minY - pad && ndc.y < r.maxY + pad) {
    interact({ id: target });
    return;
  }
  const p = world.markerNDC(target);
  if (p && Math.hypot((p.x - ndc.x) * world.camera.aspect, p.y - ndc.y) < 0.16) interact({ id: target });
}

// Стрелка у края экрана, когда цель задания вне поля зрения.
function updateTargetArrow() {
  const arrow = $('#target-arrow');
  const t = mode !== 'title' && !busy && !paused && controls.enabled ? target || (mode === 'lobby' ? 'kiosk' : null) : null;
  const p = t && world.targetProjection(t);
  if (!p || (!p.behind && Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.85)) {
    arrow.classList.remove('show');
    return;
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  let x = p.x;
  let y = p.y;
  if (p.behind && Math.abs(x) < 0.3) x = x < 0 ? -1 : 1;
  const k = 1 / Math.max(Math.abs(x) / 0.84, Math.abs(y) / 0.7, 1e-6);
  x *= k;
  y *= k;
  arrow.querySelector('svg').style.transform = `rotate(${Math.atan2(-y * h, x * w)}rad)`;
  arrow.querySelector('span').textContent = TARGET_LABEL[t] || 'Цель';
  arrow.style.transform = `translate(${Math.round(((x + 1) / 2) * w)}px, ${Math.round(((1 - y) / 2) * h)}px) translate(-50%, -50%)`;
  arrow.classList.add('show');
}

function faceTarget() {
  const t = target || (mode === 'lobby' ? 'kiosk' : null);
  const pt = mode !== 'title' && !busy && !paused && t && world.markerPoint(t);
  if (!pt) return;
  audio.click();
  controls.turnTo([pt[0], pt[1] - 0.2, pt[2]]);
}

boot();
