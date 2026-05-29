/** Shared Pixi helpers — color cache, viewport culling, dirty keys. */

const hexCache = new Map();
export const hexColor = (c) => {
  if (c == null || c === '') return 0x888888;
  if (typeof c === 'number') return c >>> 0;
  let v = hexCache.get(c);
  if (v !== undefined) return v;
  if (typeof c !== 'string' || !c.startsWith('#')) return 0x888888;
  const h = c.length === 4
    ? c.slice(1).split('').map(x => x + x).join('')
    : c.slice(1);
  v = parseInt(h, 16);
  hexCache.set(c, v);
  return v;
};

const rgbaCache = new Map();
export const rgbaColor = (str, fallback = 0xffffff) => {
  if (!str) return { color: fallback, alpha: 1 };
  let v = rgbaCache.get(str);
  if (v) return v;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { color: fallback, alpha: 1 };
  v = {
    color: (Number(m[1]) << 16) | (Number(m[2]) << 8) | Number(m[3]),
    alpha: m[4] != null ? Number(m[4]) : 1,
  };
  rgbaCache.set(str, v);
  return v;
};

/**
 * Visible region in world (iso pixel) coordinates.
 * Chain: screen = view.off + view.scale * (cam.pan + cam.zoom * world).
 */
export const worldBoundsVisible = (cam, view, margin = 80) => {
  const z = cam.zoom;
  const s = view.scale;
  const x0 = (-view.offX / s - cam.panX) / z - margin;
  const y0 = (-view.offY / s - cam.panY) / z - margin;
  const x1 = ((view.cw - view.offX) / s - cam.panX) / z + margin;
  const y1 = ((view.ch - view.offY) / s - cam.panY) / z + margin;
  return { x0, y0, x1, y1 };
};

export const pointInBounds = (x, y, b) => (
  x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
);

/** Reusable array for per-frame agent lists (caller clears). */
export const createAgentBuffer = () => {
  const buf = [];
  return (pool) => {
    buf.length = 0;
    buf.push(
      ...pool.regular,
      pool.speaker,
      ...pool.booth,
      ...(pool.podcast ?? []),
    );
    return buf;
  };
};
