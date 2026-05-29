import { Container, Graphics, Text } from 'pixi.js';
import { AGENT_BODY_H, agentScale, getDef } from '../world.js';
import { hexColor } from '../pixi/utils.js';
import { kenneyReady, kenneyTexture } from './atlas.js';
import { buildKenneyRig, applyKenneyWalkPose } from './rig.js';
import { pickKenneyOutfit, outfitKey } from './outfit.js';
import { getKenneyRigConfigVersion } from './rigConfig.js';
import { getAgentRenderStyleVersion } from '../agentStyle.js';
export { loadKenneyAssets } from './atlas.js';

const FALLBACK_H = 380;

export function createAgentSprite() {
  const root = new Container();
  const body = new Container();
  const fallback = new Graphics();
  fallback.visible = false;
  const label = new Text({
    text: '',
    style: {
      fontFamily: 'Courier New, monospace',
      fontSize: 7,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center',
    },
  });
  label.anchor.set(0.5, 1);
  label.visible = false;
  root.addChild(body, fallback, label);
  return { root, body, fallback, label, visualKey: '', charH: FALLBACK_H };
}

export function agentVisualKey(agent, frame, showName, movementPaused) {
  const def = getDef(agent);
  const outfit = pickKenneyOutfit(agent, def);
  return [
    'kenney',
    getAgentRenderStyleVersion(),
    agent.faceDir ?? 1,
    showName ? 1 : 0,
    outfitKey(outfit),
    getKenneyRigConfigVersion(),
    agent.id === 99 ? 1 : 0,
  ].join('|');
}

function drawFallback(gfx, color) {
  gfx.clear();
  gfx.circle(0, -14, 10).fill({ color: hexColor(color), alpha: 0.9 });
  gfx.roundRect(-8, -26, 16, 14, 3).fill({ color: hexColor(color), alpha: 0.75 });
  gfx.circle(0, -30, 7).fill({ color: 0xffd0b0, alpha: 0.95 });
}

export function drawAgentSprite(sprite, agent, frame, showName, movementPaused) {
  const def = getDef(agent);
  const sc = agentScale(agent);
  const talking = agent.talkTimer > 0;
  const watching = agent.watchTimer > 0;
  const moving = !movementPaused && !agent.isStatic && !talking && !watching
    && (agent.x - agent.tx) ** 2 + (agent.y - agent.ty) ** 2 > 0.01;
  const bob = moving ? Math.sin(frame * 0.12) * 0.9 : (talking ? Math.sin(frame * 0.08) * 0.25 : 0);

  const { root, body, fallback, label } = sprite;
  const key = agentVisualKey(agent, frame, showName, movementPaused);

  const needsBuild = sprite.visualKey !== key
    || (!sprite._usedKenney && kenneyReady());

  if (needsBuild) {
    sprite.visualKey = key;
    body.removeChildren();
    fallback.visible = false;

    const outfit = pickKenneyOutfit(agent, def);
    const hasParts = Object.values(outfit.parts).some((p) => kenneyTexture(p));

    if (kenneyReady() && hasParts) {
      sprite._usedKenney = true;
      const { container, height, pivots } = buildKenneyRig(outfit);
      body.addChild(container);
      sprite.charH = height;
      sprite._rigPivots = pivots;
      body.visible = true;
    } else {
      sprite._usedKenney = false;
      sprite._rigPivots = null;
      drawFallback(fallback, agent.color || def.color);
      fallback.visible = true;
      body.visible = false;
      sprite.charH = 32;
    }
  }

  if (sprite._rigPivots) {
    applyKenneyWalkPose(sprite._rigPivots, frame + (agent.id ?? 0) * 1.7, moving);
  }

  const faceDir = agent.faceDir ?? 1;
  const scale = Math.max(0.08, (AGENT_BODY_H * sc) / Math.max(sprite.charH || FALLBACK_H, 16));
  root.scale.set(scale);
  body.scale.set(faceDir, 1);
  fallback.scale.set(faceDir, 1);
  root.y = -bob;
  root.visible = true;

  if (agent.id === 99 && !sprite._badge) {
    const badge = new Graphics();
    badge.rect(-12, -sprite.charH + 8, 24, 5).fill({ color: 0xffe060, alpha: 0.92 });
    root.addChild(badge);
    sprite._badge = badge;
  }

  if (showName) {
    const name = agent.name || def.name;
    if (label.text !== name) label.text = name;
    const fill = hexColor(agent.color || def.color);
    if (label.style.fill !== fill) label.style.fill = fill;
    label.y = -sprite.charH - 6 / scale;
    label.scale.set(faceDir / scale, 1 / scale);
    label.visible = true;
  } else {
    label.visible = false;
  }
}
