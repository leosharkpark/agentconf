import { useState, useEffect, useRef } from "react";

const TW=44, TH=22, BH=7, SBH=24;
const NET_COLS=3, NET_ROWS=3, NET_CELL_W=14, NET_CELL_H=11;
const NET_X0=2, NET_Y0=15;
const STAGE_X1=NET_X0, STAGE_X2=NET_X0+NET_COLS*NET_CELL_W-1;
const STAGE_Y1=2, STAGE_Y2=5;
const STAGE_PLATFORM_X1=STAGE_X1+4, STAGE_PLATFORM_X2=STAGE_X2-4;
const STAGE_CX=(STAGE_X1+STAGE_X2)/2;
const STAGE_ROW=STAGE_Y1+0.5;
const SPONSOR_Y0=NET_Y0+NET_ROWS*NET_CELL_H+1;
const SPONSOR_X2=NET_X0+Math.floor(NET_COLS*NET_CELL_W*0.55);
const GW=STAGE_X2+3, GH=SPONSOR_Y0+9;
const MAIN_DOOR_GX=STAGE_CX;
const MAIN_DOOR_GY=GH-1.85;
const WORLD_W=Math.round((GW+GH)*TW/2+120);
const WORLD_H=Math.round((GW+GH)*TH/2+140);
const OX=Math.round(WORLD_W*0.52), OY=64;
const LAYOUT_VERSION=5;
const MIN_ZOOM=0.55, MAX_ZOOM=4.5, ZOOM_STEP=1.18;

const iso = (gx,gy) => ({ x: OX+(gx-gy)*TW/2, y: OY+(gx+gy)*TH/2 });

const mkView = () => ({
  cw: WORLD_W, ch: WORLD_H, scale: 1, offX: 0, offY: 0, dpr: 1,
});

const resizeView = (canvas, view) => {
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.max(cw / WORLD_W, ch / WORLD_H);
  view.cw = cw;
  view.ch = ch;
  view.scale = scale;
  view.offX = (cw - WORLD_W * scale) / 2;
  view.offY = (ch - WORLD_H * scale) / 2;
  view.dpr = dpr;
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
};

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

const shade = (hex,amt) => {
  if (!hex||!hex.startsWith('#')) return hex||'#888';
  const n=parseInt(hex.replace('#',''),16), c=v=>Math.max(0,Math.min(255,v));
  return `rgb(${c((n>>16)+amt)},${c(((n>>8)&255)+amt)},${c((n&255)+amt)})`;
};

// ─── Rooms ────────────────────────────────────────────────────────────────────
const FLOOR_ROOM = {
  id: 'floor',
  name: 'Exhibition Floor',
  icon: '🏛️',
  x1: STAGE_X1,
  y1: NET_Y0,
  x2: STAGE_X2 + 1,
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
    y2: NET_Y0,
    top: '#2D2250',
    sL: '#1A1438',
    sR: '#241B44',
    lc: '#A890FF',
  },
  FLOOR_ROOM,
];

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

const loadBoothLayout = () => {
  try {
    if (Number(localStorage.getItem('agentconf-booth-layout-version')) !== LAYOUT_VERSION) return null;
    const saved = JSON.parse(localStorage.getItem('agentconf-booth-layout'));
    if (!Array.isArray(saved)) return null;
    return saved;
  } catch { return null; }
};

const roomAt = (x,y) => {
  const ix=Math.floor(x), iy=Math.floor(y);
  return ROOMS.find(r=>ix>=r.x1&&ix<r.x2&&iy>=r.y1&&iy<r.y2)??null;
};
const isStageRoom = (gx, gy) => roomAt(gx, gy)?.id === 'stage';
const isStageTile = (gx, gy) => (
  gx >= STAGE_PLATFORM_X1 && gx <= STAGE_PLATFORM_X2
  && gy >= STAGE_Y1 && gy <= STAGE_Y2
);
const isStageAudience = (gx, gy) => isStageRoom(gx, gy) && !isStageTile(gx, gy);

const randInStageAudience = () => {
  let x;
  let y;
  do {
    x = STAGE_X1 + 1.2 + Math.random() * (STAGE_X2 - STAGE_X1 - 2.4);
    y = STAGE_Y2 + 1.2 + Math.random() * (NET_Y0 - STAGE_Y2 - 2.2);
  } while (isStageTile(Math.floor(x), Math.floor(y)));
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

const PLANTS = [
  { _type:'plant', gx:1, gy:NET_Y0+2, kind:'tall' },
  { _type:'plant', gx:STAGE_X2+1, gy:NET_Y0+2, kind:'tall' },
  { _type:'plant', gx:NET_X0+NET_CELL_W-0.5, gy:NET_Y0+3, kind:'fern' },
  { _type:'plant', gx:NET_X0+NET_CELL_W*2-0.5, gy:NET_Y0+3, kind:'fern' },
  { _type:'plant', gx:NET_X0+NET_CELL_W*2-0.5, gy:NET_Y0+NET_CELL_H+3, kind:'fern' },
  { _type:'plant', gx:NET_X0+NET_CELL_W-0.5, gy:NET_Y0+NET_CELL_H*2+3, kind:'fern' },
  { _type:'plant', gx:1, gy:SPONSOR_Y0+2, kind:'pot' },
  { _type:'plant', gx:STAGE_X2+1, gy:SPONSOR_Y0+2, kind:'pot' },
  { _type:'plant', gx:NET_X0+1, gy:NET_Y0-1.5, kind:'pot' },
  { _type:'plant', gx:STAGE_X2-1, gy:NET_Y0-1.5, kind:'pot' },
].map(p => ({ ...p, _d: p.gx + p.gy }));

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
  linkedin:'https://www.linkedin.com/in/sarah-kask', color:'#FFE060', skin:'#F0D4B0', hair:'#2A1410', pants:'#2A2840', feminine:true,
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
  watchTimer:0, watchMsg:'', goal:'roam',
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
  return { regular, speaker, booth, nextId: AGENTS_DEF.length };
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawTile(ctx,gx,gy,fill,stroke) {
  const {x,y}=iso(gx,gy);
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+TW/2,y+TH/2);
  ctx.lineTo(x,y+TH); ctx.lineTo(x-TW/2,y+TH/2); ctx.closePath();
  ctx.fillStyle=fill; ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=0.5;ctx.stroke();}
}

function drawBlock(ctx,gx,gy,top,sL,sR,h=BH) {
  const {x,y}=iso(gx,gy);
  ctx.beginPath(); ctx.moveTo(x+TW/2,y+TH/2); ctx.lineTo(x,y+TH);
  ctx.lineTo(x,y+TH+h); ctx.lineTo(x+TW/2,y+TH/2+h); ctx.closePath();
  ctx.fillStyle=sR; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-TW/2,y+TH/2); ctx.lineTo(x,y+TH);
  ctx.lineTo(x,y+TH+h); ctx.lineTo(x-TW/2,y+TH/2+h); ctx.closePath();
  ctx.fillStyle=sL; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+TW/2,y+TH/2);
  ctx.lineTo(x,y+TH); ctx.lineTo(x-TW/2,y+TH/2); ctx.closePath();
  ctx.fillStyle=top; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=0.5; ctx.stroke();
}

