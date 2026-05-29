import {
  Application, Assets, Container, Graphics, Sprite, Text, TextureStyle,
} from 'pixi.js';
import { createAgentSprite, drawAgentSprite, loadKenneyAssets } from './simpleAgent.js';
import { getAgentRenderStyleVersion, isKenneyRenderStyle } from './agentStyle.js';
import { hexColor, rgbaColor, worldBoundsVisible, pointInBounds } from './pixi/utils.js';
import {
  TW, TH, BH, SBH, GW, GH, WORLD_W, WORLD_H, PODCAST_PBH,
  STAGE_X1, STAGE_X2, STAGE_Y1, STAGE_Y2, STAGE_CX,
  DOOR_GX_L, DOOR_GX_R, DOOR_WALL_GY, DOOR_BLOCK_H, MAIN_DOOR_GX,
  PODCAST_STUDIOS, ROOM_LABELS, CARDINAL_MARKERS, MAP_MID_GY,
  PRESENTATION_LINES, AGENT_BODY_H,
  iso, shade, roomDrawColors, roomAt, podcastStudioAt, isPodcastPlatform, isStageTile,
  feetPos, feetBase,
} from './world.js';

const FONT = 'Courier New, monospace';
const LOD_DETAIL_ZOOM = 1.6;
const LOD_MINIMAL_ZOOM = 0.95;

const BUBBLE_W = 104;
const BUBBLE_H = 34;

/** Curved link with soft glow and midpoint pulse between conversing agents. */
function drawConversationLink(g, pa, pb, color, frame) {
  const ay = pa.y - AGENT_BODY_H + 4;
  const by = pb.y - AGENT_BODY_H + 4;
  const mx = (pa.x + pb.x) / 2;
  const my = Math.min(ay, by) - 14;
  const pulse = 0.45 + Math.sin(frame * 0.1) * 0.35;
  const midY = (ay + by) / 2 + (my - (ay + by) / 2) * 0.55;

  g.moveTo(pa.x, ay);
  g.quadraticCurveTo(mx, my, pb.x, by);
  g.stroke({ width: 3, color, alpha: 0.07 });

  g.moveTo(pa.x, ay);
  g.quadraticCurveTo(mx, my, pb.x, by);
  g.stroke({ width: 0.55, color: 0xffffff, alpha: 0.22 });

  g.moveTo(pa.x, ay);
  g.quadraticCurveTo(mx, my, pb.x, by);
  g.stroke({ width: 0.35, color, alpha: 0.55 });

  g.circle(pa.x, ay, 2.2).fill({ color, alpha: 0.65 });
  g.circle(pa.x, ay, 4.5).stroke({ width: 0.4, color, alpha: 0.2 });
  g.circle(pb.x, by, 2.2).fill({ color, alpha: 0.65 });
  g.circle(pb.x, by, 4.5).stroke({ width: 0.4, color, alpha: 0.2 });

  g.circle(mx, midY, 1.2 + pulse * 0.8).fill({ color: 0xffffff, alpha: 0.35 * pulse });
  g.circle(mx, midY, 3.5 + pulse).stroke({ width: 0.35, color, alpha: 0.25 * pulse });
}

/** Shared animated “monitor” fill: equalizer, scan band, live dot. */
function drawDisplayAnim(g, cx, cy, w, h, accent, frame, seed = 0) {
  const ax = cx - w / 2;
  const ay = cy - h / 2;
  const accentHex = hexColor(accent);
  const t = frame * 0.004 + seed * 1.7;
  const glow = 0.35 + Math.sin(t * 2.1) * 0.2;

  g.rect(ax, ay, w, h).fill(0x06061a);
  g.rect(ax, ay, w, h).stroke({ width: 0.6, color: accentHex, alpha: 0.35 + glow * 0.25 });

  const barN = Math.max(4, Math.floor(w / 7));
  const barW = Math.max(2, (w - 8) / barN - 2);
  const barBaseY = ay + h - 5;
  const barMaxH = h - 10;
  for (let i = 0; i < barN; i++) {
    const phase = t * 3.2 + i * 0.85 + seed;
    const bh = barMaxH * (0.25 + (Math.sin(phase) * 0.5 + 0.5) * 0.65);
    const bx = ax + 4 + i * (barW + 2);
    g.rect(bx, barBaseY - bh, barW, bh).fill({ color: accentHex, alpha: 0.45 + Math.sin(phase * 1.3) * 0.2 });
  }

  const scanY = ay + ((frame * 0.35 + seed * 40) % (h + 12)) - 6;
  g.rect(ax + 2, scanY, w - 4, 3).fill({ color: 0xffffff, alpha: 0.07 });

  const liveOn = Math.sin(frame * 0.12 + seed) > -0.15;
  const dotX = ax + w - 7;
  const dotY = ay + 5;
  g.circle(dotX, dotY, 2.2).fill({ color: liveOn ? 0xff4466 : 0x442228, alpha: liveOn ? 0.95 : 0.5 });
  if (liveOn) {
    g.circle(dotX, dotY, 4.5).stroke({ width: 0.35, color: 0xff4466, alpha: 0.35 });
  }
}

