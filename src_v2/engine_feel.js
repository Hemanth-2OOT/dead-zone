// DEAD ZONE v2.8 - WEAPON FEEL, IMPACT & SKILL VFX
// Everything in this file is presentation. It never mutates damage, cooldowns or
// reward values: it only makes what already happened legible to the player.

/* ------------------------------------------------------------------ */
/* BULLET ARCHETYPES                                                   */
/* ------------------------------------------------------------------ */
// Derived from WEAP so a new gun automatically inherits a sensible look.
function bulletArchetype(wi) {
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : (typeof WEAP !== 'undefined' ? WEAP[0] : null);
  if (!w) return 'tracer';
  if (w.flm) return 'flame';
  if (w.ex) return 'rocket';
  if (w.n === 'Railgun') return 'rail';
  if (w.n === 'Sniper' || w.n === 'Crossbow') return 'heavy';
  if (w.cl) return 'arc';
  if (w.fz) return 'cryo';
  if ((w.pr || 0) >= 2) return 'energy';
  if (w.p > 1) return 'pellet';
  if (w.d >= 60) return 'heavy';
  return 'tracer';
}

// Damage tier drives every feedback dial: 3 = "artillery", 1 = "peashooter".
function damageTier(dmg) {
  const d = Math.abs(Number(dmg) || 0);
  if (d >= 150) return 3;
  if (d >= 55) return 2;
  return 1;
}

