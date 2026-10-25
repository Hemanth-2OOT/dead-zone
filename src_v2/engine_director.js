// DEAD ZONE v2.6 - DIRECTOR: POWER-UPS, COMBO, LAST STAND, WAVE MODIFIERS, ZOMBIE STEERING, META HOOKS
// Loaded after engine_world.js. Everything here is called through guarded hooks in the world engine.

/* ------------------------------------------------------------------ */
/* POWER-UPS                                                          */
/* ------------------------------------------------------------------ */
const PU_DEFS = {
  dd: { name: 'OVERCHARGE', tag: '2X DMG',     col: '#ef4444', dur: 14, w: 22, key: 'dd'   },
  fz: { name: 'CRYO FIELD', tag: 'FREEZE',     col: '#38bdf8', dur: 7,  w: 13, key: 'fz'   },
  sh: { name: 'AEGIS',      tag: 'SHIELD',     col: '#eab308', dur: 8,  w: 15, key: 'sh2'  },
  mg: { name: 'MAGNET',     tag: 'MAGNET',     col: '#a855f7', dur: 14, w: 18, key: 'mgTime' },
  ad: { name: 'ADRENALINE', tag: 'ADRENALINE', col: '#22d3ee', dur: 10, w: 16, key: 'adr'  },
  nk: { name: 'SHOCKWAVE',  tag: 'BLAST',      col: '#fb923c', dur: 0,  w: 9,  key: null   }
};

function puActive(id) {
  const d = PU_DEFS[id];
  return !!(S && d && d.key && S[d.key] > 0);
}

function pickPowerupId() {
  let total = 0;
  const ws = {};
  for (const id in PU_DEFS) {
    // Active power-ups are less likely to be offered again so players see variety
    ws[id] = PU_DEFS[id].w * (puActive(id) ? 0.3 : 1);
    total += ws[id];
  }
  let r = Math.random() * total;
  for (const id in ws) { r -= ws[id]; if (r <= 0) return id; }
  return 'dd';
}

function spawnPowerup(x, y, id, life) {
  id = id || pickPowerupId();
  if (typeof spawnDrop !== 'function') return null;
  spawnDrop(x, y, 'pu', id);
  const d = D[D.length - 1];
  if (d && d.k === 'pu') {
    d.l = life || 16; d.maxL = d.l;
    d.vx *= 0.4; d.vy *= 0.4;
  }
  return d;
}

function applyPowerup(id) {
  const def = PU_DEFS[id];
  if (!def || !S || !P) return;
  if (def.key) S[def.key] = def.dur;
  if (id === 'nk') nukeBlast();
  if (id === 'mg') {
    // Instantly vacuum everything lying around
    for (const d of D) if (d.k !== 'pu') { d.mgPull = 1; }
  }
  if (id === 'fz') {
    for (const z of Z) if (!z.dead) z.fz = Math.max(z.fz || 0, 2.5);
  }
  announce(def.name, def.col, def.tag + (def.dur ? ' • ' + def.dur + 's' : ''));
  // Each power-up detonates in its own shape: a reticle for OVERCHARGE, shard
  // spokes for CRYO, a hex burst for AEGIS, an inward then outward pulse for
  // MAGNET, upward forks for ADRENALINE and stacked blast rings for SHOCKWAVE.
  // These used to be the same two rings and the same burst for all six.
  if (typeof powerupPickupFX === 'function') powerupPickupFX(id, P.x, P.y);
  else { RG.push({ x: P.x, y: P.y, r: 8, l: 0.6, v: 520, c: hexToRgbStr(def.col) }); burst(P.x, P.y, def.col, 26, 3.5, 150, 1); }
  if (typeof snd === 'function') {
    const base = id === 'nk' ? 300 : id === 'fz' ? 700 : id === 'sh' ? 420 : id === 'mg' ? 600 : id === 'ad' ? 880 : 520;
    snd(base, 0.12, 'triangle', 0.09, 1.3);
    setTimeout(() => snd(base * 1.5, 0.14, 'triangle', 0.08, 1.2), 70);
    setTimeout(() => snd(base * 2, 0.2, 'sine', 0.07, 1.1), 150);
  }
  if (S) S.puCount = (S.puCount || 0) + 1;
}

