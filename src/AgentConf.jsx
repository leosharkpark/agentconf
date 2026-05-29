import { useState, useEffect, useRef } from 'react';
import { createPixiScene } from './pixiScene.js';
import { themeForLights, loadLightsPref } from './theme.js';
import {
  AGENTS_DEF, ROOMS, PODCAST_STUDIOS, ZOOM_STEP,
  mergeBoothLayout, initAll, mkAgent, SPAWNABLE_AGENTS,
  doorOutsidePos, doorInsidePos,
  mkView, resizeView, mkCamera, focusWorldPoint, screenToWorld, zoomAtScreen, lerpCamera,
  FOCUS, hitTestBooth, hitTestAgent, moveBoothDrag, snapBooth, syncBoothAgents,
  profileFromAgent, updateAgentFacing,
  MEET_DIST_SQ, BOOTH_MEET_DIST_SQ, TALK_MAX_FRAMES, TALK_COOLDOWN_FRAMES, WATCH_MAX_FRAMES,
  FPS_ASSUME, PODCAST_CHAT_LINES, randInRoom, randInStageAudience, FLOOR_ROOM,
  startConversation, talkDuration, watchDuration, PRESENTATION_LINES,
  roomAt, podcastStudioAt, isStageRoom, isStageTile, worldToBoothPos, iso,
  LAYOUT_VERSION,
} from './world.js';
import { createAgentBuffer } from './pixi/utils.js';
import { buildAgentGrid, forEachNeighborPair } from './world/spatial.js';
import KenneyTuningPanel from './KenneyTuningPanel.jsx';
import {
  AGENT_RENDER_STYLES,
  getAgentRenderStyle,
  setAgentRenderStyle,
} from './agentStyle.js';

const loadBoothDragPref = () => {
  try { return localStorage.getItem('agentconf-booth-drag') !== '0'; } catch { return true; }
};
const loadAgentNamesPref = () => {
  try { return localStorage.getItem('agentconf-agent-names') !== '0'; } catch { return true; }
};
const loadCardinalsPref = () => {
  try { return localStorage.getItem('agentconf-cardinals') !== '0'; } catch { return true; }
};

const loadAgentStylePref = () => getAgentRenderStyle();

