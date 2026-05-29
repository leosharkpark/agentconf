/** Venue layout, agents, and simulation helpers. */

export const shade = (hex, amt) => {
  if (!hex || !hex.startsWith('#')) return hex || '#888';
  const n = parseInt(hex.replace('#', ''), 16);
  const c = v => Math.max(0, Math.min(255, v));
  return `rgb(${c((n >> 16) + amt)},${c(((n >> 8) & 255) + amt)},${c((n & 255) + amt)})`;
};

const TW=44, TH=22, BH=7, SBH=34;
const NET_COLS=3, NET_ROWS=3, NET_CELL_W=14, NET_CELL_H=11;
const NET_X0=2, NET_Y0=15;
const VENUE_X2=NET_X0+NET_COLS*NET_CELL_W-1;
const PODCAST_PW=9, PODCAST_PH=7, PODCAST_PBH=16;
const PODCAST_NW={
  id:'podcast-nw', name:'Podcast NW', icon:'🎙️', focusId:'podcast-nw',
  x1:1, x2:1+PODCAST_PW, y1:1, y2:1+PODCAST_PH,
  platformX1:3, platformX2:1+PODCAST_PW-3, platformY1:2, platformY2:1+PODCAST_PH-2,
  cx:5.5, cy:4.1, logo:['AGENT','MIC'], accent:'#FF7A58',
  top:'#2E2018', sL:'#1A100C', sR:'#241810', lc:'#FF7A58',
};
const PODCAST_NE={
  id:'podcast-ne', name:'Podcast NE', icon:'🎙️', focusId:'podcast-ne',
  x1:VENUE_X2-PODCAST_PW, x2:VENUE_X2+1, y1:1, y2:1+PODCAST_PH,
  platformX1:VENUE_X2-PODCAST_PW+2, platformX2:VENUE_X2-2, platformY1:2, platformY2:1+PODCAST_PH-2,
  cx:VENUE_X2-PODCAST_PW/2+0.5, cy:4.1, logo:['ROAM','CAST'], accent:'#38E8C0',
  top:'#1E2830', sL:'#101820', sR:'#182430', lc:'#38E8C0',
};
const PODCAST_STUDIOS=[PODCAST_NW, PODCAST_NE];
const STAGE_X1=PODCAST_NW.x2, STAGE_X2=PODCAST_NE.x1;
const STAGE_Y1=2, STAGE_Y2=5;
const STAGE_PLATFORM_X1=STAGE_X1+4, STAGE_PLATFORM_X2=STAGE_X2-4;
const STAGE_CX=(STAGE_X1+STAGE_X2)/2;
const STAGE_ROW=STAGE_Y1+0.5;
const SPONSOR_Y0=NET_Y0+NET_ROWS*NET_CELL_H+1;
const SPONSOR_X2=NET_X0+Math.floor(NET_COLS*NET_CELL_W*0.55);
const GW=VENUE_X2+3, GH=SPONSOR_Y0+9;
const MAIN_DOOR_GX=STAGE_CX;
const MAIN_DOOR_GY=GH-1.85;
const WORLD_W=Math.round((GW+GH)*TW/2+120);
const WORLD_H=Math.round((GW+GH)*TH/2+140);
const OX=Math.round(WORLD_W*0.52), OY=64;
const LAYOUT_VERSION=6;
const MIN_ZOOM=0.55, MAX_ZOOM=4.5, ZOOM_STEP=1.18;

const iso = (gx,gy) => ({ x: OX+(gx-gy)*TW/2, y: OY+(gx+gy)*TH/2 });

const mkView = () => ({
  cw: WORLD_W, ch: WORLD_H, scale: 1, offX: 0, offY: 0, dpr: 1,
});

const mkCamera = () => ({
  zoom: 1, panX: 0, panY: 0,
  targetZoom: 1, targetPanX: 0, targetPanY: 0,
});

const clampZoom = z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

const focusWorldPoint = (cam, gx, gy, zoom) => {
  const { x, y } = iso(gx, gy);
  const z = clampZoom(zoom);
  cam.targetZoom = z;
  cam.targetPanX = WORLD_W / 2 - x * z;
  cam.targetPanY = WORLD_H / 2 - y * z;
};

const screenToWorld = (cam, sx, sy, view) => {
  const wx = (sx - view.offX) / view.scale;
  const wy = (sy - view.offY) / view.scale;
  return {
    x: (wx - cam.panX) / cam.zoom,
    y: (wy - cam.panY) / cam.zoom,
  };
};

const zoomAtScreen = (cam, sx, sy, factor, view) => {
  const w = screenToWorld(cam, sx, sy, view);
  const nz = clampZoom(cam.targetZoom * factor);
  const wx = (sx - view.offX) / view.scale;
  const wy = (sy - view.offY) / view.scale;
  cam.targetZoom = nz;
  cam.targetPanX = wx - w.x * nz;
  cam.targetPanY = wy - w.y * nz;
};

const lerpCamera = cam => {
  const t = 0.14;
  cam.zoom += (cam.targetZoom - cam.zoom) * t;
  cam.panX += (cam.targetPanX - cam.panX) * t;
  cam.panY += (cam.targetPanY - cam.panY) * t;
};

