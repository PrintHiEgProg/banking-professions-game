// Гараж инкассации: стол с картой города (план маршрута), броневик (выезд) и круглая дверь хранилища.
// За открытыми воротами — улица: день, вечер или снегопад, в зависимости от смены.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text } from './kit.js';
import { CASH_SHIFTS, GRID, DISTRICTS } from '../data/cash.js';

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b2027);
  const room = makeRoom(scene, {
    bounds: { minX: -4.0, maxX: 4.1, minZ: -3.6, maxZ: 3.3 },
    obstacles: [
      [-1.35, 1.35, -1.95, -0.65],
      [-0.6, 4.2, 0.75, 3.25],
      [-3.9, -1.1, 3.4, 4.2],
      [-4.6, -3.6, -1.3, 3.6],
    ],
    spawn: { pos: [0, 1.62, -3.0], yaw: Math.PI },
    captions: {
      lockers: '🦺 Шкафчики бригады: бронежилеты, каски, рации.',
      radio: '📻 Пульт диспетчера: он знает, где каждая машина, и всегда на связи.',
      poster: '📋 «Водитель никогда не выходит из машины. Маршрут не повторяется. Пломба повреждена — сумку не берём».',
      cones: '🚧 Конусы — для разметки площадки погрузки.',
      gate: '🚪 Ворота гаража. За ними — город.',
      exit: '🚪 Выход в холл банка',
      board: '📅 График: инкассаторы работают сменами, в том числе в выходные.',
    },
  });
  const k = createKit(world, scene, room.interactables);
  // Бетонный пол с жёлтой разметкой
  const floorCv = k.canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b6f75';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(40,40,45,0.18)' : 'rgba(200,200,205,0.12)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  floorCv.tex.wrapS = floorCv.tex.wrapT = THREE.RepeatWrapping;
  floorCv.tex.repeat.set(3, 3);
  k.shell({ w: 9, d: 8, h: 3.8, wall: 0x9aa3ad, floor: 0xffffff, floorTex: floorCv.tex, ceil: 0x5a6068 });
  const yellow = k.M(0xffc400, { roughness: 0.6 });
  for (const [x, z, w, d] of [[1.95, 0.85, 4.9, 0.08], [1.95, 3.15, 4.9, 0.08], [-0.55, 2.0, 0.08, 2.3]]) {
    const s = k.plane(w, d, yellow, x, 0.006, z);
    s.rotation.x = -Math.PI / 2;
  }
  for (let i = 0; i < 6; i++) {
    const s = k.plane(0.5, 0.12, yellow, -2.2 + (i % 2) * 0.1, 0.006, -3.4 + i * 0.25);
    s.rotation.x = -Math.PI / 2;
    s.rotation.z = 0.6;
  }

  // ─── стол с картой города ───
  const mapG = new THREE.Group();
  k.box(2.3, 0.08, 1.0, k.M(0x2b2f36), 0, 0.86, 0, mapG);
  for (const [x, z] of [[-1.05, -0.42], [1.05, -0.42], [-1.05, 0.42], [1.05, 0.42]]) k.box(0.06, 0.86, 0.06, k.M(0x1d2127), x, 0.43, z, mapG);
  const mapTop = k.sign(2.2, 0.92, 1100, 460, () => {}, 0, 0.905, 0, 0, mapG);
  mapTop.rotation.x = -Math.PI / 2;
  mapG.position.set(0, 0, -1.3);
  scene.add(mapG);
  k.reg('map', mapG, 'Карта города');
  room.markers.map = [0, 1.45, -1.3];
  room.focus.map = { pos: [0, 2.2, -2.45], look: [0, 0.9, -1.15] };
  const drawMap = (cfg) =>
    mapTop.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#151b22';
      ctx.fillRect(0, 0, w, h);
      const sx = w / (GRID.cols + 1.2);
      const sy = h / (GRID.rows + 1.2);
      const X = (x) => sx * 0.6 + x * sx;
      const Y = (y) => sy * 0.6 + y * sy;
      for (let bx = 0; bx < GRID.cols; bx++)
        for (let by = 0; by < GRID.rows; by++) {
          const d = DISTRICTS.find((z) => bx >= z.x[0] && bx <= z.x[1] && by >= z.y[0] && by <= z.y[1]);
          ctx.fillStyle = d ? d.color : '#232c36';
          roundRect(ctx, X(bx) + 5, Y(by) + 5, sx - 10, sy - 10, 6);
          ctx.fill();
        }
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= GRID.cols; x++) {
        ctx.beginPath();
        ctx.moveTo(X(x), Y(0));
        ctx.lineTo(X(x), Y(GRID.rows));
        ctx.stroke();
      }
      for (let y = 0; y <= GRID.rows; y++) {
        ctx.beginPath();
        ctx.moveTo(X(0), Y(y));
        ctx.lineTo(X(GRID.cols), Y(y));
        ctx.stroke();
      }
      text(ctx, '🏦', X(cfg.depot.x), Y(cfg.depot.y), { size: 34, align: 'center' });
      for (const p of cfg.points) {
        ctx.fillStyle = p.type === 'atm' ? '#4cc9f0' : '#ff7a45';
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), 20, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, p.icon, X(p.x), Y(p.y), { size: 26, align: 'center' });
      }
    });

  // ─── броневик ───
  const van = new THREE.Group();
  const body = k.M(0x6b8a70, { metalness: 0.25, roughness: 0.45 });
  const dark = k.M(0x1a1d22, { roughness: 0.6 });
  k.box(1.9, 1.5, 3.2, body, 0, 1.15, 0.3, van);
  k.box(1.9, 1.1, 1.1, body, 0, 0.95, -1.75, van);
  k.box(1.7, 0.45, 0.04, k.M(0x223344, { metalness: 0.6, roughness: 0.1 }), 0, 1.3, -2.31, van);
  for (const side of [-1, 1]) k.box(0.04, 0.4, 0.7, k.M(0x223344, { metalness: 0.6, roughness: 0.1 }), side * 0.96, 1.25, -1.75, van);
  const stripe = k.sign(3.15, 0.34, 900, 100, (ctx, w, h) => {
    ctx.fillStyle = '#ff7a45';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'ИНКАССАЦИЯ', w / 2, h / 2 + 2, { size: 64, align: 'center', color: '#1a1d22' });
  }, 0.96, 1.2, 0.3, Math.PI / 2, van, false);
  stripe.position.x = 0.961;
  const stripe2 = stripe.clone();
  stripe2.position.x = -0.961;
  stripe2.rotation.y = -Math.PI / 2;
  van.add(stripe2);
  for (const [x, z] of [[-0.95, -1.6], [0.95, -1.6], [-0.95, 1.2], [0.95, 1.2]]) {
    const wh = k.cyl(0.42, 0.42, 0.3, dark, x, 0.42, z, van);
    wh.rotation.z = Math.PI / 2;
    const hub = k.cyl(0.18, 0.18, 0.32, k.M(0x9aa5b1, { metalness: 0.8 }), x, 0.42, z, van);
    hub.rotation.z = Math.PI / 2;
  }
  const headM = k.glow(0xfff4cc, 1.6);
  for (const x of [-0.65, 0.65]) k.box(0.32, 0.16, 0.04, headM, x, 0.75, -2.31, van);
  k.box(1.9, 0.12, 0.12, dark, 0, 0.35, -2.32, van);
  const beacon = k.box(0.5, 0.1, 0.18, k.glow(0xffa000, 1.4), 0, 1.95, -1.4, van);
  k.box(0.6, 0.9, 0.04, k.M(0x2e3a30, { metalness: 0.4 }), 0, 1.15, 1.91, van);
  van.position.set(1.6, 0, 2.0);
  van.rotation.y = -Math.PI / 2;
  scene.add(van);
  k.reg('van', van, 'Броневик');
  room.markers.van = [1.4, 2.55, 2.0];
  room.focus.van = { pos: [0.2, 1.75, -0.7], look: [1.6, 1.15, 2.0] };

  // ─── хранилище: круглая дверь ───
  const vault = new THREE.Group();
  const steel = k.M(0xa8b0b8, { metalness: 0.85, roughness: 0.3 });
  k.box(2.4, 2.6, 0.2, k.M(0x6c757d, { metalness: 0.6, roughness: 0.5 }), 0, 1.3, 0, vault);
  const door = k.cyl(1.0, 1.0, 0.3, steel, 0, 1.3, 0.12, vault, 48);
  door.rotation.x = Math.PI / 2;
  const ring = k.cyl(0.25, 0.25, 0.36, k.M(0x5b6470, { metalness: 0.9 }), 0, 1.3, 0.12, vault);
  ring.rotation.x = Math.PI / 2;
  const wheel = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const spoke = k.box(1.1, 0.07, 0.07, k.M(0xd9d9d9, { metalness: 0.9, roughness: 0.2 }), 0, 0, 0, wheel);
    spoke.rotation.z = (i * Math.PI) / 3;
  }
  wheel.position.set(0, 1.3, 0.32);
  vault.add(wheel);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.cyl(0.05, 0.05, 0.34, steel, Math.cos(a) * 0.86, 1.3 + Math.sin(a) * 0.86, 0.12, vault).rotation.x = Math.PI / 2;
  }
  k.sign(1.6, 0.36, 640, 140, (ctx, w, h) => {
    ctx.fillStyle = '#0b1a14';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '🏦 ХРАНИЛИЩЕ', w / 2, h / 2, { size: 64, align: 'center', color: '#7dffc0' });
  }, 0, 2.85, 0.11, 0, vault);
  vault.position.set(-2.5, 0, 3.88);
  vault.rotation.y = Math.PI;
  scene.add(vault);
  k.reg('vault', vault, 'Хранилище');
  room.markers.vault = [-2.5, 3.35, 3.7];
  room.focus.vault = { pos: [-2.2, 1.6, 1.4], look: [-2.5, 1.4, 3.88] };

  // ─── ворота гаража и улица ───
  const outside = k.canvas(800, 400, () => {});
  const gateM = new THREE.MeshBasicMaterial({ map: outside.tex, toneMapped: false });
  const gate = k.plane(3.4, 2.7, gateM, 4.48, 1.35, 2.0, -Math.PI / 2);
  k.reg('gate', gate, 'Ворота гаража');
  k.box(0.1, 0.25, 3.6, k.M(0xffc400), 4.45, 2.8, 2.0);
  for (let i = 0; i < 9; i++) k.box(0.06, 0.06, 3.5, k.M(0x8a939e, { metalness: 0.6 }), 4.43, 2.95 + i * 0.09, 2.0);
  const drawOutside = (mode) =>
    outside.redraw((ctx, w, h) => {
      const sky = { day: ['#7fb8ec', '#dff0ff'], eve: ['#ff9966', '#ffd5a8'], snow: ['#0d1b2a', '#2c3e50'] }[mode];
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, sky[0]);
      g.addColorStop(1, sky[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = mode === 'snow' ? '#1b2633' : mode === 'eve' ? '#6b4f5a' : '#93a5b8';
      for (let x = 0; x < w; x += 70) ctx.fillRect(x, h - 150 - ((x * 13) % 120), 60, 300);
      if (mode !== 'day') {
        ctx.fillStyle = 'rgba(255,230,150,0.9)';
        for (let i = 0; i < 70; i++) ctx.fillRect((i * 53) % w, h - 60 - ((i * 37) % 200), 6, 8);
      }
      ctx.fillStyle = mode === 'snow' ? '#e8eef5' : '#4a4f57';
      ctx.fillRect(0, h - 50, w, 50);
    });

  // ─── мелочи: шкафчики, пульт, плакат, конусы, табло ───
  const lockers = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    k.box(0.5, 2.0, 0.5, k.M(i % 2 ? 0x46607a : 0x3d556c, { metalness: 0.4 }), i * 0.52, 1.0, 0, lockers);
    k.box(0.04, 0.2, 0.02, k.M(0xd9d9d9, { metalness: 0.9 }), i * 0.52 + 0.15, 1.1, 0.26, lockers);
  }
  lockers.position.set(-4.2, 0, 0.9);
  lockers.rotation.y = Math.PI / 2;
  scene.add(lockers);
  k.reg('lockers', lockers, 'Шкафчики');
  const radio = new THREE.Group();
  k.box(1.2, 0.8, 0.6, k.M(0x2b2f36), 0, 0.4, 0, radio);
  const rscr = k.sign(0.9, 0.5, 360, 200, (ctx, w, h) => {
    ctx.fillStyle = '#04140c';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '📻 ДИСПЕТЧЕР', 20, 34, { size: 30, color: '#7dffc0' });
    text(ctx, 'Борт 7 · на связи', 20, 100, { size: 28, color: '#fff', weight: 700 });
    text(ctx, '● канал 3', 20, 160, { size: 26, color: '#3ddc84', weight: 700 });
  }, 0, 1.05, 0, 0, radio);
  rscr.rotation.x = -0.25;
  radio.position.set(-3.95, 0, -0.5);
  radio.rotation.y = Math.PI / 2;
  scene.add(radio);
  k.reg('radio', radio, 'Пульт диспетчера');
  const poster = k.sign(1.2, 1.5, 360, 450, (ctx, w, h) => {
    ctx.fillStyle = '#ffc400';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1d22';
    ctx.fillRect(14, 14, w - 28, h - 28);
    text(ctx, 'ПРАВИЛА', w / 2, 60, { size: 42, align: 'center', color: '#ffc400' });
    ['🚐 Водитель —', 'в машине', '🔀 Маршрут —', 'каждый день новый', '🔐 Пломба цела?', '👀 Осмотрись!'].forEach((l, i) => text(ctx, l, 36, 130 + i * 50, { size: 28, color: '#fff', weight: 700 }));
  }, 0.8, 1.8, -3.97, 0, null, false);
  k.reg('poster', poster, 'Плакат с правилами');
  const board = k.sign(1.6, 0.9, 480, 270, () => {}, -1.4, 2.4, -3.97, 0);
  k.reg('board', board, 'График смен');
  const drawBoard = (n) =>
    board.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, w, h);
      text(ctx, 'ГРАФИК БРИГАДЫ', 20, 34, { size: 28, color: '#ff7a45' });
      ['Пн', 'Вт', 'Ср', 'Пт', 'Сб'].forEach((d, i) => {
        ctx.fillStyle = i + 1 === n ? '#ff7a45' : i + 1 < n ? '#3ddc84' : 'rgba(255,255,255,0.08)';
        roundRect(ctx, 20 + i * 90, 80, 76, 76, 12);
        ctx.fill();
        text(ctx, d, 58 + i * 90, 118, { size: 30, align: 'center', color: i + 1 === n ? '#1a1d22' : '#fff' });
      });
      text(ctx, `Смена ${n} из 5`, 20, 210, { size: 30, color: '#fff', weight: 700 });
    });
  const cones = new THREE.Group();
  for (const [x, z] of [[0, 0], [0.5, 0.3], [0.9, -0.1]]) {
    k.cyl(0.02, 0.16, 0.45, k.M(0xff6b00), x, 0.23, z, cones);
    k.cyl(0.11, 0.13, 0.06, k.M(0xffffff), x, 0.25, z, cones);
  }
  cones.position.set(3.0, 0, -3.2);
  scene.add(cones);
  k.reg('cones', cones, 'Конусы');

  // Выход
  const exitG = new THREE.Group();
  k.box(1.1, 2.2, 0.06, k.M(0x4b5563), 0, 1.1, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.45, 0.04, 0, exitG);
  exitG.position.set(-3.0, 0, -3.97);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  // Свет: промышленные лампы
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3f47, 0.9));
  for (const [x, z] of [[0, -1.5], [2.2, 1.8], [-2.4, 2.0]]) {
    const l = new THREE.PointLight(0xf2f6ff, 4.2, 9, 2);
    l.position.set(x, 3.4, z);
    scene.add(l);
    const p = k.plane(1.2, 0.25, k.glow(0xffffff, 1.2), x, 3.79, z);
    p.rotation.x = Math.PI / 2;
  }
  const gateLight = new THREE.PointLight(0xffd9a0, 1.5, 6, 2);
  gateLight.position.set(3.9, 2, 2);
  scene.add(gateLight);

  // Снег за воротами (смена 5)
  const snowGeo = new THREE.BufferGeometry();
  const N = 220;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = 3.6 + Math.random() * 0.85;
    pos[i * 3 + 1] = Math.random() * 3.6;
    pos[i * 3 + 2] = 0.3 + Math.random() * 3.4;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.9 }));
  snow.visible = false;
  scene.add(snow);

  room.setShift = (n) => {
    const cfg = CASH_SHIFTS[n] || CASH_SHIFTS[1];
    drawMap(cfg);
    drawBoard(n);
    drawOutside(n === 5 ? 'snow' : n === 4 ? 'eve' : 'day');
    snow.visible = n === 5;
    gateLight.color.set(n === 5 ? 0x9fc4ff : n === 4 ? 0xffb36b : 0xffe2b8);
  };
  room.setShift(1);
  room.update = (dt, t) => {
    beacon.material.color.setScalar(1 + Math.max(0, Math.sin(t * 6)) * 0.8).multiply(new THREE.Color(0xffa000));
    wheel.rotation.z = Math.sin(t * 0.4) * 0.3;
    if (snow.visible) {
      const a = snowGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = a.getY(i) - dt * (0.5 + (i % 5) * 0.08);
        if (y < 0) y = 3.6;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
  };
  return room;
}
