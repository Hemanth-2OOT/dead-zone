// DEAD ZONE v2.7 - WORLD ENGINE & MAIN SIMULATION PIPELINE
// Senior 2D Artist / Technical Rendering & Gameplay System

let P, Z = [], B = [], D = [], F = [], T = [], RG = [], GH = [], AB = [];
let TR = [], CH = [], LT = [], NS = [], TX = [], CS = [], MAG = [];
let POIS = [], DUST = [], O = [], G = [], HZ = [];
let ACID_PUDDLES = [], AOE_DEBRIS = [], SUMQ = [];
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
  { n: 'II', ar: 1, p: () => [W - 36, 32], f: () => pause() },
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
    // Crit / milestone text pops out slightly as it fades
    const pop = t.b ? 1 + (1 - alpha) * 0.3 : 1;
    X.globalAlpha = alpha;
    X.font = t.b ? '900 14px Impact, Arial Black, sans-serif' : 'bold 11px Arial';
    X.textAlign = 'center';
    if (pop !== 1) { X.translate(t.x, t.y); X.scale(pop, pop); X.translate(-t.x, -t.y); }
    X.fillStyle = '#000000';
    X.fillText(t.s, t.x + 1, t.y + 1);
    if (t.b) { X.strokeStyle = 'rgba(0,0,0,0.85)'; X.lineWidth = 2.5; X.strokeText(t.s, t.x, t.y); }
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
  const armor = Math.max(0.35, (S && S.ar != null) ? S.ar : 1); // Damage reduction hard-capped at 65%
  const d = Math.max(1, Math.round(dmg * armor));

  // Aegis barrier charges: one charge eats a whole real hit, then rebuilds in
  // 12s. Per-frame ticks (acid, hazards) are far too small to spend a charge.
  if (S && S.bc > 0 && dmg >= 5) {
    S.bc--;
    S.bcRe = 12;
    P.hurt = 0.16;
    HURT_VIGNETTE_TIMER = 0.2;
    RG.push({ x: P.x, y: P.y, r: 7, l: 0.36, v: 320, c: '234,179,8' });
    burst(P.x, P.y, '#eab308', 12, 2.6, 110, 1);
    if (typeof snd === 'function') snd(300, 0.18, 'square', 0.07, 1.4);
    if (typeof txt === 'function') txt(P.x, P.y - 20, 'BLOCKED', '#eab308');
    return;
  }

  // Deflector Ring: a chance to shrug the hit off completely.
  if (S && S.kd && Math.random() < Math.min(0.6, 0.35 * S.kd)) {
    P.hurt = 0.1;
    RG.push({ x: P.x, y: P.y, r: 6, l: 0.3, v: 300, c: '96,165,250' });
    if (typeof snd === 'function') snd(880, 0.12, 'sine', 0.06, 0.4);
    if (typeof txt === 'function') txt(P.x, P.y - 20, 'DEFLECT', '#60a5fa');
    return;
  }

  P.hp -= d;
  P.hurt = 0.28;

  // Thorns: whatever lands a hit on you gets blasted back off.
  if (S && S.th) {
    let struck = 0;
    for (const z of Z) {
      if (!z || z.dead) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < 14400) {
        const za = Math.atan2(dy, dx);
        z.kx = (z.kx || 0) + Math.cos(za) * 190;
        z.ky = (z.ky || 0) + Math.sin(za) * 190;
        damageZ(z, 40 * S.th, 'thorns', false);
        struck++;
      }
    }
    if (struck) {
      RG.push({ x: P.x, y: P.y, r: 6, l: 0.32, v: 380, c: '255,122,90' });
      burst(P.x, P.y, '#ff7a5a', 12, 2.8, 130, 1);
    }
  }

  if (S) { S.hitWave = true; if (S.cmb > 0) S.cmt = Math.min(S.cmt, 1.2); }
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
    evTargetWave: evTw, evWon: false,
    cmb: 0, cmt: 0, cmbMax: 0, puPity: 0, flawless: 0, flawlessBest: 0, hitWave: false, adr: 0, mgTime: 0,
    clearedWave: -1,
    boons: {}, boonOffer: [], waveTimes: {}, deal: null, eliteKills: 0, bossKills: 0, ascMul: 1
  };
  if (typeof fxReset === 'function') fxReset();

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
  if (typeof clearFeelFX === 'function') clearFeelFX();
  if (typeof clearPassives === 'function') clearPassives();
  if (typeof HUD_FLYING_ICONS !== 'undefined') HUD_FLYING_ICONS.length = 0;
  if (typeof HIT_STOP_TIMER !== 'undefined') HIT_STOP_TIMER = 0;

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

  // Sector ascension scales the threat (and the bounty) of an already-cleared zone
  S.ascMul = (typeof ascRewardMult === 'function') ? ascRewardMult(curM) : 1;
  S.ascTier = (typeof ascTier === 'function') ? ascTier(curM) : 0;
  if (typeof initAmbient === 'function') initAmbient(curM);

  // Load obstacles from MAP_DATA or procedural fallback
  if (mapDef.obstacles && mapDef.obstacles.length) {
    mapDef.obstacles.forEach(o => O.push({ ...o }));
  } else if (mapDef.walls && mapDef.walls.length) {
    // Authored layout: buildings, barriers & fences become real colliders
    mapDef.walls.forEach(wl => O.push({ x: wl.x, y: wl.y, w: wl.w, h: wl.h, k: 1, t: wl.t || 'building', col: wl.col, roof: wl.roof, name: wl.name || '' }));
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
  S.cash = (S.cash || 0) + (S.stCash || 0); // 'Starting Cash' stat upgrade: +$50 per wave

  const densityMult = (S && S.isEvent && S.evDef && S.evDef.id === 'heavy_metal') ? 2 : 1;
  const n = (6 + S.wave * 4) * densityMult;

  // Each sector declares its own roster (MP[].enemies). Previously that list was
  // only ever printed on the lobby map card - the wave actually spawned from one
  // global bucket set, so every sector played identically. The roster now drives
  // the spawn table, gated by wave so tough specialists never front-load.
  const bCurM = getCurMap();
  const bRoster = (MP[bCurM] && MP[bCurM].enemies && MP[bCurM].enemies.length)
    ? MP[bCurM].enemies : ['walk', 'run', 'tank', 'exp', 'stalker', 'charger', 'spit'];
  const GATE = { walk: 0, run: 2, exp: 3, crawler: 3, stalker: 4, tank: 4, spit: 5, charger: 5, screamer: 6, armored: 7, bloater: 8, shielder: 9, necromancer: 10 };
  const bPool = bRoster.filter(x => x !== 'boss' && S.wave >= (GATE[x] != null ? GATE[x] : 0));
  if (!bPool.length) bPool.push('walk');

  for (let i = 0; i < n; i++) {
    S.q.push(bPool[Math.floor(Math.random() * bPool.length)]);
  }

  if (S.wave % 5 === 0) S.q.push('boss');
  if (S.wave >= 25 && S.wave % 5 === 0) S.q.push('boss'); // Twin bosses on wave 25+
  S.sp = 0;
  run = 1;
  if (typeof applyWaveModifier === 'function') applyWaveModifier();

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
  const sc = waveHpScale * zh * (S.zc || 1) * (1 + 0.07 * (S.ascTier || 0));

  const baseElChance = (S && S.isEvent && S.evDef && S.evDef.id === 'elite_hunt') ? 0.24 : 0.06;
  const elBonus = S.wave > 25 ? Math.min(0.25, (S.wave - 25) * 0.02) : (S.wave > 15 ? (S.wave - 15) * 0.008 : 0);
  const elChance = Math.min(0.60, baseElChance + elBonus + (S.eliteBoost || 0));
  const elWaveMin = (S && S.isEvent && S.evDef && S.evDef.id === 'elite_hunt') ? 1 : 2;
  const el = S.wave >= elWaveMin && t !== 'boss' && Math.random() < elChance;

  Z.push({
    x, y, t,
    hp: T.hp * sc * (el ? 3.5 : 1),
    mh: T.hp * sc * (el ? 3.5 : 1),
    hit: 0, cd: 0, el, flinch: 0,
    animOffset: Math.random() * 6.28,
    bv: t === 'boss' ? ((S.wave / 5 | 0) - 1) % 4 : 0,
    // Elites roll one affix (see ELITE_AFFIX); -1 means "ordinary elite".
    aff: el ? (Math.random() * ELITE_AFFIX.length | 0) : -1,
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
  if (P.cloak > 0) P.cloak = 0; // firing blows your cover
  P.cd = w.r / ((SK && SK.rage && SK.rage.on > 0 ? 1.8 : 1) * (1 + 0.06 * (SV.rof || 0)) * (S.rf || 1) * (S.bz && S.bl2 > 0 ? 1 + 0.15 * S.bz : 1) * (S.cst > 0 ? 1 + 0.25 * (S.cs || 0) : 1) * (S.hd > 0 ? 1.5 : 1) * (S.adr > 0 ? 1.45 : 1));
  P.fl = 0.07;
  sfx(P.cur);

  // Damage-scaled muzzle smoke so a railgun blast smokes hard and an SMG tick
  // barely puffs. Purely cosmetic.
  if (typeof muzzleSmokeFX === 'function') muzzleSmokeFX(P.cur, P.a, P.x + Math.cos(P.a) * (((typeof ML !== 'undefined' && ML[P.cur]) || 45) * 0.87), P.y + Math.sin(P.a) * (((typeof ML !== 'undefined' && ML[P.cur]) || 45) * 0.87));

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

  if (typeof isShakeEnabled === 'function' ? isShakeEnabled() : QUALITY_SETTINGS.screenShake) SH = Math.max(SH, w.p > 1 ? 4 : 1.5);

  const curSkin = (typeof SV !== 'undefined' && SV && SV.eqSkin && SV.eqSkin[P.cur]) ? SKINS[SV.eqSkin[P.cur]] : null;
  const bulletCol = curSkin ? curSkin.col : WC[P.cur];
  const mOff = ((ML[P.cur] || 45) * 0.87);

  // Point-blank check: if an enemy is directly between player and muzzle, spawn close so bullets don't bypass them
  let pbTarget = null, minD2 = (mOff + 25) * (mOff + 25);
  for (const z of Z) {
    if (z.dead) continue;
    const pbx = z.x - P.x, pby = z.y - P.y;
    const d2 = pbx * pbx + pby * pby;
    if (d2 < minD2) {
      const angDiff = Math.abs(Math.atan2(pby, pbx) - P.a);
      const normDiff = Math.atan2(Math.sin(angDiff), Math.cos(angDiff));
      if (Math.abs(normDiff) < 0.65) {
        minD2 = d2;
        pbTarget = z;
      }
    }
  }

  const bx0 = P.x + Math.cos(P.a) * (pbTarget ? 8 : mOff), by0 = P.y + Math.sin(P.a) * (pbTarget ? 8 : mOff);
  const canSpawn = hasLOS(P.x, P.y, bx0, by0);
  const sx = canSpawn ? bx0 : P.x, sy = canSpawn ? by0 : P.y;

  for (let i = 0; i < w.p + (S.xp2 || 0); i++) {
    const a = P.a + (Math.random() - 0.5) * w.sp * 2 + (S.xp2 ? (Math.random() - 0.5) * 0.12 : 0);
    const critChance = Math.min(0.75, 0.04 * (SV.crit || 0) + (CL[SV.cls || 0] ? CL[SV.cls || 0].crit : 0) + (S.ct || 0));
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? (2 + (S.cdmg || 0)) : 1;
    const rawDm = S.dm || 1;
    const effDm = rawDm > 3.0 ? (3.0 + Math.sqrt(rawDm - 3.0) * 0.8) : rawDm;
    const mastMult = (typeof masteryDamageMult === 'function') ? masteryDamageMult(P.cur) : 1;
    const finalDmg = w.d * effDm * mastMult * (S.dd > 0 ? 2 : 1) * (1 + (S.bk || 0) * 0.35 * (1 - P.hp / P.mx)) * (S.oc && S.shots % Math.max(4, 12 - S.oc * 3) === 0 ? 3 : 1) * (S.fo && S.stl > 1 ? 1 + 0.4 * S.fo : 1) * critMult;

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
      cl: (S.cl || 0) + (w.cl || 0),
      fz: w.fz || 0,
      flm: w.flm || 0,
      ls: w.ls || 0,
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
function damageZ(z, rawDmg, src, isCrit, hitAngle, wi) {
  if (!z || z.dead) return false;
  if (!isFinite(z.hp) || z.hp <= 0) {
    z.hp = 0;
    killZ(z, src || 'invalid_hp', hitAngle, isCrit, wi);
    return true;
  }
  const dmg = Number(rawDmg);
  if (!isFinite(dmg) || dmg <= 0) return false;

  let arm = (z.t === 'tank' ? 0.85 : (z.t === 'charger' ? 0.90 : 1)) * (z.el ? 0.88 : 1);
  // Armoured units angle the plate they are facing into incoming fire: a shot
  // that lands head-on loses half its punch, so the counter is to flank them.
  if (z.t === 'armored' || (z.t === 'boss' && (z.bv || 0) === 3)) {
    const facing = Math.atan2(P.y - z.y, P.x - z.x);
    const ha = (typeof hitAngle === 'number' && isFinite(hitAngle)) ? hitAngle : facing + Math.PI;
    if (Math.cos(ha - facing) < -0.35) arm *= 0.45;
  }
  // Shielder ward: undead inside the bubble are harder to kill.
  if (z.sh > 0) arm *= 0.55;
  const finalD = Math.max(1, dmg * arm);
  z.hp -= finalD;
  z.hit = 0.08;
  z.flinch = 0.08;

  // Floating damage readout so the player can actually read their DPS.
  // Crits pop larger and brighter; small chip damage is suppressed to avoid noise.
  if (typeof txt === 'function' && (isCrit || finalD >= 14)) {
    txt(z.x + (Math.random() - 0.5) * 10, z.y - 26 - Math.random() * 8,
      String(Math.round(finalD)), isCrit ? '#ffd84a' : '#ffe9b8', !!isCrit);
  }

  // Surface-aware & archetype-aware blood splatter physics.
  // hitAngle = projectile travel direction; getCurMap() selects the sector blood palette.
  const bloodAngle = (typeof hitAngle === 'number' && isFinite(hitAngle)) ? hitAngle : Math.atan2(z.y - P.y, z.x - P.x);
  if (typeof spawnBloodHit === 'function') {
    spawnBloodHit(z.x, z.y, bloodAngle, finalD, !!isCrit, (typeof getCurMap === 'function' ? getCurMap() : 0));
  }

  // Impact feedback: sparks, dust, shockwave, hit-stop and screen punch all
  // scale with the damage actually dealt, so heavy single shots finally feel
  // heavier than an SMG tick.
  if (typeof combatImpactFX === "function") combatImpactFX(z.x, z.y, bloodAngle, finalD, !!isCrit, wi);

  if (!isFinite(z.hp) || z.hp <= 0) {
    z.hp = 0;
    killZ(z, src, bloodAngle, isCrit, wi);
    return true;
  }
  return false;
}

// CENTRALIZED DEATH PIPELINE
function killZ(z, src, hitAngle, isCrit, wi) {
  if (!z || z.dead) return;
  z.dead = 1;
  z.hp = 0;
  z.cd = 999;

  S.kills = (S.kills || 0) + 1;
  if (z.el) S.eliteKills = (S.eliteKills || 0) + 1;
  if (z.t === 'boss') S.bossKills = (S.bossKills || 0) + 1;
  // Weapon mastery: attribute the kill to the weapon that is currently equipped
  // (bullets carry their origin index; other sources fall back to the held gun).
  if (typeof addMasteryXP === 'function') {
    const mwi = (wi == null) ? P.cur : wi;
    addMasteryXP(mwi, z.t === 'boss' ? 40 : (z.el ? 12 : 3));
  }
  const T = ZT[z.t] || ZT.walk;

  // Call high-fidelity kill gore system (gibs, growing pools, ground stains)
  const bloodAngle = (typeof hitAngle === 'number' && isFinite(hitAngle)) ? hitAngle : (P ? Math.atan2(z.y - P.y, z.x - P.x) : 0);
  if (typeof spawnKillGore === 'function') {
    spawnKillGore(z.x, z.y, bloodAngle, z.t, !!isCrit, (typeof getCurMap === 'function' ? getCurMap() : 0));
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
  } else if (z.t === 'bloater') {
    // A bloater bursts into a lingering toxic pool - the death is the threat.
    burst(z.x, z.y, '#8aa03a', 22, 4.2, 105, 1);
    burst(z.x, z.y, '#d8ff70', 12, 3, 150);
    G.push({ x: z.x, y: z.y, r: T.r * 1.5, k: 'g' });
    ACID_PUDDLES.push({ x: z.x, y: z.y, r: 54, maxR: 54, l: 7, maxL: 7, tox: 1 });
    if (ACID_PUDDLES.length > 25) ACID_PUDDLES.shift();
    RG.push({ x: z.x, y: z.y, r: 8, l: 0.5, v: 300, c: '170,200,60' });
  } else if (z.t === 'shielder') {
    burst(z.x, z.y, '#5aa0e0', 16, 3, 100);
    burst(z.x, z.y, '#bff4ff', 10, 2.5, 140);
    RG.push({ x: z.x, y: z.y, r: 10, l: 0.45, v: 420, c: '120,190,255' });
    G.push({ x: z.x, y: z.y, r: T.r * 1.2, k: 'b' });
  } else if (z.t === 'screamer') {
    burst(z.x, z.y, '#c76a9a', 16, 3.4, 95);
    burst(z.x, z.y, '#ffd0e8', 8, 2.6, 130);
    G.push({ x: z.x, y: z.y, r: T.r * 1.2, k: 'b' });
  } else if (z.t === 'necromancer') {
    burst(z.x, z.y, '#8a5adf', 20, 4, 110, 1);
    burst(z.x, z.y, '#e0c8ff', 12, 3, 150);
    RG.push({ x: z.x, y: z.y, r: 9, l: 0.6, v: 380, c: '150,80,255' });
    G.push({ x: z.x, y: z.y, r: T.r * 1.3, k: 'b' });
  } else if (z.t === 'crawler' || z.t === 'armored') {
    burst(z.x, z.y, T.col, 12, 3.4, 95, 1);
    burst(z.x, z.y, z.t === 'armored' ? '#c8d0d8' : '#c8502d', 8, 2.4, 120, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.15, k: 'b' });
  } else {
    burst(z.x, z.y, T.col, 12, 3.5, 90, 1);
    burst(z.x, z.y, '#c8502d', 8, 2.5, 110, 1);
    G.push({ x: z.x, y: z.y, r: T.r * 1.2, k: 'b' });
  }

  // Elite affix death effects. Deliberately independent of the archetype chain
  // above so any archetype can roll any affix.
  if (z.el && z.aff >= 0 && typeof ELITE_AFFIX !== 'undefined' && ELITE_AFFIX[z.aff]) {
    const af = ELITE_AFFIX[z.aff];
    if (af.id === 'volatile') {
      RG.push({ x: z.x, y: z.y, r: 8, l: 0.5, v: 520, c: '251,146,60' });
      burst(z.x, z.y, '#fb923c', 20, 4, 150, 1);
      if (typeof boom === 'function') boom({ x: z.x, y: z.y, ex: 120, d: 55 });
      SH = Math.max(SH, 10);
      if (typeof snd === 'function') snd(110, 0.3, 'square', 0.08, 0.6);
    } else if (af.id === 'split') {
      // Splitters break into two smaller walkers - killing one is not done.
      const hpS = Math.max(12, T.hp * 0.45);
      for (let k = 0; k < 2; k++) {
        const an = Math.random() * 6.28;
        SUMQ.push({
          x: Math.max(20, Math.min(WS - 20, z.x + Math.cos(an) * 30)),
          y: Math.max(20, Math.min(WS - 20, z.y + Math.sin(an) * 30)),
          t: 'walk', hp: hpS, mh: hpS, hit: 0, cd: 0, el: false, flinch: 0,
          animOffset: Math.random() * 6.28, cgT: 0, age: 0, aff: -1
        });
      }
      burst(z.x, z.y, '#c084fc', 16, 3.5, 120);
      RG.push({ x: z.x, y: z.y, r: 7, l: 0.5, v: 380, c: '192,132,252' });
    }
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
  const cashVal = Math.round(T.c * (S.ev ? 1.5 : 1) * cm * (S.cm || 1) * (z.el ? 4 : 1) * (S.wmCash || 1) * (S.ascMul || 1) * (1 + (typeof runStreakBonus === 'function' ? runStreakBonus() : 0)) * (typeof comboCashMult === 'function' ? comboCashMult() : 1));
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
  if (typeof directorOnKill === 'function') directorOnKill(z);

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
  if (typeof passiveOnKill === 'function') passiveOnKill(z);
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
  if (!z || !isFinite(z.x) || !isFinite(z.y) || !O || !O.length) return;
  for (const o of O) {
    const cx = Math.max(o.x, Math.min(z.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(z.y, o.y + o.h));
    const dx = z.x - cx;
    const dy = z.y - cy;
    const dSq = dx * dx + dy * dy;

    if (dSq < r * r) {
      const d = Math.sqrt(dSq);
      if (d > 0.001) {
        z.x += (dx / d) * (r - d);
        z.y += (dy / d) * (r - d);
      } else {
        const dl = z.x - o.x;
        const dr = (o.x + o.w) - z.x;
        const dt = z.y - o.y;
        const db = (o.y + o.h) - z.y;
        const minD = Math.min(dl, dr, dt, db);
        if (minD === dl) z.x = o.x - r;
        else if (minD === dr) z.x = o.x + o.w + r;
        else if (minD === dt) z.y = o.y - r;
        else z.y = o.y + o.h + r;
      }
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
  if (k === 'gren' && S.gr <= 0) return;
  // Refund the cooldown when a targeted skill has nothing to act on, so a
  // wasted press never costs the player their escape or their burst window.
  if (k === 'heal' && P.hp >= P.mx - 0.5) return;
  if (k === 'bolt' && !nearestZombie(P.x, P.y, 560)) return;
  if (k === 'meteor' && !nearestZombie(P.x, P.y, 900)) return;
  s.cd = s.max;

  // Cast VFX fire before the gameplay effect so the animation leads the hit.
  if (typeof skillCastFX === 'function') skillCastFX(k, P.x, P.y, P.a);

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
    if (typeof isShakeEnabled === 'function' ? isShakeEnabled() : QUALITY_SETTINGS.screenShake) SH = Math.max(SH, 8);
    if (typeof noise === 'function') noise(0.25, 0.1);
  } else if (k === 'rage') {
    s.on = 6;
    burst(P.x, P.y, '#ffb347', 16);
    if (typeof snd === 'function') snd(350, 0.3, 'sawtooth', 0.08, 1.8);
  } else if (k === 'gren') {
    S.gr--;
    // Thrown, arcing grenade (same payload, 0.34s later) so the skill has a
    // visible flight instead of an instant off-screen detonation.
    const gx = P.x + Math.cos(P.a) * 120, gy = P.y + Math.sin(P.a) * 120;
    if (typeof GREN !== 'undefined') {
      GREN.push({ sx: P.x + Math.cos(P.a) * 12, sy: P.y + Math.sin(P.a) * 12, x: P.x, y: P.y, tx: gx, ty: gy, t: 0, dur: 0.34, h: 0, dmg: 110 * S.dm });
    } else {
      boom({ x: gx, y: gy, ex: 110, d: 110 * S.dm });
    }
    if (typeof snd === 'function') snd(180, 0.16, 'triangle', 0.05, 1.4);
  } else if (k === 'turret') {
    TR.push({ x: P.x + Math.cos(P.a) * 28, y: P.y + Math.sin(P.a) * 28, l: 18, cd: 0, a: P.a });
    burst(P.x, P.y, '#ffd36b', 14);
    if (typeof snd === 'function') snd(300, 0.2, 'square', 0.05, 1.5);
  } else if (k === 'frost') {
    // Frost Burst - a chilling wave that chips and deeply slows the crowd.
    const R2 = 220 * 220;
    RG.push({ x: P.x, y: P.y, r: 10, l: 0.55, v: 560, c: '150,220,255' });
    RG.push({ x: P.x, y: P.y, r: 6, l: 0.4, v: 380, c: '220,245,255' });
    burst(P.x, P.y, '#9be7ff', 26, 3.2, 155, 1);
    for (const z of Z) {
      if (!z || z.dead) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < R2) {
        damageZ(z, 50 * S.dm, 'frost', false);
        z.fz = Math.max(z.fz || 0, 4);
      }
    }
    if (typeof snd === 'function') snd(700, 0.26, 'sine', 0.07, 0.5);
  } else if (k === 'cloak') {
    // Cloak - leaves the zombies' threat model for a few seconds. Firing breaks
    // it, so it buys a reposition rather than free damage.
    P.cloak = 2.8;
    burst(P.x, P.y, '#9be7ff', 18, 3, 120, 1);
    RG.push({ x: P.x, y: P.y, r: 8, l: 0.4, v: 320, c: '150,200,255' });
    if (typeof snd === 'function') snd(520, 0.22, 'sine', 0.05, 1.6);
  } else if (k === 'shield') {
    // Aegis Shield - one absorb charge; the barrier loop rebuilds it.
    S.bc = (S.bc || 0) + 1;
    S.bl = (S.bl || 0) + 1;
    burst(P.x, P.y, '#eab308', 16, 3, 110, 1);
    if (typeof snd === 'function') snd(420, 0.18, 'triangle', 0.06, 1.5);
  } else if (k === 'heal') {
    if (typeof healP === 'function') healP(P.mx * 0.35);
    burst(P.x, P.y, '#8fae4a', 18, 3, 110, 1);
    RG.push({ x: P.x, y: P.y, r: 6, l: 0.4, v: 260, c: '143,174,74' });
    if (typeof snd === 'function') snd(560, 0.25, 'triangle', 0.07, 1.6);
  } else if (k === 'bolt') {
    // Storm Bolt - sky lightning onto the nearest hostile, then it chains.
    const tg = nearestZombie(P.x, P.y, 560);
    if (tg) {
      ARCS.push({ x1: tg.x, y1: tg.y - 300, x2: tg.x, y2: tg.y, l: 0.2, maxL: 0.2, seed: Math.random() * 999 });
      damageZ(tg, 130 * S.dm, 'bolt', false);
      burst(tg.x, tg.y, '#9be7ff', 12, 3, 140, 1);
      if (typeof chainLightning === 'function') chainLightning(tg, { cl: 3, d: 130 * S.dm, h: [tg], wi: P.cur });
      if (typeof snd === 'function') snd(1200, 0.18, 'sawtooth', 0.09, 0.2);
    }
  } else if (k === 'meteor') {
    // Meteor - a telegraphed strike that lands a beat later at the aim point.
    const mx = Math.max(40, Math.min(WS - 40, P.x + Math.cos(P.a) * 280));
    const my = Math.max(40, Math.min(WS - 40, P.y + Math.sin(P.a) * 280));
    meteorStrike(mx, my, 240 * S.dm, 0.55, 150);
  }
}

function gainXP(amt) {
  if (!S) return;
  const gain = amt * (1 + 0.08 * (typeof SV !== 'undefined' ? (SV.xpb || 0) : 0)); // Tactical Training
  S.xp = (S.xp || 0) + gain;
  S.axp = (S.axp || 0) + gain;
  let needed = (typeof rneed === 'function') ? rneed(S.lv || 1) : 100;
  let leveled = 0;
  while (S.xp >= needed && needed > 0) {
    S.xp -= needed;
    S.lv = (S.lv || 1) + 1;
    S.pend = (S.pend || 0) + 1;  // Perk pick
    S.up = (S.up || 0) + 1;      // Skill points gained this run (summary)
    if (typeof SV !== 'undefined') {
      SV.sp = (SV.sp || 0) + 1;   // +1 skill point per level (lobby skill tree)
      SV.lvl = (SV.lvl || 1) + 1; // Account rank progression
      if (typeof sv === 'function') sv();
    }
    leveled++;
    needed = (typeof rneed === 'function') ? rneed(S.lv) : 100;
  }
  if (leveled) {
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
  // Lifetime stats, achievements, ascension and ghost pace all settle exactly once.
  if (typeof settleRun === 'function') settleRun();
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
  // Pick 3 random distinct perks, never offering one already at max stacks
  const owned = n => (S.pk && S.pk[n]) || 0;
  const avail = PKS.filter(p => owned(p[0]) < (p[3] || 1));
  const src = avail.length >= 3 ? avail : PKS;
  const pool = [...src].sort(() => Math.random() - 0.5).slice(0, 3);
  pool.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'background:rgba(20,24,18,.96);border:1.5px solid ' + p[4] + ';border-radius:10px;padding:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:transform .15s;';
    const iconUri = (typeof getPerkIcon === 'function') ? getPerkIcon(p[0], p[4]) : '';
    card.innerHTML = (iconUri ? `<div style="width:38px;height:38px;border-radius:8px;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;border:1px solid ${p[4]}55"><img src="${iconUri}" style="width:26px;height:26px"></div>` : '')
      + `<div style="flex:1;min-width:0">`
      + `<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:${p[4]};font-size:13px;letter-spacing:.5px">${p[0]}</b>`
      + `<span style="font-size:9px;font-weight:800;color:#ffd36b;letter-spacing:1px">${p[5]}${owned(p[0]) ? ' \u2022 LV' + (owned(p[0]) + 1) : ''}</span></div>`
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

  const rr = document.getElementById('reroll');
  if (rr) {
    // Each reroll in a run costs more, so hunting the perfect god-roll has a price
    const cost = 150 + 100 * (S.rrCount || 0);
    rr.textContent = 'REROLL $' + cost;
    rr.disabled = (S.cash || 0) < cost;
    rr.onclick = () => {
      if ((S.cash || 0) < cost) return;
      S.cash -= cost;
      S.rrCount = (S.rrCount || 0) + 1;
      S.po = 0; // release the lock so openPerk re-rolls a fresh hand
      if (typeof snd === 'function') snd(300, 0.18, 'square', 0.06, 1.2);
      openPerk();
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

  // Particle budget, pass 1 of 2. Must sit ABOVE the hit-stop return below:
  // hit-stop skips the rest of the frame (including F's decay), so on those
  // frames this is the only thing keeping the pool bounded.
  if (typeof trimParticleBudget === 'function') trimParticleBudget();

  if (typeof updateAmbient === 'function') updateAmbient(dt);

  // Damage-chip health bar: the ghost value lags behind real HP after a hit and
  // snaps forward instantly on healing.
  if (S) {
    if (S.hpChip == null) S.hpChip = P.hp;
    S.hpChip = Math.max(P.hp, S.hpChip + (P.hp - S.hpChip) * Math.min(1, dt * 2.2));
  }

  // Hit-stop micro-pause, now actually triggered by heavy/critical impacts.
  if (HIT_STOP_TIMER > 0) {
    HIT_STOP_TIMER -= dt;
    if (typeof updateFeelFX === 'function') updateFeelFX(dt);
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
  let sp = clsData.spd * (1 + 0.04 * (SV.spd || 0)) * (S.ms || 1) * (S.cst > 0 ? 1 + 0.15 * (S.cs || 0) : 1) * (S.hd > 0 ? 1.3 : 1) * (S.adr > 0 ? 1.22 : 1) * (isMinigunFiring ? 0.78 : 1);
  let vx = mx, vy = my;

  if (P.dash > 0) {
    P.dash -= dt;
    sp = 650;
    vx = P.lx; vy = P.ly;
  }

  if (Math.hypot(vx, vy) > 0.1) P.st = (P.st || 0) + dt * 14;
  P.x += vx * sp * dt;
  push(P, 14);
  P.y += vy * sp * dt;
  push(P, 14);
  sanitizePlayer();

  // Skill cooldowns
  for (const k in SK) if (SK[k] && SK[k].cd > 0) SK[k].cd -= dt * Math.min(1.5, 1 + 0.05 * (SV.cdr || 0)) * (S.cd2 || 1);
  if (SK && SK.rage && SK.rage.on > 0) SK.rage.on -= dt;
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
  if (P.cloak > 0) P.cloak -= dt;
  // Aegis barrier rebuild: a spent charge returns after 12s.
  if (S && S.bl > 0 && S.bc < S.bl) {
    S.bcRe = (S.bcRe == null ? 12 : S.bcRe) - dt;
    if (S.bcRe <= 0) { S.bc = Math.min(S.bl, (S.bc || 0) + 1); S.bcRe = 12; }
  } else if (S) {
    S.bcRe = 12;
  }
  S.lsTok = Math.min(4, (S.lsTok == null ? 4 : S.lsTok) + dt * 4);
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

  if (typeof directorUpdate === 'function') directorUpdate(dt);
  // Passive auras, summons and status effects (SPECIAL perks & relics).
  if (typeof updatePassives === 'function') updatePassives(dt);

  // Firing check
  if (firing && P.cd <= 0) fire();

  // Wave spawn queue
  if (S && S.q && S.q.length) {
    S.sp -= dt;
    const densityMult = (S && S.isEvent && S.evDef && S.evDef.id === 'heavy_metal') ? 2 : 1;
    if (S.sp <= 0 && Z.length < 55) {
      spawn(S.q.shift());
      S.sp = Math.max(0.15, (1.0 - S.wave * 0.055) * (S.spMul || 1) / densityMult);
    }
  }

  // Update projectiles
  for (const b of B) {
    if (b.l <= 0) continue;
    b.x += b.vx * dt; b.y += b.vy * dt; b.l -= dt;
    for (const o of O) {
      if (b.l <= 0) break;
      if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) {
        b.l = 0;
        if (b.ex) boom(b);
        if (typeof impactFX === 'function') impactFX(b.x, b.y, b.vx, b.vy, o.col); else burst(b.x, b.y, '#bbb', 3);
        break; // one impact per bullet: overlapping walls must not re-fire the boom
      }
    }
  }
  pruneArr(B, b => b.l > 0);
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
      if (c.vx * c.vx + c.vy * c.vy < 25) { c.vx = 0; c.vy = 0; c.va = 0; }
    }
  }
  for (const m of MAG) {
    if (m.vx || m.vy) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.82; m.vy *= 0.82;
      m.a += m.va * dt; m.va *= 0.82;
      if (m.vx * m.vx + m.vy * m.vy < 25) { m.vx = 0; m.vy = 0; m.va = 0; }
    }
    m.l -= dt;
  }
  pruneArr(MAG, m => m.l > 0);

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
  // --- v2.7 support auras & summons -------------------------------------------------
    // Rebuilt every frame so a ward or roar can never outlive its source. Must run
    // before the movement/damage loop so the flags are already in place when a
    // bullet resolves against a warded zombie later in this same tick.
    for (const z of Z) {
      if (z.sh > 0) z.sh = Math.max(0, z.sh - dt);
      if (z.buffT > 0) z.buffT = Math.max(0, z.buffT - dt);
      if (z.rr > 0) z.rr = Math.max(0, z.rr - dt);
    }
    for (const z of Z) {
      if (z.dead) continue;
      // Elite affix ticks run as their own pass so an elite Necromancer still
      // regens while also running its summon logic.
      if (z.aff >= 0 && z.hp > 0 && z.hp < z.mh && typeof ELITE_AFFIX !== 'undefined') {
        const af = ELITE_AFFIX[z.aff];
        if (af && af.hpRegen) z.hp = Math.min(z.mh, z.hp + z.mh * af.hpRegen * dt);
      }
      if (z.t === 'shielder') {
        const R2 = 150 * 150;
        for (const o of Z) {
          if (o.dead || o === z) continue;
          const ox = o.x - z.x, oy = o.y - z.y;
          if (ox * ox + oy * oy < R2) o.sh = 0.3;
        }
      } else if (z.t === 'screamer') {
        z.rw = (z.rw != null ? z.rw : 3.5) - dt;
        const pdx = P.x - z.x, pdy = P.y - z.y;
        if (z.rw <= 0 && pdx * pdx + pdy * pdy < 430 * 430) {
          z.rw = 5.5; z.rr = 0.45;
          for (const o of Z) {
            if (o.dead) continue;
            const ox = o.x - z.x, oy = o.y - z.y;
            if (ox * ox + oy * oy < 260 * 260) o.buffT = 3;
          }
          RG.push({ x: z.x, y: z.y, r: 6, l: 0.5, v: 430, c: '255,120,180' });
          if (typeof snd === 'function') snd(150, 0.34, 'square', 0.05, 0.8);
        }
      } else if (z.t === 'necromancer') {
        z.nw = (z.nw != null ? z.nw : 5) - dt;
        if (z.nw <= 0 && Z.length < 42) {
          z.nw = 8.5;
          const hpS = ZT.walk.hp * (1 + S.wave * 0.055);
          for (let k = 0; k < 2; k++) {
            const an = Math.random() * 6.28;
            SUMQ.push({
              x: Math.max(20, Math.min(WS - 20, z.x + Math.cos(an) * 34)),
              y: Math.max(20, Math.min(WS - 20, z.y + Math.sin(an) * 34)),
              t: 'walk', hp: hpS, mh: hpS, hit: 0, cd: 0, el: false, flinch: 0,
              animOffset: Math.random() * 6.28, cgT: 0, age: 0
            });
          }
          burst(z.x, z.y, '#a855f7', 14, 3, 95);
          RG.push({ x: z.x, y: z.y, r: 5, l: 0.5, v: 320, c: '150,80,255' });
        }
      }
    }

    for (const z of Z) {
    if (!z || z.dead || (z.hp != null && z.hp <= 0) || !isFinite(z.x) || !isFinite(z.y)) {
      if (z && !z.dead && (z.hp <= 0 || !isFinite(z.hp))) killZ(z, 'cleanup');
      if (z) z.dead = 1;
      continue;
    }
    if (z.flinch > 0) z.flinch = Math.max(0, z.flinch - dt);
    if (z.hit > 0) z.hit = Math.max(0, z.hit - dt);
    if (z.cd > 0) z.cd = Math.max(0, z.cd - dt);

    const T = ZT[z.t] || ZT.walk;
    const speed = (T.s || T.spd || 55) * ((z.aff >= 0 && typeof ELITE_AFFIX !== 'undefined' && ELITE_AFFIX[z.aff] && ELITE_AFFIX[z.aff].spMul) ? ELITE_AFFIX[z.aff].spMul : 1);
    const zRadius = T.r || 13;
    const damage = (T.dm != null ? T.dm : (T.dmg != null ? T.dmg : 8)) * (z.buffT > 0 ? 1.3 : 1);
    const a = Math.atan2(P.y - z.y, P.x - z.x);
    if (z.fz > 0) z.fz -= dt;
    const sl = (z.buffT > 0 ? 1.35 : 1) * (z.hit > 0 ? 0.3 : 1) * (P.cloak > 0 ? 0.25 : 1) * (S.fz > 0 ? 0.1 : 1) * (z.fz > 0 ? 0.45 : 1) * (1 - 0.12 * (S.tw || 0)) * (S.ev ? 1.3 : 1) * (z.ch > 0 ? 3.2 : 1);

    const decay = Math.exp(-dt * 9);
    z.kx = (z.kx || 0) * decay; z.ky = (z.ky || 0) * decay;
    if (z.kx * z.kx + z.ky * z.ky < 16 || !isFinite(z.kx) || !isFinite(z.ky)) { z.kx = 0; z.ky = 0; }

    let mvA = (typeof zombieHeading === 'function') ? zombieHeading(z, dt, zRadius) : a;
    // Crawlers scuttle: a cheap sine weave makes the swarm read as erratic rather
    // than as a straight-line rush of identical sprites.
    if (z.t === 'crawler') mvA += Math.sin((S.t || 0) * 6.5 + (z.animOffset || 0)) * 0.55;
    z.x += Math.cos(mvA) * speed * dt * sl + z.kx * dt;
    z.y += Math.sin(mvA) * speed * dt * sl + z.ky * dt;
    if (!isFinite(z.x) || !isFinite(z.y)) { z.dead = 1; continue; }

    z.ph = (z.ph || 0) + dt * speed / 8;
    z.age = (z.age || 0) + dt;
    // Footstep dust: a cheap motion cue that also sells the ground plane and
    // gives the shambling walk a physical footprint. Throttled and capped so
    // it can never crowd out combat particles.
    if (sl > 0.35 && typeof F !== 'undefined' && F.length < 220 && Math.random() < dt * 6) {
      F.push({
        x: z.x - Math.cos(mvA) * (zRadius * 0.55) + (Math.random() - 0.5) * 7,
        y: z.y - Math.sin(mvA) * (zRadius * 0.55) + (Math.random() - 0.5) * 7,
        vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14 - 5,
        l: 0.42 + Math.random() * 0.2, c: 'rgba(146,134,112,0.30)', s: 2.4 + Math.random() * 1.6
      });
    }
    push(z, zRadius);

    // Boundary constraints
    z.x = Math.max(zRadius + 8, Math.min(WS - zRadius - 8, z.x));
    z.y = Math.max(zRadius + 8, Math.min(WS - zRadius - 8, z.y));

    // Zombie melee attack
    const dd = Math.hypot(P.x - z.x, P.y - z.y);

    // Charger lunge cycle: periodic telegraphed burst (consumes z.ch in the speed term)
    if (z.t === 'charger') {
      z.cw = (z.cw || 0) - dt;
      if (z.ch > 0) z.ch -= dt;
      if (z.ch <= 0 && z.cw <= 0 && dd < 320 && dd > 40 && !(P.dash > 0)) {
        z.ch = 0.45;
        z.cw = 2.4;
      }
    }

    if (dd <= zRadius + 18 && z.cd <= 0 && !(P.dash > 0) && !(P.cloak > 0)) {
      if (dd < 30 || hasLOS(z.x, z.y, P.x, P.y)) {
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

    // === Boss attack patterns (v2.7) =========================================
    // The four named bosses (BN) already had distinct sprites but shared one
    // generic "walk at the player" behaviour. Each now runs its own pattern so
    // the fight has to be learned.
    if (z.t === 'boss') {
      const bv = z.bv || 0;
      if (z.ch > 0) z.ch = Math.max(0, z.ch - dt);       // charge timer decays here
      z.bw = (z.bw != null ? z.bw : 3) - dt;
      const los = hasLOS(z.x, z.y, P.x, P.y);

      if (bv === 0) {
        // BRUTE - telegraphed charge, then a ground-slam shockwave on arrival.
        if (z.ch > 0 && dd < zRadius + 52 && !(P.dash > 0)) {
          z.ch = 0;
          z.bw = 6.0;
          hurtP(damage * 1.7, z.x, z.y);
          RG.push({ x: z.x, y: z.y, r: 12, l: 0.55, v: 620, c: '255,110,40' });
          RG.push({ x: z.x, y: z.y, r: 6, l: 0.75, v: 420, c: '255,220,120' });
          burst(z.x, z.y, '#ff8a3a', 22, 5, 170, 1);
          if (typeof boom === 'function') boom({ x: z.x, y: z.y, ex: 90, d: damage * 2.2 });
          SH = Math.max(SH, 12);
          if (typeof snd === 'function') snd(90, 0.4, 'square', 0.09, 0.7);
        } else if (z.bw <= 0 && dd < 620 && dd > 120 && los && !(P.dash > 0)) {
          z.ch = 0.7;
          if (typeof snd === 'function') snd(120, 0.3, 'sawtooth', 0.06, 0.9);
        }
      } else if (bv === 1) {
        // NECROMANCER - raises a pair of walkers on a timer.
        if (z.bw <= 0 && Z.length < 44) {
          z.bw = 7.0;
          const hpS = ZT.walk.hp * (1 + S.wave * 0.055) * 1.4;
          for (let k = 0; k < 2; k++) {
            const an = Math.random() * 6.28;
            SUMQ.push({
              x: Math.max(20, Math.min(WS - 20, z.x + Math.cos(an) * 40)),
              y: Math.max(20, Math.min(WS - 20, z.y + Math.sin(an) * 40)),
              t: 'walk', hp: hpS, mh: hpS, hit: 0, cd: 0, el: false, flinch: 0,
              animOffset: Math.random() * 6.28, cgT: 0, age: 0
            });
          }
          RG.push({ x: z.x, y: z.y, r: 10, l: 0.6, v: 380, c: '180,90,255' });
          burst(z.x, z.y, '#a855f7', 18, 3.5, 110);
          if (typeof snd === 'function') snd(180, 0.35, 'triangle', 0.05, 0.5);
        }
      } else if (bv === 2) {
        // SPITTER QUEEN - five-shot acid fan, plus live crawlers as her brood.
        if (z.bw <= 0 && dd < 430 && dd > 70 && los) {
          z.bw = 5.0;
          for (let k = -2; k <= 2; k++) {
            const aa = a + k * 0.18, asp = 235;
            AB.push({
              x: z.x, y: z.y, vx: Math.cos(aa) * asp, vy: Math.sin(aa) * asp,
              l: Math.min(1.7, dd / asp), r: 6, dmg: 14
            });
          }
          if (Z.length < 44 && (z.bd = (z.bd || 0) + 1) % 2 === 0) {
            for (let k = 0; k < 2; k++) {
              const an = Math.random() * 6.28;
              const hpS = ZT.crawler.hp * (1 + S.wave * 0.055);
              SUMQ.push({
                x: Math.max(20, Math.min(WS - 20, z.x + Math.cos(an) * 36)),
                y: Math.max(20, Math.min(WS - 20, z.y + Math.sin(an) * 36)),
                t: 'crawler', hp: hpS, mh: hpS, hit: 0, cd: 0, el: false, flinch: 0,
                animOffset: Math.random() * 6.28, cgT: 0, age: 0
              });
            }
          }
          burst(z.x, z.y, '#4ade80', 14, 3, 90);
          if (typeof snd === 'function') snd(200, 0.2, 'sawtooth', 0.05, 0.6);
        }
      } else {
        // JUGGERNAUT - armoured (see damageZ) and lobs a three-rocket volley.
        if (z.bw <= 0 && dd < 560 && los) {
          z.bw = 6.5;
          for (let k = -1; k <= 1; k++) {
            const aa = a + k * 0.22, asp = 200;
            AB.push({
              x: z.x, y: z.y, vx: Math.cos(aa) * asp, vy: Math.sin(aa) * asp,
              l: Math.min(1.9, dd / asp), r: 8, dmg: 22, rocket: 1
            });
          }
          if (typeof snd === 'function') snd(140, 0.28, 'square', 0.06, 0.7);
        }
      }
    }

    // Bullet collisions with zombie
    for (const b of B) {
      if (z.dead) break;
      const bdx = b.x - z.x, bdy = b.y - z.y;
      const bR = T.r + 4;
      if (b.l > 0 && !(b.h && b.h.includes(z)) && bdx * bdx + bdy * bdy < bR * bR) {
        damageZ(z, b.d, 'bullet', b.isCrit, Math.atan2(b.vy, b.vx), b.wi);
        if (b.ls && P.hp < P.mx && (S.lsTok = (S.lsTok == null ? 4 : S.lsTok)) > 0) { const hv = Math.min(1.1, b.d * 0.12); healP(hv); S.lsTok -= hv; if (Math.random() < 0.25) F.push({ x: z.x, y: z.y, vx: (P.x - z.x) * 2, vy: (P.y - z.y) * 2, l: 0.35, c: '#ff4d6d', s: 2.4 }); }
        if (b.ex) boom(b);
        (b.h = b.h || []).push(z);
        if (b.cl && !b.arced) { b.arced = 1; if (typeof chainLightning === 'function') chainLightning(z, b); }
        if (b.pr > 0) b.pr--; else b.l = 0;
        if (b.fz) z.fz = 2.5;
        if (S.pv) z.psn = Math.max(z.psn || 0, 2.5); // Venom Rounds: bullets poison

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

  pruneArr(Z, z => !z.dead);

  // Update Spitter Acid Projectiles (AB)
  for (let i = AB.length - 1; i >= 0; i--) {
    const ab = AB[i];
    ab.l -= dt;
    ab.x += ab.vx * dt;
    ab.y += ab.vy * dt;
    if (Math.random() < 0.4 && typeof F !== 'undefined') {
      F.push({ x: ab.x, y: ab.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, l: 0.25, c: '#4ade80', s: 2.5 });
    }
    const abx = P ? P.x - ab.x : 0, aby = P ? P.y - ab.y : 0;
    const hitP = (P && abx * abx + aby * aby < 196);
    if (ab.l <= 0 || hitP) {
      if (hitP) hurtP(ab.dmg || 16, ab.x, ab.y);
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
      const apx = P.x - ap.x, apy = P.y - ap.y, apR = ap.r + 10;
      if (apx * apx + apy * apy < apR * apR) {
        hurtP(18 * dt, ap.x, ap.y);
        if (Math.random() < 0.25 && typeof F !== 'undefined') {
          F.push({ x: P.x + (Math.random() - 0.5) * 12, y: P.y + (Math.random() - 0.5) * 12, vx: 0, vy: -25, l: 0.3, c: '#4ade80' });
        }
      }
    }
    if (ap.l <= 0) ACID_PUDDLES.splice(i, 1);
  }

  // Flush necromancer summons gathered during the update loop (never mutate Z
  // while iterating it).
  if (SUMQ.length) { for (const q of SUMQ) Z.push(q); SUMQ.length = 0; }

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
  pruneArr(CH, c => !c.o);

  // Floating text / particles decay
  for (const f of F) {
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.fr) { f.vx *= 0.9; f.vy *= 0.9; }
    f.l -= dt;
  }
  pruneArr(F, f => f.l > 0);
  // Particle budget, pass 2 of 2. Every emitter guards with a non-atomic
  // `F.length < 250` read-then-push, and burst()/the turret emitters do not
  // guard at all, so a frame that kills a crowd pushes a gore burst per corpse
  // and lands in the draw pass several times over budget.
  if (typeof trimParticleBudget === 'function') trimParticleBudget();

  // Shockwave rings decay
  for (const r of RG) { r.r += (r.v || 520) * dt; r.l -= dt; }
  pruneArr(RG, r => r.l > 0);

  // Skill VFX lifetimes, dash afterimages, grenade flight and bullet smoke.
  if (typeof updateFeelFX === 'function') updateFeelFX(dt);

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

  if (P.hp <= 0 && !S.lsUsed && typeof triggerLastStand === 'function') triggerLastStand();

  if (S.pend > 0 && !S.po && P.hp > 0) openPerk();

  if (P.hp <= 0) {
    run = 0;
    const prevBest = SV.best || 0;
    saveBest();
    if (S.isEvent && S.evDef) {
      document.getElementById('sum').innerHTML = `<div style="font-size:15px;color:#ff5a3a;font-weight:900;margin-bottom:6px">✕ ${S.evDef.title} FAILED</div>`
        + `<div style="font-size:12px;opacity:.9;line-height:1.6;margin-bottom:6px">Operative eliminated in sector.<br>`
        + (S.evDef.targetElites ? `Elites Eliminated: <b>${S.evElites || 0}/${S.evDef.targetElites}</b><br>` : '')
        + `Wave Reached: <b>Wave ${S.wave}</b> (Target: Wave ${S.evTargetWave || 5})</div>`;
    } else {
      document.getElementById('sum').innerHTML = '<div style="font-size:13.5px;margin-bottom:6px"><b>WAVE ' + S.wave + '</b> &bull; ' + S.kills + ' KILLS &bull; SURVIVOR LV ' + S.lv + '</div>'
        + '<div style="font-size:11.5px;opacity:.9;line-height:1.6;margin-bottom:6px">'
        + 'Unspent cash banked: <b>$' + (S.cash || 0) + '</b> &rarr; 1:1 credits<br>'
        + '<span style="color:#ffd36b;font-weight:800;font-size:13.5px">Total Earned: +' + (S.cash || 0) + ' CREDITS</span></div>'
        + '<div style="font-size:11px;color:#8fae4a">Account Rank: ' + SV.lvl + (S.up ? ' (+' + S.up + ' Skill Points!)' : '') + '</div>';
    }
    if (typeof metaHooksHTML === 'function' && !S.isEvent) document.getElementById('sum').innerHTML += metaHooksHTML(prevBest);
    document.getElementById('over').classList.add('on');
  } else if (S && S.q && !S.q.length && !Z.length && !S.po && S.clearedWave !== S.wave) {
    // clearedWave makes the wave-clear award idempotent: re-entering this branch
    // for the same wave can no longer stack flawless bonuses or duplicate the shop.
    S.clearedWave = S.wave;
    run = 0;
    if (typeof directorOnWaveClear === 'function') directorOnWaveClear();
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
  const shakeX = (typeof isShakeEnabled === 'function' ? isShakeEnabled() : QUALITY_SETTINGS.screenShake) ? (Math.random() - 0.5) * SH : 0;
  const shakeY = (typeof isShakeEnabled === 'function' ? isShakeEnabled() : QUALITY_SETTINGS.screenShake) ? (Math.random() - 0.5) * SH : 0;
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

  // 1b. Parallax ground scatter: a slow layer under the grid so movement gains
  //     depth. Cosmetic only - no collision, no gameplay state.
  if (typeof renderParallax === 'function') renderParallax(cx, cy, W, H, mapDef);

  // Subtle tactical ground grid
  X.strokeStyle = mapDef.grid || 'rgba(0,0,0,0.18)';
  X.lineWidth = 1;
  X.beginPath();
  for (let i = 0; i <= WS; i += 100) {
    X.moveTo(i, 0); X.lineTo(i, WS);
    X.moveTo(0, i); X.lineTo(WS, i);
  }
  X.stroke();

  // 1c. Ground texture: cracks, stains and pixel debris on a fixed lattice.
  if (typeof drawMapGroundDetail === 'function') drawMapGroundDetail(cx, cy, W, H, mapDef);

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
    if (o.t && typeof drawObstacleDetailed === 'function' && drawObstacleDetailed(o, mapDef)) continue;
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
        // Soft additive light cone onto ground (gradient cached per lamp)
        X.fillStyle = (typeof cachedRadialGradient === 'function')
          ? cachedRadialGradient('lamp' + pr.x + ',' + pr.y, pr.x, pr.y, 10, 110,
              [[0, 'rgba(255,245,200,0.22)'], [1, 'rgba(255,245,200,0)']])
          : 'rgba(255,245,200,0.12)';
        X.beginPath(); X.arc(pr.x, pr.y, 110, 0, 6.28); X.fill();
        // Lamp head
        X.fillStyle = '#1e241c'; X.beginPath(); X.arc(pr.x, pr.y, 6, 0, 6.28); X.fill();
        X.fillStyle = '#fef08a'; X.beginPath(); X.arc(pr.x, pr.y, 3, 0, 6.28); X.fill();
      } else if (pr.type === 'car') {
        X.save(); X.translate(pr.x, pr.y); X.rotate(pr.a != null ? pr.a : (pr.rot || 0));
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
        X.fillStyle = (typeof cachedRadialGradient === 'function')
          ? cachedRadialGradient('ice' + pr.x + ',' + pr.y, pr.x, pr.y, ir * 0.2, ir,
              [[0, 'rgba(224, 242, 254, 0.65)'], [0.8, 'rgba(125, 211, 252, 0.45)'], [1, 'rgba(56, 189, 248, 0)']])
          : 'rgba(125, 211, 252, 0.4)';
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
        X.fillStyle = (typeof cachedRadialGradient === 'function')
          ? cachedRadialGradient('pud' + pr.x + ',' + pr.y, pr.x, pr.y, 4, gr,
              [[0, 'rgba(187, 247, 208, 0.85)'], [0.6, 'rgba(74, 222, 128, 0.55)'], [1, 'rgba(21, 128, 61, 0)']])
          : 'rgba(74, 222, 128, 0.5)';
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
      } else if (typeof drawMapPropExtra === 'function' && drawMapPropExtra(pr)) {
        // handled by engine_props.js (16 types the old chain dropped silently)
      }
    }
  }

  // 8. Hazard Zones
  for (const h of HZ) {
    X.fillStyle = mapDef.hazard || 'rgba(239,68,68,0.35)';
    X.beginPath(); X.arc(h.x, h.y, h.r, 0, 6.28); X.fill();
    X.strokeStyle = 'rgba(0,0,0,0.4)'; X.lineWidth = 2.5; X.stroke();
  }

  // 8b. Ambient weather (rain, snow, dust, spores, embers) behind the actors
  if (typeof renderAmbient === 'function') renderAmbient(cx, cy, W, H);

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

  // 11. Turrets are painted inside the depth-sorted entity band (drawEntityBand).

  // 11b. Spitter Acid Puddles Pass (damaging & shrinking)
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

  // 11c. AoE Debris & Turret Destruction Debris
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

    if (b.wi === 18) {
      const ba = Math.atan2(b.vy, b.vx);
      X.save(); X.translate(b.x, b.y); X.rotate(ba);
      X.strokeStyle = 'rgba(226,232,240,0.25)'; X.lineWidth = 4; X.beginPath(); X.moveTo(-34, 0); X.lineTo(-6, 0); X.stroke();
      X.strokeStyle = '#cbd5e1'; X.lineWidth = 2; X.beginPath(); X.moveTo(-18, 0); X.lineTo(6, 0); X.stroke();
      X.fillStyle = '#f8fafc'; X.beginPath(); X.moveTo(10, 0); X.lineTo(3, -3); X.lineTo(3, 3); X.closePath(); X.fill();
      X.fillStyle = '#ef4444'; X.fillRect(-19, -2.5, 4, 1.5); X.fillRect(-19, 1, 4, 1.5);
      X.restore();
      continue;
    }
    if (b.wi === 20) {
      const ba = Math.atan2(b.vy, b.vx);
      X.save(); X.translate(b.x, b.y); X.rotate(ba);
      X.fillStyle = 'rgba(155,231,255,0.35)'; X.beginPath(); X.moveTo(-14, 0); X.lineTo(-2, -3); X.lineTo(-2, 3); X.closePath(); X.fill();
      X.fillStyle = '#e0f2fe'; X.beginPath(); X.moveTo(7, 0); X.lineTo(-3, -3); X.lineTo(-1, 0); X.lineTo(-3, 3); X.closePath(); X.fill();
      X.restore();
      continue;
    }
    if (b.wi === 21) {
      const ba = Math.atan2(b.vy, b.vx), fl2 = 0.6 + Math.random() * 0.4;
      X.save(); X.translate(b.x, b.y); X.rotate(ba);
      X.fillStyle = 'rgba(255,170,60,' + (0.55 * fl2) + ')'; X.beginPath(); X.moveTo(-3, 0); X.lineTo(-16 * fl2 - 6, -3); X.lineTo(-16 * fl2 - 6, 3); X.closePath(); X.fill();
      X.fillStyle = '#d4d4d8'; X.fillRect(-4, -2, 9, 4);
      X.fillStyle = '#f97316'; X.beginPath(); X.moveTo(5, -2); X.lineTo(9, 0); X.lineTo(5, 2); X.closePath(); X.fill();
      X.restore();
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

    // Weight-scaled tracer: heavy rounds get a bloomed halo, a fat body and a
    // smoke ribbon; light rounds stay a thin two-pass streak.
    if (typeof drawBulletDefault === 'function') { drawBulletDefault(b); continue; }
    const trailLen = b.isCrit ? 0.05 : 0.035;
    const tx = b.x - b.vx * trailLen, ty = b.y - b.vy * trailLen;
    X.save();
    X.lineCap = 'round';
    X.strokeStyle = b.c || '#ffd86b';
    X.globalAlpha = 0.5;
    X.lineWidth = b.isCrit ? 5 : 3;
    X.beginPath(); X.moveTo(tx, ty); X.lineTo(b.x, b.y); X.stroke();
    X.globalAlpha = 1;
    X.strokeStyle = '#ffffff';
    X.lineWidth = b.isCrit ? 2.6 : 1.7;
    X.beginPath(); X.moveTo(b.x - b.vx * trailLen * 0.42, b.y - b.vy * trailLen * 0.42); X.lineTo(b.x, b.y); X.stroke();
    X.restore();
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

  // 13b. Skill VFX are ground-anchored (dash trails, nova scorch, grenade
  //      arcs, rage aura) so they sit beneath entities and above the decals.
  if (typeof renderSkillFX === 'function') renderSkillFX(cx, cy, W, H);
  // Ground-anchored passive auras and meteor telegraphs.
  if (typeof renderPassivesGround === 'function') renderPassivesGround(cx, cy, W, H);
  // Ground-anchored power-up auras: the OVERCHARGE collar, the MAGNET field
  // rings, the CRYO frost ring and the ADRENALINE smear. OVERCHARGE and MAGNET
  // previously changed only numbers and never showed on screen at all.
  if (typeof renderPowerupAuras === 'function') renderPowerupAuras(cx, cy, W, H);
  if (typeof renderPuPixel === 'function') renderPuPixel();

  // 14. Telegraphed attacks are ground markers, drawn beneath every entity
  for (const z of Z) { if (typeof drawTelegraph === "function") drawTelegraph(z); }

  // 14b. Depth-sorted entity band: turrets, zombies and the player are painted
  //      back-to-front by their foot position so overlaps read correctly.
  if (typeof drawEntityBand === "function") drawEntityBand();

  // 14c. Particle pass - impact sparks, blood, muzzle smoke and debris. F was
  //      simulated every frame in update() but never actually rendered.
  if (typeof renderParticles === 'function') renderParticles(cx, cy, W, H);

  // 14d. Electric arcs (chain lightning) ride on top of the entity band.
  if (typeof renderArcs === 'function') renderArcs();

  // 14e. Summoned weapons (spectral blades, nano drones), arcane missiles,
  //      soul-blast rings and venom haze ride above the entity band.
  if (typeof renderPassives === 'function') renderPassives(cx, cy, W, H);

  // 16. Floating texts
  if (typeof renderFloatingTextsPass === 'function') {
    renderFloatingTextsPass();
  }

  X.restore();

  // 17. Depth post-process: light mask, additive lights, bloom and colour grade
  if (typeof renderLightingPass === "function") renderLightingPass(CX, CY, W, H);

  // 17b. Atmospheric edge fog: distance haze that softens the arena rectangle
  //      and pushes the centre of action forward. Cosmetic only.
  if (typeof renderDepthFog === 'function') renderDepthFog(CX, CY, W, H);

  // 18. HUD OVERLAY
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
      X.fillStyle = d.k === 'h' ? '#ef4444' : (d.k === 'a' ? '#38bdf8' : (d.k === 'pu' ? '#c084fc' : (d.k === 'r' ? '#be8cff' : '#ffd36b')));
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

  // Wave readout + sector ascension badge + live ghost-pace chip
  X.fillStyle = '#e8e4cf'; X.font = '900 13px Impact,Arial Black,sans-serif'; X.textAlign = 'left';
  X.fillText('WAVE ' + (S ? S.wave : 1), rx + 36, ry - 8);
  if (S && S.ascTier > 0) {
    X.fillStyle = '#c084fc'; X.font = '900 9.5px Arial';
    X.fillText('ASC ' + S.ascTier + '  BOUNTY x' + (S.ascMul || 1).toFixed(2), rx + 36 + X.measureText('WAVE ' + S.wave).width + 8, ry - 8);
  }
  const gdNow = (typeof ghostDelta === 'function') ? ghostDelta() : null;
  if (gdNow != null && Math.abs(gdNow) >= 0.5) {
    X.fillStyle = gdNow < 0 ? '#4ade80' : '#fb923c'; X.font = '900 9.5px Arial';
    X.fillText((gdNow < 0 ? 'GHOST -' : 'GHOST +') + Math.abs(gdNow) + 's', rx + 36 + X.measureText('WAVE ' + (S ? S.wave : 1)).width + 8, ry + 4);
  }

  // Damage-chip health bar (yellow chip drains after the red bar)
  {
    const hpw = 122, hpx = rx + 36, hpy = ry + 8, hph = 7;
    const hpf = Math.max(0, Math.min(1, P.hp / P.mx));
    const chipf = Math.max(hpf, Math.min(1, (S && S.hpChip != null ? S.hpChip : P.hp) / P.mx));
    X.fillStyle = 'rgba(6,9,6,0.82)';
    X.beginPath(); X.roundRect(hpx - 2, hpy - 2, hpw + 4, hph + 4, 3); X.fill();
    X.fillStyle = '#241412';
    X.beginPath(); X.roundRect(hpx, hpy, hpw, hph, 2); X.fill();
    if (chipf > hpf) {
      X.fillStyle = '#ffd36b';
      X.beginPath(); X.roundRect(hpx + hpw * hpf, hpy, hpw * (chipf - hpf), hph, 2); X.fill();
    }
    const hpCol = hpf > 0.6 ? '#8fae4a' : (hpf > 0.3 ? '#e0b83a' : '#d9453a');
    X.fillStyle = hpCol;
    X.beginPath(); X.roundRect(hpx, hpy, Math.max(1, hpw * hpf), hph, 2); X.fill();
    X.strokeStyle = 'rgba(255,255,255,0.14)'; X.lineWidth = 1;
    X.beginPath(); X.roundRect(hpx, hpy, hpw, hph, 2); X.stroke();
    X.fillStyle = '#e8e4cf'; X.font = 'bold 9.5px Arial'; X.textAlign = 'left';
    X.fillText('HP ' + Math.max(0, Math.round(P.hp)) + '/' + P.mx, hpx, hpy + hph + 11);
    if (S && S.ar != null && S.ar < 0.999) {
      X.fillStyle = '#94a3b8';
      X.fillText('-ARMOR ' + Math.round((1 - S.ar) * 100) + '%', hpx + 74, hpy + hph + 11);
    }
    // Shield charges, if any
    if (S && S.bc > 0) {
      X.fillStyle = '#eab308'; X.font = '900 9.5px Arial';
      X.fillText('SHIELD x' + S.bc, hpx, hpy + hph + 22);
    }
  }

  // Active Powerups HUD with Circular Timer Rings & 3-Second Blink
  const activePowerups = [];
  if (S && typeof PU_DEFS !== 'undefined') {
    for (const id in PU_DEFS) {
      const pd = PU_DEFS[id];
      if (pd.key && S[pd.key] > 0) activePowerups.push({ id, name: pd.tag, col: pd.col, time: S[pd.key], maxTime: pd.dur });
    }
  }

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

    // Shared vector glyph - the same art the collectable uses on the ground.
    if (typeof puGlyph === 'function') {
      puGlyph(pu.id, px, py, 0.82, pu.col);
    } else {
      X.fillStyle = pu.col;
      X.font = '900 8px Impact'; X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText(pu.name.slice(0, 2), px, py + 0.5);
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

  // Cash, horde count and the live wave modifiers on one readable plate
  {
    const ty0 = 6;
    const tw = 136, tx0 = W - 50 - tw;
    X.fillStyle = 'rgba(8,11,8,0.72)';
    X.beginPath(); X.roundRect(tx0, ty0, tw, 40, 6); X.fill();
    X.strokeStyle = 'rgba(255,255,255,0.10)'; X.lineWidth = 1;
    X.beginPath(); X.roundRect(tx0, ty0, tw, 40, 6); X.stroke();
    X.textAlign = 'right';
    X.font = 'bold 15px Arial'; X.fillStyle = '#ffd36b';
    X.fillText('$' + (S ? S.cash : 0), W - 56, 23);
    X.font = 'bold 10.5px Arial'; X.fillStyle = '#e8e4cf';
    X.fillText('HORDE ' + (Z.length + (S ? S.q.length : 0)), W - 56, 38);
    if (S && S.wmList && S.wmList.length) {
      X.textAlign = 'left'; X.font = '900 8.5px Arial';
      let mx = tx0 + 8;
      for (const m of S.wmList) {
        X.fillStyle = m.col;
        X.fillText(m.name, mx, 22);
        mx += X.measureText(m.name).width + 6;
      }
    }
    X.textAlign = 'right';
  }

  // Combo multiplier
  if (typeof renderDirectorOverlay === 'function') renderDirectorOverlay(W, H);

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

  // Boss health bar (top centre) while a boss is alive
  const boss = Z.find(z => z.t === 'boss' && !z.dead);
  if (boss) {
    const bw = Math.min(420, W - 130), bx = W / 2 - bw / 2, by = 52;
    const pctB = Math.max(0, Math.min(1, boss.hp / (boss.mh || 1)));
    X.textBaseline = 'alphabetic';
    X.fillStyle = 'rgba(10,12,8,0.78)';
    X.beginPath(); X.roundRect(bx - 5, by - 5, bw + 10, 24, 6); X.fill();
    X.strokeStyle = '#ef4444'; X.lineWidth = 1.5; X.stroke();
    X.fillStyle = '#2a1010';
    X.beginPath(); X.roundRect(bx, by, bw, 14, 4); X.fill();
    const bg = X.createLinearGradient(bx, 0, bx + bw, 0);
    bg.addColorStop(0, '#ef4444'); bg.addColorStop(1, '#ff9a3a');
    X.fillStyle = bg;
    X.beginPath(); X.roundRect(bx, by, Math.max(2, bw * pctB), 14, 4); X.fill();
    X.fillStyle = '#f0ece1'; X.font = '900 11px Impact,Arial Black,sans-serif'; X.textAlign = 'center';
    X.fillText((typeof BN !== 'undefined' && BN[boss.bv % 4] ? BN[boss.bv % 4] : 'BOSS') + '   ' + Math.max(0, Math.round(boss.hp)) + ' / ' + Math.round(boss.mh), W / 2, by + 11);
  }

  // Acquired perk tray (build readout) — top-right under the cash counter
  if (S && S.pk) {
    const names = Object.keys(S.pk).filter(k => S.pk[k] > 0);
    if (names.length) {
      const bw2 = 16, gap = 2, shown = names.slice(0, 16);
      let sx0 = W - 50 - shown.length * (bw2 + gap);
      const ty = 58;
      X.textAlign = 'left'; X.textBaseline = 'middle';
      shown.forEach((name, i) => {
        const pdef = PKS.find(p => p[0] === name) || PKS.find(p => p[0] === '\u2726 ' + name) || [];
        const col = pdef[4] || '#8fae4a';
        const x = sx0 + i * (bw2 + gap);
        X.fillStyle = 'rgba(10,12,8,0.72)';
        X.beginPath(); X.roundRect(x, ty - 8, bw2, bw2, 4); X.fill();
        X.strokeStyle = col; X.lineWidth = 1.4; X.stroke();
        X.fillStyle = col;
        X.beginPath(); X.arc(x + 8, ty - 1.5, 3.2, 0, 6.28); X.fill();
        if (S.pk[name] > 1) {
          X.fillStyle = '#fff'; X.font = '900 8px Arial';
          X.fillText(String(S.pk[name]), x + 9.5, ty + 6);
        }
      });
      X.textBaseline = 'alphabetic';
    }
  }

  // Acquired boons from this run's draft picks
  if (S && typeof boonHudLine === 'function') {
    const bl = boonHudLine();
    if (bl) {
      X.textAlign = 'right'; X.textBaseline = 'alphabetic';
      X.fillStyle = '#8fae4a'; X.font = '900 9px Arial';
      X.fillText(bl, W - 50, 80);
    }
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
      if (S && S.bt > 0) S.bt -= dt;
      const scale = (typeof directorTimeScale === 'function' ? directorTimeScale() : 1);
      // Fixed-step sub-stepping: keeps enemy speed and bullet travel frame-rate
      // independent and prevents fast projectiles from skipping thin walls on
      // frames that overrun the budget.
      const MAX_STEP = 1 / 45;
      let remaining = dt * scale;
      let steps = 0;
      while (remaining > 1e-4 && steps < 6 && run) {
        const step = Math.min(MAX_STEP, remaining);
        update(step);
        remaining -= step;
        steps++;
      }
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
  if (typeof clearGoreDecals === 'function') clearGoreDecals();
  // NOTE: credits are settled once at run end (death/quit) so unspent cash banks 1:1.
  // Banking here would settle only the wave-1 balance and lose later earnings.
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

  // Retention hooks: ghost pace, the per-wave boon draft and a rotating supply deal
  if (typeof recordWavePace === 'function') recordWavePace();
  if (typeof rollBoonOffer === 'function') rollBoonOffer();
  const gd = (typeof ghostDelta === 'function') ? ghostDelta() : null;
  if (gd != null && Math.abs(gd) >= 1.5 && typeof announce === 'function') {
    announce(gd < 0 ? 'AHEAD OF GHOST' : 'BEHIND GHOST', gd < 0 ? '#4ade80' : '#f97316',
      (gd < 0 ? '-' : '+') + Math.abs(gd) + 's vs your best run');
  }
  rebuild();
  const shopov = document.getElementById('shopov');
  if (shopov) shopov.classList.add('on');
}

function rebuild() {
  const cashEl = document.getElementById('cash');
  if (cashEl) {
    let line = 'Cash: $' + S.cash;
    if (S.wm) line += '   •   ' + S.wm.name;
    if (S.flawless > 1) line += '   •   FLAWLESS x' + S.flawless;
    if (S.cmbMax >= 10) line += '   •   BEST COMBO x' + S.cmbMax;
    if (S.ascMul && S.ascMul > 1) line += '   •   BOUNTY x' + S.ascMul.toFixed(2);
    const st = (typeof SV !== 'undefined' && SV && SV.runStreak) || 0;
    if (st > 1) line += '   •   STREAK x' + st;
    cashEl.textContent = line;
  }

  if (typeof renderBoonBar === 'function') renderBoonBar();

  const s = document.getElementById('shop');
  if (!s) return;
  s.innerHTML = '';

  const isLS = (S && S.isEvent && S.evDef && S.evDef.id === 'last_stand');
  const entries = [];

  WEAP.forEach((w, i) => {
    if (S && S.isEvent && S.evDef && S.evDef.heavyOnly && ![4, 9, 12, 14, 17].includes(i)) return;
    if (P.w[i]) {
      entries.push({
        id: 'eq' + i, cost: 0, eq: P.cur === i,
        label: P.cur === i ? w.n + ' (equipped)' : 'Equip ' + w.n,
        fn: () => {
          if (P.cur !== i) {
            if (P.weapAmmo) P.weapAmmo[P.cur] = P.ammo;
            P.cur = i;
            P.reloading = false;
            P.maxAmmo = w.mag || 12;
            P.ammo = (P.weapAmmo && P.weapAmmo[i] != null) ? P.weapAmmo[i] : P.maxAmmo;
          }
        }
      });
    }
  });

  entries.push({ id: 'heal', cost: 100, label: isLS ? 'Field Repair (30%)' : 'Heal full',
    fn: () => { P.hp = isLS ? Math.min(P.mx, P.hp + Math.round(P.mx * 0.3)) : P.mx; } });
  entries.push({ id: 'gren', cost: 150, label: 'Grenades +5', fn: () => S.gr += 5 });
  entries.push({ id: 'turret', cost: 250, label: 'Deploy Turret', fn: () => { TR.push({ x: P.x, y: P.y, l: 35, cd: 0 }); burst(P.x, P.y, '#ffd36b', 10); } });
  entries.push({ id: 'reload', cost: 280, label: 'Fast Reload Stim (-25% RL)', fn: () => { S.fastReload = 1; burst(P.x, P.y, '#ffd36b', 12); } });
  entries.push({ id: 'shield', cost: 220, label: 'Shield Battery', fn: () => { S.bl = (S.bl || 0) + 1; S.bc = (S.bc || 0) + 1; burst(P.x, P.y, '#be8cff', 12); } });
  entries.push({ id: 'hp', cost: 200, label: '+25 max health', fn: () => { P.mx += 25; P.hp += 25; } });
  entries.push({ id: 'speed', cost: 300, label: 'Speed Stim (+20%)', fn: () => { S.ms = (S.ms || 1) * 1.2; burst(P.x, P.y, '#5ac8e8', 12); } });
  entries.push({ id: 'damage', cost: 400, label: '+15% damage', fn: () => S.dm = (S.dm || 1) * 1.15 });
  entries.push({ id: 'power', cost: 350, label: 'Random power', fn: () => S.pend++ });

  // Rotating supply deal: one randomly discounted purchase per wave.
  const buyable = entries.filter(e => e.cost > 0);
  if (!S.deal || S.deal.wave !== S.wave) {
    const pick = buyable[Math.floor(Math.random() * buyable.length)];
    S.deal = pick ? { wave: S.wave, id: pick.id, mult: 0.6 } : null;
  }

  for (const e of entries) {
    const deal = (S.deal && S.deal.id === e.id) ? S.deal : null;
    const cost = deal ? Math.round(e.cost * deal.mult) : e.cost;
    const b = document.createElement('button');
    b.textContent = e.cost > 0 ? (e.label + ' $' + cost) : e.label;
    if (e.eq) b.className = 'eq';
    if (deal) {
      b.style.borderColor = '#e0b83a';
      b.style.background = 'rgba(224,184,58,.14)';
      b.textContent = '★ ' + e.label + ' $' + cost + ' (was $' + e.cost + ')';
    }
    b.disabled = cost > S.cash;
    b.onclick = () => { S.cash -= cost; e.fn(); if (S.deal && S.deal.id === e.id) S.deal = null; rebuild(); };
    s.appendChild(b);
  }
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


// 15. Player Rendering (called from the depth-sorted entity band)
function drawPlayerEntity() {
  if (!P) return;
  // Grounded contact shadow, offset along the light direction
  if (typeof contactShadow === 'function') contactShadow(P.x, P.y + 6, 15, 0);
  X.save();
  X.translate(P.x, P.y);
  X.rotate(P.a);

  // Muzzle flash front lighting
  const flashGlow = (typeof muzzleGlowGradient === 'function') ? muzzleGlowGradient() : null;
  if (flashGlow) X.fillStyle = flashGlow;
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
  const bvx = P.vx || 0, bvy = P.vy || 0;
  const breathe = (bvx * bvx + bvy * bvy < 225) ? Math.sin((S.t || 0) * 3) * 0.8 : 0;
  X.translate(0, breathe);

  // Layer 1-3 Player body
  if (typeof bodyBack === 'function') bodyBack();

  // Extra rig detail: legs, belt pouches, holster, shoulder knife, headlamp
  if (typeof drawPlayerGear === 'function') drawPlayerGear();

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