// 3D-мир: ночной офис центра финансовой безопасности.
// Вся геометрия собрана из примитивов, все экраны и текстуры рисуются на canvas — без внешних моделей.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const MONO = '"JetBrains Mono", Consolas, monospace';
const SANS = 'Manrope, "Segoe UI", Arial, sans-serif';

const C = {
  green: '#3ddc84',
  mint: '#7dffc0',
  red: '#ff4d5e',
  amber: '#ffb020',
  blue: '#4cc9f0',
  text: '#d9f5e8',
};

// Точки на «карте» Ростовской области (долгота, широта).
const CITIES = [
  ['Ростов-на-Дону', 39.72, 47.23, 1],
  ['Таганрог', 38.9, 47.21],
  ['Азов', 39.42, 47.11],
  ['Батайск', 39.74, 47.07],
  ['Новочеркасск', 40.1, 47.42],
  ['Шахты', 40.21, 47.71],
  ['Волгодонск', 42.15, 47.51],
  ['Каменск-Шахтинский', 40.27, 48.32],
  ['Сальск', 41.54, 46.47],
  ['Миллерово', 40.39, 48.92],
  ['Белая Калитва', 40.8, 48.18],
];

// Время суток за окном и свет в комнате. Между пресетами можно плавно переходить.
const SKIES = {
  day: { top: '#3f7fd0', mid: '#86bdf0', low: '#c9e3f7', bottom: '#e8f3fb', stars: 0, moon: 0, sun: 0.9, sunX: 790, sunY: 110, lit: 0.06, haze: '#ffffff', hazeA: 0.08, light: '#fff1dc', lightI: 2.4, hemi: '#d2e2ff', hemiI: 1.25, win: '#d6ecff', winI: 4.5, fill: 9, rain: 0, ceil: 0.34 },
  evening: { top: '#28386e', mid: '#b05e78', low: '#f0915e', bottom: '#ffc483', stars: 0.12, moon: 0, sun: 1, sunX: 300, sunY: 350, lit: 0.5, haze: '#ff9a60', hazeA: 0.14, light: '#ff9a5a', lightI: 2.2, hemi: '#ffb898', hemiI: 0.95, win: '#ff9a60', winI: 4, fill: 7, rain: 0, ceil: 0.18 },
  night: { top: '#02040b', mid: '#081226', low: '#0f1c3a', bottom: '#0d1a33', stars: 1, moon: 1, sun: 0, sunX: 560, sunY: 600, lit: 1, haze: '#000000', hazeA: 0, light: '#7d96ff', lightI: 0.55, hemi: '#33476e', hemiI: 0.8, win: '#6a85ff', winI: 1.5, fill: 7, rain: 1, ceil: 0.09 },
  dawn: { top: '#2c4a8a', mid: '#d98a7a', low: '#ffb070', bottom: '#ffd8a0', stars: 0, moon: 0, sun: 1, sunX: 560, sunY: 190, lit: 0.15, haze: '#ffaa6e', hazeA: 0.22, light: '#ffb27a', lightI: 3.2, hemi: '#ffd2b0', hemiI: 1.3, win: '#ffa060', winI: 5.5, fill: 7, rain: 0, ceil: 0.04 },
};

function lerpSky(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) {
    const va = a[key];
    const vb = b[key];
    out[key] = typeof va === 'number' ? va + (vb - va) * k : `#${new THREE.Color(va).lerp(new THREE.Color(vb), k).getHexString()}`;
  }
  return out;
}

export const FOCUS = {
  monitor: { pos: [0, 1.14, -1.6], look: [0, 1.09, -2.45] },
  phone: { pos: [0.4, 1.22, -1.52], look: [0.48, 0.78, -1.98] },
  board: { pos: [2.5, 1.6, 0.2], look: [3.99, 1.6, 0.2] },
  window: { pos: [-2.45, 1.62, -0.4], look: [-3.99, 1.72, -0.4] },
  wall: { pos: [0, 1.85, -0.75], look: [0, 2.12, -3] },
  radar: { pos: [0.5, 1.13, -1.74], look: [0.76, 1.08, -2.36] },
};

const MARKERS = {
  monitor: [0, 1.4, -2.42],
  phone: [0.48, 0.98, -1.98],
  board: [3.82, 2.42, 0.2],
  window: [-3.8, 2.55, -0.4],
  wall: [0, 2.9, -2.85],
  radar: [0.76, 1.36, -2.36],
};

const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/[  ]/g, ' ');

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex, w, h };
}

