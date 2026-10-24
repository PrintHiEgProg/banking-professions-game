// Управление от первого лица.
// Компьютер: клик по экрану захватывает мышь (pointer lock) — камера следует за мышью без зажатия,
// в центре прицел, E или клик — действие с тем, на что смотришь, Shift — бег, Esc — отпустить мышь.
// Если браузер не даёт захватить мышь (например, в iframe), работает запасной режим: зажать и вести.
// Телефон: палец — осмотреться, джойстик — ходить, тап — действие.
import * as THREE from 'three';

const BOUNDS = { minX: -3.65, maxX: 3.65, minZ: -2.7, maxZ: 2.65 };
// Препятствия в плане комнаты: [minX, maxX, minZ, maxZ]
const OBSTACLES = [
  [-1.4, 1.4, -2.8, -1.72],
  [-1.0, -0.25, -1.68, -0.95],
  [0.55, 2.25, 2.2, 3],
  [3.0, 4, 1.95, 3],
  [-3.9, -3.05, 2.05, 2.9],
  [-4, -3.3, -2.8, -2.05],
];
const RADIUS = 0.28;
const EYE = 1.62;
const REACH = 7.5; // дальше этого с предметом не взаимодействуешь — подойди ближе
const CENTER = new THREE.Vector2(0, 0);

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export class Controls {
  constructor(world, dom, { onHover, onClick, onMiss, onLock } = {}) {
    this.world = world;
    this.camera = world.camera;
    this.dom = dom;
    this.onHover = onHover;
    this.onClick = onClick;
    this.onMiss = onMiss;
    this.onLock = onLock;
    this.enabled = false;
    this.yaw = 0;
    this.pitch = -0.06;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.pointers = new Map();
    this.mouse = new THREE.Vector2();
    this.mouseClient = { x: 0, y: 0 };
    this.mouseActive = false;
    this.bob = 0;
    this.bobAmp = 0;
    this.tween = null;
    this.saved = null;
    this.hoverItem = null;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    // Захват мыши: только на компьютере и только если браузер умеет
    this.lockAvailable = !this.isTouch && typeof dom.requestPointerLock === 'function';
    this.locked = false;
    this.lockWanted = false;
    this.lockAsked = false;
    this.sprint = false;
    this.bounds = BOUNDS;
    this.obstacles = OBSTACLES;
    this._bind();
  }

  // Границы ходьбы и препятствия текущей комнаты
  setArea(bounds, obstacles) {
    this.bounds = bounds || BOUNDS;
    this.obstacles = obstacles || [];
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.joy.x = this.joy.y = 0;
      this.pointers.clear();
      this._setHover(null);
      // Открылось окно — отпускаем мышь, чтобы нажимать кнопки
      if (this.locked) this._release();
    } else if (this.lockWanted && !this.locked) this._lock(false);
    document.body.classList.toggle('explore', on);
  }

  _lock(fromGesture) {
    if (!this.lockAvailable || this.locked) return;
    this.lockAsked = fromGesture;
    try {
      const r = this.dom.requestPointerLock();
      if (r && r.catch) r.catch(() => this._lockFailed());
    } catch {
      this._lockFailed();
    }
  }

  _lockFailed() {
    // На прямой клик браузер отказал — значит, захват мыши тут запрещён: работаем по-старому
    if (this.lockAsked) {
      this.lockAvailable = false;
      this.lockWanted = false;
    }
    this.lockAsked = false;
    if (this.onLock) this.onLock(false);
  }

  _release() {
    this.releasing = true;
    try {
      document.exitPointerLock();
    } catch {
      // уже отпущена
    }
  }

  // Отпустить мышь насовсем (пауза, выход в меню)
  releaseMouse() {
    this.lockWanted = false;
    if (this.locked) this._release();
  }

  setPose(pos, yaw, pitch = -0.06) {
    this.camera.position.set(pos[0], pos[1] ?? EYE, pos[2]);
    this.yaw = yaw;
    this.pitch = pitch;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  _bind() {
    const d = this.dom;
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === d;
      document.body.classList.toggle('locked', this.locked);
      if (this.locked) {
        this.lockWanted = true;
        this.lockAsked = false;
      } else if (was && !this.releasing) {
        // Игрок сам отпустил мышь (Esc) — не захватываем обратно, пока не кликнет
        this.lockWanted = false;
      }
      this.releasing = false;
      if (!this.locked) this._setHover(null);
      if (this.onLock) this.onLock(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this._lockFailed());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled || this.tween) return;
      const sens = 0.0024;
      this.yaw -= (e.movementX || 0) * sens;
      this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch - (e.movementY || 0) * sens));
    });
    d.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.tween) return;
      if (e.pointerType === 'mouse' && this.lockAvailable) {
        if (!this.locked) {
          // Первый клик только захватывает мышь
          this._lock(true);
          e.preventDefault();
          return;
        }
        if (e.button !== 0) return;
        const item = this.hoverItem;
        if (item && this.onClick) this.onClick(item);
        else if (this.onMiss) this.onMiss(CENTER.clone(), this.world.pick(CENTER));
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, type: e.pointerType });
      try {
        d.setPointerCapture(e.pointerId);
      } catch {
        // указатель уже отпущен
      }
    });
    d.addEventListener('pointermove', (e) => {
      if (this.locked) return;
      if (e.pointerType === 'mouse') {
        this.mouseActive = true;
        this.mouseClient.x = e.clientX;
        this.mouseClient.y = e.clientY;
        this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      }
      const p = this.pointers.get(e.pointerId);
      if (!p || !this.enabled) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 7) p.moved = true;
      if (p.moved) {
        const sens = p.type === 'mouse' ? 0.0042 : 0.0065;
        this.yaw -= dx * sens;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dy * sens));
        this._setHover(null);
      }
    });
    const end = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (!p || !this.enabled || p.moved || e.type === 'pointercancel') return;
      const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      const item = this.world.pick(ndc);
      if (item && this.onClick) this.onClick(item);
      else if (!item && this.onMiss) this.onMiss(ndc);
    };
    d.addEventListener('pointerup', end);
    d.addEventListener('pointercancel', end);
    d.addEventListener('pointerleave', () => {
      this.mouseActive = false;
      if (!this.pointers.size) this._setHover(null);
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.code);
      if (!this.enabled || this.tween) return;
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        const item = this.hoverItem || this.world.pick(CENTER, REACH);
        if (item && this.onClick) {
          e.preventDefault();
          this.onClick(item);
        }
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const joy = document.getElementById('joystick');
    const knob = joy.querySelector('.knob');
    let joyId = null;
    const joyMove = (e) => {
      const r = joy.getBoundingClientRect();
      let x = e.clientX - (r.left + r.width / 2);
      let y = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 18;
      const len = Math.hypot(x, y);
      if (len > max) {
        x = (x / len) * max;
        y = (y / len) * max;
      }
      knob.style.transform = `translate(${x}px, ${y}px)`;
      this.joy.x = x / max;
      this.joy.y = y / max;
    };
    joy.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      joyId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      joyMove(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId === joyId) joyMove(e);
    });
    const joyEnd = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      knob.style.transform = '';
      this.joy.x = this.joy.y = 0;
    };
    joy.addEventListener('pointerup', joyEnd);
    joy.addEventListener('pointercancel', joyEnd);
  }

  _setHover(item) {
    const key = item ? `${item.id}${item.far ? ':far' : ''}` : null;
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    // Далёкий предмет подсвечиваем подписью, но действовать с ним нельзя
    this.hoverItem = item && !item.far ? item : null;
    this.world.setHover(item && !item.far ? item.id : null);
    const at = this.locked ? { x: window.innerWidth / 2, y: window.innerHeight / 2, center: true } : this.mouseClient;
    if (this.onHover) this.onHover(item, at);
  }

  _collides(x, z) {
    const B = this.bounds;
    if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) return true;
    for (const [a, b, c, d] of this.obstacles) {
      if (x > a - RADIUS && x < b + RADIUS && z > c - RADIUS && z < d + RADIUS) return true;
    }
    return false;
  }

  update(dt) {
    const cam = this.camera;
    if (this.tween) {
      // Время перелёта считаем по часам, а не по кадрам: на слабых устройствах анимация не растягивается.
      const tw = this.tween;
      tw.t = (performance.now() - tw.start) / 1000;
      const k = ease(Math.min(1, tw.t / tw.dur));
      cam.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.yaw = angleLerp(tw.fromYaw, tw.toYaw, k);
      this.pitch = tw.fromPitch + (tw.toPitch - tw.fromPitch) * k;
      cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      if (tw.t >= tw.dur) {
        this.tween = null;
        tw.resolve();
      }
      return;
    }
    if (!this.enabled) return;

    let f = 0;
    let s = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    f -= this.joy.y;
    s += this.joy.x;
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }
    const moving = len > 0.08;
    if (moving) {
      const run = k.has('ShiftLeft') || k.has('ShiftRight');
      const speed = run ? 4.2 : 2.3;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = (-sin * f + cos * s) * speed * dt;
      const dz = (-cos * f - sin * s) * speed * dt;
      const p = cam.position;
      if (!this._collides(p.x + dx, p.z)) p.x += dx;
      if (!this._collides(p.x, p.z + dz)) p.z += dz;
      this.bob += dt * (run ? 12 : 9) * Math.min(1, len);
    }
    this.bobAmp += ((moving ? 1 : 0) - this.bobAmp) * Math.min(1, dt * 8);
    cam.position.y = EYE + Math.sin(this.bob) * 0.022 * this.bobAmp;
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    if (this.locked) {
      const near = this.world.pick(CENTER, REACH);
      if (near) this._setHover(near);
      else {
        const far = this.world.pick(CENTER);
        this._setHover(far ? { ...far, far: true } : null);
      }
    } else if (this.mouseActive && !this.pointers.size) this._setHover(this.world.pick(this.mouse));
  }

  // Плавный перелёт камеры к объекту. Запоминает позу, чтобы вернуться.
  flyTo(pos, look, dur = 1.1) {
    if (!this.saved && !this.tween) {
      this.saved = { pos: this.camera.position.clone(), yaw: this.yaw, pitch: this.pitch };
    }
    const toPos = new THREE.Vector3(...pos);
    const dir = new THREE.Vector3(...look).sub(toPos).normalize();
    return this._tweenTo(toPos, Math.atan2(-dir.x, -dir.z), Math.asin(dir.y), dur);
  }

  // Повернуться к точке, не сходя с места.
  turnTo(look, dur = 0.8) {
    const pos = this.camera.position.clone();
    const dir = new THREE.Vector3(...look).sub(pos).normalize();
    return this._tweenTo(pos, Math.atan2(-dir.x, -dir.z), Math.asin(dir.y), dur);
  }

  returnFromFocus(dur = 0.9) {
    if (!this.saved) return Promise.resolve();
    const s = this.saved;
    this.saved = null;
    return this._tweenTo(s.pos, s.yaw, s.pitch, dur);
  }

  dropFocus() {
    this.saved = null;
  }

  _tweenTo(toPos, toYaw, toPitch, dur) {
    if (this.tween) this.tween.resolve();
    this._setHover(null);
    return new Promise((resolve) => {
      this.tween = {
        t: 0,
        start: performance.now(),
        dur,
        fromPos: this.camera.position.clone(),
        toPos: toPos.clone(),
        fromYaw: this.yaw,
        toYaw,
        fromPitch: this.pitch,
        toPitch,
        resolve,
      };
    });
  }
}