function hexToRgbTriplet(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '255,220,140';
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

function bulletColourFor(wi, isCrit) {
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
  const skin = (typeof SV !== 'undefined' && SV && SV.eqSkin && typeof SKINS !== 'undefined' && SKINS[SV.eqSkin[wi]]) ? SKINS[SV.eqSkin[wi]] : null;
  if (isCrit) return '#fff3c4';
  if (skin && skin.col) return skin.col;
  if (typeof WC !== 'undefined' && WC[wi]) return WC[wi];
  return w ? '#ffd86b' : '#ffd86b';
}

/* ------------------------------------------------------------------ */
/* IMPACT FEEDBACK                                                     */
/* ------------------------------------------------------------------ */
// Called from the damage pipeline for every landed hit. Scaled by both the
// damage dealt and the weapon archetype so a railgun slug reads differently
// from an SMG tick even though both spawn one "hit".
function combatImpactFX(x, y, ang, dmg, isCrit, wi) {
  const tier = damageTier(dmg);
  const arch = bulletArchetype(wi);
  const col = bulletColourFor(wi, isCrit);
  const a = (typeof ang === 'number' && isFinite(ang)) ? ang : Math.random() * 6.28;

  // 1. Directional spark spray, opposite the travel vector.
  const sparks = isCrit ? 7 + tier * 3 : 3 + tier * 3;
  for (let i = 0; i < sparks; i++) {
    const sa = a + Math.PI + (Math.random() - 0.5) * (1.0 + tier * 0.25);
    const spd = 90 + Math.random() * (120 + tier * 130);
    F.push({
      x, y,
      vx: Math.cos(sa) * spd, vy: Math.sin(sa) * spd,
      l: 0.16 + Math.random() * 0.22,
      c: isCrit ? '#ffffff' : col,
      s: 1.6 + tier * 0.9,
      fr: 1
    });
  }

  // 2. Powder/dirt puff at the impact point (non-additive, reads as dust).
  if (tier >= 1) {
    const puffs = 2 + tier;
    for (let i = 0; i < puffs; i++) {
      const pa = a + Math.PI + (Math.random() - 0.5) * 1.6;
      F.push({
        x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5,
        vx: Math.cos(pa) * (30 + Math.random() * 55), vy: Math.sin(pa) * (30 + Math.random() * 55),
        l: 0.22 + Math.random() * 0.3,
        c: isCrit ? '#e8dcc0' : '#8d8574',
        s: 2.4 + tier * 1.3 + Math.random() * 1.6
      });
    }
  }

  // 3. Shockwave ring for heavy and critical impacts.
  if (typeof RG !== 'undefined' && (tier >= 2 || isCrit)) {
    const rgb = isCrit ? '255,240,200' : hexToRgbTriplet(col);
    RG.push({ x, y, r: 4 + tier * 2, l: 0.2 + tier * 0.06, v: 420 + tier * 220, c: rgb });
  }
  if (typeof RG !== 'undefined' && (tier >= 3 || (isCrit && tier >= 2))) {
    RG.push({ x, y, r: 2, l: 0.34, v: 260, c: '255,255,255' });
  }

  // 4. Archetype flavour on impact.
  if (arch === 'arc' || arch === 'energy') {
    for (let i = 0; i < 3; i++) {
      const na = Math.random() * 6.28;
      F.push({
        x, y,
        vx: Math.cos(na) * 160, vy: Math.sin(na) * 160,
        l: 0.12, c: '#bff4ff', s: 1.4, fr: 1
      });
    }
  } else if (arch === 'cryo') {
    for (let i = 0; i < 3; i++) {
      const na = Math.random() * 6.28;
      F.push({
        x, y, vx: Math.cos(na) * 70, vy: Math.sin(na) * 70,
        l: 0.3, c: '#d8f6ff', s: 2.2
      });
    }
  } else if (arch === 'rocket' && tier >= 3) {
    if (typeof RG !== 'undefined') RG.push({ x, y, r: 6, l: 0.4, v: 520, c: '255,170,60' });
  }

  // 5. Hit-stop + screen punch, sized to the hit. HIT_STOP_TIMER was declared
  //    and honoured by update() but nothing ever set it, so heavy shots had no
  //    weight at all.
  const heavy = tier === 3 || (tier === 2 && isCrit);
  const stop = tier === 3 ? (isCrit ? 0.055 : 0.04) : (isCrit ? 0.032 : 0.018);
  if (heavy && typeof HIT_STOP_TIMER !== 'undefined') {
    HIT_STOP_TIMER = Math.max(HIT_STOP_TIMER, stop);
  }
  if (typeof QUALITY_SETTINGS !== 'undefined' && QUALITY_SETTINGS.screenShake) {
    const punch = tier === 3 ? (isCrit ? 9 : 6.5) : tier === 2 ? (isCrit ? 5 : 3.4) : (isCrit ? 2.6 : 1.2);
    SH = Math.max(SH, punch);
  }
}

/* ------------------------------------------------------------------ */
/* DEFAULT BULLET RENDERING (used by the shared projectile loop)       */
/* ------------------------------------------------------------------ */
// Replaces the old fixed 3px trail that every non-bespoke weapon shared, so a
// 20 damage pistol round and a 340 damage railgun slug no longer look alike.
function drawBulletDefault(b) {
  const wi = (b.wi == null) ? 0 : b.wi;
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
  const arch = bulletArchetype(wi);
  const tier = damageTier(w ? w.d : (b.d || 10));
  const heavy = arch === 'heavy' || arch === 'rail' || tier >= 2;
  const hot = arch === 'energy' || arch === 'cryo' || arch === 'arc' || arch === 'rocket';
  const baseCol = b.c || bulletColourFor(wi, false);
  // A crit must be readable in flight, not just marginally fatter: it takes the
  // hot gold the impact pipeline already uses for critical hits.
  const col = b.isCrit ? '#fff3c4' : baseCol;
  const ang = Math.atan2(b.vy, b.vx);
  const ft = b.ft || 0;

  // Trail length scales with muzzle velocity AND weight. `spd` used to be
  // computed here and then ignored, so a 1050px/s railgun slug smeared exactly
  // as far as a 240px/s flamer puff.
  const spd = Math.hypot(b.vx, b.vy) || 700;
  const vk = Math.max(0.55, Math.min(1.35, spd / 700));
  const base = heavy ? 0.055 : (b.isCrit ? 0.042 : 0.030);
  // Trail time, not trail pixels. The old 0.13s ceiling multiplied by a 1.9
  // velocity factor smeared a 1050px/s slug across ~260px - longer than most
  // enemies are tall - which read as the bullet itself being stuck in the air.
  // Capping the time to 55ms and the velocity factor to 1.35 keeps the longest
  // tracer under ~80px while still scaling visibly with muzzle speed.
  const tlen = Math.min(0.055, base * (1 + tier * 0.12) * vk);
  // Muzzle bloom: a fresh round stretches for ~45ms before it settles, which
  // reads as the round being spat out of the barrel rather than teleporting.
  const bloom = 1 + 1.15 * Math.max(0, 1 - ft / 0.045);
  const tl = tlen * bloom;
  const tx = b.x - b.vx * tl, ty = b.y - b.vy * tl;

  X.save();
  X.lineCap = 'round';

  if (heavy || hot) {
    // Outer bloom halo, then the coloured body, then a hot white core.
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = heavy ? 0.32 : 0.22;
    X.strokeStyle = col;
    X.lineWidth = heavy ? 14 + tier * 4 : 9 + tier * 2;
    X.beginPath(); X.moveTo(tx, ty); X.lineTo(b.x, b.y); X.stroke();
    X.globalCompositeOperation = 'source-over';
  }

  X.globalAlpha = heavy ? 0.85 : 0.5;
  X.strokeStyle = col;
  X.lineWidth = heavy ? 6.5 + tier * 1.6 : (b.isCrit ? 5 : 3);
  X.beginPath(); X.moveTo(tx, ty); X.lineTo(b.x, b.y); X.stroke();

  X.globalAlpha = 1;
  X.strokeStyle = b.isCrit ? '#fffdf0' : '#ffffff';
  X.lineWidth = heavy ? 3.4 : (b.isCrit ? 2.6 : 1.7);
  X.beginPath();
  X.moveTo(b.x - b.vx * tl * 0.42, b.y - b.vy * tl * 0.42);
  X.lineTo(b.x, b.y);
  X.stroke();

  // Muzzle-to-impact energy sheath for the energy archetypes. Kept shorter than
  // the body tracer (1.15x) so the sheath reads as a glow around the round, not
  // as a second, longer bullet.
  if (hot && arch !== 'rocket') {
    X.globalAlpha = 0.5;
    X.strokeStyle = arch === 'cryo' ? '#d8f6ff' : arch === 'arc' ? '#bff4ff' : '#bff4ff';
    X.lineWidth = heavy ? 2 : 1.4;
    X.beginPath();
    X.moveTo(b.x - b.vx * tl * 1.15, b.y - b.vy * tl * 1.15);
    X.lineTo(b.x, b.y);
    X.stroke();
    X.globalAlpha = 1;
  }
  X.restore();

  // Tracer detail: a couple of dim afterimages strung behind the head give a
  // fast round a sense of direction without lengthening the hard trail. Only
  // drawn for the hot archetypes so 100-round SMG fire stays cheap.
  if (hot && F.length < 240) {
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 2; k++) {
      const f = k * 0.55 + Math.sin(ft * 26 + k) * 0.12;
      const dx = b.x - b.vx * tl * f, dy = b.y - b.vy * tl * f;
      X.globalAlpha = 0.22 / k;
      X.fillStyle = col;
      X.beginPath(); X.arc(dx, dy, Math.max(1.1, 2.4 - k * 0.5), 0, 6.28); X.fill();
    }
    X.globalAlpha = 1;
    X.restore();
  }

  // Per-archetype head silhouette: a slug, a shard, a needle, a rocket or a
  // pulsing orb, instead of one white dot for all 22 guns.
  X.save();
  X.translate(b.x, b.y);
  X.rotate(ang);
  if (arch === 'pellet') {
    X.globalAlpha = 0.92;
    X.fillStyle = b.isCrit ? '#fffdf0' : '#ffffff';
    X.beginPath(); X.ellipse(0, 0, 3.2, 1.6, 0, 0, 6.28); X.fill();
  } else if (arch === 'rocket') {
    X.fillStyle = '#d8d8dc';
    X.beginPath(); X.moveTo(7, 0); X.lineTo(-3, -2.3); X.lineTo(-3, 2.3); X.closePath(); X.fill();
    X.fillStyle = col;
    X.beginPath(); X.moveTo(-3, -2.3); X.lineTo(-7, -3.6); X.lineTo(-3, 0); X.closePath(); X.fill();
    X.beginPath(); X.moveTo(-3, 2.3); X.lineTo(-7, 3.6); X.lineTo(-3, 0); X.closePath(); X.fill();
    X.fillStyle = '#fff7d6';
    X.beginPath(); X.arc(4.4, 0, 1.2, 0, 6.28); X.fill();
  } else if (arch === 'cryo') {
    X.fillStyle = '#eaf9ff';
    X.beginPath(); X.moveTo(5, 0); X.lineTo(0, -2.6); X.lineTo(-5, 0); X.lineTo(0, 2.6); X.closePath(); X.fill();
    X.strokeStyle = '#7fd4f0'; X.lineWidth = 0.9; X.stroke();
  } else if (heavy) {
    X.fillStyle = col;
    X.beginPath(); X.roundRect(-4.5 - tier, -2.1 - tier * 0.25, 9 + tier * 2, 4.2 + tier * 0.5, 2.1); X.fill();
    X.fillStyle = 'rgba(18,14,8,0.55)';
    X.fillRect(-2.6 - tier, -2.1 - tier * 0.25, 1.5, 4.2 + tier * 0.5);
    X.fillStyle = b.isCrit ? '#fffdf0' : '#ffffff';
    X.beginPath(); X.ellipse(3.6 + tier, 0, 2.2, 1.8, 0, 0, 6.28); X.fill();
  } else if (arch === 'arc' || arch === 'energy') {
    const pr = (arch === 'arc' ? 2.7 : 2.3) + Math.sin(ft * 34) * 0.5;
    X.globalAlpha = 0.55;
    X.fillStyle = col;
    X.beginPath(); X.arc(0, 0, pr + 1.9, 0, 6.28); X.fill();
    X.globalAlpha = 1;
    X.fillStyle = b.isCrit ? '#fffdf0' : '#ffffff';
    X.beginPath(); X.arc(0, 0, pr, 0, 6.28); X.fill();
  } else {
    X.globalAlpha = 0.95;
    X.fillStyle = b.isCrit ? '#fffdf0' : '#ffffff';
    X.beginPath(); X.ellipse(0, 0, b.isCrit ? 3.4 : 2.6, b.isCrit ? 1.9 : 1.5, 0, 0, 6.28); X.fill();
  }
  X.restore();

  // Every archetype now carries a travelling light bloom, so a stream of SMG
  // rounds genuinely lights the ground it crosses.
  X.globalCompositeOperation = 'lighter';
  X.globalAlpha = heavy ? 0.55 : (hot ? 0.4 : 0.2);
  const r = heavy ? 5 + tier * 2.4 : (hot ? 5.5 : 4);
  X.drawImage(getLightSprite(col, true), b.x - r, b.y - r, r * 2, r * 2);
  X.globalCompositeOperation = 'source-over';
  X.globalAlpha = 1;
}

