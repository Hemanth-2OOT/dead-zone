// DEAD ZONE v2.0 - WORLD ENGINE & MAIN SIMULATION PIPELINE
// Senior 2D Artist / Technical Rendering & Gameplay System

let P, Z = [], B = [], D = [], F = [], T = [], RG = [], GH = [], AB = [];
let TR = [], CH = [], LT = [], NS = [], TX = [], CS = [], MAG = [];
let POIS = [], DUST = [], O = [], G = [], HZ = [];
let ACID_PUDDLES = [], AOE_DEBRIS = [];
let CX = 0, CY = 0, last = 0;
let S = null;

const K = {};
const M = { x: 0, y: 0, down: 0, moved: 0 };
const J = { l: null, r: null };
let TCH = 0;

const stick = s => {
  if (!s) return [0, 0, 0];
  const d = Math.hypot(s.x - s.ox, s.y - s.oy);
  if (d < 8) return [0, 0, 0];
  const a = Math.atan2(s.y - s.oy, s.x - s.ox);
  return [Math.cos(a), Math.sin(a), 1];
};

function jPos(k) {
  const jX = k === 'l' ? Math.max(70, Math.min(105, W * 0.13)) : W - Math.max(70, Math.min(105, W * 0.13));
  const jY = H - Math.max(65, Math.min(88, H * 0.22));
  return [jX, jY];
}

// On-screen action buttons
const BT = [
  {
    get k() { return (typeof CL !== 'undefined' && typeof SV !== 'undefined' && CL[SV.cls || 0]) ? CL[SV.cls || 0].sk[0] : 'dash'; },
    get n() { return (typeof SKN !== 'undefined' && SKN[this.k]) ? SKN[this.k] : 'DASH'; },
    p: () => { const j = jPos('r'); return [j[0] - 76, j[1] - 56]; },
    f() { skill(this.k); }
  },
  {
    get k() { return (typeof CL !== 'undefined' && typeof SV !== 'undefined' && CL[SV.cls || 0]) ? CL[SV.cls || 0].sk[1] : 'nova'; },
    get n() { return (typeof SKN !== 'undefined' && SKN[this.k]) ? SKN[this.k] : 'NOVA'; },
    p: () => { const j = jPos('r'); return [j[0] - 10, j[1] - 86]; },
    f() { skill(this.k); }
  },
  {
    get k() { return (typeof CL !== 'undefined' && typeof SV !== 'undefined' && CL[SV.cls || 0]) ? CL[SV.cls || 0].sk[2] : 'rage'; },
    get n() { return (typeof SKN !== 'undefined' && SKN[this.k]) ? SKN[this.k] : 'RAGE'; },
    p: () => { const j = jPos('r'); return [j[0] - 136, j[1] - 30]; },
    f() { skill(this.k); }
  },
  { n: 'GREN', k: 'gren', p: () => { const j = jPos('r'); return [j[0] - 74, j[1] + 16]; }, f: () => skill('gren') },
  { n: 'II', ar: 1, p: () => [W - 22, 22], f: () => pause() },
  { n: '<', ar: 1, p: () => [W / 2 - 68, H - 25], f: () => swap(-1) },
  { n: '>', ar: 1, p: () => [W / 2 + 68, H - 25], f: () => swap(1) }
];

function txt(x, y, s, c, b) {
  T.push({ x, y, s, c: c || '#fff', l: 0.85, ml: 0.85, vy: -38, b: !!b });
  if (T.length > 50) T.shift();
}

function updateFloatingTexts(dt) {
  for (let i = T.length - 1; i >= 0; i--) {
    const t = T[i];
    t.y += t.vy * dt;
    t.l -= dt;
    if (t.l <= 0) T.splice(i, 1);
  }
}

function renderFloatingTextsPass() {
  for (const t of T) {
    const alpha = Math.max(0, Math.min(1, t.l / t.ml));
    X.save();
    X.globalAlpha = alpha;
    X.font = t.b ? '900 13px Impact, Arial Black, sans-serif' : 'bold 11px Arial';
    X.textAlign = 'center';
    X.fillStyle = '#000000';
    X.fillText(t.s, t.x + 1, t.y + 1);
    X.fillStyle = t.c;
    X.fillText(t.s, t.x, t.y);
    X.restore();
  }
}

function healP(amt) {
  if (!P || P.hp <= 0) return;
  const cap = Math.max(0, P.mx - P.hp);
  const toHeal = Math.min(amt, cap);
  P.hp = Math.min(P.mx, P.hp + toHeal);
}

function hurtP(dmg, srcX, srcY) {
  if (!P || P.hp <= 0 || P.dash > 0 || (S && S.sh2 > 0)) return;
  const armor = (S && S.ar != null) ? S.ar : 1;
  const d = Math.max(1, Math.round(dmg * armor));
  P.hp -= d;
  P.hurt = 0.28;
  HURT_VIGNETTE_TIMER = 0.35; // Trigger red damage screen vignette

  // Directional knockback away from damage source
  if (srcX != null && srcY != null) {
    const ang = Math.atan2(P.y - srcY, P.x - srcX);
    const impulse = Math.min(18, 4 + d * 0.4);
    P.x += Math.cos(ang) * impulse;
    P.y += Math.sin(ang) * impulse;
    push(P, 13);
  }

  // Screen shake scaled to damage (respecting shake toggle & reduced motion)
  if (typeof isShakeEnabled === 'function' ? isShakeEnabled() : (QUALITY_SETTINGS.screenShake && !isReducedMotion())) {
    const scaledShake = Math.min(24, Math.max(4, Math.round(d * 0.55)));
    SH = Math.max(SH, scaledShake);
  }
  if (typeof snd === 'function') snd(110, 0.2, 'sawtooth', 0.08, 0.5);
  if (typeof txt === 'function') txt(P.x, P.y - 20, '-' + d, '#ff5a3a');
}

function init() {
  const isEv = (typeof S !== 'undefined' && S && S.isEvent) ? 1 : 0;
  const evId = isEv ? S.evId : null;
  const evDef = isEv ? S.evDef : null;
  const evEl = isEv ? (S.evElites || 0) : 0;
  const evTw = isEv ? S.evTargetWave : null;

  S = {
    wave: 0, cash: 0, kills: 0, dm: 1, t: 0, q: [], sp: 0, bn: 0, gr: 5,
    lv: 1, xp: 0, axp: 0, pk: {}, pend: 0, po: 0, dd: 0, fz: 0, sh2: 0,
    tt: 0, ts: '', saved: 0, isEvent: isEv, evId, evDef, evElites: evEl,
    evTargetWave: evTw, evWon: false
  };

  P = {
    x: WS / 2, y: WS / 2, hp: 100, mx: 100, a: 0,
    w: WEAP.map((_, i) => i ? 0 : 1), cur: 0, cd: 0, hurt: 0, fl: 0,
    dash: 0, lx: 1, ly: 0, st: 0, safeX: WS / 2, safeY: WS / 2, safeA: 0,
    ammo: 12, maxAmmo: 12, reloading: false, reloadTimer: 0, reloadDuration: 0,
    recoil: 0, weapAmmo: {}
  };

  B = []; Z = []; D = []; F = []; T = []; RG = []; GH = []; AB = [];
  TR = []; CH = []; LT = []; NS = []; TX = []; CS = []; SH = 0;
  MAG = []; BLD = []; DEC = []; POIS = []; DUST = [];
  ACID_PUDDLES = []; AOE_DEBRIS = [];
  if (typeof DYING_ZOMBIES !== 'undefined') DYING_ZOMBIES = [];
  if (typeof CHARGER_TRAILS !== 'undefined') CHARGER_TRAILS = [];
  if (typeof TURRET_DEBRIS !== 'undefined') TURRET_DEBRIS = [];
  if (typeof clearGoreDecals === 'function') clearGoreDecals();

  SK = {
    dash: { cd: 0, max: 3 },
    nova: { cd: 0, max: 10 },
    rage: { cd: 0, max: 18, on: 0 },
    gren: { cd: 0, max: 0.5 },
    turret: { cd: 0, max: 14 },
    heal: { cd: 0, max: 18 },
    cloak: { cd: 0, max: 16 },
    bolt: { cd: 0, max: 8 },
    frost: { cd: 0, max: 14 },
    meteor: { cd: 0, max: 12 },
    shield: { cd: 0, max: 16 }
  };

  O = []; G = [];
  const curM = getCurMap();
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : (MP[curM] || MP[0]);

  // Load obstacles from MAP_DATA or procedural fallback
  if (mapDef.obstacles && mapDef.obstacles.length) {
    mapDef.obstacles.forEach(o => O.push({ ...o }));
  } else {
    const bases = MP[curM].b ? [[200, 200], [WS - 560, 200], [200, WS - 460], [WS - 560, WS - 460]] : [];
    for (const [bx, by] of bases) {
      O.push(
        { x: bx, y: by, w: 360, h: 30, k: 1 },
        { x: bx, y: by, w: 30, h: 260, k: 1 },
        { x: bx + 330, y: by, w: 30, h: 260, k: 1 },
        { x: bx, y: by + 230, w: 140, h: 30, k: 1 },
        { x: bx + 220, y: by + 230, w: 140, h: 30, k: 1 }
      );
    }
    for (let i = 0, n = 0; i < 800 && n < (MP[curM].on || 35); i++) {
      const k = Math.random() < 0.35 ? 1 : 0, long = Math.random() < 0.5;
      const w = k ? (long ? 150 : 30) : 44 + Math.random() * 30;
      const h = k ? (long ? 30 : 150) : w;
      const x = Math.random() * (WS - w - 60) + 30;
      const y = Math.random() * (WS - h - 60) + 30;
      if (Math.hypot(x + w / 2 - WS / 2, y + h / 2 - WS / 2) < 260) continue;
      if (bases.some(([bx, by]) => x + w > bx - 40 && x < bx + 400 && y + h > by - 40 && y < by + 340)) continue;
      if (O.some(o => x < o.x + o.w + 50 && x + w > o.x - 50 && y < o.y + o.h + 50 && y + h > o.y - 50)) continue;
      O.push({ x, y, w, h, k }); n++;
    }
  }

  // Ground details
  for (let i = 0; i < 350; i++) {
    G.push({ x: Math.random() * WS, y: Math.random() * WS, r: 3 + Math.random() * 14, k: Math.random() < 0.6 ? 'g' : 'c' });
  }

  // Hazards
  HZ = [];
  if (mapDef.hazards && mapDef.hazards.length) {
    mapDef.hazards.forEach(h => HZ.push({ ...h }));
  } else if (MP[curM] && MP[curM].hz) {
    for (let i = 0; i < MP[curM].hn; i++) {
      const r = 40 + Math.random() * 40;
      const x = r + Math.random() * (WS - 2 * r);
      const y = r + Math.random() * (WS - 2 * r);
      if (Math.hypot(x - WS / 2, y - WS / 2) < r + 260) continue;
      HZ.push({ x, y, r });
    }
  }
}

function startWave() {
  S.wave++;
  S.bn = 2;
  S.ev = (S.wave % 3 === 0 && S.wave % 5 !== 0) ? 1 : 0;
  if (typeof snd === 'function') snd(200, 0.4, 'sawtooth', 0.08, 0.5);
  S.q = [];

  const densityMult = (S && S.isEvent && S.evDef && S.evDef.id === 'heavy_metal') ? 2 : 1;
  const n = (6 + S.wave * 4) * densityMult;

  for (let i = 0; i < n; i++) {
    let t = 'walk';
    const r = Math.random();
    if (S.wave > 1 && r < 0.28) t = 'run';
    if (S.wave > 2 && r > 0.82) t = 'exp';
    else if (S.wave > 3 && r > 0.72) t = 'stalker';
    else if (S.wave > 4 && r > 0.62) t = 'charger';
    else if (S.wave > 4 && r > 0.52 && r < 0.62) t = 'spit';
    else if (S.wave > 3 && r > 0.9) t = 'tank';
    S.q.push(t);
  }

  if (S.wave % 5 === 0) S.q.push('boss');
  if (S.wave >= 25 && S.wave % 5 === 0) S.q.push('boss'); // Twin bosses on wave 25+
  S.sp = 0;
  run = 1;

  if (S.wave === 1 || (S.wave % 3 === 0 && S.wave % 5 !== 0)) {
    if (CH.length < 3) spawnChest(1);
  }
}

function spawn(t) {
  const curM = getCurMap();
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : (MP[curM] || MP[0]);
  const T = ZT[t] || ZT.walk;

  // Safe spawn location outside obstacles and within WS
  let x = P.x, y = P.y;
  for (let attempt = 0; attempt < 12; attempt++) {
    const an = Math.random() * 6.28;
    const dd = 420 + Math.random() * 220;
    const testX = Math.max(T.r + 30, Math.min(WS - T.r - 30, P.x + Math.cos(an) * dd));
    const testY = Math.max(T.r + 30, Math.min(WS - T.r - 30, P.y + Math.sin(an) * dd));
    const inWall = O.some(o => testX > o.x - T.r - 4 && testX < o.x + o.w + T.r + 4 && testY > o.y - T.r - 4 && testY < o.y + o.h + T.r + 4);
    if (!inWall || attempt === 11) {
      x = testX;
      y = testY;
      break;
    }
  }

  let waveHpScale = 1 + S.wave * 0.055;
  if (S.wave > 15) waveHpScale += Math.pow(S.wave - 15, 1.25) * 0.07;
  if (S.wave > 25) waveHpScale += Math.pow(S.wave - 25, 1.4) * 0.12;

  const zh = (MP[curM] && MP[curM].zh) ? MP[curM].zh : 1;
  const sc = waveHpScale * zh * (S.zc || 1);

  const baseElChance = (S && S.isEvent && S.evDef && S.evDef.id === 'elite_hunt') ? 0.24 : 0.06;
  const elBonus = S.wave > 25 ? Math.min(0.25, (S.wave - 25) * 0.02) : (S.wave > 15 ? (S.wave - 15) * 0.008 : 0);
  const elChance = Math.min(0.40, baseElChance + elBonus);
  const elWaveMin = (S && S.isEvent && S.evDef && S.evDef.id === 'elite_hunt') ? 1 : 2;
  const el = S.wave >= elWaveMin && t !== 'boss' && Math.random() < elChance;

  Z.push({
    x, y, t,
    hp: T.hp * sc * (el ? 3.5 : 1),
    mh: T.hp * sc * (el ? 3.5 : 1),
    hit: 0, cd: 0, el, flinch: 0,
    animOffset: Math.random() * 6.28,
    bv: t === 'boss' ? ((S.wave / 5 | 0) - 1) % 4 : 0,
    cgT: 0
  });
}

