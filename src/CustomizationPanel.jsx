import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  CUSTOMIZATION_CATALOG,
  PREVIEW_APPEARANCE,
  drawAppearancePreview,
  resolveAppearance,
} from './agentCustomization.js';
import { THEME_DARK } from './theme.js';

const CATEGORIES = [
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'trousers', label: 'Trousers' },
];

const CATEGORY_KEYS = {
  hair: 'hair',
  eyes: 'eyes',
  mouth: 'mouth',
  shirt: 'shirt',
  trousers: 'trousers',
};

const DEFAULT_PREVIEW_PARTS = {
  feminine: false,
  hair: 'hair-m-crop',
  eyes: 'eye-classic',
  mouth: 'mouth-smile',
  shirt: 'shirt-blazer',
  trousers: 'trouser-straight',
};

const PREVIEW_W = 168;
const PREVIEW_H = 210;

const mono = "'Courier New',monospace";

const isFeminineHair = code => code?.startsWith('hair-f-');
const isMasculineHair = code => code?.startsWith('hair-m-');
const isFeminineTrousers = code => code === 'trouser-skirt' || code === 'trouser-wide';
const isMasculineTrousers = code => code === 'trouser-straight' || code === 'trouser-slim';

export default function CustomizationPanel({ open, onClose, agents = [], getDef, theme = THEME_DARK }) {
  const previewRef = useRef(null);
  const frameRef = useRef(0);
  const [category, setCategory] = useState('hair');
  const [previewParts, setPreviewParts] = useState(DEFAULT_PREVIEW_PARTS);
  const [showTalkingMouth, setShowTalkingMouth] = useState(false);
  const [filterGender, setFilterGender] = useState('all');

  const fieldKey = CATEGORY_KEYS[category];
  const selectedCode = previewParts[fieldKey];

  const previewAppearance = useMemo(() => ({
    ...PREVIEW_APPEARANCE,
    feminine: previewParts.feminine,
    hair: previewParts.hair,
    eyes: previewParts.eyes,
    shirt: previewParts.shirt,
    trousers: previewParts.trousers,
    mouth: category === 'mouth' && showTalkingMouth ? 'mouth-talk' : previewParts.mouth,
  }), [previewParts, category, showTalkingMouth]);

  const previewAppearanceRef = useRef(previewAppearance);
  previewAppearanceRef.current = previewAppearance;

  const agentRows = useMemo(() => {
    if (!getDef) return [];
    return agents.map(a => {
      const def = getDef(a);
      const app = resolveAppearance(def, a.id);
      return {
        id: a.id,
        name: def.name ?? a.name ?? `Agent ${a.id}`,
        ...app,
      };
    });
  }, [agents, getDef]);

  const pickOption = useCallback((code) => {
    setPreviewParts(prev => ({ ...prev, [fieldKey]: code }));
  }, [fieldKey]);

  const setPreviewFeminine = useCallback((fem) => {
    setPreviewParts(prev => {
      const next = { ...prev, feminine: fem };
      if (fem) {
        if (!isFeminineHair(prev.hair)) next.hair = 'hair-f-long';
        if (isMasculineTrousers(prev.trousers)) next.trousers = 'trouser-skirt';
      } else {
        if (!isMasculineHair(prev.hair)) next.hair = 'hair-m-crop';
        if (isFeminineTrousers(prev.trousers)) next.trousers = 'trouser-straight';
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open || !previewRef.current) return;
    const canvas = previewRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(PREVIEW_W * dpr);
    canvas.height = Math.floor(PREVIEW_H * dpr);
    canvas.style.width = `${PREVIEW_W}px`;
    canvas.style.height = `${PREVIEW_H}px`;

    let raf;
    const tick = () => {
      frameRef.current += 1;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawAppearancePreview(
        ctx,
        PREVIEW_W,
        PREVIEW_H,
        previewAppearanceRef.current,
        frameRef.current,
        2.35,
        theme.ui.previewBg,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, theme]);

  if (!open) return null;

  const options = (CUSTOMIZATION_CATALOG[category] ?? []).filter(o => {
    if (filterGender === 'all') return true;
    return o.gender === 'all' || o.gender === filterGender;
  });

  const ui = theme.ui;
  const labelStyle = { fontSize: 11, color: ui.panelMuted, lineHeight: 1.45 };
  const tabBorder = theme.id === 'light' ? 'rgba(40,55,90,0.2)' : 'rgba(255,255,255,0.12)';

  return (
    <div
      role="dialog"
      aria-label="Agent customization catalog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        justifyContent: 'flex-end',
        background: ui.panelScrim,
        backdropFilter: 'blur(3px)',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(520px, 100vw)',
          height: '100%',
          background: ui.panelBg,
          borderLeft: `1px solid ${ui.panelBorder}`,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: mono,
          color: ui.panelText,
          fontSize: 13,
        }}
      >
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${ui.panelDivider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#A890FF', letterSpacing: '1px' }}>
              AGENT CUSTOMIZATION
            </div>
            <div style={{ fontSize: 12, color: ui.panelMuted, marginTop: 6 }}>
              Codes for hair, eyes, mouth, shirt, trousers
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: ui.panelMuted,
              fontSize: 26,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${ui.panelDivider}` }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  padding: '7px 12px',
                  fontSize: 12,
                  fontFamily: mono,
                  cursor: 'pointer',
                  borderRadius: 5,
                  border: `1px solid ${category === c.id ? '#60C0FF88' : tabBorder}`,
                  background: category === c.id ? 'rgba(96,192,255,0.18)' : 'transparent',
                  color: category === c.id ? '#60C0FF' : ui.panelMuted,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: ui.panelSubtle }}>FILTER</span>
            {['all', 'm', 'f'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGender(g)}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  fontFamily: mono,
                  cursor: 'pointer',
                  border: `1px solid ${tabBorder}`,
                  borderRadius: 4,
                  background: filterGender === g ? ui.btnInactiveBg : 'transparent',
                  color: filterGender === g ? ui.panelText : ui.panelMuted,
                }}
              >
                {g === 'all' ? 'ALL' : g === 'm' ? 'MEN' : 'WOMEN'}
              </button>
            ))}
            <label style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: ui.panelMuted,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={previewParts.feminine}
                onChange={e => setPreviewFeminine(e.target.checked)}
              />
              female body
            </label>
          </div>
          {category === 'mouth' && (
            <label style={{
              fontSize: 12,
              color: ui.panelMuted,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              marginTop: 8,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showTalkingMouth}
                onChange={e => setShowTalkingMouth(e.target.checked)}
              />
              preview talking mouth
            </label>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px',
            borderRight: `1px solid ${ui.panelDivider}`,
          }}>
            {options.map(opt => (
              <button
                key={opt.code}
                type="button"
                onClick={() => pickOption(opt.code)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 8,
                  padding: '11px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: mono,
                  border: `1px solid ${selectedCode === opt.code ? '#A890FF88' : tabBorder}`,
                  background: selectedCode === opt.code ? 'rgba(168,144,255,0.15)' : ui.btnInactiveBg,
                  color: ui.panelText,
                }}
              >
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: selectedCode === opt.code ? '#A890FF' : ui.panelText,
                }}>
                  {opt.code}
                </div>
                <div style={{ fontSize: 12, color: ui.panelMuted, marginTop: 4 }}>{opt.name}</div>
                <div style={{ ...labelStyle, marginTop: 6 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{
            width: PREVIEW_W + 28,
            padding: '12px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, color: ui.panelSubtle, marginBottom: 8, letterSpacing: '0.5px' }}>
              FULL PREVIEW
            </div>
            <canvas
              ref={previewRef}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(96,192,255,0.35)',
                background: ui.previewBg,
                display: 'block',
              }}
            />
            <div style={{
              fontSize: 12,
              color: '#60C0FF',
              marginTop: 10,
              textAlign: 'center',
              fontWeight: 700,
            }}>
              editing: {selectedCode}
            </div>
            <div style={{
              marginTop: 10,
              width: '100%',
              fontSize: 11,
              color: ui.panelSubtle,
              lineHeight: 1.55,
              background: theme.id === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
              padding: '8px 10px',
              borderRadius: 5,
            }}>
              {CATEGORIES.map(c => {
                const code = previewParts[CATEGORY_KEYS[c.id]];
                const active = c.id === category;
                return (
                  <div key={c.id} style={{ color: active ? '#A890FF' : ui.panelMuted }}>
                    {c.label}: <span style={{ color: active ? ui.panelText : ui.panelMuted }}>{code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          flex: '0 0 36%',
          minHeight: 150,
          overflowY: 'auto',
          borderTop: `1px solid ${ui.panelDivider}`,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12, color: ui.panelSubtle, letterSpacing: '1px', marginBottom: 8 }}>
            AGENTS IN WORLD ({agentRows.length})
          </div>
          <div style={{ fontSize: 11, color: ui.panelMuted, marginBottom: 10, lineHeight: 1.5 }}>
            Set overrides in AGENTS_DEF e.g.{' '}
            <span style={{ color: '#60C0FF' }}>hairCode: &apos;hair-m-volume&apos;</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: ui.panelMuted, textAlign: 'left', fontSize: 12 }}>
                <th style={{ padding: '6px 4px' }}>Name</th>
                <th>hair</th>
                <th>eyes</th>
                <th>mouth</th>
                <th>shirt</th>
                <th>pants</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map(row => (
                <tr
                  key={row.id}
                  style={{ borderTop: `1px solid ${ui.panelDivider}` }}
                >
                  <td style={{
                    padding: '5px 4px',
                    maxWidth: 88,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: ui.panelText,
                  }}>
                    {row.name}
                  </td>
                  {['hair', 'eyes', 'mouth', 'shirt', 'trousers'].map(key => (
                    <td
                      key={key}
                      style={{
                        padding: '5px 3px',
                        color: row[key] === previewParts[key] ? '#A890FF' : ui.panelMuted,
                        fontWeight: row[key] === previewParts[key] ? 700 : 400,
                      }}
                    >
                      {row[key].replace(/^(hair-[mf]-|eye-|mouth-|shirt-|trouser-)/, '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