function hexToRgbStr(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

function nukeBlast() {
  S.nukeFlash = 0.35;
  SH = Math.max(SH, 20);
  RG.push({ x: P.x, y: P.y, r: 10, l: 0.9, v: 1100, c: '251,146,60' });
  RG.push({ x: P.x, y: P.y, r: 6, l: 0.7, v: 800, c: '255,255,255' });
  if (typeof noise === 'function') noise(0.5, 0.16);
  for (const z of Z) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - P.x, z.y - P.y);
    if (d > 560) continue;
    const falloff = 1 - d / 700;
    const dmg = z.t === 'boss' ? z.mh * 0.12 : 420 * (S.dm || 1) * falloff + 60;
    damageZ(z, dmg, 'nuke', true);
    const a = Math.atan2(z.y - P.y, z.x - P.x);
    z.kx = (z.kx || 0) + Math.cos(a) * 260 * (ZT[z.t] ? ZT[z.t].kb : 1);
    z.ky = (z.ky || 0) + Math.sin(a) * 260 * (ZT[z.t] ? ZT[z.t].kb : 1);
  }
}

/* ------------------------------------------------------------------ */
/* COMBO                                                              */
/* ------------------------------------------------------------------ */
const COMBO_TIERS = [
  { at: 10,  name: 'KILLING SPREE', col: '#ffd36b', bonus: 25 },
  { at: 25,  name: 'RAMPAGE',       col: '#fb923c', bonus: 70 },
  { at: 50,  name: 'UNSTOPPABLE',   col: '#f43f5e', bonus: 160 },
  { at: 100, name: 'GODLIKE',       col: '#c084fc', bonus: 400 }
];

function comboCashMult() {
  return 1 + Math.min(0.75, ((S && S.cmb) || 0) * 0.01);
}
function comboWindow() {
  return Math.max(1.4, 3.0 - ((S && S.cmb) || 0) * 0.012);
}

function directorOnKill(z) {
  if (!S) return;
  S.cmb = (S.cmb || 0) + 1;
  S.cmbMax = Math.max(S.cmbMax || 0, S.cmb);
  S.cmt = comboWindow();
  S.cmbKick = 1;

  for (const t of COMBO_TIERS) {
    if (S.cmb === t.at) {
      announce(t.name, t.col, 'COMBO x' + t.at + '  +$' + t.bonus);
      S.cash += t.bonus;
      RG.push({ x: P.x, y: P.y, r: 6, l: 0.5, v: 420, c: hexToRgbStr(t.col) });
      if (typeof snd === 'function') { snd(440 + t.at * 3, 0.16, 'square', 0.07, 1.5); }
    }
  }

  // Power-up drops: base chance + pity timer + elite/boss bonuses
  S.puPity = (S.puPity || 0) + 1;
  let chance = 0.02 + Math.min(0.12, S.puPity * 0.0015);
  if (z.el) chance += 0.35;
  if (z.t === 'boss') chance = 1;
  if (Math.random() < chance) {
    S.puPity = 0;
    spawnPowerup(z.x, z.y);
    if (z.t === 'boss') spawnPowerup(z.x + 30, z.y + 10);
  } else if (Math.random() < 0.025 + (S.lk || 0) * 0.01) {
    spawnDrop(z.x - 12, z.y, 'a', 1); // ammo cache
  }
}

function comboBank() {
  if (S.cmb >= 8) {
    const bonus = Math.round(S.cmb * 3 * (1 + S.wave * 0.08));
    S.cash += bonus;
    if (typeof txt === 'function') txt(P.x, P.y - 34, 'COMBO x' + S.cmb + '  +$' + bonus, '#ffd36b', true);
  }
  S.cmb = 0;
}

/* ------------------------------------------------------------------ */
/* LAST STAND (one per run)                                           */
/* ------------------------------------------------------------------ */
function triggerLastStand() {
  S.lsUsed = 1;
  P.hp = Math.max(1, P.mx * 0.35);
  S.sh2 = Math.max(S.sh2 || 0, 3.5);
  S.bt = 2.0; // bullet-time (real seconds)
  S.nukeFlash = 0.18;
  SH = Math.max(SH, 18);
  for (const z of Z) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - P.x, z.y - P.y);
    if (d < 360) {
      const a = Math.atan2(z.y - P.y, z.x - P.x);
      z.kx = (z.kx || 0) + Math.cos(a) * 340;
      z.ky = (z.ky || 0) + Math.sin(a) * 340;
      damageZ(z, 90 * (S.dm || 1), 'laststand', false);
    }
  }
  RG.push({ x: P.x, y: P.y, r: 10, l: 0.8, v: 900, c: '255,90,58' });
  RG.push({ x: P.x, y: P.y, r: 4, l: 0.6, v: 500, c: '255,255,255' });
  burst(P.x, P.y, '#ff5a3a', 36, 4, 170, 1);
  announce('LAST STAND', '#ff5a3a', 'YOU REFUSE TO DIE');
  if (typeof snd === 'function') {
    snd(90, 0.5, 'sine', 0.14, 0.6);
    setTimeout(() => snd(70, 0.4, 'sine', 0.12, 0.6), 220);
  }
}

