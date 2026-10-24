// Кабинет финансового консультанта: стол для разговора, большой экран «перемотки времени»,
// плакат «деньги текут как вода» и доска благодарностей, которая растёт вместе с практикой.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text } from './kit.js';
import { ADVISOR_SHIFTS, MONTHS, SEASON } from '../data/advisor.js';

const hex = (s, d = 0x4a6fa5) => (typeof s === 'string' ? parseInt(s.slice(1), 16) : d);

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9e2f2);
  const room = makeRoom(scene, {
    bounds: { minX: -2.9, maxX: 2.9, minZ: -2.5, maxZ: -1.05 },
    spawn: { pos: [0, 1.62, -1.75], yaw: Math.PI },
    captions: {
      poster: '🚰 Плакат: «Деньги текут как вода. Перекрой лишние краны — и копилка наполнится».',
      thanks: '💌 Доска благодарностей: открытки от клиентов, которые достигли цели.',
      piggy: '🐷 Копилка. Самый простой способ копить — но процентов она не платит.',
      shelf: '📚 Книги: «Финансовая грамотность для школьников», «Как работает вклад», «Осторожно: пирамиды!».',
      diploma: '🎓 Аттестат финансового консультанта.',
      client: '🙂 Клиент ждёт совета.',
      window: '🌇 Город. Где-то там кто-то копит на мечту.',
      exit: '🚪 Выход в холл банка',
    },
  });
  const k = createKit(world, scene, room.interactables);
  k.shell({ w: 7, d: 6, h: 3, wall: 0xf1ecf7, floor: 0x7a5c48 });
  const wood = k.M(0x6d4c3d, { roughness: 0.45 });
  const accent = 0x9b6dff;

  // Ковёр и круглый стол
  const rug = k.plane(3.4, 2.6, k.M(0x4b3a6b, { roughness: 1 }), 0, 0.006, 0.1);
  rug.rotation.x = -Math.PI / 2;
  const tableG = new THREE.Group();
  k.cyl(0.95, 0.95, 0.06, k.M(0xf3efe8, { roughness: 0.35 }), 0, 0.76, 0, tableG, 40);
  k.cyl(0.08, 0.12, 0.72, wood, 0, 0.37, 0, tableG);
  k.cyl(0.45, 0.45, 0.04, wood, 0, 0.02, 0, tableG);
  // На столе: блокнот, калькулятор, копилка
  k.box(0.32, 0.015, 0.42, k.M(0xffffff), -0.35, 0.8, -0.25, tableG).rotation.y = 0.2;
  k.box(0.14, 0.02, 0.2, k.M(0x2b2f36), 0.25, 0.8, -0.35, tableG);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.box(0.03, 0.01, 0.03, k.M(i === 2 && j === 2 ? 0xff9f1c : 0xd9d9d9), 0.21 + i * 0.04, 0.815, -0.3 - j * 0.045, tableG);
  scene.add(tableG);
  k.reg('table', tableG, 'Стол консультанта');
  room.markers.table = [0, 1.35, 0.3];
  room.focus.table = { pos: [0, 1.55, -1.25], look: [0, 0.95, 0.6] };

  const piggy = new THREE.Group();
  const pigM = k.M(0xff8fab, { roughness: 0.4 });
  const body = k.sphere(0.13, pigM, 0, 0.13, 0, piggy);
  body.scale.set(1.25, 1, 1);
  k.sphere(0.06, pigM, 0.15, 0.17, 0, piggy);
  for (const [x, z] of [[-0.08, -0.06], [0.08, -0.06], [-0.08, 0.06], [0.08, 0.06]]) k.cyl(0.025, 0.025, 0.06, pigM, x, 0.03, z, piggy);
  k.box(0.06, 0.01, 0.015, k.M(0x222222), 0, 0.26, 0, piggy);
  piggy.position.set(0.45, 0.79, 0.15);
  piggy.rotation.y = -0.6;
  scene.add(piggy);
  k.reg('piggy', piggy, 'Копилка');

  // Кресла и клиент
  const chairM = k.M(0x5b3f8c, { roughness: 0.8 });
  for (const z of [1.25]) {
    k.box(0.6, 0.12, 0.55, chairM, 0, 0.45, z);
    k.box(0.6, 0.6, 0.12, chairM, 0, 0.8, z + 0.28);
  }
  let client = null;
  let client2 = null;
  const placeClient = (cfg) => {
    if (client) scene.remove(client);
    if (client2) scene.remove(client2);
    client2 = null;
    const L = cfg.client.look;
    const young = cfg.client.age && cfg.client.age < 14;
    client = k.person({ shirt: hex(L.shirt), hair: hex(L.hair, 0x3b2a20), sit: true, h: young ? 0.85 : 1 }, cfg.client.look2 ? -0.35 : 0, 1.15, Math.PI);
    k.reg('client', client, cfg.client.name);
    if (cfg.client.look2) {
      const L2 = cfg.client.look2;
      client2 = k.person({ shirt: hex(L2.shirt), hair: hex(L2.hair, 0x3b2a20), sit: true }, 0.35, 1.15, Math.PI);
      k.box(0.6, 0.12, 0.55, chairM, 0.35, 0.45, 1.25);
    }
  };

  // Большой экран перемотки
  const screenG = new THREE.Group();
  k.box(2.3, 1.35, 0.06, k.M(0x111418, { roughness: 0.3 }), 0, 0, 0, screenG);
  const scr = k.sign(2.2, 1.24, 1024, 576, () => {}, 0, 0, -0.035, Math.PI, screenG);
  screenG.position.set(0, 1.95, 2.95);
  scene.add(screenG);
  k.reg('screen', screenG, 'Экран перемотки времени');
  room.markers.screen = [0, 2.78, 2.85];
  room.focus.screen = { pos: [0, 1.75, -0.6], look: [0, 1.9, 2.95] };
  const drawScreen = (cfg, n) =>
    scr.userData.canvas.redraw((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1d1238');
      g.addColorStop(1, '#0b1a2a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      text(ctx, '⏩ ПЕРЕМОТКА ВРЕМЕНИ', 40, 60, { size: 44, color: '#c9b3ff' });
      text(ctx, `Смена ${n}`, w - 40, 60, { size: 32, color: '#8fb3a4', align: 'right', weight: 700 });
      text(ctx, cfg.goal.icon, 90, 200, { size: 110, align: 'center' });
      text(ctx, cfg.client.name, 170, 170, { size: 48 });
      text(ctx, `${cfg.goal.title} · ${cfg.goal.price.toLocaleString('ru-RU')} ₽`, 170, 232, { size: 36, color: '#ffd166', weight: 700 });
      // шкала месяцев
      const N = cfg.long ? 10 : Math.min(12, cfg.goal.months + 2);
      const x0 = 60;
      const cw = (w - 120) / N;
      for (let i = 0; i < N; i++) {
        const m = cfg.long ? (i + 1) * 6 : i + 1;
        ctx.fillStyle = m === cfg.goal.months ? 'rgba(255,209,102,0.25)' : 'rgba(255,255,255,0.07)';
        roundRect(ctx, x0 + i * cw + 4, 320, cw - 8, 110, 14);
        ctx.fill();
        text(ctx, cfg.long ? `${m}м` : SEASON[i % 12], x0 + i * cw + cw / 2, 360, { size: cfg.long ? 28 : 40, align: 'center' });
        text(ctx, cfg.long ? '' : MONTHS[i % 12].slice(0, 3), x0 + i * cw + cw / 2, 405, { size: 22, align: 'center', color: '#8fb3a4', weight: 600 });
      }
      text(ctx, '🏁 срок', x0 + (Math.min(N, cfg.long ? 10 : cfg.goal.months) - 0.5) * cw, 460, { size: 26, align: 'center', color: '#ffd166', weight: 700 });
      text(ctx, 'Составь план — и посмотри, что будет через месяцы', w / 2, 530, { size: 30, align: 'center', color: '#c9b3ff', weight: 600 });
    });

  // Плакат «деньги текут как вода»
  const poster = k.sign(1.3, 1.6, 390, 480, (ctx, w, h) => {
    ctx.fillStyle = '#fdf8ee';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'ДЕНЬГИ ТЕКУТ', w / 2, 42, { size: 34, align: 'center', color: '#5b3f8c' });
    text(ctx, 'КАК ВОДА', w / 2, 82, { size: 34, align: 'center', color: '#5b3f8c' });
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2, 120);
    ctx.lineTo(w / 2, 400);
    ctx.stroke();
    ctx.lineWidth = 10;
    [[170, '🍟'], [230, '🎮'], [290, '📺']].forEach(([y, ico]) => {
      ctx.strokeStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.lineTo(w - 70, y);
      ctx.stroke();
      text(ctx, '🔴', w / 2 + 50, y, { size: 26, align: 'center' });
      text(ctx, ico, w - 45, y, { size: 34, align: 'center' });
    });
    text(ctx, '🐷', w / 2, 430, { size: 64, align: 'center' });
  }, -3.47, 1.65, -0.9, Math.PI / 2, null, false);
  k.reg('poster', poster, 'Плакат');

  // Доска благодарностей
  const thanksBoard = k.sign(1.6, 1.1, 480, 330, () => {}, -3.47, 1.7, 1.25, Math.PI / 2, null, false);
  k.reg('thanks', thanksBoard, 'Доска благодарностей');
  const CARDS = ['🚲', '💻', '🏖', '📱', '🎓', '💌', '⭐', '🌷', '🎁', '💛', '🙏', '🏆', '📚', '🌟', '❤️'];
  room.setProf = (ps) => {
    const stars = Object.values(ps?.best || {}).reduce((s, b) => s + b.stars, 0);
    thanksBoard.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#b07a45';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(80,45,15,0.25)';
      for (let i = 0; i < 600; i++) ctx.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
      text(ctx, 'СПАСИБО!', w / 2, 36, { size: 32, align: 'center', color: '#fff7e0' });
      if (!stars) text(ctx, 'пока пусто — помоги первому клиенту', w / 2, h / 2 + 20, { size: 22, align: 'center', color: '#fff7e0', weight: 600 });
      for (let i = 0; i < Math.min(15, stars); i++) {
        const x = 30 + (i % 5) * 88 + ((i * 7) % 11);
        const y = 70 + Math.floor(i / 5) * 84 + ((i * 5) % 9);
        ctx.save();
        ctx.translate(x + 38, y + 34);
        ctx.rotate(((i * 37) % 20 - 10) / 60);
        ctx.fillStyle = ['#fff7e0', '#ffe3ec', '#e3f6ff', '#eaffe3'][i % 4];
        ctx.fillRect(-36, -32, 72, 64);
        text(ctx, CARDS[i % CARDS.length], 0, 0, { size: 34, align: 'center' });
        ctx.fillStyle = '#c1121f';
        ctx.beginPath();
        ctx.arc(0, -28, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  };
  room.setProf(null);

  // Практика растёт: чем больше звёзд, тем богаче кабинет
  const upgrades = [];
  const aquarium = new THREE.Group();
  k.box(1.1, 0.7, 0.45, new THREE.MeshStandardMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.35, roughness: 0.1 }), 0, 0.35, 0, aquarium);
  k.box(1.12, 0.06, 0.47, k.M(0x2b2f36), 0, 0.72, 0, aquarium);
  k.box(1.2, 0.75, 0.5, wood, 0, -0.38, 0, aquarium);
  const fishes = [0xff9f1c, 0xffd166, 0xe76f51].map((c, i) => k.sphere(0.05, k.glow(c, 1.2), -0.3 + i * 0.3, 0.3 + i * 0.08, 0, aquarium));
  fishes.forEach((f) => f.scale.set(1.6, 1, 0.6));
  aquarium.position.set(2.6, 0.75, -1.9);
  aquarium.rotation.y = -0.4;
  aquarium.visible = false;
  room.obstacles.push([2.15, 3.2, -2.4, -1.4]);
  scene.add(aquarium);
  k.reg('aquarium', aquarium, 'Аквариум');
  room.captions.aquarium = '🐠 Аквариум — подарок от благодарных клиентов. Практика растёт!';
  upgrades.push([6, aquarium]);
  const intern = new THREE.Group();
  k.box(1.1, 0.05, 0.6, k.M(0xf3efe8), 0, 0.74, 0, intern);
  k.box(0.05, 0.72, 0.55, wood, -0.5, 0.36, 0, intern);
  k.box(0.05, 0.72, 0.55, wood, 0.5, 0.36, 0, intern);
  k.box(0.35, 0.22, 0.02, k.glow(0x9b6dff, 0.9), 0, 0.9, -0.15, intern);
  k.person({ shirt: 0x9b6dff, hair: 0x6b3e26, sit: true }, 0, -0.6, 0, intern);
  intern.position.set(2.5, 0, 1.9);
  intern.rotation.y = -Math.PI / 2;
  intern.visible = false;
  scene.add(intern);
  k.reg('intern', intern, 'Стол стажёра');
  room.captions.intern = '🧑‍💼 Стажёр: клиентов стало так много, что тебе дали помощника.';
  upgrades.push([10, intern]);
  const plaque = k.sign(0.7, 0.32, 350, 160, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#ffe082');
    g.addColorStop(1, '#c9a227');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    text(ctx, '🏆 КОНСУЛЬТАНТ', w / 2, 58, { size: 34, align: 'center', color: '#3a2a00' });
    text(ctx, 'ГОДА', w / 2, 110, { size: 38, align: 'center', color: '#3a2a00' });
  }, 3.47, 2.35, -0.8, -Math.PI / 2, null, false);
  plaque.visible = false;
  k.reg('plaque', plaque, 'Награда');
  room.captions.plaque = '🏆 «Консультант года» — за довольных клиентов.';
  upgrades.push([13, plaque]);
  const setThanks = room.setProf;
  room.setProf = (ps) => {
    setThanks(ps);
    const stars = Object.values(ps?.best || {}).reduce((s, b) => s + b.stars, 0);
    for (const [need, obj] of upgrades) obj.visible = stars >= need;
  };
  room.fishes = fishes;

  // Полки, аттестат, окно, растения
  const shelf = new THREE.Group();
  k.box(1.6, 2.0, 0.35, wood, 0, 1.0, 0, shelf);
  const bookC = [0x9b6dff, 0x4cc9f0, 0xffd166, 0x2a9d8f, 0xe76f51];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) k.box(0.13, 0.3 + ((i * 7 + r) % 3) * 0.04, 0.25, k.M(bookC[(i + r) % 5]), -0.6 + i * 0.15, 0.32 + r * 0.46, -0.03, shelf);
  shelf.position.set(3.3, 0, 0.6);
  shelf.rotation.y = -Math.PI / 2;
  scene.add(shelf);
  k.reg('shelf', shelf, 'Книжная полка');
  const diploma = k.sign(0.6, 0.45, 300, 220, (ctx, w, h) => {
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    text(ctx, 'АТТЕСТАТ', w / 2, 70, { size: 34, align: 'center', color: '#5b3f8c' });
    text(ctx, 'финансового', w / 2, 120, { size: 24, align: 'center', color: '#333', weight: 600 });
    text(ctx, 'консультанта', w / 2, 152, { size: 24, align: 'center', color: '#333', weight: 600 });
  }, 3.47, 2.35, -1.6, -Math.PI / 2, null, false);
  k.reg('diploma', diploma, 'Аттестат');
  const win = k.canvas(512, 300, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffb37a');
    g.addColorStop(1, '#ffe7c9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7d6a8c';
    for (let x = 0; x < w; x += 54) ctx.fillRect(x, h - 70 - ((x * 7) % 110), 46, 220);
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 61) % w, h - 30 - ((i * 37) % 120), 6, 8);
  });
  const winM = k.plane(1.6, 1.1, new THREE.MeshBasicMaterial({ map: win.tex, toneMapped: false }), -1.6, 1.75, -2.98);
  k.reg('window', winM, 'Окно');
  k.box(1.7, 0.06, 0.12, k.M(0xffffff), -1.6, 1.18, -2.94);
  k.plant(-2.9, 2.5);
  k.plant(2.6, 2.5, null, 0.9);
  k.plant(2.9, -2.5, null, 1.1);
  // Торшер
  k.cyl(0.03, 0.03, 1.5, k.M(0x2b2f36), -2.7, 0.75, -2.2);
  const shade = k.cyl(0.2, 0.28, 0.3, k.glow(0xffe2b8, 1.1), -2.7, 1.6, -2.2);
  shade.material.transparent = true;

  // Выход
  const exitG = new THREE.Group();
  k.box(1.0, 2.1, 0.06, k.M(0x4b3a6b), 0, 1.05, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.35, 0.04, 0, exitG);
  exitG.position.set(1.7, 0, -2.97);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  // Свет
  scene.add(new THREE.HemisphereLight(0xfaf3ff, 0x6b5a4a, 1.0));
  const lamp = new THREE.PointLight(0xffe9cc, 5, 9, 2);
  lamp.position.set(0, 2.6, 0.2);
  scene.add(lamp);
  const glowL = new THREE.PointLight(accent, 1.6, 5, 2);
  glowL.position.set(0, 2.2, 2.4);
  scene.add(glowL);
  const sun = new THREE.DirectionalLight(0xffd9b0, 0.8);
  sun.position.set(-2, 4, -6);
  scene.add(sun);
  const p = k.plane(1.4, 0.5, k.glow(0xffffff, 1), 0, 2.99, 0);
  p.rotation.x = Math.PI / 2;

  room.setShift = (n) => {
    const cfg = ADVISOR_SHIFTS[n] || ADVISOR_SHIFTS[1];
    placeClient(cfg);
    drawScreen(cfg, n);
  };
  room.setShift(1);
  room.update = (dt, t) => {
    if (client) client.position.y = Math.sin(t * 1.5) * 0.008;
    if (client2) client2.position.y = Math.sin(t * 1.5 + 1) * 0.008;
    piggy.rotation.y = -0.6 + Math.sin(t * 0.8) * 0.15;
    if (aquarium.visible) fishes.forEach((f, i) => (f.position.x = Math.sin(t * (0.6 + i * 0.2) + i * 2) * 0.4));
    glowL.intensity = 1.4 + Math.sin(t * 2) * 0.3;
  };
  return room;
}
