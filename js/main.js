// «Профессии в Банке»: титульный экран → холл банка → кабинеты профессий → смены.
import { World } from './world.js';
import { Controls } from './controls.js';
import { audio } from './audio.js';
import { DIFFICULTY } from './data/config.js';
import { PROFESSIONS, PROF, KNOWLEDGE } from './data/professions.js';
import { loadSave, writeSave, clearSave, loadSettings, saveSettings, newProgress } from './save.js';
import { $, el, sleep, toast, caption, setObjective, closePanel, typeText, skipTyping, flash, showSaved, num } from './ui.js';
import { shiftIntro, debrief, professionSummary, certificate, album, professionCard, kioskMenu, cabinetCard, briefingCall, mashaChat, confirmBox, profStars, profDone, mentorTalk } from './screens.js';
import { story, setBeat, takeNews, recentNews, teaser, WELCOME, MENTOR } from './story.js';
import { buildLobby } from './rooms/lobby.js';
import { runPhishing } from './episodes/phishing.js';
import { runFlow } from './episodes/flow.js';
import { runRules } from './episodes/rules.js';
import { runCall } from './episodes/call.js';
import { runTrace } from './episodes/trace.js';

const settings = { sound: true, quality: null, nickname: '', difficulty: 'normal', jury: false, ...loadSettings() };
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
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

const TARGET_LABEL = { monitor: 'Монитор', phone: 'Телефон', board: 'Доска', window: 'Окно', wall: 'Видеостена', radar: 'Монитор', kiosk: 'Терминал', call: 'Кнопка вызова', cashbox: 'Касса', docs: 'Заявки', calendar: 'Календарь', table: 'Столик', screen: 'Экран', map: 'Карта', van: 'Броневик', vault: 'Хранилище', mentor: 'Наставник' };

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
  isPaused: () => paused,
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
  set('#stat-clients', `${stars}/75`);
  set('#stat-money', `${progress.knowledge.length}/${Object.keys(KNOWLEDGE).length}`);
  set('#stat-score', num(progress.stats.score));
}

// ─────────────────────────── запуск ───────────────────────────
async function boot() {
  try {
    world = new World($('#scene'), { quality: settings.quality });
  } catch (e) {
    console.error(e);
    $('#loading').innerHTML = '<p>Не получилось запустить 3D-графику. Откройте игру в свежем Chrome, Firefox, Safari или Edge.</p>';
    return;
  }
  ctx.world = world;
  world.registerRoom('lobby', buildLobby);
  world.setRoom('lobby');
  controls = new Controls(world, $('#scene'), { onHover, onClick: interact, onMiss });
  document.body.classList.toggle('touch', isTouch);
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
    if (world.room === 'security' && currentProf?.id === 'security' && progress?.profs.security.shift === 1 && target && !paused) world.state.threat += dt * 2.4;
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
    window.__bank = { get progress() { return progress; }, get mode() { return mode; }, get target() { return target; }, world, controls, ctx, enterRoomById: (id) => enterRoom(PROF[id]), hit: () => targetHit && targetHit() };
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
    saveSettings(settings);
    clearSave();
    return newProgress(settings.nickname, diff);
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
      begin(saved, false);
    });
  }
  start.addEventListener('click', async () => {
    audio.init();
    audio.resume();
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
  if (p) controls.setEnabled(false);
  else if (!busy) controls.setEnabled(true);
  if (p) audio.heartbeat(0);
}

// ─────────────────────────── вход в игру ───────────────────────────
async function begin(p, withIntro) {
  progress = p;
  // Режим жюри: все 25 смен открыты сразу, чтобы показать любую сторону профессии
  if (settings.jury) for (const id of Object.keys(progress.profs)) progress.profs[id].unlocked = 5;
  ctx.state = progress;
  ctx.diff = DIFFICULTY[progress.difficulty] || DIFFICULTY.normal;
  $('#title').classList.add('gone');
  if (withIntro) await playIntro();
  $('#hud').classList.remove('hidden');
  $('#hud-buttons').classList.remove('hidden');
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
  hint.textContent = isTouch ? 'Веди пальцем — осмотреться · Джойстик — ходить · Тап по двери — войти' : 'Зажми мышь — осмотреться · WASD — ходить · Клик по двери — войти';
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
  const lines = ['Понедельник. Первая неделя стажировки в банке.', 'Пять кабинетов — пять профессий: операционист, кредитный эксперт, консультант, инкассатор, безопасность.', `Одна неделя, за которую многое случится. Тебя уже ждут, ${progress.nickname}.`];
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
    if (mode === 'lobby') await mentorTalk(progress, { lines: WELCOME, btn: '🚪 Пойду выбирать кабинет' });
    if (mode === 'lobby') {
      await controls.returnFromFocus();
      world.setMarker('kiosk');
      busy = false;
      if (!paused) controls.setEnabled(true);
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
    await certificate(progress);
    busy = false;
    controls.setEnabled(true);
  }
}

function mentorChat() {
  const done = PROFESSIONS.reduce((s, p) => s + profDone(progress.profs[p.id]), 0);
  const fresh = takeNews(progress, 3);
  const news = fresh.length ? fresh : recentNews(progress, 3);
  const untouched = PROFESSIONS.filter((p) => !profDone(progress.profs[p.id]));
  const lines = [done === 0 ? 'Не знаешь, с чего начать? Любая дверь — хороший выбор. В первой смене каждой профессии — самое интересное.' : done >= 25 ? 'Все 25 смен позади! Ты попробовал(а) себя везде — это редкость.' : `Пройдено смен: ${done} из 25. Хороший темп, {name}!`];
  const tip = untouched.length ? `💡 Загляни к профессии «${untouched[0].title}» ${untouched[0].icon} — там ждёт первая смена.` : '💡 Переиграй смены на три звезды — лучший результат сохраняется.';
  save();
  return { lines, news, tip, btn: 'Спасибо!' };
}

async function lobbyInteract(item) {
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
  if (item.id.startsWith('door_')) openDoor(PROF[item.id.slice(5)]);
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
  mode = 'room';
  currentProf = prof;
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

  const res = ps.pending || { stars: 1, stats: [] };
  const stars = res.stars || 1;
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
  const choice = await debrief(prof, shift, res, ps, last, teaser(prof.id, n, progress));
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
  if (!item || mode === 'title') {
    label.classList.remove('show');
    document.body.style.cursor = '';
    return;
  }
  const isTarget = target === item.id || (mode === 'lobby' && (item.id === 'kiosk' || item.id === 'mentor' || item.id.startsWith('door_')));
  label.textContent = isTarget ? `${item.label} · нажми` : item.label;
  label.classList.toggle('target', isTarget);
  label.style.left = `${mouse.x + 16}px`;
  label.style.top = `${mouse.y + 18}px`;
  label.classList.add('show');
  document.body.style.cursor = 'pointer';
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
