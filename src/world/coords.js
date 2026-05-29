import { TW, TH, GW, GH, STAGE_CX } from './layout.js';

/** World units per half tile width — matches Canvas TW/2 spacing. */
export const ISO_SCALE = 0.72 / (TW / 2);

const HALF_TW = (TW / 2) * ISO_SCALE;
const HALF_TH = (TH / 2) * ISO_SCALE;

const centerGx = STAGE_CX;
const centerGy = GH / 2;

/** Footprint of one floor cell in world X / Z (2:1 like Canvas diamonds). */
export const TILE_SIZE_X = TW * ISO_SCALE * 0.92;
export const TILE_SIZE_Z = TH * ISO_SCALE * 0.92;

/** Isometric grid → Three.js world (Y up). Same basis as Canvas `iso()`. */
export const gridToWorld = (gx, gy, y = 0) => ({
  x: (gx - gy) * HALF_TW - (centerGx - centerGy) * HALF_TW,
  y,
  z: (gx + gy) * HALF_TH - (centerGx + centerGy) * HALF_TH,
});

export const worldBounds = () => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let gx = 0; gx < GW; gx++) {
    for (let gy = 0; gy < GH; gy++) {
      const { x, z } = gridToWorld(gx, gy);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ, centerY: 0 };
};

/** Sample grid corners for camera fitting (in world space). */
export const worldCornerPoints = () => {
  const pts = [];
  for (let gx = 0; gx < GW; gx++) {
    for (let gy = 0; gy < GH; gy++) {
      if (gx === 0 || gx === GW - 1 || gy === 0 || gy === GH - 1) {
        const { x, z } = gridToWorld(gx, gy);
        pts.push({ x, y: 0, z });
      }
    }
  }
  return pts;
};

export const focusDistanceForZoom = zoom => 42 / Math.max(zoom, 0.4);
