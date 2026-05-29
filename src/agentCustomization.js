/** Agent appearance catalog — use `code` values in AGENTS_DEF and when editing art. */

export const CUSTOMIZATION_CATALOG = {
  hair: [
    { code: 'hair-m-crop', name: 'Short Crop', gender: 'm', desc: 'Tight sides, minimal top.' },
    { code: 'hair-m-part', name: 'Side Part', gender: 'm', desc: 'Fuller top with side part.' },
    { code: 'hair-m-volume', name: 'Neat Volume', gender: 'm', desc: 'Taller crown, business cut.' },
    { code: 'hair-f-long', name: 'Long Layers', gender: 'f', desc: 'Side locks and long top.' },
    { code: 'hair-f-bob', name: 'Bob', gender: 'f', desc: 'Chin-length bob.' },
    { code: 'hair-f-updo', name: 'Updo', gender: 'f', desc: 'Bun with short sides.' },
  ],
  eyes: [
    { code: 'eye-classic', name: 'Classic', gender: 'all', desc: 'Standard oval eyes with highlight.' },
    { code: 'eye-soft', name: 'Soft', gender: 'all', desc: 'Slightly larger, gentler gaze.' },
    { code: 'eye-alert', name: 'Alert', gender: 'all', desc: 'Raised brows, wider open eyes.' },
  ],
  mouth: [
    { code: 'mouth-smile', name: 'Smile', gender: 'all', desc: 'Default idle expression.' },
    { code: 'mouth-talk', name: 'Talking', gender: 'all', desc: 'Open smile arc while conversing.' },
    { code: 'mouth-watch', name: 'Attentive', gender: 'all', desc: 'Focused slight smile (keynote).' },
    { code: 'mouth-neutral', name: 'Neutral', gender: 'all', desc: 'Flat resting line.' },
  ],
  shirt: [
    { code: 'shirt-blazer', name: 'Blazer', gender: 'all', desc: 'Structured shoulders and collar.' },
    { code: 'shirt-polo', name: 'Polo', gender: 'all', desc: 'Soft collar, no shoulder pads.' },
    { code: 'shirt-casual', name: 'Casual Tee', gender: 'all', desc: 'Simple flat top.' },
  ],
  trousers: [
    { code: 'trouser-straight', name: 'Straight Leg', gender: 'm', desc: 'Classic separate trouser legs.' },
    { code: 'trouser-slim', name: 'Slim Fit', gender: 'm', desc: 'Narrower trouser legs.' },
    { code: 'trouser-skirt', name: 'Skirt', gender: 'f', desc: 'A-line skirt (women).' },
    { code: 'trouser-wide', name: 'Wide Leg', gender: 'f', desc: 'Wide pant legs (women).' },
  ],
};

const MEN_HAIR = ['hair-m-crop', 'hair-m-part', 'hair-m-volume'];
const WOMEN_HAIR = ['hair-f-long', 'hair-f-bob', 'hair-f-updo'];

