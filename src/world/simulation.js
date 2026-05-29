import {
  FLOOR_ROOM,
  LAYOUT_VERSION,
  PODCAST_STUDIOS,
  STAGE_CX,
  STAGE_Y1,
  STAGE_Y2,
  STAGE_X1,
  STAGE_X2,
  MAIN_DOOR_GX,
  GH,
  NET_Y0,
  NET_CELL_H,
  SPONSOR_Y0,
  isStageTile,
  isPodcastBounds,
  roomAt,
} from './layout.js';

export { FOCUS } from './layout.js';

export const AGENTS_DEF = [
  { name: 'Alex K.', title: 'Founder & CEO', bio: 'Building B2B automation tools for Estonian SMEs.', linkedin: 'https://www.linkedin.com/in/alex-karlsson', color: '#FF7070', skin: '#F4C8A0', hair: '#1A0C04', pants: '#1A2A3A' },
  { name: 'Sam R.', title: 'Freelance Developer', bio: 'Full-stack contractor specialising in React and Node.', linkedin: 'https://www.linkedin.com/in/sam-rajasalu', color: '#40D4CC', skin: '#C8783C', hair: '#4A2008', pants: '#221515' },
  { name: 'Mia T.', title: 'Marketing Consultant', bio: 'Helps B2B startups clarify positioning.', linkedin: 'https://www.linkedin.com/in/mia-tamm', color: '#60B8E8', skin: '#F0D0B0', hair: '#1A1018', pants: '#2A2848', feminine: true },
  { name: 'Leo M.', title: 'Product Designer', bio: 'UX/UI for fintech and health apps.', linkedin: 'https://www.linkedin.com/in/leo-mets', color: '#70D870', skin: '#C07840', hair: '#120800', pants: '#0A1A0A' },
  { name: 'Eva S.', title: 'Accountant & Advisor', bio: 'Virtual CFO services for freelancers.', linkedin: 'https://www.linkedin.com/in/eva-sild', color: '#F4B030', skin: '#F4C8A8', hair: '#8A5020', pants: '#3A2030', feminine: true },
  { name: 'Max B.', title: 'AI Engineer', bio: 'Ships LLM features into production.', linkedin: 'https://www.linkedin.com/in/max-bauer', color: '#D080F0', skin: '#F0D0B8', hair: '#280050', pants: '#140820' },
  { name: 'Zoe P.', title: 'Content Strategist', bio: 'Newsletters and technical storytelling.', linkedin: 'https://www.linkedin.com/in/zoe-park', color: '#50DCC0', skin: '#E8B888', hair: '#B83818', pants: '#1A2838', feminine: true },
  { name: 'Tom W.', title: 'Sales Lead', bio: 'Outbound and partnership development.', linkedin: 'https://www.linkedin.com/in/tom-wilson', color: '#F09050', skin: '#A86030', hair: '#080808', pants: '#201000' },
  { name: 'Ana L.', title: 'HR & People Ops', bio: 'Fractional HR for teams of 5–30.', linkedin: 'https://www.linkedin.com/in/ana-lille', color: '#B068F0', skin: '#F4C8A0', hair: '#2A1438', pants: '#281038', feminine: true },
  { name: 'Jan V.', title: 'DevOps Consultant', bio: 'AWS, Kubernetes, and CI/CD.', linkedin: 'https://www.linkedin.com/in/jan-vaino', color: '#38C8B8', skin: '#D89058', hair: '#182C18', pants: '#082018' },
  { name: 'Kai O.', title: 'Brand Photographer', bio: 'Commercial shoots for tech companies.', linkedin: 'https://www.linkedin.com/in/kai-ots', color: '#F05878', skin: '#F8D0B0', hair: '#AA0818', pants: '#180606' },
  { name: 'Nia F.', title: 'Data Analyst', bio: 'Dashboards and funnel analysis.', linkedin: 'https://www.linkedin.com/in/nia-frost', color: '#6090F0', skin: '#E8C088', hair: '#2A1848', pants: '#121830', feminine: true },
  { name: 'Otto P.', title: 'Legal Counsel', bio: 'Startup contracts and GDPR.', linkedin: 'https://www.linkedin.com/in/otto-paju', color: '#88A0B8', skin: '#F0D0B8', hair: '#303028', pants: '#1A2030' },
  { name: 'Rita N.', title: 'Community Manager', bio: 'Runs Discord communities for devtools.', linkedin: 'https://www.linkedin.com/in/rita-nurmi', color: '#F070A0', skin: '#F4C8A8', hair: '#6A2010', pants: '#281018', feminine: true },
  { name: 'Viktor L.', title: 'Security Engineer', bio: 'Pentests and secure SDLC.', linkedin: 'https://www.linkedin.com/in/viktor-laur', color: '#48B850', skin: '#D8A070', hair: '#181810', pants: '#0C180C' },
  { name: 'Helen R.', title: 'UX Researcher', bio: 'Interviews and usability tests.', linkedin: 'https://www.linkedin.com/in/helen-rohtla', color: '#C8A0FF', skin: '#F4C8A0', hair: '#3A2848', pants: '#201828', feminine: true },
  { name: 'Marko S.', title: 'Video Producer', bio: 'Explainers and conference recaps.', linkedin: 'https://www.linkedin.com/in/marko-saar', color: '#E87848', skin: '#C07840', hair: '#101008', pants: '#201008' },
  { name: 'Liis M.', title: 'Talent Scout', bio: 'Places senior engineers in Nordic startups.', linkedin: 'https://www.linkedin.com/in/liis-mand', color: '#58D8E8', skin: '#F0D0B0', hair: '#8A4818', pants: '#102830', feminine: true },
  { name: 'Chris D.', title: 'No-Code Builder', bio: 'Ships internal tools on Airtable and Make.', linkedin: 'https://www.linkedin.com/in/chris-dunn', color: '#A8B840', skin: '#F8D0B0', hair: '#283018', pants: '#182010' },
  { name: 'Sofia G.', title: 'PR Consultant', bio: 'Media relations for B2B SaaS.', linkedin: 'https://www.linkedin.com/in/sofia-granholm', color: '#FF88C0', skin: '#F4C8A8', hair: '#C02818', pants: '#301820', feminine: true },
  { name: 'Henri V.', title: 'Solutions Architect', bio: 'Cloud reference architectures.', linkedin: 'https://www.linkedin.com/in/henri-vaik', color: '#7098FF', skin: '#E8C088', hair: '#102040', pants: '#0A1428' },
  { name: 'Kati J.', title: 'Event Producer', bio: 'Runs hybrid conferences.', linkedin: 'https://www.linkedin.com/in/kati-jogi', color: '#FFB850', skin: '#F4C8A0', hair: '#4A3010', pants: '#281808', feminine: true },
];