function drawStageBlock(ctx, gx, gy) {
  const front = gy === STAGE_Y2;
  const top = front ? '#4E3878' : '#3A2868';
  const sL = front ? '#281850' : '#1C1448';
  const sR = front ? '#3C2868' : '#2C2058';
  drawBlock(ctx, gx, gy, top, sL, sR, SBH);
  const { x, y } = iso(gx, gy);
  const lip = y + TH / 2 + SBH;
  if (front) {
    ctx.fillStyle = '#C8A040';
    ctx.fillRect(x - TW / 2 + 3, lip - 4, TW - 6, 3);
    ctx.fillStyle = '#8A7028';
    ctx.fillRect(x - TW / 2 + 3, lip - 1, TW - 6, 2);
  }
}

function drawStageAudienceFloor(ctx, gx, gy) {
  drawBlock(ctx, gx, gy, '#14101E', '#0A0814', '#100C18', BH);
  const { x, y } = iso(gx, gy);
  ctx.strokeStyle = 'rgba(168,144,255,0.06)';
  ctx.strokeRect(x - TW / 2 + 8, y + TH / 2 - 4, TW - 16, 4);
}

function drawProscenium(ctx) {
  const { x, y } = iso(STAGE_CX, STAGE_Y1 - 0.2);
  const fy = y + TH / 2 - SBH + 4;
  const W = 340;
  const H = 88;
  ctx.fillStyle = '#0A0614';
  ctx.beginPath();
  ctx.moveTo(x - W / 2, fy - H + 18);
  ctx.quadraticCurveTo(x, fy - H - 10, x + W / 2, fy - H + 18);
  ctx.lineTo(x + W / 2 + 10, fy + 6);
  ctx.lineTo(x - W / 2 - 10, fy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,80,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCurtains(ctx) {
  for (const side of [-1, 1]) {
    const gx = side < 0 ? STAGE_PLATFORM_X1 - 0.5 : STAGE_PLATFORM_X2 + 0.5;
    const { x, y } = iso(gx, STAGE_Y1);
    const fy = y + TH / 2 - SBH + 4;
    const w = 20;
    const h = 78;
    const x0 = side < 0 ? x - w : x;
    const g = ctx.createLinearGradient(x0, fy - h, x0 + side * w, fy);
    g.addColorStop(0, '#5A1038');
    g.addColorStop(0.5, '#2A0820');
    g.addColorStop(1, '#0E0410');
    ctx.fillStyle = g;
    ctx.fillRect(x0, fy - h, w, h);
    ctx.fillStyle = 'rgba(200,160,80,0.35)';
    ctx.fillRect(x0, fy - h, w, 3);
  }
}

function drawLightTruss(ctx, frame) {
  const { x, y } = iso(STAGE_CX, STAGE_Y1 + 0.2);
  const fy = y + TH / 2 - SBH - 2;
  const span = 300;
  ctx.fillStyle = '#18141C';
  ctx.fillRect(x - span / 2, fy - 8, span, 5);
  [-120, -80, -40, 0, 40, 80, 120].forEach((off, i) => {
    const pulse = 0.55 + 0.45 * Math.sin(frame * 0.04 + i * 1.2);
    ctx.fillStyle = `rgba(255,220,120,${0.25 * pulse})`;
    ctx.beginPath();
    ctx.arc(x + off, fy - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPodium(ctx) {
  const { x, y } = iso(STAGE_CX, STAGE_Y2 - 0.15);
  const fy = y + TH / 2 + SBH;
  ctx.fillStyle = '#120A20';
  ctx.beginPath();
  ctx.moveTo(x - 16, fy);
  ctx.lineTo(x + 16, fy);
  ctx.lineTo(x + 13, fy - 22);
  ctx.lineTo(x - 13, fy - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2A1848';
  ctx.fillRect(x - 18, fy - 24, 36, 4);
  ctx.fillStyle = '#888';
  ctx.fillRect(x - 1.5, fy - 36, 3, 14);
  ctx.beginPath();
  ctx.arc(x, fy - 38, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#555';
  ctx.fill();
}

function drawStageSet(ctx, frame, detail) {
  drawProscenium(ctx);
  drawCurtains(ctx);
  drawScreen(ctx, frame, detail);
  drawLightTruss(ctx, frame);
  drawPodium(ctx);
}

function isoFoot(p) {
  return { x: p.x, y: p.y + TH / 2 };
}

function drawIsoQuad(ctx, p1, p2, p3, p4, fill, stroke) {
  const f1 = isoFoot(p1);
  const f2 = isoFoot(p2);
  const f3 = isoFoot(p3);
  const f4 = isoFoot(p4);
  ctx.beginPath();
  ctx.moveTo(f1.x, f1.y);
  ctx.lineTo(f2.x, f2.y);
  ctx.lineTo(f3.x, f3.y);
  ctx.lineTo(f4.x, f4.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawMainDoor(ctx) {
  const gy = DOOR_WALL_GY;
  const gxL = Math.floor(DOOR_GX_L);
  const gxR = Math.ceil(DOOR_GX_R);
  const gxMid = MAIN_DOOR_GX;
  const wallTop = '#2A2848';
  const wallSL = '#181430';
  const wallSR = '#221E48';
  const jambTop = '#1E1638';
  const jambSL = '#100C20';
  const jambSR = '#161228';
  const leafTop = '#3A5878';
  const leafSL = '#283850';
  const leafSR = '#304868';

  for (let gx = gxL - 2; gx < gxL; gx++) {
    if (gx >= 0) drawBlock(ctx, gx, gy, wallTop, wallSL, wallSR, DOOR_BLOCK_H);
  }
  for (let gx = gxR + 1; gx <= gxR + 2; gx++) {
    if (gx < GW) drawBlock(ctx, gx, gy, wallTop, wallSL, wallSR, DOOR_BLOCK_H);
  }

  drawBlock(ctx, gxL, gy, jambTop, jambSL, jambSR, DOOR_BLOCK_H);
  drawBlock(ctx, gxR, gy, jambTop, jambSR, jambSL, DOOR_BLOCK_H);

  for (let gx = gxL + 1; gx < gxR; gx++) {
    drawBlock(ctx, gx, gy - 0.22, '#3A3058', wallSL, wallSR, DOOR_LINTEL_H);
  }

  for (let gx = gxL + 1; gx <= gxR - 1; gx++) {
    drawTile(ctx, gx, gy, '#14122A', 'rgba(96,192,255,0.15)');
  }

  const leafMid = (DOOR_GX_L + DOOR_GX_R) / 2;
  drawBlock(ctx, gxL + 0.55, gy, leafTop, leafSL, leafSR, DOOR_BLOCK_H - 4);
  drawBlock(ctx, leafMid + 0.12, gy, leafTop, leafSR, leafSL, DOOR_BLOCK_H - 4);
  drawBlock(ctx, gxR - 0.55, gy, leafTop, leafSL, leafSR, DOOR_BLOCK_H - 4);

  const sign = iso(gxMid, gy - 0.55);
  const signY = sign.y + TH / 2 - DOOR_BLOCK_H - DOOR_LINTEL_H - 6;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sign.x - 42, signY - 10, 84, 12);
  ctx.fillStyle = 'rgba(96,192,255,0.95)';
  ctx.font = "bold 7px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillText('MAIN ENTRANCE', sign.x, signY);

  const arrow = isoFoot(iso(gxMid, gy + 0.85));
  ctx.fillStyle = 'rgba(168,144,255,0.55)';
  ctx.font = "6px 'Courier New',monospace";
  ctx.fillText('▲ ENTER', arrow.x, arrow.y + 2);
}

function drawScreen(ctx, frame, detail = 1) {
  const { x, y } = iso(STAGE_CX, STAGE_Y1 + 0.35);
  const fy = y + TH / 2 - SBH - 2;
  const SW = 128 * detail;
  const SH = 72 * detail;

  // Outer bezel
  ctx.fillStyle='#030208';
  ctx.fillRect(x-SW/2-5, fy-SH-6, SW+10, SH+8);

  // Screen panel
  ctx.fillStyle='#05030F';
  ctx.fillRect(x-SW/2, fy-SH, SW, SH);

  // Inner content
  ctx.save();
  ctx.beginPath(); ctx.rect(x-SW/2+2, fy-SH+2, SW-4, SH-4); ctx.clip();
  const bg=ctx.createLinearGradient(x,fy-SH,x,fy);
  bg.addColorStop(0,'#200C70'); bg.addColorStop(1,'#080838');
  ctx.fillStyle=bg; ctx.fillRect(x-SW/2,fy-SH,SW,SH);

  const fs = n => `${Math.round(n * detail)}px Courier New`;

  // LIVE badge
  ctx.fillStyle='rgba(240,60,80,0.9)';
  ctx.fillRect(x-SW/2+6,fy-SH+6,28*detail,10*detail);
  ctx.fillStyle='#fff';
  ctx.font=`bold ${fs(5)}`; ctx.textAlign='center';
  ctx.fillText('LIVE',x-SW/2+20,fy-SH+13*detail);

  // Header band
  ctx.fillStyle='rgba(168,144,255,0.18)';
  ctx.fillRect(x-SW/2+2,fy-SH+2,SW-4,22*detail);

  // Title
  ctx.fillStyle='rgba(200,180,255,0.95)';
  ctx.font=`bold ${fs(10)}`; ctx.textAlign='center';
  ctx.fillText('◈  AGENTCONF 2026', x, fy-SH+15*detail);

  // Subtitle
  ctx.fillStyle='rgba(150,200,255,0.65)';
  ctx.font=fs(6.5);
  ctx.fillText('THE FUTURE OF NETWORKING — PALDISKI, ESTONIA', x, fy-SH+29*detail);

  // Divider
  ctx.fillStyle='rgba(168,144,255,0.25)';
  ctx.fillRect(x-SW/2+8*detail, fy-SH+33*detail, SW-16*detail, 1);

  // Bullets
  const bullets=['→ AI-powered agent matching','→ Personalised debrief','→ Zero friction networking'];
  ctx.fillStyle='rgba(96,192,255,0.7)';
  ctx.font=fs(6); ctx.textAlign='left';
  bullets.forEach((b,i)=>ctx.fillText(b, x-SW/2+12*detail, fy-SH+(43+i*9)*detail));

  if (detail >= 1.2) {
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.font=fs(5); ctx.textAlign='center';
    ctx.fillText('LIVE KEYNOTE · DR. SARAH K.', x, fy - 14 * detail);
  }

  // Progress bar
  const prog=(Math.sin(frame*0.003)*0.5+0.5);
  ctx.fillStyle='rgba(168,144,255,0.12)';
  ctx.fillRect(x-SW/2+6,fy-8,SW-12,3);
  ctx.fillStyle='rgba(168,144,255,0.65)';
  ctx.fillRect(x-SW/2+6,fy-8,(SW-12)*prog,3);

  ctx.restore();

  // Screen glow
  ctx.shadowBlur=18; ctx.shadowColor='rgba(140,110,255,0.5)';
  ctx.strokeStyle='rgba(168,144,255,0.75)'; ctx.lineWidth=1.5;
  ctx.strokeRect(x-SW/2,fy-SH,SW,SH);
  ctx.shadowBlur=0;
}

function drawBooth(ctx,gx,gy,label,color,accent,detail=1) {
  const {x,y}=iso(gx+0.5,gy+0.5);
  const fy=y+TH/2;
  const PW=40*detail, PH=46*detail, CH=12*detail, CW=31*detail;

  // Back panel left-side depth
  ctx.fillStyle=shade(color,-28);
  ctx.beginPath();
  ctx.moveTo(x-PW/2, fy-PH);      ctx.lineTo(x-PW/2-5, fy-PH+6);
  ctx.lineTo(x-PW/2-5, fy-CH+6);  ctx.lineTo(x-PW/2,   fy-CH);
  ctx.closePath(); ctx.fill();

  // Panel face with gradient
  const pg=ctx.createLinearGradient(x-PW/2,fy-PH,x+PW/2,fy-CH);
  pg.addColorStop(0,shade(color,25)); pg.addColorStop(1,color);
  ctx.fillStyle=pg;
  ctx.fillRect(x-PW/2, fy-PH, PW, PH-CH);

  // Top glow bar
  ctx.fillStyle=accent;
  ctx.fillRect(x-PW/2, fy-PH, PW, 2);

  // Border
  ctx.strokeStyle=accent+'66'; ctx.lineWidth=0.8;
  ctx.strokeRect(x-PW/2, fy-PH, PW, PH-CH);

  // Logo badge
  ctx.beginPath(); ctx.arc(x, fy-PH+14, 11, 0, Math.PI*2);
  ctx.fillStyle=accent+'18'; ctx.fill();
  ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=accent; ctx.font='bold 9px Courier New';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label[0], x, fy-PH+14);
  ctx.textBaseline='alphabetic';

  // Company name
  ctx.fillStyle='rgba(255,255,255,0.82)';
  ctx.font=`bold ${Math.round(7*detail)}px Courier New`; ctx.textAlign='center';
  ctx.fillText(label.toUpperCase(), x, fy-PH+30*detail);

  if (detail >= 1.3) {
    ctx.fillStyle=accent+'99';
    ctx.font=`${Math.round(5.5*detail)}px Courier New`;
    ctx.fillText('SPONSOR BOOTH', x, fy-PH+40*detail);
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText('AGENT REP ON SITE', x, fy-PH+48*detail);
  }

  // Counter top
  ctx.fillStyle=shade(color,35);
  ctx.fillRect(x-CW/2, fy-CH, CW, CH-2);
  // Counter front face (isometric)
  ctx.fillStyle=shade(color,-8);
  ctx.beginPath();
  ctx.moveTo(x-CW/2,   fy-2);
  ctx.lineTo(x-CW/2+3, fy+3);
  ctx.lineTo(x+CW/2+3, fy+3);
  ctx.lineTo(x+CW/2,   fy-2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle=accent+'44'; ctx.lineWidth=0.5;
  ctx.strokeRect(x-CW/2, fy-CH, CW, CH-2);
}

function drawKnitlingBooth(ctx, gx, gy, booth, img, detail = 1) {
  const { x, y } = iso(gx + 0.5, gy + 0.5);
  const fy = y + TH / 2;
  const PW = 52 * detail, PH = 58 * detail, CH = 14 * detail, CW = 36 * detail;
  const panel = booth.panel || '#C8C4BC';
  const accent = booth.accent || '#F0ECE4';

  ctx.fillStyle = shade(booth.color, -28);
  ctx.beginPath();
  ctx.moveTo(x - PW / 2, fy - PH);
  ctx.lineTo(x - PW / 2 - 5, fy - PH + 6);
  ctx.lineTo(x - PW / 2 - 5, fy - CH + 6);
  ctx.lineTo(x - PW / 2, fy - CH);
  ctx.closePath();
  ctx.fill();

  const pg = ctx.createLinearGradient(x - PW / 2, fy - PH, x + PW / 2, fy - CH);
  pg.addColorStop(0, '#E4E0D8');
  pg.addColorStop(1, panel);
  ctx.fillStyle = pg;
  ctx.fillRect(x - PW / 2, fy - PH, PW, PH - CH);

  const imgH = (PH - CH) * 0.72;
  const imgY = fy - PH + 2;
  if (img?.complete && img.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - PW / 2 + 2, imgY, PW - 4, imgH);
    ctx.clip();
    const scale = Math.max((PW - 4) / img.width, imgH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x - dw / 2, imgY + imgH - dh, dw, dh);
    const fade = ctx.createLinearGradient(x, imgY + imgH * 0.55, x, imgY + imgH);
    fade.addColorStop(0, 'rgba(200,196,188,0)');
    fade.addColorStop(1, 'rgba(200,196,188,0.85)');
    ctx.fillStyle = fade;
    ctx.fillRect(x - PW / 2, imgY, PW, imgH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#B8B4AC';
    ctx.fillRect(x - PW / 2 + 2, imgY, PW - 4, imgH);
  }

  ctx.fillStyle = accent;
  ctx.fillRect(x - PW / 2, fy - PH, PW, 2);
  ctx.strokeStyle = 'rgba(60,58,54,0.35)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x - PW / 2, fy - PH, PW, PH - CH);

  const ty = fy - PH + imgH + 10 * detail;
  ctx.fillStyle = '#3A3834';
  ctx.font = `${Math.round(9 * detail)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.fillText('KNITLING', x, ty);

  ctx.fillStyle = '#5A5854';
  ctx.font = `${Math.round(4.2 * detail)}px Georgia, serif`;
  const tag = booth.tagline || '';
  ctx.fillText(tag.length > 42 ? `${tag.slice(0, 40)}…` : tag, x, ty + 9 * detail);

  ctx.fillStyle = shade(booth.color, 35);
  ctx.fillRect(x - CW / 2, fy - CH, CW, CH - 2);
  ctx.fillStyle = '#E8E4DC';
  ctx.fillRect(x - CW / 2, fy - CH, CW, 3);
  ctx.fillStyle = shade(booth.color, -8);
  ctx.beginPath();
  ctx.moveTo(x - CW / 2, fy - 2);
  ctx.lineTo(x - CW / 2 + 3, fy + 3);
  ctx.lineTo(x + CW / 2 + 3, fy + 3);
  ctx.lineTo(x + CW / 2, fy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4A4844';
  ctx.font = `${Math.round(5.5 * detail)}px Courier New`;
  ctx.fillText(booth.url || 'knitling.com', x, fy - CH / 2 + 2);
}

function drawPlant(ctx, gx, gy, kind) {
  const { x, y } = iso(gx, gy);
  const fy = y + TH / 2;

  ctx.beginPath();
  ctx.ellipse(x, fy + 2, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  if (kind === 'pot') {
    ctx.fillStyle = '#4A3828';
    ctx.fillRect(x - 7, fy - 10, 14, 10);
    ctx.fillStyle = '#5C4834';
    ctx.fillRect(x - 8, fy - 12, 16, 3);
    ctx.fillStyle = '#2D6B38';
    ctx.beginPath();
    ctx.arc(x, fy - 18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3D8A4A';
    ctx.beginPath();
    ctx.arc(x - 4, fy - 20, 5, 0, Math.PI * 2);
    ctx.arc(x + 5, fy - 19, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'tall') {
    ctx.fillStyle = '#3E3020';
    ctx.fillRect(x - 2, fy - 32, 4, 28);
    ctx.fillStyle = '#2A5C32';
    ctx.beginPath();
    ctx.ellipse(x, fy - 36, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3A7A42';
    ctx.beginPath();
    ctx.ellipse(x - 8, fy - 32, 8, 10, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 9, fy - 30, 7, 9, 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#4A3828';
    ctx.fillRect(x - 9, fy - 8, 18, 8);
    ctx.fillStyle = '#2D6B38';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 5, fy - 14 - Math.abs(i) * 2, 6, 11, i * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4A9A55';
    ctx.beginPath();
    ctx.ellipse(x, fy - 18, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoothDragGlow(ctx, gx, gy) {
  const { x, y } = iso(gx + 0.5, gy + 0.5);
  const fy = y + TH / 2;
  ctx.strokeStyle = 'rgba(168,144,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x - 30, fy - 62, 60, 58);
  ctx.setLineDash([]);
}

// ─── Character drawing ────────────────────────────────────────────────────────
const LH=10,LW=3.5,BDH=11,BDW=9,AH=9,AW=3,HR=5.5;

function feetPos(a) {
  const { x, y } = iso(a.x, a.y);
  const onPlatform = isStageTile(Math.floor(a.x), Math.floor(a.y));
  return { x, y: y + TH / 2 - (onPlatform ? SBH : 0) };
}

function limb(ctx,hx,hy,w,h,angle,color) {
  ctx.save(); ctx.translate(hx,hy); ctx.rotate(angle);
  ctx.fillStyle=color; ctx.beginPath(); ctx.rect(-w/2,0,w,h); ctx.fill();
  ctx.restore();
}

function getDef(a) {
  if (a.id===99) return SPEAKER_DEF;
  if (a.id>=100) return BOOTH_DEFS[a.id-100]||BOOTH_DEFS[0];
  if (a.id >= AGENTS_DEF.length && a.name) return a;
  return AGENTS_DEF[a.id]||AGENTS_DEF[0];
}

const profileFromAgent = a => {
  const d = getDef(a);
  return {
    id: a.id,
    name: d.name,
    title: d.title || 'Conference attendee',
    bio: d.bio || '',
    linkedin: d.linkedin || '',
    website: d.website || '',
    color: a.color,
  };
};

const hitTestAgent = (wx, wy, agents) => {
  const sorted = [...agents].sort((a, b) => (b.x + b.y) - (a.x + a.y));
  for (const a of sorted) {
    const p = feetPos(a);
    const top = p.y - (LH + BDH + HR + 14);
    if (wx >= p.x - 14 && wx <= p.x + 14 && wy >= top && wy <= p.y + 6) return a;
  }
  return null;
};

function drawAgentFace(ctx, x, hy, def) {
  const hr = HR;
  const fem = !!def.feminine;

  if (fem) {
    ctx.fillStyle = def.hair;
    ctx.fillRect(x - hr - 0.5, hy + 0.5, 2, hr + 2);
    ctx.fillRect(x + hr - 1.5, hy + 0.5, 2, hr + 2);
  }

  ctx.beginPath();
  ctx.arc(x, hy, hr, 0, Math.PI * 2);
  ctx.fillStyle = def.skin;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, hy, hr, 0, Math.PI * 2);
  ctx.clip();
  const cheek = ctx.createRadialGradient(x + hr * 0.3, hy, 0, x + hr * 0.3, hy, hr * 0.85);
  cheek.addColorStop(0, 'rgba(0,0,0,0.14)');
  cheek.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cheek;
  ctx.fillRect(x, hy - hr, hr, hr * 2);

  ctx.beginPath();
  ctx.arc(x, hy - (fem ? 0.8 : 0), hr + (fem ? 0.6 : 0), Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineTo(x, hy - 1);
  ctx.closePath();
  ctx.fillStyle = def.hair;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(15,8,5,0.9)';
  ctx.beginPath(); ctx.arc(x - 2, hy + 0.5, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2, hy + 0.5, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath(); ctx.arc(x - 1.5, hy, 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2.5, hy, 0.45, 0, Math.PI * 2); ctx.fill();
}

function drawWatchDialog(ctx, a, frame) {
  const p = feetPos(a);
  const top = p.y - LH - BDH - 3 - HR;
  const y = top - 18;
  const dots = '.'.repeat((Math.floor(frame / 14) % 3) + 1);
  const status = 'WATCHING';
  const line = a.watchMsg || PRESENTATION_LINES[0];
  ctx.font = "bold 6px 'Courier New',monospace";
  const sw = ctx.measureText(status).width;
  ctx.font = "6px 'Courier New',monospace";
  const mw = ctx.measureText(line).width;
  const bw = Math.max(sw, mw) + 18;
  const bh = 26;

  ctx.font = "bold 6px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.strokeStyle = 'rgba(168,144,255,0.55)';
  ctx.lineWidth = 0.8;
  roundRect(ctx, p.x - bw / 2, y - bh, bw, bh, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(168,144,255,0.95)';
  ctx.fillText(status, p.x, y - bh + 9);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = "6px 'Courier New',monospace";
  ctx.fillText(line, p.x, y - bh + 19);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(dots, p.x + bw / 2 - 10, y - bh + 19);
}

function drawTalkDialog(ctx, a, b, frame) {
  const pa = feetPos(a);
  const pb = feetPos(b);
  const mx = (pa.x + pb.x) / 2;
  const top = Math.min(pa.y, pb.y) - LH - BDH - 3 - HR;
  const y = top - 20;
  const dots = '.'.repeat((Math.floor(frame / 14) % 3) + 1);
  const status = 'TALKING';
  const msg = a.talkMsg || b.talkMsg || 'Networking';
  const line = msg.length > 36 ? `${msg.slice(0, 33)}…` : msg;

  ctx.font = "bold 6px 'Courier New',monospace";
  ctx.textAlign = 'center';
  const sw = ctx.measureText(status).width;
  ctx.font = "6px 'Courier New',monospace";
  const mw = ctx.measureText(line).width;
  const bw = Math.max(sw, mw) + 18;
  const bh = 28;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.strokeStyle = 'rgba(255,215,80,0.55)';
  ctx.lineWidth = 0.8;
  roundRect(ctx, mx - bw / 2, y - bh, bw, bh, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,215,80,0.95)';
  ctx.font = "bold 6px 'Courier New',monospace";
  ctx.fillText(status, mx, y - bh + 9);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = "6px 'Courier New',monospace";
  ctx.fillText(line, mx, y - bh + 19);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(dots, mx + bw / 2 - 10, y - bh + 19);

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath();
  ctx.moveTo(mx - 5, y);
  ctx.lineTo(mx + 5, y);
  ctx.lineTo(mx, y + 6);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCharacter(ctx, a, frame, showName = true) {
  const def=getDef(a);
  const fem=!!def.feminine;
  const {x,y}=feetPos(a);
  const talking=a.talkTimer>0;
  const watching=a.watchTimer>0;
  const moving=!a.isStatic&&!talking&&!watching&&(a.x-a.tx)**2+(a.y-a.ty)**2>0.01;
  const wp=moving?Math.sin(frame*0.12)*0.75:0;

  ctx.beginPath(); ctx.ellipse(x,y+1,8,2.8,0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fill();

  if (!fem) limb(ctx,x+2,y-LH,LW,LH,-wp*0.45,shade(def.pants,-30));
  limb(ctx,x+BDW/2-0.5,y-LH-BDH+2,AW,AH,wp*0.42,shade(a.color,-40));

  ctx.fillStyle=a.color;
  ctx.beginPath(); ctx.rect(x-BDW/2,y-LH-BDH,BDW,BDH); ctx.fill();
  ctx.fillStyle=shade(a.color,-45);
  ctx.beginPath(); ctx.rect(x+BDW/2-2.5,y-LH-BDH,2.5,BDH); ctx.fill();

  if (!fem) limb(ctx,x-2,y-LH,LW,LH,wp*0.45,def.pants);
  limb(ctx,x-BDW/2+0.5,y-LH-BDH+2,AW,AH,-wp*0.42,a.color);

  if (fem) {
    const waist = y - LH + 1;
    ctx.fillStyle = def.pants;
    ctx.beginPath();
    ctx.moveTo(x - BDW / 2 + 0.5, waist);
    ctx.lineTo(x + BDW / 2 - 0.5, waist);
    ctx.lineTo(x + 4.5, y);
    ctx.lineTo(x - 4.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(def.pants, -22);
    ctx.beginPath();
    ctx.moveTo(x + 0.5, waist);
    ctx.lineTo(x + 4.5, y);
    ctx.lineTo(x + 4.5, y - 0.5);
    ctx.lineTo(x + 0.5, waist + BDH - 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle='#0A0A18';
    ctx.beginPath(); ctx.rect(x-4,y-2,3.5,2.5); ctx.fill();
    ctx.beginPath(); ctx.rect(x+0.5,y-2,3.5,2.5); ctx.fill();
  }

  ctx.fillStyle=def.skin;
  ctx.beginPath(); ctx.rect(x-1.8,y-LH-BDH-3,3.6,3.5); ctx.fill();

  const hy=y-LH-BDH-3-HR;
  drawAgentFace(ctx,x,hy,def);

  if (a.meeting>=0) {
    ctx.beginPath(); ctx.arc(x,hy+2.5,2.2,0.15,Math.PI-0.15);
    ctx.strokeStyle='rgba(15,8,5,0.75)'; ctx.lineWidth=0.9; ctx.stroke();
    for (let r=HR+3;r<=HR+8;r+=2.5) {
      ctx.beginPath(); ctx.arc(x,hy,r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,210,50,${0.35-r*0.025})`; ctx.lineWidth=1; ctx.stroke();
    }
  }

  if (a.id===99) {
    ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('🎤',x,hy-HR-6);
  }

  if (showName) {
    const extraUp = a.id === 99 ? 12 : 0;
    const nameY = hy - HR - 7 - extraUp;
    ctx.font = "7px 'Courier New',monospace";
    ctx.textAlign = 'center';
    const nw = ctx.measureText(a.name).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - nw / 2, nameY - 8, nw, 10);
    ctx.strokeStyle = a.color + '55';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - nw / 2, nameY - 8, nw, 10);
    ctx.fillStyle = a.color;
    ctx.fillText(a.name, x, nameY - 1);
  }
}

function drawConnection(ctx,a,b) {
  const pa=feetPos(a),pb=feetPos(b);
  const ha=pa.y-LH-BDH-3-HR, hb=pb.y-LH-BDH-3-HR;
  const g=ctx.createLinearGradient(pa.x,ha,pb.x,hb);
  g.addColorStop(0,a.color+'99'); g.addColorStop(1,b.color+'99');
  ctx.beginPath(); ctx.moveTo(pa.x,ha); ctx.lineTo(pb.x,hb);
  ctx.strokeStyle=g; ctx.lineWidth=1.5;
  ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(255,215,50,0.95)';
  ctx.fillText('✦',(pa.x+pb.x)/2,(ha+hb)/2);
  ctx.textBaseline='alphabetic';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AgentConf() {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const [booths, setBooths] = useState(mergeBoothLayout);
  const boothsRef = useRef(booths);
  boothsRef.current = booths;

  const agentsRef  = useRef(null);
  if (!agentsRef.current) agentsRef.current = initAll(boothsRef.current);
  const matchesRef = useRef(new Set());
  const cameraRef  = useRef(mkCamera());
  const viewRef    = useRef(mkView());
  const raf        = useRef(null);
  const frameRef   = useRef(0);
  const panRef     = useRef(null);
  const knitlingImgRef = useRef(null);
  const dragBoothRef = useRef(-1);
  const boothDragEnabledRef = useRef(loadBoothDragPref());
  const [boothDragEnabled, setBoothDragEnabled] = useState(loadBoothDragPref);
  const showAgentNamesRef = useRef(loadAgentNamesPref());
  const [showAgentNames, setShowAgentNames] = useState(loadAgentNamesPref);
  const [stats,setStats] = useState({total:AGENTS_DEF.length,matches:0,convos:0,hot:'—'});
  const [roamingCount, setRoamingCount] = useState(AGENTS_DEF.length);
  const [zoomPct,setZoomPct] = useState(100);
  const [focusId,setFocusId] = useState('overview');
  const [selectedProfile,setSelectedProfile] = useState(null);

  useEffect(() => {
    boothDragEnabledRef.current = boothDragEnabled;
  }, [boothDragEnabled]);

  useEffect(() => {
    showAgentNamesRef.current = showAgentNames;
  }, [showAgentNames]);

  const toggleBoothDrag = () => {
    setBoothDragEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('agentconf-booth-drag', next ? '1' : '0');
      } catch { /* noop */ }
      return next;
    });
  };

  const toggleAgentNames = () => {
    setShowAgentNames(prev => {
      const next = !prev;
      try {
        localStorage.setItem('agentconf-agent-names', next ? '1' : '0');
      } catch { /* noop */ }
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
    const agent = mkAgent(id, def, outside.x, outside.y, {
      roomId: 'floor',
      goal: 'enter',
      waitTimer: 0,
    });
    agent.tx = inside.x;
    agent.ty = inside.y;
    pool.regular.push(agent);
    setRoamingCount(pool.regular.length);
    applyFocus('door');
  };

  const canvasPoint = e => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * view.cw;
    const sy = ((e.clientY - rect.top) / rect.height) * view.ch;
    return { sx, sy };
  };

  useEffect(() => {
    const img = new Image();
    img.src = '/knitling-booth.png';
    img.onload = () => { knitlingImgRef.current = img; };
  }, []);

  useEffect(() => {
    syncBoothAgents(booths, agentsRef.current?.booth);
    localStorage.setItem('agentconf-booth-layout-version', String(LAYOUT_VERSION));
    localStorage.setItem(
      'agentconf-booth-layout',
      JSON.stringify(booths.map(({ label, gx, gy }) => ({ label, gx: Math.round(gx), gy: Math.round(gy) }))),
    );
  }, [booths]);

  useEffect(() => {
    const canvas=canvasRef.current, ctx=canvas.getContext('2d');
    const view=viewRef.current;
    resizeView(canvas, view);
    const onResize = () => resizeView(canvas, view);
    window.addEventListener('resize', onResize);

    const {regular,speaker,booth}=agentsRef.current;
    const getAllAgents = () => [...agentsRef.current.regular, agentsRef.current.speaker, ...agentsRef.current.booth];

    function nextTarget(a) {
      if (a.isStatic) return { x: a.tx, y: a.ty };
      if (a.goal === 'enter') {
        return { x: a.tx, y: a.ty };
      }
      if (Math.random() < 0.24) {
        a.goal = 'watch';
        a.roomId = 'stage';
        return randInStageAudience();
      }
      a.goal = 'roam';
      a.roomId = 'floor';
      return randInRoom(FLOOR_ROOM);
    }

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

    function update() {
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
        } else if (a.meeting >= 0) {
          a.meeting = -1;
        }
        if (a.talkCooldown > 0 && a.talkTimer === 0) a.talkCooldown--;
      });

      for (let i = 0; i < regular.length; i++) {
        for (let j = i + 1; j < regular.length; j++) {
          const a = regular[i];
          const b = regular[j];
          tryStartConversation(a, b, (a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        }
      }
      regular.forEach(a => {
        booth.forEach(b => {
          tryStartConversation(a, b, (a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        });
      });
    }

    function render() {
      const frame=frameRef.current;
      const cam=cameraRef.current;
      const v=viewRef.current;
      lerpCamera(cam);

      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      ctx.fillStyle='#080810'; ctx.fillRect(0,0,v.cw,v.ch);
      const rad=ctx.createRadialGradient(v.cw/2,v.ch/2,0,v.cw/2,v.ch/2,Math.max(v.cw,v.ch)*0.7);
      rad.addColorStop(0,'rgba(50,30,100,0.12)'); rad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rad; ctx.fillRect(0,0,v.cw,v.ch);

      ctx.save();
      ctx.translate(v.offX, v.offY);
      ctx.scale(v.scale, v.scale);
      ctx.translate(cam.panX, cam.panY);
      ctx.scale(cam.zoom, cam.zoom);

      const detail = cam.zoom >= 2.4 ? 1.35 : cam.zoom >= 1.6 ? 1.15 : 1;

      // Tiles
      for (let s=0;s<=GW+GH-2;s++)
        for (let gx=Math.max(0,s-GH+1);gx<=Math.min(GW-1,s);gx++) {
          const gy=s-gx; if(gy<0||gy>=GH)continue;
          const r=roomAt(gx,gy);
          if (r) {
            if (isStageTile(gx, gy)) drawStageBlock(ctx, gx, gy);
            else if (isStageAudience(gx, gy)) drawStageAudienceFloor(ctx, gx, gy);
            else drawBlock(ctx, gx, gy, r.top, r.sL, r.sR);
          } else drawTile(ctx,gx,gy,'#0E0E1A','#13132A');
        }

      drawStageSet(ctx, frame, detail);
      drawMainDoor(ctx);

      // Room labels
      ROOMS.forEach(r=>{
        const cx = (r.x1 + r.x2) / 2;
        const cy = r.id === 'stage' ? (STAGE_Y2 + NET_Y0) / 2 : (r.y1 + r.y2) / 2;
        const p = iso(cx, cy);
        ctx.font="bold 8px 'Courier New',monospace"; ctx.textAlign='center';
        const label=`${r.icon} ${r.name.toUpperCase()}`;
        const lw=ctx.measureText(label).width;
        ctx.fillStyle='rgba(0,0,0,0.6)';
        ctx.fillRect(p.x-lw/2-5,p.y+TH/2-20,lw+10,13);
        ctx.strokeStyle=r.lc+'44'; ctx.lineWidth=0.5;
        ctx.strokeRect(p.x-lw/2-5,p.y+TH/2-20,lw+10,13);
        ctx.fillStyle=r.lc; ctx.fillText(label,p.x,p.y+TH/2-11);
      });

      // Collect + depth-sort all renderables
      const boothList = boothsRef.current;
      const renderables=[
        ...PLANTS,
        ...boothList,
        ...getAllAgents().map(a=>({...a,_d:a.x+a.y})),
      ].sort((a,b)=>a._d-b._d);

      // Connection lines between talking pairs
      const drawn=new Set();
      const agentsNow = getAllAgents();
      agentsNow.forEach(a => {
        if (a.talkTimer <= 0 || a.meeting < 0) return;
        const key = `${Math.min(a.id, a.meeting)}-${Math.max(a.id, a.meeting)}`;
        if (drawn.has(key)) return;
        drawn.add(key);
        const b = agentsNow.find(x => x.id === a.meeting);
        if (b) drawConnection(ctx, a, b);
      });

      // Draw all
      renderables.forEach(item => {
        if (item._type === 'plant') drawPlant(ctx, item.gx, item.gy, item.kind);
        else if (item._type === 'booth') {
          const bIdx = boothList.indexOf(item);
          if (bIdx === dragBoothRef.current) drawBoothDragGlow(ctx, item.gx, item.gy);
          if (item.brand === 'knitling')
            drawKnitlingBooth(ctx, item.gx, item.gy, item, knitlingImgRef.current, detail);
          else drawBooth(ctx, item.gx, item.gy, item.label, item.color, item.accent, detail);
        } else if (item._type === 'agent') {
          drawCharacter(ctx, item, frame, showAgentNamesRef.current);
        }
      });

      const talkDrawn = new Set();
      agentsNow.forEach(a => {
        if (a.talkTimer <= 0 || a.meeting < 0) return;
        const key = `${Math.min(a.id, a.meeting)}-${Math.max(a.id, a.meeting)}`;
        if (talkDrawn.has(key)) return;
        talkDrawn.add(key);
        const b = agentsNow.find(x => x.id === a.meeting);
        if (b) drawTalkDialog(ctx, a, b, frame);
      });
      regular.forEach(a => {
        if (a.watchTimer > 0) drawWatchDialog(ctx, a, frame);
      });

      ctx.restore();

      // Vignette (screen space)
      const vig=ctx.createRadialGradient(v.cw/2,v.ch/2,v.ch*0.25,v.cw/2,v.ch/2,Math.max(v.cw,v.ch)*0.75);
      vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.45)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,v.cw,v.ch);
    }

    function tick(){
      frameRef.current++;
      update(); render();
      if(frameRef.current%60===0){
        const rc={};ROOMS.forEach(r=>rc[r.id]=0);
        let convos=0;
        regular.forEach(a=>{const r=roomAt(a.x,a.y);if(r)rc[r.id]++;});
        getAllAgents().forEach(a=>{if(a.talkTimer>0&&a.id<a.meeting)convos++;});
        const hot=Object.entries(rc).sort((a,b)=>b[1]-a[1])[0];
        setStats({total:regular.length,matches:matchesRef.current.size,convos,
          hot:hot?ROOMS.find(r=>r.id===hot[0])?.name:'—'});
        setRoamingCount(regular.length);
        setZoomPct(Math.round(cameraRef.current.zoom*100));
      }
      raf.current=requestAnimationFrame(tick);
    }
    raf.current=requestAnimationFrame(tick);
    return ()=>{
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', onResize);
    };
  },[]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
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
        const c = iso(b.gx + 0.5, b.gy + 0.5);
        dragBoothRef.current = boothIdx;
        panRef.current = {
          mode: 'booth',
          boothIdx,
          grabDx: w.x - c.x,
          grabDy: w.y - c.y,
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
        downX: e.clientX, downY: e.clientY,
        lastX: e.clientX, lastY: e.clientY,
        dragging: false, pointerId: e.pointerId,
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
          const { regular, speaker, booth } = agentsRef.current;
          const hit = hitTestAgent(w.x, w.y, [...regular, speaker, ...booth]);
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
        if (isStageRoom(gx, gy) || isStageTile(gx, gy)) {
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
      if (e.key === '+' || e.key === '=') {
        zoomAtScreen(cam, v.cw / 2, v.ch / 2, ZOOM_STEP, v);
      } else if (e.key === '-') {
        zoomAtScreen(cam, v.cw / 2, v.ch / 2, 1 / ZOOM_STEP, v);
      } else if (e.key === '0') applyFocus('overview');
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
    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      canvas.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const btn = (active, accent) => ({
    background: active ? `${accent}22` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? accent + '88' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 4,
    padding: '5px 10px',
    fontSize: 10,
    color: active ? accent : 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    fontFamily: "'Courier New',monospace",
  });

  const overlay = {
    background:'rgba(5,5,12,0.82)',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:6,
    backdropFilter:'blur(8px)',
  };

  return (
    <div ref={wrapRef} style={{
      position:'fixed', inset:0, overflow:'hidden',
      background:'#050508', fontFamily:"'Courier New',monospace", color:'white',
    }}>
      <canvas ref={canvasRef} style={{display:'block', touchAction:'none'}}/>

      <div style={{position:'absolute',top:12,left:12,...overlay,padding:'10px 14px',pointerEvents:'none'}}>
        <div style={{fontSize:18,fontWeight:700,letterSpacing:'2px',
                     background:'linear-gradient(90deg,#A890FF,#60C0FF)',
                     WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          ◈ AGENTCONF 2026
        </div>
        <div style={{fontSize:9,color:'#555',marginTop:4,letterSpacing:'1px'}}>
          ● LIVE · {roamingCount} AGENTS · PALDISKI
        </div>
        <div style={{display:'flex',gap:16,marginTop:10}}>
          {[['AGENTS',stats.total,'#A890FF'],['MATCHES',stats.matches,'#60C0FF'],
            ['CONVOS',stats.convos,'#50E890'],['BUSIEST',stats.hot,'#FFB840']].map(([l,v,c])=>(
            <div key={l}>
              <div style={{fontSize:16,fontWeight:700,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:7,color:'#444',letterSpacing:'1px'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{position:'absolute',top:12,right:12,display:'flex',flexDirection:'column',gap:4,
                   ...overlay,padding:6,pointerEvents:'auto'}}>
        <button type="button" style={btn(false,'#A890FF')}
          onClick={()=>zoomAtScreen(cameraRef.current,viewRef.current.cw/2,viewRef.current.ch/2,ZOOM_STEP,viewRef.current)} title="Zoom in">+</button>
        <div style={{fontSize:9,color:'#666',textAlign:'center',padding:'2px 0'}}>{zoomPct}%</div>
        <button type="button" style={btn(false,'#A890FF')}
          onClick={()=>zoomAtScreen(cameraRef.current,viewRef.current.cw/2,viewRef.current.ch/2,1/ZOOM_STEP,viewRef.current)} title="Zoom out">−</button>
        <button type="button" style={{...btn(focusId==='overview','#888'),marginTop:4,fontSize:8}}
          onClick={()=>applyFocus('overview')}>RESET</button>
      </div>

      <div style={{position:'absolute',bottom:12,left:12,right:12,display:'flex',flexDirection:'column',gap:8,
                   pointerEvents:'none'}}>
        <div style={{...overlay,padding:'8px 12px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',
                     pointerEvents:'auto'}}>
          <span style={{fontSize:8,color:'#444',letterSpacing:'1px'}}>FOCUS</span>
          <button type="button" style={btn(focusId==='stage','#A890FF')}
            onClick={()=>applyFocus('stage')}>🎤 MAIN STAGE</button>
          <button type="button" style={btn(focusId==='stageScreen','#A890FF')}
            onClick={()=>applyFocus('stageScreen')}>📺 SCREEN</button>
          <button type="button" style={btn(focusId==='floor','#60C0FF')}
            onClick={()=>applyFocus('floor')}>🏛️ EXPO FLOOR</button>
          <button
            type="button"
            style={{...btn(boothDragEnabled, '#FFB840'), marginLeft: 8}}
            onClick={toggleBoothDrag}
            title={boothDragEnabled ? 'Disable booth dragging' : 'Enable booth dragging'}
          >
            {boothDragEnabled ? '⇱ DRAG BOOTHS ON' : '⇱ DRAG BOOTHS OFF'}
          </button>
          <button
            type="button"
            style={btn(showAgentNames, '#60C0FF')}
            onClick={toggleAgentNames}
            title={showAgentNames ? 'Hide agent name labels' : 'Show agent name labels'}
          >
            {showAgentNames ? '◎ NAMES ON' : '◎ NAMES OFF'}
          </button>
          <button
            type="button"
            style={btn(focusId === 'door', '#90A8FF')}
            onClick={spawnNewAgent}
            title="Spawn a new agent at the main entrance"
          >
            + SPAWN AGENT
          </button>
          <button
            type="button"
            style={btn(focusId === 'door', '#90A8FF')}
            onClick={() => applyFocus('door')}
            title="Focus main entrance"
          >
            🚪 ENTRANCE
          </button>
          <span style={{fontSize:8,color:'#333',marginLeft:'auto'}}>
            {boothDragEnabled ? 'drag booths · ' : ''}click booth/agent · pan map
          </span>
        </div>

        <div style={{...overlay,padding:'8px 12px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',
                     pointerEvents:'auto'}}>
          <span style={{fontSize:8,color:'#444',letterSpacing:'1px'}}>BOOTHS</span>
          {booths.map(b=>(
            <button key={b.label} type="button"
              style={btn(focusId===`booth-${b.label}`, b.accent)}
              onClick={()=>applyFocus('booth', b)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {selectedProfile && (
        <div
          role="dialog"
          aria-labelledby="agent-profile-title"
          style={{
            position:'fixed', inset:0, zIndex:100,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)',
            padding:24, pointerEvents:'auto',
          }}
          onClick={() => setSelectedProfile(null)}
        >
          <div
            style={{
              width:'100%', maxWidth:380,
              background:'linear-gradient(160deg,#12101C 0%,#0A0812 100%)',
              border:`1px solid ${selectedProfile.color}55`,
              borderRadius:10, padding:'22px 24px',
              boxShadow:`0 0 40px ${selectedProfile.color}33`,
            }}
            onClick={ev => ev.stopPropagation()}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{
                  width:40, height:40, borderRadius:8,
                  background:`${selectedProfile.color}22`,
                  border:`1px solid ${selectedProfile.color}66`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18,
                }}>🤖</div>
                <div>
                  <div id="agent-profile-title" style={{fontSize:16,fontWeight:700,color:selectedProfile.color}}>
                    {selectedProfile.name}
                  </div>
                  <div style={{fontSize:10,color:'#888',marginTop:4,letterSpacing:'0.5px'}}>
                    {selectedProfile.title}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedProfile(null)}
                style={{
                  background:'transparent', border:'none', color:'#666',
                  fontSize:18, cursor:'pointer', lineHeight:1, padding:4,
                }}
              >×</button>
            </div>

            <p style={{
              fontSize:11, color:'#AAA', lineHeight:1.65, margin:'16px 0 18px',
              borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:14,
            }}>
              {selectedProfile.bio}
            </p>

            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {selectedProfile.linkedin && (
                <a
                  href={selectedProfile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    fontSize:11, color:'#60C0FF', textDecoration:'none',
                    background:'rgba(96,192,255,0.08)',
                    border:'1px solid rgba(96,192,255,0.25)',
                    borderRadius:6, padding:'8px 14px',
                  }}
                >
                  <span style={{fontWeight:700}}>in</span>
                  View on LinkedIn
                </a>
              )}
              {selectedProfile.website && (
                <a
                  href={selectedProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    fontSize:11, color:'#5A5854', textDecoration:'none',
                    background:'rgba(232,228,220,0.12)',
                    border:'1px solid rgba(200,196,188,0.35)',
                    borderRadius:6, padding:'8px 14px',
                  }}
                >
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
