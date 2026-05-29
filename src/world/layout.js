/** Venue grid layout — shared by Canvas and Three.js renderers. */

export const TW = 44;
export const TH = 22;
export const BH = 7;
export const SBH = 34;
export const PODCAST_PBH = 16;

export const NET_COLS = 3;
export const NET_ROWS = 3;
export const NET_CELL_W = 14;
export const NET_CELL_H = 11;
export const NET_X0 = 2;
export const NET_Y0 = 15;
export const VENUE_X2 = NET_X0 + NET_COLS * NET_CELL_W - 1;

export const PODCAST_PW = 9;
export const PODCAST_PH = 7;

export const PODCAST_NW = {
  id: 'podcast-nw',
  name: 'Podcast NW',
  icon: '🎙️',
  focusId: 'podcast-nw',
  x1: 1,
  x2: 1 + PODCAST_PW,
  y1: 1,
  y2: 1 + PODCAST_PH,
  platformX1: 3,
  platformX2: 1 + PODCAST_PW - 3,
  platformY1: 2,
  platformY2: 1 + PODCAST_PH - 2,
  cx: 5.5,
  cy: 4.1,
  logo: ['AGENT', 'MIC'],
  accent: '#FF7A58',
  top: '#2E2018',
  sL: '#1A100C',
  sR: '#241810',
  lc: '#FF7A58',
};

export const PODCAST_NE = {
  id: 'podcast-ne',
  name: 'Podcast NE',
  icon: '🎙️',
  focusId: 'podcast-ne',
  x1: VENUE_X2 - PODCAST_PW,
  x2: VENUE_X2 + 1,
  y1: 1,
  y2: 1 + PODCAST_PH,
  platformX1: VENUE_X2 - PODCAST_PW + 2,
  platformX2: VENUE_X2 - 2,
  platformY1: 2,
  platformY2: 1 + PODCAST_PH - 2,
  cx: VENUE_X2 - PODCAST_PW / 2 + 0.5,
  cy: 4.1,
  logo: ['ROAM', 'CAST'],
  accent: '#38E8C0',
  top: '#1E2830',
  sL: '#101820',
  sR: '#182430',
  lc: '#38E8C0',
};

export const PODCAST_STUDIOS = [PODCAST_NW, PODCAST_NE];

export const STAGE_X1 = PODCAST_NW.x2;
export const STAGE_X2 = PODCAST_NE.x1;
export const STAGE_Y1 = 2;
export const STAGE_Y2 = 5;
export const STAGE_PLATFORM_X1 = STAGE_X1 + 4;
export const STAGE_PLATFORM_X2 = STAGE_X2 - 4;
export const STAGE_CX = (STAGE_X1 + STAGE_X2) / 2;

export const SPONSOR_Y0 = NET_Y0 + NET_ROWS * NET_CELL_H + 1;
export const GW = VENUE_X2 + 3;
export const GH = SPONSOR_Y0 + 9;

export const MAIN_DOOR_GX = STAGE_CX;
export const MAIN_DOOR_GY = GH - 1.85;

export const LAYOUT_VERSION = 6;
export const MIN_ZOOM = 0.55;
export const MAX_ZOOM = 4.5;
export const ZOOM_STEP = 1.18;

export const FLOOR_ROOM = {
  id: 'floor',
  name: 'Exhibition Floor',
  icon: '🏛️',
  x1: 0,
  y1: STAGE_Y2 + 1,
  x2: GW,
  y2: GH,
  top: '#102838',
  sL: '#091820',
  sR: '#0E2035',
  lc: '#60C0FF',
};

export const ROOMS = [
  {
    id: 'stage',
    name: 'Main Stage',
    icon: '🎤',
    x1: STAGE_X1,
    y1: 1,
    x2: STAGE_X2 + 1,
    y2: STAGE_Y2 + 1,
    top: '#2D2250',
    sL: '#1A1438',
    sR: '#241B44',
    lc: '#A890FF',
  },
  FLOOR_ROOM,
];

export const ROOM_LABELS = [...PODCAST_STUDIOS, ...ROOMS];

export const FOCUS = {
  overview: () => ({ gx: STAGE_CX, gy: NET_Y0 + (NET_ROWS * NET_CELL_H) / 2, zoom: 0.62 }),
  stage: () => ({ gx: STAGE_CX, gy: STAGE_Y2 + 0.6, zoom: 1.45 }),
  stageScreen: () => ({ gx: STAGE_CX, gy: STAGE_Y1 + 0.5, zoom: 1.65 }),
  floor: () => ({ gx: STAGE_CX, gy: NET_Y0 + (NET_ROWS * NET_CELL_H) / 2, zoom: 1.35 }),
  podcastNw: () => ({ gx: PODCAST_NW.cx, gy: PODCAST_NW.cy, zoom: 2.35 }),
  podcastNe: () => ({ gx: PODCAST_NE.cx, gy: PODCAST_NE.cy, zoom: 2.35 }),
  booth: b => ({ gx: b.gx + 0.5, gy: b.gy + 0.5, zoom: 2.65 }),
  door: () => ({ gx: MAIN_DOOR_GX, gy: MAIN_DOOR_GY, zoom: 1.85 }),
};

export const podcastStudioAt = (gx, gy) => PODCAST_STUDIOS.find(s => (
  gx >= s.x1 && gx < s.x2 && gy >= s.y1 && gy < s.y2
)) ?? null;

export const isPodcastBounds = (gx, gy) => podcastStudioAt(gx, gy) != null;

export const roomAt = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const studio = podcastStudioAt(ix, iy);
  if (studio) return studio;
  return ROOMS.find(r => ix >= r.x1 && ix < r.x2 && iy >= r.y1 && iy < r.y2) ?? null;
};

export const isStageTile = (gx, gy) => (
  gx >= STAGE_PLATFORM_X1 && gx <= STAGE_PLATFORM_X2
  && gy >= STAGE_Y1 && gy <= STAGE_Y2
);

export const isFloorTile = (gx, gy) => (
  gx >= FLOOR_ROOM.x1 && gx < FLOOR_ROOM.x2
  && gy >= FLOOR_ROOM.y1 && gy < FLOOR_ROOM.y2
);
