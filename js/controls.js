// Управление от первого лица: мышь/палец — осмотреться, WASD/джойстик — ходить, клик/тап — действие.
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

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export class Controls {
  constructor(world, dom, { onHover, onClick, onMiss } = {}) {
    this.world = world;
    this.camera = world.camera;
    this.dom = dom;
    this.onHover = onHover;
    this.onClick = onClick;
    this.onMiss = onMiss;
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
    }
    document.body.classList.toggle('explore', on);
  }

  setPose(pos, yaw, pitch = -0.06) {
    this.camera.position.set(pos[0], pos[1] ?? EYE, pos[2]);
    this.yaw = yaw;
    this.pitch = pitch;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  _bind() {
    const d = this.dom;
    d.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.tween) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, type: e.pointerType });
      try {
        d.setPointerCapture(e.pointerId);
      } catch {
        // указатель уже отпущен
      }
    });
    d.addEventListener('pointermove', (e) => {
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
        const item = this.hoverItem || this.world.pick(new THREE.Vector2(0, 0));
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
    if ((item?.id || null) === (this.hoverItem?.id || null)) return;
    this.hoverItem = item;
    this.world.setHover(item ? item.id : null);
    if (this.onHover) this.onHover(item, this.mouseClient);
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
      const speed = 2.3;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = (-sin * f + cos * s) * speed * dt;
      const dz = (-cos * f - sin * s) * speed * dt;
      const p = cam.position;
      if (!this._collides(p.x + dx, p.z)) p.x += dx;
      if (!this._collides(p.x, p.z + dz)) p.z += dz;
      this.bob += dt * 9 * Math.min(1, len);
    }
    this.bobAmp += ((moving ? 1 : 0) - this.bobAmp) * Math.min(1, dt * 8);
    cam.position.y = EYE + Math.sin(this.bob) * 0.022 * this.bobAmp;
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    if (this.mouseActive && !this.pointers.size) this._setHover(this.world.pick(this.mouse));
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