// Heavy rounds shed a visible smoke ribbon and a faint light, so a slow
// high-damage shot leaves a track behind it instead of a 1px line.
function bulletTrailFX(b, dt) {
  const wi = (b.wi == null) ? 0 : b.wi;
  const arch = bulletArchetype(wi);
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
  const tier = damageTier(w ? w.d : (b.d || 10));
  const heavy = arch === 'heavy' || arch === 'rail' || tier >= 2;

  // Flight clock: drives the muzzle bloom and the energy-orb pulse. Only
  // cosmetic, so it lives here rather than in the gameplay projectile step.
  b.ft = (b.ft || 0) + dt;

  if (heavy) {
    b.sm = (b.sm || 0) + dt;
    if (b.sm > 0.02 && F.length < 250) {
      b.sm = 0;
      F.push({
        x: b.x + (Math.random() - 0.5) * 4, y: b.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18 - 8,
        l: 0.3 + Math.random() * 0.3,
        c: arch === 'cryo' ? '#cfe9f5' : arch === 'energy' ? '#9fe6ff' : '#6f6a5f',
        s: 1.8 + tier * 1.1
      });
    }
  }
  if (arch === 'flame' && F.length < 250) {
    b.sm = (b.sm || 0) + dt;
    if (b.sm > 0.035) {
      b.sm = 0;
      F.push({
        x: b.x, y: b.y, vx: b.vx * 0.12, vy: b.vy * 0.12 - 26,
        l: 0.32, c: 'rgba(90,90,90,0.55)', s: 3.4 + Math.random() * 2
      });
    }
  }
  // Status archaea: cryo rounds leave frost motes, arc/energy rounds spit
  // sparks. Both are gated on the particle budget so the pool stays bounded.
  if ((arch === 'cryo' || arch === 'energy' || arch === 'arc') && F.length < 240) {
    b.sp = (b.sp || 0) + dt;
    if (b.sp > (arch === 'cryo' ? 0.05 : 0.07)) {
      b.sp = 0;
      F.push({
        x: b.x + (Math.random() - 0.5) * 5, y: b.y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 26, vy: (Math.random() - 0.5) * 26,
        l: 0.16 + Math.random() * 0.18,
        c: arch === 'cryo' ? '#d8f6ff' : '#9be7ff',
        s: 1.3 + Math.random() * 1.2, fr: 1
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* MUZZLE SMOKE & HEAT                                                 */
/* ------------------------------------------------------------------ */
function muzzleSmokeFX(wi, ang, x, y) {
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
  if (!w || typeof F === 'undefined' || F.length > 250) return;
  const tier = damageTier(w.d);
  const n = w.flm ? 1 : (tier >= 3 ? 3 : tier === 2 ? 2 : 1);
  for (let i = 0; i < n; i++) {
    const sa = ang + (Math.random() - 0.5) * 0.5;
    F.push({
      x: x + Math.cos(sa) * 4, y: y + Math.sin(sa) * 4,
      vx: Math.cos(sa) * (34 + Math.random() * 44), vy: Math.sin(sa) * (34 + Math.random() * 44) - 12,
      l: 0.26 + Math.random() * 0.3,
      c: w.flm ? 'rgba(70,70,70,0.5)' : 'rgba(150,148,142,0.42)',
      s: 2 + tier * 1.2 + Math.random()
    });
  }
}

/* ------------------------------------------------------------------ */
/* SKILL VFX                                                           */
/* ------------------------------------------------------------------ */
let SKILL_FX = [];
let GREN = [];
let ARCS = [];

/* ------------------------------------------------------------------ */
/* CHAIN LIGHTNING                                                     */
/* ------------------------------------------------------------------ */
// WEAP rows for the Tesla (cl:3) and Arc Shotgun (cl:1) declared a chain
// count that nothing ever read, and the bullet carried `cl` into a field with
// no consumer. The perk "Chain Lightning" was therefore inert too. This
// implements it: each jump re-searches from the enemy just hit and deals 45%
// of the bullet's damage, so chaining rewards firing into a packed wave.
function chainLightning(src, b) {
  if (typeof Z === 'undefined' || !b) return 0;
  const maxJumps = Math.min(4, Math.floor(b.cl || 0));
  if (maxJumps <= 0) return 0;
  const hit = new Set(b.h || []);
  hit.add(src);
  let from = src, jumps = 0;
  for (let j = 0; j < maxJumps; j++) {
    let best = null, bestD = 190 * 190;
    for (const z of Z) {
      if (!z || z.dead || hit.has(z)) continue;
      const dx = z.x - from.x, dy = z.y - from.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = z; }
    }
    if (!best) break;
    hit.add(best);
    const ang = Math.atan2(best.y - from.y, best.x - from.x);
    ARCS.push({ x1: from.x, y1: from.y, x2: best.x, y2: best.y, l: 0.16, maxL: 0.16, seed: Math.random() * 999 });
    if (typeof damageZ === 'function') damageZ(best, Math.max(1, b.d * 0.45), 'chain', false, ang, b.wi);
    if (typeof burst === 'function') burst(best.x, best.y, '#9be7ff', 5, 2.2, 90, 1);
    from = best;
    jumps++;
  }
  return jumps;
}

// Jagged polyline through a seeded midpoint jitter: cheap, deterministic
// between frames of the same arc and unmistakably "electric".
function renderArcs() {
  if (!ARCS.length) return;
  X.save();
  X.globalCompositeOperation = 'lighter';
  X.lineCap = 'round';
  for (const a of ARCS) {
    const alpha = Math.max(0, a.l / a.maxL);
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = 5;
    X.globalAlpha = alpha * 0.85;
    X.strokeStyle = '#9be7ff';
    X.lineWidth = 2.6;
    X.beginPath();
    X.moveTo(a.x1, a.y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jitter = (Math.sin(a.seed + i * 12.9898) * 43758.5453 % 1) * 14;
      X.lineTo(a.x1 + dx * t + nx * jitter, a.y1 + dy * t + ny * jitter);
    }
    X.lineTo(a.x2, a.y2);
    X.stroke();
    X.globalAlpha = alpha * 0.55;
    X.strokeStyle = '#ffffff';
    X.lineWidth = 1.1;
    X.stroke();
    X.globalAlpha = alpha * 0.5;
    const r = 7;
    X.drawImage(getLightSprite('#9be7ff', true), a.x2 - r, a.y2 - r, r * 2, r * 2);
  }
  X.restore();
}

function updateFeelFX(dt) {
  // Dash afterimages (GH was pushed every dash frame but never aged or drawn).
  if (typeof GH !== 'undefined' && GH.length) {
    for (const g of GH) g.l -= dt;
    pruneArr(GH, g => g.l > 0);
  }
  for (const e of SKILL_FX) e.l -= dt;
  pruneArr(SKILL_FX, e => e.l > 0);
  updatePuPixel(dt);
  for (const a of ARCS) a.l -= dt;
  pruneArr(ARCS, a => a.l > 0);
  if (ARCS.length > 40) ARCS.splice(0, ARCS.length - 40);

  // Grenade flight: visual + delayed detonation.
  for (let i = GREN.length - 1; i >= 0; i--) {
    const g = GREN[i];
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = g.sx + (g.tx - g.sx) * k;
    g.y = g.sy + (g.ty - g.sy) * k;
    g.h = Math.sin(k * Math.PI) * 46;
    if (k >= 1) {
      GREN.splice(i, 1);
      if (typeof boom === 'function') boom({ x: g.tx, y: g.ty, ex: 110, d: g.dmg });
    }
  }

  if (typeof B !== 'undefined') for (const b of B) bulletTrailFX(b, dt);
}

function clearFeelFX() {
  PU_PX.length = 0;
  SKILL_FX = [];
  GREN = [];
  ARCS = [];
}

// Called the instant a skill fires, before its gameplay effect lands.
function skillCastFX(k, x, y, ang) {
  const a = (typeof ang === 'number' && isFinite(ang)) ? ang : 0;
  if (k === 'dash') {
    SKILL_FX.push({ k: 'dash', x, y, l: 0.3, dur: 0.3, a });
    for (let i = 0; i < 10; i++) {
      const sa = a + Math.PI + (Math.random() - 0.5) * 1.5;
      F.push({
        x, y, vx: Math.cos(sa) * (70 + Math.random() * 90), vy: Math.sin(sa) * (70 + Math.random() * 90),
        l: 0.24 + Math.random() * 0.2, c: '#cfe08a', s: 2.4 + Math.random() * 1.6
      });
    }
    if (typeof RG !== 'undefined') RG.push({ x, y, r: 6, l: 0.22, v: 340, c: '160,200,110' });
  } else if (k === 'nova') {
    SKILL_FX.push({ k: 'nova', x, y, l: 0.62, dur: 0.62 });
    for (let i = 0; i < 4; i++) {
      if (typeof RG !== 'undefined') RG.push({ x, y, r: 8 + i * 6, l: 0.5 + i * 0.06, v: 640 - i * 70, c: i % 2 ? '255,210,140' : '255,110,54' });
    }
    for (let i = 0; i < 26; i++) {
      const sa = Math.random() * 6.28, spd = 200 + Math.random() * 420;
      F.push({
        x: x + Math.cos(sa) * 10, y: y + Math.sin(sa) * 10,
        vx: Math.cos(sa) * spd, vy: Math.sin(sa) * spd,
        l: 0.3 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#ffb347' : '#ff6a3a', s: 2.6 + Math.random() * 2, fr: 1
      });
    }
  } else if (k === 'rage') {
    SKILL_FX.push({ k: 'rage', x, y, l: 0.5, dur: 0.5 });
  } else if (k === 'gren') {
    SKILL_FX.push({ k: 'grenThrow', x, y, l: 0.2, dur: 0.2, a });
  } else if (k === 'turret') {
    SKILL_FX.push({ k: 'turret', x, y, l: 0.5, dur: 0.5 });
    if (typeof RG !== 'undefined') RG.push({ x, y, r: 8, l: 0.36, v: 260, c: '255,206,120' });
  } else if (k === 'bolt' || k === 'meteor' || k === 'frost' || k === 'heal' || k === 'cloak' || k === 'shield') {
    SKILL_FX.push({ k: k, x, y, l: 0.45, dur: 0.45 });
    if (typeof RG !== 'undefined') {
      const col = k === 'frost' ? '150,220,255' : k === 'heal' ? '140,230,150' : k === 'cloak' ? '160,170,200' : '140,200,255';
      RG.push({ x, y, r: 8, l: 0.4, v: 380, c: col });
    }
  }
}

// SK.rage.on drives the on/off of the aura; kept out of the update loop.
function renderSkillFX(cx, cy, W, H) {
  if (typeof P === 'undefined' || !P) return;

  // 1. Dash speed lines + afterimages from the GH position history.
  if (typeof GH !== 'undefined' && GH.length) {
    X.save();
    for (const g of GH) {
      const k = Math.max(0, Math.min(1, g.l / 0.25));
      X.globalAlpha = k * 0.4;
      X.fillStyle = P.cloak > 0 ? '#8fd8ff' : '#dfe7c2';
      X.beginPath();
      X.ellipse(g.x, g.y - 6, 9 * k + 3, 13 * k + 4, 0, 0, 6.28);
      X.fill();
    }
    X.restore();
  }

  // 2. Active cast effects.
  for (const e of SKILL_FX) {
    const k = 1 - Math.max(0, Math.min(1, e.l / e.dur));
    if (e.k === 'turret') {
      // Unfolding deployment ring + descending bracket.
      X.save();
      X.globalAlpha = 1 - k;
      X.strokeStyle = '#ffd36b';
      X.lineWidth = 2.4;
      X.beginPath(); X.arc(e.x, e.y, 14 + k * 26, 0, 6.28); X.stroke();
      X.globalAlpha = (1 - k) * 0.8;
      X.strokeStyle = '#8fae4a';
      X.setLineDash([5, 5]);
      X.beginPath(); X.arc(e.x, e.y, 22 + k * 18, 0, 6.28); X.stroke();
      X.setLineDash([]);
      X.restore();
    } else if (e.k === 'rage') {
      // The sustained aura is drawn by the SK.rage.on block below; this is the
      // activation moment - a hot ring that slams inward as the buff takes hold.
      X.save();
      X.globalCompositeOperation = 'lighter';
      X.globalAlpha = (1 - k) * 0.9;
      X.strokeStyle = '#ff7a3a';
      X.lineWidth = 3.2 - k * 1.6;
      X.beginPath(); X.arc(e.x, e.y, 46 - k * 26, 0, 6.28); X.stroke();
      X.globalAlpha = (1 - k) * 0.6;
      X.strokeStyle = '#ffd36b';
      X.lineWidth = 1.6;
      X.beginPath(); X.arc(e.x, e.y, 62 - k * 40, 0, 6.28); X.stroke();
      X.globalAlpha = (1 - k) * 0.75;
      X.fillStyle = '#ffb347';
      for (let i = 0; i < 7; i++) {
        const a = i * 0.8976 + k * 1.6;
        const rr = 34 - k * 22;
        X.beginPath();
        X.arc(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr - k * 12, 1.9, 0, 6.28);
        X.fill();
      }
      X.globalCompositeOperation = 'source-over';
      X.restore();
    } else if (e.k === 'grenThrow') {
      X.save();
      X.globalAlpha = 1 - k;
      X.strokeStyle = 'rgba(255,211,107,0.6)';
      X.lineWidth = 1.6;
      X.setLineDash([4, 5]);
      X.beginPath();
      X.moveTo(e.x, e.y);
      X.lineTo(e.x + Math.cos(e.a) * 120, e.y + Math.sin(e.a) * 120);
      X.stroke();
      X.setLineDash([]);
      X.restore();
    } else if (e.k === 'nova') {
      // Ground scorch fade-out beneath the rings.
      X.save();
      X.globalAlpha = (1 - k) * 0.4;
      const gr = X.createRadialGradient(e.x, e.y, 6, e.x, e.y, 170 * k + 30);
      gr.addColorStop(0, 'rgba(255,180,90,0.55)');
      gr.addColorStop(0.6, 'rgba(190,70,30,0.25)');
      gr.addColorStop(1, 'rgba(120,40,20,0)');
      X.fillStyle = gr;
      X.beginPath(); X.arc(e.x, e.y, 170 * k + 30, 0, 6.28); X.fill();
      X.restore();
    } else if (e.k === 'dash') {
      // Two contraction chevrons behind the dash line plus a lifting dust ring.
      X.save();
      X.globalAlpha = (1 - k) * 0.8;
      X.strokeStyle = '#dfe7c2';
      X.lineWidth = 2.2;
      X.beginPath(); X.arc(e.x, e.y, 10 + k * 26, 0, 6.28); X.stroke();
      X.globalAlpha = (1 - k) * 0.65;
      X.strokeStyle = '#cfe08a';
      X.lineWidth = 1.5;
      for (let c = 0; c < 2; c++) {
        const off = 8 + k * 30 + c * 9;
        X.beginPath();
        X.moveTo(e.x - Math.cos(e.a) * off + Math.cos(e.a + 1.5708) * 7, e.y - Math.sin(e.a) * off + Math.sin(e.a + 1.5708) * 7);
        X.lineTo(e.x - Math.cos(e.a) * (off + 7), e.y - Math.sin(e.a) * (off + 7));
        X.lineTo(e.x - Math.cos(e.a) * off - Math.cos(e.a + 1.5708) * 7, e.y - Math.sin(e.a) * off - Math.sin(e.a + 1.5708) * 7);
        X.stroke();
      }
      X.restore();
    } else if (e.k === 'bolt') {
      // Storm column that snaps down from above and forks into the ground.
      X.save();
      X.globalCompositeOperation = 'lighter';
      const rise = 150 * (1 - k);
      X.globalAlpha = (1 - k) * 0.9;
      X.strokeStyle = '#bff4ff';
      X.lineWidth = 3.4 - k * 2;
      X.beginPath();
      X.moveTo(e.x, e.y - rise - 40);
      X.lineTo(e.x + 5, e.y - rise - 12);
      X.lineTo(e.x - 4, e.y - rise + 4);
      X.lineTo(e.x + 2, e.y - 2);
      X.lineTo(e.x, e.y);
      X.stroke();
      X.globalAlpha = (1 - k) * 0.55;
      X.strokeStyle = '#ffffff';
      X.lineWidth = 1.2;
      X.stroke();
      X.globalCompositeOperation = 'source-over';
      X.globalAlpha = (1 - k) * 0.75;
      X.strokeStyle = '#8fd8ff';
      X.lineWidth = 2;
      X.beginPath(); X.arc(e.x, e.y, 8 + k * 30, 0, 6.28); X.stroke();
      X.restore();
    } else if (e.k === 'meteor') {
      // Ground reticle that snaps shut, with the incoming rock streaking in.
      X.save();
      X.globalAlpha = (1 - k) * 0.85;
      X.strokeStyle = '#ffb457';
      X.lineWidth = 2;
      X.setLineDash([7, 6]);
      X.beginPath(); X.arc(e.x, e.y, 62 - k * 34, 0, 6.28); X.stroke();
      X.setLineDash([]);
      X.globalAlpha = (1 - k) * 0.35;
      const mg = X.createRadialGradient(e.x, e.y, 4, e.x, e.y, 66 - k * 34);
      mg.addColorStop(0, 'rgba(255,160,60,0.6)');
      mg.addColorStop(1, 'rgba(255,110,40,0)');
      X.fillStyle = mg;
      X.beginPath(); X.arc(e.x, e.y, 66 - k * 34, 0, 6.28); X.fill();
      X.globalCompositeOperation = 'lighter';
      X.globalAlpha = (1 - k) * 0.9;
      X.strokeStyle = '#ffd0a0';
      X.lineWidth = 3;
      X.beginPath();
      X.moveTo(e.x - 120 * (1 - k), e.y - 190 * (1 - k));
      X.lineTo(e.x - 6, e.y - 10);
      X.stroke();
      X.globalCompositeOperation = 'source-over';
      X.restore();
    } else if (e.k === 'frost') {
      // Six-ray frost star unfolding, with drifting ice shards.
      X.save();
      X.globalAlpha = (1 - k) * 0.9;
      X.strokeStyle = '#a8e4ff';
      X.lineWidth = 2.2;
      const fr = 12 + k * 38;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.0472 + k * 0.5;
        X.beginPath();
        X.moveTo(e.x, e.y);
        X.lineTo(e.x + Math.cos(a) * fr, e.y + Math.sin(a) * fr);
        X.stroke();
        X.beginPath();
        X.moveTo(e.x + Math.cos(a) * fr * 0.66, e.y + Math.sin(a) * fr * 0.66);
        X.lineTo(e.x + Math.cos(a + 0.6) * fr * 0.82, e.y + Math.sin(a + 0.6) * fr * 0.82);
        X.moveTo(e.x + Math.cos(a) * fr * 0.66, e.y + Math.sin(a) * fr * 0.66);
        X.lineTo(e.x + Math.cos(a - 0.6) * fr * 0.82, e.y + Math.sin(a - 0.6) * fr * 0.82);
        X.stroke();
      }
      X.globalAlpha = (1 - k) * 0.5;
      X.strokeStyle = '#eaf9ff';
      X.lineWidth = 1.2;
      X.beginPath(); X.arc(e.x, e.y, fr + 4, 0, 6.28); X.stroke();
      X.restore();
    } else if (e.k === 'heal') {
      // Rising green motes inside a contracting cross ring.
      X.save();
      X.globalAlpha = (1 - k) * 0.75;
      X.strokeStyle = '#8ce69a';
      X.lineWidth = 2.4;
      const hr = 26 - k * 12;
      X.beginPath(); X.arc(e.x, e.y, hr, 0, 6.28); X.stroke();
      X.globalAlpha = (1 - k) * 0.9;
      X.fillStyle = '#b9f5c2';
      X.fillRect(e.x - 1.8, e.y - hr * 0.45, 3.6, hr * 0.9);
      X.fillRect(e.x - hr * 0.45, e.y - 1.8, hr * 0.9, 3.6);
      X.globalCompositeOperation = 'lighter';
      X.globalAlpha = (1 - k) * 0.55;
      for (let i = 0; i < 5; i++) {
        const ma = i * 1.2566 + k * 2;
        const mr = 10 + k * 20;
        X.beginPath();
        X.arc(e.x + Math.cos(ma) * mr, e.y + Math.sin(ma) * mr - k * 22, 1.6, 0, 6.28);
        X.fill();
      }
      X.globalCompositeOperation = 'source-over';
      X.restore();
    } else if (e.k === 'cloak') {
      // Shadow folds in on the player, then a dashed silhouette fades out.
      X.save();
      X.globalAlpha = (1 - k) * 0.8;
      X.strokeStyle = '#a0aac8';
      X.lineWidth = 2;
      X.setLineDash([4, 5]);
      X.beginPath(); X.arc(e.x, e.y, 30 - k * 18, 0, 6.28); X.stroke();
      X.setLineDash([]);
      X.globalAlpha = (1 - k) * 0.45;
      X.fillStyle = '#2a3040';
      X.beginPath(); X.ellipse(e.x, e.y - 6, 9 + k * 3, 13 + k * 4, 0, 0, 6.28); X.fill();
      X.globalAlpha = (1 - k) * 0.7;
      X.strokeStyle = '#c9d4f0';
      X.lineWidth = 1.3;
      X.beginPath(); X.ellipse(e.x, e.y - 6, 9 + k * 3, 13 + k * 4, 0, 0, 6.28); X.stroke();
      X.restore();
    } else if (e.k === 'shield') {
      // Hexagonal barrier that snaps outward and then settles as a hex ring.
      X.save();
      const sr = 24 + k * 16;
      X.globalAlpha = (1 - k) * 0.85;
      X.strokeStyle = '#ffd76b';
      X.lineWidth = 2.4;
      X.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = i * 1.0472 - 1.5708;
        const px2 = e.x + Math.cos(a) * sr, py2 = e.y + Math.sin(a) * sr;
        if (i === 0) X.moveTo(px2, py2); else X.lineTo(px2, py2);
      }
      X.stroke();
      X.globalAlpha = (1 - k) * 0.28;
      X.fillStyle = '#ffd76b';
      X.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = i * 1.0472 - 1.5708;
        const px2 = e.x + Math.cos(a) * sr, py2 = e.y + Math.sin(a) * sr;
        if (i === 0) X.moveTo(px2, py2); else X.lineTo(px2, py2);
      }
      X.fill();
      X.restore();
    }
  }

  // 3. Grenades in flight (arcing).
  for (const g of GREN) {
    X.save();
    X.fillStyle = 'rgba(0,0,0,0.35)';
    X.beginPath(); X.ellipse(g.x, g.y + 2, 5, 3, 0, 0, 6.28); X.fill();
    X.fillStyle = '#4d5545';
    X.beginPath(); X.arc(g.x, g.y - g.h, 5, 0, 6.28); X.fill();
    X.strokeStyle = '#2b3026';
    X.lineWidth = 1.4;
    X.stroke();
    X.fillStyle = Math.sin(g.t * 30) > 0 ? '#ff5a3a' : '#5a2018';
    X.fillRect(g.x - 2, g.y - g.h - 6, 4, 3);
    X.restore();
  }

  // 4. Rage aura while the buff is live.
  const rage = (typeof SK !== 'undefined' && SK && SK.rage) ? SK.rage.on : 0;
  if (rage > 0 && P.hp > 0) {
    const pulse = 0.6 + Math.sin((S.t || 0) * 9) * 0.4;
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = 0.22 + pulse * 0.16;
    const r = 30 + pulse * 7;
    const rg = X.createRadialGradient(P.x, P.y, 4, P.x, P.y, r);
    rg.addColorStop(0, 'rgba(255,140,60,0.55)');
    rg.addColorStop(1, 'rgba(255,60,20,0)');
    X.fillStyle = rg;
    X.beginPath(); X.arc(P.x, P.y, r, 0, 6.28); X.fill();
    X.globalCompositeOperation = 'source-over';
    X.globalAlpha = 0.5 + pulse * 0.3;
    X.strokeStyle = '#ff9a3a';
    X.lineWidth = 2;
    X.beginPath(); X.arc(P.x, P.y, 20 + pulse * 5, 0, 6.28); X.stroke();
    X.restore();
    if (Math.random() < 0.35 && F.length < 240) {
      F.push({
        x: P.x + (Math.random() - 0.5) * 24, y: P.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 20, vy: -34 - Math.random() * 30,
        l: 0.4 + Math.random() * 0.3, c: '#ffb347', s: 1.8 + Math.random(), fr: 1
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* POWER-UP ICONOGRAPHY (shared by the HUD chip and the ground pickup) */
/* ------------------------------------------------------------------ */
// `s` is a size multiplier around a 1x design that fits inside a ~14px disc.
// Both the HUD active-powerup chips and drawPowerupIcon call this, so the icon
// a player sees on the ground is literally the same vector they see ticking
// down in the corner.
function puGlyph(id, px, py, s, col) {
  s = s || 1;
  col = col || '#ffffff';
  X.save();
  X.strokeStyle = col;
  X.fillStyle = col;
  X.lineWidth = Math.max(1, 1.5 * s);
  X.lineCap = 'round';
  X.lineJoin = 'round';
  if (id === 'dd') {
    // Targeting reticle: ring, four tick marks, centre dot.
    X.beginPath(); X.arc(px, py, 3.3 * s, 0, 6.28); X.stroke();
    X.beginPath();
    X.moveTo(px, py - 6.6 * s); X.lineTo(px, py - 2.4 * s);
    X.moveTo(px, py + 2.4 * s); X.lineTo(px, py + 6.6 * s);
    X.moveTo(px - 6.6 * s, py); X.lineTo(px - 2.4 * s, py);
    X.moveTo(px + 2.4 * s, py); X.lineTo(px + 6.6 * s, py);
    X.stroke();
    X.beginPath(); X.arc(px, py, 1.05 * s, 0, 6.28); X.fill();
  } else if (id === 'fz') {
    // Six-point snowflake with the cardinal arms longer than the diagonals.
    for (let d = 0; d < 6; d++) {
      const a = d * 1.0472;
      const len = (d % 2 === 0 ? 6.4 : 5.1) * s;
      X.beginPath();
      X.moveTo(px - Math.cos(a) * len, py - Math.sin(a) * len);
      X.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
      X.stroke();
    }
    X.beginPath(); X.arc(px, py, 1.5 * s, 0, 6.28); X.fill();
  } else if (id === 'sh') {
    // Faceted hex shield with a centre seam.
    X.beginPath();
    X.moveTo(px, py - 6.4 * s);
    X.lineTo(px + 5.4 * s, py - 3.6 * s);
    X.lineTo(px + 4.4 * s, py + 2.6 * s);
    X.lineTo(px, py + 6.4 * s);
    X.lineTo(px - 4.4 * s, py + 2.6 * s);
    X.lineTo(px - 5.4 * s, py - 3.6 * s);
    X.closePath(); X.stroke();
    X.globalAlpha = 0.5;
    X.beginPath(); X.moveTo(px, py - 6.4 * s); X.lineTo(px, py + 6.4 * s); X.stroke();
    X.globalAlpha = 1;
  } else if (id === 'mg') {
    // Horseshoe magnet with bright pole caps.
    X.beginPath(); X.arc(px, py - 0.8 * s, 4.6 * s, 3.1416, 0); X.stroke();
    X.beginPath();
    X.moveTo(px - 4.6 * s, py - 0.8 * s); X.lineTo(px - 4.6 * s, py + 4.6 * s);
    X.moveTo(px + 4.6 * s, py - 0.8 * s); X.lineTo(px + 4.6 * s, py + 4.6 * s);
    X.stroke();
    X.lineWidth = Math.max(1, 2.6 * s);
    X.beginPath();
    X.moveTo(px - 4.6 * s, py + 4.6 * s); X.lineTo(px - 4.6 * s, py + 6.6 * s);
    X.moveTo(px + 4.6 * s, py + 4.6 * s); X.lineTo(px + 4.6 * s, py + 6.6 * s);
    X.stroke();
  } else if (id === 'ad') {
    // Lightning bolt.
    X.beginPath();
    X.moveTo(px + 2.2 * s, py - 7 * s);
    X.lineTo(px - 3.4 * s, py + 0.6 * s);
    X.lineTo(px + 0.2 * s, py + 0.6 * s);
    X.lineTo(px - 2.2 * s, py + 7 * s);
    X.lineTo(px + 4.2 * s, py - 1.4 * s);
    X.lineTo(px + 0.4 * s, py - 1.4 * s);
    X.closePath(); X.fill();
  } else if (id === 'nk') {
    // Three shockwave rings.
    for (let d = 0; d < 3; d++) {
      X.globalAlpha = 1 - d * 0.28;
      X.lineWidth = Math.max(1, (1.6 - d * 0.32) * s);
      X.beginPath(); X.arc(px, py, (2.5 + d * 2.4) * s, 0, 6.28); X.stroke();
    }
    X.globalAlpha = 1;
  }
  X.restore();
}

// Per-power-up pickup detonation. Previously every one of the six dropped the
// same two rings and the same 26-particle burst, so collecting a MAGNET looked
// identical to collecting a SHOCKWAVE.
function powerupPickupFX(id, x, y) {
  const def = PU_DEFS[id];
  if (!def || typeof F === 'undefined') return;
  const col = def.col;
  const rgb = hexToRgbTriplet(col);
  const push = f => { if (F.length < 250) F.push(f); };
  // Chunky pixel detonation shared by every power-up (per-id pattern).
  powerupPixelBurst(id, x, y);

  if (id === 'dd') {
    // OVERCHARGE: axis-aligned reticle snapshot + hot white core flash.
    RG.push({ x, y, r: 5, l: 0.5, v: 520, c: rgb });
    RG.push({ x, y, r: 2, l: 0.34, v: 760, c: '255,255,255' });
    for (let i = 0; i < 8; i++) {
      const a = i * 0.7854;
      const spd = i % 2 ? 210 : 330;
      push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, l: 0.3, c: i % 2 ? col : '#fff3c4', s: 2.6, fr: 1 });
    }
  } else if (id === 'fz') {
    // CRYO FIELD: six shard spokes plus a cold snowflake bloom.
    RG.push({ x, y, r: 6, l: 0.55, v: 380, c: '56,189,248' });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472;
      push({ x, y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, l: 0.42, c: '#d8f6ff', s: 2.8 });
      push({ x, y, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, l: 0.5, c: '#7fd4f0', s: 2.2 });
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.28;
      push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, l: 0.5, c: '#eaf9ff', s: 1.6 });
    }
  } else if (id === 'sh') {
    // AEGIS: hexagonal hex-ring built from six directed shards.
    RG.push({ x, y, r: 4, l: 0.5, v: 300, c: '234,179,8' });
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472 - 1.5708;
      push({ x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, l: 0.38, c: '#ffd76b', s: 3.2 });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6.28;
      push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, l: 0.44, c: '#fff0b3', s: 1.8 });
    }
  } else if (id === 'mg') {
    // MAGNET: everything rushes inward and then snaps out on one ring.
    RG.push({ x, y, r: 34, l: 0.45, v: -150, c: '168,85,247' });
    RG.push({ x, y, r: 3, l: 0.34, v: 620, c: '216,180,254' });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 6.28, d = 22 + Math.random() * 24;
      push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * 190, vy: -Math.sin(a) * 190, l: 0.34, c: col, s: 2, fr: 1 });
    }
  } else if (id === 'ad') {
    // ADRENALINE: upward lightning forks and a cyan pulse.
    RG.push({ x, y, r: 5, l: 0.42, v: 470, c: '34,211,238' });
    for (let i = 0; i < 5; i++) {
      const a = -1.5708 + (i - 2) * 0.42 + (Math.random() - 0.5) * 0.2;
      push({ x, y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, l: 0.3, c: '#e6ffff', s: 2.4, fr: 1 });
      push({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, l: 0.42, c: col, s: 2 });
    }
  } else if (id === 'nk') {
    // SHOCKWAVE: three stacked blast rings and an outward debris spray.
    RG.push({ x, y, r: 4, l: 0.52, v: 900, c: '255,255,255' });
    RG.push({ x, y, r: 8, l: 0.62, v: 640, c: rgb });
    RG.push({ x, y, r: 14, l: 0.72, v: 420, c: '251,146,60' });
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.28, spd = 200 + Math.random() * 420;
      push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, l: 0.34 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#fed7aa' : col, s: 2.4 + Math.random() * 2, fr: 1 });
    }
  }
}

