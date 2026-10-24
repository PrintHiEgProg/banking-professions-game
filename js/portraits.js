// Векторные портреты персонажей с эмоциями. Никаких внешних картинок — всё рисуется SVG.

const SKIN = '#f2c6a0';
const SKIN_SHADE = '#dfa47f';
const INK = '#2a1d17';

const EMO = {
  neutral: { brows: 'M42 49 L55 48 M65 48 L78 49', mouth: 'M52 75 Q60 78 68 75', eyes: 'n' },
  happy: { brows: 'M42 48 Q48 45 55 48 M65 48 Q72 45 78 48', mouth: 'M50 73 Q60 83 70 73', eyes: 'n' },
  worried: { brows: 'M42 49 L55 45 M65 45 L78 49', mouth: 'M52 77 Q60 73 68 77', eyes: 'n' },
  scared: { brows: 'M42 47 L55 42 M65 42 L78 47', mouth: 'M53 77 Q60 71 67 77 Q60 80 53 77 Z', eyes: 'w' },
  panic: { brows: 'M41 46 L55 40 M65 40 L79 46', mouth: 'O', eyes: 'w', sweat: true },
  angry: { brows: 'M42 45 L55 50 M65 50 L78 45', mouth: 'M52 77 Q60 73 68 77', eyes: 'n' },
  surprised: { brows: 'M42 45 Q48 41 55 45 M65 45 Q72 41 78 45', mouth: 'o', eyes: 'w' },
  cry: { brows: 'M42 48 L55 44 M65 44 L78 48', mouth: 'M51 75 Q60 80 69 75', eyes: 'c', tears: true },
};