function fire() {
  if (P.reloading) return;
  const w = WEAP[P.cur] || WEAP[0];
  if (P.ammo == null) P.ammo = w.mag || 12;
  if (P.ammo <= 0) { startReload(); return; }

  P.ammo--;
  P.recoil = Math.min(10, (P.recoil || 0) + (w.kb ? w.kb * 3.5 : 3.5));

  if (P.ammo <= 0) {
    setTimeout(() => { if (run && !P.reloading && P.ammo <= 0) startReload(); }, Math.max(50, w.r * 750));
  }

  S.shots = (S.shots || 0) + 1;
  P.cd = w.r / ((SK.rage.on > 0 ? 1.8 : 1) * (1 + 0.06 * (SV.rof || 0)) * (S.rf || 1) * (S.bz && S.bl2 > 0 ? 1 + 0.15 * S.bz : 1) * (S.cst > 0 ? 1 + 0.25 * (S.cs || 0) : 1) * (S.hd > 0 ? 1.5 : 1));
  P.fl = 0.07;
  sfx(P.cur);

  // Muzzle smoke
  F.push({
    x: P.x, y: P.y,
    vx: Math.cos(P.a + 1.6) * (70 + Math.random() * 50),
    vy: Math.sin(P.a + 1.6) * (70 + Math.random() * 50),
    l: 0.6, c: '#d4a64a'
  });

  // Physical spent brass casing ejection
  const ca = P.a + 1.57 + (Math.random() - 0.5) * 0.35, csSpd = 80 + Math.random() * 60;
  if (!CS) CS = [];
  CS.push({
    x: P.x + Math.cos(P.a) * 10, y: P.y + Math.sin(P.a) * 10,
    vx: Math.cos(ca) * csSpd, vy: Math.sin(ca) * csSpd,
    a: Math.random() * 6.28, va: (Math.random() - 0.5) * 22,
    col: P.cur === 2 ? '#c8302a' : '#d4a64a'
  });
  if (CS.length > 70) CS.shift();

  if (QUALITY_SETTINGS.screenShake) SH = Math.max(SH, w.p > 1 ? 4 : 1.5);

  const curSkin = (typeof SV !== 'undefined' && SV && SV.eqSkin && SV.eqSkin[P.cur]) ? SKINS[SV.eqSkin[P.cur]] : null;
  const bulletCol = curSkin ? curSkin.col : WC[P.cur];
  const mOff = ((ML[P.cur] || 45) * 0.87);

  // Point-blank check: if an enemy is directly between player and muzzle, spawn close so bullets don't bypass them
  let pbTarget = null, minD = mOff + 25;
  for (const z of Z) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - P.x, z.y - P.y);
    if (d < minD) {
      const angDiff = Math.abs(Math.atan2(z.y - P.y, z.x - P.x) - P.a);
      const normDiff = Math.atan2(Math.sin(angDiff), Math.cos(angDiff));
      if (Math.abs(normDiff) < 0.65) {
        minD = d;
        pbTarget = z;
      }
    }
  }

  const bx0 = P.x + Math.cos(P.a) * (pbTarget ? 8 : mOff), by0 = P.y + Math.sin(P.a) * (pbTarget ? 8 : mOff);
  const canSpawn = hasLOS(P.x, P.y, bx0, by0);
  const sx = canSpawn ? bx0 : P.x, sy = canSpawn ? by0 : P.y;

  for (let i = 0; i < w.p + (S.xp2 || 0); i++) {
    const a = P.a + (Math.random() - 0.5) * w.sp * 2 + (S.xp2 ? (Math.random() - 0.5) * 0.12 : 0);
    const isCrit = Math.random() < 0.04 * (SV.crit || 0) + (CL[SV.cls || 0] ? CL[SV.cls || 0].crit : 0) + (S.ct || 0);
    const critMult = isCrit ? 2 : 1;
    const rawDm = S.dm || 1;
    const effDm = rawDm > 3.0 ? (3.0 + Math.sqrt(rawDm - 3.0) * 0.8) : rawDm;
    const finalDmg = w.d * effDm * (S.dd > 0 ? 2 : 1) * (1 + (S.bk || 0) * 0.35 * (1 - P.hp / P.mx)) * (S.oc && S.shots % Math.max(4, 12 - S.oc * 3) === 0 ? 3 : 1) * (S.fo && S.stl > 1 ? 1 + 0.4 * S.fo : 1) * critMult;

    const bSpeed = w.flm ? (360 + Math.random() * 70) : (w.rg > 1.2 ? 1050 : (w.sp === 0 ? 920 : 700));
    const bLife = w.flm ? 0.24 : (w.rg || 0.7);

    B.push({
      x: sx, y: sy,
      vx: Math.cos(a) * bSpeed, vy: Math.sin(a) * bSpeed,
      d: finalDmg,
      l: bLife,
      c: bulletCol,
      pr: (w.pr || 0) + (S.pc || 0),
      ex: w.ex || (S.eb ? 1 : 0),
      cl: S.cl || 0,
      fz: w.fz || 0,
      flm: w.flm || 0,
      wi: P.cur,
      isCrit
    });
  }

  // Flamethrower ambient flame billowing
  if (w.flm && F.length < 240) {
    F.push({
      x: sx, y: sy,
      vx: Math.cos(P.a) * 220 + (Math.random() - 0.5) * 70,
      vy: Math.sin(P.a) * 220 + (Math.random() - 0.5) * 70,
      l: 0.2, c: Math.random() < 0.5 ? '#ffcc00' : '#ff5500', s: 5
    });
  }
}

// CENTRALIZED DAMAGE PIPELINE
function damageZ(z, rawDmg, src, isCrit) {
  if (!z || z.dead) return false;
  if (!isFinite(z.hp) || z.hp <= 0) {
    z.hp = 0;
    killZ(z, src || 'invalid_hp');
    return true;
  }
  const dmg = Number(rawDmg);
  if (!isFinite(dmg) || dmg <= 0) return false;

  const arm = (z.t === 'tank' ? 0.85 : (z.t === 'charger' ? 0.90 : 1)) * (z.el ? 0.88 : 1);
  const finalD = Math.max(1, dmg * arm);
  z.hp -= finalD;
  z.hit = 0.12;
  z.flinch = 0.12;

  // Surface-aware & archetype-aware blood splatter physics
  if (typeof spawnBloodHit === 'function') {
    spawnBloodHit(z.x, z.y, finalD, isCrit, z.t);
  }

  if (!isFinite(z.hp) || z.hp <= 0) {
    z.hp = 0;
    killZ(z, src);
    return true;
  }
  return false;
}

// CENTRALIZED DEATH PIPELINE
function killZ(z, src) {
  if (!z || z.dead) return;
  z.dead = 1;
  z.hp = 0;
  z.cd = 999;

  S.kills = (S.kills || 0) + 1;
  const T = ZT[z.t] || ZT.walk;

  // Call high-fidelity kill gore system (gibs, growing pools, ground stains)
  if (typeof spawnKillGore === 'function') {
    spawnKillGore(z.x, z.y, z.t, src);
  }

  // Per-type death animations (collapse/fall back/dissolve)
  if (typeof spawnDyingZombie === 'function') {
    spawnDyingZombie(z, src);
  }

  // Boss handling & relic rewards
  if (z.t === 'boss') {
    const bv = z.bv || 0;
    const bCol = bv === 0 ? '255,80,20' : bv === 1 ? '180,90,255' : bv === 2 ? '90,240,60' : '0,229,255';
    RG.push({ x: z.x, y: z.y, r: 10, l: 0.7, v: 550, c: bCol });
    RG.push({ x: z.x, y: z.y, r: 5, l: 0.9, v: 380, c: '255,255,255' });
    burst(z.x, z.y, T.col, 24, 4.5, 140, 1);
    burst(z.x, z.y, '#ffd36b', 16, 3, 180, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.6, k: 'b' });
    if (CH.length < 3) CH.push({ x: z.x, y: z.y, ph: 1, boss: 1 });
    S.pend++;
    S.ts = 'BOSS DOWN! +POWER';
    S.tt = 3;
    const un = AR.map((a, i) => i).filter(i => !SV.ar.includes(i));
    if (un.length) {
      const i = un[Math.floor(Math.random() * un.length)];
      SV.ar.push(i);
      S.ts = 'RELIC: ' + AR[i][0];
      sv();
    }
  } else if (z.t === 'exp') {
    RG.push({ x: z.x, y: z.y, r: 6, l: 0.4, v: 380, c: '255,140,40' });
    burst(z.x, z.y, '#ff9a3a', 16, 4, 120, 1);
    burst(z.x, z.y, '#ffdd44', 12, 3, 90);
    G.push({ x: z.x, y: z.y, r: T.r * 1.5, k: 'g' });
  } else if (z.t === 'stalker') {
    burst(z.x, z.y, '#c955ff', 16, 3, 80);
    burst(z.x, z.y, '#9d4edd', 10, 2, 110);
    G.push({ x: z.x, y: z.y, r: T.r * 1.1, k: 'b' });
  } else if (z.t === 'tank') {
    burst(z.x, z.y, '#4a3a38', 14, 5, 70, 1);
    burst(z.x, z.y, '#ff6020', 10, 2.5, 120, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.4, k: 'b' });
  } else if (z.t === 'spit') {
    burst(z.x, z.y, '#55ff44', 16, 3.5, 85);
    burst(z.x, z.y, '#22aa18', 10, 4, 60);
    G.push({ x: z.x, y: z.y, r: T.r * 1.3, k: 'g' });
  } else if (z.t === 'charger') {
    burst(z.x, z.y, '#8a4828', 14, 4, 90, 1);
    burst(z.x, z.y, '#d8c9a0', 8, 3, 130, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.3, k: 'b' });
  } else {
    burst(z.x, z.y, T.col, 12, 3.5, 90, 1);
    burst(z.x, z.y, '#c8502d', 8, 2.5, 110, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.2, k: 'b' });
  }

  // Elite kill feedback
  if (z.el) {
    burst(z.x, z.y, '#ffd84a', 20, 3.5, 130, 1);
    RG.push({ x: z.x, y: z.y, r: 8, l: 0.5, v: 450, c: '255,216,74' });
    if (typeof txt === 'function') txt(z.x, z.y - 25, 'ELITE SLAIN!', '#ffd84a', true);
  }

  // Cash drop with arc pop physics
  const curM = getCurMap();
  const cm = (MP[curM] && MP[curM].cm) ? MP[curM].cm : 1;
  const cashVal = Math.round(T.c * (S.ev ? 1.5 : 1) * cm * (S.cm || 1) * (z.el ? 4 : 1));
  if (typeof spawnDrop === 'function') {
    spawnDrop(z.x, z.y, 'c', cashVal);
  }

  // Rare health drop
  const hpDropChance = 0.05 + (S.lk || 0) * 0.03;
  if (Math.random() < hpDropChance && typeof spawnDrop === 'function') {
    spawnDrop(z.x + 12, z.y, 'h', Math.round(P.mx * 0.25));
  }

  // XP progression & combo
  gainXP(z.el ? 35 : (z.t === 'boss' ? 120 : 10));
  S.cmb = (S.cmb || 0) + 1;
  S.cmt = 2.5;

  // Lifesteal perk
  if (S.ls) healP(S.ls);

  // Volatile corpses perk
  if (S.vc && Math.random() < 0.25) {
    boom({ x: z.x, y: z.y, ex: 80, d: 65 * S.dm });
  }

  // Kill rush cooldown shave
  if (S.hs) {
    for (const k in SK) if (SK[k].cd > 0) SK[k].cd = Math.max(0, SK[k].cd - 0.12 * S.hs);
  }

  // Bloodlust perk
  if (S.bz) S.bl2 = 2.5;

  // Missions & Events tracking
  if (typeof trackMissionProgress === 'function') trackMissionProgress('kills', 1);
  if (z.el && typeof trackMissionProgress === 'function') trackMissionProgress('elites', 1);
  if (S && S.isEvent && typeof trackEventKill === 'function') trackEventKill(z);
}