function layoutBubble(bub, statusText, lineText, accent) {
  const c = hexColor(accent);
  bub.bg.clear();
  bub.bg.roundRect(-BUBBLE_W / 2, -BUBBLE_H / 2, BUBBLE_W, BUBBLE_H, 6)
    .fill({ color: 0x0c0c18, alpha: 0.88 });
  bub.bg.roundRect(-BUBBLE_W / 2, -BUBBLE_H / 2, BUBBLE_W, BUBBLE_H, 6)
    .stroke({ width: 0.55, color: c, alpha: 0.65 });
  bub.bg.rect(-BUBBLE_W / 2 + 8, -BUBBLE_H / 2 + 1, BUBBLE_W - 16, 1.5)
    .fill({ color: c, alpha: 0.35 });

  if (bub.status.text !== statusText) bub.status.text = statusText;
  if (bub.line.text !== lineText) bub.line.text = lineText;
  if (bub.status.style.fill !== c) bub.status.style.fill = c;

  bub.status.position.set(0, -6);
  bub.line.position.set(0, 7);
}

function drawTile(g, gx, gy, fill, stroke) {
  const { x, y } = iso(gx, gy);
  g.poly([x, y, x + TW / 2, y + TH / 2, x, y + TH, x - TW / 2, y + TH / 2]).fill(hexColor(fill));
  if (stroke) {
    g.poly([x, y, x + TW / 2, y + TH / 2, x, y + TH, x - TW / 2, y + TH / 2])
      .stroke({ width: 0.5, color: hexColor(stroke), alpha: 0.2 });
  }
}

function drawBlock(g, gx, gy, top, sL, sR, h = BH) {
  const { x, y } = iso(gx, gy);
  g.poly([x + TW / 2, y + TH / 2, x, y + TH, x, y + TH + h, x + TW / 2, y + TH / 2 + h]).fill(hexColor(sR));
  g.poly([x - TW / 2, y + TH / 2, x, y + TH, x, y + TH + h, x - TW / 2, y + TH / 2 + h]).fill(hexColor(sL));
  g.poly([x, y, x + TW / 2, y + TH / 2, x, y + TH, x - TW / 2, y + TH / 2]).fill(hexColor(top));
}

function drawStageBlock(g, gx, gy, theme) {
  const sp = theme.stagePlatform;
  const front = gy === STAGE_Y2;
  drawBlock(g, gx, gy, front ? sp.topFront : sp.top, front ? sp.sLFront : sp.sL, front ? sp.sRFront : sp.sR, SBH);
  if (front) {
    const { x, y } = iso(gx, gy);
    const lip = y + TH / 2 + SBH;
    g.rect(x - TW / 2 + 3, lip - 4, TW - 6, 3).fill(hexColor(sp.lip));
    g.rect(x - TW / 2 + 3, lip - 1, TW - 6, 2).fill(hexColor(sp.lipDark));
  }
}

function drawPodcastFloor(g, gx, gy, theme) {
  const c = theme.podcastFloor;
  drawBlock(g, gx, gy, c.top, c.sL, c.sR, BH);
}

function drawPodcastPlatform(g, gx, gy, studio) {
  const front = gy === studio.platformY2;
  if (studio.id === 'podcast-ne') {
    drawBlock(g, gx, gy, front ? '#4A4858' : '#3A3848', '#2A1C14', '#302018', PODCAST_PBH);
  } else {
    drawBlock(g, gx, gy, front ? '#5A4030' : '#4A3428', front ? '#2A1C14' : '#221810', front ? '#3E2C20' : '#302018', PODCAST_PBH);
  }
  if (front) {
    const { x, y } = iso(gx, gy);
    g.rect(x - TW / 2 + 4, y + TH / 2 + PODCAST_PBH - 3, TW - 8, 2).fill(hexColor(studio.accent));
  }
}