function noiseTex(size, base, variance, repeat, grid = 0) {
  const { canvas, ctx, tex } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = base + (Math.random() - 0.5) * variance;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (grid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= size; p += grid) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function warnIcon(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 1.1, y + s * 0.85);
  ctx.lineTo(x - s * 1.1, y + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a0004';
  ctx.font = `800 ${Math.round(s * 1.3)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', x, y + s * 0.2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

export class World {
  constructor(canvas, { quality = 'high' } = {}) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060a);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.03, 80);
    this.camera.position.set(0, 1.62, 0.9);
    this.camera.rotation.order = 'YXZ';
    this.camera.layers.enable(1);

    this.raycaster = new THREE.Raycaster();
    this.screens = {};
    this.interactables = new Map();
    this.hovered = null;
    this.time = 0;
    this.timers = { wall: 0, feed: 0, radar: 0, main: 0, phone: 0, leds: 0 };
    this.state = {
      alarm: false,
      wallMode: 'attack',
      threat: 8427,
      stopped: 0,
      saved: 0,
      mainMode: 'idle',
      phoneMode: 'off',
      phoneText: '',
      clock: '23:52',
      board: null,
      radarMode: 'radar',
      markerTarget: null,
    };
    this.feed = [];
    this.pulses = [];
    this.blips = [];

    this.sky = { ...SKIES.night };
    this._build();
    // Комнаты: офис безопасности строится сразу, остальные — при первом входе.
    this.rooms = {
      security: {
        id: 'security',
        scene: this.scene,
        interactables: this.interactables,
        markers: MARKERS,
        focus: FOCUS,
        bounds: { minX: -3.65, maxX: 3.65, minZ: -2.7, maxZ: 2.65 },
        obstacles: [[-1.4, 1.4, -2.8, -1.72], [-1.0, -0.25, -1.68, -0.95], [0.55, 2.25, 2.2, 3], [3.0, 4, 1.95, 3], [-3.9, -3.05, 2.05, 2.9], [-4, -3.3, -2.8, -2.05]],
        spawn: { pos: [0, 1.62, 0.9], yaw: 0 },
        update: null,
      },
    };
    this.builders = {};
    this.room = 'security';
    this.markers = MARKERS;
    this._setupPost();
    this.resize();
  }

  registerRoom(id, builder) {
    this.builders[id] = builder;
  }

  ensureRoom(id) {
    if (!this.rooms[id]) {
      const room = this.builders[id](this);
      room.id = id;
      this.rooms[id] = room;
    }
    return this.rooms[id];
  }

  // Переключить комнату: сцена, интерактивные объекты, точки целей
  setRoom(id) {
    const room = this.ensureRoom(id);
    this.setHover(null);
    this.setMarker(null);
    this.room = id;
    this.scene = room.scene;
    this.interactables = room.interactables;
    this.markers = room.markers;
    room.scene.add(this.marker);
    if (this.renderPass) this.renderPass.scene = room.scene;
    return room;
  }

  focusPose(name) {
    return this.rooms[this.room].focus[name];
  }

  // ─────────────────────────── сборка сцены ───────────────────────────
  _build() {
    const s = this.scene;
    const high = this.quality === 'high';
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.maxAniso = maxAniso;

    const M = (opts) => new THREE.MeshStandardMaterial(opts);
    this.mat = {
      wall: M({ color: 0x34465c, roughness: 0.95, map: noiseTex(128, 230, 34, [6, 3]) }),
      floor: M({ color: 0x3a4250, roughness: 0.97, map: noiseTex(256, 210, 60, [6, 4.5], 64) }),
      ceil: M({ color: 0x161c25, roughness: 1 }),
      desk: M({ color: 0x5a3b28, roughness: 0.5, metalness: 0.05 }),
      deskBody: M({ color: 0x1c2027, roughness: 0.6, metalness: 0.2 }),
      metal: M({ color: 0x8a939e, roughness: 0.35, metalness: 0.8 }),
      dark: M({ color: 0x0e1014, roughness: 0.45, metalness: 0.3 }),
      plastic: M({ color: 0x1e2229, roughness: 0.6 }),
      fabric: M({ color: 0x1b2129, roughness: 0.95 }),
      wood: M({ color: 0x6b4a2f, roughness: 0.7 }),
      white: M({ color: 0xe9ecef, roughness: 0.4 }),
      leaf: M({ color: 0x2f7d4f, roughness: 0.8 }),
      pot: M({ color: 0xb8643c, roughness: 0.85 }),
    };
    const box = (w, h, d, mat, x, y, z, parent = s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = high;
      m.receiveShadow = high;
      parent.add(m);
      return m;
    };
    const plane = (w, h, mat, x, y, z, ry = 0, parent = s) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      parent.add(m);
      return m;
    };
    const glow = (hex, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });

    // Комната 8×6×3 м
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), this.mat.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = high;
    s.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), this.mat.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3;
    s.add(ceil);
    plane(8, 3, this.mat.wall, 0, 1.5, -3).receiveShadow = high;
    plane(8, 3, this.mat.wall, 0, 1.5, 3, Math.PI).receiveShadow = high;
    plane(6, 3, this.mat.wall, -4, 1.5, 0, Math.PI / 2).receiveShadow = high;
    plane(6, 3, this.mat.wall, 4, 1.5, 0, -Math.PI / 2).receiveShadow = high;
    const base = this.mat.dark;
    box(8, 0.08, 0.02, base, 0, 0.04, -2.99);
    box(8, 0.08, 0.02, base, 0, 0.04, 2.99);
    box(0.02, 0.08, 6, base, -3.99, 0.04, 0);
    box(0.02, 0.08, 6, base, 3.99, 0.04, 0);

    // Потолочные панели
    this.ceilMat = glow(0xcfe0ff, 0.09);
    for (const [x, z] of [[-2, -0.5], [2, -0.5], [0, 1.6]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), this.ceilMat);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, 2.995, z);
      s.add(p);
    }

    // Светодиодные ленты
    this.ledMat = glow(0x29ff9a, 1.2);
    box(3.7, 0.02, 0.02, this.ledMat, 0, 1.4, -2.97).castShadow = false;
    box(8, 0.015, 0.015, glow(0x29ff9a, 0.55), 0, 2.97, -2.97).castShadow = false;
    box(2.5, 0.012, 0.012, this.ledMat, 0, 0.73, -1.79).castShadow = false;

    // Стол
    box(2.6, 0.05, 0.95, this.mat.desk, 0, 0.75, -2.25);
    box(0.06, 0.72, 0.9, this.mat.deskBody, -1.25, 0.36, -2.25);
    box(0.06, 0.72, 0.9, this.mat.deskBody, 1.25, 0.36, -2.25);
    box(2.5, 0.5, 0.03, this.mat.deskBody, 0, 0.45, -2.68);

    // Мониторы
    this.screens.main = makeCanvas(512, 296);
    this.screens.feed = makeCanvas(512, 300);
    this.screens.radar = makeCanvas(512, 300);
    const mainMon = this._monitor(0.66, 0.38, this.screens.main, [0, 1.1, -2.45], 0);
    const leftMon = this._monitor(0.56, 0.33, this.screens.feed, [-0.76, 1.08, -2.36], 0.4);
    const rightMon = this._monitor(0.56, 0.33, this.screens.radar, [0.76, 1.08, -2.36], -0.4);
    this.addInteractable('monitor', mainMon, 'Главный монитор');
    this.addInteractable('feed', leftMon, 'Лента операций');
    this.addInteractable('radar', rightMon, 'Антифрод-радар');

    // Клавиатура и мышь
    const kb = makeCanvas(256, 80);
    this._drawKeyboard(kb);
    box(0.44, 0.018, 0.14, this.mat.plastic, 0, 0.785, -2.0);
    const kbTop = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.125), new THREE.MeshBasicMaterial({ map: kb.tex, toneMapped: false }));
    kbTop.rotation.x = -Math.PI / 2;
    kbTop.position.set(0, 0.7951, -2.0);
    s.add(kbTop);
    box(0.06, 0.022, 0.1, this.mat.plastic, 0.33, 0.786, -2.0);

    // Кружка с паром
    const mug = new THREE.Group();
    mug.position.set(-0.42, 0.775, -1.98);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 24), this.mat.white);
    cup.position.y = 0.05;
    cup.castShadow = high;
    mug.add(cup);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 8, 16), this.mat.white);
    handle.position.set(0.045, 0.052, 0);
    mug.add(handle);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), M({ color: 0x2b170c, roughness: 0.2 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.092;
    mug.add(coffee);
    s.add(mug);
    this.addInteractable('mug', mug, 'Кружка');
    this.steam = [];
    const steamTex = this._radialTex('rgba(255,255,255,0.9)');
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
      sp.layers.set(1);
      sp.userData.phase = i / 5;
      s.add(sp);
      this.steam.push(sp);
    }
    this.mugPos = new THREE.Vector3(-0.42, 0.875, -1.98);

    // Настольная лампа
    const lamp = new THREE.Group();
    lamp.position.set(-1.0, 0.775, -2.45);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.02, 24), this.mat.dark);
    lamp.add(lb);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), this.mat.metal);
    arm.position.set(0.04, 0.2, 0.03);
    arm.rotation.z = -0.25;
    lamp.add(arm);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 24, 1, true), this.mat.dark);
    head.position.set(0.11, 0.4, 0.08);
    head.rotation.z = 0.9;
    head.rotation.x = 0.35;
    lamp.add(head);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), glow(0xffd9a0, 3));
    bulb.position.set(0.13, 0.37, 0.09);
    lamp.add(bulb);
    s.add(lamp);
    const spot = new THREE.SpotLight(0xffc890, 9, 4, 0.75, 0.6, 2);
    spot.position.set(-0.87, 1.14, -2.36);
    spot.target.position.set(-0.45, 0.77, -2.05);
    spot.castShadow = high;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0008;
    s.add(spot, spot.target);

    // Телефон
    this.screens.phone = makeCanvas(160, 340);
    const phone = new THREE.Group();
    phone.position.set(0.48, 0.775, -1.98);
    phone.rotation.y = -0.25;
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.009, 0.155), this.mat.dark);
    pb.position.y = 0.0045;
    pb.castShadow = high;
    phone.add(pb);
    this.phoneScreenMat = new THREE.MeshBasicMaterial({ map: this.screens.phone.tex, toneMapped: false });
    const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), this.phoneScreenMat);
    ps.rotation.x = -Math.PI / 2;
    ps.position.y = 0.0092;
    phone.add(ps);
    s.add(phone);
    this.phone = phone;
    this.phoneBase = phone.position.clone();
    this.addInteractable('phone', phone, 'Телефон');

    // Кресло
    const chair = new THREE.Group();
    chair.position.set(-0.62, 0, -1.3);
    chair.rotation.y = 0.6;
    box(0.5, 0.08, 0.48, this.mat.fabric, 0, 0.48, 0, chair);
    box(0.48, 0.62, 0.06, this.mat.fabric, 0, 0.86, 0.23, chair);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), this.mat.metal);
    pole.position.y = 0.25;
    chair.add(pole);
    for (let i = 0; i < 5; i++) {
      const leg = box(0.32, 0.03, 0.04, this.mat.dark, 0, 0.05, 0, chair);
      leg.rotation.y = (i / 5) * Math.PI * 2;
      leg.position.set(Math.cos(leg.rotation.y) * 0.14, 0.05, -Math.sin(leg.rotation.y) * 0.14);
    }
    s.add(chair);

    // Видеостена
    this.screens.wall = makeCanvas(1024, 384);
    box(3.7, 1.42, 0.04, this.mat.dark, 0, 2.15, -2.99);
    this.wallMat = new THREE.MeshBasicMaterial({ map: this.screens.wall.tex, toneMapped: false });
    const wall = plane(3.6, 1.35, this.wallMat, 0, 2.15, -2.965);
    this.addInteractable('wall', wall, 'Видеостена');

    // Часы
    this.screens.clock = makeCanvas(256, 88);
    box(0.56, 0.21, 0.04, this.mat.dark, -2.6, 2.35, -2.99);
    const clock = plane(0.52, 0.18, new THREE.MeshBasicMaterial({ map: this.screens.clock.tex, toneMapped: false }), -2.6, 2.35, -2.965);
    this.addInteractable('clock', clock, 'Часы');

    // Сигнальный маячок
    const beaconBase = box(0.14, 0.05, 0.1, this.mat.dark, 2.45, 2.72, -2.94);
    beaconBase.castShadow = false;
    this.beaconMat = M({ color: 0x400008, emissive: 0xff1030, emissiveIntensity: 0.2, roughness: 0.3 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.beaconMat);
    dome.position.set(2.45, 2.745, -2.94);
    s.add(dome);
    this.alarmLight = new THREE.PointLight(0xff2034, 0, 10, 1.6);
    this.alarmLight.position.set(2.2, 2.5, -2.5);
    s.add(this.alarmLight);

    // Окно с ночным городом
    this.screens.window = makeCanvas(1024, 572);
    this._prepareCity();
    this.windowMat = new THREE.MeshBasicMaterial({ map: this.screens.window.tex, toneMapped: false });
    const winGroup = new THREE.Group();
    plane(2.6, 1.45, this.windowMat, -3.985, 1.68, -0.4, Math.PI / 2, winGroup);
    const frameMat = this.mat.plastic;
    box(0.06, 0.06, 2.72, frameMat, -3.96, 2.43, -0.4, winGroup);
    box(0.06, 0.06, 2.72, frameMat, -3.96, 0.93, -0.4, winGroup);
    box(0.06, 1.56, 0.06, frameMat, -3.96, 1.68, -1.73, winGroup);
    box(0.06, 1.56, 0.06, frameMat, -3.96, 1.68, 0.93, winGroup);
    box(0.05, 1.5, 0.04, frameMat, -3.96, 1.68, -0.4, winGroup);
    box(0.25, 0.04, 2.8, this.mat.white, -3.86, 0.9, -0.4, winGroup);
    s.add(winGroup);
    const rainCanvas = this._rainTex();
    this.rainMat = new THREE.MeshBasicMaterial({ map: rainCanvas, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
    const rain = plane(2.6, 1.45, this.rainMat, -3.975, 1.68, -0.4, Math.PI / 2);
    rain.layers.set(1);
    this.addInteractable('window', winGroup, 'Окно');

    // Пробковая доска расследований
    this.screens.board = makeCanvas(1024, 610);
    this._prepareCork();
    box(0.05, 1.33, 2.18, this.mat.wood, 3.97, 1.6, 0.2);
    const board = plane(2.1, 1.25, new THREE.MeshStandardMaterial({ map: this.screens.board.tex, roughness: 0.9 }), 3.94, 1.6, 0.2, -Math.PI / 2);
    board.receiveShadow = high;
    this.screens.board.tex.anisotropy = maxAniso;
    this.addInteractable('board', board, 'Доска расследований');

    // Стол коллеги у задней стены
    const cdesk = new THREE.Group();
    box(1.6, 0.04, 0.7, this.mat.desk, 1.4, 0.75, 2.6, cdesk);
    box(0.05, 0.73, 0.65, this.mat.deskBody, 0.65, 0.365, 2.6, cdesk);
    box(0.05, 0.73, 0.65, this.mat.deskBody, 2.15, 0.365, 2.6, cdesk);
    const offMon = box(0.6, 0.36, 0.03, this.mat.dark, 1.4, 1.08, 2.82, cdesk);
    offMon.rotation.y = Math.PI;
    box(0.04, 0.2, 0.03, this.mat.dark, 1.4, 0.86, 2.85, cdesk);
    const note = makeCanvas(128, 128);
    this._drawSticky(note, ['Удачи', 'на смене!', 'Кофе — в', 'верхнем ящике', '— Саша']);
    plane(0.11, 0.11, new THREE.MeshStandardMaterial({ map: note.tex, roughness: 0.9 }), 1.62, 1.16, 2.8, Math.PI);
    s.add(cdesk);
    this.addInteractable('colleague', cdesk, 'Стол коллеги');

    // Плакат на задней стене
    const poster = makeCanvas(360, 500);
    this._drawPoster(poster);
    box(0.74, 1.02, 0.03, this.mat.dark, -0.55, 1.7, 2.985);
    const posterMesh = plane(0.7, 0.97, new THREE.MeshStandardMaterial({ map: poster.tex, roughness: 0.8 }), -0.55, 1.7, 2.965, Math.PI);
    this.addInteractable('poster', posterMesh, 'Плакат');

    // Серверная стойка
    this.screens.leds = makeCanvas(64, 256);
    const rack = new THREE.Group();
    box(0.7, 2.0, 0.8, this.mat.dark, 3.45, 1.0, 2.45, rack);
    const ledFace = plane(0.6, 1.8, new THREE.MeshBasicMaterial({ map: this.screens.leds.tex, toneMapped: false }), 3.45, 1.0, 2.04, Math.PI, rack);
    ledFace.rotation.y = Math.PI;
    s.add(rack);
    this.addInteractable('rack', rack, 'Серверная стойка');

    // Дверь и табличка «Выход»
    const door = new THREE.Group();
    box(1.0, 2.1, 0.06, this.mat.wood, -2.2, 1.05, 2.97, door);
    box(0.12, 0.03, 0.04, this.mat.metal, -1.82, 1.0, 2.92, door);
    const exit = makeCanvas(256, 96);
    this._drawExit(exit);
    plane(0.42, 0.16, new THREE.MeshBasicMaterial({ map: exit.tex, toneMapped: false }), -2.2, 2.32, 2.96, Math.PI, door);
    s.add(door);
    this.addInteractable('door', door, 'Дверь');

    // Фикус
    const plant = new THREE.Group();
    plant.position.set(-3.45, 0, 2.45);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.42, 20), this.mat.pot);
    pot.position.y = 0.21;
    pot.castShadow = high;
    plant.add(pot);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.06, 10, 8), this.mat.leaf);
      const a = (i / 9) * Math.PI * 2;
      leaf.scale.set(1, 1.6, 0.5);
      leaf.position.set(Math.cos(a) * 0.17, 0.75 + (i % 3) * 0.22, Math.sin(a) * 0.17);
      leaf.rotation.set(Math.random(), a, Math.random() * 0.6);
      leaf.castShadow = high;
      plant.add(leaf);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.8, 8), this.mat.wood);
    stem.position.y = 0.75;
    plant.add(stem);
    s.add(plant);
    this.addInteractable('plant', plant, 'Фикус');

    // Шкаф для документов
    box(0.55, 1.1, 0.6, M({ color: 0x59616c, roughness: 0.5, metalness: 0.5 }), -3.65, 0.55, -2.45);
    for (const y of [0.3, 0.65, 0.98]) box(0.02, 0.015, 0.2, this.mat.metal, -3.37, y, -2.45);

    // Свет
    s.add(new THREE.HemisphereLight(0x33476e, 0x0b0b0f, 0.8));
    this.monitorLight = new THREE.PointLight(0x5fd8ff, 2.2, 3.5, 2);
    this.monitorLight.position.set(0, 1.15, -2.05);
    s.add(this.monitorLight);
    this.wallLight = new THREE.PointLight(0x30ff90, 2.5, 6, 2);
    this.wallLight.position.set(0, 2.1, -2.3);
    s.add(this.wallLight);
    this.fill1 = new THREE.PointLight(0x8fa6ff, 7, 9, 2);
    this.fill1.position.set(0.5, 2.75, 0.8);
    s.add(this.fill1);
    this.fill2 = new THREE.PointLight(0x8fa6ff, 3, 7, 2);
    this.fill2.position.set(-2.6, 2.75, -1.2);
    s.add(this.fill2);
    this.hemi = s.children.find((o) => o.isHemisphereLight);
    this.sunLight = new THREE.DirectionalLight(0x7d96ff, 0.55);
    this.sunLight.position.set(-9, 3.5, -0.8);
    this.sunLight.target.position.set(0, 0.6, -0.4);
    s.add(this.sunLight, this.sunLight.target);
    this.windowGlow = new THREE.PointLight(0x6a85ff, 1.5, 5, 2);
    this.windowGlow.position.set(-3.4, 1.8, -0.4);
    s.add(this.windowGlow);

    // Маркер цели задания
    const mk = makeCanvas(128, 128);
    this._drawMarker(mk);
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: mk.tex, transparent: true, depthTest: false, depthWrite: false }));
    this.marker.scale.set(0.16, 0.16, 1);
    this.marker.renderOrder = 999;
    this.marker.layers.set(1);
    this.marker.visible = false;
    s.add(this.marker);

    for (const k of ['main', 'feed', 'radar', 'wall']) this.screens[k].tex.anisotropy = maxAniso;
    this.redrawStatic();
  }

  _monitor(w, h, screen, pos, ry) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.y = ry;
    const high = this.quality === 'high';
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.025), this.mat.dark);
    bezel.castShadow = high;
    g.add(bezel);
    const mat = new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false });
    if (high) mat.color.setScalar(1.25);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    sc.position.z = 0.0131;
    g.add(sc);
    const standH = pos[1] - h / 2 - 0.775;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.04, standH, 0.03), this.mat.dark);
    stand.position.set(0, -h / 2 - standH / 2, -0.03);
    g.add(stand);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.13), this.mat.dark);
    base.position.set(0, -h / 2 - standH + 0.006, -0.03);
    base.castShadow = high;
    g.add(base);
    this.scene.add(g);
    return g;
  }

  _radialTex(color) {
    const { ctx, tex } = makeCanvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.needsUpdate = true;
    return tex;
  }

  _rainTex() {
    const { ctx, tex } = makeCanvas(256, 256);
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const l = 8 + Math.random() * 26;
      ctx.strokeStyle = `rgba(190,215,255,${0.08 + Math.random() * 0.3})`;
      ctx.lineWidth = Math.random() < 0.2 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.5, y + l);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(200,225,255,${0.1 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1.8);
    tex.needsUpdate = true;
    return tex;
  }

  _setupPost() {
    this.composer = null;
    if (this.quality !== 'high') return;
    try {
      const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);
      this.bloom = new UnrealBloomPass(size, 0.55, 0.55, 0.88);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } catch (e) {
      console.warn('Постобработка недоступна, рендерим без неё', e);
      this.composer = null;
    }
  }

  // ─────────────────────────── интерактивные объекты ───────────────────────────
  addInteractable(id, object, label, map = this.interactables) {
    object.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.interactId = id;
      if (o.material.isMeshStandardMaterial) {
        o.material = o.material.clone();
        o.userData.baseEmissive = o.material.emissive.clone();
        o.userData.baseEmissiveIntensity = o.material.emissiveIntensity;
      } else if (o.material.isMeshBasicMaterial) {
        o.userData.baseColor = o.material.color.clone();
      }
    });
    map.set(id, { id, object, label });
  }

  pick(ndc) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.interactId == null) o = o.parent;
      if (o) return this.interactables.get(o.userData.interactId) || null;
      return null;
    }
    return null;
  }

  setHover(id) {
    if (this.hovered === id) return;
    if (this.hovered) this._highlight(this.hovered, false);
    this.hovered = id;
    if (id) this._highlight(id, true);
  }

  _highlight(id, on) {
    const it = this.interactables.get(id);
    if (!it) return;
    it.object.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (m.isMeshStandardMaterial && o.userData.baseEmissive) {
        if (on) {
          m.emissive.setHex(0x1d8a57);
          m.emissiveIntensity = 0.45;
        } else {
          m.emissive.copy(o.userData.baseEmissive);
          m.emissiveIntensity = o.userData.baseEmissiveIntensity;
        }
      } else if (m.isMeshBasicMaterial && o.userData.baseColor) {
        if (on) m.color.copy(o.userData.baseColor).multiplyScalar(1.3);
        else m.color.copy(o.userData.baseColor);
      }
    });
  }

  // Экранные координаты (NDC) точки над целью — для «прощающих» кликов рядом с целью.
  markerNDC(target) {
    const p = this.markers[target];
    if (!p) return null;
    const v = this.marker.position.clone().set(p[0], p[1] - 0.15, p[2]).project(this.camera);
    return v.z < 1 ? v : null;
  }

  // Прямоугольник цели на экране (NDC) — для засчитывания кликов рядом с ней.
  targetScreenRect(target) {
    const it = this.interactables.get(target);
    if (!it) return null;
    const box = new THREE.Box3().setFromObject(it.object);
    const r = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    let any = false;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(this.camera);
      if (v.z > 1) continue;
      any = true;
      r.minX = Math.min(r.minX, v.x);
      r.maxX = Math.max(r.maxX, v.x);
      r.minY = Math.min(r.minY, v.y);
      r.maxY = Math.max(r.maxY, v.y);
    }
    return any ? r : null;
  }

  // Куда смотреть на цель: координаты в NDC и признак «за спиной».
  targetProjection(target) {
    const p = this.markers[target];
    if (!p) return null;
    const v = this.marker.position.clone().set(p[0], p[1], p[2]).project(this.camera);
    const behind = v.z > 1;
    return { x: behind ? -v.x : v.x, y: behind ? -v.y : v.y, behind };
  }

  markerPoint(target) {
    return this.markers[target] || null;
  }

  setMarker(target) {
    this.state.markerTarget = target;
    this.marker.visible = !!(target && this.markers[target]);
  }

  // ─────────────────────────── состояние мира ───────────────────────────
  setAlarm(on) {
    this.state.alarm = on;
    this.wallLight.color.set(on ? 0xff3a4a : 0x30ff90);
    if (!on) {
      this.alarmLight.intensity = 0;
      this.beaconMat.emissiveIntensity = 0.2;
    }
  }

  setWall(mode) {
    this.state.wallMode = mode;
  }

  setNumbers({ threat, stopped, saved }) {
    if (threat != null) this.state.threat = threat;
    if (stopped != null) this.state.stopped = stopped;
    if (saved != null) this.state.saved = saved;
  }

  setMain(mode) {
    this.state.mainMode = mode;
    this.timers.main = 99;
  }

  setPhone(mode, text = '') {
    this.state.phoneMode = mode;
    this.state.phoneText = text;
    this.timers.phone = 99;
  }

  setClock(text) {
    this.state.clock = text;
    this._drawClock();
  }

  setBoard(board) {
    this.state.board = board;
    this._drawBoard();
  }

  // Мгновенно поставить время суток (day | evening | night | dawn) или промежуточное состояние.
  setSky(sky) {
    this.sky = typeof sky === 'string' ? { ...SKIES[sky] } : sky;
    const k = this.sky;
    this.sunLight.color.set(k.light);
    this.sunLight.intensity = k.lightI;
    this.windowGlow.color.set(k.win);
    this.windowGlow.intensity = k.winI;
    this.hemi.color.set(k.hemi);
    this.hemi.intensity = k.hemiI;
    this.fill1.intensity = k.fill;
    this.rainMat.opacity = 0.45 * k.rain;
    this.ceilMat.color.setRGB(0.81 * k.ceil, 0.88 * k.ceil, k.ceil);
    this._drawWindow();
  }

  // Плавный переход между пресетами, например ночь → рассвет.
  animateSky(from, to, ms) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        this.setSky(lerpSky(SKIES[from], SKIES[to], p * p * (3 - 2 * p)));
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  setRadarMode(mode) {
    this.state.radarMode = mode;
  }

  setQuality(q) {
    this.quality = q;
    if (q === 'high' && !this.composer) this._setupPost();
    if (q !== 'high') this.composer = null;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.25);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 82 : 70;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
    }
  }

  // ─────────────────────────── кадр ───────────────────────────
  // Под панелью 3D почти не видно: рисуем реже, чтобы телефон не грелся и интерфейс не тормозил
  _shouldRender(dt) {
    if (!this.throttle) {
      this._acc = 0;
      return true;
    }
    this._acc = (this._acc || 0) + dt;
    if (this._acc < 0.2) return false;
    this._acc = 0;
    return true;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    if (this.room !== 'security') {
      const room = this.rooms[this.room];
      if (!this._shouldRender(dt)) return;
      if (room.update) room.update(dt, t);
      this._updateMarker(t);
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
      return;
    }
    const tm = this.timers;
    for (const k of Object.keys(tm)) tm[k] += dt;

    if (tm.wall > 0.08) {
      tm.wall = 0;
      this._drawWall();
    }
    if (tm.feed > 0.3) {
      tm.feed = 0;
      this._drawFeed();
    }
    if (tm.radar > 0.06) {
      tm.radar = 0;
      this._drawRadar();
    }
    if (tm.main > 0.25) {
      tm.main = 0;
      this._drawMain();
    }
    if (tm.phone > 0.2) {
      tm.phone = 0;
      this._drawPhone();
    }
    if (tm.leds > 0.22) {
      tm.leds = 0;
      this._drawLeds();
    }

    if (this.state.alarm) {
      const k = Math.max(0, Math.sin(t * 5.5));
      this.alarmLight.intensity = k * k * 9;
      this.beaconMat.emissiveIntensity = 0.4 + k * 3;
    }

    if (this.state.phoneMode === 'ring') {
      const buzz = Math.sin(t * 9) > 0.2;
      this.phone.position.x = this.phoneBase.x + (buzz ? Math.sin(t * 90) * 0.0018 : 0);
      this.phone.rotation.y = -0.25 + (buzz ? Math.sin(t * 70) * 0.03 : 0);
    } else {
      this.phone.position.copy(this.phoneBase);
      this.phone.rotation.y = -0.25;
    }

    const rt = this.rainMat.map;
    rt.offset.y += dt * 0.9;
    rt.offset.x = Math.sin(t * 0.3) * 0.02;

    for (const sp of this.steam) {
      const ph = (sp.userData.phase + t * 0.22) % 1;
      sp.position.set(this.mugPos.x + Math.sin(ph * 6 + sp.userData.phase * 10) * 0.012, this.mugPos.y + ph * 0.22, this.mugPos.z);
      const sc = 0.04 + ph * 0.07;
      sp.scale.set(sc, sc, 1);
      sp.material.opacity = Math.sin(Math.PI * ph) * 0.16;
    }

    this._updateMarker(t);
    if (!this._shouldRender(dt)) return;
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  _updateMarker(t) {
    if (!this.marker.visible) return;
    const p = this.markers[this.state.markerTarget];
    if (!p) return;
    const big = p[3] || 1;
    this.marker.position.set(p[0], p[1] + Math.sin(t * 3.2) * 0.035 * big, p[2]);
    const sc = (0.15 + Math.sin(t * 6.4) * 0.012) * big;
    this.marker.scale.set(sc, sc, 1);
  }

  // ─────────────────────────── рисование экранов ───────────────────────────
  redrawStatic() {
    this._drawClock();
    this._drawWindow();
    this._drawBoard();
    this._drawMain();
    this._drawPhone();
    this._drawWall();
    this._drawFeed();
  }

  _cityXY(lon, lat) {
    return [40 + ((lon - 38.4) / (42.6 - 38.4)) * 560, 78 + ((49.3 - lat) / (49.3 - 46.2)) * 270];
  }

  _drawWall() {
    const { ctx, tex, w, h } = this.screens.wall;
    const t = this.time;
    const st = this.state;
    const alarm = st.alarm;
    ctx.fillStyle = '#020a07';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(60,255,160,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = C.mint;
    ctx.font = `800 22px ${SANS}`;
    ctx.fillText('ЦЕНТР ФИНАНСОВОЙ БЕЗОПАСНОСТИ', 26, 40);
    ctx.fillStyle = 'rgba(125,255,192,0.5)';
    ctx.font = `500 13px ${MONO}`;
    ctx.fillText('РОСТОВСКАЯ ОБЛАСТЬ · МОНИТОРИНГ 24/7', 26, 60);

    const blink = Math.sin(t * 6) > 0;
    const pillText = alarm ? 'УГРОЗА: ВЫСОКАЯ' : st.wallMode === 'clear' ? 'УГРОЗА УСТРАНЕНА' : st.wallMode === 'flow' ? 'ПОТОК ПЛАТЕЖЕЙ · ОНЛАЙН' : 'ОБСТАНОВКА: НОРМА';
    ctx.font = `800 16px ${SANS}`;
    const pw = ctx.measureText(pillText).width + 36;
    roundRect(ctx, w - pw - 24, 20, pw, 34, 17);
    ctx.fillStyle = alarm ? (blink ? '#ff2f45' : '#7a0d18') : '#0f5f3a';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(pillText, w - pw - 6, 43);

    // Сеть городов
    const pts = CITIES.map((c) => this._cityXY(c[1], c[2]));
    ctx.strokeStyle = 'rgba(61,220,132,0.18)';
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    if (Math.random() < (alarm ? 0.35 : 0.12)) {
      const to = Math.floor(Math.random() * pts.length);
      const from = alarm ? [-20 + Math.random() * 30, 80 + Math.random() * 280] : pts[Math.floor(Math.random() * pts.length)];
      this.pulses.push({ from, to: pts[to], t0: t, red: alarm });
    }
    this.pulses = this.pulses.filter((p) => t - p.t0 < 1.4);
    for (const p of this.pulses) {
      const k = Math.min(1, (t - p.t0) / 0.9);
      const x = p.from[0] + (p.to[0] - p.from[0]) * k;
      const y = p.from[1] + (p.to[1] - p.from[1]) * k;
      ctx.strokeStyle = p.red ? 'rgba(255,77,94,0.75)' : 'rgba(76,201,240,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.from[0], p.from[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (k >= 1) {
        const r = 4 + (t - p.t0 - 0.9) * 40;
        ctx.strokeStyle = p.red ? `rgba(255,77,94,${1 - (t - p.t0 - 0.9) * 2})` : `rgba(76,201,240,${1 - (t - p.t0 - 0.9) * 2})`;
        ctx.beginPath();
        ctx.arc(p.to[0], p.to[1], r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1;
    CITIES.forEach((c, i) => {
      const [x, y] = pts[i];
      ctx.fillStyle = c[3] ? '#ffffff' : C.green;
      ctx.beginPath();
      ctx.arc(x, y, c[3] ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c[3] ? '#ffffff' : 'rgba(217,245,232,0.7)';
      ctx.font = c[3] ? `700 14px ${SANS}` : `500 11px ${SANS}`;
      const dy = c[0] === 'Батайск' ? 16 : -8;
      ctx.fillText(c[0], x + 9, y + dy);
    });

    // Счётчики
    const px = 660;
    ctx.fillStyle = 'rgba(217,245,232,0.6)';
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText('ПОЛУЧИЛИ ФИШИНГ СЕГОДНЯ', px, 104);
    ctx.fillStyle = alarm ? C.red : C.mint;
    ctx.font = `800 54px ${SANS}`;
    ctx.fillText(fmt(st.threat), px, 158);
    ctx.fillStyle = 'rgba(217,245,232,0.6)';
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText('ОСТАНОВЛЕНО АТАК', px, 206);
    ctx.fillText('СПАСЕНО КЛИЕНТАМ', px + 190, 206);
    ctx.fillStyle = C.blue;
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText(String(st.stopped), px, 246);
    ctx.fillStyle = C.green;
    ctx.fillText(`${fmt(st.saved)} ₽`, px + 190, 246);

    // Бегущая строка
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = alarm ? '#ffb3bb' : C.mint;
    ctx.font = `600 16px ${MONO}`;
    const ticker = alarm
      ? '  ВНИМАНИЕ: массовая рассылка фальшивых СМС «Ваша карта заблокирована» · не переходите по ссылкам · банк не просит коды из СМС ·'
      : st.wallMode === 'flow'
        ? '  ▶ НАЖМИ НА ВИДЕОСТЕНУ — ОТКРЫТЬ ПОТОК ОПЕРАЦИЙ  ·  ⚠ ищи отклонения от привычек клиента  ·'
        : '  Безопасных счетов не существует · Сомневаешься — положи трубку и позвони в банк сам · Никому не сообщай коды из СМС ·';
    const tw = ctx.measureText(ticker).width;
    const off = (t * 70) % tw;
    ctx.fillText(ticker, -off, h - 16);
    ctx.fillText(ticker, -off + tw, h - 16);
    tex.needsUpdate = true;
  }

  _drawFeed() {
    const { ctx, tex, w, h } = this.screens.feed;
    if (this.feed.length === 0 || Math.random() < 0.9) {
      const r = Math.random();
      const stop = r < (this.state.alarm ? 0.12 : 0.04);
      const check = !stop && r < 0.16;
      const amount = Math.round(Math.pow(Math.random(), 3) * 90000 + 120);
      const d = new Date();
      const hh = this.state.clock;
      this.feed.push({
        text: `${hh}:${String(d.getSeconds()).padStart(2, '0')}  •• ${1000 + Math.floor(Math.random() * 8999)}  ${fmt(amount).padStart(7, ' ')} ₽`,
        st: stop ? 'СТОП' : check ? 'ПРОВЕРКА' : 'ОК',
        color: stop ? C.red : check ? C.amber : C.green,
      });
      if (this.feed.length > 12) this.feed.shift();
    }
    ctx.fillStyle = '#03100c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.mint;
    ctx.font = `700 18px ${MONO}`;
    ctx.fillText('ЛЕНТА ОПЕРАЦИЙ', 18, 32);
    ctx.fillStyle = Math.sin(this.time * 8) > 0 ? C.red : '#5a0b14';
    ctx.beginPath();
    ctx.arc(w - 66, 26, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.font = `700 14px ${MONO}`;
    ctx.fillText('LIVE', w - 54, 31);
    ctx.font = `500 15px ${MONO}`;
    this.feed.forEach((f, i) => {
      const y = 62 + i * 19;
      ctx.fillStyle = 'rgba(217,245,232,0.75)';
      ctx.fillText(f.text, 18, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.st, w - 110, y);
    });
    tex.needsUpdate = true;
  }

  _drawRadar() {
    const { ctx, tex, w, h } = this.screens.radar;
    const t = this.time;
    ctx.fillStyle = '#02100b';
    ctx.fillRect(0, 0, w, h);
    const cx = 160;
    const cy = 160;
    const R = 112;
    ctx.strokeStyle = 'rgba(61,220,132,0.35)';
    for (let r = R; r > 0; r -= 37) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();
    const a = t * 1.8;
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = `rgba(61,220,132,${0.35 * (1 - i / 24)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - i * 0.03) * R, cy + Math.sin(a - i * 0.03) * R);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    if (Math.random() < 0.08) {
      const ang = a - 0.05;
      const rr = 20 + Math.random() * (R - 25);
      this.blips.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, t0: t, red: Math.random() < (this.state.alarm ? 0.5 : 0.15) });
    }
    this.blips = this.blips.filter((b) => t - b.t0 < 3);
    for (const b of this.blips) {
      const k = 1 - (t - b.t0) / 3;
      ctx.fillStyle = b.red ? `rgba(255,77,94,${k})` : `rgba(125,255,192,${k})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.mint;
    ctx.font = `700 18px ${MONO}`;
    ctx.fillText('АНТИФРОД-РАДАР', 300, 40);
    ctx.font = `500 14px ${MONO}`;
    ctx.fillStyle = 'rgba(217,245,232,0.7)';
    ctx.fillText('модель риска v4.2', 300, 70);
    ctx.fillText(`проверок/с: ${1180 + Math.floor(Math.sin(t) * 90 + Math.random() * 40)}`, 300, 96);
    ctx.fillStyle = this.state.alarm ? C.red : C.green;
    ctx.fillText(this.state.alarm ? 'аномалий: МНОГО' : 'аномалий: мало', 300, 122);
    if (this.state.radarMode === 'rules') {
      const on = Math.sin(t * 6) > 0;
      ctx.fillStyle = on ? 'rgba(255,176,32,0.9)' : 'rgba(255,176,32,0.55)';
      roundRect(ctx, 290, 196, 200, 64, 12);
      ctx.fill();
      ctx.fillStyle = '#1f1300';
      ctx.font = `800 20px ${SANS}`;
      ctx.fillText('НАСТРОЙКА', 312, 224);
      ctx.fillText('ПРАВИЛ ▶', 312, 249);
    }
    tex.needsUpdate = true;
  }

  _drawMain() {
    const { ctx, tex, w, h } = this.screens.main;
    const mode = this.state.mainMode;
    const blink = Math.sin(this.time * 7) > 0;
    const red = mode === 'alert' || mode === 'case';
    ctx.fillStyle = red ? (blink ? '#2a0509' : '#160306') : '#04120d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = red ? 'rgba(255,77,94,0.18)' : 'rgba(61,220,132,0.12)';
    ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = red ? '#ffb3bb' : C.mint;
    ctx.font = `700 15px ${MONO}`;
    ctx.fillText('РУБЕЖ · АНТИФРОД-ТЕРМИНАЛ', 14, 23);
    ctx.textAlign = 'center';
    if (mode === 'alert') {
      warnIcon(ctx, w / 2, 96, 30, blink ? C.red : '#a3182a');
      ctx.fillStyle = '#fff';
      ctx.font = `800 30px ${SANS}`;
      ctx.fillText('47 ЖАЛОБ В ОЧЕРЕДИ', w / 2, 178);
      ctx.fillStyle = '#ffb3bb';
      ctx.font = `600 19px ${SANS}`;
      ctx.fillText('Нажми, чтобы открыть', w / 2, 220);
    } else if (mode === 'case') {
      warnIcon(ctx, w / 2, 92, 28, blink ? C.red : '#a3182a');
      ctx.fillStyle = '#fff';
      ctx.font = `800 28px ${SANS}`;
      ctx.fillText('РИСК 94% · ПЕРЕВОД 340 000 ₽', w / 2, 170);
      ctx.fillStyle = '#ffb3bb';
      ctx.font = `600 19px ${SANS}`;
      ctx.fillText('Операция приостановлена. Открой дело', w / 2, 212);
    } else if (mode === 'ok') {
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 30, 100);
      ctx.lineTo(w / 2 - 6, 124);
      ctx.lineTo(w / 2 + 34, 80);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fff';
      ctx.font = `800 28px ${SANS}`;
      ctx.fillText('УГРОЗА УСТРАНЕНА', w / 2, 180);
    } else if (mode === 'board') {
      ctx.fillStyle = '#fff';
      ctx.font = `800 26px ${SANS}`;
      ctx.fillText('ДЕЛО ПЕРЕДАНО НА ДОСКУ', w / 2, 140);
      ctx.fillStyle = C.mint;
      ctx.font = `600 19px ${SANS}`;
      ctx.fillText('Доска расследований — справа →', w / 2, 184);
    } else {
      ctx.fillStyle = C.mint;
      ctx.font = `800 40px ${SANS}`;
      ctx.fillText('РУБЕЖ', w / 2, 150);
      ctx.fillStyle = 'rgba(217,245,232,0.6)';
      ctx.font = `500 17px ${MONO}`;
      ctx.fillText(blink ? 'ожидание_' : 'ожидание', w / 2, 190);
    }
    ctx.textAlign = 'left';
    tex.needsUpdate = true;
  }

  _drawPhone() {
    const { ctx, tex, w, h } = this.screens.phone;
    const { phoneMode: mode, phoneText: text } = this.state;
    const t = this.time;
    ctx.fillStyle = mode === 'off' ? '#05070a' : '#0b1a24';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    if (mode === 'off') {
      ctx.fillStyle = 'rgba(217,245,232,0.35)';
      ctx.font = `700 34px ${SANS}`;
      ctx.fillText(this.state.clock, w / 2, 120);
    } else if (mode === 'ring' || mode === 'call') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#123a2c');
      g.addColorStop(1, '#071410');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = `700 20px ${SANS}`;
      ctx.fillText(text || 'Вызов', w / 2, 90);
      ctx.fillStyle = C.mint;
      ctx.font = `500 14px ${SANS}`;
      ctx.fillText(mode === 'ring' ? 'входящий вызов' : 'идёт разговор', w / 2, 116);
      const pulse = mode === 'ring' ? 1 + Math.sin(t * 8) * 0.15 : 1;
      ctx.fillStyle = C.green;
      ctx.beginPath();
      ctx.arc(w / 2 + (mode === 'ring' ? 36 : 0), 280, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();
      if (mode === 'ring') {
        ctx.fillStyle = C.red;
        ctx.beginPath();
        ctx.arc(w / 2 - 36, 280, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (mode === 'msg') {
      ctx.fillStyle = 'rgba(217,245,232,0.35)';
      ctx.font = `700 30px ${SANS}`;
      ctx.fillText(this.state.clock, w / 2, 70);
      roundRect(ctx, 10, 100, w - 20, 110, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();
      ctx.fillStyle = '#0b1a24';
      ctx.textAlign = 'left';
      ctx.font = `700 14px ${SANS}`;
      ctx.fillText('Новое сообщение', 22, 126);
      ctx.font = `500 13px ${SANS}`;
      wrapText(ctx, text || '', 22, 150, w - 44, 17);
    }
    ctx.textAlign = 'left';
    tex.needsUpdate = true;
  }

  _drawLeds() {
    const { ctx, tex, w, h } = this.screens.leds;
    ctx.fillStyle = '#07090c';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) {
      ctx.fillStyle = '#111419';
      ctx.fillRect(4, row * 16 + 2, w - 8, 13);
      for (let i = 0; i < 4; i++) {
        const on = Math.random() < 0.6;
        ctx.fillStyle = on ? (Math.random() < 0.15 ? C.amber : C.green) : '#0b2a1a';
        ctx.fillRect(8 + i * 7, row * 16 + 6, 4, 4);
      }
    }
    tex.needsUpdate = true;
  }

  _drawClock() {
    const { ctx, tex, w, h } = this.screens.clock;
    ctx.fillStyle = '#060303';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff5a5a';
    ctx.font = `700 60px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.state.clock, w / 2, 66);
    ctx.textAlign = 'left';
    tex.needsUpdate = true;
  }

  _drawKeyboard(c) {
    const { ctx, tex, w, h } = c;
    ctx.fillStyle = '#121418';
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 14; k++) {
        ctx.fillStyle = '#1d2128';
        ctx.fillRect(6 + k * 17.5, 6 + r * 18, 15, 15);
        ctx.fillStyle = 'rgba(61,220,132,0.35)';
        ctx.fillRect(6 + k * 17.5, 19 + r * 18, 15, 1.5);
      }
    }
    tex.needsUpdate = true;
  }

  _drawSticky(c, lines) {
    const { ctx, tex, w } = c;
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = '#4a3b00';
    ctx.font = `600 15px ${SANS}`;
    lines.forEach((l, i) => ctx.fillText(l, 10, 24 + i * 21));
    tex.needsUpdate = true;
  }

  _drawPoster(c) {
    const { ctx, tex, w, h } = c;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0f3b2a');
    g.addColorStop(1, '#06140f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.green;
    ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = '#fff';
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText('ЗВОНЯТ', 26, 72);
    ctx.fillText('«ИЗ БАНКА»?', 26, 112);
    ctx.fillStyle = C.mint;
    ctx.font = `600 20px ${SANS}`;
    const tips = ['1. Положи трубку.', '2. Не называй коды.', '3. Позвони сам — по номеру', '    на обороте карты.'];
    tips.forEach((tip, i) => ctx.fillText(tip, 26, 180 + i * 34));
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 16px ${SANS}`;
    wrapText(ctx, 'Безопасных счетов не существует. Ни банк, ни полиция не просят переводить деньги.', 26, 360, w - 52, 22);
    ctx.fillStyle = C.green;
    ctx.font = `800 18px ${SANS}`;
    ctx.fillText('ЦЕНТР ФИНАНСОВОЙ БЕЗОПАСНОСТИ', 26, h - 30);
    tex.needsUpdate = true;
  }

  _drawExit(c) {
    const { ctx, tex, w, h } = c;
    ctx.fillStyle = '#0a7a3c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eafff2';
    ctx.font = `800 54px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('ВЫХОД', w / 2, 68);
    ctx.textAlign = 'left';
    tex.needsUpdate = true;
  }

  _drawMarker(c) {
    const { ctx, tex } = c;
    const g = ctx.createRadialGradient(64, 56, 4, 64, 56, 60);
    g.addColorStop(0, 'rgba(61,220,132,0.55)');
    g.addColorStop(1, 'rgba(61,220,132,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#7dffc0';
    ctx.strokeStyle = '#06140f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(34, 34);
    ctx.lineTo(94, 34);
    ctx.lineTo(64, 84);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    tex.needsUpdate = true;
  }

  // ─────────────────────────── окно и рассвет ───────────────────────────
  _prepareCity() {
    const W = 1024;
    const H = 572;
    const mk = (lit) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      // Одинаковое зерно для обоих слоёв: число вызовов rand() не должно зависеть от lit,
      // иначе дома в слоях «с огнями» и «без» разъедутся.
      const rand = mulberry(7);
      // Дальние дома
      for (let x = -10; x < W; ) {
        const bw = 30 + rand() * 60;
        const bh = 90 + rand() * 170;
        ctx.fillStyle = '#0b1424';
        ctx.fillRect(x, H - 150 - bh, bw, bh + 150);
        for (let wy = H - 150 - bh + 8; wy < H - 160; wy += 11) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
            if (rand() < 0.22) {
              const [r1, r2, r3] = [rand(), rand(), rand()];
              ctx.fillStyle = lit ? `rgba(255,${200 + r1 * 40},${120 + r2 * 60},${0.5 + r3 * 0.5})` : 'rgba(40,50,70,0.6)';
              ctx.fillRect(wx, wy, 4, 5);
            }
          }
        }
        x += bw + 2 + rand() * 6;
      }
      // Река
      const rg = ctx.createLinearGradient(0, H - 150, 0, H);
      rg.addColorStop(0, '#0a1630');
      rg.addColorStop(1, '#050a16');
      ctx.fillStyle = rg;
      ctx.fillRect(0, H - 150, W, 150);
      for (let i = 0; i < 90; i++) {
        const [r1, r2, r3, r4, r5] = [rand(), rand(), rand(), rand(), rand()];
        if (!lit) continue;
        ctx.fillStyle = `rgba(255,${190 + r1 * 50},120,${0.15 + r2 * 0.3})`;
        ctx.fillRect(r3 * W, H - 140 + r4 * 120, 2 + r5 * 18, 1.5);
      }
      // Мост
      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, H - 168, W, 10);
      for (const px of [220, 640]) {
        ctx.fillRect(px - 5, H - 300, 10, 140);
        ctx.strokeStyle = '#0b1220';
        ctx.lineWidth = 2;
        for (let k = 1; k <= 7; k++) {
          ctx.beginPath();
          ctx.moveTo(px, H - 295 + k * 4);
          ctx.lineTo(px - k * 26, H - 166);
          ctx.moveTo(px, H - 295 + k * 4);
          ctx.lineTo(px + k * 26, H - 166);
          ctx.stroke();
        }
      }
      for (let x = 6; x < W; x += 22) {
        ctx.fillStyle = lit ? 'rgba(255,214,140,0.95)' : 'rgba(120,110,90,0.6)';
        ctx.beginPath();
        ctx.arc(x, H - 171, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (lit) {
        for (const px of [220, 640]) {
          ctx.fillStyle = '#ff3344';
          ctx.beginPath();
          ctx.arc(px, H - 302, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Ближние дома
      for (let x = -20; x < W; ) {
        const bw = 60 + rand() * 90;
        const bh = 60 + rand() * 90;
        if (rand() < 0.55) {
          ctx.fillStyle = '#04070d';
          ctx.fillRect(x, H - bh, bw, bh);
          for (let wy = H - bh + 10; wy < H - 6; wy += 16) {
            for (let wx = x + 8; wx < x + bw - 10; wx += 15) {
              if (rand() < 0.3) {
                const [r1, r2, r3] = [rand(), rand(), rand()];
                ctx.fillStyle = lit ? `rgba(255,${190 + r1 * 50},${110 + r2 * 60},${0.6 + r3 * 0.4})` : 'rgba(35,45,60,0.7)';
                ctx.fillRect(wx, wy, 7, 9);
              }
            }
          }
        }
        x += bw + rand() * 30;
      }
      return c;
    };
    this.cityLit = mk(true);
    this.cityDark = mk(false);
    const rnd = mulberry(3);
    this.stars = Array.from({ length: 90 }, () => [rnd() * W, rnd() * 250, rnd() * 1.4 + 0.3]);
  }

  _drawWindow() {
    const { ctx, tex, w, h } = this.screens.window;
    const k = this.sky;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, k.top);
    g.addColorStop(0.45, k.mid);
    g.addColorStop(0.75, k.low);
    g.addColorStop(1, k.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (k.stars > 0.01) {
      for (const [x, y, r] of this.stars) {
        ctx.fillStyle = `rgba(255,255,255,${k.stars * (0.4 + r * 0.3)})`;
        ctx.fillRect(x, y, r, r);
      }
    }
    if (k.moon > 0.01) {
      ctx.globalAlpha = k.moon;
      ctx.fillStyle = '#ebf0ff';
      ctx.beginPath();
      ctx.arc(820, 90, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = k.mid;
      ctx.beginPath();
      ctx.arc(832, 82, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (k.sun > 0.01) {
      const sg = ctx.createRadialGradient(k.sunX, k.sunY, 0, k.sunX, k.sunY, 230);
      sg.addColorStop(0, `rgba(255,244,210,${k.sun})`);
      sg.addColorStop(0.15, `rgba(255,200,130,${k.sun * 0.6})`);
      sg.addColorStop(1, 'rgba(255,170,100,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255,250,232,${k.sun})`;
      ctx.beginPath();
      ctx.arc(k.sunX, k.sunY, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(this.cityDark, 0, 0);
    ctx.globalAlpha = k.lit;
    ctx.drawImage(this.cityLit, 0, 0);
    ctx.globalAlpha = 1;
    if (k.hazeA > 0.01) {
      ctx.fillStyle = k.haze;
      ctx.globalAlpha = k.hazeA;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  }

  // ─────────────────────────── доска ───────────────────────────
  _prepareCork() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 610;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#a8743f';
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,50,20,0.35)' : 'rgba(220,170,110,0.3)';
      ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    this.cork = c;
  }

  _drawBoard() {
    const { ctx, tex, w, h } = this.screens.board;
    ctx.drawImage(this.cork, 0, 0);
    const b = this.state.board;
    const pin = (x, y, color = '#e63946') => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    };
    const card = (x, y, cw, ch, bg, title, sub, opts = {}) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(opts.rot || 0);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-cw / 2 + 5, -ch / 2 + 6, cw, ch);
      ctx.fillStyle = bg;
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
      ctx.fillStyle = opts.ink || '#1d1d1d';
      ctx.textAlign = 'center';
      ctx.font = `800 22px ${SANS}`;
      ctx.fillText(title, 0, -4);
      if (sub) {
        ctx.font = `500 15px ${SANS}`;
        ctx.fillStyle = opts.subInk || '#444';
        ctx.fillText(sub, 0, 22);
      }
      if (opts.stamp) {
        ctx.rotate(-0.2);
        ctx.strokeStyle = opts.stampColor || '#1e88e5';
        ctx.lineWidth = 4;
        ctx.font = `900 22px ${SANS}`;
        const sw = ctx.measureText(opts.stamp).width + 20;
        ctx.strokeRect(-sw / 2, -18, sw, 32);
        ctx.fillStyle = opts.stampColor || '#1e88e5';
        ctx.fillText(opts.stamp, 0, 6);
      }
      ctx.restore();
      pin(x, y - ch / 2 + 8);
    };

    if (!b) {
      card(200, 150, 260, 120, '#fff7d6', 'СХЕМЫ МОШЕННИКОВ', '«Безопасный счёт» · «Мама в беде»', { rot: -0.04 });
      card(520, 120, 220, 110, '#ffffff', 'ДРОПЫ', 'Как вычислить?', { rot: 0.05 });
      card(820, 170, 230, 120, '#d6ecff', 'ФИШИНГ', 'Подделки сайтов', { rot: -0.03 });
      card(330, 400, 240, 120, '#ffe0e0', 'КУРАТОР', 'Кто стоит за сетью?', { rot: 0.04 });
      card(720, 420, 250, 120, '#fff7d6', 'ДЕЛО №0412', 'Ждёт аналитика', { rot: -0.05 });
      ctx.strokeStyle = '#c1121f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(520, 75);
      ctx.quadraticCurveTo(430, 260, 330, 352);
      ctx.moveTo(520, 75);
      ctx.quadraticCurveTo(640, 250, 720, 368);
      ctx.stroke();
      tex.needsUpdate = true;
      return;
    }

    const pos = (n) => [(n.x / 100) * w, (n.y / 100) * h];
    ctx.lineWidth = 3.5;
    for (const l of b.links) {
      if (!l.visible) continue;
      const a = b.nodes[l.from];
      const c = b.nodes[l.to];
      if (!a?.visible || !c?.visible) continue;
      const [x1, y1] = pos(a);
      const [x2, y2] = pos(c);
      ctx.strokeStyle = b.frozen ? '#4cc9f0' : l.kind === 'cancelled' ? 'rgba(80,80,80,0.6)' : l.kind === 'control' ? '#ffb020' : '#c1121f';
      ctx.setLineDash(l.kind === 'cancelled' || l.kind === 'control' ? [10, 8] : []);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 30, x2, y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const bg = { victim: '#fff7d6', victims: '#fff7d6', drop: '#ffffff', transit: '#d6ecff', exchange: '#eadcff', boss: '#2b0b10' };
    for (const [id, n] of Object.entries(b.nodes)) {
      if (!n.visible) continue;
      const [x, y] = pos(n);
      card(x, y, 190, 92, bg[n.kind] || '#fff', n.title, n.sub, {
        rot: ((id.charCodeAt(0) % 5) - 2) * 0.015,
        ink: n.kind === 'boss' ? '#ff4d5e' : '#1d1d1d',
        subInk: n.kind === 'boss' ? '#ffb3bb' : '#444',
        stamp: n.frozen ? 'ЗАМОРОЖЕНО' : null,
      });
    }
    tex.needsUpdate = true;
  }
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