export default function AgentConf() {
  const hostRef = useRef(null);
  const pixiRef = useRef(null);
  const [booths, setBooths] = useState(mergeBoothLayout);
  const boothsRef = useRef(booths);
  boothsRef.current = booths;

  const agentsRef = useRef(null);
  if (!agentsRef.current) agentsRef.current = initAll(boothsRef.current);
  const matchesRef = useRef(new Set());
  const cameraRef = useRef(mkCamera());
  const viewRef = useRef(mkView());
  const frameRef = useRef(0);
  const panRef = useRef(null);
  const dragBoothRef = useRef(-1);
  const boothDragEnabledRef = useRef(loadBoothDragPref());
  const [boothDragEnabled, setBoothDragEnabled] = useState(loadBoothDragPref);
  const showAgentNamesRef = useRef(loadAgentNamesPref());
  const [showAgentNames, setShowAgentNames] = useState(loadAgentNamesPref);
  const showCardinalsRef = useRef(loadCardinalsPref());
  const [showCardinals, setShowCardinals] = useState(loadCardinalsPref);
  const [lightsOn, setLightsOn] = useState(loadLightsPref);
  const themeRef = useRef(themeForLights(loadLightsPref()));
  const movementPausedRef = useRef(false);
  const [movementPaused, setMovementPaused] = useState(false);
  const [stats, setStats] = useState({ total: AGENTS_DEF.length, matches: 0, convos: 0, hot: '—' });
  const [roamingCount, setRoamingCount] = useState(AGENTS_DEF.length);
  const [zoomPct, setZoomPct] = useState(100);
  const [focusId, setFocusId] = useState('overview');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pixiReady, setPixiReady] = useState(false);
  const [showKenneyTuner, setShowKenneyTuner] = useState(false);
  const [agentRenderStyle, setAgentRenderStyleState] = useState(loadAgentStylePref);

  useEffect(() => { boothDragEnabledRef.current = boothDragEnabled; }, [boothDragEnabled]);
  useEffect(() => { showAgentNamesRef.current = showAgentNames; }, [showAgentNames]);
  useEffect(() => { showCardinalsRef.current = showCardinals; }, [showCardinals]);
  useEffect(() => {
    themeRef.current = themeForLights(lightsOn);
    document.documentElement.dataset.theme = lightsOn ? 'light' : 'dark';
    document.body.style.background = themeRef.current.ui.pageBg;
  }, [lightsOn]);
  useEffect(() => { movementPausedRef.current = movementPaused; }, [movementPaused]);

  const toggleMovementPaused = () => setMovementPaused(prev => !prev);
  const toggleBoothDrag = () => {
    setBoothDragEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('agentconf-booth-drag', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };
  const toggleAgentNames = () => {
    setShowAgentNames(prev => {
      const next = !prev;
      try { localStorage.setItem('agentconf-agent-names', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };
  const toggleCardinals = () => {
    setShowCardinals(prev => {
      const next = !prev;
      try { localStorage.setItem('agentconf-cardinals', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };
  const onAgentStyleChange = (id) => {
    setAgentRenderStyle(id);
    setAgentRenderStyleState(id);
    if (id !== 'kenney') setShowKenneyTuner(false);
    if (id === 'kenney' && pixiRef.current?.ensureKenneyAssets) {
      pixiRef.current.ensureKenneyAssets();
    }
  };

  const toggleLights = () => {
    setLightsOn(prev => {
      const next = !prev;
      try { localStorage.setItem('agentconf-lights', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };

  const applyFocus = (id, booth = null) => {
    setFocusId(booth ? `booth-${booth.label}` : id);
    const cam = cameraRef.current;
    const f = id === 'booth' && booth ? FOCUS.booth(booth)
      : id === 'stageScreen' ? FOCUS.stageScreen()
      : id === 'stage' ? FOCUS.stage()
      : id === 'floor' ? FOCUS.floor()
      : id === 'door' ? FOCUS.door()
      : id === 'podcast' || id === 'podcast-nw' ? FOCUS.podcastNw()
      : id === 'podcast-ne' ? FOCUS.podcastNe()
      : FOCUS.overview();
    focusWorldPoint(cam, f.gx, f.gy, f.zoom);
  };

  const spawnNewAgent = () => {
    const pool = agentsRef.current;
    if (!pool) return;
    const id = pool.nextId ?? AGENTS_DEF.length;
    pool.nextId = id + 1;
    const def = SPAWNABLE_AGENTS[Math.floor(Math.random() * SPAWNABLE_AGENTS.length)];
    const outside = doorOutsidePos();
    const inside = doorInsidePos();
    const agent = mkAgent(id, def, outside.x, outside.y, { roomId: 'floor', goal: 'enter', waitTimer: 0 });
    agent.tx = inside.x;
    agent.ty = inside.y;
    pool.regular.push(agent);
    setRoamingCount(pool.regular.length);
    applyFocus('door');
  };

  useEffect(() => {
    syncBoothAgents(booths, agentsRef.current?.booth);
    localStorage.setItem('agentconf-booth-layout-version', String(LAYOUT_VERSION));
    localStorage.setItem(
      'agentconf-booth-layout',
      JSON.stringify(booths.map(({ label, gx, gy }) => ({ label, gx: Math.round(gx), gy: Math.round(gy) }))),
    );
  }, [booths]);

  useEffect(() => {
    let cancelled = false;
    let initGen = 0;
    const host = hostRef.current;
    if (!host) return undefined;

    (async () => {
      const gen = ++initGen;
      const scene = await createPixiScene(host);
      if (cancelled || gen !== initGen) {
        scene.destroy();
        return;
      }
      pixiRef.current = scene;
      setPixiReady(true);
      resizeView(viewRef.current);

      const fillAgents = createAgentBuffer();
      const getAllAgents = () => fillAgents(agentsRef.current);

      const nextTarget = (a) => {
        if (a.isStatic) return { x: a.tx, y: a.ty };
        if (a.goal === 'enter') return { x: a.tx, y: a.ty };
        if (Math.random() < 0.24) {
          a.goal = 'watch';
          a.roomId = 'stage';
          return randInStageAudience();
        }
        a.goal = 'roam';
        a.roomId = 'floor';
        return randInRoom(FLOOR_ROOM);
      };

      const tryStartConversation = (a, b, distSq) => {
        if (a.talkTimer > 0 || b.talkTimer > 0) return;
        if (a.talkCooldown > 0 || b.talkCooldown > 0) return;
        if (a.watchTimer > 0 || b.watchTimer > 0) return;
        if (a.goal === 'enter' || b.goal === 'enter') return;
        if (a.meeting >= 0 || b.meeting >= 0) return;
        if (distSq >= (a.isStatic || b.isStatic ? BOOTH_MEET_DIST_SQ : MEET_DIST_SQ)) return;
        startConversation(a, b);
        matchesRef.current.add(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`);
      };

      const update = () => {
        const { regular, speaker, booth, podcast } = agentsRef.current;
        const facePool = [...regular, speaker, ...booth];
        regular.forEach(a => updateAgentFacing(a, facePool));
        booth.forEach(a => updateAgentFacing(a, facePool));
        (podcast ?? []).forEach(a => updateAgentFacing(a, facePool));
        updateAgentFacing(speaker, facePool);
        lerpCamera(cameraRef.current);
        if (movementPausedRef.current) return;

        regular.forEach(a => {
          if (a.talkTimer > 0) {
            a.talkTimer--;
            a.tx = a.x;
            a.ty = a.y;
            if (a.talkTimer === 0) {
              a.meeting = -1;
              a.talkMsg = '';
              a.talkCooldown = TALK_COOLDOWN_FRAMES;
              a.goal = 'roam';
              a.waitTimer = 50 + Math.floor(Math.random() * 80);
            }
            return;
          }
          if (a.talkCooldown > 0) a.talkCooldown--;
          if (a.watchTimer > 0) {
            a.watchTimer--;
            a.tx = a.x;
            a.ty = a.y;
            if (a.watchTimer === 0) {
              a.watchMsg = '';
              a.goal = 'roam';
              a.roomId = 'floor';
              a.waitTimer = 40 + Math.floor(Math.random() * 70);
            }
            return;
          }
          const dx = a.tx - a.x;
          const dy = a.ty - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0.07) {
            const step = a.speed * 1.35;
            a.x += (dx / d) * step;
            a.y += (dy / d) * step;
          } else {
            a.x = a.tx;
            a.y = a.ty;
            if (a.waitTimer > 0) a.waitTimer--;
            else if (a.goal === 'enter') {
              a.goal = 'roam';
              const t = nextTarget(a);
              a.tx = t.x;
              a.ty = t.y;
              a.waitTimer = 50 + Math.floor(Math.random() * 120);
            } else if (a.goal === 'watch') {
              a.watchTimer = watchDuration();
              a.watchMsg = PRESENTATION_LINES[Math.floor(Math.random() * PRESENTATION_LINES.length)];
              a.tx = a.x;
              a.ty = a.y;
            } else {
              const t = nextTarget(a);
              a.tx = t.x;
              a.ty = t.y;
              a.waitTimer = 70 + Math.floor(Math.random() * 200);
            }
          }
          if (a.meeting >= 0 && a.talkTimer === 0) a.meeting = -1;
        });

        booth.forEach(a => {
          if (a.talkTimer > 0) {
            a.talkTimer--;
            if (a.talkTimer === 0) {
              a.meeting = -1;
              a.talkMsg = '';
              a.talkCooldown = TALK_COOLDOWN_FRAMES;
            }
          } else if (a.meeting >= 0) a.meeting = -1;
          if (a.talkCooldown > 0 && a.talkTimer === 0) a.talkCooldown--;
        });

        const restartStudioChat = (a, b) => {
          const msg = PODCAST_CHAT_LINES[Math.floor(Math.random() * PODCAST_CHAT_LINES.length)];
          const dur = Math.min(TALK_MAX_FRAMES, 6 * FPS_ASSUME);
          a.meeting = b.id;
          b.meeting = a.id;
          a.talkTimer = dur;
          b.talkTimer = dur;
          a.talkMsg = msg;
          b.talkMsg = msg;
        };
        (podcast ?? []).forEach(a => { if (a.talkTimer > 0) a.talkTimer--; });
        PODCAST_STUDIOS.forEach((_, si) => {
          const a = podcast[si * 2];
          const b = podcast[si * 2 + 1];
          if (!a || !b) return;
          if (a.talkTimer === 0 && b.talkTimer === 0 && a.meeting >= 0) {
            a.meeting = -1;
            b.meeting = -1;
            a.talkMsg = '';
            b.talkMsg = '';
            restartStudioChat(a, b);
          }
        });

        const grid = buildAgentGrid(regular);
        forEachNeighborPair(grid, (a, b) => {
          tryStartConversation(a, b, (a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        });
        regular.forEach(a => {
          booth.forEach(b => {
            tryStartConversation(a, b, (a.x - b.x) ** 2 + (a.y - b.y) ** 2);
          });
        });
      };

      const onResize = () => resizeView(viewRef.current);

      const tick = () => {
        if (cancelled || pixiRef.current !== scene) return;
        try {
          frameRef.current++;
          update();
          const agentsList = getAllAgents();
          scene.render({
            frame: frameRef.current,
            cam: cameraRef.current,
            view: viewRef.current,
            theme: themeRef.current,
            booths: boothsRef.current,
            agentsList,
            regular: agentsRef.current.regular,
            showAgentNames: showAgentNamesRef.current,
            movementPaused: movementPausedRef.current,
            showCardinals: showCardinalsRef.current,
            dragBoothIdx: dragBoothRef.current,
          });
          if (frameRef.current % 120 === 0) {
            const { regular } = agentsRef.current;
            const rc = {};
            ROOMS.forEach(r => { rc[r.id] = 0; });
            let convos = 0;
            regular.forEach(a => {
              const r = roomAt(a.x, a.y);
              if (r) rc[r.id]++;
            });
            agentsList.forEach(a => { if (a.talkTimer > 0 && a.id < a.meeting) convos++; });
            const hot = Object.entries(rc).sort((a, b) => b[1] - a[1])[0];
            const hotName = hot ? ROOMS.find(r => r.id === hot[0])?.name : '—';
            const zoom = Math.round(cameraRef.current.zoom * 100);
            const nextStats = {
              total: regular.length,
              matches: matchesRef.current.size,
              convos,
              hot: hotName,
            };
            setStats(prev => (
              prev.total === nextStats.total
              && prev.matches === nextStats.matches
              && prev.convos === nextStats.convos
              && prev.hot === nextStats.hot
            ) ? prev : nextStats);
            setRoamingCount(c => (c === regular.length ? c : regular.length));
            setZoomPct(z => (z === zoom ? z : zoom));
          }
        } catch (err) {
          console.error('[AgentConf] tick error', err);
        }
      };

      window.addEventListener('resize', onResize);
      scene.app.ticker.add(tick);

      pixiRef.current._cleanup = () => {
        scene.app.ticker.remove(tick);
        window.removeEventListener('resize', onResize);
        scene.destroy();
      };
    })();

    return () => {
      cancelled = true;
      setPixiReady(false);
      pixiRef.current?._cleanup?.();
      pixiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!pixiReady) return undefined;
    const canvas = pixiRef.current?.app?.canvas;
    const cam = cameraRef.current;
    if (!canvas) return undefined;

    const view = () => viewRef.current;
    const pt = e => {
      const rect = canvas.getBoundingClientRect();
      const v = view();
      const sx = ((e.clientX - rect.left) / rect.width) * v.cw;
      const sy = ((e.clientY - rect.top) / rect.height) * v.ch;
      return { sx, sy, w: screenToWorld(cam, sx, sy, v) };
    };

    const onWheel = e => {
      e.preventDefault();
      const { sx, sy } = pt(e);
      zoomAtScreen(cam, sx, sy, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, view());
    };

    const onPointerDown = e => {
      if (e.button !== 0) return;
      const { w } = pt(e);
      const boothIdx = hitTestBooth(w.x, w.y, boothsRef.current, cam.zoom);
      if (boothIdx >= 0 && boothDragEnabledRef.current) {
        e.preventDefault();
        const b = boothsRef.current[boothIdx];
        const { x, y } = iso(b.gx + 0.5, b.gy + 0.5);
        dragBoothRef.current = boothIdx;
        panRef.current = {
          mode: 'booth',
          boothIdx,
          grabDx: w.x - x,
          grabDy: w.y - y,
          startGx: b.gx,
          startGy: b.gy,
          dragging: false,
          pointerId: e.pointerId,
        };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
        return;
      }
      panRef.current = {
        mode: 'pan',
        downX: e.clientX,
        downY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        dragging: false,
        pointerId: e.pointerId,
        boothClickIdx: boothDragEnabledRef.current ? -1 : boothIdx,
      };
    };

    const onPointerMove = e => {
      const pan = panRef.current;
      if (!pan) return;
      if (pan.mode === 'booth') {
        e.preventDefault();
        pan.dragging = true;
        const { w } = pt(e);
        moveBoothDrag(
          pan.boothIdx, w.x, w.y, pan.grabDx, pan.grabDy,
          boothsRef.current, agentsRef.current?.booth,
        );
        return;
      }
      const dist = Math.hypot(e.clientX - pan.downX, e.clientY - pan.downY);
      if (!pan.dragging && dist > 6) {
        pan.dragging = true;
        canvas.setPointerCapture(pan.pointerId);
        canvas.style.cursor = 'grabbing';
      }
      if (!pan.dragging) return;
      const v = view();
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - pan.lastX) * (v.cw / rect.width) / v.scale;
      const dy = (e.clientY - pan.lastY) * (v.ch / rect.height) / v.scale;
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
      cam.targetPanX += dx;
      cam.targetPanY += dy;
      cam.panX = cam.targetPanX;
      cam.panY = cam.targetPanY;
    };

    const endPointer = e => {
      const pan = panRef.current;
      if (!pan) return;
      if (pan.mode === 'booth') {
        const list = boothsRef.current;
        snapBooth(pan.boothIdx, list, { gx: pan.startGx, gy: pan.startGy });
        syncBoothAgents(list, agentsRef.current?.booth);
        setBooths(list.map(b => ({ ...b })));
        if (!pan.dragging) {
          const b = list[pan.boothIdx];
          if (b) {
            setFocusId(`booth-${b.label}`);
            const f = FOCUS.booth(b);
            focusWorldPoint(cam, f.gx, f.gy, f.zoom);
          }
        }
        dragBoothRef.current = -1;
      } else if (!pan.dragging) {
        const { w } = pt(e);
        if (pan.boothClickIdx >= 0) {
          const b = boothsRef.current[pan.boothClickIdx];
          if (b) {
            setFocusId(`booth-${b.label}`);
            const f = FOCUS.booth(b);
            focusWorldPoint(cam, f.gx, f.gy, f.zoom);
          }
        } else {
          const { regular, speaker, booth, podcast: podAgents } = agentsRef.current;
          const hit = hitTestAgent(w.x, w.y, [...regular, speaker, ...booth, ...(podAgents ?? [])]);
          if (hit) setSelectedProfile(profileFromAgent(hit));
        }
      }
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      panRef.current = null;
      canvas.style.cursor = 'grab';
    };

    const onDblClick = e => {
      const { sx, sy, w } = pt(e);
      const boothIdx = hitTestBooth(w.x, w.y, boothsRef.current, cam.zoom);
      const hit = boothIdx >= 0 ? boothsRef.current[boothIdx] : null;
      if (hit) {
        setFocusId(`booth-${hit.label}`);
        const f = FOCUS.booth(hit);
        focusWorldPoint(cam, f.gx, f.gy, f.zoom);
      } else {
        const { gx, gy } = worldToBoothPos(w.x, w.y);
        const podHit = podcastStudioAt(gx, gy);
        if (podHit) {
          setFocusId(podHit.focusId);
          const f = podHit.id === 'podcast-ne' ? FOCUS.podcastNe() : FOCUS.podcastNw();
          focusWorldPoint(cam, f.gx, f.gy, f.zoom);
        } else if (isStageRoom(gx, gy) || isStageTile(gx, gy)) {
          setFocusId('stageScreen');
          const f = FOCUS.stageScreen();
          focusWorldPoint(cam, f.gx, f.gy, f.zoom);
        } else {
          zoomAtScreen(cam, sx, sy, ZOOM_STEP, view());
        }
      }
    };

    const onKey = e => {
      const v = view();
      if (e.key === '+' || e.key === '=') zoomAtScreen(cam, v.cw / 2, v.ch / 2, ZOOM_STEP, v);
      else if (e.key === '-') zoomAtScreen(cam, v.cw / 2, v.ch / 2, 1 / ZOOM_STEP, v);
      else if (e.key === '0') applyFocus('overview');
      else if (e.key === 'Escape') setSelectedProfile(null);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKey);
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      canvas.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [pixiReady]);

  const ui = themeForLights(lightsOn);
  const btn = (active, accent) => ({
    background: active ? `${accent}22` : ui.btnInactiveBg,
    border: `1px solid ${active ? `${accent}88` : ui.btnInactiveBorder}`,
    borderRadius: 4,
    padding: '5px 10px',
    fontSize: 10,
    color: active ? accent : ui.btnInactiveColor,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    fontFamily: "'Courier New',monospace",
  });
  const overlay = {
    background: ui.overlayBg,
    border: `1px solid ${ui.overlayBorder}`,
    borderRadius: 6,
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: ui.pageBg,
      fontFamily: "'Courier New',monospace",
      color: ui.color,
      transition: 'background 0.35s ease, color 0.35s ease',
    }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', top: 12, left: 12, ...overlay, padding: '10px 14px', pointerEvents: 'none' }}>
        <div style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '2px',
          background: ui.titleGradient,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ◈ AGENTCONF 2026
        </div>
        <div style={{ fontSize: 9, color: ui.muted, marginTop: 4, letterSpacing: '1px' }}>
          ● LIVE · {roamingCount} AGENTS · PALDISKI
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[['AGENTS', stats.total, '#A890FF'], ['MATCHES', stats.matches, '#60C0FF'],
            ['CONVOS', stats.convos, '#50E890'], ['BUSIEST', stats.hot, '#FFB840']].map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 7, color: ui.dim, letterSpacing: '1px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4,
        ...overlay, padding: 6, pointerEvents: 'auto',
      }}>
        <button type="button" style={btn(false, '#A890FF')}
          onClick={() => zoomAtScreen(cameraRef.current, viewRef.current.cw / 2, viewRef.current.ch / 2, ZOOM_STEP, viewRef.current)} title="Zoom in">+</button>
        <div style={{ fontSize: 9, color: ui.zoomLabel, textAlign: 'center', padding: '2px 0' }}>{zoomPct}%</div>
        <button type="button" style={btn(false, '#A890FF')}
          onClick={() => zoomAtScreen(cameraRef.current, viewRef.current.cw / 2, viewRef.current.ch / 2, 1 / ZOOM_STEP, viewRef.current)} title="Zoom out">−</button>
        <button type="button" style={{ ...btn(focusId === 'overview', '#888'), marginTop: 4, fontSize: 8 }}
          onClick={() => applyFocus('overview')}>RESET</button>
      </div>

      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        <div style={{
          ...overlay, padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          pointerEvents: 'auto',
        }}>
          <button type="button" style={btn(lightsOn, '#FFD060')} onClick={toggleLights}
            title={lightsOn ? 'Turn venue lights off' : 'Turn venue lights on'}>
            {lightsOn ? '💡 LIGHTS ON' : '🌙 LIGHTS OFF'}
          </button>
          <span style={{ fontSize: 8, color: ui.dim, letterSpacing: '1px' }}>FOCUS</span>
          <button type="button" style={btn(focusId === 'stage', '#A890FF')} onClick={() => applyFocus('stage')}>🎤 MAIN STAGE</button>
          <button type="button" style={btn(focusId === 'stageScreen', '#A890FF')} onClick={() => applyFocus('stageScreen')}>📺 SCREEN</button>
          <button type="button" style={btn(focusId === 'podcast-nw', '#FF7A58')} onClick={() => applyFocus('podcast-nw')}>🎙️ POD NW</button>
          <button type="button" style={btn(focusId === 'podcast-ne', '#38E8C0')} onClick={() => applyFocus('podcast-ne')}>🎙️ POD NE</button>
          <button type="button" style={btn(focusId === 'floor', '#60C0FF')} onClick={() => applyFocus('floor')}>🏛️ EXPO FLOOR</button>
          <button type="button" style={{ ...btn(boothDragEnabled, '#FFB840'), marginLeft: 8 }} onClick={toggleBoothDrag}
            title={boothDragEnabled ? 'Disable booth dragging' : 'Enable booth dragging'}>
            {boothDragEnabled ? '⇱ DRAG BOOTHS ON' : '⇱ DRAG BOOTHS OFF'}
          </button>
          <button type="button" style={btn(showAgentNames, '#60C0FF')} onClick={toggleAgentNames}
            title={showAgentNames ? 'Hide agent name labels' : 'Show agent name labels'}>
            {showAgentNames ? '◎ NAMES ON' : '◎ NAMES OFF'}
          </button>
          <button type="button" style={btn(showCardinals, '#88B8E8')} onClick={toggleCardinals}
            title={showCardinals ? 'Hide compass markers' : 'Show compass markers'}>
            {showCardinals ? '⊕ COMPASS ON' : '⊕ COMPASS OFF'}
          </button>
          <button type="button" style={btn(movementPaused, '#50E890')} onClick={toggleMovementPaused}
            title={movementPaused ? 'Resume movement' : 'Pause movement'}>
            {movementPaused ? '▶ PLAY' : '⏸ PAUSE'}
          </button>
          <span style={{ fontSize: 8, color: ui.dim, letterSpacing: '1px', marginLeft: 4 }}>AGENTS</span>
          <select
            value={agentRenderStyle}
            onChange={(e) => onAgentStyleChange(e.target.value)}
            style={{
              ...btn(false, '#A890FF'),
              padding: '6px 10px',
              fontSize: 9,
              cursor: 'pointer',
              minWidth: 120,
            }}
            title="Agent appearance style"
          >
            {AGENT_RENDER_STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {agentRenderStyle === 'kenney' && (
            <button type="button" style={btn(showKenneyTuner, '#E8A050')}
              onClick={() => setShowKenneyTuner((v) => !v)}
              title="Tune Kenney character rig">
              {showKenneyTuner ? '◧ RIG ON' : '◧ RIG TUNE'}
            </button>
          )}
          <button type="button" style={btn(focusId === 'door', '#90A8FF')} onClick={spawnNewAgent}
            title="Spawn agent at entrance">+ SPAWN AGENT</button>
          <button type="button" style={btn(focusId === 'door', '#90A8FF')} onClick={() => applyFocus('door')}
            title="Focus main entrance">🚪 ENTRANCE</button>
          <span style={{ fontSize: 8, color: ui.hint, marginLeft: 'auto' }}>
            {movementPaused ? 'agents paused · ' : ''}
            {showCardinals ? 'N/S/E/W for placement · ' : ''}
            {boothDragEnabled ? 'drag booths · ' : ''}click booth/agent · pan map
          </span>
        </div>

        <div style={{
          ...overlay, padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          pointerEvents: 'auto',
        }}>
          <span style={{ fontSize: 8, color: ui.dim, letterSpacing: '1px' }}>BOOTHS</span>
          {booths.map(b => (
            <button key={b.label} type="button" style={btn(focusId === `booth-${b.label}`, b.accent)}
              onClick={() => applyFocus('booth', b)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {showKenneyTuner && (
        <KenneyTuningPanel ui={ui} onClose={() => setShowKenneyTuner(false)} />
      )}

      {selectedProfile && (
        <div
          role="dialog"
          aria-labelledby="agent-profile-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ui.modalBackdrop, backdropFilter: 'blur(4px)',
            padding: 24, pointerEvents: 'auto',
          }}
          onClick={() => setSelectedProfile(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 380,
              background: ui.modalBg,
              border: `1px solid ${selectedProfile.color}55`,
              borderRadius: 10, padding: '22px 24px',
              boxShadow: `0 0 40px ${selectedProfile.color}33`,
            }}
            onClick={ev => ev.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: `${selectedProfile.color}22`,
                  border: `1px solid ${selectedProfile.color}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>🤖</div>
                <div>
                  <div id="agent-profile-title" style={{ fontSize: 16, fontWeight: 700, color: selectedProfile.color }}>
                    {selectedProfile.name}
                  </div>
                  <div style={{ fontSize: 10, color: ui.panelMuted, marginTop: 4, letterSpacing: '0.5px' }}>
                    {selectedProfile.title}
                  </div>
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedProfile(null)}
                style={{ background: 'transparent', border: 'none', color: ui.panelSubtle, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>
            <p style={{
              fontSize: 11, color: ui.panelText, lineHeight: 1.65, margin: '16px 0 12px',
              borderTop: `1px solid ${ui.panelDivider}`, paddingTop: 14,
            }}>
              {selectedProfile.bio}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedProfile.linkedin && (
                <a href={selectedProfile.linkedin} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 11, color: '#60C0FF', textDecoration: 'none',
                  background: 'rgba(96,192,255,0.08)',
                  border: '1px solid rgba(96,192,255,0.25)',
                  borderRadius: 6, padding: '8px 14px',
                }}>
                  <span style={{ fontWeight: 700 }}>in</span>
                  View on LinkedIn
                </a>
              )}
              {selectedProfile.website && (
                <a href={selectedProfile.website} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: 11, color: '#5A5854', textDecoration: 'none',
                  background: 'rgba(232,228,220,0.12)',
                  border: '1px solid rgba(200,196,188,0.35)',
                  borderRadius: 6, padding: '8px 14px',
                }}>
                  knitling.com
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