function drawBooth(g, gx, gy, label, color, accent, detail = 1, frame = 0) {
  const { x, y } = iso(gx + 0.5, gy + 0.5);
  const fy = y + TH / 2;
  const PW = 40 * detail;
  const PH = 46 * detail;
  const CH = 12 * detail;
  const CW = 31 * detail;
  const seed = (gx * 17 + gy * 31 + label.length) % 97;
  g.poly([x - PW / 2, fy - PH, x - PW / 2 - 5, fy - PH + 6, x - PW / 2 - 5, fy - CH + 6, x - PW / 2, fy - CH])
    .fill(hexColor(shade(color, -28)));
  g.rect(x - PW / 2, fy - PH, PW, PH - CH).fill(hexColor(color));
  g.rect(x - PW / 2, fy - PH, PW, 2).fill(hexColor(accent));
  g.rect(x - PW / 2, fy - PH, PW, PH - CH).stroke({ width: 0.8, color: hexColor(accent), alpha: 0.4 });
  const screenW = PW - 10;
  const screenH = 20 * detail;
  const screenY = fy - PH + 6;
  drawDisplayAnim(g, x, screenY + screenH / 2, screenW, screenH, accent, frame, seed);
  g.circle(x, fy - PH + 14, 11).stroke({ width: 0.6, color: hexColor(accent), alpha: 0.25 });
  if (detail >= 1) {
    g.rect(x - CW / 2, fy - CH, CW, CH - 2).fill(hexColor(shade(color, 35)));
    g.poly([x - CW / 2, fy - 2, x - CW / 2 + 3, fy + 3, x + CW / 2 + 3, fy + 3, x + CW / 2, fy - 2])
      .fill(hexColor(shade(color, -8)));
  }
}

const KNITLING_FONT = 'Georgia, "Times New Roman", serif';

function drawKnitlingBooth(vis, gx, gy, booth, texture, detail = 1, frame = 0) {
  const { x, y } = iso(gx + 0.5, gy + 0.5);
  const fy = y + TH / 2;
  const PW = 52 * detail;
  const PH = 58 * detail;
  const CH = 14 * detail;
  const CW = 36 * detail;
  const panel = booth.panel || '#C8C4BC';
  const accent = booth.accent || '#F0ECE4';
  const color = booth.color || '#6A6864';
  const imgH = (PH - CH) * 0.72;
  const imgY = fy - PH + 2;
  const clipX = x - PW / 2 + 2;
  const clipW = PW - 4;

  const g = vis.gfx;
  g.clear();
  g.poly([
    x - PW / 2, fy - PH,
    x - PW / 2 - 5, fy - PH + 6,
    x - PW / 2 - 5, fy - CH + 6,
    x - PW / 2, fy - CH,
  ]).fill(hexColor(shade(color, -28)));
  g.rect(x - PW / 2, fy - PH, PW, (PH - CH) * 0.45).fill(hexColor('#E4E0D8'));
  g.rect(x - PW / 2, fy - PH + (PH - CH) * 0.45, PW, (PH - CH) * 0.55).fill(hexColor(panel));

  if (!texture?.source) {
    g.rect(clipX, imgY, clipW, imgH).fill(hexColor('#B8B4AC'));
  }

  g.rect(x - PW / 2, fy - PH, PW, 2).fill(hexColor(accent));
  g.rect(x - PW / 2, fy - PH, PW, PH - CH)
    .stroke({ width: 0.8, color: hexColor('#3C3A36'), alpha: 0.35 });

  g.rect(x - CW / 2, fy - CH, CW, CH - 2).fill(hexColor(shade(color, 35)));
  g.rect(x - CW / 2, fy - CH, CW, 3).fill(hexColor('#E8E4DC'));
  g.poly([
    x - CW / 2, fy - 2,
    x - CW / 2 + 3, fy + 3,
    x + CW / 2 + 3, fy + 3,
    x + CW / 2, fy - 2,
  ]).fill(hexColor(shade(color, -8)));

  const ty = fy - PH + imgH + 10 * detail;
  if (vis.titleText) {
    vis.titleText.style.fontSize = Math.round(9 * detail);
    vis.titleText.position.set(x, ty);
    vis.titleText.visible = detail >= 0.95;
  }
  if (vis.tagText) {
    const tag = booth.tagline || '';
    const line = tag.length > 42 ? `${tag.slice(0, 40)}…` : tag;
    if (vis.tagText.text !== line) vis.tagText.text = line;
    vis.tagText.style.fontSize = Math.round(4.2 * detail);
    vis.tagText.position.set(x, ty + 9 * detail);
    vis.tagText.visible = detail >= 1.05;
  }
  if (vis.urlText) {
    const url = booth.url || 'knitling.com';
    if (vis.urlText.text !== url) vis.urlText.text = url;
    vis.urlText.style.fontSize = Math.round(5.5 * detail);
    vis.urlText.position.set(x, fy - CH / 2 + 2);
    vis.urlText.visible = detail >= 0.95;
  }

  const seed = (gx * 13 + gy * 29) % 89;
  const panY = Math.sin(frame * 0.008 + seed) * 3;
  const screenAnimY = fy - PH + (PH - CH) * 0.12;
  drawDisplayAnim(g, x, screenAnimY + 5 * detail, PW - 14, 8 * detail, accent, frame, seed + 3);

  if (vis.img && texture?.source) {
    const tw = texture.width;
    const th = texture.height;
    const scale = Math.max(clipW / tw, imgH / th) * (1 + Math.sin(frame * 0.006 + seed) * 0.012);
    vis.img.scale.set(scale);
    vis.img.anchor.set(0.5, 1);
    vis.img.position.set(x, imgY + imgH + panY);
    vis.img.visible = true;

    vis.imgMask.clear();
    vis.imgMask.rect(clipX, imgY, clipW, imgH).fill(0xffffff);
    vis.img.mask = vis.imgMask;
    vis.imgMask.visible = true;
  } else if (vis.img) {
    vis.img.visible = false;
    if (vis.imgMask) vis.imgMask.visible = false;
  }

  if (vis.fadeGfx) {
    vis.fadeGfx.clear();
    if (texture?.source) {
      const fadeH = imgH * 0.45;
      const fadeY = imgY + imgH * 0.55;
      for (let i = 0; i < 6; i++) {
        const a = (i / 5) * 0.85;
        vis.fadeGfx.rect(clipX, fadeY + (fadeH * i) / 6, clipW, fadeH / 6)
          .fill({ color: hexColor(panel), alpha: a });
      }
      const shimmerY = imgY + ((frame * 0.4 + seed * 20) % (imgH + 8)) - 4;
      vis.fadeGfx.rect(clipX, shimmerY, clipW, 2)
        .fill({ color: 0xffffff, alpha: 0.12 + Math.sin(frame * 0.05) * 0.06 });
    }
    vis.fadeGfx.visible = !!texture?.source;
  }
}

