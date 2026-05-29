import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { kenneyTexture, kenneyFrameSize } from './atlas.js';
import { getKenneyRigConfig } from './rigConfig.js';

const FALLBACK_H = {
  shoe: 42,
  leg: 166,
  waist: 47,
  shirt: 174,
  neck: 37,
  head: 168,
  arm: 142,
  hand: 71,
  face: 101,
  hairM: 130,
  hairF: 213,
};

function partH(key, fallback, scale = 1) {
  const h = kenneyFrameSize(key)?.height ?? fallback;
  return h * scale;
}

function partW(key, fallback = 96, scale = 1) {
  const w = kenneyFrameSize(key)?.width ?? fallback;
  return w * scale;
}

function stack(y, height, joint) {
  return y - height * (1 - joint);
}

function nudge(slot, x, y, nudges) {
  const n = nudges[slot] || { x: 0, y: 0 };
  return { x: x + n.x, y: y + n.y };
}

function addPart(parent, texKey, x, y, ax, ay, rot = 0, flipX = false) {
  const tex = kenneyTexture(texKey);
  if (!tex) return null;
  const s = new Sprite(tex);
  s.anchor.set(ax, ay);
  s.position.set(x, y);
  s.rotation = rot;
  if (flipX) s.scale.x = -1;
  parent.addChild(s);
  return s;
}

function makePivot(x, y, baseRotation = 0) {
  const p = new Container();
  p.position.set(x, y);
  p.baseRotation = baseRotation;
  p.rotation = baseRotation;
  return p;
}

/** Frame scale for walk cycle (~60 game ticks/s). Lower = slower stride. */
export const KENNEY_WALK_PHASE = 0.12;
/** Slower walk in RIG TUNE preview only. */
export const KENNEY_WALK_PHASE_PREVIEW = 0.035;

/** Swing legs/arms while walking (call every frame). */
export function applyKenneyWalkPose(pivots, frame, moving, phase = KENNEY_WALK_PHASE) {
  if (!pivots) return;

  const reset = () => {
    for (const p of Object.values(pivots)) {
      if (p) p.rotation = p.baseRotation ?? 0;
    }
  };

  if (!moving) {
    reset();
    return;
  }

  const t = frame * phase;
  const s = Math.sin(t);
  const legSwing = 0.48;
  const armSwing = 0.38;

  if (pivots.legL) pivots.legL.rotation = (pivots.legL.baseRotation ?? 0) - s * legSwing;
  if (pivots.legR) pivots.legR.rotation = (pivots.legR.baseRotation ?? 0) + s * legSwing;
  if (pivots.armL) pivots.armL.rotation = (pivots.armL.baseRotation ?? 0) - s * armSwing;
  if (pivots.armR) pivots.armR.rotation = (pivots.armR.baseRotation ?? 0) + s * armSwing;
}

/** Pivot markers (rotate with limb) + stack joints (purple, on root). */
const PIVOT_DEBUG = {
  legL: { color: 0xff6b6b, label: 'hip L', bone: [0, 72] },
  legR: { color: 0x4ecdc4, label: 'hip R', bone: [0, 72] },
  armL: { color: 0xffe66d, label: 'shoulder L', bone: [-58, 32] },
  armR: { color: 0x95e1d3, label: 'shoulder R', bone: [58, 32] },
};

const STACK_DEBUG_COLOR = 0xc77dff;

/**
 * Draw joint gizmos on a built rig (rig tuner). Pivot crosses sit at (0,0) on each
 * pivot container — that is the rotation origin; arms/legs are parented there.
 */