function boom(b, y0, r0, c0) {
  const x = (typeof b === 'object') ? b.x : b;
  const y = (typeof b === 'object') ? b.y : y0;
  const r = (typeof b === 'object') ? (b.ex || 90) : (r0 || 90);
  const dmg = (typeof b === 'object') ? (b.d || 85) : 85;

  RG.push({ x, y, r: 8, l: 0.55, v: 480, c: '255,140,40' });
  burst(x, y, '#ff5a3a', 22, 5, 140, 1);
  burst(x, y, '#ffd36b', 18, 4, 180, 1);

  // AoE ground debris & flying chunks
  for (let k = 0; k < 10; k++) {
    const da = Math.random() * 6.28, dspd = 50 + Math.random() * 110;
    AOE_DEBRIS.push({
      x, y,
      vx: Math.cos(da) * dspd,
      vy: Math.sin(da) * dspd,
      l: 0.5 + Math.random() * 0.4,
      maxL: 0.9,
      sz: 2.5 + Math.random() * 3.5,
      col: k % 2 === 0 ? '#4b5563' : '#6b7280'
    });
  }
  if (AOE_DEBRIS.length > 60) AOE_DEBRIS.splice(0, AOE_DEBRIS.length - 60);

  if (typeof isShakeEnabled === 'function' ? isShakeEnabled() : (QUALITY_SETTINGS.screenShake && !isReducedMotion())) {
    SH = Math.max(SH, 14);
  }
  if (typeof noise === 'function') noise(0.35, 0.14);

  // Apply explosion damage through centralized damage pipeline
  for (const z of Z) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - x, z.y - y);
    if (d < r) {
      const pct = 1 - (d / r);
      damageZ(z, dmg * pct, 'explosion', pct > 0.7);
    }
  }

  // Player blast damage if in radius
  if (P && P.hp > 0 && !(P.dash > 0) && Math.hypot(P.x - x, P.y - y) < r * 0.6) {
    hurtP(Math.round(20 * (1 - Math.hypot(P.x - x, P.y - y) / (r * 0.6))), x, y);
  }
}

function push(z, r) {
  for (const o of O) {
    const cx = Math.max(o.x, Math.min(z.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(z.y, o.y + o.h));
    const dx = z.x - cx, dy = z.y - cy, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { z.x += 1; continue; }
      z.x += (dx / d) * (r - d);
      z.y += (dy / d) * (r - d);
    }
  }
}

function swap(dir = 1) {
  if (!P || P.reloading) return;
  const unlocked = [];
  WEAP.forEach((_, i) => { if (P.w[i]) unlocked.push(i); });
  if (unlocked.length <= 1) return;

  let idx = unlocked.indexOf(P.cur);
  idx = (idx + dir + unlocked.length) % unlocked.length;
  P.cur = unlocked[idx];
  P.maxAmmo = WEAP[P.cur].mag || 12;
  P.ammo = (P.weapAmmo && P.weapAmmo[P.cur] != null) ? P.weapAmmo[P.cur] : P.maxAmmo;
  P.recoil = 0;
  if (typeof snd === 'function') snd(400, 0.1, 'square', 0.04, 1.2);
}

function skill(k) {
  if (!P || P.hp <= 0) return;
  const s = SK[k];
  if (!s || s.cd > 0) return;
  s.cd = s.max;

  if (k === 'dash') {
    P.dash = 0.22;
    P.st = 0;
    if (typeof snd === 'function') snd(240, 0.2, 'sawtooth', 0.08, 0.4);
    burst(P.x, P.y, '#8fae4a', 14);
  } else if (k === 'nova') {
    RG.push({ x: P.x, y: P.y, r: 10, l: 0.6, v: 620, c: '255,90,40' });
    burst(P.x, P.y, '#ff5a3a', 28);
    for (const z of Z) {
      if (!z.dead && Math.hypot(z.x - P.x, z.y - P.y) < 180) {
        damageZ(z, 90 * S.dm, 'nova');
      }
    }
    if (QUALITY_SETTINGS.screenShake) SH = Math.max(SH, 8);
    if (typeof noise === 'function') noise(0.25, 0.1);
  } else if (k === 'rage') {
    s.on = 6;
    burst(P.x, P.y, '#ffb347', 16);
    if (typeof snd === 'function') snd(350, 0.3, 'sawtooth', 0.08, 1.8);
  } else if (k === 'gren') {
    if (S.gr <= 0) return;
    S.gr--;
    const gx = P.x + Math.cos(P.a) * 120, gy = P.y + Math.sin(P.a) * 120;
    boom({ x: gx, y: gy, ex: 110, d: 110 * S.dm });
  } else if (k === 'turret') {
    TR.push({ x: P.x + Math.cos(P.a) * 28, y: P.y + Math.sin(P.a) * 28, l: 18, cd: 0, a: P.a });
    burst(P.x, P.y, '#ffd36b', 14);
    if (typeof snd === 'function') snd(300, 0.2, 'square', 0.05, 1.5);
  }
}

function gainXP(amt) {
  if (!S) return;
  S.xp = (S.xp || 0) + amt;
  S.axp = (S.axp || 0) + amt;
  const needed = (typeof rneed === 'function') ? rneed(S.lv || 1) : 100;
  if (S.xp >= needed) {
    S.xp -= needed;
    S.lv = (S.lv || 1) + 1;
    S.pend = (S.pend || 0) + 1;
    S.lu = 2.0; // Flash LEVEL UP text
    if (typeof snd === 'function') snd(650, 0.4, 'triangle', 0.08, 2.0);
  }
}

function commitXP() {
  if (!S || S.committed) return;
  S.committed = true;
  if (typeof SV !== 'undefined') {
    SV.cr = (SV.cr || 0) + (S.cash || 0);
    SV.kills = (SV.kills || 0) + (S.kills || 0);
  }
}

function saveBest() {
  if (typeof SV === 'undefined' || !S) return;
  commitXP();
  if (S.wave > 0) SV.best = Math.max(SV.best || 0, S.wave);
  if (typeof sv === 'function') sv();
}

function pause() {
  run = 0;
  const p = document.getElementById('pause');
  if (p) p.classList.add('on');
}

function resume() {
  const p = document.getElementById('pause');
  if (p) p.classList.remove('on');
  run = 1;
}

function quit() {
  const p = document.getElementById('pause');
  if (p) p.classList.remove('on');
  saveBest();
  if (typeof clearEventContext === 'function') clearEventContext();
  const s = document.getElementById('start');
  if (s) s.classList.add('on');
  if (typeof lobby === 'function') lobby();
}

function spawnChest(n = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, d = 160 + Math.random() * 200;
    const cx = Math.max(40, Math.min(WS - 40, P.x + Math.cos(a) * d));
    const cy = Math.max(40, Math.min(WS - 40, P.y + Math.sin(a) * d));
    CH.push({ x: cx, y: cy, ph: Math.random() * 6.28, o: 0 });
  }
}

function openChest(c) {
  if (typeof snd === 'function') snd(750, 0.35, 'triangle', 0.08, 1.8);
  burst(c.x, c.y, '#ffd36b', 24);
  const cashBonus = 150 + Math.round(Math.random() * 200);
  if (typeof spawnDrop === 'function') {
    spawnDrop(c.x, c.y, 'c', cashBonus);
  }
  S.pend = (S.pend || 0) + 1; // Free power selection
}

function openPerk() {
  if (!S || S.po || S.pend <= 0) return;
  S.po = 1;
  run = 0;

  const modal = document.getElementById('perk');
  const cards = document.getElementById('pcards') || document.getElementById('pkcards');
  if (!modal || !cards) return;

  cards.innerHTML = '';
  // Pick 3 random distinct perks from PKS
  const pool = [...PKS].sort(() => Math.random() - 0.5).slice(0, 3);
  pool.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'background:rgba(20,24,18,.96);border:1.5px solid ' + p[4] + ';border-radius:10px;padding:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:transform .15s;';
    const iconUri = (typeof getPerkIcon === 'function') ? getPerkIcon(p[0], p[4]) : '';
    card.innerHTML = (iconUri ? `<div style="width:38px;height:38px;border-radius:8px;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;border:1px solid ${p[4]}55"><img src="${iconUri}" style="width:26px;height:26px"></div>` : '')
      + `<div style="flex:1;min-width:0">`
      + `<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:${p[4]};font-size:13px;letter-spacing:.5px">${p[0]}</b>`
      + `<span style="font-size:9px;font-weight:800;color:#ffd36b;letter-spacing:1px">${p[5]}</span></div>`
      + `<p style="font-size:11px;opacity:.9;line-height:1.4;margin:4px 0 0 0;color:#ccc">${p[1]}</p>`
      + `</div>`;
    card.onclick = () => {
      applyPerk(p);
      S.pend--;
      S.po = 0;
      modal.classList.remove('on');
      if (S.pend > 0) openPerk(); else run = 1;
    };
    cards.appendChild(card);
  });

  const qp = document.getElementById('quickpick');
  if (qp) {
    qp.onclick = () => {
      if (pool[0]) {
        applyPerk(pool[0]);
        S.pend--;
        S.po = 0;
        modal.classList.remove('on');
        if (S.pend > 0) openPerk(); else run = 1;
      }
    };
  }

  modal.classList.add('on');
}

function applyPerk(p) {
  p[2]();
  S.pk[p[0]] = (S.pk[p[0]] || 0) + 1;
  if (typeof snd === 'function') snd(700, 0.15, 'triangle', 0.06, 1.5);
  const nm = p[0].startsWith('✦ ') ? p[0].slice(2) : p[0];
  if (typeof txt === 'function') txt(P.x, P.y - 25, nm.toUpperCase(), p[4] || '#ffd36b', true);
}

