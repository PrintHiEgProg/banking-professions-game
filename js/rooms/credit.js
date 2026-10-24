// Кабинет кредитного эксперта: стол с заявками, клиент напротив, календарь «месяц спустя».
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text } from './kit.js';

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e2d6);
  const room = makeRoom(scene, {
    bounds: { minX: -3.0, maxX: 3.0, minZ: -2.6, maxZ: -0.75 },
    spawn: { pos: [0, 1.62, -1.6], yaw: Math.PI },
    captions: {
      laptop: '💻 Кредитная программа: заявки, скоринг, история клиента.',
      plan: '📈 План месяца: выдать кредиты — но только тем, кто сможет вернуть.',
      shelf: '🗂 Архив договоров. Каждая папка — чья-то мечта: машина, ремонт, пекарня.',
      client: '🙂 Клиент ждёт твоего решения.',
      exit: '🚪 Выход в холл банка',
    },
  });
  const k = createKit(world, scene, room.interactables);
  k.shell({ w: 7, d: 6, h: 3, wall: 0xf0e9dc, floor: 0x8d6e53 });
  const wood = k.M(0x6b4a2f, { roughness: 0.5 });

  // Стол и стулья
  k.box(2.4, 0.06, 0.95, wood, 0, 0.76, 0);
  k.box(0.06, 0.74, 0.9, wood, -1.15, 0.37, 0);
  k.box(0.06, 0.74, 0.9, wood, 1.15, 0.37, 0);
  k.box(2.3, 0.5, 0.04, wood, 0, 0.5, -0.43);
  const chair = k.M(0x2b2f38);
  k.box(0.5, 0.08, 0.5, chair, 0, 0.48, 0.95);
  k.box(0.5, 0.6, 0.06, chair, 0, 0.8, 1.2);
  const client = k.person({ shirt: 0x2a9d8f, hair: 0x6b3e26, sit: true }, 0, 0.95, Math.PI);
  k.reg('client', client, 'Клиент');

  // Стопка заявок
  const docs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const sheet = k.box(0.32, 0.012, 0.42, k.M(i % 2 ? 0xffffff : 0xf3efe6), (Math.random() - 0.5) * 0.03, 0.006 + i * 0.013, (Math.random() - 0.5) * 0.03, docs);
    sheet.rotation.y = (Math.random() - 0.5) * 0.15;
  }
  k.box(0.33, 0.02, 0.43, k.M(0xffb020), 0, 0.09, 0, docs);
  docs.position.set(-0.55, 0.79, -0.05);
  scene.add(docs);
  k.reg('docs', docs, 'Заявки на кредит');
  room.markers.docs = [-0.55, 1.15, -0.05];
  room.focus.docs = { pos: [-0.3, 1.5, -1.0], look: [-0.4, 0.85, 0.3] };

  // Ноутбук
  const lap = new THREE.Group();
  k.box(0.42, 0.02, 0.3, k.M(0x9aa5b1, { metalness: 0.6, roughness: 0.3 }), 0, 0.01, 0, lap);
  const scr = k.sign(0.4, 0.26, 400, 260, (ctx, w, h) => {
    ctx.fillStyle = '#1b2a3a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb020';
    ctx.fillRect(0, 0, w, 40);
    text(ctx, 'КРЕДИТНЫЙ КОНВЕЙЕР', 14, 21, { size: 22, color: '#1b1205' });
    text(ctx, 'Заявок: 3', 20, 110, { size: 34 });
    text(ctx, 'Скоринг: онлайн 🤖', 20, 170, { size: 30, color: '#7dffc0' });
  }, 0, 0.14, 0.13, Math.PI, lap);
  scr.rotation.x = 0.25;
  lap.position.set(0.45, 0.79, -0.15);
  scene.add(lap);
  k.reg('laptop', lap, 'Ноутбук');

  // Календарь на стене
  const calG = new THREE.Group();
  const cal = k.sign(0.9, 1.0, 360, 400, () => {}, 0, 0, 0, Math.PI, calG, false);
  const drawCal = (month = 'ОКТЯБРЬ', big = '1') =>
    cal.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(0, 0, w, 90);
      text(ctx, month, w / 2, 48, { size: 44, align: 'center' });
      text(ctx, big, w / 2, 220, { size: 160, align: 'center', color: '#222' });
      text(ctx, '📅 нажми — месяц спустя', w / 2, 360, { size: 26, align: 'center', color: '#555', weight: 700 });
    });
  drawCal();
  calG.position.set(1.7, 1.75, 2.96);
  scene.add(calG);
  k.reg('calendar', calG, 'Календарь');
  room.markers.calendar = [1.7, 2.45, 2.9];
  room.focus.calendar = { pos: [1.0, 1.65, -0.9], look: [1.7, 1.75, 2.96] };
  room.setShift = (n) => drawCal(['ОКТЯБРЬ', 'ОКТЯБРЬ', 'ОКТЯБРЬ', 'ОКТЯБРЬ', 'ОКТЯБРЬ'][n - 1], String(n));

  // План месяца, полки, окно
  const plan = k.sign(1.4, 0.9, 420, 270, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'ПЛАН МЕСЯЦА', 20, 34, { size: 28, color: '#6b4a2f' });
    [60, 90, 70, 110, 95].forEach((v, i) => {
      ctx.fillStyle = i === 4 ? '#ffb020' : '#2a9d8f';
      ctx.fillRect(40 + i * 72, h - 30 - v, 46, v);
    });
    ctx.strokeStyle = '#e63946';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(30, h - 130);
    ctx.lineTo(w - 20, h - 130);
    ctx.stroke();
  }, -1.4, 1.8, 2.97, Math.PI, null, false);
  k.reg('plan', plan, 'План месяца');
  const shelf = new THREE.Group();
  k.box(0.4, 2.0, 1.6, wood, 0, 1.0, 0, shelf);
  const colors = [0xe63946, 0x457b9d, 0xffb020, 0x2a9d8f, 0x8e7dbe];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) k.box(0.3, 0.32, 0.08, k.M(colors[(i + r) % 5]), -0.05, 0.3 + r * 0.45, -0.6 + i * 0.22, shelf);
  shelf.position.set(3.25, 0, 0.8);
  scene.add(shelf);
  k.reg('shelf', shelf, 'Архив договоров');
  const win = k.canvas(512, 300, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7fb8ec');
    g.addColorStop(1, '#dff0ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a5b6c6';
    for (let x = 0; x < w; x += 60) ctx.fillRect(x, h - 80 - (x % 90), 50, 200);
  });
  k.plane(1.8, 1.2, new THREE.MeshBasicMaterial({ map: win.tex, toneMapped: false }), -3.48, 1.7, 0.6, Math.PI / 2);
  k.box(0.05, 1.3, 1.9, k.M(0xffffff), -3.47, 1.7, 0.6);
  k.plant(-3.0, 2.5);
  k.plant(2.7, -2.5, null, 0.9);

  // Выход
  const exitG = new THREE.Group();
  k.box(1.0, 2.1, 0.06, k.M(0x5a3b28), 0, 1.05, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.35, 0.04, 0, exitG);
  exitG.position.set(-2.2, 0, -2.97);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x7d6a55, 1.0));
  const lamp = new THREE.PointLight(0xffe2b8, 5, 9, 2);
  lamp.position.set(0, 2.6, 0);
  scene.add(lamp);
  const sun = new THREE.DirectionalLight(0xfff3dd, 0.9);
  sun.position.set(-6, 4, 1);
  scene.add(sun);
  const p = k.plane(1.4, 0.5, k.glow(0xffffff, 1), 0, 2.99, 0);
  p.rotation.x = Math.PI / 2;
  room.update = (dt, t) => {
    client.position.y = Math.sin(t * 1.5) * 0.008;
  };
  return room;
}