export const SPAWNABLE_AGENTS = [
  { name: 'Guest A.', title: 'Conference Visitor', bio: 'Just arrived at AgentConf.', linkedin: 'https://www.linkedin.com/in/guest-agentconf', color: '#90A8FF', skin: '#F0D0B0', hair: '#201810', pants: '#1A2438' },
  { name: 'Guest B.', title: 'Independent Consultant', bio: 'Exploring partners in automation.', linkedin: 'https://www.linkedin.com/in/guest-b-agentconf', color: '#68E8A0', skin: '#E8C090', hair: '#303018', pants: '#102018' },
  { name: 'Guest C.', title: 'Startup Founder', bio: 'Pre-seed B2B SaaS.', linkedin: 'https://www.linkedin.com/in/guest-c-agentconf', color: '#F0A060', skin: '#F4C8A8', hair: '#581808', pants: '#281008', feminine: true },
  { name: 'Guest D.', title: 'Recruiter', bio: 'Hiring senior engineers.', linkedin: 'https://www.linkedin.com/in/guest-d-agentconf', color: '#C090FF', skin: '#D8A878', hair: '#181828', pants: '#181028' },
  { name: 'Guest E.', title: 'Investor Scout', bio: 'Angel checks on devtools.', linkedin: 'https://www.linkedin.com/in/guest-e-agentconf', color: '#58C8E0', skin: '#F8D8B8', hair: '#102030', pants: '#0A1828' },
  { name: 'Guest F.', title: 'Technical Writer', bio: 'Docs for API-first products.', linkedin: 'https://www.linkedin.com/in/guest-f-agentconf', color: '#E87898', skin: '#F4C8A0', hair: '#6A1828', pants: '#301820', feminine: true },
];

const SPEAKER_DEF = {
  name: 'Dr. Sarah K.',
  title: 'Keynote Speaker · Future of Work',
  bio: 'Research lead on AI-mediated professional networks.',
  linkedin: 'https://www.linkedin.com/in/sarah-kask',
  color: '#FFE060',
  skin: '#F0D4B0',
  hair: '#2A1410',
  pants: '#2A2840',
  feminine: true,
  hairStyle: 2,
};