// MAIN SIMULATION UPDATE TICK
function update(dt) {
  if (!P) return;
  sanitizePlayer();

  // Hit-stop micro-pause (35ms)
  if (HIT_STOP_TIMER > 0) {
    HIT_STOP_TIMER -= dt;
    return;
  }

  // Dual virtual sticks & keyboard inputs
  let mx = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0);
  let my = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0);
  let firing = M.down;

  const L = stick(J.l);
  if (L[2]) { mx = L[0]; my = L[1]; }
  const R = stick(J.r);
  if (R[2]) { P.a = Math.atan2(R[1], R[0]); firing = 1; }
  else if (!TCH && M.moved) { P.a = Math.atan2(M.y - (P.y - CY), M.x - (P.x - CX)); }

  const l = Math.hypot(mx, my);
  if (l > 1) { mx /= l; my /= l; }
  const m2 = Math.hypot(mx, my);
  if (m2 > 0.1) { P.lx = mx / m2; P.ly = my / m2; }

  const isMinigunFiring = (firing && P.cur === 4);
  const clsData = (typeof CL !== 'undefined' && CL[SV.cls || 0]) ? CL[SV.cls || 0] : { spd: 180 };
  let sp = clsData.spd * (1 + 0.04 * (SV.spd || 0)) * (S.ms || 1) * (S.cst > 0 ? 1 + 0.15 * (S.cs || 0) : 1) * (S.hd > 0 ? 1.3 : 1) * (isMinigunFiring ? 0.78 : 1);
  let vx = mx, vy = my;

  if (P.dash > 0) {
    P.dash -= dt;
    sp = 650;
    vx = P.lx; vy = P.ly;
  }

  if (Math.hypot(vx, vy) > 0.1) P.st = (P.st || 0) + dt * 14;
  P.x += vx * sp * dt;
  P.y += vy * sp * dt;
  sanitizePlayer();

  // Skill cooldowns
  for (const k in SK) SK[k].cd -= dt * (1 + 0.05 * (SV.cdr || 0)) * (S.cd2 || 1);
  SK.rage.on -= dt;
  P.fl -= dt;
  SH *= 0.88;
  S.t += dt;

  if (SV.regen) P.hp = Math.min(P.mx, P.hp + 0.4 * SV.regen * dt);
  if (P.dash > 0) GH.push({ x: P.x, y: P.y, l: 0.25 });

  P.cd -= dt;
  P.hurt -= dt;
  S.dd -= dt;
  S.fz -= dt;
  S.sh2 -= dt;
  if (S.nukeFlash > 0) S.nukeFlash -= dt;
  if (S.mgTime > 0) S.mgTime -= dt;
  if (S.lu > 0) S.lu -= dt;

  // Hurt vignette decay
  if (HURT_VIGNETTE_TIMER > 0) HURT_VIGNETTE_TIMER -= dt;

  // Map hazard damage
  for (const h of HZ) {
    if (Math.hypot(P.x - h.x, P.y - h.y) < h.r && !(P.dash > 0) && !(S.sh2 > 0)) {
      const curM = getCurMap();
      const hd = (MP[curM] && MP[curM].hd) ? MP[curM].hd : 15;
      P.hp -= hd * dt;
      if (Math.random() < 0.15) F.push({ x: P.x, y: P.y, vx: 0, vy: -30, l: 0.4, c: MP[curM].hz });
    }
  }

  // Firing check
  if (firing && P.cd <= 0) fire();

  // Wave spawn queue
  if (S.q.length) {
    S.sp -= dt;
    const densityMult = (S && S.isEvent && S.evDef && S.evDef.id === 'heavy_metal') ? 2 : 1;
    if (S.sp <= 0 && Z.length < 55) {
      spawn(S.q.shift());
      S.sp = Math.max(0.15, (1.0 - S.wave * 0.055) / densityMult);
    }
  }

  // Update projectiles
  for (const b of B) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.l -= dt;
    for (const o of O) {
      if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) {
        b.l = 0;
        if (b.ex) boom(b);
        burst(b.x, b.y, '#bbb', 3);
      }
    }
  }
  B = B.filter(b => b.l > 0);
  if (B.length > 300) B.splice(0, B.length - 300);

  // Update Turrets
  if (typeof updateTurrets === 'function') updateTurrets(dt);

  // Update Pickups (magnetic steering + particle trails)
  if (typeof updateDrops === 'function') updateDrops(dt, P);

  // Update Floating Text
  if (typeof updateFloatingTexts === 'function') updateFloatingTexts(dt);

  // Update Gore Decals & Footprints
  if (typeof updateGoreSystem === 'function') updateGoreSystem(dt);

  // Update physical shell casings & magazines
  for (const c of CS) {
    if (c.vx || c.vy) {
      c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.85; c.vy *= 0.85;
      c.a += c.va * dt; c.va *= 0.85;
      if (Math.hypot(c.vx, c.vy) < 5) { c.vx = 0; c.vy = 0; c.va = 0; }
    }
  }
  for (const m of MAG) {
    if (m.vx || m.vy) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.82; m.vy *= 0.82;
      m.a += m.va * dt; m.va *= 0.82;
      if (Math.hypot(m.vx, m.vy) < 5) { m.vx = 0; m.vy = 0; m.va = 0; }
    }
    m.l -= dt;
  }
  MAG = MAG.filter(m => m.l > 0);

  // Player recoil decay
  if (P.recoil > 0) P.recoil = Math.max(0, P.recoil - dt * 26);

  // Reload progress tick
  if (P.reloading) {
    P.reloadTimer -= dt;
    if (P.reloadTimer <= 0) {
      P.reloading = false;
      P.maxAmmo = WEAP[P.cur].mag || 12;
      P.ammo = P.maxAmmo;
      sndReloadEnd();
    }
  }

  // Zombie AI, movement & collisions
  for (const z of Z) {
    if (!z || z.dead || (z.hp != null && z.hp <= 0) || !isFinite(z.x) || !isFinite(z.y)) {
      if (z && !z.dead && (z.hp <= 0 || !isFinite(z.hp))) killZ(z, 'cleanup');
      if (z) z.dead = 1;
      continue;
    }
    if (z.flinch > 0) z.flinch = Math.max(0, z.flinch - dt);

    const T = ZT[z.t] || ZT.walk;
    const speed = T.s || T.spd || 55;
    const zRadius = T.r || 13;
    const damage = T.dm != null ? T.dm : (T.dmg != null ? T.dmg : 8);
    const a = Math.atan2(P.y - z.y, P.x - z.x);
    if (z.fz > 0) z.fz -= dt;
    const sl = (z.hit > 0 ? 0.3 : 1) * (P.cloak > 0 ? 0.25 : 1) * (S.fz > 0 ? 0.1 : 1) * (z.fz > 0 ? 0.45 : 1) * (1 - 0.12 * (S.tw || 0)) * (S.ev ? 1.3 : 1) * (z.ch > 0 ? 3.2 : 1);

    const decay = Math.exp(-dt * 9);
    z.kx = (z.kx || 0) * decay; z.ky = (z.ky || 0) * decay;
    if (Math.hypot(z.kx, z.ky) < 4 || !isFinite(z.kx) || !isFinite(z.ky)) { z.kx = 0; z.ky = 0; }

    z.x += Math.cos(a) * speed * dt * sl + z.kx * dt;
    z.y += Math.sin(a) * speed * dt * sl + z.ky * dt;
    if (!isFinite(z.x) || !isFinite(z.y)) { z.dead = 1; continue; }

    z.ph = (z.ph || 0) + dt * speed / 8;
    z.age = (z.age || 0) + dt;
    push(z, zRadius);

    // Boundary constraints
    z.x = Math.max(zRadius + 8, Math.min(WS - zRadius - 8, z.x));
    z.y = Math.max(zRadius + 8, Math.min(WS - zRadius - 8, z.y));

    // Zombie melee attack
    const dd = Math.hypot(P.x - z.x, P.y - z.y);
    if (dd < zRadius + 12 && z.cd <= 0 && !(P.dash > 0) && !(P.cloak > 0)) {
      if (hasLOS(z.x, z.y, P.x, P.y)) {
        z.cd = 0.8;
        hurtP(damage, z.x, z.y);
      }
    }

    // Spitter ranged acid attack
    if (z.t === 'spit' && dd < 360 && dd > 65 && z.cd <= 0 && !(P.dash > 0) && !(P.cloak > 0)) {
      if (hasLOS(z.x, z.y, P.x, P.y)) {
        z.cd = 2.4;
        const abSpd = 240;
        AB.push({
          x: z.x, y: z.y,
          vx: Math.cos(a) * abSpd, vy: Math.sin(a) * abSpd,
          l: Math.min(1.4, dd / abSpd),
          r: 6
        });
        if (typeof snd === 'function') snd(220, 0.12, 'sawtooth', 0.05, 0.6);
      }
    }

    // Bullet collisions with zombie
    for (const b of B) {
      if (z.dead) break;
      if (b.l > 0 && !(b.h && b.h.includes(z)) && Math.hypot(b.x - z.x, b.y - z.y) < T.r + 4) {
        damageZ(z, b.d, 'bullet', b.isCrit);
        if (b.ex) boom(b);
        (b.h = b.h || []).push(z);
        if (b.pr > 0) b.pr--; else b.l = 0;
        if (b.fz) z.fz = 2.5;

        // Knockback
        const bSpd = Math.hypot(b.vx, b.vy) || 1;
        const bDirX = b.vx / bSpd, bDirY = b.vy / bSpd;
        const wKb = (b.wi != null && WEAP[b.wi] && WEAP[b.wi].kb != null) ? WEAP[b.wi].kb : 1;
        const impulse = Math.min(65, 36 * wKb) * (T.kb || 1);
        z.kx = (z.kx || 0) + bDirX * impulse;
        z.ky = (z.ky || 0) + bDirY * impulse;
      }
    }
  }

  Z = Z.filter(z => !z.dead);

  // Update Spitter Acid Projectiles (AB)
  for (let i = AB.length - 1; i >= 0; i--) {
    const ab = AB[i];
    ab.l -= dt;
    ab.x += ab.vx * dt;
    ab.y += ab.vy * dt;
    if (Math.random() < 0.4 && typeof F !== 'undefined') {
      F.push({ x: ab.x, y: ab.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, l: 0.25, c: '#4ade80', s: 2.5 });
    }
    const hitP = (P && Math.hypot(P.x - ab.x, P.y - ab.y) < 14);
    if (ab.l <= 0 || hitP) {
      if (hitP) hurtP(16, ab.x, ab.y);
      // Spawn Spitter Acid Puddle that damages and shrinks
      ACID_PUDDLES.push({
        x: ab.x, y: ab.y,
        r: 28, maxR: 28,
        l: 5.5, maxL: 5.5
      });
      if (ACID_PUDDLES.length > 25) ACID_PUDDLES.shift();
      burst(ab.x, ab.y, '#4ade80', 10, 3, 60);
      AB.splice(i, 1);
    }
  }

  // Update Spitter Acid Puddles (damage & shrinking)
  for (let i = ACID_PUDDLES.length - 1; i >= 0; i--) {
    const ap = ACID_PUDDLES[i];
    ap.l -= dt;
    ap.r = ap.maxR * Math.max(0.12, ap.l / ap.maxL);
    if (P && P.hp > 0 && !(P.dash > 0) && !(S && S.sh2 > 0)) {
      if (Math.hypot(P.x - ap.x, P.y - ap.y) < ap.r + 10) {
        hurtP(18 * dt, ap.x, ap.y);
        if (Math.random() < 0.25 && typeof F !== 'undefined') {
          F.push({ x: P.x + (Math.random() - 0.5) * 12, y: P.y + (Math.random() - 0.5) * 12, vx: 0, vy: -25, l: 0.3, c: '#4ade80' });
        }
      }
    }
    if (ap.l <= 0) ACID_PUDDLES.splice(i, 1);
  }

  // Update dying zombies, debris & effects
  if (typeof updateDyingZombies === 'function') updateDyingZombies(dt);
  for (let i = AOE_DEBRIS.length - 1; i >= 0; i--) {
    const deb = AOE_DEBRIS[i];
    deb.l -= dt;
    deb.x += deb.vx * dt;
    deb.y += deb.vy * dt;
    deb.vx *= 0.88;
    deb.vy *= 0.88;
    if (deb.l <= 0) AOE_DEBRIS.splice(i, 1);
  }

  // Chests collection
  for (const c of CH) {
    if (Math.hypot(P.x - c.x, P.y - c.y) < 34) {
      c.o = 1;
      openChest(c);
    }
  }
  CH = CH.filter(c => !c.o);

  // Floating text / particles decay
  for (const f of F) {
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.fr) { f.vx *= 0.9; f.vy *= 0.9; }
    f.l -= dt;
  }
  F = F.filter(f => f.l > 0);

  // Shockwave rings decay
  for (const r of RG) { r.r += (r.v || 520) * dt; r.l -= dt; }
  RG = RG.filter(r => r.l > 0);

  // Player death check
  if (P.hp <= 0 && S.ph > 0) {
    S.ph--;
    P.hp = P.mx * 0.5;
    S.sh2 = 3;
    for (const z of Z) { if (!z.dead) damageZ(z, 200 * S.dm, 'phoenix'); }
    RG.push({ x: P.x, y: P.y, r: 10, l: 0.7, v: 800, c: '255,160,40' });
    burst(P.x, P.y, '#ffb347', 40);
    SH = 16;
    S.ts = 'PHOENIX REBORN';
    S.tt = 3;
    if (typeof snd === 'function') snd(300, 0.5, 'sine', 0.12, 2);
  }

  if (S.pend > 0 && !S.po && P.hp > 0) openPerk();

  if (P.hp <= 0) {
    run = 0;
    saveBest();
    if (S.isEvent && S.evDef) {
      document.getElementById('sum').innerHTML = `<div style="font-size:15px;color:#ff5a3a;font-weight:900;margin-bottom:6px">✕ ${S.evDef.title} FAILED</div>`
        + `<div style="font-size:12px;opacity:.9;line-height:1.6;margin-bottom:6px">Operative eliminated in sector.<br>`
        + (S.evDef.targetElites ? `Elites Eliminated: <b>${S.evElites || 0}/${S.evDef.targetElites}</b><br>` : '')
        + `Wave Reached: <b>Wave ${S.wave}</b> (Target: Wave ${S.evTargetWave || 5})</div>`;
    } else {
      const eb = S.earnBreakdown || { wave: S.wave * 35, kills: Math.floor(S.kills * 1.5), cash: 0 };
      document.getElementById('sum').innerHTML = '<div style="font-size:13.5px;margin-bottom:6px"><b>WAVE ' + S.wave + '</b> &bull; ' + S.kills + ' KILLS &bull; SURVIVOR LV ' + S.lv + '</div>'
        + '<div style="font-size:11.5px;opacity:.9;line-height:1.6;margin-bottom:6px">'
        + 'Wave Bounty: <b>+' + eb.wave + ' cr</b> | Kills: <b>+' + eb.kills + ' cr</b> | Cash Converted ($' + (S.cash || 0) + '): <b>+' + eb.cash + ' cr</b><br>'
        + '<span style="color:#ffd36b;font-weight:800;font-size:13.5px">Total Earned: +' + S.earn + ' CREDITS</span></div>'
        + '<div style="font-size:11px;color:#8fae4a">Account Rank: ' + SV.lvl + (S.up ? ' (+' + S.up + ' Skill Points!)' : '') + '</div>';
    }
    document.getElementById('over').classList.add('on');
  } else if (!S.q.length && !Z.length && !S.po) {
    run = 0;
    openShop();
  }
}