function face(emoName, { glasses = false, young = false, skin = SKIN, shade = SKIN_SHADE, old = false } = {}) {
  const e = EMO[emoName] || EMO.neutral;
  const parts = [];
  parts.push(`<rect x="52" y="80" width="16" height="14" fill="${shade}"/>`);
  parts.push(`<ellipse cx="34" cy="61" rx="4" ry="7" fill="${shade}"/><ellipse cx="86" cy="61" rx="4" ry="7" fill="${shade}"/>`);
  parts.push(`<ellipse cx="60" cy="59" rx="26" ry="30" fill="${skin}"/>`);
  if (old) parts.push(`<path d="M40 64 Q43 66 46 64 M74 64 Q77 66 80 64 M52 46 L68 46" stroke="${shade}" stroke-width="1.4" fill="none"/>`);
  parts.push(`<circle cx="44" cy="69" r="4.5" fill="#ff8a8a" opacity=".3"/><circle cx="76" cy="69" r="4.5" fill="#ff8a8a" opacity=".3"/>`);
  parts.push(`<path d="M60 60 Q56.5 67 60.5 68" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  for (const x of [49, 71]) {
    if (e.eyes === 'w') {
      parts.push(`<circle cx="${x}" cy="58" r="${young ? 5 : 4.4}" fill="#fff"/><circle cx="${x}" cy="58.5" r="2.3" fill="${INK}"/>`);
    } else if (e.eyes === 'c') {
      parts.push(`<path d="M${x - 4} 58 Q${x} 61.5 ${x + 4} 58" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
    } else {
      parts.push(`<circle cx="${x}" cy="58" r="${young ? 3.2 : 2.6}" fill="${INK}"/><circle cx="${x + 0.9}" cy="57" r=".9" fill="#fff"/>`);
    }
  }
  parts.push(`<path d="${e.brows}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  if (e.mouth === 'O') parts.push('<ellipse cx="60" cy="77" rx="5" ry="6.5" fill="#5a2424"/>');
  else if (e.mouth === 'o') parts.push('<ellipse cx="60" cy="76.5" rx="3.4" ry="4.2" fill="#5a2424"/>');
  else parts.push(`<path d="${e.mouth}" stroke="#7a2e2e" stroke-width="2.6" fill="${e.mouth.endsWith('Z') ? '#5a2424' : 'none'}" stroke-linecap="round"/>`);
  if (glasses) {
    parts.push('<g stroke="#6b4f3a" stroke-width="2" fill="rgba(255,255,255,.12)"><circle cx="49" cy="58" r="8.5"/><circle cx="71" cy="58" r="8.5"/><path d="M57.5 58 L62.5 58" fill="none"/></g>');
  }
  if (e.tears) {
    parts.push('<path d="M44 64 Q42 70 44.5 72 Q47 70 44 64 Z" fill="#7cc6ff"/><path d="M76 64 Q74 70 76.5 72 Q79 70 76 64 Z" fill="#7cc6ff"/>');
  }
  if (e.sweat) parts.push('<path d="M84 40 Q81 47 84 49 Q87 47 84 40 Z" fill="#9fdcff"/>');
  return parts.join('');
}

const CHARACTERS = {
  gran(emo) {
    return [
      '<rect width="120" height="120" fill="#24453a"/>',
      '<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="#7b3f5e"/>',
      '<path d="M50 92 L60 104 L70 92 Z" fill="#f4efe6"/>',
      '<circle cx="78" cy="104" r="3" fill="#e8c06a"/>',
      face(emo, { glasses: true }),
      '<path d="M33 60 Q31 27 60 26 Q89 27 87 60 Q85 41 60 39 Q35 41 33 60 Z" fill="#c9ccd3"/>',
      '<circle cx="60" cy="22" r="10" fill="#c9ccd3"/>',
      '<path d="M36 55 Q38 45 46 42" stroke="#aeb2bb" stroke-width="2" fill="none"/>',
    ].join('');
  },
  irina(emo) {
    return [
      '<rect width="120" height="120" fill="#1d3550"/>',
      '<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="#1f2a44"/>',
      '<path d="M52 91 L60 108 L68 91 Z" fill="#e9eef5"/>',
      face(emo),
      '<path d="M31 74 Q25 30 60 25 Q95 30 89 74 L84 74 Q87 46 66 40 Q50 50 36 48 Q34 60 36 74 Z" fill="#2b1d1a"/>',
      '<path d="M29 60 Q29 17 60 17 Q91 17 91 60" stroke="#15181d" stroke-width="4" fill="none"/>',
      '<rect x="25" y="54" width="9" height="15" rx="3" fill="#15181d"/>',
      '<path d="M30 68 Q34 82 50 80" stroke="#15181d" stroke-width="2.5" fill="none"/>',
      '<circle cx="51" cy="80" r="2.5" fill="#3ddc84"/>',
    ].join('');
  },
  // Галина Сергеевна — управляющая отделением, наставник стажёра
  mentor(emo) {
    return [
      '<rect width="120" height="120" fill="#1d3a2d"/>',
      '<path d="M26 84 Q20 28 60 23 Q100 28 94 84 Q88 88 83 82 L84 56 L36 56 L37 82 Q32 88 26 84 Z" fill="#6d4a33"/>',
      '<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="#1f5a3d"/>',
      '<path d="M50 91 L60 105 L70 91 Z" fill="#f4f1ea"/>',
      '<path d="M45 92 L57 112 M75 92 L63 112" stroke="#164530" stroke-width="3" fill="none"/>',
      '<rect x="72" y="101" width="13" height="7" rx="2" fill="#3ddc84"/>',
      face(emo, { glasses: true }),
      '<path d="M33 58 Q31 27 60 26 Q89 27 87 58 Q83 42 66 39 Q52 47 37 45 Q34 51 33 58 Z" fill="#6d4a33"/>',
      '<path d="M58 28 Q50 33 44 44" stroke="#c4bcb1" stroke-width="3" fill="none" stroke-linecap="round"/>',
      '<circle cx="36" cy="72" r="2.4" fill="#e8c06a"/><circle cx="84" cy="72" r="2.4" fill="#e8c06a"/>',
    ].join('');
  },
  masha(emo) {
    return [
      '<rect width="120" height="120" fill="#24452c"/>',
      '<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="#2f8f5b"/>',
      '<path d="M46 92 Q60 100 74 92" stroke="#1f6b42" stroke-width="3" fill="none"/>',
      '<path d="M86 40 Q104 52 96 88 Q92 70 84 60 Z" fill="#6b3e26"/>',
      face(emo, { young: true }),
      '<path d="M32 62 Q28 26 60 25 Q92 26 88 62 Q86 44 72 38 Q58 46 38 44 Q34 52 32 62 Z" fill="#6b3e26"/>',
      '<circle cx="86" cy="40" r="4" fill="#ff7aa8"/>',
    ].join('');
  },
  dima(emo) {
    return [
      '<rect width="120" height="120" fill="#33343f"/>',
      '<path d="M26 86 Q24 30 60 28 Q96 30 94 86 Z" fill="#3c414a"/>',
      '<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="#4a4f57"/>',
      face(emo, { young: true }),
      '<path d="M34 54 Q34 30 60 30 Q86 30 86 54 Q80 40 60 40 Q40 40 34 54 Z" fill="#3b2a20"/>',
    ].join('');
  },
  scammer() {
    return [
      '<rect width="120" height="120" fill="#3a0d12"/>',
      '<path d="M18 120 Q20 90 60 88 Q100 90 102 120 Z" fill="#0b0e13"/>',
      '<ellipse cx="60" cy="56" rx="26" ry="30" fill="#11151c"/>',
      '<text x="60" y="68" text-anchor="middle" font-size="34" font-family="Manrope, sans-serif" font-weight="800" fill="#ff4d5e">?</text>',
    ].join('');
  },
};

// Генератор клиентов: внешность задаётся данными — так в игре десятки разных людей без картинок.
const SKINS = [['#f2c6a0', '#dfa47f'], ['#e8b48a', '#cf9268'], ['#c98d62', '#a96f48'], ['#f6d5bb', '#e3b394']];
const HAIR = {
  short: (c) => `<path d="M34 54 Q34 29 60 29 Q86 29 86 54 Q80 39 60 39 Q40 39 34 54 Z" fill="${c}"/>`,
  side: (c) => `<path d="M33 58 Q31 28 60 28 Q89 28 87 58 Q84 40 66 38 Q60 46 40 44 Q35 50 33 58 Z" fill="${c}"/>`,
  long: (c) => `<path d="M32 62 Q29 27 60 26 Q91 27 88 62 Q85 42 60 40 Q35 42 32 62 Z" fill="${c}"/>`,
  bun: (c) => `<path d="M33 60 Q31 27 60 26 Q89 27 87 60 Q85 41 60 39 Q35 41 33 60 Z" fill="${c}"/><circle cx="60" cy="22" r="10" fill="${c}"/>`,
  bald: (c) => `<path d="M34 64 Q33 50 38 44 M86 64 Q87 50 82 44" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  curly: (c) => [32, 41, 50, 60, 70, 79, 88].map((x, i) => `<circle cx="${x}" cy="${29 + Math.abs(i - 3) * 2.5 - (i % 2) * 3}" r="9" fill="${c}"/>`).join(''),
  cap: (c) => `<path d="M33 50 Q34 26 60 26 Q86 26 87 50 Z" fill="${c}"/><path d="M60 48 L98 50 Q96 56 60 54 Z" fill="${c}"/>`,
};
const BACK = {
  long: (c) => `<path d="M28 96 Q20 32 60 27 Q100 32 92 96 Z" fill="${c}"/>`,
  pony: (c) => `<path d="M86 40 Q104 52 96 88 Q92 70 84 60 Z" fill="${c}"/>`,
};

