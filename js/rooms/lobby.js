// Холл банка: двери кабинетов пяти профессий, терминал очереди, табло, банкоматы и посетители.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text, SANS } from './kit.js';
import { PROFESSIONS } from '../data/professions.js';

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
      [6.0, 6.8, -1.4, -0.6],
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
  const ring = k.plane(5.5, 5.5, new THREE.MeshBasicMaterial({ color: 0x1f7a4d, transparent: true, opacity: 0.18 }), 0, 0.006, 2.6);
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
    sofa.rotation.y = Math.PI;
    scene.add(sofa);
  }
  const people = [
    k.person({ shirt: 0xd1495b, hair: 0x2b1d1a, sit: true }, -5.6, 5.05, Math.PI),
    k.person({ shirt: 0x8e7dbe, hair: 0xc9ccd3, sit: true }, -4.4, 5.05, Math.PI),
    k.person({ shirt: 0x2a9d8f, hair: 0x6b3e26, sit: true }, 4.6, 5.05, Math.PI),
    k.person({ shirt: 0xe9a23b, hair: 0x3b2a20 }, -6.9, 1.2, -Math.PI / 2),
    k.person({ shirt: 0x4f8bd6, hair: 0x1d1d1d, h: 0.8 }, -6.0, 1.0, -Math.PI / 2),
    k.person({ shirt: 0x6c757d, hair: 0x8a6a4a }, -5.1, 1.15, -Math.PI / 2),
    k.person({ shirt: 0x9b5de5, hair: 0xc9ccd3 }, 6.4, -1.0, Math.PI / 2),
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
  k.sign(0.86, 1.95, 300, 680, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f7a4d');
    g.addColorStop(1, '#0b2a1d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'НЕДЕЛЯ', w / 2, 70, { size: 46, align: 'center', color: '#ffffff' });
    text(ctx, 'СТАЖЁРА', w / 2, 122, { size: 46, align: 'center', color: '#7dffc0' });
    text(ctx, '5 кабинетов', w / 2, 210, { size: 30, align: 'center', color: '#e3f6ec', weight: 700 });
    text(ctx, '25 смен', w / 2, 252, { size: 30, align: 'center', color: '#e3f6ec', weight: 700 });
    text(ctx, PROFESSIONS.map((p) => p.icon).slice(0, 3).join(' '), w / 2, 340, { size: 50, align: 'center' });
    text(ctx, PROFESSIONS.map((p) => p.icon).slice(3).join(' '), w / 2, 410, { size: 50, align: 'center' });
    roundRect(ctx, 30, 500, w - 60, 120, 18);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    text(ctx, 'Спроси', w / 2, 540, { size: 30, align: 'center', color: '#1b1405' });
    text(ctx, 'наставника', w / 2, 582, { size: 30, align: 'center', color: '#1b1405' });
  }, 0, 1.05, 0, 0, rollup);
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
      text(ctx, 'ПРОФЕССИИ В БАНКЕ', 40, 62, { size: 58, color: '#7dffc0' });
      text(ctx, `Талон А-0${ticket}`, 40, 158, { size: 52, color: '#ffffff' });
      text(ctx, `→ ${prof.icon} ${prof.title}`, 470, 158, { size: 52, color: prof.color });
    });
  };
  drawBoard();

  // Банкоматы и табло курсов
  for (const x of [-4.6, 4.6]) {
    const atm = new THREE.Group();
    k.box(0.9, 1.9, 0.6, k.M(0x2b3440, { metalness: 0.4, roughness: 0.5 }), 0, 0.95, 0, atm);
    k.sign(0.6, 0.4, 256, 170, (ctx, w, h) => {
      ctx.fillStyle = '#1f7a4d';
      ctx.fillRect(0, 0, w, h);
      text(ctx, 'БАНКОМАТ', w / 2, h / 2, { size: 34, align: 'center' });
    }, 0, 1.45, 0.31, 0, atm);
    k.box(0.5, 0.05, 0.1, k.glow(0x3ddc84, 1), 0, 1.05, 0.31, atm);
    atm.position.set(x, 0, -7.65);
    scene.add(atm);
  }
  k.sign(1.9, 1.1, 480, 280, (ctx, w, h) => {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'КУРСЫ ВАЛЮТ', 24, 40, { size: 30, color: '#4cc9f0' });
    text(ctx, 'покупка  продажа', 190, 90, { size: 22, color: '#8fb3a4', weight: 600 });
    [['$', '89.20', '92.40'], ['€', '96.50', '99.80'], ['¥', '12.10', '12.90']].forEach(([c, b, s], i) => {
      text(ctx, c, 40, 140 + i * 50, { size: 38 });
      text(ctx, b, 200, 140 + i * 50, { size: 34, color: '#7dffc0' });
      text(ctx, s, 340, 140 + i * 50, { size: 34, color: '#ffb3bb' });
    });
  }, -8.97, 2.4, 6.2, Math.PI / 2);

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
    k.box(1.56, 2.8, 0.06, panelM, 0, 1.4, -0.03, g);
    k.box(0.06, 0.3, 0.06, k.M(0xd9d9d9, { metalness: 0.9, roughness: 0.2 }), 0.6, 1.25, 0.04, g);
    const strip = k.glow(prof.color, 1.6);
    k.box(0.04, 2.8, 0.04, strip, -0.77, 1.45, 0.1, g);
    k.box(0.04, 2.8, 0.04, strip, 0.77, 1.45, 0.1, g);
    k.box(1.58, 0.04, 0.04, strip, 0, 2.86, 0.1, g);
    if (prof.id === 'cash') k.cyl(0.38, 0.38, 0.08, k.M(0x6c757d, { metalness: 0.9, roughness: 0.3 }), 0, 1.5, 0.02, g).rotation.x = Math.PI / 2;
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

  let t0 = 0;
  room.update = (dt, t) => {
    for (const p of PROFESSIONS) {
      const r = room[`ring_${p.id}`];
      r.material.opacity = 0.35 + Math.sin(t * 3 + p.color.length) * 0.25;
      const s = 1 + Math.sin(t * 3) * 0.05;
      r.scale.set(s, s, s);
    }
    people.forEach((pp, i) => (pp.position.y = Math.max(0, Math.sin(t * 1.6 + i) * 0.012)));
    t0 += dt;
    if (t0 > 2.5) {
      t0 = 0;
      shown++;
      if (shown % PROFESSIONS.length === 0) ticket++;
      drawBoard();
    }
  };
  return room;
}

export { DOORS };