function drawScreen(g, frame, detail) {
  const { x, y } = iso(STAGE_CX, STAGE_Y1 + 0.35);
  const fy = y + TH / 2 - SBH - 4;
  const SW = Math.min(200, (STAGE_X2 - STAGE_X1) * TW * 0.42) * detail;
  const SH = SW * 0.56;
  const sx = x - SW / 2;
  const sy = fy - SH;
  const accent = 0xa890ff;
  const pulse = 0.5 + Math.sin(frame * 0.04) * 0.5;

  g.rect(sx, sy, SW, SH).fill(0x080838);
  g.rect(sx, sy, SW, SH).stroke({ width: 1.2, color: accent, alpha: 0.2 + pulse * 0.25 });

  const innerW = SW - 16;
  const innerH = SH - 22;
  drawDisplayAnim(g, x, sy + innerH / 2 + 10, innerW, innerH, accent, frame, 42);

  const lineIdx = Math.floor(frame / 90) % PRESENTATION_LINES.length;
  const line = PRESENTATION_LINES[lineIdx];
  const charW = 5;
  const textW = line.length * charW;
  const scroll = (frame * 0.6) % (innerW + textW + 24);
  const textX = sx + 8 + innerW - scroll;
  const textY = sy + innerH + 14;
  for (let i = 0; i < line.length; i++) {
    const cx = textX + i * charW;
    if (cx < sx + 6 || cx > sx + SW - 8) continue;
    const ch = line.charCodeAt(i);
    const h = 3 + (ch % 5);
    g.rect(cx, textY - h, 3, h).fill({ color: accent, alpha: 0.55 + (i % 3) * 0.1 });
  }

  const progress = (Math.sin(frame * 0.003) * 0.5 + 0.5);
  g.rect(sx + 6, fy - 8, (SW - 12) * progress, 3).fill({ color: accent, alpha: 0.65 });
  g.rect(sx + 6 + (SW - 12) * progress, fy - 8, (SW - 12) * (1 - progress), 3)
    .fill({ color: 0x302850, alpha: 0.5 });
}

function drawPodium(g) {
  const { x, y } = iso(STAGE_CX, STAGE_Y2 - 0.15);
  const fy = y + TH / 2 + SBH;
  g.poly([x - 16, fy, x + 16, fy, x + 13, fy - 22, x - 13, fy - 22]).fill(0x120a20);
}

function drawMainDoor(g) {
  const gy = DOOR_WALL_GY;
  const gxL = Math.floor(DOOR_GX_L);
  const gxR = Math.ceil(DOOR_GX_R);
  for (let gx = gxL - 2; gx < gxL; gx++) {
    if (gx >= 0) drawBlock(g, gx, gy, '#2A2848', '#181430', '#221E48', DOOR_BLOCK_H);
  }
  for (let gx = gxR + 1; gx <= gxR + 2; gx++) {
    if (gx < GW) drawBlock(g, gx, gy, '#2A2848', '#181430', '#221E48', DOOR_BLOCK_H);
  }
  drawBlock(g, gxL, gy, '#1E1638', '#100C20', '#161228', DOOR_BLOCK_H);
  drawBlock(g, gxR, gy, '#1E1638', '#161228', '#100C20', DOOR_BLOCK_H);
  for (let gx = gxL + 1; gx < gxR; gx++) drawTile(g, gx, gy, '#14122A', '#60C0FF');
}

