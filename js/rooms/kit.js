// Набор строительных блоков для комнат: примитивы, вывески на canvas, люди, растения.
import * as THREE from 'three';

export const SANS = 'Manrope, "Segoe UI", Arial, sans-serif';
export const MONO = '"JetBrains Mono", Consolas, monospace';
const EYE_GEO = new THREE.SphereGeometry(0.024, 10, 8);

export function createKit(world, scene, interactables) {
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
  const glow = (hex, k = 1.4) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
  const put = (mesh, parent) => {
    (parent || scene).add(mesh);
    return mesh;
  };

  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return put(m, parent);
  }
  function plane(w, h, mat, x, y, z, ry = 0, parent) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    return put(m, parent);
  }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg = 24) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    return put(m, parent);
  }
  function sphere(r, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat);
    m.position.set(x, y, z);
    return put(m, parent);
  }
  function canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = world.maxAniso || 4;
    const api = {
      ctx,
      tex,
      w,
      h,
      redraw(fn = draw) {
        ctx.clearRect(0, 0, w, h);
        fn(ctx, w, h);
        tex.needsUpdate = true;
      },
    };
    api.redraw(draw);
    return api;
  }
  // Вывеска: плоскость с canvas-текстурой. lit — светится сама (экраны, таблички).
  function sign(w, h, cw, ch, draw, x, y, z, ry = 0, parent, lit = true) {
    const cv = canvas(cw, ch, draw);
    const mat = lit ? new THREE.MeshBasicMaterial({ map: cv.tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: cv.tex, roughness: 0.85 });
    const m = plane(w, h, mat, x, y, z, ry, parent);
    m.userData.canvas = cv;
    return m;
  }
  function noiseTex(size, base, variance, repeat, veins = 0) {
    const cv = canvas(size, size, (ctx) => {
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        const v = base + (Math.random() - 0.5) * variance;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      ctx.strokeStyle = 'rgba(120,120,130,0.18)';
      for (let k = 0; k < veins; k++) {
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        let px = Math.random() * size;
        let py = 0;
        ctx.moveTo(px, py);
        while (py < size) {
          px += (Math.random() - 0.5) * 30;
          py += 10 + Math.random() * 20;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    });
    cv.tex.wrapS = cv.tex.wrapT = THREE.RepeatWrapping;
    cv.tex.repeat.set(repeat[0], repeat[1]);
    return cv.tex;
  }
  // Пол, потолок и четыре стены прямоугольной комнаты
  function shell({ w, d, h, floor = 0xb8b8b8, wall = 0xe8e4dc, ceil = 0xf2f2f2, floorTex = null, wallTex = true }) {
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M(floor, { map: floorTex || noiseTex(128, 235, 30, [w / 2, d / 2]), roughness: 0.6 }));
    fl.rotation.x = -Math.PI / 2;
    put(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M(ceil, { roughness: 1 }));
    ce.rotation.x = Math.PI / 2;
    ce.position.y = h;
    put(ce);
    const wm = M(wall, { map: wallTex ? noiseTex(64, 240, 18, [4, 2]) : null, roughness: 0.95 });
    plane(w, h, wm, 0, h / 2, -d / 2);
    plane(w, h, wm, 0, h / 2, d / 2, Math.PI);
    plane(d, h, wm, -w / 2, h / 2, 0, Math.PI / 2);
    plane(d, h, wm, w / 2, h / 2, 0, -Math.PI / 2);
    const base = M(0x3a3f47);
    box(w, 0.1, 0.03, base, 0, 0.05, -d / 2 + 0.015);
    box(w, 0.1, 0.03, base, 0, 0.05, d / 2 - 0.015);
    box(0.03, 0.1, d, base, -w / 2 + 0.015, 0.05, 0);
    box(0.03, 0.1, d, base, w / 2 - 0.015, 0.05, 0);
    return { wallMat: wm };
  }
  // Посетитель: капсула-тело, голова, волосы. Сидящий — ниже и с согнутыми ногами.
  function person({ shirt = 0x4a6fa5, pants = 0x2b2f38, skin = 0xf0c4a0, hair = 0x3b2a20, sit = false, h = 1 } = {}, x, z, ry = 0, parent) {
    const g = new THREE.Group();
    const y0 = sit ? 0.45 : 0;
    if (sit) {
      box(0.34, 0.12, 0.42, M(pants), 0, 0.5, 0.16, g);
      box(0.3, 0.45, 0.12, M(pants), 0, 0.23, 0.34, g);
    } else {
      box(0.13, 0.8 * h, 0.14, M(pants), -0.09, 0.4 * h, 0, g);
      box(0.13, 0.8 * h, 0.14, M(pants), 0.09, 0.4 * h, 0, g);
    }
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42 * h, 4, 10), M(shirt));
    body.position.set(0, y0 + (sit ? 0.42 : 1.05 * h), 0);
    g.add(body);
    // Голова — отдельная группа: её можно повернуть к игроку. Глаза и рот показывают, куда смотрит человек.
    const head = new THREE.Group();
    head.position.set(0, y0 + (sit ? 0.86 : 1.52 * h), 0);
    head.rotation.order = 'YXZ';
    sphere(0.14, M(skin), 0, 0, 0, head);
    const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(hair));
    hairM.position.set(0, 0.02 * (sit ? 1 : h), -0.01);
    head.add(hairM);
    const eyes = [-0.05, 0.05].map((ex) => {
      const e = new THREE.Mesh(EYE_GEO, M(0x1b1b1f, { roughness: 0.3 }));
      e.position.set(ex, -0.012, 0.124);
      head.add(e);
      return e;
    });
    box(0.05, 0.012, 0.012, M(0x8a3b2e), 0, -0.068, 0.12, head);
    g.add(head);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    g.userData.baseY = 0;
    g.userData.phase = Math.random() * 6;
    g.userData.head = head;
    g.userData.eyes = eyes;
    return put(g, parent);
  }
  function plant(x, z, parent, s = 1) {
    const g = new THREE.Group();
    cyl(0.2 * s, 0.15 * s, 0.42 * s, M(0xb8643c), 0, 0.21 * s, 0, g);
    const leaf = M(0x2f7d4f);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const l = sphere(0.15 * s, leaf, Math.cos(a) * 0.16 * s, (0.7 + (i % 3) * 0.2) * s, Math.sin(a) * 0.16 * s, g);
      l.scale.set(1, 1.7, 0.5);
      l.rotation.set(Math.random(), a, Math.random() * 0.6);
    }
    g.position.set(x, 0, z);
    return put(g, parent);
  }
  function reg(id, object, label) {
    world.addInteractable(id, object, label, interactables);
  }
  return { M, glow, box, plane, cyl, sphere, canvas, sign, noiseTex, shell, person, plant, reg, put };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, { size = 32, weight = 800, color = '#fff', align = 'left', font = SANS } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Типовая комната-кабинет: объект, который ждёт World.setRoom
export function makeRoom(scene, extra) {
  return { scene, interactables: new Map(), markers: {}, focus: {}, bounds: null, obstacles: [], spawn: { pos: [0, 1.62, 0], yaw: 0 }, update: null, ...extra };
}
