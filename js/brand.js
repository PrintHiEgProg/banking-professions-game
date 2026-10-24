// Логотип банка-партнёра — два варианта, как в фирменном стиле:
//   brand/logo.png   — широкий баннер (знак + «Банк Центр-инвест»): большие места — стена холла, ролл-ап, стенд, карточка;
//   brand/emblem.png — только знак: маленькие места — табло, банкоматы, коврик у входа.
// Файлов нет (или вместо них прозрачные заглушки 1×1) — игра работает без логотипа.
export const BRAND = {
  name: 'Центр-инвест',
  logo: 'brand/logo.png',
  emblem: 'brand/emblem.png',
  careerUrl: 'https://www.centrinvest.ru/social-projects/career',
  // Плашка под логотипом в 3D: светлая, но ниже порога свечения (bloom).
  // Чисто белая плашка «светилась» и засвечивала зелёный логотип.
  plate: '#e8eee9',
};

const imgs = { logo: null, emblem: null };
const subs = new Set();
let started = false;

export const brandLogo = (kind = 'logo') => imgs[kind] || null;
export const hasBrand = () => !!(imgs.logo || imgs.emblem);

// Подписка на загрузку логотипов: вызывается сразу (если что-то уже есть) и после каждой загрузки
export function onBrand(fn) {
  subs.add(fn);
  if (hasBrand()) fn();
}

export function loadBrand() {
  if (started) return;
  started = true;
  for (const kind of ['logo', 'emblem']) {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => {
      // заглушку 1×1 не показываем — ждём настоящий файл
      if (i.naturalWidth < 8 || i.naturalHeight < 8) return;
      imgs[kind] = i;
      document.body.classList.add('has-brand', `has-${kind}`);
      for (const node of document.querySelectorAll(`img.brand-logo[data-kind="${kind}"]`)) node.src = i.src;
      for (const fn of subs) fn(kind);
    };
    i.src = BRAND[kind];
  }
}

// <img> для DOM-экранов: появится, только если логотип есть
export function brandImg(cls = '', kind = 'logo') {
  const node = document.createElement('img');
  node.className = `brand-logo ${cls}`.trim();
  node.dataset.kind = kind;
  node.alt = BRAND.name;
  if (imgs[kind]) node.src = imgs[kind].src;
  return node;
}

// Перекрашенная копия логотипа (например, белый знак на тёмном коврике)
const tinted = new Map();
function tintedImage(img, color) {
  const key = `${img.src}|${color}`;
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  tinted.set(key, c);
  return c;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Логотип на canvas: вписан в прямоугольник с сохранением пропорций.
// plate — светлая плашка под ним; tint — перекрасить (белый знак на тёмном фоне).
export function drawBrand(ctx, x, y, w, h, { kind = 'logo', plate = true, plateColor = BRAND.plate, pad = 0.14, radius = 0.16, tint = null, align = 'center' } = {}) {
  const img = imgs[kind];
  if (!img) return false;
  if (plate) {
    ctx.save();
    ctx.fillStyle = plateColor;
    roundedRect(ctx, x, y, w, h, Math.min(w, h) * radius);
    ctx.fill();
    ctx.restore();
  }
  const p = plate ? Math.min(w, h) * pad : 0;
  const bw = w - p * 2;
  const bh = h - p * 2;
  const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  const dx = align === 'left' ? x + p : x + p + (bw - dw) / 2;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tint ? tintedImage(img, tint) : img, dx, y + p + (bh - dh) / 2, dw, dh);
  ctx.restore();
  return { x: dx, y: y + p + (bh - dh) / 2, w: dw, h: dh };
}
