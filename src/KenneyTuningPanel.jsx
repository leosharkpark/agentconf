import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, Container } from 'pixi.js';
import { AGENTS_DEF } from './world.js';
import { loadKenneyAssets, kenneyReady } from './kenney/atlas.js';
import {
  buildKenneyRig,
  applyKenneyWalkPose,
  attachKenneyJointDebug,
  KENNEY_WALK_PHASE_PREVIEW,
} from './kenney/rig.js';
import { pickKenneyOutfit } from './kenney/outfit.js';
import {
  getKenneyRigConfig,
  setKenneyRigConfig,
  resetKenneyRigConfig,
  exportKenneyRigConfigJson,
} from './kenney/rigConfig.js';

const clone = (c) => JSON.parse(JSON.stringify(c));

/** Fixed palette — always readable (independent of venue lights theme). */
const T = {
  backdrop: 'rgba(12, 18, 32, 0.94)',
  card: '#1E2838',
  controls: '#243044',
  previewPanel: '#2A3548',
  previewWell: '#5A6D88',
  previewPixi: '#6B7F9E',
  text: '#EEF2FA',
  muted: '#A8B8D0',
  border: 'rgba(130, 190, 255, 0.5)',
  inputBg: '#141C2C',
  inputText: '#F4F7FF',
  btnBg: '#2E3D54',
  btnHover: '#3A4D68',
  accent: '#6EC4FF',
};

