/** Venue + UI palettes. Lights ON = light theme; lights OFF = dark (default). */

export const THEME_DARK = {
  id: 'dark',
  canvasBg: '#080810',
  glowInner: 'rgba(50,30,100,0.12)',
  glowOuter: 'rgba(0,0,0,0)',
  vignetteEnd: 'rgba(0,0,0,0.45)',
  voidTile: '#0E0E1A',
  voidStroke: '#13132A',
  stageAudience: { top: '#14101E', sL: '#0A0814', sR: '#100C18' },
  stagePlatform: {
    top: '#3A2868',
    topFront: '#4E3878',
    sL: '#1C1448',
    sLFront: '#281850',
    sR: '#2C2058',
    sRFront: '#3C2868',
    lip: '#C8A040',
    lipDark: '#8A7028',
  },
  podcastFloor: { top: '#241810', sL: '#140C08', sR: '#1C140C' },
  rooms: {
    stage: { top: '#2D2250', sL: '#1A1438', sR: '#241B44', lc: '#A890FF' },
    floor: { top: '#102838', sL: '#091820', sR: '#0E2035', lc: '#60C0FF' },
    'podcast-nw': { top: '#2E2018', sL: '#1A100C', sR: '#241810', lc: '#FF7A58' },
    'podcast-ne': { top: '#1E2830', sL: '#101820', sR: '#182430', lc: '#38E8C0' },
  },
  ui: {
    pageBg: '#050508',
    color: '#ffffff',
    overlayBg: 'rgba(5,5,12,0.82)',
    overlayBorder: 'rgba(255,255,255,0.08)',
    titleGradient: 'linear-gradient(90deg,#A890FF,#60C0FF)',
    muted: '#555',
    dim: '#444',
    hint: '#333',
    btnInactiveBg: 'rgba(255,255,255,0.03)',
    btnInactiveBorder: 'rgba(255,255,255,0.08)',
    btnInactiveColor: 'rgba(255,255,255,0.55)',
    zoomLabel: '#666',
    modalBackdrop: 'rgba(0,0,0,0.65)',
    modalBg: 'linear-gradient(160deg,#12101C 0%,#0A0812 100%)',
    panelBg: 'linear-gradient(180deg,#12101C 0%,#080810 100%)',
    panelBorder: 'rgba(96,192,255,0.25)',
    previewBg: '#0E0E18',
    panelScrim: 'rgba(0,0,0,0.55)',
    panelDivider: 'rgba(255,255,255,0.06)',
    panelText: '#ddd',
    panelMuted: '#777',
    panelSubtle: '#666',
  },
};

export const THEME_LIGHT = {
  id: 'light',
  canvasBg: '#C8D4E8',
  glowInner: 'rgba(255,255,255,0.55)',
  glowOuter: 'rgba(200,210,230,0)',
  vignetteEnd: 'rgba(140,155,180,0.22)',
  voidTile: '#A8B8D0',
  voidStroke: '#8A9AB8',
  stageAudience: { top: '#B0BCD4', sL: '#98A8C4', sR: '#A4B2CC' },
  stagePlatform: {
    top: '#8A7AB8',
    topFront: '#9A8AC8',
    sL: '#6A5A98',
    sLFront: '#7A6AA8',
    sR: '#7A6AA8',
    sRFront: '#8A7AB8',
    lip: '#E8C860',
    lipDark: '#C8A840',
  },
  podcastFloor: { top: '#C4B0A0', sL: '#B09888', sR: '#BCA898' },
  rooms: {
    stage: { top: '#9A8CC8', sL: '#7A6CB0', sR: '#8A7CB8', lc: '#5A48A0' },
    floor: { top: '#7AA8C8', sL: '#5A88A8', sR: '#6A98B8', lc: '#2868A0' },
    'podcast-nw': { top: '#D4B8A8', sL: '#C0A090', sR: '#CCAC9C', lc: '#C04828' },
    'podcast-ne': { top: '#A8C0D8', sL: '#88A8C8', sR: '#98B8D0', lc: '#188878' },
  },
  ui: {
    pageBg: '#D8E2F0',
    color: '#1A2030',
    overlayBg: 'rgba(255,255,255,0.88)',
    overlayBorder: 'rgba(40,55,90,0.18)',
    titleGradient: 'linear-gradient(90deg,#5A48A0,#2868A0)',
    muted: '#5A6478',
    dim: '#6A7488',
    hint: '#7A8498',
    btnInactiveBg: 'rgba(255,255,255,0.65)',
    btnInactiveBorder: 'rgba(40,55,90,0.15)',
    btnInactiveColor: 'rgba(30,40,60,0.65)',
    zoomLabel: '#5A6478',
    modalBackdrop: 'rgba(30,40,60,0.35)',
    modalBg: 'linear-gradient(160deg,#F4F6FC 0%,#E4EAF4 100%)',
    panelBg: 'linear-gradient(180deg,#F0F4FA 0%,#E0E8F2 100%)',
    panelBorder: 'rgba(40,80,140,0.25)',
    previewBg: '#D0DCEC',
    panelScrim: 'rgba(30,40,60,0.28)',
    panelDivider: 'rgba(40,55,90,0.14)',
    panelText: '#1A2030',
    panelMuted: '#5A6478',
    panelSubtle: '#6A7488',
  },
};

export const themeForLights = lightsOn => (lightsOn ? THEME_LIGHT : THEME_DARK);

export const loadLightsPref = () => {
  try {
    return localStorage.getItem('agentconf-lights') === '1';
  } catch {
    return false;
  }
};