export function attachKenneyJointDebug(root, pivots, stackJoints = []) {
  if (!root) return null;

  detachKenneyJointDebug(root);

  const layer = new Container();
  layer.label = 'kenney-joint-debug';

  for (const [key, pivot] of Object.entries(pivots || {})) {
    if (!pivot) continue;
    const style = PIVOT_DEBUG[key] || { color: 0xffffff, label: key, bone: [0, 40] };
    const g = new Graphics();
    const r = 11;
    g.circle(0, 0, r);
    g.fill({ color: style.color, alpha: 0.28 });
    g.stroke({ width: 2.5, color: style.color, alpha: 1 });
    g.moveTo(-r - 2, 0);
    g.lineTo(r + 2, 0);
    g.moveTo(0, -r - 2);
    g.lineTo(0, r + 2);
    const [bx, by] = style.bone;
    g.moveTo(0, 0);
    g.lineTo(bx, by);
    g.stroke({ width: 2, color: style.color, alpha: 0.85 });
    g.label = 'kenney-joint-gizmo';
    pivot.addChild(g);

    const label = new Text({
      text: style.label,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
        fontWeight: '700',
        fill: style.color,
        stroke: { color: 0x0a1020, width: 3, join: 'round' },
      },
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -16);
    label.label = 'kenney-joint-gizmo';
    pivot.addChild(label);
  }

  if (pivots?.legL && pivots?.legR) {
    const hipLine = new Graphics();
    hipLine.moveTo(pivots.legL.x, pivots.legL.y);
    hipLine.lineTo(pivots.legR.x, pivots.legR.y);
    hipLine.stroke({ width: 1.5, color: 0xff6b6b, alpha: 0.45 });
    layer.addChild(hipLine);
  }
  if (pivots?.armL && pivots?.armR) {
    const shoulderLine = new Graphics();
    shoulderLine.moveTo(pivots.armL.x, pivots.armL.y);
    shoulderLine.lineTo(pivots.armR.x, pivots.armR.y);
    shoulderLine.stroke({ width: 1.5, color: 0xffe66d, alpha: 0.5 });
    layer.addChild(shoulderLine);
  }

  for (const pt of stackJoints) {
    const g = new Graphics();
    g.circle(pt.x, pt.y, 7);
    g.fill({ color: STACK_DEBUG_COLOR, alpha: 0.35 });
    g.stroke({ width: 2, color: STACK_DEBUG_COLOR, alpha: 0.9 });
    layer.addChild(g);

    const label = new Text({
      text: pt.label,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 10,
        fill: STACK_DEBUG_COLOR,
        stroke: { color: 0x0a1020, width: 2, join: 'round' },
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(pt.x + 10, pt.y);
    layer.addChild(label);
  }

  root.addChild(layer);
  root._kenneyJointDebugLayer = layer;
  return layer;
}

function removePivotJointGizmos(pivot) {
  if (!pivot?.children) return;
  for (let i = pivot.children.length - 1; i >= 0; i--) {
    const ch = pivot.children[i];
    if (ch.label === 'kenney-joint-gizmo') {
      pivot.removeChild(ch);
      ch.destroy();
    }
  }
}

export function detachKenneyJointDebug(root, pivots) {
  if (!root) return;
  const layer = root._kenneyJointDebugLayer;
  if (layer) {
    layer.destroy({ children: true });
    root._kenneyJointDebugLayer = null;
  }
  for (const pivot of Object.values(pivots || {})) {
    removePivotJointGizmos(pivot);
  }
}

export function buildKenneyRig(outfit) {
  const cfg = getKenneyRigConfig();
  const { joint, spread: S, attach: A, scale: SC, nudge: N } = cfg;
  const root = new Container();
  const p = outfit.parts;
  const fem = outfit.fem;
  const pivots = {};

  const shoeH = partH(p.shoeL, FALLBACK_H.shoe, SC.shoe);
  const legH = partH(p.leg, FALLBACK_H.leg, SC.leg);
  const waistH = partH(p.waist, FALLBACK_H.waist, SC.waist);
  const shirtH = partH(p.torso, FALLBACK_H.shirt, SC.shirt);
  const neckH = partH(p.neck, FALLBACK_H.neck, SC.neck);
  const headH = partH(p.head, FALLBACK_H.head, SC.head);
  const armH = partH(p.arm, FALLBACK_H.arm, SC.arm);
  const armW = partW(p.arm, 171, SC.arm);
  const hairScale = fem ? SC.hairF : SC.hairM;

  const yShoe = 0;
  const yLeg = stack(yShoe, shoeH, joint);
  const yWaist = stack(yLeg, legH, joint);
  const yShirt = stack(yWaist, waistH, joint);
  const yNeck = stack(yShirt, shirtH, joint);
  const yHead = stack(yNeck, neckH, joint);
  const yShoulder = yShirt - shirtH * A.shoulder;
  const yFace = yHead - headH * A.faceY;
  // Female styles vary in height (213–286px); attach to head, not per-sprite height.
  const hairFemHead = A.hairFemHead ?? A.hairFemHeadAttach ?? 0.12;
  const yHair = fem ? yHead - headH * hairFemHead : yHead - partH(p.hair, FALLBACK_H.hairM, hairScale);
  const hairAnchor = fem ? A.hairFemAnchor : 1;
  const handDrop = armH * A.handDrop;
  const handOut = armW * A.handOut;

  const hipShiftX = A.hipShiftX ?? 0;
  const hipShiftY = A.hipShiftY ?? 0;
  const yHipL = yLeg - legH;
  const yHipR = yLeg - legH;
  const hipL = nudge('legL', -S.legX + hipShiftX, yHipL + hipShiftY, N);
  const hipR = nudge('legR', S.legX + hipShiftX, yHipR + hipShiftY, N);

  pivots.legL = makePivot(hipL.x, hipL.y);
  root.addChild(pivots.legL);
  const legLFlipX = A.legLFlipX !== false;
  addPart(
    pivots.legL,
    p.leg,
    A.legLOffsetX ?? 0,
    A.legLOffsetY ?? 0,
    A.legLAnchorX ?? 0.5,
    A.legLAnchorY ?? 0,
    0,
    legLFlipX,
  );
  const shoeL = nudge('shoeL', -S.shoeX + hipShiftX, yShoe, N);
  addPart(pivots.legL, p.shoeL, shoeL.x - hipL.x, shoeL.y - hipL.y, 0.5, 1, 0, legLFlipX);

  pivots.legR = makePivot(hipR.x, hipR.y);
  root.addChild(pivots.legR);
  addPart(
    pivots.legR,
    p.leg,
    A.legROffsetX ?? 0,
    A.legROffsetY ?? 0,
    A.legRAnchorX ?? 0.5,
    A.legRAnchorY ?? 0,
  );
  const shoeR = nudge('shoeR', S.shoeX + hipShiftX, yShoe, N);
  addPart(pivots.legR, p.shoeR, shoeR.x - hipR.x, shoeR.y - hipR.y, 0.5, 1);

  const waistPos = nudge('waist', 0, yWaist, N);
  addPart(root, p.waist, waistPos.x, waistPos.y, 0.5, 1);

  const torsoPos = nudge('torso', 0, yShirt, N);
  addPart(root, p.torso, torsoPos.x, torsoPos.y, 0.5, 1);

  const armLPos = nudge('armL', -S.armX, yShoulder, N);
  pivots.armL = makePivot(armLPos.x, armLPos.y, S.armAngle);
  root.addChild(pivots.armL);
  addPart(
    pivots.armL,
    p.arm,
    A.armLOffsetX ?? 0,
    A.armLOffsetY ?? 0,
    A.armLAnchorX ?? 1,
    A.armLAnchorY ?? 0.12,
    0,
    true,
  );
  const handL = nudge('handL', -S.armX - handOut, yShoulder + handDrop, N);
  addPart(pivots.armL, p.hand, handL.x - armLPos.x, handL.y - armLPos.y, 0.5, 0.55);

  const armRPos = nudge('armR', S.armX, yShoulder, N);
  pivots.armR = makePivot(armRPos.x, armRPos.y, -S.armAngle);
  root.addChild(pivots.armR);
  addPart(
    pivots.armR,
    p.arm,
    A.armROffsetX ?? 0,
    A.armROffsetY ?? 0,
    A.armRAnchorX ?? 0,
    A.armRAnchorY ?? 0.12,
  );
  const handR = nudge('handR', S.armX + handOut, yShoulder + handDrop, N);
  addPart(pivots.armR, p.hand, handR.x - armRPos.x, handR.y - armRPos.y, 0.5, 0.55);

  const neckPos = nudge('neck', 0, yNeck, N);
  addPart(root, p.neck, neckPos.x, neckPos.y, 0.5, 1);

  const headPos = nudge('head', 0, yHead, N);
  addPart(root, p.head, headPos.x, headPos.y, 0.5, 1);

  const facePos = nudge('face', 0, yFace, N);
  addPart(root, p.face, facePos.x, facePos.y, 0.5, 0.5);

  const hairPos = nudge('hair', 0, yHair, N);
  addPart(root, p.hair, hairPos.x, hairPos.y, 0.5, hairAnchor);

  const stackJoints = [
    { label: 'shoe', x: 0, y: yShoe },
    { label: 'leg∩', x: 0, y: yLeg },
    { label: 'waist∩', x: waistPos.x, y: yWaist },
    { label: 'shirt∩', x: torsoPos.x, y: yShirt },
    { label: 'neck∩', x: neckPos.x, y: yNeck },
    { label: 'head∩', x: headPos.x, y: yHead },
    { label: 'shoulder', x: 0, y: yShoulder },
  ];

  const count = root.children.length;
  if (count > 0) {
    const b = root.getLocalBounds();
    const footX = b.x + b.width / 2;
    const footY = b.y + b.height;
    for (const ch of root.children) {
      ch.x -= footX;
      ch.y -= footY;
    }
    for (const pv of Object.values(pivots)) {
      if (pv) {
        pv.x -= footX;
        pv.y -= footY;
      }
    }
    for (const pt of stackJoints) {
      pt.x -= footX;
      pt.y -= footY;
    }
  }

  const height = count > 0
    ? Math.max(root.getLocalBounds().height, 200)
    : 200;

  return { container: root, height, pivots, stackJoints };
}