const FOCUS = {
  overview: () => ({ gx: STAGE_CX, gy: NET_Y0+NET_ROWS*NET_CELL_H/2, zoom: 0.62 }),
  stage: () => ({ gx: STAGE_CX, gy: STAGE_Y2 + 0.6, zoom: 1.45 }),
  stageScreen: () => ({ gx: STAGE_CX, gy: STAGE_Y1 + 0.5, zoom: 1.65 }),
  floor: () => ({ gx: STAGE_CX, gy: NET_Y0 + (NET_ROWS * NET_CELL_H) / 2, zoom: 1.35 }),
  podcast: () => ({ gx: PODCAST_NW.cx, gy: PODCAST_NW.cy, zoom: 2.35 }),
  podcastNw: () => ({ gx: PODCAST_NW.cx, gy: PODCAST_NW.cy, zoom: 2.35 }),
  podcastNe: () => ({ gx: PODCAST_NE.cx, gy: PODCAST_NE.cy, zoom: 2.35 }),
  booth: b => ({ gx: b.gx + 0.5, gy: b.gy + 0.5, zoom: 2.65 }),
  door: () => ({ gx: MAIN_DOOR_GX, gy: MAIN_DOOR_GY, zoom: 1.85 }),
};

const DOOR_GX_L = MAIN_DOOR_GX - 2.2;
const DOOR_GX_R = MAIN_DOOR_GX + 2.2;
const DOOR_WALL_GY = Math.floor(MAIN_DOOR_GY);
const DOOR_BLOCK_H = 32;
const DOOR_LINTEL_H = 10;

const doorOutsidePos = () => ({
  x: MAIN_DOOR_GX + (Math.random() - 0.5) * 0.6,
  y: DOOR_WALL_GY + 1.35,
});
const doorInsidePos = () => ({
  x: MAIN_DOOR_GX + (Math.random() - 0.5) * 1.2,
  y: DOOR_WALL_GY - 0.55,
});

