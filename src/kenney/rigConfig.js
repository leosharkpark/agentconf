/** Live-tunable Kenney rig layout (KenneyTuningPanel). Heights come from atlas XML × scale. */

export const DEFAULT_KENNEY_RIG_CONFIG = {
  joint: 0,
  spread: {
    legX: 31,
    shoeX: 20,
    armX: -17,
    armAngle: -0.31,
  },
  attach: {
    shoulder: 1,
    faceY: 0.5,
    handDrop: 0.84,
    handOut: 0.67,
    /** Female hair attach on head (0 = crown); not per-hair sprite height. */
    hairFemHead: 0.13,
    hairFemAnchor: 0.11,
    armRAnchorX: 0,
    armRAnchorY: 0.12,
    armROffsetX: 0,
    armROffsetY: 0,
    armLAnchorX: 0,
    armLAnchorY: 0,
    armLOffsetX: 0,
    armLOffsetY: -12,
    hipShiftX: -89,
    hipShiftY: -59,
    /** Mirror left leg/shoe over Y (same pants PNG as right). */
    legLFlipX: true,
    legLAnchorX: 0.5,
    legLAnchorY: 0,
    legLOffsetX: 0,
    legLOffsetY: 0,
    legRAnchorX: 0.5,
    legRAnchorY: 0,
    legROffsetX: 0,
    legROffsetY: 0,
  },
  scale: {
    shoe: 1,
    leg: 1,
    waist: 1,
    shirt: 1,
    neck: 1,
    head: 1,
    arm: 1,
    hairM: 1,
    hairF: 1,
  },
  nudge: {
    shoeL: { x: -37, y: -72 },
    shoeR: { x: 58, y: -71 },
    legL: { x: 12, y: 0 },
    legR: { x: 12, y: 0 },
    waist: { x: 0, y: 55 },
    torso: { x: 0, y: 61 },
    armL: { x: -144, y: 6 },
    armR: { x: -14, y: 6 },
    handL: { x: -171, y: 0 },
    handR: { x: 28, y: 0 },
    neck: { x: 0, y: 90 },
    head: { x: 0, y: 105 },
    face: { x: 0, y: 114 },
    hair: { x: 0, y: 159 },
  },
};

let config = clone(DEFAULT_KENNEY_RIG_CONFIG);
let version = 1;

function clone(src) {
  return JSON.parse(JSON.stringify(src));
}

export function getKenneyRigConfig() {
  return config;
}

export function getKenneyRigConfigVersion() {
  return version;
}

export function setKenneyRigConfig(next) {
  config = clone({ ...DEFAULT_KENNEY_RIG_CONFIG, ...next });
  version += 1;
}

export function resetKenneyRigConfig() {
  config = clone(DEFAULT_KENNEY_RIG_CONFIG);
  version += 1;
}

export function exportKenneyRigConfigJson() {
  return JSON.stringify(config, null, 2);
}