function Num({ label, value, onChange, step = 1, min, max, styles }) {
  return (
    <label style={{
      display: 'grid',
      gridTemplateColumns: '1fr 88px',
      gap: 10,
      alignItems: 'center',
      fontSize: styles.fontLabel,
      color: T.text,
    }}>
      <span>{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={styles.input}
      />
    </label>
  );
}

function Section({ title, children, styles }) {
  return (
    <details open style={{ marginTop: 14, color: T.text }}>
      <summary style={{
        fontSize: styles.fontSection,
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: T.accent,
        cursor: 'pointer',
        padding: '8px 0',
        borderBottom: `1px solid ${styles.border}`,
        listStyle: 'none',
      }}>
        {title}
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
        {children}
      </div>
    </details>
  );
}

export default function KenneyTuningPanel({ ui, onClose }) {
  const previewBoxRef = useRef(null);
  const appRef = useRef(null);
  const rigHostRef = useRef(null);
  const previewRigRef = useRef({ container: null, pivots: null, frame: 0 });
  const bootingRef = useRef(false);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });
  const [config, setConfig] = useState(() => clone(getKenneyRigConfig()));
  const [fem, setFem] = useState(false);
  const [femHairStyle, setFemHairStyle] = useState(1);
  const [agentIdx, setAgentIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [partCount, setPartCount] = useState(0);
  const [exportText, setExportText] = useState('');
  const [showJoints, setShowJoints] = useState(true);

  const previewAgent = {
    id: AGENTS_DEF[agentIdx]?.id ?? agentIdx,
    ...AGENTS_DEF[agentIdx],
    feminine: fem || AGENTS_DEF[agentIdx]?.feminine,
    color: AGENTS_DEF[agentIdx]?.color,
  };

  const styles = {
    fontTitle: 22,
    fontLabel: 15,
    fontSection: 13,
    fontHint: 14,
    fontBtn: 14,
    fontMono: 13,
    border: T.border,
    input: {
      width: '100%',
      padding: '8px 10px',
      fontSize: 15,
      fontFamily: "'Courier New', monospace",
      background: T.inputBg,
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      color: T.inputText,
    },
  };

  const patch = useCallback((path, value) => {
    setConfig((prev) => {
      const next = clone(prev);
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      setKenneyRigConfig(next);
      return next;
    });
  }, []);

  const patchNudge = useCallback((slot, axis, value) => {
    setConfig((prev) => {
      const next = clone(prev);
      next.nudge[slot][axis] = value;
      setKenneyRigConfig(next);
      return next;
    });
  }, []);

  const patchBothArmNudge = useCallback((axis, leftValue, rightValue) => {
    setConfig((prev) => {
      const next = clone(prev);
      next.nudge.armL[axis] = leftValue;
      next.nudge.armR[axis] = rightValue;
      setKenneyRigConfig(next);
      return next;
    });
  }, []);

  const patchBothLegNudge = useCallback((axis, leftValue, rightValue) => {
    setConfig((prev) => {
      const next = clone(prev);
      next.nudge.legL[axis] = leftValue;
      next.nudge.legR[axis] = rightValue;
      setKenneyRigConfig(next);
      return next;
    });
  }, []);

  const bumpHipShift = useCallback((axis, delta) => {
    setConfig((prev) => {
      const next = clone(prev);
      const key = axis === 'y' ? 'hipShiftY' : 'hipShiftX';
      next.attach[key] = (next.attach[key] ?? 0) + delta;
      setKenneyRigConfig(next);
      return next;
    });
  }, []);

  const shoulderDeltaY = config.nudge.armL.y - config.nudge.armR.y;
  const legDeltaY = config.nudge.legL.y - config.nudge.legR.y;

  const redraw = useCallback(() => {
    const app = appRef.current;
    const rigHost = rigHostRef.current;
    const PREVIEW_W = previewSize.w;
    const PREVIEW_H = previewSize.h;
    if (!app || !rigHost || PREVIEW_W < 80 || PREVIEW_H < 80) return;

    rigHost.removeChildren();
    previewRigRef.current = { container: null, pivots: null, frame: previewRigRef.current.frame };

    if (!kenneyReady()) {
      setPartCount(0);
      return;
    }

    const outfit = pickKenneyOutfit(previewAgent, previewAgent);
    if (outfit.fem && outfit.parts.hair) {
      outfit.parts.hair = outfit.parts.hair.replace(/Woman\d+\.png$/, `Woman${femHairStyle}.png`);
    }
    const { container, height, pivots, stackJoints } = buildKenneyRig(outfit);
    if (showJoints) {
      attachKenneyJointDebug(container, pivots, stackJoints);
    }
    previewRigRef.current = { container, pivots, frame: previewRigRef.current.frame };
    const count = container.children.length;
    setPartCount(count);
    if (count === 0) return;

    const b = container.getLocalBounds();
    const pad = 40;
    const scale = Math.min(
      (PREVIEW_W - pad * 2) / (b.width || 1),
      (PREVIEW_H - pad * 2) / (b.height || height || 200),
      2.5,
    );
    container.scale.set(scale);
    rigHost.addChild(container);

    const gb = container.getBounds();
    container.position.set(
      PREVIEW_W / 2 - gb.x - gb.width / 2,
      PREVIEW_H - 28 - gb.y - gb.height,
    );

    app.render();
  }, [previewAgent, fem, femHairStyle, agentIdx, config, previewSize, showJoints]);

  const ensurePreviewApp = useCallback(async () => {
    const box = previewBoxRef.current;
    if (!box || appRef.current || bootingRef.current) return;

    const w = Math.floor(box.clientWidth);
    const h = Math.floor(box.clientHeight);
    if (w < 80 || h < 80) return;

    bootingRef.current = true;
    try {
      await loadKenneyAssets();
      if (!previewBoxRef.current || appRef.current) return;

      const app = new Application();
      await app.init({
        width: w,
        height: h,
        background: T.previewPixi,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      const canvas = app.canvas;
      canvas.style.cssText = 'display:block;position:absolute;left:0;top:0;width:100%;height:100%;';
      box.style.position = 'relative';
      box.appendChild(canvas);

      const rigHost = new Container();
      app.stage.addChild(rigHost);
      appRef.current = app;
      rigHostRef.current = rigHost;
      setPreviewSize({ w, h });
      setReady(true);
    } catch (err) {
      console.warn('[RIG TUNE] preview init failed', err);
    } finally {
      bootingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return undefined;

    const measure = () => {
      const w = Math.floor(box.clientWidth);
      const h = Math.floor(box.clientHeight);
      if (w > 0 && h > 0) {
        setPreviewSize({ w, h });
        ensurePreviewApp();
      }
    };

    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [ensurePreviewApp]);

  useEffect(() => {
    if (!ready || previewSize.w < 80 || previewSize.h < 80) return;
    const app = appRef.current;
    if (!app) return;

    const { w, h } = previewSize;
    app.renderer.resize(w, h);
    redraw();
  }, [previewSize, redraw, ready]);

  useEffect(() => {
    if (!ready) return undefined;

    let rafId = 0;
    const tick = () => {
      const app = appRef.current;
      const rig = previewRigRef.current;
      if (app && rig.pivots) {
        rig.frame += 1;
        applyKenneyWalkPose(
          rig.pivots,
          rig.frame + (previewAgent.id ?? 0) * 1.7,
          true,
          KENNEY_WALK_PHASE_PREVIEW,
        );
        app.render();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ready, previewAgent.id]);

  useEffect(() => () => {
    setReady(false);
    bootingRef.current = false;
    appRef.current?.destroy(true);
    appRef.current = null;
    rigHostRef.current = null;
    if (previewBoxRef.current) previewBoxRef.current.innerHTML = '';
  }, []);

  const btn = {
    padding: '10px 16px',
    fontSize: styles.fontBtn,
    fontFamily: "'Courier New', monospace",
    borderRadius: 6,
    cursor: 'pointer',
    border: `1px solid ${T.border}`,
    background: T.btnBg,
    color: T.text,
    letterSpacing: '0.5px',
  };

  const optionStyle = { background: T.inputBg, color: T.inputText };

  return (
    <div
      role="dialog"
      aria-label="Kenney rig tuning"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        background: T.backdrop,
        backdropFilter: 'blur(10px)',
        fontFamily: "'Courier New', monospace",
        color: T.text,
        colorScheme: 'dark',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.1fr)',
          gap: 0,
          minHeight: 0,
          margin: 16,
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          background: T.card,
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          padding: '20px 24px',
          background: T.previewPanel,
          borderRight: `1px solid ${T.border}`,
          color: T.text,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: styles.fontTitle, fontWeight: 700, letterSpacing: '2px' }}>
              PREVIEW
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: styles.fontHint,
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={showJoints}
                  onChange={(e) => setShowJoints(e.target.checked)}
                />
                Show joints
              </label>
              <button type="button" style={{ ...btn, fontSize: 18, padding: '6px 14px' }} onClick={onClose}>
                ✕
              </button>
            </div>
          </div>

          <div
            ref={previewBoxRef}
            style={{
              flex: 1,
              minHeight: 320,
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${T.border}`,
              background: T.previewWell,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {ready && partCount === 0 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                textAlign: 'center',
                fontSize: styles.fontHint,
                color: T.muted,
                pointerEvents: 'none',
              }}>
                {kenneyReady()
                  ? 'No parts loaded for this outfit — check asset paths.'
                  : 'Loading Kenney sprites…'}
              </div>
            )}
          </div>

          {showJoints && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 6,
              background: T.controls,
              border: `1px solid ${T.border}`,
              fontSize: styles.fontHint,
              lineHeight: 1.55,
              color: T.muted,
            }}>
              <div style={{ color: T.text, fontWeight: 700, marginBottom: 6 }}>Joint legend</div>
              <div><span style={{ color: '#ff6b6b' }}>● hip L/R</span> — leg + shoe pivot; use <strong style={{ color: T.text }}>hipShiftX</strong> to move both left/right</div>
              <div><span style={{ color: '#ffe66d' }}>● shoulder L/R</span> — arm + hand pivot; bone line = arm direction</div>
              <div><span style={{ color: '#c77dff' }}>● purple ∩</span> — stack points (config <code style={{ color: T.accent }}>joint</code>); torso parts don&apos;t rotate</div>
              <div style={{ marginTop: 6, color: T.text }}>
                Yellow cross = shoulder pivot. Right arm uses anchor (0, 0.12); left is flipped with anchor (1, 0.12). If the left arm misses the crosshair, tune <strong>armLOffset</strong> in SHOULDERS — not armL nudge.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...btn, opacity: fem ? 0.45 : 1 }} onClick={() => setFem(false)}>
              Male
            </button>
            <button type="button" style={{ ...btn, opacity: fem ? 1 : 0.45 }} onClick={() => setFem(true)}>
              Female
            </button>
            <select
              value={agentIdx}
              onChange={(e) => setAgentIdx(Number(e.target.value))}
              style={{ ...btn, flex: 1, minWidth: 160, padding: '10px 12px' }}
            >
              {AGENTS_DEF.map((a, i) => (
                <option key={a.name} value={i} style={optionStyle}>{a.name}</option>
              ))}
            </select>
            {fem && (
              <select
                value={femHairStyle}
                onChange={(e) => setFemHairStyle(Number(e.target.value))}
                style={{ ...btn, minWidth: 120, padding: '10px 12px' }}
                title="Preview all female hair styles with the same rig offsets"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n} style={optionStyle}>Hair {n}</option>
                ))}
              </select>
            )}
          </div>

          <p style={{
            fontSize: styles.fontHint,
            color: T.muted,
            marginTop: 14,
            lineHeight: 1.5,
          }}>
            Map agents update live as you edit. Copy JSON when the rig looks right.
          </p>
        </div>

        {/* Controls column */}
        <div style={{
          overflow: 'auto',
          padding: '20px 28px 28px',
          minHeight: 0,
          background: T.controls,
          color: T.text,
        }}>
          <div style={{ fontSize: styles.fontTitle, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>
            RIG TUNE
          </div>
          <p style={{ fontSize: styles.fontHint, color: T.muted, marginBottom: 8, lineHeight: 1.5 }}>
            Heights from Kenney atlas × scale. Adjust overlap, spread, attach, and per-part nudge.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 24px',
          }}>
            <div>
              <Section title="JOINT OVERLAP" styles={styles}>
                <Num styles={styles} label="joint" value={config.joint} step={0.01} min={0} max={0.5}
                  onChange={(v) => patch('joint', v)} />
              </Section>

              <Section title="HIPS" styles={styles}>
                <p style={{ fontSize: styles.fontHint, color: T.muted, margin: 0, lineHeight: 1.45 }}>
                  Red/teal crosses = hip pivots. <code style={{ color: T.accent }}>hipShiftX/Y</code> move{' '}
                  <strong style={{ color: T.text }}>both</strong> hips together (X: − left, Y: − up).
                  <code style={{ color: T.accent }}>legL/legR</code> nudge fine-tunes each pivot;{' '}
                  <code style={{ color: T.accent }}>legLOffset</code> slides the leg PNG on the pivot.
                </p>
                {Math.abs(legDeltaY) > 0.5 && (
                  <p style={{ fontSize: styles.fontHint, color: '#ffb86c', margin: 0 }}>
                    Hip height mismatch: legL.y − legR.y = {legDeltaY.toFixed(0)}px
                  </p>
                )}
                <Num styles={styles} label="attach.hipShiftX" value={config.attach.hipShiftX ?? 0}
                  onChange={(v) => patch('attach.hipShiftX', v)} />
                <Num styles={styles} label="attach.hipShiftY" value={config.attach.hipShiftY ?? 0}
                  onChange={(v) => patch('attach.hipShiftY', v)} />
                <Num styles={styles} label="spread.legX" value={config.spread.legX} onChange={(v) => patch('spread.legX', v)} />
                <Num styles={styles} label="spread.shoeX" value={config.spread.shoeX} onChange={(v) => patch('spread.shoeX', v)} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={btn} onClick={() => bumpHipShift('x', -5)}>← X −5</button>
                  <button type="button" style={btn} onClick={() => bumpHipShift('x', 5)}>X +5 →</button>
                  <button type="button" style={btn} onClick={() => bumpHipShift('y', -5)}>↑ Y −5</button>
                  <button type="button" style={btn} onClick={() => bumpHipShift('y', 5)}>Y +5 ↓</button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  gap: 8,
                  fontSize: styles.fontLabel,
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#ff6b6b', fontWeight: 700 }}>legL</span>
                  <input type="number" value={config.nudge.legL.x}
                    onChange={(e) => patchNudge('legL', 'x', Number(e.target.value))} style={styles.input} />
                  <input type="number" value={config.nudge.legL.y}
                    onChange={(e) => patchNudge('legL', 'y', Number(e.target.value))} style={styles.input} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  gap: 8,
                  fontSize: styles.fontLabel,
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#4ecdc4', fontWeight: 700 }}>legR</span>
                  <input type="number" value={config.nudge.legR.x}
                    onChange={(e) => patchNudge('legR', 'x', Number(e.target.value))} style={styles.input} />
                  <input type="number" value={config.nudge.legR.y}
                    onChange={(e) => patchNudge('legR', 'y', Number(e.target.value))} style={styles.input} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={btn} onClick={() => patchBothLegNudge('y', config.nudge.legL.y, config.nudge.legL.y)}>
                    Match hip Y
                  </button>
                  <button type="button" style={btn} onClick={() => patchBothLegNudge('x', config.nudge.legL.x, config.nudge.legR.x)}>
                    Copy legL.x → legR
                  </button>
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: styles.fontLabel,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={config.attach.legLFlipX !== false}
                    onChange={(e) => patch('attach.legLFlipX', e.target.checked)}
                  />
                  legLFlipX (mirror left leg / shoe on Y axis)
                </label>
                <Num styles={styles} label="legLOffsetX" value={config.attach.legLOffsetX ?? 0}
                  onChange={(v) => patch('attach.legLOffsetX', v)} />
                <Num styles={styles} label="legLOffsetY" value={config.attach.legLOffsetY ?? 0}
                  onChange={(v) => patch('attach.legLOffsetY', v)} />
                <Num styles={styles} label="legROffsetX" value={config.attach.legROffsetX ?? 0}
                  onChange={(v) => patch('attach.legROffsetX', v)} />
                <Num styles={styles} label="legROffsetY" value={config.attach.legROffsetY ?? 0}
                  onChange={(v) => patch('attach.legROffsetY', v)} />
              </Section>

              <Section title="SHOULDERS" styles={styles}>
                <p style={{ fontSize: styles.fontHint, color: T.muted, margin: 0, lineHeight: 1.45 }}>
                  Turn on <strong style={{ color: T.text }}>Show joints</strong>.{' '}
                  <code style={{ color: T.accent }}>armL/armR</code> nudge moves the <em>shoulder pivot</em> on the torso.{' '}
                  To slide only the left arm PNG onto the yellow crosshair, use <code style={{ color: T.accent }}>armLOffset</code> below.
                </p>
                {Math.abs(shoulderDeltaY) > 0.5 && (
                  <p style={{ fontSize: styles.fontHint, color: '#ffb86c', margin: 0 }}>
                    Shoulder height mismatch: armL.y − armR.y = {shoulderDeltaY.toFixed(0)}px
                  </p>
                )}
                <Num styles={styles} label="attach.shoulder" value={config.attach.shoulder} step={0.01} min={0} max={1}
                  onChange={(v) => patch('attach.shoulder', v)} />
                <Num styles={styles} label="spread.armX" value={config.spread.armX} onChange={(v) => patch('spread.armX', v)} />
                <Num styles={styles} label="spread.armAngle" value={config.spread.armAngle} step={0.01}
                  onChange={(v) => patch('spread.armAngle', v)} />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  gap: 8,
                  fontSize: styles.fontLabel,
                  alignItems: 'center',
                }}>
                  <span style={{ color: T.accent, fontWeight: 700 }}>armL</span>
                  <input type="number" value={config.nudge.armL.x}
                    onChange={(e) => patchNudge('armL', 'x', Number(e.target.value))} style={styles.input} />
                  <input type="number" value={config.nudge.armL.y}
                    onChange={(e) => patchNudge('armL', 'y', Number(e.target.value))} style={styles.input} />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  gap: 8,
                  fontSize: styles.fontLabel,
                  alignItems: 'center',
                }}>
                  <span style={{ color: T.accent, fontWeight: 700 }}>armR</span>
                  <input type="number" value={config.nudge.armR.x}
                    onChange={(e) => patchNudge('armR', 'x', Number(e.target.value))} style={styles.input} />
                  <input type="number" value={config.nudge.armR.y}
                    onChange={(e) => patchNudge('armR', 'y', Number(e.target.value))} style={styles.input} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={btn} onClick={() => patchBothArmNudge('y', config.nudge.armL.y, config.nudge.armL.y)}>
                    Match Y (use left)
                  </button>
                  <button type="button" style={btn} onClick={() => patchBothArmNudge('x', config.nudge.armL.x, -config.nudge.armL.x)}>
                    Mirror X from left
                  </button>
                </div>

                <p style={{
                  fontSize: styles.fontSection,
                  fontWeight: 700,
                  color: T.accent,
                  margin: '14px 0 4px',
                  letterSpacing: '1px',
                }}>
                  LEFT ARM ON PIVOT
                </p>
                <Num styles={styles} label="armLOffsetX" value={config.attach.armLOffsetX ?? 0}
                  onChange={(v) => patch('attach.armLOffsetX', v)} />
                <Num styles={styles} label="armLOffsetY" value={config.attach.armLOffsetY ?? 0}
                  onChange={(v) => patch('attach.armLOffsetY', v)} />
                <Num styles={styles} label="armLAnchorX" value={config.attach.armLAnchorX ?? 1} step={0.01} min={0} max={1}
                  onChange={(v) => patch('attach.armLAnchorX', v)} />
                <Num styles={styles} label="armLAnchorY" value={config.attach.armLAnchorY ?? 0.12} step={0.01} min={0} max={1}
                  onChange={(v) => patch('attach.armLAnchorY', v)} />
              </Section>

              <Section title="ATTACH POINTS" styles={styles}>
                <Num styles={styles} label="faceY" value={config.attach.faceY} step={0.01}
                  onChange={(v) => patch('attach.faceY', v)} />
                <Num styles={styles} label="handDrop" value={config.attach.handDrop} step={0.01}
                  onChange={(v) => patch('attach.handDrop', v)} />
                <Num styles={styles} label="handOut" value={config.attach.handOut} step={0.01}
                  onChange={(v) => patch('attach.handOut', v)} />
                <Num
                  styles={styles}
                  label="hairFemHead"
                  value={config.attach.hairFemHead ?? config.attach.hairFemY ?? 0.12}
                  step={0.01}
                  min={0}
                  max={1}
                  onChange={(v) => patch('attach.hairFemHead', v)}
                />
                <p style={{ fontSize: styles.fontHint, color: T.muted, margin: 0, lineHeight: 1.4 }}>
                  Female hair anchors on the head (same for all styles). Use <code style={{ color: T.accent }}>hair</code> nudge to fine-tune.
                </p>
                <Num styles={styles} label="hairFemAnchor" value={config.attach.hairFemAnchor} step={0.01}
                  onChange={(v) => patch('attach.hairFemAnchor', v)} />
              </Section>
            </div>

            <div>
              <Section title="HEIGHT SCALE" styles={styles}>
                {Object.keys(config.scale).map((k) => (
                  <Num key={k} styles={styles} label={k} value={config.scale[k]} step={0.05} min={0.5} max={1.5}
                    onChange={(v) => patch(`scale.${k}`, v)} />
                ))}
              </Section>

              <Section title="PART NUDGE (x / y)" styles={styles}>
                {Object.keys(config.nudge).filter((slot) => !['armL', 'armR', 'legL', 'legR'].includes(slot)).map((slot) => (
                  <div key={slot} style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr 1fr',
                    gap: 8,
                    fontSize: styles.fontLabel,
                    alignItems: 'center',
                  }}>
                    <span style={{ color: T.muted }}>{slot}</span>
                    <input type="number" value={config.nudge[slot].x}
                      onChange={(e) => patchNudge(slot, 'x', Number(e.target.value))} style={styles.input} />
                    <input type="number" value={config.nudge[slot].y}
                      onChange={(e) => patchNudge(slot, 'y', Number(e.target.value))} style={styles.input} />
                  </div>
                ))}
              </Section>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={() => {
              resetKenneyRigConfig();
              setConfig(clone(getKenneyRigConfig()));
            }}>Reset defaults</button>
            <button type="button" style={{ ...btn, borderColor: T.accent, color: T.accent, background: '#1A3048' }} onClick={() => {
              const json = exportKenneyRigConfigJson();
              setExportText(json);
              navigator.clipboard?.writeText(json);
            }}>Copy JSON</button>
            <button type="button" style={btn} onClick={onClose}>Done</button>
          </div>

          {exportText && (
            <textarea
              readOnly
              value={exportText}
              style={{
                marginTop: 16,
                width: '100%',
                height: 140,
                fontSize: styles.fontMono,
                fontFamily: 'monospace',
                lineHeight: 1.45,
                background: T.inputBg,
                color: T.inputText,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 12,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