// World-space auras for the power-ups that had no active visual at all:
// OVERCHARGE and MAGNET. CRYO and ADRENALINE already tint the screen edge, but
// a ground ring ties them to the player instead of the viewport.
function renderPowerupAuras(cx, cy, W, H) {
  if (typeof P === 'undefined' || !P || typeof S === 'undefined' || !S || P.hp <= 0) return;
  const t = S.t || 0;
  X.save();

  if (S.dd > 0) {
    // OVERCHARGE: tight double ring with a rotating tick collar.
    const pulse = 0.5 + Math.sin(t * 11) * 0.5;
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = 0.2 + pulse * 0.16;
    X.strokeStyle = '#ef4444';
    X.lineWidth = 2.4;
    X.beginPath(); X.arc(P.x, P.y, 19 + pulse * 3, 0, 6.28); X.stroke();
    X.globalAlpha = 0.14 + pulse * 0.1;
    X.beginPath(); X.arc(P.x, P.y, 27 + pulse * 4, 0, 6.28); X.stroke();
    X.globalAlpha = 0.6;
    X.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      const a = t * 2.2 + i * 1.5708;
      X.beginPath();
      X.moveTo(P.x + Math.cos(a) * 24, P.y + Math.sin(a) * 24);
      X.lineTo(P.x + Math.cos(a) * 30, P.y + Math.sin(a) * 30);
      X.stroke();
    }
    X.globalCompositeOperation = 'source-over';
  }

  if (S.mgTime > 0) {
    // MAGNET: a wide dashed field with the pull radius actually shown.
    const pull = 36 * (S.mg || 1) * (S.magRing ? 1.5 : 1) * 9;
    const spin = -t * 0.9;
    X.globalAlpha = 0.1;
    X.fillStyle = '#a855f7';
    X.beginPath(); X.arc(P.x, P.y, pull, 0, 6.28); X.fill();
    X.globalAlpha = 0.3;
    X.strokeStyle = '#c084fc';
    X.lineWidth = 1.6;
    for (let ring = 0; ring < 3; ring++) {
      X.setLineDash(ring % 2 ? [4, 9] : [10, 14]);
      X.lineDashOffset = spin * 40 * (ring % 2 ? -1 : 1);
      X.beginPath(); X.arc(P.x, P.y, 34 + ring * 22, 0, 6.28); X.stroke();
    }
    X.setLineDash([]);
    X.lineDashOffset = 0;
    X.globalAlpha = 0.5;
    X.strokeStyle = '#a855f7';
    X.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = spin + i * 1.0472;
      const y = P.y + Math.sin(a) * pull * 0.55;
      const x = P.x + Math.cos(a) * pull * 0.55;
      X.beginPath();
      X.moveTo(x, y);
      X.lineTo(x + (P.x - x) * 0.12, y + (P.y - y) * 0.12);
      X.stroke();
    }
  }

  if (S.fz > 0) {
    // CRYO FIELD: a frost ring on the ground under the player.
    X.globalAlpha = 0.26;
    X.strokeStyle = '#38bdf8';
    X.lineWidth = 2;
    X.beginPath(); X.arc(P.x, P.y, 30 + Math.sin(t * 5) * 2.5, 0, 6.28); X.stroke();
    X.globalAlpha = 0.4;
    X.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472 + t * 0.35;
      X.beginPath();
      X.moveTo(P.x + Math.cos(a) * 22, P.y + Math.sin(a) * 22);
      X.lineTo(P.x + Math.cos(a) * 34, P.y + Math.sin(a) * 34);
      X.stroke();
    }
  }

  if (S.sh2 > 0) {
    // AEGIS: discrete rotating hex ward, in the same pixel language as the burst.
    X.globalAlpha = 0.55;
    puPixelRing(P.x, P.y, 26 + Math.sin(t * 6) * 1.5, '#eab308', 6, t * 0.8, 4);
    X.globalAlpha = 0.35;
    puPixelRing(P.x, P.y, 34 + Math.cos(t * 6) * 1.5, '#eab308', 6, -t * 0.8, 3);
  }

  if (S.adr > 0) {
    // ADRENALINE: pixel sparks streaming outward, plus the facing smear below.
    X.globalAlpha = 0.5;
    puPixelRing(P.x, P.y, 20 + (t * 62 % 22), '#22d3ee', 10, t * 2.0, 3);
    X.globalAlpha = 1;
    // ADRENALINE: speed smear trails behind the player's facing.
    X.globalAlpha = 0.22;
    X.strokeStyle = '#22d3ee';
    X.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const side = (i - 1) * 7;
      const ox = P.x + Math.cos(P.a + 1.5708) * side;
      const oy = P.y + Math.sin(P.a + 1.5708) * side;
      X.beginPath();
      X.moveTo(ox, oy);
      X.lineTo(ox - Math.cos(P.a) * (20 + i * 5), oy - Math.sin(P.a) * (20 + i * 5));
      X.stroke();
    }
  }

  X.restore();
}

