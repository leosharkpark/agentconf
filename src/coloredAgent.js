import { Container, Graphics, Text } from 'pixi.js';
import { AGENT_BODY_H, agentScale, getDef } from './world.js';
import { hexColor } from './pixi/utils.js';
import { getAgentRenderStyleVersion } from './agentStyle.js';

const CHAR_H = 42;

function shadeColor(hex, factor) {
  const c = hexColor(hex);
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const f = (ch) => Math.max(0, Math.min(255, Math.round(ch * factor)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

function drawFigure(gfx, color, frame, moving) {
  const main = hexColor(color);
  const dark = shadeColor(color, 0.72);
  const swing = moving ? Math.sin(frame * 0.12 + 0.4) * 4 : 0;

  gfx.clear();
  gfx.roundRect(-7 + swing * 0.3, -8, 6, 9, 2).fill({ color: dark, alpha: 0.9 });
  gfx.roundRect(1 - swing * 0.3, -8, 6, 9, 2).fill({ color: dark, alpha: 0.9 });
  gfx.roundRect(-11, -30, 22, 24, 5).fill({ color: main, alpha: 0.92 });
  gfx.circle(0, -36, 9).fill({ color: 0xffd0b0, alpha: 0.96 });
  gfx.circle(-3, -38, 1.2).fill({ color: 0x2a2030, alpha: 0.7 });
  gfx.circle(3, -38, 1.2).fill({ color: 0x2a2030, alpha: 0.7 });
}

export function createAgentSprite() {
  const root = new Container();
  const body = new Container();
  const figure = new Graphics();
  body.addChild(figure);
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
  return {
    root,
    body,
    fallback,
    label,
    figure,
    visualKey: '',
    charH: CHAR_H,
    _usedKenney: false,
    _rigPivots: null,
  };
}

export function agentVisualKey(agent, frame, showName, movementPaused) {
  const def = getDef(agent);
  return [
    'colored',
    getAgentRenderStyleVersion(),
    agent.faceDir ?? 1,
    agent.color || def.color,
    showName ? 1 : 0,
    movementPaused ? 1 : 0,
    agent.id === 99 ? 1 : 0,
  ].join('|');
}

export function drawAgentSprite(sprite, agent, frame, showName, movementPaused) {
  const def = getDef(agent);
  const sc = agentScale(agent);
  const color = agent.color || def.color;
  const talking = agent.talkTimer > 0;
  const watching = agent.watchTimer > 0;
  const moving = !movementPaused && !agent.isStatic && !talking && !watching
    && (agent.x - agent.tx) ** 2 + (agent.y - agent.ty) ** 2 > 0.01;
  const bob = moving ? Math.sin(frame * 0.12) * 0.9 : (talking ? Math.sin(frame * 0.08) * 0.25 : 0);

  const { root, body, figure, label } = sprite;
  const key = agentVisualKey(agent, frame, showName, movementPaused);

  if (sprite.visualKey !== key) {
    sprite.visualKey = key;
    sprite._usedKenney = false;
    sprite._rigPivots = null;
    body.visible = true;
    drawFigure(figure, color, frame, moving);
  } else if (moving || talking) {
    drawFigure(figure, color, frame, moving);
  }

  const scale = Math.max(0.08, (AGENT_BODY_H * sc) / CHAR_H);
  root.scale.set(scale);
  body.scale.set(1, 1);
  root.y = -bob;
  root.visible = true;

  if (agent.id === 99 && !sprite._badge) {
    const badge = new Graphics();
    badge.rect(-12, -CHAR_H + 8, 24, 5).fill({ color: 0xffe060, alpha: 0.92 });
    root.addChild(badge);
    sprite._badge = badge;
  }

  if (showName) {
    const name = agent.name || def.name;
    if (label.text !== name) label.text = name;
    const fill = hexColor(color);
    if (label.style.fill !== fill) label.style.fill = fill;
    label.y = -CHAR_H - 6 / scale;
    label.scale.set(1 / scale);
    label.visible = true;
  } else {
    label.visible = false;
  }
}
