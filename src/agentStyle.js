/** Global agent appearance: Kenney modular rig vs simple color sprites. */

export const AGENT_RENDER_STYLES = [
  { id: 'kenney', label: 'Kenney' },
  { id: 'colored', label: 'Simple (colors)' },
];

const STORAGE_KEY = 'agentconf-agent-style';

function load() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'colored' || v === 'kenney') return v;
  } catch { /* noop */ }
  return 'kenney';
}

let style = load();
let version = 0;

export function getAgentRenderStyle() {
  return style;
}

export function getAgentRenderStyleVersion() {
  return version;
}

export function setAgentRenderStyle(id) {
  if (!AGENT_RENDER_STYLES.some((s) => s.id === id)) return;
  style = id;
  version += 1;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* noop */ }
}

export function isKenneyRenderStyle() {
  return style === 'kenney';
}
