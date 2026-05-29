import { Assets, Rectangle, Texture, TextureStyle } from 'pixi.js';

const LINEAR = new TextureStyle({ scaleMode: 'linear' });

export const KENNEY_BASE = '/assets/kenney_modular-characters/Spritesheet';

const SHEETS = [
  'sheet_skin',
  'sheet_shirts',
  'sheet_pants',
  'sheet_shoes',
  'sheet_hair',
  'sheet_face',
];

const frameCache = new Map();
const sizeCache = new Map();

function parseAtlasXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const frames = {};
  doc.querySelectorAll('SubTexture').forEach((node) => {
    frames[node.getAttribute('name')] = {
      x: Number(node.getAttribute('x')),
      y: Number(node.getAttribute('y')),
      width: Number(node.getAttribute('width')),
      height: Number(node.getAttribute('height')),
    };
  });
  return frames;
}

async function loadSheet(name) {
  const base = `${KENNEY_BASE}/${name}`;
  const [xmlText, baseTex] = await Promise.all([
    fetch(`${base}.xml`).then((r) => r.text()),
    Assets.load(`${base}.png`),
  ]);
  if (baseTex?.source) baseTex.source.style = LINEAR;
  const frames = parseAtlasXml(xmlText);
  const prefix = name.replace('sheet_', '');
  for (const [frameName, rect] of Object.entries(frames)) {
    const key = `${prefix}/${frameName}`;
    frameCache.set(key, new Texture({
      source: baseTex.source,
      frame: new Rectangle(rect.x, rect.y, rect.width, rect.height),
    }));
    sizeCache.set(key, { width: rect.width, height: rect.height });
  }
}

let loadPromise = null;

export function loadKenneyAssets() {
  if (!loadPromise) {
    loadPromise = Promise.all(SHEETS.map(loadSheet)).catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export function kenneyTexture(key) {
  return frameCache.get(key) ?? null;
}

/** Atlas frame size in pixels (from Kenney XML). */
export function kenneyFrameSize(key) {
  return sizeCache.get(key) ?? null;
}

export function kenneyReady() {
  return frameCache.size > 0;
}