// ─── Rooms ────────────────────────────────────────────────────────────────────
const FLOOR_ROOM = {
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

const ROOMS = [
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

const ROOM_LABELS = [...PODCAST_STUDIOS, ...ROOMS];

const boothRoomId = (gx, gy) => roomAt(gx, gy)?.id || 'floor';
const isFloorTile = (gx, gy) => (
  gx >= FLOOR_ROOM.x1 && gx < FLOOR_ROOM.x2
  && gy >= FLOOR_ROOM.y1 && gy < FLOOR_ROOM.y2
);

const worldToBoothPos = (wx, wy) => {
  const rx = wx - OX;
  const ry = wy - OY;
  const u = (ry / TH + rx / (TW / 2)) / 2;
  const v = (ry / TH - rx / (TW / 2)) / 2;
  return {
    gx: Math.max(0, Math.min(GW - 1, u - 0.5)),
    gy: Math.max(0, Math.min(GH - 1, v - 0.5)),
  };
};

const boothCell = (gx, gy) => ({
  ix: Math.round(gx),
  iy: Math.round(gy),
});

const canPlaceBooth = (ix, iy, skipIdx, booths) => {
  if (!isFloorTile(ix, iy)) return false;
  return !booths.some((b, i) => {
    if (i === skipIdx) return false;
    const c = boothCell(b.gx, b.gy);
    return c.ix === ix && c.iy === iy;
  });
};

const hitTestBooth = (wx, wy, booths, zoom = 1) => {
  let best = -1;
  let bestD = Infinity;
  const r2 = (110 / Math.max(zoom, 0.65)) ** 2;
  booths.forEach((b, i) => {
    const p = iso(b.gx + 0.5, b.gy + 0.5);
    const d = (wx - p.x) ** 2 + (wy - p.y) ** 2;
    if (d < bestD && d < r2) { bestD = d; best = i; }
  });
  return best;
};

const moveBoothDrag = (boothIdx, wx, wy, grabDx, grabDy, booths, boothAgents) => {
  const { gx, gy } = worldToBoothPos(wx - grabDx, wy - grabDy);
  const b = booths[boothIdx];
  if (!b) return;
  b.gx = gx;
  b.gy = gy;
  b._d = gx + gy;
  syncBoothAgents(booths, boothAgents);
};

const snapBooth = (boothIdx, booths, fallback) => {
  const b = booths[boothIdx];
  if (!b) return booths;
  const ix = Math.round(b.gx);
  const iy = Math.round(b.gy);
  if (!canPlaceBooth(ix, iy, boothIdx, booths)) {
    b.gx = fallback.gx;
    b.gy = fallback.gy;
  } else {
    b.gx = ix;
    b.gy = iy;
  }
  b._d = b.gx + b.gy;
  return booths;
};

/** Stand beside the booth backdrop so the sign/counter stay readable. */
const boothAgentPos = b => {
  const cx = b.gx + 0.5;
  const cy = b.gy + 0.5;
  const side = b.gx < STAGE_CX ? 1 : -1;
  return { x: cx + side * 1.05, y: cy + 0.12 };
};

const syncBoothAgents = (booths, boothAgents) => {
  if (!boothAgents) return;
  booths.forEach((b, i) => {
    const a = boothAgents[i];
    if (!a) return;
    const { x, y } = boothAgentPos(b);
    a.x = x;
    a.y = y;
    a.tx = x;
    a.ty = y;
    a.roomId = boothRoomId(b.gx, b.gy);
  });
};

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

const loadCardinalsPref = () => {
  try {
    return localStorage.getItem('agentconf-cardinals') !== '0';
  } catch {
    return true;
  }
};

const MAP_MID_GY = (STAGE_Y2 + NET_Y0) / 2;

const CARDINAL_MARKERS = [
  { letter: 'N', name: 'NORTH', hint: 'stage · low gy', gx: STAGE_CX, gy: 0.6, color: '#A890FF' },
  { letter: 'S', name: 'SOUTH', hint: 'entrance · high gy', gx: MAIN_DOOR_GX, gy: GH - 0.25, color: '#90A8FF' },
  { letter: 'E', name: 'EAST', hint: 'high gx', gx: GW - 0.45, gy: MAP_MID_GY, color: '#60C0FF' },
  { letter: 'W', name: 'WEST', hint: 'low gx', gx: 0.45, gy: MAP_MID_GY, color: '#60C0FF' },
];

const loadBoothLayout = () => {
  try {
    if (Number(localStorage.getItem('agentconf-booth-layout-version')) !== LAYOUT_VERSION) return null;
    const saved = JSON.parse(localStorage.getItem('agentconf-booth-layout'));
    if (!Array.isArray(saved)) return null;
    return saved;
  } catch { return null; }
};

const podcastStudioAt = (gx, gy) => PODCAST_STUDIOS.find(s => (
  gx >= s.x1 && gx < s.x2 && gy >= s.y1 && gy < s.y2
)) ?? null;

const isPodcastBounds = (gx, gy) => podcastStudioAt(gx, gy) != null;

const isPodcastPlatform = (gx, gy, studio = podcastStudioAt(gx, gy)) => {
  if (!studio) return false;
  return gx >= studio.platformX1 && gx <= studio.platformX2
    && gy >= studio.platformY1 && gy <= studio.platformY2;
};

const roomAt = (x,y) => {
  const ix=Math.floor(x), iy=Math.floor(y);
  const studio = podcastStudioAt(ix, iy);
  if (studio) return studio;
  return ROOMS.find(r=>ix>=r.x1&&ix<r.x2&&iy>=r.y1&&iy<r.y2)??null;
};
const isStageRoom = (gx, gy) => roomAt(gx, gy)?.id === 'stage';
const isStageTile = (gx, gy) => (
  gx >= STAGE_PLATFORM_X1 && gx <= STAGE_PLATFORM_X2
  && gy >= STAGE_Y1 && gy <= STAGE_Y2
);
const randInStageAudience = () => {
  let x;
  let y;
  do {
    x = STAGE_X1 + 1.2 + Math.random() * (STAGE_X2 - STAGE_X1 - 2.4);
    y = STAGE_Y2 + 1.2 + Math.random() * Math.min(8, NET_Y0 - STAGE_Y2 - 1.5);
  } while (
    isStageTile(Math.floor(x), Math.floor(y))
    || isPodcastBounds(Math.floor(x), Math.floor(y))
  );
  return { x, y };
};

// ─── Static props ─────────────────────────────────────────────────────────────
const INITIAL_BOOTHS = [
  { _type:'booth', gx:6,  gy:NET_Y0+2.5, label:'NordStack', color:'#0A2040', accent:'#60C0FF' },
  { _type:'booth', gx:18, gy:NET_Y0+4,   label:'Patchable', color:'#081A12', accent:'#50E890' },
  { _type:'booth', gx:30, gy:NET_Y0+2.5, label:'Wellnets',  color:'#081820', accent:'#38C8B8' },
  { _type:'booth', gx:38, gy:NET_Y0+6,   label:'Loopbase',  color:'#160E28', accent:'#B068F0' },
  { _type:'booth', gx:10, gy:NET_Y0+NET_CELL_H+2, label:'Vaulted', color:'#160A28', accent:'#D080F0' },
  { _type:'booth', gx:24, gy:NET_Y0+NET_CELL_H+5, label:'Bitshift', color:'#1C1008', accent:'#F09050' },
  { _type:'booth', gx:34, gy:SPONSOR_Y0+2, label:'Bringin',   color:'#161408', accent:'#FFB840' },
  { _type:'booth', gx:20, gy:SPONSOR_Y0+5, label:'Knitling', brand:'knitling',
    tagline:'Knitwear to reconnect to your beautiful self', url:'knitling.com',
    color:'#6A6864', accent:'#F0ECE4', panel:'#C8C4BC' },
].map(b=>({ ...b, _d: b.gx+b.gy }));

const mergeBoothLayout = () => {
  const saved = loadBoothLayout();
  const base = INITIAL_BOOTHS.map(b => ({ ...b, _d: b.gx + b.gy }));
  if (!saved) return base;
  return base.map((def, selfIdx) => {
    const pos = saved.find(s => s.label === def.label);
    if (!pos) return def;
    const trial = base.map((b, i) => (
      i === selfIdx ? { ...b, gx: pos.gx, gy: pos.gy } : { ...b }
    ));
    const { ix, iy } = boothCell(pos.gx, pos.gy);
    if (!canPlaceBooth(ix, iy, selfIdx, trial)) return def;
    return { ...def, gx: pos.gx, gy: pos.gy, _d: pos.gx + pos.gy };
  });
};

// ─── Characters ───────────────────────────────────────────────────────────────
const AGENTS_DEF = [
  {name:'Alex K.', title:'Founder & CEO', bio:'Building B2B automation tools for Estonian SMEs. Looking for integration partners and pilot customers in logistics.', linkedin:'https://www.linkedin.com/in/alex-karlsson', color:'#FF7070', skin:'#F4C8A0', hair:'#1A0C04', pants:'#1A2A3A'},
  {name:'Sam R.', title:'Freelance Developer', bio:'Full-stack contractor specialising in React and Node. Open to long-term retainer work with agencies and product teams.', linkedin:'https://www.linkedin.com/in/sam-rajasalu', color:'#40D4CC', skin:'#C8783C', hair:'#4A2008', pants:'#221515'},
  {name:'Mia T.', title:'Marketing Consultant', bio:'Helps B2B startups clarify positioning and run LinkedIn-led outbound. Seeking SaaS clients ready to scale past €50k MRR.', linkedin:'https://www.linkedin.com/in/mia-tamm', color:'#60B8E8', skin:'#F0D0B0', hair:'#1A1018', pants:'#2A2848', feminine:true},
  {name:'Leo M.', title:'Product Designer', bio:'UX/UI for fintech and health apps. Interested in design-system audits and fractional lead roles for early-stage teams.', linkedin:'https://www.linkedin.com/in/leo-mets', color:'#70D870', skin:'#C07840', hair:'#120800', pants:'#0A1A0A'},
  {name:'Eva S.', title:'Accountant & Advisor', bio:'Virtual CFO services for freelancers and micro-agencies. Focus on e-residency companies and cross-border VAT.', linkedin:'https://www.linkedin.com/in/eva-sild', color:'#F4B030', skin:'#F4C8A8', hair:'#8A5020', pants:'#3A2030', feminine:true},
  {name:'Max B.', title:'AI Engineer', bio:'Ships LLM features into production — RAG, agents, evals. Wants to meet founders with real workflow pain, not demo bait.', linkedin:'https://www.linkedin.com/in/max-bauer', color:'#D080F0', skin:'#F0D0B8', hair:'#280050', pants:'#140820'},
  {name:'Zoe P.', title:'Content Strategist', bio:'Newsletters, case studies, and technical storytelling for devtools. Looking for brands that want depth over hype.', linkedin:'https://www.linkedin.com/in/zoe-park', color:'#50DCC0', skin:'#E8B888', hair:'#B83818', pants:'#1A2838', feminine:true},
  {name:'Tom W.', title:'Sales Lead', bio:'Outbound and partnership development for IT services firms. Hunting introducers to mid-market buyers in the Nordics.', linkedin:'https://www.linkedin.com/in/tom-wilson', color:'#F09050', skin:'#A86030', hair:'#080808', pants:'#201000'},
  {name:'Ana L.', title:'HR & People Ops', bio:'Fractional HR for teams of 5–30. Policies, hiring, and remote culture — especially for fast-growing Estonian startups.', linkedin:'https://www.linkedin.com/in/ana-lille', color:'#B068F0', skin:'#F4C8A0', hair:'#2A1438', pants:'#281038', feminine:true},
  {name:'Jan V.', title:'DevOps Consultant', bio:'AWS, Kubernetes, and CI/CD hardening. Available for rescue projects and platform engineering retainers.', linkedin:'https://www.linkedin.com/in/jan-vaino', color:'#38C8B8', skin:'#D89058', hair:'#182C18', pants:'#082018'},
  {name:'Kai O.', title:'Brand Photographer', bio:'Commercial shoots for tech companies and founders. Seeking retainer clients who need consistent visual identity.', linkedin:'https://www.linkedin.com/in/kai-ots', color:'#F05878', skin:'#F8D0B0', hair:'#AA0818', pants:'#180606'},
  {name:'Nia F.', title:'Data Analyst', bio:'Dashboards, funnel analysis, and light ML for e-commerce. Wants projects where data actually changes decisions weekly.', linkedin:'https://www.linkedin.com/in/nia-frost', color:'#6090F0', skin:'#E8C088', hair:'#2A1848', pants:'#121830', feminine:true},
  {name:'Otto P.', title:'Legal Counsel', bio:'Startup contracts, IP, and GDPR for SaaS. Advises founders before fundraising or entering new EU markets.', linkedin:'https://www.linkedin.com/in/otto-paju', color:'#88A0B8', skin:'#F0D0B8', hair:'#303028', pants:'#1A2030'},
  {name:'Rita N.', title:'Community Manager', bio:'Runs Discord and Slack communities for devtools. Looking for brands that want authentic developer engagement.', linkedin:'https://www.linkedin.com/in/rita-nurmi', color:'#F070A0', skin:'#F4C8A8', hair:'#6A2010', pants:'#281018', feminine:true},
  {name:'Viktor L.', title:'Security Engineer', bio:'Pentests and secure SDLC for fintech. Open to retainer work for teams shipping their first production API.', linkedin:'https://www.linkedin.com/in/viktor-laur', color:'#48B850', skin:'#D8A070', hair:'#181810', pants:'#0C180C'},
  {name:'Helen R.', title:'UX Researcher', bio:'Interviews, usability tests, and journey maps for B2B products. Works with founders who need evidence before redesign.', linkedin:'https://www.linkedin.com/in/helen-rohtla', color:'#C8A0FF', skin:'#F4C8A0', hair:'#3A2848', pants:'#201828', feminine:true},
  {name:'Marko S.', title:'Video Producer', bio:'Explainers, conference recaps, and social clips for tech brands. Based in Tallinn, travels in the Baltics.', linkedin:'https://www.linkedin.com/in/marko-saar', color:'#E87848', skin:'#C07840', hair:'#101008', pants:'#201008'},
  {name:'Liis M.', title:'Talent Scout', bio:'Places senior engineers and product leads in Nordic startups. Strong network in climate and deeptech.', linkedin:'https://www.linkedin.com/in/liis-mand', color:'#58D8E8', skin:'#F0D0B0', hair:'#8A4818', pants:'#102830', feminine:true},
  {name:'Chris D.', title:'No-Code Builder', bio:'Ships internal tools on Airtable, Notion, and Make. Helps ops teams without hiring another developer.', linkedin:'https://www.linkedin.com/in/chris-dunn', color:'#A8B840', skin:'#F8D0B0', hair:'#283018', pants:'#182010'},
  {name:'Sofia G.', title:'PR Consultant', bio:'Media relations for B2B SaaS in Europe. Pitching podcasts, trade press, and local tech outlets.', linkedin:'https://www.linkedin.com/in/sofia-granholm', color:'#FF88C0', skin:'#F4C8A8', hair:'#C02818', pants:'#301820', feminine:true},
  {name:'Henri V.', title:'Solutions Architect', bio:'Designs cloud reference architectures for scale-ups. AWS and GCP, with cost governance baked in.', linkedin:'https://www.linkedin.com/in/henri-vaik', color:'#7098FF', skin:'#E8C088', hair:'#102040', pants:'#0A1428'},
  {name:'Kati J.', title:'Event Producer', bio:'Runs hybrid conferences and meetups. Here to study how agent-native events change attendee flow.', linkedin:'https://www.linkedin.com/in/kati-jogi', color:'#FFB850', skin:'#F4C8A0', hair:'#4A3010', pants:'#281808', feminine:true},
];

const SPAWNABLE_AGENTS = [
  {name:'Guest A.', title:'Conference Visitor', bio:'Just arrived at AgentConf. Open to introductions across the networking zones.', linkedin:'https://www.linkedin.com/in/guest-agentconf', color:'#90A8FF', skin:'#F0D0B0', hair:'#201810', pants:'#1A2438'},
  {name:'Guest B.', title:'Independent Consultant', bio:'Exploring partners in automation and AI ops for mid-market companies.', linkedin:'https://www.linkedin.com/in/guest-b-agentconf', color:'#68E8A0', skin:'#E8C090', hair:'#303018', pants:'#102018'},
  {name:'Guest C.', title:'Startup Founder', bio:'Pre-seed B2B SaaS. Looking for design partners and first paying logos in the Baltics.', linkedin:'https://www.linkedin.com/in/guest-c-agentconf', color:'#F0A060', skin:'#F4C8A8', hair:'#581808', pants:'#281008', feminine:true},
  {name:'Guest D.', title:'Recruiter', bio:'Hiring senior engineers for a remote-first product team. Collecting warm leads today.', linkedin:'https://www.linkedin.com/in/guest-d-agentconf', color:'#C090FF', skin:'#D8A878', hair:'#181828', pants:'#181028'},
  {name:'Guest E.', title:'Investor Scout', bio:'Angel checks on devtools and workflow startups. Prefers short, specific pitches.', linkedin:'https://www.linkedin.com/in/guest-e-agentconf', color:'#58C8E0', skin:'#F8D8B8', hair:'#102030', pants:'#0A1828'},
  {name:'Guest F.', title:'Technical Writer', bio:'Docs and tutorials for API-first products. Seeking long-term content retainers.', linkedin:'https://www.linkedin.com/in/guest-f-agentconf', color:'#E87898', skin:'#F4C8A0', hair:'#6A1828', pants:'#301820', feminine:true},
];
const SPEAKER_DEF = {
  name:'Dr. Sarah K.', title:'Keynote Speaker · Future of Work',
  bio:'Research lead on AI-mediated professional networks. Today: how agent-to-agent conferences reshape B2B discovery for solo operators.',
  linkedin:'https://www.linkedin.com/in/sarah-kask', color:'#FFE060', skin:'#F0D4B0', hair:'#2A1410', pants:'#2A2840', feminine:true, hairStyle:2,
};
const BOOTH_DEFS  = [
  {name:'Marco B.', title:'Solutions Engineer · NordStack', bio:'Cloud infra for Baltic startups — EU residency, predictable pricing. Ask me about migration off legacy VPS.', linkedin:'https://www.linkedin.com/in/marco-bert', color:'#60C0FF', skin:'#F4C0A0', hair:'#100A04', pants:'#0A1828'},
  {name:'Lisa K.', title:'Head of Growth · Patchable', bio:'No-code integrations for ops teams. I match attendees whose agents flagged workflow automation as a priority.', linkedin:'https://www.linkedin.com/in/lisa-kangro', color:'#50E890', skin:'#C0703A', hair:'#4A2810', pants:'#142818', feminine:true},
  {name:'Riku H.', title:'Founder · Vaulted', bio:'Encrypted client portals for agencies. If you share sensitive deliverables, let\'s compare notes on zero-knowledge file share.', linkedin:'https://www.linkedin.com/in/riku-hein', color:'#D080F0', skin:'#F0D0B8', hair:'#060628', pants:'#100818'},
  {name:'Aino V.', title:'Customer Success · Wellnets', bio:'Wellness benefits platform for remote teams. Perfect for agencies hiring across borders — 10-min demo slots open.', linkedin:'https://www.linkedin.com/in/aino-vaher', color:'#38C8B8', skin:'#D89060', hair:'#281008', pants:'#102020', feminine:true},
  {name:'Taavi M.', title:'Product Lead · Loopbase', bio:'CRM that syncs from email and calendar only — no manual data entry. Looking for design partners in professional services.', linkedin:'https://www.linkedin.com/in/taavi-magi', color:'#B068F0', skin:'#F4C8A0', hair:'#500060', pants:'#100818'},
  {name:'Piret L.', title:'Developer Advocate · Bitshift', bio:'Open-source observability for small teams. I help founders instrument their first production app without a platform team.', linkedin:'https://www.linkedin.com/in/piret-luik', color:'#F09050', skin:'#E8B880', hair:'#1A1038', pants:'#281018', feminine:true},
  {name:'Jaan K.', title:'Partnerships · Bringin', bio:'Cross-border invoicing and contractor payments in EUR. If you hire Estonian freelancers abroad, I can cut fee drag.', linkedin:'https://www.linkedin.com/in/jaan-kivi', color:'#FFB840', skin:'#F4C8A8', hair:'#080808', pants:'#181208'},
  {name:'Linda Ling', title:'Founder · Knitling', bio:'Knitwear to reconnect to your beautiful self. I build Knitling around premium cozy knit pieces — here to explore wholesale, retail partnerships, and creative collaborations.', linkedin:'https://www.linkedin.com/in/linda-ling', website:'https://knitling.com', color:'#E8E4DC', skin:'#EDDCC8', hair:'#C8B888', pants:'#E0D8D0', feminine:true},
];

const PODCAST_ID_BASE = 110;
const PODCAST_DEFS = [
  {
    name:'Markus V.', title:'Host · Agent Mic',
    bio:'Weekly show on agent-native work, founder stories, and tools that actually ship. Recording live from AgentConf.',
    linkedin:'https://www.linkedin.com/in/markus-vool', color:'#FF6B4A', skin:'#F0D0B0', hair:'#1A1010', pants:'#281818',
  },
  {
    name:'Ines L.', title:'Co-host · Agent Mic', feminine:true,
    bio:'Interviews operators and builders on the Baltics tech scene. Agent Mic — honest conversations, no hype.',
    linkedin:'https://www.linkedin.com/in/ines-luik', color:'#38E8C0', skin:'#F4C8A8', hair:'#3A2018', pants:'#1A2830',
  },
  {
    name:'Oskar T.', title:'Host · Roamcast', bio:'Deep dives on remote work, async teams, and agent tooling for distributed companies.',
    linkedin:'https://www.linkedin.com/in/oskar-tamm', color:'#60C0FF', skin:'#E8C090', hair:'#182028', pants:'#142030',
  },
  {
    name:'Liis K.', title:'Co-host · Roamcast', feminine:true,
    bio:'Roamcast records live at AgentConf — stories from founders building across time zones.',
    linkedin:'https://www.linkedin.com/in/liis-kask', color:'#B080F0', skin:'#F4C8A0', hair:'#4A2818', pants:'#201828',
  },
];

const podcastHostPositions = studio => [
  { x: studio.cx - 1.35, y: studio.cy + 0.55, faceDir: 1 },
  { x: studio.cx + 1.35, y: studio.cy + 0.55, faceDir: -1 },
];
const PODCAST_CHAT_LINES = [
  'So tell us how you found AgentConf…',
  'What surprised you this week?',
  'Let\'s unpack that workflow.',
  '◈ Recording now',
];

const randInRoom = r => ({
  x: r.x1+1+Math.random()*(r.x2-r.x1-2),
  y: r.y1+1+Math.random()*(r.y2-r.y1-2),
});

const MEET_DIST_SQ = 3.8;
const BOOTH_MEET_DIST_SQ = 5.5;
const FPS_ASSUME = 60;
const TALK_MAX_FRAMES = 300;
const TALK_COOLDOWN_FRAMES = 10 * FPS_ASSUME;
const WATCH_MAX_FRAMES = 600;

const NETWORKING_LINES = [
  'Great to connect!',
  'Swapping intros…',
  'Any collab ideas?',
  'Love your agent profile.',
  'Let\'s follow up after.',
  'Heard good things about you.',
];
const BOOTH_CHAT_LINES = [
  'Tell me about your booth.',
  'What do you offer teams?',
  'Got time for a quick demo?',
  'This looks interesting!',
  'Who should I refer to you?',
];
const PRESENTATION_LINES = [
  'Watching keynote…',
  'Following the talk…',
  '◈ Live session',
  'Taking notes…',
];

const pickTalkMsg = (a, b) => {
  const booth = a.id >= 100 ? a : b.id >= 100 ? b : null;
  if (booth) {
    const pitch = booth.title?.split('·')[1]?.trim() || booth.title?.split('·')[0]?.trim();
    if (pitch && Math.random() < 0.45) return pitch.length > 34 ? `${pitch.slice(0, 31)}…` : pitch;
    return BOOTH_CHAT_LINES[Math.floor(Math.random() * BOOTH_CHAT_LINES.length)];
  }
  return NETWORKING_LINES[Math.floor(Math.random() * NETWORKING_LINES.length)];
};

const talkDuration = () => Math.min(
  TALK_MAX_FRAMES,
  Math.floor((2 + Math.random() * 3) * FPS_ASSUME),
);

const watchDuration = () => Math.min(
  WATCH_MAX_FRAMES,
  Math.floor((5 + Math.random() * 5) * FPS_ASSUME),
);

const startConversation = (a, b) => {
  const dur = talkDuration();
  const msg = pickTalkMsg(a, b);
  a.meeting = b.id;
  b.meeting = a.id;
  a.talkTimer = dur;
  b.talkTimer = dur;
  a.talkMsg = msg;
  b.talkMsg = msg;
  a.tx = a.x;
  a.ty = a.y;
  if (!b.isStatic) {
    b.tx = b.x;
    b.ty = b.y;
  }
  if (!a.isStatic) {
    a.tx = a.x;
    a.ty = a.y;
  }
};

const mkAgent = (id,def,x,y,opts={}) => ({
  id, ...def, x, y, tx:x, ty:y,
  speed: 0.01 + Math.random() * 0.005,
  roomId: ROOMS[id%ROOMS.length]?.id||'stage',
  waitTimer:Math.floor(Math.random()*150),
  meeting:-1, talkTimer:0, talkMsg:'', talkCooldown:0,
  watchTimer:0, watchMsg:'', goal:'roam', faceDir:1,
  _type:'agent', ...opts
});

const initAll = (booths) => {
  const regular = AGENTS_DEF.map((d, i) => {
    const pos = randInRoom(FLOOR_ROOM);
    return mkAgent(i, d, pos.x, pos.y, { roomId: 'floor' });
  });
  const speaker = mkAgent(99, SPEAKER_DEF, STAGE_CX, STAGE_Y2 - 0.25, {
    isStatic: true, roomId: 'stage',
  });
  const booth   = booths.map((b,i)=>{
    const { x, y } = boothAgentPos(b);
    return mkAgent(100+i, BOOTH_DEFS[i], x, y, {
      isStatic:true, roomId:boothRoomId(b.gx, b.gy),
    });
  });
  const podcast = [];
  PODCAST_STUDIOS.forEach((studio, si) => {
    const hosts = podcastHostPositions(studio);
    [0, 1].forEach(hi => {
      const def = PODCAST_DEFS[si * 2 + hi];
      const pos = hosts[hi];
      podcast.push(mkAgent(PODCAST_ID_BASE + si * 2 + hi, def, pos.x, pos.y, {
        isStatic: true,
        roomId: studio.id,
        faceDir: pos.faceDir,
        studioId: studio.id,
      }));
    });
    const a = podcast[podcast.length - 2];
    const b = podcast[podcast.length - 1];
    const msg = PODCAST_CHAT_LINES[Math.floor(Math.random() * PODCAST_CHAT_LINES.length)];
    const dur = Math.min(TALK_MAX_FRAMES, 8 * FPS_ASSUME);
    a.meeting = b.id;
    b.meeting = a.id;
    a.talkTimer = dur;
    b.talkTimer = dur;
    a.talkMsg = msg;
    b.talkMsg = msg;
  });
  return { regular, speaker, booth, podcast, nextId: AGENTS_DEF.length };
};

export const agentScale = a => 0.94 + ((a.id * 17) % 13) * 0.012;
export const AGENT_BODY_H = 28;
export const agentBodyH = () => AGENT_BODY_H;

export function platformLift(a) {
  const gx = Math.floor(a.x);
  const gy = Math.floor(a.y);
  if (isStageTile(gx, gy)) return SBH;
  const studio = podcastStudioAt(gx, gy);
  if (studio && isPodcastPlatform(gx, gy, studio)) return PODCAST_PBH;
  return 0;
}

/** Feet on the floor plane (for culling / hit tests). */
export function feetBase(a) {
  const { x, y } = iso(a.x, a.y);
  return { x, y: y + TH / 2 };
}

export function feetPos(a) {
  const base = feetBase(a);
  const lift = platformLift(a);
  return { x: base.x, y: base.y - lift, lift };
}

export function getDef(a) {
  if (a.id === 99) return SPEAKER_DEF;
  if (a.id >= PODCAST_ID_BASE && a.id < PODCAST_ID_BASE + PODCAST_DEFS.length) {
    return PODCAST_DEFS[a.id - PODCAST_ID_BASE] ?? PODCAST_DEFS[0];
  }
  if (a.id >= 100) return BOOTH_DEFS[a.id - 100] || BOOTH_DEFS[0];
  if (a.id >= AGENTS_DEF.length && a.name) return a;
  return AGENTS_DEF[a.id] || AGENTS_DEF[0];
}

export const profileFromAgent = a => {
  const d = getDef(a);
  return {
    id: a.id,
    name: d.name,
    title: d.title || 'Conference attendee',
    bio: d.bio || '',
    linkedin: d.linkedin || '',
    website: d.website || '',
    color: a.color || d.color,
  };
};

export const hitTestAgent = (wx, wy, agents) => {
  const sorted = [...agents].sort((a, b) => (b.x + b.y) - (a.x + a.y));
  for (const a of sorted) {
    const p = feetPos(a);
    const top = p.y - AGENT_BODY_H;
    if (wx >= p.x - 14 && wx <= p.x + 14 && wy >= top && wy <= p.y + 6) return a;
  }
  return null;
};

export const updateAgentFacing = (a, others) => {
  const dx = a.tx - a.x;
  const dy = a.ty - a.y;
  if (dx * dx + dy * dy > 0.004) {
    a.faceDir = dx >= 0 ? 1 : -1;
    return;
  }
  if (a.meeting >= 0) {
    const p = others.find(o => o.id === a.meeting);
    if (p) a.faceDir = p.x >= a.x ? 1 : -1;
  }
};

export const roomDrawColors = (room, theme) => {
  if (!room) return null;
  return theme.rooms[room.id] ?? {
    top: room.top,
    sL: room.sL,
    sR: room.sR,
    lc: room.lc,
  };
};

export {
  TW, TH, BH, SBH, PODCAST_PBH, GW, GH, WORLD_W, WORLD_H, OX, OY,
  LAYOUT_VERSION, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP,
  NET_Y0, NET_ROWS, NET_CELL_H, STAGE_X1, STAGE_X2, STAGE_Y1, STAGE_Y2,
  STAGE_PLATFORM_X1, STAGE_PLATFORM_X2, STAGE_CX, MAIN_DOOR_GX, MAIN_DOOR_GY,
  PODCAST_STUDIOS, PODCAST_NW, PODCAST_NE, VENUE_X2,
  iso, mkView, mkCamera, clampZoom, focusWorldPoint, screenToWorld, zoomAtScreen, lerpCamera,
  FOCUS, DOOR_GX_L, DOOR_GX_R, DOOR_WALL_GY, DOOR_BLOCK_H, DOOR_LINTEL_H,
  doorOutsidePos, doorInsidePos,
  ROOMS, ROOM_LABELS, FLOOR_ROOM, INITIAL_BOOTHS,
  AGENTS_DEF, SPAWNABLE_AGENTS, SPEAKER_DEF, BOOTH_DEFS, PODCAST_DEFS, PODCAST_ID_BASE,
  PODCAST_CHAT_LINES, CARDINAL_MARKERS, MAP_MID_GY,
  mergeBoothLayout, initAll, mkAgent,
  boothRoomId, isFloorTile, worldToBoothPos, hitTestBooth, moveBoothDrag, snapBooth, syncBoothAgents,
  canPlaceBooth, podcastStudioAt, isPodcastBounds, isPodcastPlatform, roomAt, isStageRoom, isStageTile,
  randInStageAudience, randInRoom,
  MEET_DIST_SQ, BOOTH_MEET_DIST_SQ, FPS_ASSUME, TALK_MAX_FRAMES, TALK_COOLDOWN_FRAMES, WATCH_MAX_FRAMES,
  NETWORKING_LINES, BOOTH_CHAT_LINES, PRESENTATION_LINES,
  startConversation, pickTalkMsg, talkDuration, watchDuration,
};

export const resizeView = (view) => {
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const scale = Math.max(cw / WORLD_W, ch / WORLD_H);
  view.cw = cw;
  view.ch = ch;
  view.scale = scale;
  view.offX = (cw - WORLD_W * scale) / 2;
  view.offY = (ch - WORLD_H * scale) / 2;
  view.dpr = dpr;
};
