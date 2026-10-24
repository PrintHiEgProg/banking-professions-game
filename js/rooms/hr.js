// Кабинет HR-специалиста: круглый стол для собеседований, доска вакансий, ноутбук с откликами,
// шкаф с папкой от службы безопасности, календарь испытательного срока и дверь для новичков.
import * as THREE from 'three';
import { createKit, makeRoom, roundRect, text } from './kit.js';

const hex = (s) => parseInt(s.slice(1), 16);
const CAND = {
  1: { shirt: '#7b3f5e', hair: '#8a6a4a' },
  3: { shirt: '#4f8bd6', hair: '#5a3b28' },
};

export function build(world) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6ece6);
  const room = makeRoom(scene, {
    bounds: { minX: -2.6, maxX: 2.6, minZ: -2.5, maxZ: -0.75 },
    spawn: { pos: [0, 1.62, -1.75], yaw: Math.PI },
    captions: {
      poster: '💗 Плакат «Наши ценности»: честность, уважение, развитие. HR следит, чтобы это было не только на плакате.',
      sofa: '🛋 Диван для кандидатов. Пока ждут — пьют воду и волнуются.',
      cooler: '💧 Вода для кандидатов. Мелочь, но людям приятно.',
      plant: '🪴 Фикус Аркадий. Пережил три реорганизации.',
      window: '🌤 Ростов за окном. Где-то там будущие сотрудники банка пишут резюме.',
      shelf: '📚 «Трудовой кодекс», «Психология отбора», «Как не потерять новичка». Настольные книги HR.',
      client: '🙂 Кандидат волнуется. Твоя задача — узнать, что он умеет, а не напугать.',
      masha: '🎒 Новая стажёрка. Сегодня её первый день.',
      exit: '🚪 Выход в холл банка',
    },
  });
  const k = createKit(world, scene, room.interactables);
  k.shell({ w: 7, d: 6, h: 3, wall: 0xf7eee8, floor: 0xb08a62 });
  const wood = k.M(0x8a5a3c, { roughness: 0.45 });
  const pink = 0xff5fa2;

  // Ковёр и круглый стол собеседований
  const rug = k.plane(3.2, 2.6, k.M(0xe9c9d6, { roughness: 1 }), 0, 0.006, 0.6);
  rug.rotation.x = -Math.PI / 2;
  const tableG = new THREE.Group();
  k.cyl(0.85, 0.85, 0.06, k.M(0xfdf8f2, { roughness: 0.35 }), 0, 0.76, 0, tableG, 40);
  k.cyl(0.08, 0.12, 0.72, wood, 0, 0.37, 0, tableG);
  k.cyl(0.42, 0.42, 0.04, wood, 0, 0.02, 0, tableG);
  // на столе: резюме, ручка, стаканы воды
  k.box(0.3, 0.012, 0.4, k.M(0xffffff), -0.2, 0.8, -0.25, tableG).rotation.y = 0.15;
  k.box(0.012, 0.012, 0.16, k.M(0x1f2a44), -0.02, 0.81, -0.28, tableG).rotation.y = 0.5;
  for (const x of [0.32, -0.38]) k.cyl(0.04, 0.035, 0.12, new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.5 }), x, 0.85, x > 0 ? 0.25 : -0.05, tableG);
  tableG.position.set(0, 0, 0.6);
  scene.add(tableG);
  k.reg('table', tableG, 'Стол для собеседований');
  room.markers.table = [0, 1.45, 0.6];
  room.focus.table = { pos: [0, 1.55, -1.05], look: [0, 1.0, 1.0] };
  const chairM = k.M(0xd1477f, { roughness: 0.8 });
  for (const [z, ry] of [[1.45, Math.PI], [-0.3, 0]]) {
    const ch = new THREE.Group();
    k.box(0.5, 0.08, 0.5, chairM, 0, 0.46, 0, ch);
    k.box(0.5, 0.55, 0.06, chairM, 0, 0.76, 0.25, ch);
    for (const [x, zz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) k.box(0.04, 0.44, 0.04, k.M(0x2b2f36), x, 0.22, zz, ch);
    ch.position.set(0, 0, z);
    ch.rotation.y = ry;
    scene.add(ch);
  }
  let cand = null;
  const placeCand = (n) => {
    if (cand) scene.remove(cand);
    cand = null;
    const c = CAND[n];
    if (!c) return;
    cand = k.person({ shirt: hex(c.shirt), hair: hex(c.hair), sit: true }, 0, 1.38, Math.PI);
    k.reg('client', cand, 'Кандидат');
  };

  // Доска вакансий (пробковая)
  const boardG = new THREE.Group();
  k.box(1.7, 1.1, 0.05, k.M(0xc69c6d, { roughness: 0.95 }), 0, 0, 0, boardG);
  const boardSign = k.sign(1.6, 1.0, 640, 400, () => {}, 0, 0, -0.03, Math.PI, boardG, false);
  const drawBoard = (n = 1) =>
    boardSign.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#c69c6d';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,60,30,0.15)' : 'rgba(255,230,190,0.15)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      const notes = [
        ['#fff3a3', 'ВАКАНСИЯ', 'Операционист', n === 1],
        ['#c8f7d4', 'СТАЖИРОВКА', 'Контакт-центр', n === 2],
        ['#cfe8ff', 'ВАКАНСИЯ', 'Кредитный эксперт', n === 3],
        ['#ffd6e0', 'ВАКАНСИЯ', 'Инкассатор', n === 4],
        ['#ffe0b8', 'НОВИЧОК', 'Маша · пт 9:00', n === 5],
      ];
      notes.forEach(([c, a, b, hot], i) => {
        const x = 30 + (i % 3) * 205;
        const y = 30 + Math.floor(i / 3) * 185;
        ctx.save();
        ctx.translate(x + 85, y + 75);
        ctx.rotate((((i * 37) % 9) - 4) * 0.015);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-82, -68, 172, 150);
        ctx.fillStyle = c;
        ctx.fillRect(-86, -74, 172, 150);
        if (hot) {
          ctx.strokeStyle = '#ff2d7a';
          ctx.lineWidth = 6;
          ctx.strokeRect(-86, -74, 172, 150);
        }
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(0, -64, 9, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, a, 0, -26, { size: 22, align: 'center', color: '#7a2e4a' });
        text(ctx, b, 0, 14, { size: b.length > 14 ? 20 : 24, align: 'center', color: '#2a1d17' });
        if (hot) text(ctx, '★ сегодня', 0, 50, { size: 20, align: 'center', color: '#d1477f' });
        ctx.restore();
      });
    });
  drawBoard();
  boardG.position.set(-1.55, 1.8, 2.96);
  scene.add(boardG);
  k.reg('board', boardG, 'Доска вакансий');
  room.markers.board = [-1.55, 2.55, 2.9];
  room.focus.board = { pos: [-1.2, 1.7, -0.6], look: [-1.55, 1.75, 2.96] };

  // Календарь испытательного срока
  const calG = new THREE.Group();
  const cal = k.sign(0.8, 0.95, 320, 380, () => {}, 0, 0, 0, Math.PI, calG, false);
  const drawCal = (n = 1) =>
    cal.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d1477f';
      ctx.fillRect(0, 0, w, 84);
      text(ctx, 'ИСПЫТАТЕЛЬНЫЙ', w / 2, 30, { size: 26, align: 'center' });
      text(ctx, 'СРОК', w / 2, 62, { size: 26, align: 'center' });
      text(ctx, n === 2 || n === 5 ? '1' : '3', w / 2, 190, { size: 130, align: 'center', color: '#222' });
      text(ctx, n === 2 || n === 5 ? 'месяц' : 'месяца', w / 2, 278, { size: 34, align: 'center', color: '#444' });
      text(ctx, '📅 нажми — перемотать', w / 2, 340, { size: 22, align: 'center', color: '#777', weight: 700 });
    });
  drawCal();
  calG.position.set(1.65, 1.75, 2.96);
  scene.add(calG);
  k.reg('calendar', calG, 'Календарь');
  room.markers.calendar = [1.65, 2.45, 2.9];
  room.focus.calendar = { pos: [1.0, 1.65, -0.7], look: [1.65, 1.75, 2.96] };

  // Окно между доской и календарём
  const win = k.canvas(512, 300, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8cc4f2');
    g.addColorStop(1, '#e8f4ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a7b6c6';
    for (let x = 0; x < w; x += 58) ctx.fillRect(x, h - 70 - ((x * 7) % 100), 48, 200);
  });
  const winM = k.plane(1.1, 1.1, new THREE.MeshBasicMaterial({ map: win.tex, toneMapped: false }), 0.05, 1.85, 2.97, Math.PI);
  k.reg('window', winM, 'Окно');
  k.box(1.2, 0.06, 0.12, k.M(0xffffff), 0.05, 1.28, 2.93);

  // Рабочий стол с ноутбуком (слева)
  const desk = new THREE.Group();
  k.box(1.5, 0.05, 0.75, wood, 0, 0.76, 0, desk);
  k.box(0.05, 0.74, 0.7, wood, -0.7, 0.37, 0, desk);
  k.box(0.05, 0.74, 0.7, wood, 0.7, 0.37, 0, desk);
  desk.position.set(-2.75, 0, 0.1);
  desk.rotation.y = Math.PI / 2;
  scene.add(desk);
  const lap = new THREE.Group();
  k.box(0.42, 0.02, 0.3, k.M(0xc9ccd3, { metalness: 0.6, roughness: 0.3 }), 0, 0.01, 0, lap);
  const scr = k.sign(0.4, 0.26, 400, 260, () => {}, 0, 0.14, 0.13, Math.PI, lap);
  scr.rotation.x = 0.25;
  const drawLap = (n = 1) =>
    scr.userData.canvas.redraw((ctx, w, h) => {
      ctx.fillStyle = '#2a1e2e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff5fa2';
      ctx.fillRect(0, 0, w, 40);
      text(ctx, '✉ ОТКЛИКИ', 14, 21, { size: 22, color: '#2a0e1a' });
      text(ctx, n === 2 ? 'Новых: 10' : 'Новых: 3', 20, 100, { size: 36 });
      text(ctx, n === 2 ? 'Стажировка · лето' : 'Резюме · вакансии', 20, 160, { size: 26, color: '#ffc2dc' });
    });
  drawLap();
  lap.position.set(-2.75, 0.79, 0.15);
  lap.rotation.y = Math.PI / 2;
  scene.add(lap);
  k.reg('laptop', lap, 'Ноутбук с откликами');
  room.markers.laptop = [-2.75, 1.25, 0.15];
  room.focus.laptop = { pos: [-1.6, 1.5, -0.2], look: [-2.75, 0.95, 0.15] };

  // Шкаф с личными делами и папка от службы безопасности
  const cab = new THREE.Group();
  k.box(0.6, 1.3, 0.55, k.M(0x6c757d, { metalness: 0.4, roughness: 0.5 }), 0, 0.65, 0, cab);
  for (let i = 0; i < 3; i++) {
    k.box(0.5, 0.36, 0.02, k.M(0x868e96, { metalness: 0.5 }), 0, 0.25 + i * 0.42, 0.285, cab);
    k.box(0.14, 0.03, 0.03, k.M(0xd9d9d9, { metalness: 0.9 }), 0, 0.36 + i * 0.42, 0.3, cab);
  }
  const folder = k.box(0.32, 0.04, 0.42, k.M(0xc1121f, { roughness: 0.5 }), 0, 1.33, 0, cab);
  folder.rotation.y = 0.2;
  const stamp = k.sign(0.18, 0.08, 120, 52, (ctx, w, h) => {
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'СБ', w / 2, h / 2, { size: 36, align: 'center', color: '#fff' });
  }, 0, 1.355, 0, 0, cab);
  stamp.rotation.x = -Math.PI / 2;
  stamp.rotation.z = -0.2;
  cab.position.set(-3.1, 0, 1.9);
  cab.rotation.y = Math.PI / 2;
  scene.add(cab);
  k.reg('folder', cab, 'Папка от службы безопасности');
  room.markers.folder = [-3.1, 1.75, 1.9];
  room.focus.folder = { pos: [-1.7, 1.6, 0.6], look: [-3.1, 1.2, 1.9] };

  // Полка с книгами и плакат ценностей (левая стена)
  const shelf = new THREE.Group();
  k.box(0.3, 0.04, 1.2, wood, 0, 0, 0, shelf);
  const colors = [0xd1477f, 0x457b9d, 0xffb020, 0x2a9d8f, 0x8e7dbe, 0xe76f51];
  for (let i = 0; i < 9; i++) k.box(0.22, 0.26 + (i % 3) * 0.03, 0.07, k.M(colors[i % 6]), 0, 0.15, -0.5 + i * 0.12, shelf);
  shelf.position.set(-3.33, 1.7, -0.9);
  scene.add(shelf);
  k.reg('shelf', shelf, 'Книжная полка');
  const poster = k.sign(1.0, 1.3, 300, 390, (ctx, w, h) => {
    ctx.fillStyle = '#ff5fa2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff7fb';
    ctx.fillRect(12, 12, w - 24, h - 24);
    text(ctx, '💗', w / 2, 70, { size: 70, align: 'center' });
    text(ctx, 'НАШИ', w / 2, 140, { size: 34, align: 'center', color: '#a61e5c' });
    text(ctx, 'ЦЕННОСТИ', w / 2, 180, { size: 34, align: 'center', color: '#a61e5c' });
    ['Честность', 'Уважение', 'Развитие'].forEach((v, i) => text(ctx, `• ${v}`, 40, 245 + i * 42, { size: 30, color: '#2a1d17', weight: 700 }));
  }, 3.47, 1.75, -1.2, -Math.PI / 2, null, false);
  k.reg('poster', poster, 'Плакат');

  // Дверь для кандидатов и новичков (правая стена)
  const doorG = new THREE.Group();
  k.box(1.0, 2.15, 0.06, k.M(0xfdf8f2, { roughness: 0.5 }), 0, 1.075, 0, doorG);
  k.box(1.12, 0.08, 0.1, k.M(0xd1477f), 0, 2.18, 0, doorG);
  k.box(0.06, 0.25, 0.06, k.M(0xd9d9d9, { metalness: 0.9 }), 0.38, 1.05, 0.06, doorG);
  k.sign(0.95, 0.24, 380, 96, (ctx, w, h) => {
    ctx.fillStyle = '#d1477f';
    ctx.fillRect(0, 0, w, h);
    text(ctx, 'Вход для кандидатов', w / 2, h / 2, { size: 30, align: 'center' });
  }, 0, 2.42, 0.04, 0, doorG);
  doorG.position.set(3.47, 0, 1.3);
  doorG.rotation.y = -Math.PI / 2;
  scene.add(doorG);
  const welcome = k.plane(1.0, 0.6, k.M(0xd1477f, { roughness: 1 }), 3.0, 0.008, 1.3);
  welcome.rotation.x = -Math.PI / 2;
  k.reg('door', doorG, 'Дверь для кандидатов');
  room.markers.door = [3.3, 2.75, 1.3];
  room.focus.door = { pos: [0.9, 1.6, 0.0], look: [3.3, 1.4, 1.3] };
  // Маша у двери — в пятницу
  const masha = k.person({ shirt: 0x1f7a4d, hair: 0x6b3e26, h: 0.95 }, 2.7, 1.3, -Math.PI / 2);
  k.box(0.28, 0.32, 0.12, k.M(0xff9f1c), 0, 1.0, -0.2, masha);
  k.reg('masha', masha, 'Маша, стажёр');

  // Диван ожидания и кулер (правая стена, ближе к выходу)
  const sofa = new THREE.Group();
  const sofaM = k.M(0x9d4edd, { roughness: 0.9 });
  k.box(1.6, 0.42, 0.75, sofaM, 0, 0.21, 0, sofa);
  k.box(1.6, 0.55, 0.18, sofaM, 0, 0.58, 0.3, sofa);
  sofa.position.set(3.05, 0, -1.4);
  sofa.rotation.y = -Math.PI / 2;
  scene.add(sofa);
  k.reg('sofa', sofa, 'Диван');
  const cooler = new THREE.Group();
  k.box(0.35, 1.0, 0.35, k.M(0xf4f4f4), 0, 0.5, 0, cooler);
  k.cyl(0.14, 0.14, 0.42, new THREE.MeshStandardMaterial({ color: 0x7cc6ff, transparent: true, opacity: 0.6 }), 0, 1.22, 0, cooler);
  cooler.position.set(3.1, 0, 2.6);
  scene.add(cooler);
  k.reg('cooler', cooler, 'Кулер');
  const plant = k.plant(-3.0, 2.6, null, 1.1);
  k.reg('plant', plant, 'Фикус');
  k.plant(2.9, -2.6, null, 0.9);

  // Выход
  const exitG = new THREE.Group();
  k.box(1.0, 2.1, 0.06, k.M(0x8a5a3c), 0, 1.05, 0, exitG);
  k.sign(0.9, 0.3, 300, 100, (ctx, w, h) => {
    ctx.fillStyle = '#1f7a4d';
    ctx.fillRect(0, 0, w, h);
    text(ctx, '← В холл', w / 2, h / 2, { size: 46, align: 'center' });
  }, 0, 2.35, 0.04, 0, exitG);
  exitG.position.set(-1.7, 0, -2.97);
  scene.add(exitG);
  k.reg('exit', exitG, 'Выход в холл');

  // Свет
  scene.add(new THREE.HemisphereLight(0xfff4f7, 0x7d6a55, 1.05));
  const lamp = new THREE.PointLight(0xffe9dc, 5, 9, 2);
  lamp.position.set(0, 2.6, 0.4);
  scene.add(lamp);
  const glowL = new THREE.PointLight(pink, 1.4, 5, 2);
  glowL.position.set(0, 2.3, 2.4);
  scene.add(glowL);
  const sun = new THREE.DirectionalLight(0xfff0dd, 0.85);
  sun.position.set(1, 4, 6);
  scene.add(sun);
  for (const z of [-1.2, 1.2]) {
    const p = k.plane(1.4, 0.5, k.glow(0xffffff, 1), 0, 2.99, z);
    p.rotation.x = Math.PI / 2;
  }

  room.setShift = (n) => {
    placeCand(n);
    masha.visible = n === 5;
    masha.traverse((o) => (n === 5 ? o.layers.enable(0) : o.layers.disable(0)));
    drawBoard(n);
    drawCal(n);
    drawLap(n);
  };
  room.setShift(1);
  room.update = (dt, t) => {
    if (cand) cand.position.y = Math.sin(t * 1.5) * 0.008;
    if (masha.visible) masha.rotation.y = -Math.PI / 2 + Math.sin(t * 0.9) * 0.15;
    glowL.intensity = 1.2 + Math.sin(t * 2) * 0.25;
  };
  return room;
}
