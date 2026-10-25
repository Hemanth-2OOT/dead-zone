// DEAD ZONE v2.4 - WEAPON FEEL, IMPACT & SKILL VFX
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
  const col = b.c || '#ffd86b';
  const heavy = arch === 'heavy' || arch === 'rail' || tier >= 2;

  // Trail length scales with speed AND weight: slow fat rounds get a short
  // smear, fast light rounds get a long thin one.
  const spd = Math.hypot(b.vx, b.vy) || 700;
  const base = heavy ? 0.075 : (b.isCrit ? 0.05 : 0.036);
  const tlen = Math.min(0.11, base * (1 + tier * 0.12));
  const tx = b.x - b.vx * tlen, ty = b.y - b.vy * tlen;

  X.save();
  X.lineCap = 'round';

  if (heavy) {
    // Outer bloom halo, then the coloured body, then a hot white core.
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = 0.32;
    X.strokeStyle = col;
    X.lineWidth = 14 + tier * 4;
    X.beginPath(); X.moveTo(tx, ty); X.lineTo(b.x, b.y); X.stroke();
    X.globalCompositeOperation = 'source-over';
  }

  X.globalAlpha = heavy ? 0.85 : 0.5;
  X.strokeStyle = col;
  X.lineWidth = heavy ? 6.5 + tier * 1.6 : (b.isCrit ? 5 : 3);
  X.beginPath(); X.moveTo(tx, ty); X.lineTo(b.x, b.y); X.stroke();

  X.globalAlpha = 1;
  X.strokeStyle = '#ffffff';
  X.lineWidth = heavy ? 3.4 : (b.isCrit ? 2.6 : 1.7);
  X.beginPath();
  X.moveTo(b.x - b.vx * tlen * 0.42, b.y - b.vy * tlen * 0.42);
  X.lineTo(b.x, b.y);
  X.stroke();

  // Muzzle-to-impact energy sheath for the energy archetypes.
  if (arch === 'energy' || arch === 'cryo') {
    X.globalAlpha = 0.5;
    X.strokeStyle = arch === 'cryo' ? '#d8f6ff' : '#bff4ff';
    X.lineWidth = heavy ? 2 : 1.4;
    X.beginPath();
    X.moveTo(b.x - b.vx * tlen * 1.5, b.y - b.vy * tlen * 1.5);
    X.lineTo(b.x, b.y);
    X.stroke();
    X.globalAlpha = 1;
  }
  X.restore();

  // Rounded head: heavy rounds are visibly fat, light rounds are a dot.
  X.fillStyle = '#ffffff';
  X.beginPath();
  X.arc(b.x, b.y, heavy ? 3.4 + tier * 0.6 : (b.isCrit ? 2.5 : 1.8), 0, 6.28);
  X.fill();

  if (heavy) {
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = 0.55;
    const r = 5 + tier * 2.4;
    X.drawImage(getLightSprite(col, true), b.x - r, b.y - r, r * 2, r * 2);
    X.globalCompositeOperation = 'source-over';
    X.globalAlpha = 1;
  }
}

// Heavy rounds shed a visible smoke ribbon and a faint light, so a slow
// high-damage shot leaves a track behind it instead of a 1px line.
function bulletTrailFX(b, dt) {
  const wi = (b.wi == null) ? 0 : b.wi;
  const arch = bulletArchetype(wi);
  const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
  const tier = damageTier(w ? w.d : (b.d || 10));
  const heavy = arch === 'heavy' || arch === 'rail' || tier >= 2;

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
