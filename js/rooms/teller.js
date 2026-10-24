// Кабинет операциониста: касса за стеклом, клиент у окна, очередь в зале, табло талонов.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text } from './kit.js';

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe9f2);
  const room = makeRoom(scene, {
    bounds: { minX: -3.5, maxX: 3.5, minZ: -3.0, maxZ: -1.15 },
    obstacles: [],
    spawn: { pos: [0, 1.62, -2.3], yaw: Math.PI },
    captions: {
      uv: '🔦 УФ-лампа: под ней настоящие купюры светятся защитными волокнами.',
      counter: '💵 Счётчик банкнот. Но пересчитывать всё равно надо глазами.',
      queue: '🎫 Табло очереди: кто следующий к окну №3.',
      client: '🙂 Клиент ждёт у окна.',
      rates: '💱 Курсы валют: банк покупает дешевле, чем продаёт.',
      exit: '🚪 Выход в холл банка',
    },
  });
  const k = createKit(world, scene, room.interactables);
  k.shell({ w: 8, d: 7, h: 3.2, wall: 0xe8eef3, floor: 0xb9c3cc });

  // Стойка с окнами
  const wood = k.M(0x8b5e3c, { roughness: 0.55 });
  const top = k.M(0xece7df, { roughness: 0.4 });
  k.box(8, 1.0, 0.6, wood, 0, 0.5, -0.4);
  k.box(8, 0.06, 0.9, top, 0, 1.03, -0.55);
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1 });
  k.box(8, 1.4, 0.02, glass, 0, 1.75, -0.12);
  const frame = k.M(0x5f6b77, { metalness: 0.6, roughness: 0.4 });
  for (const x of [-4, -1.6, 1.6, 4]) k.box(0.06, 1.4, 0.06, frame, x, 1.75, -0.12);
  k.box(8, 0.06, 0.06, frame, 0, 2.45, -0.12);
  // Номер окна
  for (const [x, n] of [[-2.8, 2], [0, 3], [2.8, 4]]) {
    k.sign(0.5, 0.3, 160, 96, (ctx, w, h) => {
      ctx.fillStyle = n === 3 ? '#4cc9f0' : '#90a4ae';
      roundRect(ctx, 0, 0, w, h, 16);
      ctx.fill();
      text(ctx, `Окно ${n}`, w / 2, h / 2, { size: 34, align: 'center', color: '#0b1a24' });
    }, x, 2.62, -0.1, Math.PI);
  }

  // Рабочее место: монитор, кнопка вызова, касса, УФ-лампа
  const monG = new THREE.Group();
  k.box(0.62, 0.38, 0.03, k.M(0x111418), 0, 0, 0, monG);
  const monScreen = k.sign(0.58, 0.34, 512, 300, () => {}, 0, 0, -0.017, Math.PI, monG);
  k.box(0.04, 0.2, 0.03, k.M(0x111418), 0, -0.27, 0.03, monG);
  monG.position.set(-0.75, 1.42, -0.75);
  monG.rotation.y = -0.35;
  scene.add(monG);
  const drawMon = (line) =>
    monScreen.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0d2238';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(0, 0, w, 40);
      text(ctx, 'ОПЕРАЦИОННЫЙ ДЕНЬ', 16, 21, { size: 22, color: '#0b1a24' });
      text(ctx, line, w / 2, 160, { size: 34, align: 'center' });
    });
  drawMon('Окно №3 · ожидание');
  room.setShift = (n) => drawMon(`Смена ${n} · окно открыто`);

  const callG = new THREE.Group();
  k.cyl(0.07, 0.08, 0.04, k.M(0x2b2f36), 0, 0.02, 0, callG);
  const btnMat = k.glow(0x3ddc84, 1.3);
  k.cyl(0.05, 0.05, 0.03, btnMat, 0, 0.05, 0, callG);
  callG.position.set(0.1, 1.06, -0.8);
  scene.add(callG);
  k.reg('call', callG, 'Кнопка вызова клиента');
  room.markers.call = [0.1, 1.38, -0.8];
  room.focus.call = { pos: [0, 1.55, -1.75], look: [0, 1.3, 0.6] };

  const cashG = new THREE.Group();
  k.box(0.7, 0.32, 0.55, k.M(0x4a5560, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0, cashG);
  k.box(0.66, 0.08, 0.02, k.M(0x2b3138), 0, 0.05, -0.285, cashG);
  k.box(0.2, 0.03, 0.03, k.M(0xd9d9d9, { metalness: 0.9 }), 0, -0.05, -0.3, cashG);
  cashG.position.set(0.85, 0.84, -1.0);
  scene.add(cashG);
  k.reg('cashbox', cashG, 'Касса (денежный ящик)');
  room.markers.cashbox = [0.85, 1.3, -1.0];
  room.focus.cashbox = { pos: [0.75, 1.55, -2.0], look: [0.85, 0.9, -1.0] };

  const uvG = new THREE.Group();
  k.box(0.25, 0.12, 0.18, k.M(0x2a2a40), 0, 0.06, 0, uvG);
  k.box(0.22, 0.02, 0.15, k.glow(0x8f5bff, 1.6), 0, 0.13, 0, uvG);
  uvG.position.set(1.45, 1.06, -0.75);
  scene.add(uvG);
  k.reg('uv', uvG, 'УФ-лампа');
  const counter = k.box(0.3, 0.2, 0.25, k.M(0xdadfe4), -1.5, 1.16, -0.75);
  k.reg('counter', counter, 'Счётчик банкнот');

  // Клиент у окна и очередь в зале
  const client = k.person({ shirt: 0xe76f51, hair: 0x3b2a20 }, 0, 0.55, Math.PI);
  k.reg('client', client, 'Клиент');
  const queue = [
    k.person({ shirt: 0x2a9d8f, hair: 0x1d1d1d }, -0.6, 2.0, Math.PI),
    k.person({ shirt: 0x8e7dbe, hair: 0xc9ccd3 }, 0.2, 2.6, Math.PI * 1.1),
    k.person({ shirt: 0xe9c46a, hair: 0x6b3e26, h: 0.82 }, -1.2, 2.9, Math.PI * 0.9),
  ];
  k.person({ shirt: 0x457b9d, hair: 0x6d4c41 }, -2.8, 0.6, Math.PI);
  k.person({ shirt: 0xbc6c25, hair: 0x2b1d1a }, 2.8, 0.6, Math.PI);
  for (const x of [-3, -2.2, 2.2, 3]) k.box(0.55, 0.45, 0.5, k.M(0x2f6f9a), x, 0.23, 3.0);

  // Табло очереди и курсы валют
  let ticket = 41;
  const qBoard = k.sign(2.4, 0.9, 720, 270, () => {}, 0, 2.45, 3.48, Math.PI);
  k.reg('queue', qBoard, 'Табло очереди');
  const drawQ = () =>
    qBoard.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, w, h);
      text(ctx, 'ТАЛОН', 40, 60, { size: 36, color: '#90a4ae' });
      text(ctx, 'ОКНО', 470, 60, { size: 36, color: '#90a4ae' });
      [[ticket, 3], [ticket - 1, 2], [ticket - 2, 4]].forEach(([t, w2], i) => {
        text(ctx, `А-0${t}`, 40, 130 + i * 55, { size: 46, color: i === 0 ? '#4cc9f0' : '#fff' });
        text(ctx, String(w2), 500, 130 + i * 55, { size: 46, color: i === 0 ? '#4cc9f0' : '#fff' });
      });
    });
  drawQ();
  const rates = k.sign(1.6, 0.9, 480, 270, (ctx, w, h) => {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'КУРСЫ ВАЛЮТ', 24, 40, { size: 30, color: '#4cc9f0' });
    [['$', '89.20', '92.40'], ['€', '96.50', '99.80']].forEach(([c, b, s], i) => {
      text(ctx, c, 40, 120 + i * 70, { size: 48 });
      text(ctx, b, 140, 120 + i * 70, { size: 44, color: '#7dffc0' });
      text(ctx, s, 300, 120 + i * 70, { size: 44, color: '#ffb3bb' });
    });
  }, -3.98, 2.0, 1.6, Math.PI / 2);
  k.reg('rates', rates, 'Курсы валют');

  // Выход в холл за спиной
  const exitG = new THREE.Group();
  k.box(1.1, 2.2, 0.06, k.M(0x6b4a2f), 0, 1.1, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.45, 0.04, 0, exitG);
  exitG.position.set(2.6, 0, -3.47);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  k.plant(-3.5, -3.0);
  scene.add(new THREE.HemisphereLight(0xf3f8ff, 0x8d8579, 1.0));
  const l1 = new THREE.PointLight(0xfff4e6, 4, 10, 2);
  l1.position.set(0, 2.9, -1.5);
  scene.add(l1);
  const l2 = new THREE.PointLight(0xfff4e6, 4, 12, 2);
  l2.position.set(0, 2.9, 2);
  scene.add(l2);
  for (const z of [-1.8, 1.5]) {
    const p = k.plane(2.4, 0.5, k.glow(0xffffff, 1), 0, 3.19, z);
    p.rotation.x = Math.PI / 2;
  }

  let t0 = 0;
  room.update = (dt, t) => {
    queue.forEach((p, i) => (p.position.y = Math.max(0, Math.sin(t * 1.4 + i) * 0.01)));
    btnMat.color.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.6);
    btnMat.color.multiply(new THREE.Color(0x3ddc84));
    t0 += dt;
    if (t0 > 6) {
      t0 = 0;
      ticket++;
      drawQ();
    }
  };
  return room;
}
