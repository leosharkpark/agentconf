import { RenderTexture, Sprite } from 'pixi.js';
import { buildKenneyRig } from './rig.js';

const bakeCache = new Map();
let renderer = null;

export function setKenneyRenderer(r) {
  renderer = r;
}

export function getBakedCharacter(outfit, key) {
  if (bakeCache.has(key)) return bakeCache.get(key);

  const { container, height } = buildKenneyRig(outfit);
  const b = container.getLocalBounds();
  const pad = 4;
  const w = Math.max(1, Math.ceil(b.width + pad * 2));
  const h = Math.max(1, Math.ceil(b.height + pad * 2));

  const rt = RenderTexture.create({ width: w, height: h });
  container.position.set(-b.x + pad, -b.y + pad);

  if (renderer) {
    renderer.render({ container, target: rt, clear: true });
  }

  const entry = { texture: rt, height: h - pad * 2 };
  bakeCache.set(key, entry);
  return entry;
}

export function createBakedSprite(outfit, key) {
  const { texture, height } = getBakedCharacter(outfit, key);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 1);
  return { sprite, height };
}
