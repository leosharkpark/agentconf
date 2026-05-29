import { useState, useEffect, useRef, useCallback } from 'react';
import CustomizationPanel from './CustomizationPanel.jsx';
import { themeForLights, loadLightsPref } from './theme.js';
import WorldScene from './three/WorldScene.jsx';
import {
  AGENTS_DEF,
  SPAWNABLE_AGENTS,
  FOCUS,
  initAll,
  mergeBoothLayout,
  getAllAgents,
  getAgentProfile,
  doorOutsidePos,
  doorInsidePos,
  syncBoothAgents,
} from './world/simulation.js';
import { LAYOUT_VERSION } from './world/layout.js';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './world/layout.js';

const loadBoothDragPref = () => {
  try {
    return localStorage.getItem('agentconf-booth-drag') !== '0';
  } catch {
    return true;
  }
};

const loadAgentNamesPref = () => {
  try {
    return localStorage.getItem('agentconf-agent-names') !== '0';
  } catch {
    return true;
  }
};

export default function AgentConfThree() {
  const [booths, setBooths] = useState(mergeBoothLayout);
  const boothsRef = useRef(booths);
  boothsRef.current = booths;

  const agentsRef = useRef(null);
  if (!agentsRef.current) agentsRef.current = initAll(boothsRef.current);

  const movementPausedRef = useRef(false);
  const [movementPaused, setMovementPaused] = useState(false);
  const [lightsOn, setLightsOn] = useState(loadLightsPref);
  const [showAgentNames, setShowAgentNames] = useState(loadAgentNamesPref);
  const [focusId, setFocusId] = useState('overview');
  const [focus, setFocus] = useState(FOCUS.overview());
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [stats, setStats] = useState({
    total: AGENTS_DEF.length,
    matches: 0,
    convos: 0,
    hot: 'Exhibition Floor',
  });
  const [roamingCount, setRoamingCount] = useState(AGENTS_DEF.length);

  useEffect(() => {
    movementPausedRef.current = movementPaused;
  }, [movementPaused]);

  useEffect(() => {
    document.documentElement.dataset.theme = lightsOn ? 'light' : 'dark';
    document.body.style.background = themeForLights(lightsOn).ui.pageBg;
  }, [lightsOn]);

  useEffect(() => {
    syncBoothAgents(booths, agentsRef.current?.booth);
    localStorage.setItem('agentconf-booth-layout-version', String(LAYOUT_VERSION));
    localStorage.setItem(
      'agentconf-booth-layout',
      JSON.stringify(booths.map(({ label, gx, gy }) => ({ label, gx: Math.round(gx), gy: Math.round(gy) }))),
    );
  }, [booths]);

  const applyFocus = useCallback((id, booth = null) => {
    setFocusId(booth ? `booth-${booth.label}` : id);
    const f = id === 'booth' && booth
      ? FOCUS.booth(booth)
      : id === 'stageScreen'
        ? FOCUS.stageScreen()
        : id === 'stage'
          ? FOCUS.stage()
          : id === 'floor'
            ? FOCUS.floor()
            : id === 'door'
              ? FOCUS.door()
              : id === 'podcast-nw'
                ? FOCUS.podcastNw()
                : id === 'podcast-ne'
                  ? FOCUS.podcastNe()
                  : FOCUS.overview();
    setFocus(f);
  }, []);

  const onStats = useCallback(convos => {
    setRoamingCount(agentsRef.current.regular.length);
    setStats(s => ({ ...s, convos, total: agentsRef.current.regular.length }));
  }, []);

  const spawnNewAgent = () => {
    const pool = agentsRef.current;
    const id = pool.nextId ?? AGENTS_DEF.length;
    pool.nextId = id + 1;
    const def = SPAWNABLE_AGENTS[Math.floor(Math.random() * SPAWNABLE_AGENTS.length)];
    const outside = doorOutsidePos();
    const inside = doorInsidePos();
    pool.regular.push({
      id,
      ...def,
      x: outside.x,
      y: outside.y,
      tx: inside.x,
      ty: inside.y,
      speed: 0.01 + Math.random() * 0.005,
      roomId: 'floor',
      waitTimer: 0,
      meeting: -1,
      talkTimer: 0,
      talkMsg: '',
      talkCooldown: 0,
      watchTimer: 0,
      watchMsg: '',
      goal: 'enter',
      faceDir: 1,
      _type: 'agent',
    });
    setRoamingCount(pool.regular.length);
    applyFocus('door');
  };

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
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: ui.pageBg,
      fontFamily: "'Courier New',monospace",
      color: ui.color,
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <WorldScene
          poolRef={agentsRef}
          booths={booths}
          movementPausedRef={movementPausedRef}
          lightsOn={lightsOn}
          focus={focus}
          showNames={showAgentNames}
          onStats={onStats}
        />
      </div>

      <div style={{ position: 'absolute', top: 12, left: 12, ...overlay, padding: '10px 14px', pointerEvents: 'none' }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '2px',
          background: ui.titleGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ◈ AGENTCONF 2026
        </div>
        <div style={{ fontSize: 9, color: ui.muted, marginTop: 4 }}>
          ● LIVE · {roamingCount} AGENTS · 3D · PALDISKI
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[['AGENTS', stats.total, '#A890FF'], ['CONVOS', stats.convos, '#50E890']].map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 7, color: ui.dim }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        <div style={{ ...overlay, padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          <button type="button" style={btn(lightsOn, '#FFD060')} onClick={() => setLightsOn(v => !v)}>
            {lightsOn ? '💡 LIGHTS ON' : '🌙 LIGHTS OFF'}
          </button>
          <button type="button" style={btn(focusId === 'stage', '#A890FF')} onClick={() => applyFocus('stage')}>🎤 MAIN STAGE</button>
          <button type="button" style={btn(focusId === 'floor', '#60C0FF')} onClick={() => applyFocus('floor')}>🏛️ EXPO FLOOR</button>
          <button type="button" style={btn(focusId === 'door', '#90A8FF')} onClick={() => applyFocus('door')}>🚪 ENTRANCE</button>
          <button type="button" style={btn(movementPaused, '#50E890')} onClick={() => setMovementPaused(v => !v)}>
            {movementPaused ? '▶ PLAY' : '⏸ PAUSE'}
          </button>
          <button type="button" style={btn(showAgentNames, '#60C0FF')} onClick={() => setShowAgentNames(v => !v)}>
            {showAgentNames ? '◎ NAMES ON' : '◎ NAMES OFF'}
          </button>
          <button type="button" style={btn(showCustomization, '#A890FF')} onClick={() => setShowCustomization(v => !v)}>
            👤 CUSTOMIZE
          </button>
          <button type="button" style={btn(false, '#50E890')} onClick={spawnNewAgent}>+ SPAWN AGENT</button>
          <button type="button" style={btn(focusId === 'overview', '#888')} onClick={() => applyFocus('overview')}>RESET VIEW</button>
        </div>
        <div style={{ ...overlay, padding: '6px 10px', display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {booths.map(b => (
            <button
              key={b.label}
              type="button"
              style={btn(focusId === `booth-${b.label}`, b.accent)}
              onClick={() => applyFocus('booth', b)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {selectedProfile && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: ui.modalBackdrop,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
          onClick={() => setSelectedProfile(null)}
        >
          <div
            style={{
              ...overlay,
              padding: 20,
              maxWidth: 360,
              pointerEvents: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedProfile.name}</div>
            <div style={{ color: ui.muted, fontSize: 11, marginTop: 4 }}>{selectedProfile.title}</div>
            <p style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>{selectedProfile.bio}</p>
            <button type="button" style={{ ...btn(false, '#888'), marginTop: 12 }} onClick={() => setSelectedProfile(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <CustomizationPanel
        open={showCustomization}
        onClose={() => setShowCustomization(false)}
        agents={agentsRef.current ? getAllAgents(agentsRef.current) : []}
        getDef={getAgentProfile}
        theme={ui}
      />
    </div>
  );
}