const BOOTH_DEFS = [
  { name: 'Marco B.', title: 'Solutions Engineer · NordStack', color: '#60C0FF', skin: '#F4C0A0', hair: '#100A04', pants: '#0A1828' },
  { name: 'Lisa K.', title: 'Head of Growth · Patchable', color: '#50E890', skin: '#C0703A', hair: '#4A2810', pants: '#142818', feminine: true },
  { name: 'Riku H.', title: 'Founder · Vaulted', color: '#D080F0', skin: '#F0D0B8', hair: '#060628', pants: '#100818' },
  { name: 'Aino V.', title: 'Customer Success · Wellnets', color: '#38C8B8', skin: '#D89060', hair: '#281008', pants: '#102020', feminine: true },
  { name: 'Taavi M.', title: 'Product Lead · Loopbase', color: '#B068F0', skin: '#F4C8A0', hair: '#500060', pants: '#100818' },
  { name: 'Piret L.', title: 'Developer Advocate · Bitshift', color: '#F09050', skin: '#E8B880', hair: '#1A1038', pants: '#281018', feminine: true },
  { name: 'Jaan K.', title: 'Partnerships · Bringin', color: '#FFB840', skin: '#F4C8A8', hair: '#080808', pants: '#181208' },
  { name: 'Linda Ling', title: 'Founder · Knitling', color: '#E8E4DC', skin: '#EDDCC8', hair: '#C8B888', pants: '#E0D8D0', feminine: true },
];

const PODCAST_ID_BASE = 110;
const PODCAST_DEFS = [
  { name: 'Markus V.', color: '#FF6B4A', skin: '#F0D0B0', hair: '#1A1010', pants: '#281818', shirtCode: 'shirt-blazer', hairCode: 'hair-m-volume' },
  { name: 'Ines L.', color: '#38E8C0', skin: '#F4C8A8', hair: '#3A2018', pants: '#1A2830', feminine: true, shirtCode: 'shirt-casual', hairCode: 'hair-f-bob' },
  { name: 'Oskar T.', color: '#60C0FF', skin: '#E8C090', hair: '#182028', pants: '#142030', shirtCode: 'shirt-polo', hairCode: 'hair-m-volume' },
  { name: 'Liis K.', color: '#B080F0', skin: '#F4C8A0', hair: '#4A2818', pants: '#201828', feminine: true, shirtCode: 'shirt-blazer', hairCode: 'hair-f-long' },
];

const PODCAST_CHAT_LINES = ['So tell us how you found AgentConf…', 'What surprised you this week?', 'Let\'s unpack that workflow.'];
const NETWORKING_LINES = ['Great to connect!', 'Swapping intros…', 'Any collab ideas?'];
const BOOTH_CHAT_LINES = ['Tell me about your booth.', 'What do you offer teams?'];
const PRESENTATION_LINES = ['Watching keynote…', 'Following the talk…', '◈ Live session'];

const MEET_DIST_SQ = 3.8;
const BOOTH_MEET_DIST_SQ = 5.5;
const FPS_ASSUME = 60;
const TALK_MAX_FRAMES = 300;
const TALK_COOLDOWN_FRAMES = 10 * FPS_ASSUME;
const WATCH_MAX_FRAMES = 600;

export const INITIAL_BOOTHS = [
  { _type: 'booth', gx: 6, gy: NET_Y0 + 2.5, label: 'NordStack', color: '#0A2040', accent: '#60C0FF' },
  { _type: 'booth', gx: 18, gy: NET_Y0 + 4, label: 'Patchable', color: '#081A12', accent: '#50E890' },
  { _type: 'booth', gx: 30, gy: NET_Y0 + 2.5, label: 'Wellnets', color: '#081820', accent: '#38C8B8' },
  { _type: 'booth', gx: 38, gy: NET_Y0 + 6, label: 'Loopbase', color: '#160E28', accent: '#B068F0' },
  { _type: 'booth', gx: 10, gy: NET_Y0 + NET_CELL_H + 2, label: 'Vaulted', color: '#160A28', accent: '#D080F0' },
  { _type: 'booth', gx: 24, gy: NET_Y0 + NET_CELL_H + 5, label: 'Bitshift', color: '#1C1008', accent: '#F09050' },
  { _type: 'booth', gx: 34, gy: SPONSOR_Y0 + 2, label: 'Bringin', color: '#161408', accent: '#FFB840' },
  { _type: 'booth', gx: 20, gy: SPONSOR_Y0 + 5, label: 'Knitling', brand: 'knitling', color: '#6A6864', accent: '#F0ECE4' },
].map(b => ({ ...b, _d: b.gx + b.gy }));