/* ------------------------------------------------------------------ */
/* PIXEL-ART POWER-UP FX                                               */
/* ------------------------------------------------------------------ */
// Every power-up also detonates a chunky, lattice-snapped pixel burst, so the
// pickup reads in the game's pixel language instead of as a smooth vector puff.
// Each id has its own pattern so the power-up is identifiable at a glance.
let PU_PX = [];

// Draws one ring of discrete pixels on the shared lattice. Used by both the
// pickup burst and the persistent ward rings around the player.
function puPixelRing(cx, cy, radius, col, count, phase, size) {
  const s = size || ((typeof GORE_PX === 'number') ? GORE_PX : 3);
  const snap = (typeof pxSnap === 'function') ? pxSnap : (v => v);
  X.fillStyle = col;
  for (let i = 0; i < count; i++) {
    const a = phase + i * 6.2832 / count;
    X.fillRect(snap(cx + Math.cos(a) * radius) - s / 2, snap(cy + Math.sin(a) * radius) - s / 2, s, s);
  }
}

function powerupPixelBurst(id, x, y) {
  const def = (typeof PU_DEFS !== 'undefined') ? PU_DEFS[id] : null;
  const spec = {
    dd: { n: 20, spd: 210, life: 0.46, px: 3, pat: 'ring' },
    fz: { n: 24, spd: 175, life: 0.58, px: 3, pat: 'star' },
    sh: { n: 18, spd: 165, life: 0.50, px: 4, pat: 'hex' },
    mg: { n: 26, spd: 145, life: 0.52, px: 3, pat: 'diamond', inward: 1 },
    ad: { n: 22, spd: 205, life: 0.40, px: 3, pat: 'bolt' },
    nk: { n: 32, spd: 300, life: 0.50, px: 4, pat: 'ring' }
  }[id] || { n: 18, spd: 190, life: 0.50, px: 3, pat: 'ring' };
  PU_PX.push({
    x: x, y: y, t: 0, life: spec.life, n: spec.n, spd: spec.spd, px: spec.px,
    pat: spec.pat, inward: spec.inward ? 1 : 0,
    col: def ? def.col : '#ffffff'
  });
  if (PU_PX.length > 16) PU_PX.shift();
}