export function person(look = {}, emo = 'neutral') {
  const [skin, shade] = SKINS[look.skin || 0];
  const hair = look.hair || '#3b2a20';
  const style = look.style || 'short';
  const parts = [`<rect width="120" height="120" fill="${look.bg || '#23303d'}"/>`];
  if (BACK[look.back]) parts.push(BACK[look.back](hair));
  parts.push(`<path d="M18 120 Q20 92 60 90 Q100 92 102 120 Z" fill="${look.shirt || '#4a6fa5'}"/>`);
  if (look.tie) parts.push(`<path d="M56 92 L64 92 L62 110 L60 114 L58 110 Z" fill="${look.tie}"/><path d="M50 91 L60 100 L70 91" stroke="#f4f4f4" stroke-width="3" fill="none"/>`);
  if (look.scarf) parts.push(`<path d="M42 90 Q60 100 78 90 L76 98 Q60 106 44 98 Z" fill="${look.scarf}"/>`);
  parts.push(face(emo, { glasses: look.glasses, young: look.young, skin, shade, old: look.old }));
  if (look.beard) parts.push(`<path d="M35 64 Q37 93 60 93 Q83 93 85 64 Q80 80 60 81 Q40 80 35 64 Z" fill="${hair}"/>`);
  if (look.mustache || look.beard) parts.push(`<path d="M50 71 Q60 66 70 71 Q60 74.5 50 71 Z" fill="${hair}"/>`);
  parts.push((HAIR[style] || HAIR.short)(hair));
  if (look.earrings) parts.push('<circle cx="34" cy="70" r="2.5" fill="#ffd166"/><circle cx="86" cy="70" r="2.5" fill="#ffd166"/>');
  if (look.bow) parts.push(`<path d="M74 30 L84 24 L84 36 Z M74 30 L64 24 L64 36 Z" fill="${look.bow}"/>`);
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${parts.join('')}</svg>`;
}

// Внешность стажёра на выбор: форма банка — зелёная
export const AVATARS = [
  { style: 'short', hair: '#3b2a20', young: true, shirt: '#1f7a4d', bg: '#173326' },
  { style: 'long', back: 'pony', hair: '#6b3e26', young: true, shirt: '#1f7a4d', bg: '#173326', earrings: true },
  { style: 'curly', hair: '#1d1d1d', young: true, shirt: '#1f7a4d', bg: '#173326', skin: 2 },
  { style: 'bun', hair: '#d9a066', young: true, shirt: '#1f7a4d', bg: '#173326', skin: 3 },
  { style: 'cap', hair: '#2a1d17', young: true, shirt: '#1f7a4d', bg: '#173326', skin: 1 },
  { style: 'side', hair: '#c0392b', young: true, glasses: true, shirt: '#1f7a4d', bg: '#173326' },
];
export const avatarSvg = (i = 0, emo = 'happy') => person(AVATARS[i] || AVATARS[0], emo);

export function portrait(who, emo = 'neutral') {
  const draw = CHARACTERS[who];
  if (!draw) return '';
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${draw(emo)}</svg>`;
}

export const NAMES = {
  gran: 'Валентина Петровна',
  irina: 'Ирина Викторовна',
  mentor: 'Галина Сергеевна',
  masha: 'Маша',
  dima: 'Дима',
  scammer: '«Майор Соколов»',
};
