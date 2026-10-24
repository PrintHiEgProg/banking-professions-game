// Кабинет DevOps-инженера: рабочее место с тремя мониторами (конвейер), стена мониторинга с живыми графиками,
// серверные стойки с мигающими огоньками, доска доступов, резиновый утёнок для отладки.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text, MONO } from './kit.js';

const STEPS = ['🧱', '🔑', '📦', '🧪', '🔬', '✍️'];

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10141f);
  const room = makeRoom(scene, {
    bounds: { minX: -3.0, maxX: 3.0, minZ: -3.0, maxZ: -1.05 },
    spawn: { pos: [0, 1.62, -2.2], yaw: Math.PI },
    captions: {
      duck: '🦆 Утёнок для отладки. Объясни ему код вслух — и сам найдёшь ошибку. Это правда работает.',
      mug: '☕ «It works on my machine». Подарок от разработчиков.',
      poster: '🗓 Плакат: «Не выкатывай в пятницу вечером». А если очень надо — только канарейкой.',
      gost: '📜 Плакат: «Безопасность — с первого коммита». Процессы безопасной разработки описаны в ГОСТ Р 56939-2024, а банковские приложения по требованиям ЦБ проверяют на уязвимости.',
      lesha: '🧔 Лёша, тимлид DevOps: «Хороший релиз — скучный релиз. Всё проверено, ничего не горит»',
      beanbag: '🛋 Кресло-мешок. Для разборов аварий в 9 утра.',
      plant: '🪴 Кактус. Единственный, кто переживёт любое дежурство.',
      window: '🌃 Город спит. А банк — нет: платежи идут круглые сутки.',
      exit: '🚪 Выход в холл банка',
    },
  });
  const k = createKit(world, scene, room.interactables);
  k.shell({ w: 8, d: 7, h: 3.2, wall: 0x3a4763, floor: 0x3a4152, ceil: 0x1f2533, wallTex: true });
  const blue = 0x5b8cff;
  const darkM = k.M(0x0f131b, { roughness: 0.5, metalness: 0.3 });

  // Светодиодная лента по периметру потолка
  const led = k.glow(blue, 1.4);
  k.box(8, 0.03, 0.03, led, 0, 3.15, 3.47);
  k.box(0.03, 0.03, 7, led, -3.97, 3.15, 0);
  k.box(0.03, 0.03, 7, led, 3.97, 3.15, 0);

  // Стол с тремя мониторами
  const desk = new THREE.Group();
  k.box(2.4, 0.06, 0.85, k.M(0x2d3446, { roughness: 0.4 }), 0, 0.76, 0, desk);
  k.box(0.06, 0.74, 0.8, darkM, -1.15, 0.37, 0, desk);
  k.box(0.06, 0.74, 0.8, darkM, 1.15, 0.37, 0, desk);
  desk.position.set(0, 0, 0.5);
  scene.add(desk);
  const mon = new THREE.Group();
  const screens = [];
  for (const [x, ry] of [[-0.78, 0.35], [0, 0], [0.78, -0.35]]) {
    const g = new THREE.Group();
    k.box(0.72, 0.44, 0.03, darkM, 0, 0, 0, g);
    const s = k.sign(0.68, 0.4, 340, 200, () => {}, 0, 0, -0.017, Math.PI, g);
    screens.push(s);
    k.box(0.04, 0.3, 0.04, darkM, 0, -0.33, 0.03, g);
    g.position.set(x, 1.15, 0.65 + Math.abs(x) * 0.15);
    g.rotation.y = ry;
    mon.add(g);
  }
  k.box(0.5, 0.02, 0.16, k.M(0x1b2130), 0, 0.8, 0.25, mon);
  scene.add(mon);
  k.reg('monitor', mon, 'Рабочее место');
  room.markers.monitor = [0, 1.62, 0.7];
  room.focus.monitor = { pos: [0, 1.45, -0.55], look: [0, 1.15, 0.7] };
  const drawScreens = (n = 1) => {
    screens[1].userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, w, h);
      text(ctx, 'CI/CD · конвейер', 14, 20, { size: 18, color: '#9db8ff', font: MONO });
      STEPS.forEach((s, i) => {
        const x = 30 + i * 52;
        roundRect(ctx, x - 20, 70, 40, 40, 8);
        ctx.fillStyle = i < (n === 2 ? 6 : 4) ? '#1e3a2b' : '#2a2f40';
        ctx.fill();
        text(ctx, s, x, 91, { size: 22, align: 'center' });
        if (i < STEPS.length - 1) text(ctx, '→', x + 26, 91, { size: 16, align: 'center', color: '#5b8cff' });
      });
      text(ctx, n === 2 ? '✓ версия 4.2.1 выкачена 02:58' : '▶ релиз ждёт проверок', 14, 160, { size: 18, color: n === 2 ? '#7dffc0' : '#ffd166', font: MONO });
    });
    screens[0].userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      const code = ['const pay = await api(', '  amount, to,', '  key: vault.get("pay")', ');', 'if (!ok) rollback();', '// TODO: тесты'];
      code.forEach((l, i) => text(ctx, l, 12, 24 + i * 26, { size: 16, color: ['#ff7b72', '#c9d1d9', '#7ee787', '#c9d1d9', '#d2a8ff', '#8b949e'][i], font: MONO, weight: 500 }));
    });
    screens[2].userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      text(ctx, '$ kubectl get pods', 12, 22, { size: 15, color: '#7ee787', font: MONO, weight: 500 });
      ['app-1  Running', 'app-2  Running', 'app-3  Running', 'db-0   Running'].forEach((l, i) => text(ctx, l, 12, 54 + i * 28, { size: 15, color: '#c9d1d9', font: MONO, weight: 500 }));
    });
  };
  drawScreens();
  // утёнок и кружка
  const duck = new THREE.Group();
  const duckM = k.M(0xffd166, { roughness: 0.4 });
  k.sphere(0.07, duckM, 0, 0.07, 0, duck).scale.set(1.2, 0.9, 1);
  k.sphere(0.045, duckM, 0.05, 0.14, 0, duck);
  k.box(0.04, 0.015, 0.03, k.M(0xff7a45), 0.1, 0.135, 0, duck);
  duck.position.set(-0.85, 0.79, 0.25);
  duck.rotation.y = -2.3;
  scene.add(duck);
  k.reg('duck', duck, 'Резиновый утёнок');
  const mug = k.cyl(0.05, 0.045, 0.1, k.M(0xe9ecef), 0.85, 0.84, 0.25);
  k.reg('mug', mug, 'Кружка');

  // Стена мониторинга (дальняя стена)
  const wallG = new THREE.Group();
  k.box(3.8, 1.75, 0.06, darkM, 0, 0, 0, wallG);
  const wall = k.sign(3.7, 1.65, 920, 410, () => {}, 0, 0, -0.035, Math.PI, wallG);
  wallG.position.set(0, 1.85, 3.44);
  scene.add(wallG);
  k.reg('wall', wallG, 'Стена мониторинга');
  room.markers.wall = [0, 2.95, 3.35, 1.3];
  room.focus.wall = { pos: [0, 1.7, -0.9], look: [0, 1.85, 3.44] };
  const series = Array.from({ length: 4 }, () => Array(60).fill(0.3));
  let mode = 'ok';
  const drawWall = () =>
    wall.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, w, h);
      text(ctx, 'МОНИТОРИНГ · мобильный банк', 24, 32, { size: 28, color: '#9db8ff' });
      const alert = mode === 'alert';
      roundRect(ctx, w - 260, 12, 236, 40, 10);
      ctx.fillStyle = alert ? '#5a111c' : '#0f3b26';
      ctx.fill();
      text(ctx, alert ? '● ТРЕВОГА' : '● всё в норме', w - 142, 32, { size: 22, align: 'center', color: alert ? '#ff8a96' : '#7dffc0' });
      const names = ['Ошибки', 'Ответ, мс', 'Процессоры', 'Платежи/мин'];
      const colors = ['#ff4d5e', '#ffb020', '#5b8cff', '#3ddc84'];
      series.forEach((arr, i) => {
        const x0 = 24 + (i % 2) * 446;
        const y0 = 70 + Math.floor(i / 2) * 170;
        roundRect(ctx, x0, y0, 426, 150, 12);
        ctx.fillStyle = '#0d1424';
        ctx.fill();
        text(ctx, names[i], x0 + 14, y0 + 22, { size: 20, color: '#8fa3c8', weight: 700 });
        ctx.beginPath();
        arr.forEach((v, j) => {
          const x = x0 + 12 + (j / 59) * 402;
          const y = y0 + 140 - v * 100;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    });
  drawWall();

  // Серверные стойки (справа) с мигающими огоньками
  const rackG = new THREE.Group();
  const leds = [];
  const ledMats = [k.glow(0x3ddc84, 1.6), k.glow(0x5b8cff, 1.6), k.glow(0xffb020, 1.6)];
  for (const z of [0, 0.75]) {
    k.box(0.7, 2.1, 0.65, k.M(0x151a24, { metalness: 0.5, roughness: 0.4 }), 0, 1.05, z, rackG);
    for (let r = 0; r < 9; r++) {
      k.box(0.02, 0.16, 0.6, k.M(0x232a38, { metalness: 0.6 }), -0.36, 0.3 + r * 0.2, z, rackG);
      for (let j = 0; j < 4; j++) {
        const l = k.box(0.01, 0.025, 0.025, ledMats[(r + j) % 3], -0.375, 0.3 + r * 0.2, z - 0.2 + j * 0.06, rackG);
        leds.push(l);
      }
    }
  }
  rackG.position.set(3.45, 0, 1.4);
  scene.add(rackG);
  k.reg('rack', rackG, 'Серверная стойка · логи');
  room.markers.rack = [3.2, 2.45, 1.75];
  room.focus.rack = { pos: [1.4, 1.6, 0.0], look: [3.3, 1.35, 1.75] };

  // Доска доступов (левая стена)
  const boardG = new THREE.Group();
  k.box(2.0, 1.2, 0.05, k.M(0xf4f6fb), 0, 0, 0, boardG);
  const boardSign = k.sign(1.9, 1.1, 760, 440, (ctx, w, h) => {
    ctx.fillStyle = '#f4f6fb';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'КТО КУДА ИМЕЕТ ДОСТУП?', 24, 38, { size: 32, color: '#1f2a44' });
    const cols = ['📧', '🎓', '💵', '👀', '💻', '📜', '🔑', '⚙️'];
    const rows = ['Маша', 'Гоша', 'Олег', 'Ирина', 'CI-бот'];
    cols.forEach((c, i) => text(ctx, c, 190 + i * 66, 92, { size: 28, align: 'center' }));
    rows.forEach((r, j) => {
      text(ctx, r, 24, 140 + j * 58, { size: 26, color: '#1f2a44', weight: 700 });
      cols.forEach((_, i) => {
        const v = (i * 7 + j * 3) % 5;
        text(ctx, v === 0 ? '?' : v < 3 ? '✓' : '·', 190 + i * 66, 140 + j * 58, { size: 26, align: 'center', color: v === 0 ? '#d1477f' : v < 3 ? '#1f7a4d' : '#9aa3ad' });
      });
    });
    ctx.strokeStyle = '#5b8cff';
    ctx.lineWidth = 4;
    ctx.strokeRect(150, 70, 560, 340);
  }, 0, 0, 0.03, 0, boardG, false);
  boardG.position.set(-3.95, 1.7, 0.9);
  boardG.rotation.y = Math.PI / 2;
  scene.add(boardG);
  k.reg('board', boardG, 'Доска доступов');
  room.markers.board = [-3.75, 2.55, 0.9];
  room.focus.board = { pos: [-1.6, 1.65, 0.4], look: [-3.95, 1.65, 0.9] };

  // Плакаты, окно, кресло-мешок, коллега
  const poster = k.sign(0.9, 1.2, 300, 400, (ctx, w, h) => {
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '🗓', w / 2, 80, { size: 80, align: 'center' });
    text(ctx, 'НЕ ВЫКАТЫВАЙ', w / 2, 180, { size: 32, align: 'center', color: '#1b1405' });
    text(ctx, 'В ПЯТНИЦУ', w / 2, 222, { size: 32, align: 'center', color: '#1b1405' });
    text(ctx, 'ВЕЧЕРОМ', w / 2, 264, { size: 32, align: 'center', color: '#1b1405' });
    text(ctx, '(а если надо —', w / 2, 320, { size: 22, align: 'center', color: '#5a4a10', weight: 700 });
    text(ctx, 'канарейкой 🐤)', w / 2, 350, { size: 22, align: 'center', color: '#5a4a10', weight: 700 });
  }, 3.97, 1.8, -1.3, -Math.PI / 2, null, false);
  k.reg('poster', poster, 'Плакат');
  const gost = k.sign(0.9, 1.2, 300, 400, (ctx, w, h) => {
    ctx.fillStyle = '#1f2a44';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '🔐', w / 2, 80, { size: 80, align: 'center' });
    text(ctx, 'БЕЗОПАСНОСТЬ', w / 2, 180, { size: 30, align: 'center', color: '#9db8ff' });
    text(ctx, '— С ПЕРВОГО', w / 2, 220, { size: 30, align: 'center', color: '#9db8ff' });
    text(ctx, 'КОММИТА', w / 2, 260, { size: 30, align: 'center', color: '#9db8ff' });
    text(ctx, 'DevSecOps', w / 2, 340, { size: 30, align: 'center', color: '#ffd166' });
  }, -3.97, 1.8, -1.7, Math.PI / 2, null, false);
  k.reg('gost', gost, 'Плакат DevSecOps');
  const win = k.canvas(512, 300, () => {});
  let night = false;
  const drawWin = () =>
    win.redraw((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, night ? '#050a1a' : '#3b4f8f');
      g.addColorStop(1, night ? '#16244a' : '#f3a36b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 54) {
        ctx.fillStyle = night ? '#0c1222' : '#3a4060';
        ctx.fillRect(x, h - 80 - ((x * 7) % 110), 46, 220);
      }
      ctx.fillStyle = 'rgba(255,220,140,0.9)';
      for (let i = 0; i < (night ? 25 : 50); i++) ctx.fillRect((i * 61) % w, h - 25 - ((i * 37) % 110), 5, 7);
    });
  drawWin();
  const winM = k.plane(1.4, 1.0, new THREE.MeshBasicMaterial({ map: win.tex, toneMapped: false }), 2.4, 1.85, 3.46, Math.PI);
  k.reg('window', winM, 'Окно');
  const bean = k.sphere(0.5, k.M(0x5b8cff, { roughness: 1 }), -2.9, 0.3, 2.6);
  bean.scale.set(1, 0.6, 1);
  k.reg('beanbag', bean, 'Кресло-мешок');
  const plant = new THREE.Group();
  k.cyl(0.16, 0.12, 0.3, k.M(0xb8643c), 0, 0.15, 0, plant);
  k.cyl(0.07, 0.08, 0.5, k.M(0x2f7d4f), 0, 0.55, 0, plant);
  plant.position.set(-3.4, 0, -2.9);
  scene.add(plant);
  k.reg('plant', plant, 'Кактус');
  // Лёша за соседним столом
  const side = new THREE.Group();
  k.box(1.2, 0.05, 0.7, k.M(0x2d3446), 0, 0.76, 0, side);
  k.box(0.06, 0.74, 0.65, darkM, -0.55, 0.37, 0, side);
  k.box(0.06, 0.74, 0.65, darkM, 0.55, 0.37, 0, side);
  k.box(0.6, 0.36, 0.03, darkM, 0, 1.12, -0.2, side);
  side.position.set(2.55, 0, -1.6);
  side.rotation.y = -Math.PI / 2;
  scene.add(side);
  const lesha = k.person({ shirt: 0x22303d, hair: 0x2b1d1a, sit: true }, 3.15, -1.6, -Math.PI / 2);
  k.reg('lesha', lesha, 'Лёша, тимлид');

  // Выход
  const exitG = new THREE.Group();
  k.box(1.0, 2.1, 0.06, k.M(0x2d3446), 0, 1.05, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.35, 0.04, 0, exitG);
  exitG.position.set(-1.8, 0, -3.47);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  // Свет: холодный, экраны светятся
  scene.add(new THREE.HemisphereLight(0xb8c9ff, 0x2a3040, 1.25));
  const lamp = new THREE.PointLight(0xdfe8ff, 4.2, 10, 2);
  lamp.position.set(0, 2.9, 0);
  scene.add(lamp);
  const lamp2 = new THREE.PointLight(0xdfe8ff, 2.4, 8, 2);
  lamp2.position.set(0, 2.9, -2.4);
  scene.add(lamp2);
  // потолочные светильники
  for (const z of [-2.2, 0.6]) {
    const panel = k.plane(1.6, 0.4, k.glow(0xeaf0ff, 1), 0, 3.19, z);
    panel.rotation.x = Math.PI / 2;
  }
  const screenGlow = new THREE.PointLight(blue, 2.2, 5, 2);
  screenGlow.position.set(0, 1.3, 0.3);
  scene.add(screenGlow);
  const wallGlow = new THREE.PointLight(0x5b8cff, 2.0, 6, 2);
  wallGlow.position.set(0, 1.8, 2.6);
  scene.add(wallGlow);

  room.setShift = (n) => {
    night = n === 2;
    mode = n === 2 ? 'alert' : 'ok';
    drawWin();
    drawScreens(n);
    lamp.intensity = night ? 2.2 : 4.2;
    lamp2.intensity = night ? 1.2 : 2.4;
    wallGlow.color.set(n === 2 ? 0xff4d5e : 0x5b8cff);
  };
  room.setShift(1);
  let acc = 0;
  let accLed = 0;
  room.update = (dt, t) => {
    acc += dt;
    accLed += dt;
    if (accLed > 0.18) {
      accLed = 0;
      for (let i = 0; i < 6; i++) {
        const l = leds[Math.floor(Math.random() * leds.length)];
        l.visible = !l.visible;
      }
    }
    if (acc > 0.45) {
      acc = 0;
      series.forEach((arr, i) => {
        const last = arr[arr.length - 1];
        const base = mode === 'alert' && i < 3 ? 0.75 : [0.15, 0.3, 0.35, 0.6][i];
        arr.push(Math.max(0.03, Math.min(0.97, last + (base - last) * 0.2 + (Math.random() - 0.5) * 0.08)));
        arr.shift();
      });
      drawWall();
    }
    duck.rotation.y = -2.3 + Math.sin(t * 0.7) * 0.08;
    lesha.position.y = Math.sin(t * 1.3) * 0.006;
    screenGlow.intensity = 2.0 + Math.sin(t * 3) * 0.2;
  };
  return room;
}