function updatePuPixel(dt) {
  for (const b of PU_PX) b.t += dt;
  pruneArr(PU_PX, b => b.t < b.life);
}

function renderPuPixel() {
  if (!PU_PX.length) return;
  const snap = (typeof pxSnap === 'function') ? pxSnap : (v => v);
  X.save();
  for (const b of PU_PX) {
    const p = Math.min(1, b.t / b.life);
    X.globalAlpha = Math.max(0, 1 - p);
    const ease = 1 - Math.pow(1 - p, 2.2);
    const R = (b.inward ? (1 - ease) : ease) * b.spd * b.life;
    for (let i = 0; i < b.n; i++) {
      const h = i / b.n;
      let a;
      if (b.pat === 'ring') a = h * 6.2832 + b.t * 1.6;
      else if (b.pat === 'star') a = h * 6.2832;
      else if (b.pat === 'hex') a = Math.round(h * 6) / 6 * 6.2832;
      else if (b.pat === 'diamond') a = Math.round(h * 4) / 4 * 6.2832;
      else a = -1.5708 + (h - 0.5) * 1.9;          // bolt: upward fan
      const rr = (b.pat === 'star' && (i % 2)) ? R * 0.58 : R;
      const size = Math.max(2, b.px * (1 - p * 0.4));
      X.fillStyle = (i % 3 === 0) ? '#ffffff' : b.col;
      X.fillRect(snap(b.x + Math.cos(a) * rr) - size / 2, snap(b.y + Math.sin(a) * rr) - size / 2, size, size);
    }
    if (p < 0.28) {
      X.globalAlpha = (1 - p / 0.28) * 0.9;
      X.fillStyle = '#ffffff';
      const cs = b.px * 2;
      X.fillRect(snap(b.x) - cs / 2, snap(b.y) - cs / 2, cs, cs);
    }
  }
  X.globalAlpha = 1;
  X.restore();
}

