// Логотип банка-партнёра. Официальный файл кладётся вместо заглушки brand/logo.png (см. brand/README.md) —
// и он сам появляется в игре: на титульном экране, в холле (карьерный стенд, ролл-ап, банкоматы),
// в профиле стажёра, в сертификате и на карточке результата. Нет файла — игра работает без логотипа.
export const BRAND = {
  name: 'Центр-инвест',
  logo: 'brand/logo.png',
  careerUrl: 'https://www.centrinvest.ru/social-projects/career',
};

let img = null;
let started = false;
const subs = new Set();

export const brandLogo = () => img;

// Подписка: вызовется сразу, если логотип уже загружен, или когда загрузится
export function onBrand(fn) {
  if (img) fn(img);
  else subs.add(fn);
}

export function loadBrand() {
  if (started) return;
  started = true;
  const i = new Image();
  i.decoding = 'async';
  i.onload = () => {
    // в архиве лежит прозрачная заглушка 1×1 — её не показываем, ждём настоящий логотип
    if (i.naturalWidth < 8 || i.naturalHeight < 8) return;
    img = i;
    document.body.classList.add('has-brand');
    for (const node of document.querySelectorAll('img.brand-logo')) node.src = i.src;
    for (const fn of subs) fn(i);
    subs.clear();
  };
  i.src = BRAND.logo;
}

// <img> для DOM-экранов: появится, только если логотип есть
export function brandImg(cls = '') {
  const node = document.createElement('img');
  node.className = `brand-logo ${cls}`.trim();
  node.alt = BRAND.name;
  if (img) node.src = img.src;
  return node;
}

// Логотип на canvas: белая плашка со скруглением, логотип вписан с сохранением пропорций
export function drawBrand(ctx, x, y, w, h, { plate = true, pad = 0.12, radius = 0.18 } = {}) {
  if (!img) return false;
  if (plate) {
    const r = Math.min(w, h) * radius;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const p = plate ? Math.min(w, h) * pad : 0;
  const bw = w - p * 2;
  const bh = h - p * 2;
  const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  ctx.drawImage(img, x + p + (bw - dw) / 2, y + p + (bh - dh) / 2, dw, dh);
  return true;
}