// MAIN 2D RENDERING PIPELINE
function draw() {
  sanitizePlayer();
  X.setTransform(DPR, 0, 0, DPR, 0, 0);
  X.globalAlpha = 1;
  X.setLineDash([]);

  // Camera tracking with look-ahead vector
  const lookX = Math.cos(P.a) * 30, lookY = Math.sin(P.a) * 30;
  const shakeX = QUALITY_SETTINGS.screenShake ? (Math.random() - 0.5) * SH : 0;
  const shakeY = QUALITY_SETTINGS.screenShake ? (Math.random() - 0.5) * SH : 0;
  let cx = Math.max(0, Math.min(WS - W, P.x - W / 2 + lookX)) + shakeX;
  let cy = Math.max(0, Math.min(WS - H, P.y - H / 2 + lookY)) + shakeY;
  if (!isFinite(cx)) cx = 0; if (!isFinite(cy)) cy = 0;
  CX = cx; CY = cy;

  // Clear background
  X.fillStyle = '#0a0d0a';
  X.fillRect(0, 0, W, H);

  const curM = getCurMap();
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : (MP[curM] || MP[0]);

  X.save();
  X.translate(-cx, -cy);

  // 1. World Ground Base Fill
  X.fillStyle = mapDef.ground || '#181f15';
  X.fillRect(0, 0, WS, WS);

  // Subtle tactical ground grid
  X.strokeStyle = mapDef.grid || 'rgba(0,0,0,0.18)';
  X.lineWidth = 1;
  X.beginPath();
  for (let i = 0; i <= WS; i += 100) {
    X.moveTo(i, 0); X.lineTo(i, WS);
    X.moveTo(0, i); X.lineTo(WS, i);
  }
  X.stroke();

  // 2. Roads, Crosswalks, and Sidewalks
  if (mapDef.roads && mapDef.roads.length) {
    for (const rd of mapDef.roads) {
      // Asphalt road body
      X.fillStyle = '#1c211b';
      X.fillRect(rd.x, rd.y, rd.w, rd.h);
      X.strokeStyle = '#111510';
      X.lineWidth = 2;
      X.strokeRect(rd.x, rd.y, rd.w, rd.h);

      // Yellow dashed center line
      X.strokeStyle = '#eab308';
      X.lineWidth = 2;
      X.setLineDash([14, 10]);
      X.beginPath();
      if (rd.w > rd.h) {
        X.moveTo(rd.x, rd.y + rd.h / 2); X.lineTo(rd.x + rd.w, rd.y + rd.h / 2);
      } else {
        X.moveTo(rd.x + rd.w / 2, rd.y); X.lineTo(rd.x + rd.w / 2, rd.y + rd.h);
      }
      X.stroke();
      X.setLineDash([]);
    }
  }

  // 3. Ground Decals Pass (Baked offscreen canvas + fresh pools + footprints)
  if (typeof renderGoreGroundPass === 'function') {
    renderGoreGroundPass(cx, cy, W, H);
  }

  // 4. Spent brass shell casings
  for (const c of CS) {
    if (c.x < cx - 20 || c.x > cx + W + 20 || c.y < cy - 20 || c.y > cy + H + 20) continue;
    X.save(); X.translate(c.x, c.y); X.rotate(c.a);
    X.fillStyle = 'rgba(0,0,0,0.35)'; X.fillRect(-2, -0.5, 5, 2.5);
    X.fillStyle = c.col; X.fillRect(-2.5, -1, 5, 2);
    X.fillStyle = 'rgba(255,255,255,0.45)'; X.fillRect(-1.5, -1, 2, 0.8);
    X.restore();
  }

  // 5. Physical dropped magazines
  for (const m of MAG) {
    if (m.x < cx - 20 || m.x > cx + W + 20 || m.y < cy - 20 || m.y > cy + H + 20) continue;
    X.save(); X.translate(m.x, m.y); X.rotate(m.a);
    X.fillStyle = 'rgba(0,0,0,0.38)'; X.fillRect(-3, -2, 7, 14);
    X.fillStyle = m.col || '#2d3326'; X.fillRect(-3.5, -2.5, 7, 13);
    X.fillStyle = '#8fae4a'; X.fillRect(-2.5, -2, 5, 2.5);
    X.restore();
  }

  // 6. 3D Extruded Obstacles & Buildings
  for (const o of O) {
    if (o.x + o.w < cx - 100 || o.x > cx + W + 100 || o.y + o.h < cy - 100 || o.y > cy + H + 100) continue;
    // Ambient drop shadow (bottom-right: light from top-left)
    X.fillStyle = 'rgba(0,0,0,0.52)';
    X.fillRect(o.x + 6, o.y + 8, o.w, o.h);

    // Dark bottom extruded side face
    X.fillStyle = '#11160e';
    X.fillRect(o.x, o.y + o.h - 6, o.w, 6);

    // Top face
    X.fillStyle = mapDef.wall || '#2a3523';
    X.fillRect(o.x, o.y, o.w, o.h - 6);

    // Top edge highlight & bottom edge shadow
    X.fillStyle = 'rgba(255,255,255,0.2)';
    X.fillRect(o.x + 1, o.y + 1, o.w - 2, 2.5);
    X.fillStyle = 'rgba(0,0,0,0.4)';
    X.fillRect(o.x + 1, o.y + o.h - 8, o.w - 2, 2);

    // Perimeter stroke
    X.strokeStyle = mapDef.accent || '#3d4f34';
    X.lineWidth = 1.8;
    X.strokeRect(o.x, o.y, o.w, o.h);
  }

  // 7. Map Props & Streetlamps with radial light cones
  if (mapDef.props && mapDef.props.length) {
    for (const pr of mapDef.props) {
      if (pr.x < cx - 80 || pr.x > cx + W + 80 || pr.y < cy - 80 || pr.y > cy + H + 80) continue;
      if (pr.type === 'lamp') {
        // Soft additive light cone onto ground
        const lGrad = X.createRadialGradient(pr.x, pr.y, 10, pr.x, pr.y, 110);
        lGrad.addColorStop(0, 'rgba(255,245,200,0.22)');
        lGrad.addColorStop(1, 'rgba(255,245,200,0)');
        X.fillStyle = lGrad;
        X.beginPath(); X.arc(pr.x, pr.y, 110, 0, 6.28); X.fill();
        // Lamp head
        X.fillStyle = '#1e241c'; X.beginPath(); X.arc(pr.x, pr.y, 6, 0, 6.28); X.fill();
        X.fillStyle = '#fef08a'; X.beginPath(); X.arc(pr.x, pr.y, 3, 0, 6.28); X.fill();
      } else if (pr.type === 'car') {
        X.save(); X.translate(pr.x, pr.y); X.rotate(pr.a || 0);
        X.fillStyle = 'rgba(0,0,0,0.45)'; X.fillRect(-18, -10, 42, 24);
        X.fillStyle = '#334155'; X.beginPath(); X.roundRect(-16, -11, 38, 22, 4); X.fill();
        X.fillStyle = '#0f172a'; X.fillRect(-4, -8, 14, 16); // Windshield
        X.fillStyle = 'rgba(255,255,255,0.4)'; X.fillRect(-2, -6, 10, 3);
        X.restore();
      } else if (pr.type === 'windmill') {
        pr.rot = (pr.rot || 0) + 0.02;
        X.fillStyle = 'rgba(0,0,0,0.45)';
        X.beginPath(); X.ellipse(pr.x + 8, pr.y + 12, 24, 14, 0, 0, 6.28); X.fill();
        X.fillStyle = '#5c4028';
        X.beginPath(); X.arc(pr.x, pr.y, 16, 0, 6.28); X.fill();
        X.strokeStyle = '#2d1e12'; X.lineWidth = 2; X.stroke();
        X.fillStyle = '#8c6239';
        X.beginPath(); X.arc(pr.x, pr.y, 11, 0, 6.28); X.fill();
        X.fillStyle = '#1c1917';
        X.beginPath(); X.arc(pr.x, pr.y, 4, 0, 6.28); X.fill();
        X.save(); X.translate(pr.x, pr.y); X.rotate(pr.rot);
        X.strokeStyle = '#e7e5e4'; X.lineWidth = 2.5;
        for (let bIdx = 0; bIdx < 4; bIdx++) {
          X.rotate(1.5708);
          X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 36); X.stroke();
          X.fillStyle = 'rgba(214, 211, 209, 0.75)';
          X.fillRect(1, 10, 6, 24);
        }
        X.restore();
      } else if (pr.type === 'farmhouse') {
        const fw = pr.w || 140, fh = pr.h || 90;
        X.fillStyle = 'rgba(0,0,0,0.5)';
        X.fillRect(pr.x - fw / 2 + 10, pr.y - fh / 2 + 12, fw, fh);
        X.fillStyle = '#78281a';
        X.fillRect(pr.x - fw / 2, pr.y - fh / 2, fw, fh);
        X.strokeStyle = '#45120a'; X.lineWidth = 2.5;
        X.strokeRect(pr.x - fw / 2, pr.y - fh / 2, fw, fh);
        X.fillStyle = '#45120a';
        X.fillRect(pr.x - fw / 2, pr.y - fh / 2, fw, 8);
        X.fillStyle = '#e2e8f0';
        X.fillRect(pr.x - 14, pr.y + fh / 2 - 24, 28, 24);
        X.strokeStyle = '#991b1b'; X.lineWidth = 2;
        X.strokeRect(pr.x - 14, pr.y + fh / 2 - 24, 28, 24);
        X.beginPath();
        X.moveTo(pr.x - 14, pr.y + fh / 2 - 24); X.lineTo(pr.x + 14, pr.y + fh / 2);
        X.moveTo(pr.x + 14, pr.y + fh / 2 - 24); X.lineTo(pr.x - 14, pr.y + fh / 2);
        X.stroke();
      } else if (pr.type === 'cabin') {
        const cw = pr.w || 120, ch = pr.h || 80;
        X.fillStyle = 'rgba(0,0,0,0.48)';
        X.fillRect(pr.x - cw / 2 + 8, pr.y - ch / 2 + 10, cw, ch);
        X.fillStyle = '#3e2e23';
        X.fillRect(pr.x - cw / 2, pr.y - ch / 2, cw, ch);
        X.strokeStyle = '#221913'; X.lineWidth = 1.5;
        for (let ly = pr.y - ch / 2 + 8; ly < pr.y + ch / 2; ly += 10) {
          X.beginPath(); X.moveTo(pr.x - cw / 2, ly); X.lineTo(pr.x + cw / 2, ly); X.stroke();
        }
        X.fillStyle = '#e2e8f0';
        X.fillRect(pr.x - cw / 2 - 4, pr.y - ch / 2 - 3, cw + 8, 9);
        X.fillStyle = '#fde047';
        X.fillRect(pr.x - 10, pr.y - 6, 20, 14);
        X.strokeStyle = '#78350f'; X.lineWidth = 1.5;
        X.strokeRect(pr.x - 10, pr.y - 6, 20, 14);
      } else if (pr.type === 'ice_patch') {
        const ir = pr.r || 80;
        const iGrad = X.createRadialGradient(pr.x, pr.y, ir * 0.2, pr.x, pr.y, ir);
        iGrad.addColorStop(0, 'rgba(224, 242, 254, 0.65)');
        iGrad.addColorStop(0.8, 'rgba(125, 211, 252, 0.45)');
        iGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        X.fillStyle = iGrad;
        X.beginPath(); X.arc(pr.x, pr.y, ir, 0, 6.28); X.fill();
        X.strokeStyle = 'rgba(255, 255, 255, 0.55)'; X.lineWidth = 1.6;
        X.beginPath();
        X.moveTo(pr.x - ir * 0.5, pr.y - ir * 0.2); X.lineTo(pr.x + ir * 0.1, pr.y + ir * 0.1);
        X.lineTo(pr.x + ir * 0.6, pr.y - ir * 0.15);
        X.moveTo(pr.x, pr.y - ir * 0.5); X.lineTo(pr.x - ir * 0.1, pr.y + ir * 0.4);
        X.stroke();
      } else if (pr.type === 'boardwalk') {
        const bw = pr.w || 160, bh = pr.h || 48;
        X.fillStyle = 'rgba(0,0,0,0.55)';
        X.fillRect(pr.x - bw / 2 + 4, pr.y - bh / 2 + 6, bw, bh);
        X.fillStyle = '#453526';
        X.fillRect(pr.x - bw / 2, pr.y - bh / 2, bw, bh);
        X.strokeStyle = '#271e16'; X.lineWidth = 1.4;
        for (let bx = pr.x - bw / 2 + 10; bx < pr.x + bw / 2; bx += 10) {
          X.beginPath(); X.moveTo(bx, pr.y - bh / 2); X.lineTo(bx, pr.y + bh / 2); X.stroke();
        }
        X.strokeStyle = '#5a4632'; X.lineWidth = 2;
        X.beginPath();
        X.moveTo(pr.x - bw / 2, pr.y - bh / 2 + 3); X.lineTo(pr.x + bw / 2, pr.y - bh / 2 + 3);
        X.moveTo(pr.x - bw / 2, pr.y + bh / 2 - 3); X.lineTo(pr.x + bw / 2, pr.y + bh / 2 - 3);
        X.stroke();
      } else if (pr.type === 'glowing_puddle') {
        const gr = pr.r || 35;
        const gGrad = X.createRadialGradient(pr.x, pr.y, 4, pr.x, pr.y, gr);
        gGrad.addColorStop(0, 'rgba(187, 247, 208, 0.85)');
        gGrad.addColorStop(0.6, 'rgba(74, 222, 128, 0.55)');
        gGrad.addColorStop(1, 'rgba(21, 128, 61, 0)');
        X.fillStyle = gGrad;
        X.beginPath(); X.arc(pr.x, pr.y, gr, 0, 6.28); X.fill();
        X.strokeStyle = 'rgba(240, 253, 244, 0.65)'; X.lineWidth = 1.4;
        X.beginPath(); X.arc(pr.x + 2, pr.y - 1, gr * 0.35, 0, 6.28); X.stroke();
      } else if (pr.type === 'glass_partition') {
        const gw = pr.w || 120, gh = pr.h || 16;
        X.fillStyle = 'rgba(0,0,0,0.35)';
        X.fillRect(pr.x - gw / 2 + 3, pr.y - gh / 2 + 5, gw, gh);
        X.fillStyle = 'rgba(56, 189, 248, 0.3)';
        X.fillRect(pr.x - gw / 2, pr.y - gh / 2, gw, gh);
        X.strokeStyle = 'rgba(186, 230, 253, 0.7)'; X.lineWidth = 1.8;
        X.strokeRect(pr.x - gw / 2, pr.y - gh / 2, gw, gh);
        X.fillStyle = '#475569';
        X.fillRect(pr.x - gw / 2, pr.y - gh / 2 - 2, 4, gh + 4);
        X.fillRect(pr.x + gw / 2 - 4, pr.y - gh / 2 - 2, 4, gh + 4);
        X.fillRect(pr.x - 2, pr.y - gh / 2 - 2, 4, gh + 4);
        X.fillStyle = '#eab308';
        X.fillRect(pr.x - gw / 2 + 4, pr.y - 2, gw - 8, 3);
      } else if (pr.type === 'dome_rib') {
        const dr = pr.r || 350;
        X.strokeStyle = '#334155'; X.lineWidth = 5.0;
        X.beginPath(); X.arc(pr.x, pr.y, dr, -1.2, 1.2); X.stroke();
        X.strokeStyle = '#64748b'; X.lineWidth = 2.0;
        X.beginPath(); X.arc(pr.x, pr.y, dr + 8, -1.2, 1.2); X.stroke();
        X.strokeStyle = '#475569'; X.lineWidth = 1.5;
        for (let aTruss = -1.1; aTruss <= 1.1; aTruss += 0.25) {
          X.beginPath();
          X.moveTo(pr.x + Math.cos(aTruss) * dr, pr.y + Math.sin(aTruss) * dr);
          X.lineTo(pr.x + Math.cos(aTruss + 0.1) * (dr + 8), pr.y + Math.sin(aTruss + 0.1) * (dr + 8));
          X.stroke();
        }
      } else if (pr.type === 'alien_vine') {
        const vw = pr.w || 80, vh = pr.h || 40;
        X.strokeStyle = '#1e3a29'; X.lineWidth = 3.5;
        X.beginPath();
        X.moveTo(pr.x - vw / 2, pr.y);
        X.quadraticCurveTo(pr.x, pr.y - vh / 2, pr.x + vw / 2, pr.y);
        X.stroke();
        X.strokeStyle = '#2d5a3f'; X.lineWidth = 2.0;
        X.beginPath();
        X.moveTo(pr.x - vw / 2 + 10, pr.y + 4);
        X.quadraticCurveTo(pr.x + 5, pr.y + vh / 2, pr.x + vw / 2 - 10, pr.y - 4);
        X.stroke();
        X.fillStyle = '#a855f7';
        X.beginPath(); X.arc(pr.x - 8, pr.y - 6, 3.5, 0, 6.28); X.arc(pr.x + 12, pr.y + 5, 3.5, 0, 6.28); X.fill();
        X.fillStyle = '#e879f9';
        X.beginPath(); X.arc(pr.x - 8, pr.y - 6, 1.5, 0, 6.28); X.arc(pr.x + 12, pr.y + 5, 1.5, 0, 6.28); X.fill();
      } else if (pr.type === 'silo') {
        const sr = pr.r || 36;
        X.fillStyle = 'rgba(0,0,0,0.45)';
        X.beginPath(); X.arc(pr.x + 6, pr.y + 8, sr, 0, 6.28); X.fill();
        X.fillStyle = '#78716c';
        X.beginPath(); X.arc(pr.x, pr.y, sr, 0, 6.28); X.fill();
        X.strokeStyle = '#44403c'; X.lineWidth = 2.5; X.stroke();
        X.fillStyle = '#a8a29e';
        X.beginPath(); X.arc(pr.x, pr.y, sr * 0.7, 0, 6.28); X.fill();
      } else if (pr.type === 'server_rack') {
        X.fillStyle = 'rgba(0,0,0,0.5)';
        X.fillRect(pr.x - 14, pr.y - 18, 28, 36);
        X.fillStyle = '#0f172a';
        X.fillRect(pr.x - 16, pr.y - 20, 28, 36);
        X.strokeStyle = '#334155'; X.lineWidth = 1.5;
        X.strokeRect(pr.x - 16, pr.y - 20, 28, 36);
        const ledGlow = Math.sin(S.t * 12 + pr.x) > 0;
        X.fillStyle = ledGlow ? '#22c55e' : '#15803d';
        X.fillRect(pr.x - 12, pr.y - 14, 3, 2);
        X.fillStyle = !ledGlow ? '#38bdf8' : '#0284c7';
        X.fillRect(pr.x - 12, pr.y - 8, 3, 2);
      }
    }
  }

  // 8. Hazard Zones
  for (const h of HZ) {
    X.fillStyle = mapDef.hazard || 'rgba(239,68,68,0.35)';
    X.beginPath(); X.arc(h.x, h.y, h.r, 0, 6.28); X.fill();
    X.strokeStyle = 'rgba(0,0,0,0.4)'; X.lineWidth = 2.5; X.stroke();
  }

  // 9. Pickups Pass (Drops with arc pop, hover bob, shine sweep)
  if (typeof renderDropsPass === 'function') {
    renderDropsPass(cx, cy, W, H);
  }

  // 10. Chests
  for (const c of CH) {
    const bob = Math.sin((S.t || 0) * 3.5 + c.ph) * 2;
    X.fillStyle = 'rgba(224,184,58,0.25)';
    X.beginPath(); X.arc(c.x, c.y + 4, 28, 0, 6.28); X.fill();
    X.fillStyle = 'rgba(0,0,0,0.5)';
    X.beginPath(); X.ellipse(c.x, c.y + 9, 17, 6, 0, 0, 6.28); X.fill();
    const bx = c.x - 16, by = c.y - 11 + bob, bw = 32, bh = 21;
    X.fillStyle = '#2b3624'; X.beginPath(); X.roundRect(bx, by, bw, bh, 5); X.fill();
    X.strokeStyle = '#141b11'; X.lineWidth = 1.8; X.stroke();
    X.fillStyle = '#c89e3a'; X.fillRect(bx + 4, by + bh / 2 - 1.5, bw - 8, 3);
  }

  // 11. Turrets
  if (typeof TR !== 'undefined' && TR.length) {
    for (const t of TR) {
      if (typeof drawTurret === 'function') drawTurret(t);
    }
  }

  // Spitter Acid Puddles Pass (damaging & shrinking)
  for (const ap of ACID_PUDDLES) {
    if (ap.x < cx - 50 || ap.x > cx + W + 50 || ap.y < cy - 50 || ap.y > cy + H + 50) continue;
    const pGrad = X.createRadialGradient(ap.x, ap.y, ap.r * 0.2, ap.x, ap.y, ap.r);
    pGrad.addColorStop(0, 'rgba(134, 239, 172, 0.75)');
    pGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.45)');
    pGrad.addColorStop(1, 'rgba(21, 128, 61, 0)');
    X.fillStyle = pGrad;
    X.beginPath(); X.arc(ap.x, ap.y, ap.r, 0, 6.28); X.fill();
    X.strokeStyle = 'rgba(187, 247, 208, 0.6)';
    X.lineWidth = 1.5;
    const bubR = ap.r * (0.3 + 0.3 * Math.sin((S ? S.t : 0) * 8 + ap.x));
    X.beginPath(); X.arc(ap.x + 3, ap.y - 2, bubR, 0, 6.28); X.stroke();
  }

  // AoE Debris & Turret Destruction Debris
  for (const deb of AOE_DEBRIS) {
    if (deb.x < cx - 20 || deb.x > cx + W + 20 || deb.y < cy - 20 || deb.y > cy + H + 20) continue;
    X.fillStyle = deb.col;
    X.fillRect(deb.x - deb.sz / 2, deb.y - deb.sz / 2, deb.sz, deb.sz);
  }
  if (typeof drawTurretDebris === 'function') drawTurretDebris(cx, cy, W, H);

  // Per-Type Dying Zombies & Charger Ghost Afterimages
  if (typeof drawDyingZombies === 'function') drawDyingZombies(cx, cy, W, H);

  // 12. Projectiles (Guns: Shotgun pellet spread, Sniper bright tracer, Flamethrower layered fire)
  for (const b of B) {
    if (b.wi === 7 || b.wi === 14 || (b.wi != null && WEAP[b.wi] && (WEAP[b.wi].n === 'Sniper' || WEAP[b.wi].n === 'Railgun'))) {
      // Sniper luminous bright tracer beam
      const snTrail = 0.08;
      X.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      X.lineWidth = 6;
      X.beginPath(); X.moveTo(b.x - b.vx * snTrail, b.y - b.vy * snTrail); X.lineTo(b.x, b.y); X.stroke();
      X.strokeStyle = '#ffffff';
      X.lineWidth = 2.2;
      X.beginPath(); X.moveTo(b.x - b.vx * snTrail, b.y - b.vy * snTrail); X.lineTo(b.x, b.y); X.stroke();
      X.fillStyle = '#38bdf8';
      X.beginPath(); X.arc(b.x, b.y, 3.5, 0, 6.28); X.fill();
      continue;
    }

    if (b.flm || (b.wi != null && WEAP[b.wi] && WEAP[b.wi].flm)) {
      // Flamethrower layered fire particles (yellow core, orange body, smoke rim)
      const fR = 7 + (1 - Math.max(0, b.l / 0.5)) * 14;
      X.fillStyle = 'rgba(75, 85, 99, 0.28)';
      X.beginPath(); X.arc(b.x, b.y, fR * 1.3, 0, 6.28); X.fill();
      X.fillStyle = 'rgba(249, 115, 22, 0.7)';
      X.beginPath(); X.arc(b.x, b.y, fR, 0, 6.28); X.fill();
      X.fillStyle = 'rgba(253, 224, 71, 0.9)';
      X.beginPath(); X.arc(b.x, b.y, fR * 0.55, 0, 6.28); X.fill();
      continue;
    }

    if (b.wi === 2 || b.wi === 17 || (b.wi != null && WEAP[b.wi] && WEAP[b.wi].p > 1)) {
      // Shotgun pellet spread with glowing lead shot
      const sTrail = 0.03;
      X.strokeStyle = '#fde047';
      X.lineWidth = 2.4;
      X.beginPath(); X.moveTo(b.x - b.vx * sTrail, b.y - b.vy * sTrail); X.lineTo(b.x, b.y); X.stroke();
      X.fillStyle = '#ffffff';
      X.beginPath(); X.arc(b.x, b.y, 2.2, 0, 6.28); X.fill();
      continue;
    }

    const bAng = Math.atan2(b.vy, b.vx);
    const trailLen = b.isCrit ? 0.05 : 0.035;
    const bGrad = X.createLinearGradient(b.x - b.vx * trailLen, b.y - b.vy * trailLen, b.x, b.y);
    bGrad.addColorStop(0, 'rgba(255,200,80,0)');
    bGrad.addColorStop(0.7, b.c || '#ffd86b');
    bGrad.addColorStop(1, '#ffffff');
    X.strokeStyle = bGrad;
    X.lineWidth = b.isCrit ? 5 : 3;
    X.beginPath(); X.moveTo(b.x - b.vx * trailLen, b.y - b.vy * trailLen); X.lineTo(b.x, b.y); X.stroke();
    X.fillStyle = '#ffffff'; X.beginPath(); X.arc(b.x, b.y, b.isCrit ? 2.5 : 1.8, 0, 6.28); X.fill();
  }

  // Spitter Acid Projectiles (AB)
  for (const ab of AB) {
    X.fillStyle = '#4ade80';
    X.beginPath(); X.arc(ab.x, ab.y, ab.r, 0, 6.28); X.fill();
    X.fillStyle = '#bbf7d0';
    X.beginPath(); X.arc(ab.x - 1.5, ab.y - 1.5, ab.r * 0.45, 0, 6.28); X.fill();
  }

  // 13. Airborne Gore (Flying gibs, high-velocity streaks)
  if (typeof renderGoreAirPass === 'function') {
    renderGoreAirPass(cx, cy, W, H);
  }

  // 14. Zombies
  for (const z of Z) { if (typeof drawTelegraph === 'function') drawTelegraph(z); }
  for (const z of Z) { if (typeof drawZombie === 'function') drawZombie(z); }

  // 15. Player Rendering
  if (P) {
    X.save();
    X.translate(P.x, P.y);
    X.rotate(P.a);

    // Muzzle flash front lighting
    const flashGlow = X.createRadialGradient(0, 0, 15, 140, 0, 260);
    flashGlow.addColorStop(0, 'rgba(255,250,220,0.2)');
    flashGlow.addColorStop(0.6, 'rgba(255,240,190,0.06)');
    flashGlow.addColorStop(1, 'rgba(255,240,190,0)');
    X.fillStyle = flashGlow;
    X.beginPath(); X.moveTo(10, 0); X.arc(0, 0, 280, -0.38, 0.38); X.closePath(); X.fill();

    // Laser aim assist line
    const gunMuzzleX = ((ML[P.cur] || 50) * 0.87);
    X.save();
    X.strokeStyle = 'rgba(255,50,30,0.35)'; X.lineWidth = 1.2;
    X.setLineDash([8, 4]); X.beginPath(); X.moveTo(gunMuzzleX, 0); X.lineTo(260, 0); X.stroke();
    X.setLineDash([]);
    X.fillStyle = '#ff2828'; X.beginPath(); X.arc(260, 0, 3, 0, 6.28); X.fill();
    X.restore();

    X.scale(0.87, 0.87);

    // Overhead reload progress circle
    if (P.reloading && P.reloadDuration > 0) {
      const pct = Math.min(1, Math.max(0, 1 - (P.reloadTimer / P.reloadDuration)));
      X.save();
      X.strokeStyle = 'rgba(0,0,0,0.6)'; X.lineWidth = 4;
      X.beginPath(); X.arc(0, -32, 13, 0, 6.28); X.stroke();
      X.strokeStyle = '#ffd36b'; X.beginPath(); X.arc(0, -32, 13, -1.57, -1.57 + 6.28 * pct); X.stroke();
      X.restore();
    }

    // Breathing bob
    const breathe = (Math.hypot(P.vx || 0, P.vy || 0) < 15) ? Math.sin((S.t || 0) * 3) * 0.8 : 0;
    X.translate(0, breathe);

    // Layer 1-3 Player body
    if (typeof bodyBack === 'function') bodyBack();

    // Weapon with recoil kickback
    X.save();
    if (P.recoil > 0) X.translate(-P.recoil, 0);
    if (typeof gun === 'function') gun(P.cur, Math.max(0, P.fl) * 80);
    X.restore();

    // Unique Muzzle Flash Sprite Per Weapon Class
    if (P.fl > 0) {
      const m = ML[P.cur] || 60;
      const w = WEAP[P.cur] || WEAP[0];
      const flColor = WC[P.cur] || '#ffd86b';

      if (w.flm) {
        // Flamethrower: expanding billowing flame cone
        const fLen = 38 + Math.random() * 15;
        const flGrad = X.createRadialGradient(m + 10, 0, 4, m + fLen, 0, 22);
        flGrad.addColorStop(0, '#ffffff');
        flGrad.addColorStop(0.3, '#fde047');
        flGrad.addColorStop(0.7, '#f97316');
        flGrad.addColorStop(1, 'rgba(239,68,68,0)');
        X.fillStyle = flGrad;
        X.beginPath();
        X.moveTo(m, -4);
        X.lineTo(m + fLen, -16);
        X.lineTo(m + fLen + 8, 0);
        X.lineTo(m + fLen, 16);
        X.lineTo(m, 4);
        X.closePath(); X.fill();
      } else if (w.p > 1) {
        // Shotgun: wide conical flash with side vent jets
        X.fillStyle = '#fde047';
        X.beginPath();
        X.moveTo(m, 0);
        X.lineTo(m + 26 + Math.random() * 8, -18);
        X.lineTo(m + 34 + Math.random() * 10, 0);
        X.lineTo(m + 26 + Math.random() * 8, 18);
        X.closePath(); X.fill();
        X.fillStyle = '#ffffff';
        X.beginPath(); X.arc(m + 6, 0, 7, 0, 6.28); X.fill();
      } else if (w.n === 'Sniper' || w.n === 'Railgun') {
        // Sniper: long hypersonic needle flash with vertical gas brake jets
        X.fillStyle = '#38bdf8';
        X.fillRect(m, -14, 3, 28);
        X.fillStyle = '#ffffff';
        X.beginPath();
        X.moveTo(m, -3);
        X.lineTo(m + 52 + Math.random() * 12, 0);
        X.lineTo(m, 3);
        X.closePath(); X.fill();
        X.beginPath(); X.arc(m + 4, 0, 4, 0, 6.28); X.fill();
      } else if (w.ex) {
        // Rocket / Grenade: massive round fireball flash
        X.fillStyle = '#f97316';
        X.beginPath(); X.arc(m + 14, 0, 18, 0, 6.28); X.fill();
        X.fillStyle = '#fde047';
        X.beginPath(); X.arc(m + 12, 0, 12, 0, 6.28); X.fill();
        X.fillStyle = '#ffffff';
        X.beginPath(); X.arc(m + 8, 0, 6, 0, 6.28); X.fill();
      } else if (w.r <= 0.12) {
        // SMG / Minigun: tight high-frequency spark cone
        X.fillStyle = flColor;
        X.beginPath();
        X.moveTo(m, 0);
        X.lineTo(m + 18 + Math.random() * 8, -6);
        X.lineTo(m + 24 + Math.random() * 8, 0);
        X.lineTo(m + 18 + Math.random() * 8, 6);
        X.closePath(); X.fill();
        X.fillStyle = '#ffffff'; X.beginPath(); X.arc(m + 3, 0, 3.5, 0, 6.28); X.fill();
      } else {
        // Pistol / Rifle: 4-pronged star flash
        X.fillStyle = flColor;
        X.beginPath();
        X.moveTo(m, 0);
        X.lineTo(m + 16, -10); X.lineTo(m + 22, -2);
        X.lineTo(m + 32, 0);
        X.lineTo(m + 22, 2); X.lineTo(m + 16, 10);
        X.closePath(); X.fill();
        X.fillStyle = '#ffffff'; X.beginPath(); X.arc(m + 4, 0, 4, 0, 6.28); X.fill();
      }
    }

    // Layer 4 Player head & arms
    if (typeof bodyFront === 'function') bodyFront();

    X.restore();
  }

  // 16. Floating texts
  if (typeof renderFloatingTextsPass === 'function') {
    renderFloatingTextsPass();
  }

  X.restore();

  // 17. HUD OVERLAY
  renderHUD();
}