/* ------------------------------------------------------------------ */
/* EXTRA PLAYER RIG DETAIL                                             */
/* ------------------------------------------------------------------ */
// Drawn inside the player's local (rotated) frame, between the body and the gun.
function drawPlayerGear() {
  if (typeof P === 'undefined' || !P) return;
  const st = P.st || 0;
  const moving = Math.hypot(P.vx || 0, P.vy || 0) > 10;
  const sw = moving ? Math.sin(st) * 0.9 : 0;
  const cls = (typeof CL !== 'undefined' && CL[SV && SV.cls != null ? SV.cls : 0]) ? CL[SV && SV.cls != null ? SV.cls : 0] : null;
  const acc = (cls && cls.ac) || '#556644';

  X.save();

  // Thigh pads + knee joints so the legs read as legs, not floating boots.
  const legY = [9, -9];
  for (let i = 0; i < 2; i++) {
    const d = i ? 1 : -1;
    const off = (i ? -sw : sw) * 4;
    X.fillStyle = '#1b2016';
    X.beginPath();
    X.roundRect(-11 + off, legY[i] + d * 1.5 - 3.5, 12, 7, 3);
    X.fill();
    X.fillStyle = acc;
    X.globalAlpha = 0.55;
    X.fillRect(-9 + off, legY[i] + d * 1.5 - 2, 8, 2);
    X.globalAlpha = 1;
    X.fillStyle = '#2a3122';
    X.beginPath();
    X.arc(-2 + off, legY[i] + d * 1.5, 2.2, 0, 6.28);
    X.fill();
  }

  // Belt with magazine pouches and a hip holster.
  X.fillStyle = '#20261a';
  X.beginPath(); X.roundRect(-6, -12, 5, 24, 2); X.fill();
  X.fillStyle = '#39412c';
  X.fillRect(-5.5, -9, 4, 3.4);
  X.fillRect(-5.5, -3, 4, 3.4);
  X.fillRect(-5.5, 3, 4, 3.4);
  X.fillStyle = '#171b12';
  X.beginPath(); X.roundRect(-4.5, 8.5, 6, 8, 2); X.fill();

  // Combat knife strapped across the shoulder rig.
  X.save();
  X.translate(-2, -13);
  X.rotate(-0.35);
  X.fillStyle = '#101308';
  X.fillRect(-1, -7, 3, 5);
  X.fillStyle = '#b9c2cc';
  X.beginPath();
  X.moveTo(0.5, -2); X.lineTo(2.5, -2); X.lineTo(1.5, 6); X.closePath();
  X.fill();
  X.restore();

  // Helmet headlamp cone: only bright while the run is live, so the lobby
  // preview does not glow for no reason.
  if (typeof run !== 'undefined' && run && S && S.nukeFlash >= 0) {
    const lamp = 0.1 + 0.05 * Math.sin((S.t || 0) * 6);
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = lamp;
    const lg = X.createLinearGradient(10, 0, 150, 0);
    lg.addColorStop(0, 'rgba(255,246,214,0.55)');
    lg.addColorStop(1, 'rgba(255,246,214,0)');
    X.fillStyle = lg;
    X.beginPath();
    X.moveTo(9, -1.5);
    X.lineTo(150, -34);
    X.lineTo(150, 34);
    X.lineTo(9, 1.5);
    X.closePath();
    X.fill();
    X.globalCompositeOperation = 'source-over';
    X.globalAlpha = 1;
  }

  X.restore();
}