const shade = (hex, amt) => {
  if (!hex || !hex.startsWith('#')) return hex || '#888';
  const n = parseInt(hex.replace('#', ''), 16);
  const c = v => Math.max(0, Math.min(255, v));
  return `rgb(${c((n >> 16) + amt)},${c(((n >> 8) & 255) + amt)},${c((n & 255) + amt)})`;
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const hairStyleFor = (def, id = 0) => {
  if (def.hairStyle != null) return def.hairStyle % 3;
  return ((id * 13) + (def.name?.charCodeAt(0) ?? 0) + (def.name?.charCodeAt(1) ?? 0)) % 3;
};

const pickDefaultHair = (def, id) => {
  const pool = def.feminine ? WOMEN_HAIR : MEN_HAIR;
  return pool[hairStyleFor(def, id)];
};

const isValidCode = (category, code) =>
  CUSTOMIZATION_CATALOG[category]?.some(o => o.code === code);

/** Resolve full appearance from agent def; explicit `*Code` fields override defaults. */
export const resolveAppearance = (def, id = 0) => {
  const fem = !!def.feminine;
  let hair = def.hairCode ?? pickDefaultHair(def, id);
  if (!isValidCode('hair', hair)) hair = pickDefaultHair(def, id);

  let eyes = def.eyesCode ?? 'eye-classic';
  if (!isValidCode('eyes', eyes)) eyes = 'eye-classic';

  let mouth = def.mouthCode ?? 'mouth-smile';
  if (!isValidCode('mouth', mouth)) mouth = 'mouth-smile';

  let shirt = def.shirtCode ?? 'shirt-blazer';
  if (!isValidCode('shirt', shirt)) shirt = 'shirt-blazer';

  let trousers = def.trousersCode ?? (fem ? 'trouser-skirt' : 'trouser-straight');
  if (!isValidCode('trousers', trousers)) {
    trousers = fem ? 'trouser-skirt' : 'trouser-straight';
  }
  if (fem && (trousers === 'trouser-straight' || trousers === 'trouser-slim')) {
    trousers = 'trouser-skirt';
  }
  if (!fem && (trousers === 'trouser-skirt' || trousers === 'trouser-wide')) {
    trousers = 'trouser-straight';
  }

  return {
    feminine: fem,
    skin: def.skin ?? '#F4C8A0',
    hairColor: def.hair ?? '#1A1018',
    shirtColor: def.color ?? '#60C0FF',
    trouserColor: def.pants ?? '#1A2438',
    hair,
    eyes,
    mouth,
    shirt,
    trousers,
  };
};

export const appearanceCodesList = appearance => [
  { key: 'hair', code: appearance.hair },
  { key: 'eyes', code: appearance.eyes },
  { key: 'mouth', code: appearance.mouth },
  { key: 'shirt', code: appearance.shirt },
  { key: 'trousers', code: appearance.trousers },
];

export const catalogEntry = (category, code) =>
  CUSTOMIZATION_CATALOG[category]?.find(o => o.code === code);

export const PREVIEW_APPEARANCE = {
  feminine: false,
  skin: '#F4C8A0',
  hairColor: '#2A1810',
  shirtColor: '#60C0FF',
  trouserColor: '#1A2838',
  hair: 'hair-m-crop',
  eyes: 'eye-classic',
  mouth: 'mouth-smile',
  shirt: 'shirt-blazer',
  trousers: 'trouser-straight',
};

// ─── Drawing (preview + world) ───────────────────────────────────────────────
const LH = 11;
const LW = 3.2;
const BDH = 12;
const BDW = 10;
const AH = 10;
const AW = 3.2;
const HR = 6;

const limb = (ctx, hx, hy, w, h, angle, color, round = 1.2) => {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, 0, w, h, round);
  ctx.fill();
  ctx.restore();
};