/* ------------------------------------------------------------------ */
/* WAVE MODIFIERS & SUPPLY DROPS                                      */
/* ------------------------------------------------------------------ */
const WAVE_MODS = [
  { id: 'rush',   name: 'RUSH',     min: 2, col: '#facc15', desc: 'FAST MOVERS - KEEP MOVING',    spMul: 0.7,  cash: 1.2 },
  { id: 'iron',   name: 'IRON',     min: 4, col: '#94a3b8', desc: 'ARMORED - FOCUS FIRE',         spMul: 1.15, cash: 1.25 },
  { id: 'toxic',  name: 'TOXIC',    min: 3, col: '#4ade80', desc: 'SPITTERS & BLASTERS - SPREAD OUT', spMul: 1.0, cash: 1.2 },
  { id: 'shadow', name: 'BLACKOUT', min: 3, col: '#c084fc', desc: 'LIMITED VISIBILITY',           spMul: 0.9,  cash: 1.3, dark: 0.55 },
  { id: 'horde',  name: 'SWARM',    min: 2, col: '#fb7185', desc: 'CROWD CONTROL',                spMul: 0.6,  cash: 1.15 },
  { id: 'blitz',  name: 'BLITZ',    min: 5, col: '#f472b6', desc: 'OVERRUN - THIN THE HORDE FAST', spMul: 0.5,  cash: 1.35 },
  { id: 'elite',  name: 'ELITE HUNT', min: 6, col: '#facc15', desc: 'ELITE PACK - HIGH VALUE TARGETS', spMul: 1.05, cash: 1.6 }
];

