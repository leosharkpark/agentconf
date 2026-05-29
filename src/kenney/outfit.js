/** Map agent defs → Kenney modular part filenames. */

const SHIRT_PALETTE = {
  blue: '#4080E0',
  green: '#40B060',
  grey: '#909090',
  navy: '#304070',
  pine: '#38A878',
  red: '#D04040',
  white: '#E8E8E8',
};

const PANTS_PALETTE = {
  Blue: '#4080C8',
  Brown: '#8A5830',
  Green: '#40A058',
  Grey: '#707880',
  LightBlue: '#68B8D8',
  Navy: '#304868',
  Pine: '#388868',
  Red: '#C04848',
  Tan: '#C8A878',
  White: '#E0E0E0',
};

const SHOE_BY_PANTS = {
  Blue: 'blue',
  Brown: 'brown',
  Green: 'brown',
  Grey: 'grey',
  LightBlue: 'blue',
  Navy: 'grey',
  Pine: 'brown',
  Red: 'red',
  Tan: 'tan',
  White: 'grey',
};

const hexRgb = (hex) => {
  const h = (hex || '#888').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const colorDist = (a, b) => {
  const ar = hexRgb(a);
  const br = hexRgb(b);
  return (ar.r - br.r) ** 2 + (ar.g - br.g) ** 2 + (ar.b - br.b) ** 2;
};

const nearestKey = (hex, palette) => {
  let best = Object.keys(palette)[0];
  let bestD = Infinity;
  for (const [k, v] of Object.entries(palette)) {
    const d = colorDist(hex, v);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
};

const skinTint = (hex) => {
  const { r, g, b } = hexRgb(hex);
  const lum = (r + g + b) / 3;
  if (lum > 210) return 1;
  if (lum > 190) return 2;
  if (lum > 170) return 3;
  if (lum > 150) return 4;
  if (lum > 130) return 5;
  if (lum > 110) return 6;
  if (lum > 90) return 7;
  return 8;
};

const hairTone = (hex) => {
  const { r, g, b } = hexRgb(hex);
  const lum = (r + g + b) / 3;
  if (lum < 55) return 'black';
  if (lum > 175 && r > g + 15) return 'blonde';
  if (lum > 130) return 'grey';
  if (r > g && g > b) return 'brown1';
  return 'brown2';
};

export function pickKenneyOutfit(agent, def) {
  const fem = !!(def.feminine || agent.feminine);
  const shirt = nearestKey(agent.color || def.color, SHIRT_PALETTE);
  const pants = nearestKey(def.pants || '#1A2438', PANTS_PALETTE);
  const tint = skinTint(def.skin || '#F4C8A0');
  const tone = hairTone(def.hair || '#1A1010');
  const style = (agent.id % 8) + 1;
  const hairStyle = fem ? ((style - 1) % 6) + 1 : style;
  const waistPiece = ((style - 1) % 4) + 1;
  const pantsVariant = (agent.id % 2) + 1;
  const gender = fem ? 'Woman' : 'Man';
  const shoe = SHOE_BY_PANTS[pants] || 'brown';
  const shoeN = ((agent.id * 3) % 5) + 1;
  const pantsLeg = pants === 'Blue'
    ? `pants/pantsBlue${pantsVariant}_long.png`
    : `pants/pants${pants}_long.png`;
  const pantsWaist = pants === 'Blue'
    ? `pants/pantsBlue${pantsVariant}${waistPiece}.png`
    : `pants/pants${pants}${waistPiece}.png`;

  return {
    fem,
    shirt,
    pants,
    tint,
    parts: {
      shoeL: `shoes/${shoe}Shoe${shoeN}.png`,
      shoeR: `shoes/${shoe}Shoe${(shoeN % 5) + 1}.png`,
      leg: pantsLeg,
      waist: pantsWaist,
      torso: `shirts/${shirt}Shirt${style}.png`,
      arm: `shirts/${shirt}Arm_long.png`,
      neck: `skin/tint${tint}_neck.png`,
      head: `skin/tint${tint}_head.png`,
      hand: `skin/tint${tint}_hand.png`,
      face: `face/face${(agent.id % 4) + 1}.png`,
      hair: `hair/${tone}${gender}${hairStyle}.png`,
    },
  };
}

export function outfitKey(outfit) {
  return Object.values(outfit.parts).join('|');
}