function drawStaticTerrain(g, theme) {
  for (let s = 0; s <= GW + GH - 2; s++) {
    for (let gx = Math.max(0, s - GH + 1); gx <= Math.min(GW - 1, s); gx++) {
      const gy = s - gx;
      if (gy < 0 || gy >= GH) continue;
      const r = roomAt(gx, gy);
      const podStudio = podcastStudioAt(gx, gy);
      if (podStudio && isPodcastPlatform(gx, gy, podStudio)) {
        drawPodcastPlatform(g, gx, gy, podStudio);
      } else if (podStudio) drawPodcastFloor(g, gx, gy, theme);
      else if (r) {
        if (isStageTile(gx, gy)) drawStageBlock(g, gx, gy, theme);
        else {
          const rc = roomDrawColors(r, theme);
          if (r.id === 'floor') drawTile(g, gx, gy, rc.top, rc.lc);
          else drawBlock(g, gx, gy, rc.top, rc.sL, rc.sR);
        }
      } else {
        drawTile(g, gx, gy, theme.voidTile, theme.voidStroke);
      }
    }
  }
  drawPodium(g);
  drawMainDoor(g);
  PODCAST_STUDIOS.forEach(studio => {
    const { x, y } = iso(studio.cx, studio.y1 + 1.1);
    g.rect(x - 44, y + TH / 2 - PODCAST_PBH - 56, 88, 52).fill(0x0c1018);
    g.rect(x - 40, y + TH / 2 - PODCAST_PBH - 8, 80, 6).fill(hexColor(studio.accent));
  });
}