function applyWaveModifier() {
  S.wm = null; S.wm2 = null; S.wmList = []; S.dark = 0; S.spMul = 1; S.wmCash = 1; S.eliteBoost = 0;
  S.hitWave = false;
  const w = S.wave;
  const isBoss = w % 5 === 0;
  const allowBoss = w >= 15; // boss waves carry a modifier from wave 15 onwards
  const q = S.q;
  const conv = (from, to, pct) => { for (let i = 0; i < q.length; i++) if (from.includes(q[i]) && Math.random() < pct) q[i] = to(); };

  const applyOne = m => {
    S.wmList.push(m);
    S.spMul *= (m.spMul || 1);
    S.wmCash *= (m.cash || 1);
    if (m.dark) S.dark = Math.max(S.dark, m.dark);
    if (m.id === 'rush') conv(['walk'], () => 'run', 0.6);
    else if (m.id === 'iron') conv(['walk', 'run'], () => (Math.random() < 0.5 ? 'tank' : 'charger'), 0.22);
    else if (m.id === 'toxic') conv(['walk', 'run'], () => (Math.random() < 0.55 ? 'spit' : 'exp'), 0.4);
    else if (m.id === 'shadow') conv(['walk', 'run'], () => 'stalker', 0.32);
    else if (m.id === 'horde') {
      const extra = Math.round(q.length * 0.5);
      for (let i = 0; i < extra; i++) q.push(Math.random() < 0.7 ? 'walk' : 'run');
    }
    else if (m.id === 'blitz') {
      const extra = Math.round(q.length * 0.8);
      for (let i = 0; i < extra; i++) q.push(Math.random() < 0.6 ? 'run' : 'walk');
    }
    else if (m.id === 'elite') {
      S.eliteBoost += 0.5;
      conv(['walk', 'run'], () => (Math.random() < 0.5 ? 'charger' : 'tank'), 0.35);
    }
  };

  const rollMod = exclude => {
    const pool = WAVE_MODS.filter(m => m.min <= w && exclude.indexOf(m.id) < 0);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const chance = (typeof waveModChance === 'function') ? waveModChance() : 0.55;
  if ((!isBoss || allowBoss) && w >= 2 && Math.random() < chance) {
    const m = rollMod(S.lastWm ? [S.lastWm] : []);
    if (m) applyOne(m);
  }
  // Stacked modifiers from wave 10 for spiky, memorable waves.
  if (S.wmList.length === 1 && w >= 10 && Math.random() < 0.35) {
    const m2 = rollMod(S.wmList.map(x => x.id));
    if (m2) applyOne(m2);
  }

  S.wm = S.wmList[0] || null;
  S.wm2 = S.wmList[1] || null;
  if (S.wm) S.lastWm = S.wm.id;
  S.spMul = Math.min(2, S.spMul);
  S.eliteBoost = Math.min(0.8, S.eliteBoost);

  if (S.wmList.length) {
    announce('WAVE ' + w + ' - ' + S.wmList.map(m => m.name).join(' + '), S.wmList[0].col,
      S.wmList.map(m => m.desc).join('  |  ') + '  (+' + Math.round((S.wmCash - 1) * 100) + '% CASH)');
  } else if (isBoss) {
    announce('WAVE ' + w, '#ff5a3a', 'BOSS INBOUND');
  } else {
    announce('WAVE ' + w, '#e8e4cf', w === 1 ? 'SURVIVE THE OUTBREAK' : 'HOLD THE LINE');
  }

  // Supply drop beacon on even waves: a guaranteed power-up worth running for
  if (w >= 2 && w % 2 === 0 && P) {
    for (let attempt = 0; attempt < 14; attempt++) {
      const a = Math.random() * 6.28, d = 260 + Math.random() * 220;
      const x = Math.max(60, Math.min(WS - 60, P.x + Math.cos(a) * d));
      const y = Math.max(60, Math.min(WS - 60, P.y + Math.sin(a) * d));
      const inWall = O.some(o => x > o.x - 24 && x < o.x + o.w + 24 && y > o.y - 24 && y < o.y + o.h + 24);
      if (inWall && attempt < 13) continue;
      const dr = spawnPowerup(x, y, null, 26);
      if (dr) { dr.sup = 1; dr.vx = dr.vy = 0; }
      setTimeout(() => { if (S && run) announce('SUPPLY DROP', '#38bdf8', 'FOLLOW THE BEACON'); }, 1600);
      break;
    }
  }
}

function directorOnWaveClear() {
  if (!S) return;
  if (!S.hitWave) {
    S.flawless = (S.flawless || 0) + 1;
    S.flawlessBest = Math.max(S.flawlessBest || 0, S.flawless);
    const bonus = S.wave * 20 + S.flawless * 10;
    S.cash += bonus;
    announce('FLAWLESS WAVE', '#8fae4a', '+$' + bonus + (S.flawless > 1 ? '  •  STREAK x' + S.flawless : ''));
  } else {
    S.flawless = 0;
  }
  S.dark = 0;
}

/* ------------------------------------------------------------------ */
/* PER-FRAME DIRECTOR TICK (called from update)                       */
/* ------------------------------------------------------------------ */
function directorUpdate(dt) {
  if (!S) return;
  if (S.adr > 0) S.adr -= dt;
  if (S.cmb > 0) {
    S.cmt -= dt;
    if (S.cmbKick > 0) S.cmbKick = Math.max(0, S.cmbKick - dt * 5);
    if (S.cmt <= 0) comboBank();
  }
  if (typeof fxUpdate === 'function') fxUpdate(dt);
}

function directorTimeScale() {
  return (S && S.bt > 0) ? 0.35 : 1;
}

/* ------------------------------------------------------------------ */
/* ZOMBIE STEERING AROUND BUILDINGS                                   */
/* ------------------------------------------------------------------ */
function pointBlocked(x, y, pad) {
  for (let i = 0; i < O.length; i++) {
    const o = O[i];
    if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return true;
  }
  return false;
}

function findWaypoint(z, r) {
  const pad = r + 16;
  let best = null, bestCost = Infinity, blockers = 0;
  const minX = Math.min(z.x, P.x), maxX = Math.max(z.x, P.x);
  const minY = Math.min(z.y, P.y), maxY = Math.max(z.y, P.y);
  for (let i = 0; i < O.length && blockers < 3; i++) {
    const o = O[i];
    if (maxX < o.x || minX > o.x + o.w || maxY < o.y || minY > o.y + o.h) continue;
    if (!lineBox(z.x, z.y, P.x, P.y, o.x, o.y, o.w, o.h)) continue;
    blockers++;
    const cs = [
      [o.x - pad, o.y - pad], [o.x + o.w + pad, o.y - pad],
      [o.x - pad, o.y + o.h + pad], [o.x + o.w + pad, o.y + o.h + pad]
    ];
    for (const c of cs) {
      if (c[0] < 20 || c[1] < 20 || c[0] > WS - 20 || c[1] > WS - 20) continue;
      if (pointBlocked(c[0], c[1], r)) continue;
      if (Math.hypot(c[0] - z.x, c[1] - z.y) < 40) continue; // already standing on this corner
      if (!hasLOS(z.x, z.y, c[0], c[1])) continue;
      const cost = Math.hypot(c[0] - z.x, c[1] - z.y) + Math.hypot(P.x - c[0], P.y - c[1]);
      if (cost < bestCost) { bestCost = cost; best = { x: c[0], y: c[1] }; }
    }
  }
  return best;
}

function zombieHeading(z, dt, r) {
  const direct = Math.atan2(P.y - z.y, P.x - z.x);
  z.wpT = (z.wpT || 0) - dt;
  if (z.wpT <= 0) {
    z.wpT = 0.22 + Math.random() * 0.12;
    if (hasLOS(z.x, z.y, P.x, P.y)) {
      z.wp = null;
    } else if (!z.wp || Math.hypot(z.wp.x - z.x, z.wp.y - z.y) < 24 || !hasLOS(z.x, z.y, z.wp.x, z.wp.y)) {
      z.wp = findWaypoint(z, r);
    }
  }
  if (z.wp) return Math.atan2(z.wp.y - z.y, z.wp.x - z.x);
  if (z.wpT > 0 && !hasLOS(z.x, z.y, P.x, P.y)) {
    // No usable waypoint: wander sideways so we never pin against a wall
    return direct + Math.sin((z.age || 0) * 2 + (z.animOffset || 0)) * 0.9;
  }
  return direct;
}

/* ------------------------------------------------------------------ */
/* META HOOKS: death-screen nudges & lobby "next goal"                */
/* ------------------------------------------------------------------ */
function nextGoal() {
  if (typeof SV === 'undefined') return null;
  const goals = [];
  const lvl = SV.lvl || 1;
  for (let i = 0; i < MREQ.length; i++) {
    if (lvl < MREQ[i]) {
      goals.push({ label: 'UNLOCK ' + MP[i].n.toUpperCase(), cur: lvl, max: MREQ[i], unit: 'RANK', col: '#38bdf8' });
      break;
    }
  }
  let bestW = null;
  WEAP.forEach((w, i) => {
    if (SV.own && SV.own[i]) return;
    if (!bestW || w.c < bestW.c) bestW = { i, c: w.c, n: w.n };
  });
  if (bestW) goals.push({ label: 'BUY ' + bestW.n.toUpperCase(), cur: Math.min(SV.cr || 0, bestW.c), max: bestW.c, unit: 'CR', col: '#ffd36b' });
  if (!goals.length) return null;
  goals.sort((a, b) => (b.cur / b.max) - (a.cur / a.max));
  return goals[0];
}

function metaHooksHTML(prevBest) {
  if (!S) return '';
  const rows = [];
  if (S.wave > prevBest && S.wave > 1) {
    rows.push('<span style="color:#ffd36b;font-weight:900;letter-spacing:1px">★ NEW RECORD — WAVE ' + S.wave + '</span>');
  } else if (prevBest > S.wave && prevBest - S.wave <= 3) {
    const n = prevBest - S.wave;
    rows.push('<span style="color:#ff9a4a;font-weight:800">So close — only ' + n + ' wave' + (n > 1 ? 's' : '') + ' short of your record (W' + prevBest + ')</span>');
  }
  if (S.cmbMax >= 10) rows.push('Best combo: <b style="color:#ffd36b">x' + S.cmbMax + '</b>');
  if (S.flawlessBest >= 1) rows.push('Flawless waves: <b style="color:#8fae4a">' + S.flawlessBest + '</b>');
  if (S.puCount) rows.push('Power-ups used: <b style="color:#c084fc">' + S.puCount + '</b>');
  const g = nextGoal();
  if (g) {
    const pct = Math.round(100 * g.cur / g.max);
    rows.push('<div style="margin-top:4px;font-size:10.5px;letter-spacing:.8px;opacity:.9">NEXT GOAL: <b style="color:' + g.col + '">' + g.label + '</b> — ' + g.cur + '/' + g.max + ' ' + g.unit
      + '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + g.col + '"></div></div></div>');
  }
  return rows.length ? '<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.12);font-size:11.5px;line-height:1.7">' + rows.join('<br>') + '</div>' : '';
}