function renderHUD() {
  const pad = 16;
  const rx = pad + 28, ry = pad + 28;
  const radarRad = 26;

  // 1. Radar Background & Clipping Boundary
  X.save();
  X.fillStyle = '#0a0e08ee';
  X.beginPath(); X.arc(rx, ry, radarRad, 0, 6.28); X.fill();
  X.clip();

  // 2. Tactical Grid Rings
  X.strokeStyle = 'rgba(255,255,255,0.08)';
  X.lineWidth = 1;
  X.beginPath();
  X.arc(rx, ry, 13, 0, 6.28);
  X.arc(rx, ry, 22, 0, 6.28);
  X.stroke();

  // 3. Walls & Buildings from MAP_DATA / Obstacles O
  X.fillStyle = 'rgba(74, 95, 60, 0.45)';
  const curM = getCurMap();
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : (MP[curM] || MP[0]);
  const wallsList = (typeof O !== 'undefined' && O.length) ? O : (mapDef.walls || mapDef.obstacles || []);
  for (const w of wallsList) {
    const wx = rx + (w.x - P.x) / 24;
    const wy = ry + (w.y - P.y) / 24;
    const ww = Math.max(1.5, w.w / 24);
    const wh = Math.max(1.5, w.h / 24);
    if (Math.hypot(wx - rx, wy - ry) < radarRad + 10) {
      X.fillRect(wx, wy, ww, wh);
    }
  }

  // 4. World Bounds Boundary
  const wLeft = rx + (0 - P.x) / 24;
  const wTop = ry + (0 - P.y) / 24;
  const wSize = (typeof WS !== 'undefined' ? WS : 2400) / 24;
  X.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  X.lineWidth = 1.2;
  X.strokeRect(wLeft, wTop, wSize, wSize);

  // 5. Radar Sweep Line
  const swpAng = (S ? S.t : 0) * 2.8;
  X.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  X.lineWidth = 1.4;
  X.beginPath(); X.moveTo(rx, ry); X.lineTo(rx + Math.cos(swpAng) * radarRad, ry + Math.sin(swpAng) * radarRad); X.stroke();

  // 6. Player Vision Cone
  X.fillStyle = 'rgba(56, 189, 248, 0.12)';
  X.beginPath();
  X.moveTo(rx, ry);
  X.arc(rx, ry, 20, P.a - 0.38, P.a + 0.38);
  X.closePath();
  X.fill();

  // 7. Pickups & Relic Chests (CH & D)
  for (const c of CH) {
    const dx = (c.x - P.x) / 24, dy = (c.y - P.y) / 24;
    const dist = Math.hypot(dx, dy);
    const k = dist > (radarRad - 3) ? (radarRad - 3) / dist : 1;
    X.fillStyle = '#ffd36b';
    X.fillRect(rx + dx * k - 2, ry + dy * k - 2, 4, 4);
  }
  for (const d of D) {
    const dx = (d.x - P.x) / 24, dy = (d.y - P.y) / 24;
    if (dx * dx + dy * dy < radarRad * radarRad) {
      X.fillStyle = d.t === 'h' ? '#ef4444' : (d.t === 'a' ? '#38bdf8' : '#ffd36b');
      X.beginPath(); X.arc(rx + dx, ry + dy, 1.8, 0, 6.28); X.fill();
    }
  }

  // 8. Zombie Radar Blips
  for (const z of Z) {
    if (z.dead) continue;
    const dx = (z.x - P.x) / 24, dy = (z.y - P.y) / 24;
    const distSq = dx * dx + dy * dy;

    if (distSq < radarRad * radarRad) {
      if (z.t === 'boss') {
        const bRad = 3.5 + Math.sin((S ? S.t : 0) * 10) * 1.2;
        X.fillStyle = 'rgba(239,68,68,0.45)';
        X.beginPath(); X.arc(rx + dx, ry + dy, bRad + 2, 0, 6.28); X.fill();
        X.fillStyle = '#ef4444';
        X.beginPath();
        X.moveTo(rx + dx, ry + dy - bRad);
        X.lineTo(rx + dx + bRad, ry + dy);
        X.lineTo(rx + dx, ry + dy + bRad);
        X.lineTo(rx + dx - bRad, ry + dy);
        X.closePath(); X.fill();
      } else if (z.t === 'tank' || z.t === 'brute' || z.t === 'charger') {
        X.fillStyle = '#f97316';
        X.beginPath();
        X.moveTo(rx + dx, ry + dy - 2.5);
        X.lineTo(rx + dx + 2.5, ry + dy);
        X.lineTo(rx + dx, ry + dy + 2.5);
        X.lineTo(rx + dx - 2.5, ry + dy);
        X.closePath(); X.fill();
      } else if (z.t === 'exp' || z.t === 'exploder') {
        X.fillStyle = Math.sin((S ? S.t : 0) * 12) > 0 ? '#facc15' : '#ef4444';
        X.beginPath(); X.arc(rx + dx, ry + dy, 2.2, 0, 6.28); X.fill();
      } else {
        X.fillStyle = '#ff5a3a';
        X.fillRect(rx + dx - 1.2, ry + dy - 1.2, 2.4, 2.4);
      }
    } else if (z.t === 'boss') {
      // Off-screen boss directional pointer along radar rim
      const bAng = Math.atan2(dy, dx);
      X.fillStyle = '#ef4444';
      X.beginPath();
      X.moveTo(rx + Math.cos(bAng) * (radarRad - 2), ry + Math.sin(bAng) * (radarRad - 2));
      X.lineTo(rx + Math.cos(bAng + 0.22) * (radarRad - 6), ry + Math.sin(bAng + 0.22) * (radarRad - 6));
      X.lineTo(rx + Math.cos(bAng - 0.22) * (radarRad - 6), ry + Math.sin(bAng - 0.22) * (radarRad - 6));
      X.closePath(); X.fill();
    }
  }

  // 9. Central Player Directional Chevron
  X.save();
  X.translate(rx, ry);
  X.rotate(P.a);
  X.fillStyle = '#38bdf8';
  X.beginPath();
  X.moveTo(5, 0); X.lineTo(-3.5, -3.5); X.lineTo(-1.8, 0); X.lineTo(-3.5, 3.5);
  X.closePath(); X.fill();
  X.restore();

  X.restore(); // Restore radar clipping

  // 10. Mini-Radar Perimeter & Health Ring
  X.lineWidth = 3.5; X.strokeStyle = '#141a12';
  X.beginPath(); X.arc(rx, ry, 28, 0, 6.28); X.stroke();
  X.strokeStyle = P.hp > 30 ? '#8fae4a' : '#d9453a';
  X.beginPath(); X.arc(rx, ry, 28, -1.57, -1.57 + 6.28 * Math.max(0, P.hp) / P.mx); X.stroke();

  // Wave & Health readout
  X.fillStyle = '#e8e4cf'; X.font = '900 13px Impact,Arial Black,sans-serif'; X.textAlign = 'left';
  X.fillText('WAVE ' + (S ? S.wave : 1), rx + 36, ry - 3);
  X.fillStyle = P.hp > 30 ? '#8fae4a' : '#ff5a3a'; X.font = 'bold 11px Arial';
  X.fillText('HP ' + Math.max(0, Math.round(P.hp)) + '/' + P.mx, rx + 36, ry + 12);

  // Active Powerups HUD with Circular Timer Rings & 3-Second Blink
  const activePowerups = [];
  if (S && S.dd > 0) activePowerups.push({ id: 'dd', name: '2X DMG', col: '#ef4444', time: S.dd, maxTime: 15 });
  if (S && S.fz > 0) activePowerups.push({ id: 'fz', name: 'FREEZE', col: '#38bdf8', time: S.fz, maxTime: 10 });
  if (S && S.sh2 > 0) activePowerups.push({ id: 'sh', name: 'SHIELD', col: '#eab308', time: S.sh2, maxTime: 12 });
  if (S && S.mgTime > 0) activePowerups.push({ id: 'mg', name: 'MAGNET', col: '#a855f7', time: S.mgTime, maxTime: 12 });

  const pStartX = rx + 36;
  const pStartY = ry + 26;
  activePowerups.forEach((pu, idx) => {
    // Blink in the final 3 seconds
    if (pu.time < 3.0 && Math.sin(pu.time * 14) > 0.3) return;

    const px = pStartX + idx * 32;
    const py = pStartY;

    // Background circle
    X.fillStyle = '#111827dd';
    X.beginPath(); X.arc(px, py, 11, 0, 6.28); X.fill();
    X.strokeStyle = '#374151'; X.lineWidth = 1.2; X.stroke();

    // Radial countdown timer ring
    const pct = Math.max(0, Math.min(1, pu.time / pu.maxTime));
    X.strokeStyle = pu.col;
    X.lineWidth = 2.2;
    X.beginPath();
    X.arc(px, py, 11, -1.57, -1.57 + 6.28 * pct);
    X.stroke();

    // Distinct powerup icons
    if (pu.id === 'dd') {
      X.fillStyle = pu.col;
      X.font = '900 8px Impact'; X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText('2X', px, py + 0.5);
    } else if (pu.id === 'fz') {
      X.strokeStyle = pu.col; X.lineWidth = 1.4;
      X.beginPath();
      X.moveTo(px - 4, py); X.lineTo(px + 4, py);
      X.moveTo(px, py - 4); X.lineTo(px, py + 4);
      X.stroke();
    } else if (pu.id === 'sh') {
      X.fillStyle = pu.col;
      X.beginPath();
      X.moveTo(px, py - 4); X.lineTo(px + 4, py - 2); X.lineTo(px + 3, py + 2); X.lineTo(px, py + 5); X.lineTo(px - 3, py + 2); X.lineTo(px - 4, py - 2);
      X.closePath(); X.fill();
    } else if (pu.id === 'mg') {
      X.strokeStyle = pu.col; X.lineWidth = 2;
      X.beginPath(); X.arc(px, py - 1, 3.5, 3.14, 0, true); X.stroke();
    }
  });

  // Freeze Fullscreen Frost Vignette Effect
  if (S && S.fz > 0) {
    const fzAlpha = Math.min(0.35, S.fz * 0.1);
    const fzVig = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.8);
    fzVig.addColorStop(0, 'rgba(56, 189, 248, 0)');
    fzVig.addColorStop(1, `rgba(56, 189, 248, ${fzAlpha})`);
    X.fillStyle = fzVig;
    X.fillRect(0, 0, W, H);
  }

  // Nuke Blinding Whiteout Flash Effect
  if (S && S.nukeFlash > 0) {
    X.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, S.nukeFlash * 2.2)})`;
    X.fillRect(0, 0, W, H);
  }

  // Cash & Zombies remaining
  X.textAlign = 'right'; X.font = 'bold 15px Arial'; X.fillStyle = '#ffd36b';
  X.fillText('CASH $' + (S ? S.cash : 0), W - 50, 20);
  X.font = 'bold 11.5px Arial'; X.fillStyle = '#e8e4cf';
  X.fillText('ZOMBIES ' + (Z.length + (S ? S.q.length : 0)), W - 50, 36);

  // Combo multiplier
  if (S && S.cmb > 2) {
    const sc = 1 + Math.min(0.25, (S.cmb - 2) * 0.03);
    X.save(); X.translate(W - 50, 54); X.scale(sc, sc);
    X.fillStyle = '#ffd36b'; X.font = '900 12px Impact,Arial Black,sans-serif';
    X.fillText('COMBO x' + S.cmb, 0, 0); X.restore();
  }

  // Active weapon card at bottom center
  X.fillStyle = '#1c211bdd';
  X.beginPath(); X.roundRect(W / 2 - 58, H - 48, 116, 42, 6); X.fill();
  X.strokeStyle = P.reloading ? '#ffd36b' : '#3d4f34'; X.lineWidth = 1.5;
  X.stroke();

  // Draw equipped weapon sprite
  X.save();
  X.translate(W / 2 - 14, H - 24);
  X.scale(0.68, 0.68);
  if (typeof gun === 'function') gun(P.cur, 0);
  X.restore();

  X.textAlign = 'center'; X.fillStyle = WC[P.cur] || '#fff'; X.font = 'bold 11px Arial';
  X.fillText((WEAP[P.cur] || WEAP[0]).n.toUpperCase(), W / 2, H - 35);
  const ammoStr = P.reloading ? 'RELOADING' : ((P.ammo != null ? P.ammo : 12) + ' / ' + (WEAP[P.cur].mag || 12));
  X.fillStyle = P.reloading ? '#ffd36b' : (P.ammo <= 3 ? '#ff5a3a' : '#d5d0c2');
  X.font = 'bold 10px Arial';
  X.fillText(ammoStr, W / 2, H - 9);

  // Screen-edge damage vignette
  if (HURT_VIGNETTE_TIMER > 0) {
    const vAlpha = Math.min(0.7, HURT_VIGNETTE_TIMER * 2.0);
    const vig = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(239,68,68,0)');
    vig.addColorStop(1, `rgba(239,68,68,${vAlpha})`);
    X.fillStyle = vig;
    X.fillRect(0, 0, W, H);
  }

  // Flying coin HUD particle benchmark
  if (typeof renderHUDPayoutParticles === 'function') {
    renderHUDPayoutParticles();
  }

  // Virtual Joysticks, Action Buttons, and Combat Overlay
  drawControls();
}

function drawControls() {
  // 1. Out of bounds map border warnings
  if (P && (P.x < 140 || P.x > WS - 140 || P.y < 140 || P.y > WS - 140)) {
    const oobAlpha = 0.28 + 0.22 * Math.sin((S ? S.t : 0) * 8);
    X.fillStyle = `rgba(239, 68, 68, ${oobAlpha})`;
    if (P.x < 140) X.fillRect(0, 0, 8, H);
    if (P.x > WS - 140) X.fillRect(W - 8, 0, 8, H);
    if (P.y < 140) X.fillRect(0, 0, W, 8);
    if (P.y > WS - 140) X.fillRect(0, H - 8, W, 8);
  }

  // 2. LEVEL UP banner
  if (S && S.lu > 0) {
    X.save();
    const luAlpha = Math.min(1, S.lu * 1.5);
    X.globalAlpha = luAlpha;
    X.fillStyle = '#ffd84a';
    X.font = '900 24px Impact, Arial Black, sans-serif';
    X.textAlign = 'center';
    X.shadowColor = 'rgba(0,0,0,0.8)';
    X.shadowBlur = 8;
    X.fillText('LEVEL UP!', W / 2, H * 0.26);
    X.restore();
  }

  // 3. Dual Virtual Joysticks
  const [lx, ly] = jPos('l');
  const [rx, ry] = jPos('r');

  // Left joystick (Movement)
  X.save();
  X.lineWidth = 2.5;
  X.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  X.fillStyle = 'rgba(0, 0, 0, 0.22)';
  X.beginPath(); X.arc(lx, ly, 46, 0, 6.28); X.fill(); X.stroke();
  X.fillStyle = 'rgba(255, 255, 255, 0.2)';
  X.font = '900 11px Arial'; X.textAlign = 'center'; X.textBaseline = 'middle';
  X.fillText('MOVE', lx, ly);
  const curL = J.l ? [J.l.x, J.l.y] : [lx, ly];
  X.fillStyle = 'rgba(255, 255, 255, 0.35)';
  X.beginPath(); X.arc(curL[0], curL[1], 20, 0, 6.28); X.fill();
  X.strokeStyle = 'rgba(255, 255, 255, 0.65)'; X.lineWidth = 2; X.stroke();
  X.restore();

  // Right joystick (Aim & Fire)
  X.save();
  X.lineWidth = 2.5;
  X.strokeStyle = 'rgba(255, 110, 80, 0.28)';
  X.fillStyle = 'rgba(0, 0, 0, 0.22)';
  X.beginPath(); X.arc(rx, ry, 46, 0, 6.28); X.fill(); X.stroke();
  X.fillStyle = 'rgba(255, 110, 80, 0.22)';
  X.font = '900 11px Arial'; X.textAlign = 'center'; X.textBaseline = 'middle';
  X.fillText('AIM', rx, ry);
  const curR = J.r ? [J.r.x, J.r.y] : [rx, ry];
  X.fillStyle = 'rgba(255, 110, 80, 0.42)';
  X.beginPath(); X.arc(curR[0], curR[1], 20, 0, 6.28); X.fill();
  X.strokeStyle = 'rgba(255, 130, 100, 0.75)'; X.lineWidth = 2; X.stroke();
  X.restore();

  // 4. On-screen Action & Utility Buttons
  for (const b of BT) {
    const p = b.p();
    const bx = p[0], by = p[1];
    const r = b.ar ? 16 : 22;
    const cdRatio = (b.k && SK[b.k] && SK[b.k].cd > 0) ? Math.max(0, Math.min(1, SK[b.k].cd / (SK[b.k].max || 1))) : 0;

    X.save();
    X.fillStyle = cdRatio > 0 ? 'rgba(25, 30, 22, 0.72)' : 'rgba(20, 26, 18, 0.88)';
    X.beginPath(); X.arc(bx, by, r, 0, 6.28); X.fill();
    X.strokeStyle = cdRatio > 0 ? 'rgba(90, 100, 80, 0.45)' : (b.ar ? '#3d4f34' : '#8fae4a');
    X.lineWidth = 1.8; X.stroke();

    if (cdRatio > 0) {
      X.fillStyle = 'rgba(0, 0, 0, 0.55)';
      X.beginPath();
      X.moveTo(bx, by);
      X.arc(bx, by, r - 1, -1.57, -1.57 + 6.28 * cdRatio);
      X.closePath();
      X.fill();
    }

    X.fillStyle = cdRatio > 0 ? '#7a8570' : (b.ar ? '#d5d0c2' : '#f0ece1');
    X.font = b.ar ? 'bold 12px Arial' : '900 10px Impact, Arial Black, sans-serif';
    X.textAlign = 'center'; X.textBaseline = 'middle';
    X.fillText(b.n, bx, by);
    X.restore();
  }
}

// MAIN ANIMATION LOOP
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;

  if (typeof updateFPSMonitor === 'function') {
    updateFPSMonitor(dt);
  }

  if (run) {
    try {
      update(dt);
    } catch (e) {
      console.error('[DeadZone update error]', e);
    }
  }

  if (S) {
    try {
      draw();
    } catch (e) {
      console.error('[DeadZone draw error]', e);
    }
  }
}

function openShop() {
  commitXP();
  if (S.wave > 0) SV.best = Math.max(SV.best, S.wave);
  if (typeof sv === 'function') sv();

  if (S && S.isEvent && S.evDef && S.evTargetWave && S.wave >= S.evTargetWave && !S.evDef.targetElites) {
    triggerEventVictory();
    return;
  }

  const st = document.getElementById('st');
  if (st) st.textContent = 'Wave ' + S.wave + ' cleared';
  const healAmt = (S && S.isEvent && S.evDef && S.evDef.id === 'last_stand') ? 6 : 20;
  P.hp = Math.min(P.mx, P.hp + healAmt);
  rebuild();
  const shopov = document.getElementById('shopov');
  if (shopov) shopov.classList.add('on');
}

function rebuild() {
  const cashEl = document.getElementById('cash');
  if (cashEl) cashEl.textContent = 'Cash: $' + S.cash;
  const s = document.getElementById('shop');
  if (!s) return;
  s.innerHTML = '';

  const add = (txt, cost, fn, eq) => {
    const b = document.createElement('button');
    b.textContent = txt;
    if (eq) b.className = 'eq';
    b.disabled = cost > S.cash;
    b.onclick = () => { S.cash -= cost; fn(); rebuild(); };
    s.appendChild(b);
  };

  WEAP.forEach((w, i) => {
    if (S && S.isEvent && S.evDef && S.evDef.heavyOnly && ![4, 9, 12, 14, 17].includes(i)) return;
    if (P.w[i]) {
      s.appendChild(Object.assign(document.createElement('button'), {
        textContent: P.cur === i ? w.n + ' (equipped)' : 'Equip ' + w.n,
        className: P.cur === i ? 'eq' : '',
        onclick: () => {
          if (P.cur !== i) {
            if (P.weapAmmo) P.weapAmmo[P.cur] = P.ammo;
            P.cur = i;
            P.reloading = false;
            P.maxAmmo = w.mag || 12;
            P.ammo = (P.weapAmmo && P.weapAmmo[i] != null) ? P.weapAmmo[i] : P.maxAmmo;
            rebuild();
          }
        }
      }));
    }
  });

  const isLS = (S && S.isEvent && S.evDef && S.evDef.id === 'last_stand');
  add(isLS ? 'Field Repair (30%) $100' : 'Heal full $100', 100, () => P.hp = isLS ? Math.min(P.mx, P.hp + Math.round(P.mx * 0.3)) : P.mx);
  add('Grenades +5 $150', 150, () => S.gr += 5);
  add('Deploy Turret $250', 250, () => { TR.push({ x: P.x, y: P.y, l: 35, cd: 0 }); burst(P.x, P.y, '#ffd36b', 10); });
  add('Fast Reload Stim (-25% RL) $280', 280, () => { S.fastReload = 1; burst(P.x, P.y, '#ffd36b', 12); });
  add('Shield Battery $220', 220, () => { S.bl = (S.bl || 0) + 1; S.bc = (S.bc || 0) + 1; burst(P.x, P.y, '#be8cff', 12); });
  add('+25 max health $200', 200, () => { P.mx += 25; P.hp += 25; });
  add('Speed Stim (+20%) $300', 300, () => { S.ms = (S.ms || 1) * 1.2; burst(P.x, P.y, '#5ac8e8', 12); });
  add('+15% damage $400', 400, () => S.dm = (S.dm || 1) * 1.15);
  add('Random power $350', 350, () => S.pend++);
}

function begin() {
  ['start', 'over', 'shopov', 'pause', 'perk'].forEach(i => {
    const el = document.getElementById(i);
    if (el) el.classList.remove('on');
  });
  if (typeof clearEventContext === 'function') clearEventContext();
  init();
  if (typeof applySV === 'function') applySV();
  startWave();
}

function tch(e) {
  e.preventDefault();
  TCH = 1;
  for (const t of e.changedTouches) {
    if (e.type === 'touchstart') {
      const bi = BT.findIndex(b => {
        const p = b.p();
        return Math.hypot(t.clientX - p[0], t.clientY - p[1]) < (b.ar ? 32 : 38);
      });
      if (bi >= 0) { if (run) BT[bi].f(); continue; }
      if (run && t.clientY > H - 65 && t.clientY < H - 5) {
        if (Math.abs(t.clientX - W / 2) < 40) { startReload(); continue; }
        if (Math.abs(t.clientX - W / 2) < 75) { swap(t.clientX > W / 2 ? 1 : -1); continue; }
      }
      const k = t.clientX < W / 2 ? 'l' : 'r';
      if (!J[k] && t.clientY > H * 0.25) {
        const [bx, by] = jPos(k);
        const ox = Math.abs(t.clientX - bx) < 100 ? bx : t.clientX;
        const oy = Math.abs(t.clientY - by) < 100 ? by : t.clientY;
        J[k] = { id: t.identifier, ox, oy, x: t.clientX, y: t.clientY };
      }
    } else {
      for (const k of ['l', 'r']) {
        const s = J[k];
        if (s && s.id === t.identifier) {
          if (e.type === 'touchmove') { s.x = t.clientX; s.y = t.clientY; }
          else J[k] = null;
        }
      }
    }
  }
}