function drawHairByCode(ctx, x, hy, hr, color, code) {
  ctx.fillStyle = color;
  switch (code) {
    case 'hair-m-crop':
      ctx.beginPath();
      ctx.arc(x, hy - 0.3, hr + 0.05, Math.PI * 1.12, Math.PI * 1.88);
      ctx.lineTo(x, hy - 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - hr - 0.3, hy - 0.5, 1.4, hr * 0.45);
      ctx.fillRect(x + hr - 1.1, hy - 0.5, 1.4, hr * 0.45);
      break;
    case 'hair-m-part':
      ctx.beginPath();
      ctx.arc(x, hy - 0.5, hr + 0.35, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(x, hy - 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - hr * 0.15, hy - 0.8);
      ctx.lineTo(x - hr - 0.5, hy + 0.8);
      ctx.lineTo(x - hr + 0.2, hy + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + hr - 1, hy - 0.2, 1.2, hr * 0.5);
      break;
    case 'hair-m-volume':
      ctx.beginPath();
      ctx.arc(x, hy - 0.8, hr + 0.55, Math.PI * 1.02, Math.PI * 1.98);
      ctx.lineTo(x, hy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(color, -18);
      ctx.beginPath();
      ctx.arc(x, hy - 1.1, hr * 0.55, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hair-f-long':
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x - hr * 0.78, hy + 0.5, 2, hr * 0.72, -0.15, 0, Math.PI * 2);
      ctx.ellipse(x + hr * 0.78, hy + 0.5, 2, hr * 0.72, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, hy - 0.9, hr + 0.65, Math.PI * 1.04, Math.PI * 1.96);
      ctx.lineTo(x, hy - 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hair-f-bob':
      ctx.beginPath();
      ctx.ellipse(x - hr * 0.85, hy + 0.2, 2.2, hr * 0.5, -0.1, 0, Math.PI * 2);
      ctx.ellipse(x + hr * 0.85, hy + 0.2, 2.2, hr * 0.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, hy - 0.4, hr + 0.45, Math.PI * 1.08, Math.PI * 1.92);
      ctx.lineTo(x, hy - 1.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hair-f-updo':
    default:
      ctx.beginPath();
      ctx.ellipse(x - hr * 0.55, hy + 0.3, 1.5, hr * 0.38, 0, 0, Math.PI * 2);
      ctx.ellipse(x + hr * 0.55, hy + 0.3, 1.5, hr * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, hy - 1.8, hr * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(color, -22);
      ctx.beginPath();
      ctx.arc(x, hy - 1.85, hr * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, hy - 0.5, hr + 0.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.lineTo(x, hy - 1.3);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function drawEyesByCode(ctx, x, hy, code) {
  const browY = hy - (code === 'eye-alert' ? 2.2 : 1.75);
  const eyeY = hy + (code === 'eye-soft' ? 0.05 : 0.15);
  const rx = code === 'eye-soft' ? 1.45 : code === 'eye-alert' ? 1.4 : 1.3;
  const ry = code === 'eye-soft' ? 1.15 : 1;

  if (code === 'eye-alert') {
    ctx.strokeStyle = 'rgba(30,18,10,0.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 3.8, browY);
    ctx.lineTo(x - 1, browY - 0.35);
    ctx.moveTo(x + 3.8, browY);
    ctx.lineTo(x + 1, browY - 0.35);
    ctx.stroke();
  } else if (code !== 'eye-soft') {
    ctx.strokeStyle = 'rgba(30,18,10,0.48)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, browY);
    ctx.lineTo(x - 1.1, browY - 0.1);
    ctx.moveTo(x + 3.5, browY);
    ctx.lineTo(x + 1.1, browY - 0.1);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(35,22,14,0.88)';
  ctx.beginPath();
  ctx.ellipse(x - 2.2, eyeY, rx, ry, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 2.2, eyeY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.beginPath();
  ctx.arc(x - 1.55, eyeY - 0.12, 0.45, 0, Math.PI * 2);
  ctx.arc(x + 2.55, eyeY - 0.12, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouthByCode(ctx, x, hy, code) {
  const my = hy + 2.35;
  ctx.strokeStyle = 'rgba(42,26,16,0.55)';
  ctx.lineWidth = 0.65;
  ctx.lineCap = 'round';
  switch (code) {
    case 'mouth-talk':
      ctx.beginPath();
      ctx.arc(x, my, 1.05, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(42,26,16,0.35)';
      ctx.beginPath();
      ctx.moveTo(x - 0.55, my + 0.15);
      ctx.lineTo(x + 0.55, my + 0.15);
      ctx.stroke();
      break;
    case 'mouth-watch':
      ctx.beginPath();
      ctx.arc(x, my, 1.15, 0.12, Math.PI - 0.12);
      ctx.stroke();
      break;
    case 'mouth-neutral':
      ctx.beginPath();
      ctx.moveTo(x - 1.1, my + 0.2);
      ctx.lineTo(x + 1.1, my + 0.2);
      ctx.stroke();
      break;
    case 'mouth-smile':
    default:
      ctx.beginPath();
      ctx.arc(x, my, 1.2, 0.18, Math.PI - 0.18);
      ctx.stroke();
      break;
  }
}

function drawAgentFace(ctx, x, hy, appearance, mouthOverride) {
  const hr = HR;
  const mouthCode = mouthOverride ?? appearance.mouth;

  ctx.beginPath();
  ctx.arc(x, hy, hr, 0, Math.PI * 2);
  ctx.fillStyle = appearance.skin;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, hy, hr, 0, Math.PI * 2);
  ctx.clip();
  const cheek = ctx.createRadialGradient(x + hr * 0.35, hy + 0.5, 0, x + hr * 0.35, hy + 0.5, hr);
  cheek.addColorStop(0, 'rgba(180,90,70,0.18)');
  cheek.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cheek;
  ctx.fillRect(x - hr, hy - hr, hr * 2, hr * 2);
  ctx.restore();

  drawHairByCode(ctx, x, hy, hr, appearance.hairColor, appearance.hair);

  ctx.strokeStyle = 'rgba(40,25,18,0.32)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(x, hy + 0.15);
  ctx.lineTo(x, hy + 1.5);
  ctx.stroke();

  drawEyesByCode(ctx, x, hy, appearance.eyes);
  drawMouthByCode(ctx, x, hy, mouthCode);
}

function drawShoes(ctx, x, y, pantsColor) {
  ctx.fillStyle = shade(pantsColor, -55);
  ctx.beginPath();
  ctx.ellipse(x - 3.2, y - 0.5, 3.2, 1.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 3.2, y - 0.5, 3.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,18,28,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - 3.2, y, 3.5, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 3.2, y, 3.5, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTrousersByCode(ctx, code, bdw, bdh, lh, trouserColor, walk) {
  if (code === 'trouser-skirt') {
    const waist = -lh + 1.5;
    ctx.fillStyle = trouserColor;
    ctx.beginPath();
    ctx.moveTo(-bdw / 2 + 0.8, waist);
    ctx.quadraticCurveTo(0, waist + bdh * 0.35, bdw / 2 - 0.8, waist);
    ctx.lineTo(4.8, 0);
    ctx.quadraticCurveTo(0, 1.2, -4.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(trouserColor, -24);
    ctx.beginPath();
    ctx.moveTo(0.5, waist + 1);
    ctx.lineTo(4.8, 0);
    ctx.lineTo(4.2, -0.5);
    ctx.lineTo(0.5, waist + bdh - 2);
    ctx.closePath();
    ctx.fill();
    drawShoes(ctx, 0, 0, trouserColor);
    return;
  }

  if (code === 'trouser-wide') {
    limb(ctx, 3.2, -lh, LW + 0.8, lh, -walk * 0.45, shade(trouserColor, -20), 1.5);
    limb(ctx, -3.2, -lh, LW + 0.8, lh, walk * 0.45, trouserColor, 1.5);
    drawShoes(ctx, 0, 0, trouserColor);
    return;
  }

  const slim = code === 'trouser-slim';
  const legW = slim ? LW - 0.5 : LW;
  const legOff = slim ? 2.2 : 2.5;
  limb(ctx, legOff, -lh, legW, lh, -walk * 0.5 - 0.05, shade(trouserColor, -25), 1.5);
  limb(ctx, -legOff, -lh, legW, lh, walk * 0.5 + 0.05, trouserColor, 1.5);
  drawShoes(ctx, 0, 0, trouserColor);
}

function drawShirtByCode(ctx, code, bdw, bdh, torsoTop, shirtColor) {
  const shoulderY = torsoTop + 2.5;
  ctx.fillStyle = shirtColor;
  roundRect(ctx, -bdw / 2, torsoTop, bdw, bdh, code === 'shirt-casual' ? 1.5 : 2.2);
  ctx.fill();
  ctx.fillStyle = shade(shirtColor, -42);
  ctx.fillRect(bdw / 2 - 2.8, torsoTop, 2.8, bdh);

  if (code === 'shirt-blazer') {
    ctx.fillStyle = shade(shirtColor, 28);
    ctx.beginPath();
    ctx.moveTo(-bdw / 2, shoulderY);
    ctx.lineTo(-bdw / 2 - 1.2, shoulderY + 2.5);
    ctx.lineTo(-bdw / 2, shoulderY + 4);
    ctx.lineTo(bdw / 2, shoulderY + 4);
    ctx.lineTo(bdw / 2 + 1.2, shoulderY + 2.5);
    ctx.lineTo(bdw / 2, shoulderY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-1.8, torsoTop + 1.5, 3.6, 2.2);
  } else if (code === 'shirt-polo') {
    ctx.fillStyle = shade(shirtColor, 18);
    ctx.beginPath();
    ctx.arc(0, torsoTop + 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-1.2, torsoTop + 3.5, 2.4, 1.5);
  }
}

/**
 * Draw agent at foot position (world or preview canvas).
 * @param {object} anim - { talking, watching, moving, walk, bob, faceDir, meeting, isSpeaker }
 */
export function drawAgentFigure(
  ctx,
  footX,
  footY,
  appearance,
  anim = {},
  showName = false,
  label = '',
  labelColor = '#60C0FF',
  scale = 1,
) {
  const {
    talking = false,
    watching = false,
    moving = false,
    walk = 0,
    bob = 0,
    faceDir = 1,
    meeting = -1,
    isSpeaker = false,
  } = anim;

  const mouthOverride = talking ? 'mouth-talk' : watching ? 'mouth-watch' : null;
  const lh = LH * scale;
  const bdh = BDH * scale;
  const bdw = BDW * scale;
  const hr = HR * scale;
  const fem = appearance.feminine;

  ctx.save();
  ctx.translate(footX, footY + bob);
  ctx.scale(faceDir * scale, scale);

  ctx.beginPath();
  ctx.ellipse(0, 1.5, 9, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fill();

  const torsoTop = -lh - bdh;

  if (!fem && (appearance.trousers === 'trouser-straight' || appearance.trousers === 'trouser-slim')) {
    drawTrousersByCode(ctx, appearance.trousers, bdw, bdh, lh, appearance.trouserColor, walk);
  } else if (fem) {
    drawTrousersByCode(ctx, appearance.trousers, bdw, bdh, lh, appearance.trouserColor, walk);
  } else {
    drawTrousersByCode(ctx, 'trouser-straight', bdw, bdh, lh, appearance.trouserColor, walk);
  }

  limb(ctx, bdw / 2 - 0.3, torsoTop + 3, AW, AH, walk * 0.38 + (talking ? 0.15 : 0), shade(appearance.shirtColor, -35), 1.4);
  limb(ctx, -bdw / 2 + 0.3, torsoTop + 3, AW, AH, -walk * 0.38 - (talking ? 0.12 : 0), appearance.shirtColor, 1.4);

  drawShirtByCode(ctx, appearance.shirt, bdw, bdh, torsoTop, appearance.shirtColor);

  ctx.fillStyle = appearance.skin;
  roundRect(ctx, -2, torsoTop - 3.8, 4, 4.2, 1.2);
  ctx.fill();

  const hy = torsoTop - 3 - hr;
  drawAgentFace(ctx, 0, hy, appearance, mouthOverride);

  if (meeting >= 0) {
    ctx.beginPath();
    ctx.arc(0, hy + 2.8, 2, 0.12, Math.PI - 0.12);
    ctx.strokeStyle = 'rgba(15,8,5,0.7)';
    ctx.lineWidth = 0.85;
    ctx.stroke();
    for (let r = hr + 3; r <= hr + 9; r += 2.5) {
      ctx.beginPath();
      ctx.arc(0, hy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,210,50,${0.38 - r * 0.028})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }

  if (isSpeaker) {
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎤', 0, hy - hr - 6);
  }

  ctx.restore();

  if (showName && label) {
    const hyWorld = footY + bob + (torsoTop - 3 - hr) * scale;
    const nameY = hyWorld - hr * scale - 7 - (isSpeaker ? 12 * scale : 0);
    ctx.font = "7px 'Courier New',monospace";
    ctx.textAlign = 'center';
    const nw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(footX - nw / 2, nameY - 8, nw, 10);
    ctx.strokeStyle = `${labelColor}55`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(footX - nw / 2, nameY - 8, nw, 10);
    ctx.fillStyle = labelColor;
    ctx.fillText(label, footX, nameY - 1);
  }
}

/** Preview on a 2D canvas (customization panel). */
export function drawAppearancePreview(canvas, appearance, frame = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0E0E18';
  ctx.fillRect(0, 0, w, h);
  drawAgentFigure(
    ctx,
    w / 2,
    h - 14,
    appearance,
    { walk: Math.sin(frame * 0.12) * 0.4, bob: 0, faceDir: 1 },
    false,
    '',
    '',
    2.2,
  );
}

export const agentBodyHeight = scale => Math.round((LH + BDH + HR + 14) * scale);