export async function createPixiScene(hostEl) {
  const app = new Application();
  await app.init({
    resizeTo: hostEl,
    background: '#080810',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 3),
    autoDensity: true,
    autoStart: true,
    powerPreference: 'high-performance',
  });
  app.ticker.maxFPS = 60;
  hostEl.appendChild(app.canvas);
  app.canvas.style.display = 'block';
  app.canvas.style.touchAction = 'none';

  const bgLayer = new Graphics();
  const vignetteLayer = new Graphics();
  const viewport = new Container();
  const world = new Container();
  const screenGfx = new Graphics();
  const overlayGfx = new Graphics();
  const boothLayer = new Container();
  boothLayer.sortableChildren = true;
  const agentLayer = new Container();
  const labelLayer = new Container();
  agentLayer.sortableChildren = true;

  viewport.addChild(world);
  world.addChild(screenGfx, boothLayer, agentLayer, overlayGfx, labelLayer);
  app.stage.addChild(bgLayer, viewport, vignetteLayer);

  const terrainGfx = new Graphics();
  terrainGfx.label = 'terrain';
  world.addChildAt(terrainGfx, 0);
  let cachedThemeId = null;

  const drawTerrain = (theme) => {
    terrainGfx.clear();
    drawStaticTerrain(terrainGfx, theme);
  };

  if (isKenneyRenderStyle()) {
    loadKenneyAssets().catch((err) => {
      console.warn('[AgentConf] Kenney character assets failed to load', err);
    });
  }

  let knitlingTexture = null;
  try {
    knitlingTexture = await Assets.load('/knitling-booth.png');
    if (knitlingTexture?.source) {
      knitlingTexture.source.style = new TextureStyle({ scaleMode: 'linear' });
    }
  } catch { /* optional asset */ }

  const boothVisuals = new Map();
  const agentSprites = new Map();
  const labelTexts = [];
  const bubbleTexts = [];
  const renderList = [];

  let bubbleUsed = 0;
  let labelUsed = 0;
  let lastBgKey = '';
  let lastVigKey = '';
  let sortDirty = true;
  let lastScreenFrame = -1;
  let lastScreenDetail = 0;

  const ensureLabel = (i) => {
    while (labelTexts.length <= i) {
      const t = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: 8, fontWeight: 'bold', align: 'center' },
      });
      t.anchor.set(0.5, 0);
      labelLayer.addChild(t);
      labelTexts.push(t);
    }
    return labelTexts[i];
  };

  const ensureBubble = (i) => {
    while (bubbleTexts.length <= i) {
      const bg = new Graphics();
      const status = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: 5.5, fontWeight: 'bold', align: 'center' },
      });
      const line = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: 6, align: 'center', fill: 0xffffff },
      });
      status.anchor.set(0.5, 0.5);
      line.anchor.set(0.5, 0.5);
      const c = new Container();
      c.addChild(bg, status, line);
      labelLayer.addChild(c);
      bubbleTexts.push({ c, bg, status, line });
    }
    return bubbleTexts[i];
  };

  let agentStyleVer = getAgentRenderStyleVersion();
  const getAgentSprite = (id) => {
    const ver = getAgentRenderStyleVersion();
    if (ver !== agentStyleVer) {
      agentStyleVer = ver;
      for (const s of agentSprites.values()) {
        if (s.root.parent) s.root.parent.removeChild(s.root);
        s.root.destroy({ children: true });
      }
      agentSprites.clear();
    }
    if (!agentSprites.has(id)) {
      const sprite = createAgentSprite();
      agentSprites.set(id, sprite);
    }
    return agentSprites.get(id);
  };

  const createKnitlingBoothVisual = (texture) => {
    const root = new Container();
    const gfx = new Graphics();
    const imgMask = new Graphics();
    const fadeGfx = new Graphics();
    const img = texture ? new Sprite(texture) : null;
    const titleText = new Text({
      text: 'KNITLING',
      style: { fontFamily: KNITLING_FONT, fontSize: 9, fill: 0x3a3834, align: 'center' },
    });
    const tagText = new Text({
      text: '',
      style: { fontFamily: KNITLING_FONT, fontSize: 4.2, fill: 0x5a5854, align: 'center' },
    });
    const urlText = new Text({
      text: 'knitling.com',
      style: { fontFamily: FONT, fontSize: 5.5, fill: 0x4a4844, align: 'center' },
    });
    const labelText = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 7,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center',
      },
    });
    titleText.anchor.set(0.5, 0);
    tagText.anchor.set(0.5, 0);
    urlText.anchor.set(0.5, 0.5);
    labelText.anchor.set(0.5, 0);
    labelText.visible = false;
    const children = [gfx];
    if (img) children.push(img);
    children.push(imgMask, fadeGfx, titleText, tagText, urlText, labelText);
    root.addChild(...children);
    return {
      root, gfx, img, imgMask, fadeGfx, titleText, tagText, urlText, labelText,
      gx: NaN, gy: NaN, detail: 0, drag: false, knitling: true,
    };
  };

  const updateBooth = (booth, detail, isDrag, frame) => {
    const key = booth.label;
    let vis = boothVisuals.get(key);
    if (!vis) {
      vis = booth.brand === 'knitling'
        ? createKnitlingBoothVisual(knitlingTexture)
        : (() => {
          const root = new Container();
          const gfx = new Graphics();
          const labelText = new Text({
            text: '',
            style: {
              fontFamily: FONT,
              fontSize: 7,
              fontWeight: 'bold',
              fill: 0xffffff,
              align: 'center',
            },
          });
          labelText.anchor.set(0.5, 0);
          root.addChild(gfx, labelText);
          return { root, gfx, labelText, gx: NaN, gy: NaN, detail: 0, drag: false };
        })();
      boothLayer.addChild(vis.root);
      boothVisuals.set(key, vis);
    }
    const texKey = knitlingTexture ? 1 : 0;
    const animating = detail >= 1;
    const changed = vis.gx !== booth.gx || vis.gy !== booth.gy
      || vis.detail !== detail || vis.drag !== isDrag
      || vis._visible !== true
      || (vis.knitling && vis._texKey !== texKey)
      || (animating && vis._animFrame !== frame);
    if (!changed) return;
    if (animating) vis._animFrame = frame;
    vis._visible = true;
    vis.gx = booth.gx;
    vis.gy = booth.gy;
    vis.detail = detail;
    vis.drag = isDrag;
    if (vis.knitling) vis._texKey = texKey;
    const { x, y } = iso(booth.gx + 0.5, booth.gy + 0.5);
    const fy = y + TH / 2;
    if (booth.brand === 'knitling') {
      if (!vis.knitling) {
        boothLayer.removeChild(vis.root);
        vis.root.destroy({ children: true });
        vis = createKnitlingBoothVisual(knitlingTexture);
        boothLayer.addChild(vis.root);
        boothVisuals.set(key, vis);
      } else if (!vis.img && knitlingTexture) {
        vis.img = new Sprite(knitlingTexture);
        vis.root.addChildAt(vis.img, 1);
      }
      drawKnitlingBooth(vis, booth.gx, booth.gy, booth, knitlingTexture, detail, frame);
      vis.labelText.visible = false;
    } else {
      vis.gfx.clear();
      drawBooth(vis.gfx, booth.gx, booth.gy, booth.label, booth.color, booth.accent, detail, frame);
      if (detail >= 1.1) {
        const name = booth.label.toUpperCase();
        if (vis.labelText.text !== name) vis.labelText.text = name;
        vis.labelText.style.fill = 0xffffff;
        vis.labelText.position.set(x, fy - 46 * detail + 30 * detail);
        vis.labelText.visible = true;
      } else {
        vis.labelText.visible = false;
      }
    }
    if (isDrag) {
      const dragW = booth.brand === 'knitling' ? 64 : 60;
      const dragH = booth.brand === 'knitling' ? 66 : 58;
      vis.gfx.rect(x - dragW / 2, fy - dragH, dragW, dragH)
        .stroke({ width: 1.5, color: 0xa890ff, alpha: 0.55 });
    }
    vis.root.zIndex = booth.gx + booth.gy;
    vis.root.visible = true;
    sortDirty = true;
  };

  const render = ({
    frame, cam, view, theme, booths, agentsList, regular,
    showAgentNames, movementPaused, showCardinals, dragBoothIdx,
  }) => {
    const activeTheme = theme;
    const bounds = worldBoundsVisible(cam, view);
    const detail = cam.zoom >= 2.4 ? 1.35 : cam.zoom >= LOD_DETAIL_ZOOM ? 1.15 : 1;
    const minimal = cam.zoom < LOD_MINIMAL_ZOOM;

    if (cachedThemeId !== activeTheme.id) {
      cachedThemeId = activeTheme.id;
      drawTerrain(activeTheme);
      lastBgKey = '';
      lastVigKey = '';
      boothVisuals.forEach(v => {
        v.gx = NaN;
        v.gy = NaN;
      });
    }

    const bgKey = `${view.cw}|${view.ch}|${activeTheme.id}`;
    if (bgKey !== lastBgKey) {
      lastBgKey = bgKey;
      bgLayer.clear();
      bgLayer.rect(0, 0, view.cw, view.ch).fill(hexColor(activeTheme.canvasBg));
      const glow = rgbaColor(activeTheme.glowInner);
      bgLayer.rect(0, 0, view.cw, view.ch).fill({ color: glow.color, alpha: glow.alpha * 0.5 });
    }

    viewport.position.set(view.offX, view.offY);
    viewport.scale.set(view.scale);
    world.position.set(cam.panX, cam.panY);
    world.scale.set(cam.zoom);

    if (!minimal) {
      if (frame !== lastScreenFrame || detail !== lastScreenDetail) {
        lastScreenDetail = detail;
      }
      lastScreenFrame = frame;
      screenGfx.clear();
      try {
        drawScreen(screenGfx, frame, detail);
      } catch (err) {
        console.error('[AgentConf] stage screen draw failed', err);
      }
    } else if (lastScreenFrame !== -1) {
      lastScreenFrame = -1;
      screenGfx.clear();
    }

    overlayGfx.clear();
    labelUsed = 0;
    bubbleUsed = 0;

    ROOM_LABELS.forEach((r, i) => {
      const cx = (r.x1 + r.x2) / 2;
      const cy = r.id === 'stage' ? (STAGE_Y1 + STAGE_Y2) / 2
        : r.id?.startsWith('podcast') ? r.cy : (r.y1 + r.y2) / 2;
      const p = iso(cx, cy);
      if (!pointInBounds(p.x, p.y, bounds)) return;
      const rc = roomDrawColors(r, activeTheme);
      const label = `${r.icon} ${r.name.toUpperCase()}`;
      const t = ensureLabel(i);
      if (t.text !== label) t.text = label;
      const fillColor = hexColor(rc.lc);
      if (t.style.fill !== fillColor) t.style.fill = fillColor;
      t.position.set(p.x, p.y + TH / 2 - 20);
      t.visible = !minimal;
      labelUsed = i + 1;
      if (!minimal) {
        overlayGfx.rect(p.x - 40, p.y + TH / 2 - 20, 80, 13).fill({
          color: activeTheme.id === 'light' ? 0xffffff : 0,
          alpha: activeTheme.id === 'light' ? 0.75 : 0.6,
        });
      }
    });

    renderList.length = 0;
    for (const b of booths) renderList.push(b);
    for (const a of agentsList) {
      a._d = a.x + a.y;
      renderList.push(a);
    }
    renderList.sort((a, b) => a._d - b._d);

    const meetingOf = new Map();
    for (const a of agentsList) {
      if (a.talkTimer > 0 && a.meeting >= 0) meetingOf.set(a.id, a.meeting);
    }

    const drawnPairs = new Set();
    for (const a of agentsList) {
      if (a.talkTimer <= 0 || a.meeting < 0) continue;
      const pair = a.id < a.meeting ? `${a.id}-${a.meeting}` : `${a.meeting}-${a.id}`;
      if (drawnPairs.has(pair)) continue;
      drawnPairs.add(pair);
      const bId = meetingOf.get(a.id);
      const b = agentsList.find(x => x.id === bId);
      if (!b) continue;
      const pa = feetPos(a);
      const pb = feetPos(b);
      if (!pointInBounds(pa.x, pa.y, bounds) && !pointInBounds(pb.x, pb.y, bounds)) continue;
      drawConversationLink(overlayGfx, pa, pb, hexColor(a.color), frame);
    }

    const activeAgentIds = new Set();
    const showNames = showAgentNames && !minimal && cam.zoom >= 1.2;

    for (const item of renderList) {
      if (item._type === 'booth') {
        const bp = iso(item.gx + 0.5, item.gy + 0.5);
        if (!pointInBounds(bp.x, bp.y, bounds)) {
          const v = boothVisuals.get(item.label);
          if (v) {
            v.root.visible = false;
            v._visible = false;
          }
          continue;
        }
        const v = boothVisuals.get(item.label);
        if (v) v.root.visible = true;
        updateBooth(item, minimal ? 0.9 : detail, booths.indexOf(item) === dragBoothIdx, frame);
      } else if (item._type === 'agent') {
        const base = feetBase(item);
        const sprite = getAgentSprite(item.id);
        if (!pointInBounds(base.x, base.y, bounds)) {
          sprite.root.visible = false;
          continue;
        }
        activeAgentIds.add(item.id);
        const p = feetPos(item);
        drawAgentSprite(sprite, item, frame, showNames, movementPaused);
        sprite.root.position.set(p.x, p.y);
        sprite.root.visible = true;
        const z = Math.round(item._d * 1000);
        if (sprite.root.zIndex !== z) {
          sprite.root.zIndex = z;
          sortDirty = true;
        }
        if (!sprite.root.parent) agentLayer.addChild(sprite.root);
      }
    }

    if (sortDirty) {
      agentLayer.sortChildren();
      boothLayer.sortChildren();
      sortDirty = false;
    }

    for (const [id, sprite] of agentSprites) {
      if (!activeAgentIds.has(id)) sprite.root.visible = false;
    }

    if (!minimal) {
      for (const a of agentsList) {
        if (a.talkTimer <= 0 || a.meeting < 0) continue;
        const pair = a.id < a.meeting ? `${a.id}-${a.meeting}` : `${a.meeting}-${a.id}`;
        if (drawnPairs.has(`b-${pair}`)) continue;
        drawnPairs.add(`b-${pair}`);
        const b = agentsList.find(x => x.id === a.meeting);
        if (!b) continue;
        const pa = feetPos(a);
        const pb = feetPos(b);
        const mx = (pa.x + pb.x) / 2;
        const cy = Math.min(pa.y, pb.y) - AGENT_BODY_H - 20 - BUBBLE_H / 2;
        if (!pointInBounds(mx, cy, bounds)) continue;
        const msg = a.talkMsg || b.talkMsg || 'Networking';
        const line = msg.length > 36 ? `${msg.slice(0, 33)}…` : msg;
        const bub = ensureBubble(bubbleUsed++);
        layoutBubble(bub, 'TALKING', line, 0xffd750);
        bub.c.position.set(mx, cy);
      }

      for (const a of regular) {
        if (a.watchTimer <= 0) continue;
        const p = feetPos(a);
        if (!pointInBounds(p.x, p.y, bounds)) continue;
        const line = a.watchMsg || PRESENTATION_LINES[0];
        const cy = p.y - AGENT_BODY_H - 38 - BUBBLE_H / 2;
        const bub = ensureBubble(bubbleUsed++);
        layoutBubble(bub, 'WATCHING', line, 0xa890ff);
        bub.c.position.set(p.x, cy);
      }
    }

    if (showCardinals && !minimal) {
      const hub = iso(STAGE_CX, MAP_MID_GY);
      CARDINAL_MARKERS.forEach(m => {
        const p = iso(m.gx, m.gy);
        overlayGfx.moveTo(hub.x, hub.y + TH / 2).lineTo(p.x, p.y + TH / 2)
          .stroke({ width: 1, color: 0x60c0ff, alpha: 0.14 });
        overlayGfx.circle(p.x, p.y + TH / 2 - 4, 13).fill({ color: 0, alpha: 0.68 });
      });
      CARDINAL_MARKERS.forEach((m, i) => {
        const p = iso(m.gx, m.gy);
        const idx = ROOM_LABELS.length + i;
        const t = ensureLabel(idx);
        t.text = m.letter;
        t.style.fontSize = 12;
        t.style.fill = hexColor(m.color);
        t.position.set(p.x, p.y + TH / 2 - 10);
        t.visible = true;
        labelUsed = idx + 1;
      });
    }

    labelTexts.forEach((t, i) => { if (i >= labelUsed) t.visible = false; });
    bubbleTexts.forEach((b, i) => { b.c.visible = i < bubbleUsed; });

    const vigKey = `${view.cw}|${view.ch}|${activeTheme.id}`;
    if (vigKey !== lastVigKey) {
      lastVigKey = vigKey;
      vignetteLayer.clear();
      const vig = rgbaColor(activeTheme.vignetteEnd);
      vignetteLayer.rect(0, 0, view.cw, view.ch)
        .fill({ color: vig.color, alpha: vig.alpha * 0.85 });
    }
  };

  const onVisibility = () => {
    app.ticker.speed = document.hidden ? 0 : 1;
  };
  document.addEventListener('visibilitychange', onVisibility);

  const destroy = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    agentSprites.clear();
    boothVisuals.clear();
    terrainGfx.destroy();
    app.destroy(true, { children: true, texture: true });
  };

  const ensureKenneyAssets = async () => {
    if (!isKenneyRenderStyle()) return;
    try {
      await loadKenneyAssets();
    } catch (err) {
      console.warn('[AgentConf] Kenney character assets failed to load', err);
    }
  };

  return { app, render, destroy, ensureKenneyAssets };
}
