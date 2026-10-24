// Холл банка: двери кабинетов пяти профессий, терминал очереди, табло, банкоматы и посетители.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text, SANS } from './kit.js';
import { PROFESSIONS } from '../data/professions.js';
import { thanksNotes, lobbyGuests } from '../story.js';
import { onBrand, drawBrand } from '../brand.js';

// Где стоит дверь каждой профессии: [x, z, поворот]
const DOORS = {
  teller: [-9, 2.2, Math.PI / 2],
  cash: [-9, -4, Math.PI / 2],
  credit: [9, 2.2, -Math.PI / 2],
  advisor: [9, -4, -Math.PI / 2],
  security: [0, -8, 0],
};

export function buildLobby(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe6f7);
  const room = makeRoom(scene, {
    bounds: { minX: -8.3, maxX: 8.3, minZ: -7.3, maxZ: 7.3 },
    obstacles: [
      [-0.7, 0.7, 2.0, 3.2],
      [-4.9, -4.1, -3.4, -2.6],
      [4.1, 4.9, -3.4, -2.6],
      [-4.9, -4.1, 2.6, 3.4],
      [4.1, 4.9, 2.6, 3.4],
      [-6.3, -3.7, 4.6, 6.0],
      [3.7, 6.3, 4.6, 6.0],
      [-7.3, -4.7, 0.7, 1.6],
      [6.5, 7.3, -2.7, -1.9],
    ],
    spawn: { pos: [0, 1.62, 6.6], yaw: 0 },
  });
  const k = createKit(world, scene, room.interactables);
  const W = 18;
  const D = 16;
  const H = 5;

  // Мраморный пол с зелёной дорожкой
  const floorCv = k.canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d9d3c8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(160,155,150,0.12)' : 'rgba(255,255,255,0.3)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = 'rgba(150,145,140,0.35)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= w; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, h);
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }
  });
  floorCv.tex.wrapS = floorCv.tex.wrapT = THREE.RepeatWrapping;
  floorCv.tex.repeat.set(4.5, 4);
  k.shell({ w: W, d: D, h: H, floorTex: floorCv.tex, floor: 0xffffff, wall: 0xe4ded3 });
  const path = k.plane(2.2, 14, k.M(0x1f7a4d, { roughness: 0.5 }), 0, 0.005, 0.5);
  path.rotation.x = -Math.PI / 2;
  // круг у терминала выше дорожки: при зазоре в 1 мм он мерцал на телефонах
  const ring = k.plane(5.5, 5.5, new THREE.MeshBasicMaterial({ color: 0x1f7a4d, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0.02, 2.6);
  ring.rotation.x = -Math.PI / 2;

  // Зелёная полоса по стенам
  const band = k.M(0x1f7a4d, { roughness: 0.6 });
  k.box(W, 0.35, 0.04, band, 0, 4.3, -D / 2 + 0.03);
  k.box(0.04, 0.35, D, band, -W / 2 + 0.03, 4.3, 0);
  k.box(0.04, 0.35, D, band, W / 2 - 0.03, 4.3, 0);

  // Потолочные светильники
  const lamp = k.glow(0xffffff, 1.1);
  for (const x of [-5, 0, 5]) for (const z of [-4, 0, 4]) {
    const p = k.plane(1.6, 0.5, lamp, x, H - 0.01, z);
    p.rotation.x = Math.PI / 2;
  }

  // Входная стена: окна и стеклянные двери
  const sky = k.canvas(1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8cc4f2');
    g.addColorStop(1, '#e8f4ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fb4c8';
    for (let x = 0; x < w; x += 50 + Math.random() * 40) ctx.fillRect(x, h - 60 - Math.random() * 110, 40 + Math.random() * 30, 200);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(200, 60, 80, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(700, 40, 110, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  k.plane(16, 3.6, new THREE.MeshBasicMaterial({ map: sky.tex, toneMapped: false }), 0, 2.2, D / 2 - 0.02, Math.PI);
  const frame = k.M(0x2b2f36, { metalness: 0.5, roughness: 0.4 });
  for (let x = -8; x <= 8; x += 2) k.box(0.08, 3.6, 0.08, frame, x, 2.2, D / 2 - 0.05);
  k.box(16, 0.1, 0.1, frame, 0, 4.0, D / 2 - 0.05);
  k.box(16, 0.1, 0.1, frame, 0, 0.4, D / 2 - 0.05);

  // Колонны и растения
  const col = k.M(0xf7f5f0, { roughness: 0.4 });
  for (const [x, z] of [[-4.5, -3], [4.5, -3], [-4.5, 3], [4.5, 3]]) {
    k.cyl(0.32, 0.32, H, col, x, H / 2, z);
    k.cyl(0.42, 0.42, 0.12, k.M(0x1f7a4d), x, 0.06, z);
  }
  k.plant(-7.6, 7.2);
  k.plant(7.6, 7.2);
  k.plant(-7.6, -7.2, null, 1.2);
  k.plant(7.6, -7.2, null, 1.2);

  // Зона ожидания: диваны и посетители
  const sofaM = k.M(0x2f6f9a, { roughness: 0.9 });
  for (const sx of [-5, 5]) {
    const sofa = new THREE.Group();
    k.box(2.4, 0.42, 0.9, sofaM, 0, 0.21, 0, sofa);
    k.box(2.4, 0.6, 0.22, sofaM, 0, 0.6, 0.38, sofa);
    sofa.position.set(sx, 0, 5.3);
    // спинка — к окнам, посетители сидят лицом в зал
    scene.add(sofa);
  }
  const people = [
    k.person({ shirt: 0xd1495b, hair: 0x2b1d1a, sit: true }, -5.6, 5.05, Math.PI),
    k.person({ shirt: 0x2a9d8f, hair: 0x6b3e26, sit: true }, 4.6, 5.05, Math.PI),
    k.person({ shirt: 0xe9a23b, hair: 0x3b2a20 }, -6.9, 1.2, -Math.PI / 2),
    k.person({ shirt: 0x4f8bd6, hair: 0x1d1d1d, h: 0.8 }, -6.0, 1.0, -Math.PI / 2),
    k.person({ shirt: 0x6c757d, hair: 0x8a6a4a }, -5.1, 1.15, -Math.PI / 2),
    k.person({ shirt: 0x9b5de5, hair: 0xc9ccd3 }, 6.9, -2.3, 0.96),
  ];

  // Терминал электронной очереди — быстрый выбор профессии
  const kiosk = new THREE.Group();
  k.box(0.7, 1.2, 0.5, k.M(0x1f7a4d, { roughness: 0.4 }), 0, 0.6, 0, kiosk);
  const ks = k.sign(0.78, 0.6, 512, 400, (ctx, w, h) => {
    ctx.fillStyle = '#0b2a1d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'ЭЛЕКТРОННАЯ', w / 2, 60, { size: 40, align: 'center', color: '#7dffc0' });
    text(ctx, 'ОЧЕРЕДЬ', w / 2, 108, { size: 40, align: 'center', color: '#7dffc0' });
    text(ctx, PROFESSIONS.map((p) => p.icon).join(' '), w / 2, 200, { size: 54, align: 'center' });
    roundRect(ctx, 70, 270, w - 140, 84, 18);
    ctx.fillStyle = '#3ddc84';
    ctx.fill();
    text(ctx, 'ВЗЯТЬ ТАЛОН', w / 2, 313, { size: 40, align: 'center', color: '#04140c' });
  }, 0, 1.45, 0.05, 0, kiosk);
  ks.rotation.x = -0.35;
  k.box(0.82, 0.66, 0.06, k.M(0x10151c), 0, 1.44, 0.02, kiosk).rotation.x = -0.35;
  kiosk.position.set(0, 0, 2.6);
  scene.add(kiosk);
  k.reg('kiosk', kiosk, 'Терминал очереди');
  room.markers.kiosk = [0, 2.35, 2.6, 1.6];
  room.focus.kiosk = { pos: [0, 1.6, 4.2], look: [0, 1.35, 2.6] };

  // Наставник стажёров — Галина Сергеевна, управляющая отделением. Рядом ролл-ап «Неделя стажёра».
  const mentor = new THREE.Group();
  const mentorBody = k.person({ shirt: 0x1f5a3d, pants: 0x1c2a24, hair: 0x6d4a33 }, 0, 0, 0, mentor);
  k.box(0.08, 0.045, 0.02, k.glow(0x3ddc84, 1.1), -0.08, 1.24, 0.19, mentorBody);
  people.push(mentorBody);
  const rollup = new THREE.Group();
  k.box(0.9, 0.06, 0.25, k.M(0x2b2f36, { metalness: 0.5 }), 0, 0.03, 0, rollup);
  k.box(0.03, 2.0, 0.03, k.M(0x9aa3ad, { metalness: 0.7 }), 0, 1.0, -0.05, rollup);
  const drawRollup = (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f7a4d');
    g.addColorStop(1, '#0b2a1d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // с логотипом банка всё сдвигается вниз, чтобы освободить место под плашку
    const o = drawBrand(ctx, 30, 22, w - 60, 86) ? 1 : 0;
    text(ctx, 'НЕДЕЛЯ', w / 2, 70 + o * 80, { size: 46, align: 'center', color: '#ffffff' });
    text(ctx, 'СТАЖЁРА', w / 2, 122 + o * 80, { size: 46, align: 'center', color: '#7dffc0' });
    text(ctx, '5 кабинетов', w / 2, 210 + o * 62, { size: 30, align: 'center', color: '#e3f6ec', weight: 700 });
    text(ctx, '25 смен', w / 2, 252 + o * 56, { size: 30, align: 'center', color: '#e3f6ec', weight: 700 });
    text(ctx, PROFESSIONS.map((p) => p.icon).slice(0, 3).join(' '), w / 2, 340 + o * 40, { size: 50, align: 'center' });
    text(ctx, PROFESSIONS.map((p) => p.icon).slice(3).join(' '), w / 2, 410 + o * 30, { size: 50, align: 'center' });
    roundRect(ctx, 30, 500, w - 60, 120, 18);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    text(ctx, 'Спроси', w / 2, 540, { size: 30, align: 'center', color: '#1b1405' });
    text(ctx, 'наставника', w / 2, 582, { size: 30, align: 'center', color: '#1b1405' });
  };
  const rollSign = k.sign(0.86, 1.95, 300, 680, drawRollup, 0, 1.05, 0, 0, rollup);
  onBrand(() => rollSign.userData.canvas.redraw(drawRollup));
  rollup.position.set(1.35, 0, 2.35);
  rollup.rotation.y = -0.2;
  scene.add(rollup);
  mentor.position.set(2.35, 0, 2.75);
  mentor.rotation.y = -0.55;
  scene.add(mentor);
  k.reg('mentor', mentor, 'Галина Сергеевна · наставник');
  room.obstacles.push([0.85, 2.8, 2.1, 3.15]);
  room.markers.mentor = [2.35, 2.2, 2.75, 1.0];
  room.focus.mentor = { pos: [1.25, 1.6, 4.6], look: [2.35, 1.45, 2.75] };

  // Табло над входом в центр безопасности
  let ticket = 17;
  let shown = 0;
  const board = k.sign(5.2, 0.95, 1200, 220, () => {}, 0, 4.32, -D / 2 + 0.06);
  const drawBoard = () => {
    const prof = PROFESSIONS[shown % PROFESSIONS.length];
    board.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0b1a14';
      ctx.fillRect(0, 0, w, h);
      const lx = drawBrand(ctx, 34, 16, 250, 92) ? 310 : 40;
      text(ctx, 'ПРОФЕССИИ В БАНКЕ', lx, 62, { size: 58, color: '#7dffc0' });
      text(ctx, `Талон А-0${ticket}`, 40, 158, { size: 52, color: '#ffffff' });
      const dest = `→ ${prof.icon} ${prof.title}`;
      text(ctx, dest, 470, 158, { size: dest.length > 20 ? 42 : 52, color: prof.color });
    });
  };
  drawBoard();
  onBrand(drawBoard);

  // ─────────── Отделение банка: операционный зал, консультации, банкоматы, охрана ───────────
  const show = (obj, on) => {
    obj.visible = on;
    obj.traverse((o) => (on ? o.layers.enable(0) : o.layers.disable(0)));
  };
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 });
  const counterM = k.M(0xf2efe8, { roughness: 0.5 });
  const darkM = k.M(0x2b2f36, { roughness: 0.5 });
  const greenM = k.M(0x1f7a4d, { roughness: 0.45 });
  const screenM = k.M(0x10151c, { roughness: 0.4 });
  room.captions = {};

  // Операционный зал: три окна операционистов за стеклом
  const tellerZone = new THREE.Group();
  k.box(6.9, 1.05, 0.75, counterM, 0, 0.525, 0, tellerZone);
  k.box(6.9, 0.08, 0.85, greenM, 0, 1.09, 0.02, tellerZone);
  for (const [i, x] of [-2.3, 0, 2.3].entries()) {
    k.plane(2.0, 1.15, glass, x, 1.7, 0.2, 0, tellerZone);
    k.box(0.06, 1.2, 0.06, darkM, x - 1.08, 1.7, 0.2, tellerZone);
    k.sign(0.5, 0.32, 160, 100, (ctx, w, h) => {
      ctx.fillStyle = '#1f7a4d';
      ctx.fillRect(0, 0, w, h);
      text(ctx, `Окно ${i + 1}`, w / 2, h / 2, { size: 40, align: 'center' });
    }, x, 2.42, 0.22, 0, tellerZone);
    k.box(0.5, 0.34, 0.05, screenM, x - 0.35, 1.32, -0.25, tellerZone);
    k.person({ shirt: [0x1f5a3d, 0x2a6f8f, 0x6b3f5e][i], hair: [0x2b1d1a, 0xb5651d, 0x1d1d1d][i], sit: true }, x, -0.75, 0, tellerZone);
  }
  k.box(0.06, 1.2, 0.06, darkM, 3.38, 1.7, 0.2, tellerZone);
  tellerZone.position.set(-5.0, 0, -6.7);
  scene.add(tellerZone);
  k.reg('tellers', tellerZone, 'Операционный зал');
  room.captions.tellers = 'Операционный зал. Здесь платят, переводят и снимают деньги. Хочешь за стекло? Дверь «Операционист» слева 🧾';
  // клиенты у окон
  const atWindows = [k.person({ shirt: 0xe76f51, hair: 0x3b2a20 }, -7.3, -5.65, Math.PI), k.person({ shirt: 0x577590, hair: 0xc9ccd3 }, -2.7, -5.65, Math.PI)];
  // табло электронной очереди над окнами
  const queueBoard = k.sign(3.4, 0.6, 900, 160, () => {}, -5.0, 3.15, -7.95);
  const drawQueue = (n) => queueBoard.userData.canvas.redraw((ctx, w, h) => {
    ctx.fillStyle = '#0b1a14';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'ТАЛОН → ОКНО', 40, 50, { size: 36, color: '#7dffc0' });
    text(ctx, `А-0${15 + n}  →  ${1 + (n % 3)}`, 40, 115, { size: 56, color: '#ffffff' });
    text(ctx, `Б-0${30 + n}  →  ${1 + ((n + 1) % 3)}`, 500, 115, { size: 40, color: '#8fb3a4' });
  });
  drawQueue(0);

  // Зона консультаций: два стола со стеклянной перегородкой
  const deskZone = new THREE.Group();
  for (const [i, x] of [-1.6, 1.6].entries()) {
    k.box(2.0, 0.08, 0.9, k.M(0xc8a27a, { roughness: 0.6 }), x, 0.76, 0, deskZone);
    k.box(1.9, 0.72, 0.06, k.M(0xb08a62), x, 0.38, -0.4, deskZone);
    k.box(0.6, 0.38, 0.05, screenM, x, 1.0, -0.25, deskZone);
    k.sign(0.6, 0.18, 240, 72, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      text(ctx, ['Вклады', 'Кредиты'][i], w / 2, h / 2, { size: 34, align: 'center', color: '#1f7a4d' });
    }, x, 0.92, 0.36, 0, deskZone);
    k.person({ shirt: [0x1f5a3d, 0x264653][i], hair: [0x6b3e26, 0x1d1d1d][i], sit: true }, x, -0.85, 0, deskZone);
    k.box(0.5, 0.45, 0.5, k.M(0x2f6f9a, { roughness: 0.9 }), x, 0.22, 0.85, deskZone);
  }
  k.plane(0.05, 1.2, glass, 0, 1.2, 0, Math.PI / 2, deskZone);
  deskZone.position.set(5.2, 0, -6.4);
  scene.add(deskZone);
  k.reg('desks', deskZone, 'Консультации');
  room.captions.desks = 'Столы консультантов: вклады и кредиты. Похоже на кабинеты «Кредитный эксперт» и «Финансовый консультант» справа 📝📈';
  k.sign(3.6, 0.5, 900, 125, (ctx, w, h) => {
    ctx.fillStyle = '#0b1a14';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'КОНСУЛЬТАЦИИ · ВКЛАДЫ · КРЕДИТЫ', w / 2, h / 2, { size: 50, align: 'center', color: '#7dffc0' });
  }, 5.2, 3.15, -7.95);

  // Зона 24/7: банкоматы и табло курсов у входа
  for (const z of [4.9, 6.2]) {
    const atm = new THREE.Group();
    k.box(0.6, 1.9, 0.9, k.M(0x2b3440, { metalness: 0.4, roughness: 0.5 }), 0, 0.95, 0, atm);
    const drawAtm = (ctx, w, h) => {
      ctx.fillStyle = '#1f7a4d';
      ctx.fillRect(0, 0, w, h);
      if (!drawBrand(ctx, 10, 22, w - 20, 72)) text(ctx, 'БАНК', w / 2, 60, { size: 36, align: 'center' });
      text(ctx, '24/7', w / 2, 130, { size: 40, align: 'center', color: '#7dffc0' });
    };
    const atmSign = k.sign(0.4, 0.6, 170, 256, drawAtm, 0.31, 1.45, 0, Math.PI / 2, atm);
    onBrand(() => atmSign.userData.canvas.redraw(drawAtm));
    k.box(0.1, 0.05, 0.5, k.glow(0x3ddc84, 1), 0.31, 1.05, 0, atm);
    atm.position.set(-8.55, 0, z);
    scene.add(atm);
    k.reg(`atm${z}`, atm, 'Банкомат');
    room.captions[`atm${z}`] = 'Банкомат. Кто его заряжает деньгами? Инкассаторы — загляни в их гараж 🚚';
  }
  k.sign(1.9, 1.1, 480, 280, (ctx, w, h) => {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'КУРСЫ ВАЛЮТ', 24, 40, { size: 30, color: '#4cc9f0' });
    text(ctx, 'покупка  продажа', 190, 90, { size: 22, color: '#8fb3a4', weight: 600 });
    [['$', '89.20', '92.40'], ['€', '96.50', '99.80'], ['¥', '12.10', '12.90']].forEach(([c, b, s2], i) => {
      text(ctx, c, 40, 140 + i * 50, { size: 38 });
      text(ctx, b, 200, 140 + i * 50, { size: 34, color: '#7dffc0' });
      text(ctx, s2, 340, 140 + i * 50, { size: 34, color: '#ffb3bb' });
    });
  }, -8.96, 2.9, -6.0, Math.PI / 2);

  // Охранник у входа
  const guard = k.person({ shirt: 0x22303d, pants: 0x1c2026, hair: 0x2b1d1a }, 2.4, 7.0, Math.PI + 0.3);
  k.box(0.12, 0.06, 0.02, k.glow(0xffd166, 1), 0.08, 1.24, 0.19, guard);
  k.reg('guard', guard, 'Охранник Виктор');
  room.captions.guard = 'Охранник Виктор: «Добро пожаловать! Банк — это не только деньги, это доверие людей. Береги его»';

  // Стойка с буклетами, кулер и плакат против мошенников
  const rack = new THREE.Group();
  k.box(0.9, 1.4, 0.35, k.M(0xe9e4da), 0, 0.7, 0, rack);
  [0x3ddc84, 0x4cc9f0, 0xffb020, 0x9b6dff, 0xff7a45, 0xff4d5e].forEach((c, i) => k.box(0.22, 0.3, 0.03, k.M(c), -0.28 + (i % 3) * 0.28, 0.45 + Math.floor(i / 3) * 0.45, 0.19, rack));
  rack.position.set(7.4, 0, 5.9);
  rack.rotation.y = -Math.PI / 2;
  scene.add(rack);
  k.reg('rack', rack, 'Буклеты');
  const TIPS = ['Буклет «Как копить»: сначала подушка безопасности, потом мечта.', 'Буклет «Мошенники»: банк никогда не просит код из СМС.', 'Буклет «Кредит»: платежи — не больше трети дохода.', 'Буклет «Вклады»: вклад даёт процент выше, но снять раньше — проценты сгорят.', 'Буклет «Пирамиды»: «гарантированные 30% в месяц» — всегда обман.'];
  let tipN = 0;
  room.captions.rack = () => TIPS[tipN++ % TIPS.length];
  const cooler = new THREE.Group();
  k.box(0.35, 1.0, 0.35, k.M(0xf4f4f4), 0, 0.5, 0, cooler);
  k.cyl(0.14, 0.14, 0.42, new THREE.MeshStandardMaterial({ color: 0x7cc6ff, transparent: true, opacity: 0.6 }), 0, 1.22, 0, cooler);
  cooler.position.set(-7.6, 0, 3.6);
  scene.add(cooler);
  k.reg('cooler', cooler, 'Кулер');
  room.captions.cooler = '💧 Вода для посетителей. Мелочь, а людям приятно';
  const poster = k.sign(1.3, 1.7, 360, 470, (ctx, w, h) => {
    ctx.fillStyle = '#ff4d5e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff7e0';
    ctx.fillRect(14, 14, w - 28, h - 28);
    text(ctx, '📞', w / 2, 90, { size: 90, align: 'center' });
    text(ctx, 'ЗВОНЯТ', w / 2, 190, { size: 44, align: 'center', color: '#b3001b' });
    text(ctx, '«ИЗ БАНКА»?', w / 2, 240, { size: 44, align: 'center', color: '#b3001b' });
    text(ctx, 'Положи трубку', w / 2, 320, { size: 32, align: 'center', color: '#1d2430' });
    text(ctx, 'и позвони сам', w / 2, 362, { size: 32, align: 'center', color: '#1d2430' });
    text(ctx, 'по номеру на карте', w / 2, 404, { size: 28, align: 'center', color: '#1d2430', weight: 600 });
  }, 8.97, 2.0, 6.0, -Math.PI / 2, null, false);
  k.reg('poster', poster, 'Плакат');
  room.captions.poster = 'Плакат: «Звонят из банка? Положи трубку и позвони сам». Мошенники как раз так и работают — спроси Валентину Петровну';

  // Стена благодарностей: записки от клиентов, которым помог стажёр
  const thanks = k.sign(2.5, 1.5, 750, 450, () => {}, -8.94, 2.0, -0.9, Math.PI / 2, null, false);
  k.box(0.03, 1.62, 2.62, k.M(0x6d4a33), -8.985, 2.0, -0.9);
  k.reg('thanks', thanks, 'Стена благодарностей');
  room.markers.thanks = [-8.6, 3.1, -0.9, 1.0];
  room.focus.thanks = { pos: [-6.2, 1.65, -0.9], look: [-8.9, 1.9, -0.9] };
  const drawThanks = (notes) => thanks.userData.canvas.redraw((ctx, w, h) => {
    ctx.fillStyle = '#b98b5e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(80,50,20,0.12)' : 'rgba(255,230,190,0.12)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    text(ctx, 'СПАСИБО!', w / 2, 44, { size: 44, align: 'center', color: '#3a2412' });
    if (!notes.length) {
      text(ctx, 'пока пусто — помоги клиентам,', w / 2, 230, { size: 30, align: 'center', color: '#5b3a1e', weight: 600 });
      text(ctx, 'и они напишут сюда', w / 2, 272, { size: 30, align: 'center', color: '#5b3a1e', weight: 600 });
      return;
    }
    const COLORS = ['#fff3a3', '#c8f7d4', '#ffd6e0', '#cfe8ff', '#ffe0b8'];
    notes.slice(0, 8).forEach((n, i) => {
      const x = 30 + (i % 4) * 178;
      const y = 86 + Math.floor(i / 4) * 178;
      ctx.save();
      ctx.translate(x + 80, y + 80);
      ctx.rotate(((i * 37) % 11 - 5) * 0.012);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-76, -72, 160, 160);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fillRect(-80, -80, 160, 160);
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(0, -70, 9, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, n.icon, 0, -20, { size: 56, align: 'center' });
      const who = n.from.split(',')[0].split(' ')[0];
      text(ctx, who.length > 9 ? `${who.slice(0, 8)}…` : who, 0, 46, { size: 22, align: 'center', color: '#3a2412', weight: 700 });
      ctx.restore();
    });
  });
  drawThanks([]);

  // Карьерный стенд напротив стены благодарностей: профиль стажёра — какая профессия подходит
  const career = k.sign(2.5, 1.5, 750, 450, () => {}, 8.94, 2.0, -0.9, -Math.PI / 2);
  k.box(0.03, 1.62, 2.62, k.M(0x1f7a4d, { roughness: 0.5 }), 8.985, 2.0, -0.9);
  k.box(0.04, 0.05, 2.5, k.glow(0x3ddc84, 1.2), 8.95, 2.83, -0.9);
  k.reg('career', career, 'Карьерный стенд');
  room.markers.career = [8.6, 3.1, -0.9, 1.0];
  room.focus.career = { pos: [5.9, 1.65, -0.9], look: [8.9, 1.95, -0.9] };
  let careerState = { tried: [], ready: false, top: null };
  const drawCareer = (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#11452e');
    g.addColorStop(1, '#0a1f16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const lx = drawBrand(ctx, 28, 24, 230, 86) ? 285 : 36;
    text(ctx, 'КАРЬЕРА В БАНКЕ', lx, 52, { size: 40, color: '#7dffc0' });
    text(ctx, 'Профиль стажёра', lx, 96, { size: 30, color: '#e3f6ec', weight: 700 });
    const { tried, ready, top } = careerState;
    if (ready && top) {
      text(ctx, 'Тебе подходит:', w / 2, 168, { size: 30, align: 'center', color: '#cfe9dc', weight: 700 });
      text(ctx, `${top.icon} ${top.title}`, w / 2, 218, { size: 44, align: 'center', color: top.color });
    } else text(ctx, 'Какая профессия — твоя?', w / 2, 190, { size: 38, align: 'center' });
    PROFESSIONS.forEach((p, i) => {
      const x = 115 + i * 130;
      const on = tried.includes(p.id);
      ctx.beginPath();
      ctx.arc(x, 300, 46, 0, Math.PI * 2);
      ctx.fillStyle = on ? p.color : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.globalAlpha = on ? 1 : 0.45;
      text(ctx, p.icon, x, 300, { size: 46, align: 'center' });
      ctx.globalAlpha = 1;
      if (on) {
        ctx.beginPath();
        ctx.arc(x + 34, 266, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        text(ctx, '✓', x + 34, 267, { size: 22, align: 'center', color: '#1f7a4d' });
      }
    });
    text(ctx, ready ? '✓ Профиль готов — открой его' : `Попробовано ${tried.length} из 5 — сыграй в каждом кабинете`, w / 2, 400, { size: ready ? 32 : 28, align: 'center', color: ready ? '#ffd166' : '#cfe9dc', weight: 700 });
  };
  career.userData.canvas.redraw(drawCareer);
  onBrand(() => career.userData.canvas.redraw(drawCareer));
  room.setCareer = (cp) => {
    careerState = { tried: cp.tried, ready: cp.ready, top: cp.ready ? cp.top.prof : null };
    career.userData.canvas.redraw(drawCareer);
  };

  // Гости холла: клиенты, которым помог стажёр, приходят в отделение
  const bikeModel = (x, z, ry) => {
    const g = new THREE.Group();
    const tire = k.M(0x1d1d1d);
    for (const bx of [-0.42, 0.42]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 24), tire);
      w.position.set(bx, 0.3, 0);
      g.add(w);
    }
    const fr = k.M(0xff9f1c, { roughness: 0.4 });
    k.box(0.75, 0.05, 0.05, fr, 0, 0.55, 0, g).rotation.z = -0.15;
    k.box(0.05, 0.42, 0.05, fr, -0.12, 0.42, 0, g).rotation.z = 0.35;
    k.box(0.05, 0.5, 0.05, fr, 0.38, 0.5, 0, g).rotation.z = -0.3;
    k.box(0.05, 0.05, 0.4, darkM, 0.44, 0.78, 0, g);
    k.box(0.22, 0.05, 0.1, darkM, -0.22, 0.68, 0, g);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    return g;
  };
  const guests = {
    gran: k.person({ shirt: 0x7b3f5e, hair: 0xc9ccd3, sit: true }, -4.4, 5.05, Math.PI),
    misha: (() => {
      const g = new THREE.Group();
      g.userData.kid = k.person({ shirt: 0xff9f1c, hair: 0x3b2a20, h: 0.72 }, 0, 0, -0.6, g);
      g.add(bikeModel(0.55, 0.15, -0.6));
      g.position.set(-2.3, 0, 5.9);
      scene.add(g);
      return g;
    })(),
    maxim: k.person({ shirt: 0x90be6d, hair: 0x3e2723 }, -7.4, 5.5, Math.PI / 2),
    artyom: (() => {
      const g = k.person({ shirt: 0x06d6a0, hair: 0x1d1d1d }, 6.2, 1.4, -Math.PI / 2);
      k.box(0.42, 0.42, 0.3, k.M(0xffd166), 0, 1.15, -0.3, g);
      return g;
    })(),
    croissants: (() => {
      const g = new THREE.Group();
      k.box(0.5, 0.12, 0.35, k.M(0xf4e1c1), 0, 0, 0, g);
      for (let i = 0; i < 4; i++) k.sphere(0.06, k.M(0xd9a066), -0.15 + i * 0.1, 0.1, 0, g).scale.set(1.6, 0.8, 1);
      g.position.set(7.4, 1.48, 5.9);
      scene.add(g);
      return g;
    })(),
  };
  // на месте Валентины Петровны, пока она не пришла, сидит обычный посетитель
  const granStand = k.person({ shirt: 0x8e7dbe, hair: 0x6b3e26, sit: true }, -4.4, 5.05, Math.PI);
  for (const [id, obj] of Object.entries(guests)) {
    k.reg(`guest_${id}`, obj, { gran: 'Валентина Петровна', misha: 'Миша', maxim: 'Максим', artyom: 'Артём', croissants: 'Круассаны' }[id]);
    show(obj, false);
  }
  room.obstacles.push([-8.6, -1.5, -7.4, -5.9], [3.1, 7.4, -7.6, -5.4], [-9, -7.9, 4.3, 6.8], [7.0, 7.8, 5.4, 6.4], [-7.9, -7.3, 3.3, 3.9], [2.1, 2.7, 6.7, 7.3], [-2.7, -1.5, 5.6, 6.3], [5.9, 6.5, 1.1, 1.7]);

  // Сюжет меняет холл: гости, записки, круассаны
  room.setStory = (state) => {
    const guestsOn = lobbyGuests(state);
    for (const [id, obj] of Object.entries(guests)) {
      show(obj, !!guestsOn[id]);
      if (guestsOn[id]) room.captions[`guest_${id}`] = guestsOn[id];
    }
    show(granStand, !guestsOn.gran);
    drawThanks(thanksNotes(state));
  };

  // Двери кабинетов
  const doorPlates = {};
  for (const prof of PROFESSIONS) {
    const [x, z, ry] = DOORS[prof.id];
    const g = new THREE.Group();
    const color = new THREE.Color(prof.color);
    const frameM = k.M(0x2b2f36, { roughness: 0.5 });
    k.box(0.14, 2.9, 0.18, frameM, -0.85, 1.45, 0, g);
    k.box(0.14, 2.9, 0.18, frameM, 0.85, 1.45, 0, g);
    k.box(1.84, 0.16, 0.18, frameM, 0, 2.95, 0, g);
    const panelM = prof.id === 'cash' ? k.M(0x8a939e, { metalness: 0.8, roughness: 0.35 }) : prof.id === 'security' ? k.M(0x1c232b, { roughness: 0.4 }) : k.M(color.clone().multiplyScalar(0.35).add(new THREE.Color(0x2a2a2a)), { roughness: 0.5 });
    // полотно чуть впереди стены: в одной плоскости со стеной оно мерцало (z-fighting)
    k.box(1.56, 2.8, 0.06, panelM, 0, 1.4, 0.04, g);
    k.box(0.06, 0.3, 0.06, k.M(0xd9d9d9, { metalness: 0.9, roughness: 0.2 }), 0.6, 1.25, 0.1, g);
    const strip = k.glow(prof.color, 1.6);
    k.box(0.04, 2.8, 0.04, strip, -0.77, 1.45, 0.12, g);
    k.box(0.04, 2.8, 0.04, strip, 0.77, 1.45, 0.12, g);
    k.box(1.58, 0.04, 0.04, strip, 0, 2.86, 0.12, g);
    if (prof.id === 'cash') k.cyl(0.38, 0.38, 0.06, k.M(0x6c757d, { metalness: 0.9, roughness: 0.3 }), 0, 1.5, 0.1, g).rotation.x = Math.PI / 2;
    const plate = k.sign(2.2, 0.62, 640, 180, () => {}, 0, 3.45, 0.05, 0, g);
    doorPlates[prof.id] = { plate, prof };
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 40), new THREE.MeshBasicMaterial({ color: prof.color, transparent: true, opacity: 0.6, toneMapped: false }));
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.set(0, 0.012, 1.0);
    g.add(floorRing);
    g.userData.ring = floorRing;
    const light = new THREE.PointLight(prof.color, 2.2, 4.5, 2);
    light.position.set(0, 2.4, 0.9);
    g.add(light);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    k.reg(`door_${prof.id}`, g, prof.full);
    const n = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    room.markers[`door_${prof.id}`] = [x + n.x * 0.3, 4.05, z + n.z * 0.3, 1.8];
    room.focus[`door_${prof.id}`] = { pos: [x + n.x * 3.2, 1.65, z + n.z * 3.2], look: [x, 1.9, z] };
    room[`ring_${prof.id}`] = floorRing;
  }

  // Подписи на дверях со звёздами прогресса
  room.setProgress = (profId, stars = 0, done = 0) => {
    const { plate, prof } = doorPlates[profId];
    plate.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = prof.color;
      roundRect(ctx, 0, 0, w, h, 26);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, 8, 8, w - 16, h - 16, 20);
      ctx.fill();
      text(ctx, prof.icon, 70, h / 2, { size: 80, align: 'center' });
      const title = prof.title.length > 16 ? prof.title.replace(' ', '\n') : prof.title;
      const lines = title.split('\n');
      lines.forEach((l, i) => text(ctx, l, 140, h / 2 - (lines.length - 1) * 24 + i * 48 - (done ? 14 : 0), { size: 44 }));
      if (done) text(ctx, `${'★'.repeat(Math.min(15, stars) > 0 ? 1 : 0)} ${stars}/15 · смен ${done}/5`, 140, h - 30, { size: 28, color: '#fff3c4', weight: 700 });
    });
  };
  for (const p of PROFESSIONS) room.setProgress(p.id);

  // Свет
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x9f937c, 1.05));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(2, 6, 10);
  scene.add(sun);
  for (const [x, z] of [[0, 0], [-5, -4], [5, -4]]) {
    const l = new THREE.PointLight(0xfff6ea, 3.5, 12, 2);
    l.position.set(x, 4.5, z);
    scene.add(l);
  }

  // Живые люди: замечают игрока, поворачивают голову (а наставник, охранник и гости — и корпус), моргают
  const lookers = [];
  const look = (obj, body = false) => obj?.userData?.head && lookers.push({ obj, body, base: obj.rotation.y, off: 0, hy: 0, hx: 0, near: 0, blink: 1 + Math.random() * 4, ready: false });
  people.forEach((pp) => look(pp, pp === mentorBody));
  look(guard, true);
  look(granStand);
  look(guests.gran);
  look(guests.misha.userData.kid);
  look(guests.maxim, true);
  look(guests.artyom, true);
  tellerZone.children.filter((o) => o.userData.head).forEach((o) => look(o));
  deskZone.children.filter((o) => o.userData.head).forEach((o) => look(o));
  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const shown3d = (o) => {
    for (let n = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const clamp = (v, a) => Math.max(-a, Math.min(a, v));
  const updateLookers = (dt) => {
    const cam = world.camera.position;
    const kH = Math.min(1, dt * 5);
    const kB = Math.min(1, dt * 2.2);
    for (const L of lookers) {
      const o = L.obj;
      if (!shown3d(o)) continue;
      if (!L.ready) {
        L.ready = true;
        o.userData.head.getWorldPosition(_v);
        L.wx = _v.x;
        L.wy = _v.y;
        L.wz = _v.z;
        (o.parent || scene).getWorldQuaternion(_q);
        L.pyaw = _e.setFromQuaternion(_q, 'YXZ').y;
      }
      const dx = cam.x - L.wx;
      const dz = cam.z - L.wz;
      const dist = Math.hypot(dx, dz);
      const rel = wrapA(Math.atan2(dx, dz) - (L.pyaw + L.base));
      const seen = dist < 4.6 && Math.abs(rel) < 2.1;
      L.near = seen ? L.near + dt : 0;
      const bodyT = L.body && seen && L.near > 0.6 ? clamp(rel, 1.25) : 0;
      L.off += (bodyT - L.off) * kB;
      if (L.body) o.rotation.y = L.base + L.off;
      const headT = seen ? clamp(rel - L.off, 1.0) : 0;
      L.hy += (headT - L.hy) * kH;
      const pitchT = seen ? clamp(-Math.atan2(cam.y - L.wy, Math.max(0.5, dist)), 0.35) : 0;
      L.hx += (pitchT - L.hx) * kH;
      const head = o.userData.head;
      head.rotation.y = L.hy;
      head.rotation.x = L.hx;
      L.blink -= dt;
      const closed = L.blink < 0;
      for (const e of o.userData.eyes) e.scale.y = closed ? 0.15 : 1;
      if (L.blink < -0.13) L.blink = 2.2 + Math.random() * 3.8;
    }
  };

  let t0 = 0;
  room.update = (dt, t) => {
    updateLookers(dt);
    for (const p of PROFESSIONS) {
      const r = room[`ring_${p.id}`];
      r.material.opacity = 0.35 + Math.sin(t * 3 + p.color.length) * 0.25;
      const s = 1 + Math.sin(t * 3) * 0.05;
      r.scale.set(s, s, s);
    }
    people.forEach((pp, i) => (pp.position.y = Math.max(0, Math.sin(t * 1.6 + i) * 0.012)));
    atWindows.forEach((pp, i) => (pp.rotation.y = Math.PI + Math.sin(t * 0.7 + i * 2) * 0.25));
    t0 += dt;
    if (t0 > 2.5) {
      t0 = 0;
      shown++;
      if (shown % PROFESSIONS.length === 0) ticket++;
      drawBoard();
      drawQueue(shown % 7);
    }
  };
  return room;
}

export { DOORS };