const loadBoothLayout = () => {
  try {
    if (Number(localStorage.getItem('agentconf-booth-layout-version')) !== LAYOUT_VERSION) return null;
    const saved = JSON.parse(localStorage.getItem('agentconf-booth-layout'));
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
};

const boothRoomId = (gx, gy) => roomAt(gx, gy)?.id || 'floor';
const boothCell = (gx, gy) => ({ ix: Math.round(gx), iy: Math.round(gy) });

export const canPlaceBooth = (ix, iy, skipIdx, booths) => {
  if (ix < FLOOR_ROOM.x1 || ix >= FLOOR_ROOM.x2 || iy < FLOOR_ROOM.y1 || iy >= FLOOR_ROOM.y2) return false;
  return !booths.some((b, i) => {
    if (i === skipIdx) return false;
    const c = boothCell(b.gx, b.gy);
    return c.ix === ix && c.iy === iy;
  });
};

export const mergeBoothLayout = () => {
  const saved = loadBoothLayout();
  const base = INITIAL_BOOTHS.map(b => ({ ...b, _d: b.gx + b.gy }));
  if (!saved) return base;
  return base.map((def, selfIdx) => {
    const pos = saved.find(s => s.label === def.label);
    if (!pos) return def;
    const trial = base.map((b, i) => (i === selfIdx ? { ...b, gx: pos.gx, gy: pos.gy } : { ...b }));
    const { ix, iy } = boothCell(pos.gx, pos.gy);
    if (!canPlaceBooth(ix, iy, selfIdx, trial)) return def;
    return { ...def, gx: pos.gx, gy: pos.gy, _d: pos.gx + pos.gy };
  });
};

const randInRoom = r => ({
  x: r.x1 + 1 + Math.random() * (r.x2 - r.x1 - 2),
  y: r.y1 + 1 + Math.random() * (r.y2 - r.y1 - 2),
});

const randInStageAudience = () => {
  let x;
  let y;
  do {
    x = STAGE_X1 + 1.2 + Math.random() * (STAGE_X2 - STAGE_X1 - 2.4);
    y = STAGE_Y2 + 1.2 + Math.random() * Math.min(8, 15 - STAGE_Y2 - 1.5);
  } while (isStageTile(Math.floor(x), Math.floor(y)) || isPodcastBounds(Math.floor(x), Math.floor(y)));
  return { x, y };
};

const boothAgentPos = b => {
  const side = b.gx < STAGE_CX ? 1 : -1;
  return { x: b.gx + 0.5 + side * 1.05, y: b.gy + 0.62 };
};

export const syncBoothAgents = (booths, boothAgents) => {
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

export const doorOutsidePos = () => ({
  x: MAIN_DOOR_GX + (Math.random() - 0.5) * 0.6,
  y: Math.floor(GH - 1.85) + 1.35,
});

export const doorInsidePos = () => ({
  x: MAIN_DOOR_GX + (Math.random() - 0.5) * 1.2,
  y: Math.floor(GH - 1.85) - 0.55,
});

const mkAgent = (id, def, x, y, opts = {}) => ({
  id,
  ...def,
  x,
  y,
  tx: x,
  ty: y,
  speed: 0.01 + Math.random() * 0.005,
  roomId: 'floor',
  waitTimer: Math.floor(Math.random() * 150),
  meeting: -1,
  talkTimer: 0,
  talkMsg: '',
  talkCooldown: 0,
  watchTimer: 0,
  watchMsg: '',
  goal: 'roam',
  faceDir: 1,
  _type: 'agent',
  ...opts,
});

export const initAll = booths => {
  const regular = AGENTS_DEF.map((d, i) => {
    const pos = randInRoom(FLOOR_ROOM);
    return mkAgent(i, d, pos.x, pos.y, { roomId: 'floor' });
  });
  const speaker = mkAgent(99, SPEAKER_DEF, STAGE_CX, STAGE_Y2 - 0.25, { isStatic: true, roomId: 'stage' });
  const booth = booths.map((b, i) => {
    const { x, y } = boothAgentPos(b);
    return mkAgent(100 + i, BOOTH_DEFS[i], x, y, { isStatic: true, roomId: boothRoomId(b.gx, b.gy) });
  });
  const podcast = [];
  PODCAST_STUDIOS.forEach((studio, si) => {
    const hosts = [
      { x: studio.cx - 1.35, y: studio.cy + 0.55, faceDir: 1 },
      { x: studio.cx + 1.35, y: studio.cy + 0.55, faceDir: -1 },
    ];
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
    const dur = Math.min(TALK_MAX_FRAMES, 8 * FPS_ASSUME);
    const msg = PODCAST_CHAT_LINES[Math.floor(Math.random() * PODCAST_CHAT_LINES.length)];
    a.meeting = b.id;
    b.meeting = a.id;
    a.talkTimer = dur;
    b.talkTimer = dur;
    a.talkMsg = msg;
    b.talkMsg = msg;
  });
  return { regular, speaker, booth, podcast, nextId: AGENTS_DEF.length };
};

export const getAllAgents = pool => [
  ...pool.regular,
  pool.speaker,
  ...pool.booth,
  ...(pool.podcast ?? []),
];

const updateAgentFacing = (a, others) => {
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

const pickTalkMsg = (a, b) => {
  const booth = a.id >= 100 ? a : b.id >= 100 ? b : null;
  if (booth) return BOOTH_CHAT_LINES[Math.floor(Math.random() * BOOTH_CHAT_LINES.length)];
  return NETWORKING_LINES[Math.floor(Math.random() * NETWORKING_LINES.length)];
};

const startConversation = (a, b) => {
  const dur = Math.min(TALK_MAX_FRAMES, Math.floor((2 + Math.random() * 3) * FPS_ASSUME));
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
};

/** Advance simulation one frame. */
export const tickWorld = (pool, movementPaused) => {
  const { regular, speaker, booth, podcast } = pool;
  const facePool = [...regular, speaker, ...booth];
  regular.forEach(a => updateAgentFacing(a, facePool));
  booth.forEach(a => updateAgentFacing(a, facePool));
  (podcast ?? []).forEach(a => updateAgentFacing(a, facePool));
  updateAgentFacing(speaker, facePool);

  if (movementPaused) return { convos: 0 };

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
        const t = randInRoom(FLOOR_ROOM);
        a.tx = t.x;
        a.ty = t.y;
        a.waitTimer = 50 + Math.floor(Math.random() * 120);
      } else if (a.goal === 'watch') {
        a.watchTimer = Math.min(WATCH_MAX_FRAMES, Math.floor((5 + Math.random() * 5) * FPS_ASSUME));
        a.watchMsg = PRESENTATION_LINES[Math.floor(Math.random() * PRESENTATION_LINES.length)];
        a.tx = a.x;
        a.ty = a.y;
      } else {
        if (Math.random() < 0.24) {
          a.goal = 'watch';
          a.roomId = 'stage';
          const t = randInStageAudience();
          a.tx = t.x;
          a.ty = t.y;
        } else {
          a.goal = 'roam';
          a.roomId = 'floor';
          const t = randInRoom(FLOOR_ROOM);
          a.tx = t.x;
          a.ty = t.y;
        }
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

  (podcast ?? []).forEach(a => {
    if (a.talkTimer > 0) a.talkTimer--;
  });
  PODCAST_STUDIOS.forEach((_, si) => {
    const a = podcast[si * 2];
    const b = podcast[si * 2 + 1];
    if (!a || !b) return;
    if (a.talkTimer === 0 && b.talkTimer === 0 && a.meeting >= 0) {
      a.meeting = -1;
      b.meeting = -1;
      const dur = Math.min(TALK_MAX_FRAMES, 6 * FPS_ASSUME);
      const msg = PODCAST_CHAT_LINES[Math.floor(Math.random() * PODCAST_CHAT_LINES.length)];
      a.meeting = b.id;
      b.meeting = a.id;
      a.talkTimer = dur;
      b.talkTimer = dur;
      a.talkMsg = msg;
      b.talkMsg = msg;
    }
  });

  for (let i = 0; i < regular.length; i++) {
    for (let j = i + 1; j < regular.length; j++) {
      const a = regular[i];
      const b = regular[j];
      if (a.talkTimer > 0 || b.talkTimer > 0) continue;
      const distSq = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (distSq < MEET_DIST_SQ) startConversation(a, b);
    }
  }
  regular.forEach(a => {
    booth.forEach(b => {
      if (a.talkTimer > 0 || b.talkTimer > 0) return;
      const distSq = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (distSq < BOOTH_MEET_DIST_SQ) startConversation(a, b);
    });
  });

  let convos = 0;
  getAllAgents(pool).forEach(a => {
    if (a.talkTimer > 0 && a.id < a.meeting) convos++;
  });
  return { convos };
};

export const getAgentProfile = a => {
  if (a.id === 99) return { ...SPEAKER_DEF, ...a };
  if (a.id >= 100) return { ...(BOOTH_DEFS[a.id - 100] || BOOTH_DEFS[0]), ...a };
  if (a.id >= AGENTS_DEF.length && a.name) return a;
  return { ...(AGENTS_DEF[a.id] || AGENTS_DEF[0]), ...a };
};
