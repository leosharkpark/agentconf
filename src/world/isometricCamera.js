import * as THREE from 'three';
import { TW, TH } from './layout.js';
import { worldCornerPoints } from './coords.js';

/** Dimetric 2:1 — matches Canvas TW × TH tile proportions (not true 35.26° isometric). */
export const ISO_ELEVATION = Math.atan(TH / TW);
export const ISO_AZIMUTH = Math.PI / 4;
export const ISO_POLAR = Math.PI / 2 - ISO_ELEVATION;

const _vec = new THREE.Vector3();

export const isoCameraOffset = (distance = 70) => {
  const ce = Math.cos(ISO_ELEVATION);
  const se = Math.sin(ISO_ELEVATION);
  const sa = Math.sin(ISO_AZIMUTH);
  const ca = Math.cos(ISO_AZIMUTH);
  return new THREE.Vector3(
    distance * ce * sa,
    distance * se,
    distance * ce * ca,
  );
};

/** Uniform ortho zoom so the venue is not stretched on wide/narrow viewports. */
export const fitIsoOrthoZoom = (camera, viewportW, viewportH, focusZoom) => {
  const corners = worldCornerPoints();
  camera.updateMatrixWorld(true);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of corners) {
    _vec.set(p.x, p.y, p.z).applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, _vec.x);
    maxX = Math.max(maxX, _vec.x);
    minY = Math.min(minY, _vec.y);
    maxY = Math.max(maxY, _vec.y);
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const margin = 1.1;
  const base = Math.min(
    viewportW / (spanX * margin),
    viewportH / (spanY * margin),
  );
  return Math.max(base * (Math.max(focusZoom, 0.55) / 0.62), 2);
};
