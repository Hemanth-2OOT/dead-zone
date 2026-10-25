/* === BLOOD, GORE, DECALS & FOOTPRINTS ENGINE === */

let BLD = [];       // In-flight blood droplets
let STREAKS = [];   // High-velocity elongated streaks
let MISTS = [];     // Fine aerosol impact clouds
let DEC = [];       // Active ground decals
let POOLS = [];     // Expanding pools under corpses
let FOOTPRINTS = [];// Bloody footprints
let GIBS = [];      // Meaty chunks from crits/heavy weapons

// Offscreen Decal Baking Canvas for maintaining locked 60 FPS
let BG_DEC_CANVAS = null;
let BG_DEC_CTX = null;

function initDecalBakingCanvas() {
  if (!BG_DEC_CANVAS && typeof document !== 'undefined') {
    BG_DEC_CANVAS = document.createElement('canvas');
    BG_DEC_CANVAS.width = WS;
    BG_DEC_CANVAS.height = WS;
    BG_DEC_CTX = BG_DEC_CANVAS.getContext('2d');
  } else if (BG_DEC_CTX) {
    BG_DEC_CTX.clearRect(0, 0, WS, WS);
  }
}

// Surface-aware blood color palettes based on active map
function getBloodColors(curM) {
  if (curM === 3 || curM === 6) {
    // Toxic Swamp & Bio-Dome: Caustic dark green/black bile
    return {
      core: '#14532d',
      rim: '#22c55e',
      pool: '#0f3d20',
      mist: 'rgba(34,197,94,0.35)',
      gib: '#166534',
      type: 'toxic'
    };
  } else if (curM === 2) {
    // Frozen Peak: Frozen crimson ice crystals
    return {
      core: '#881337',
      rim: '#fb7185',
      pool: '#700d2b',
      mist: 'rgba(251,113,133,0.3)',
      gib: '#9f1239',
      type: 'crystal'
    };
  } else if (curM === 4) {
    // Ashlands: Scorched dark charred stains
    return {
      core: '#1c1917',
      rim: '#7f1d1d',
      pool: '#171210',
      mist: 'rgba(127,29,29,0.35)',
      gib: '#450a0a',
      type: 'charred'
    };
  } else {
    // Standard: Downtown & Dust Bowl deep arterial crimson
    return {
      core: '#7f1d1d',
      rim: '#dc2626',
      pool: '#581111',
      mist: 'rgba(220,38,38,0.35)',
      gib: '#991b1b',
      type: 'blood'
    };
  }
}

// Spawns hit blood burst with droplets, streaks, and mist
function spawnBloodHit(x, y, hitAngle, dmg, isCrit, curM) {
  if (!isGoreEnabled()) return;
  const colors = getBloodColors(curM);
  const qProf = getQualityProfile();
  const dropletCount = Math.min(qProf.maxBlood, isCrit ? 18 : (dmg > 50 ? 12 : 8));

  // 1. In-flight blood droplets with gravity, drag & landing vector
  for (let i = 0; i < dropletCount; i++) {
    const a = hitAngle + (Math.random() - 0.5) * 1.4;
    const spd = 60 + Math.random() * 160 + (isCrit ? 40 : 0);
    BLD.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      r: 1.6 + Math.random() * 2.6,
      col: colors.core,
      rimCol: colors.rim,
      l: 0.35 + Math.random() * 0.3,
      maxL: 0.65,
      type: colors.type
    });
  }

  // 2. High-velocity elongated streaks
  const streakCount = isCrit ? 4 : 2;
  for (let i = 0; i < streakCount; i++) {
    const a = hitAngle + (Math.random() - 0.5) * 0.6;
    const spd = 140 + Math.random() * 180;
    STREAKS.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      len: 8 + Math.random() * 14,
      col: colors.rim,
      l: 0.22,
      maxL: 0.22
    });
  }

  // 3. Impact mist cloud
  if (qProf.maxMist > 0) {
    const mistCount = Math.min(qProf.maxMist, isCrit ? 10 : 5);
    for (let i = 0; i < mistCount; i++) {
      MISTS.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 30 + Math.cos(hitAngle) * 20,
        vy: (Math.random() - 0.5) * 30 + Math.sin(hitAngle) * 20,
        r: 4 + Math.random() * 8,
        col: colors.mist,
        l: 0.35 + Math.random() * 0.25,
        maxL: 0.6
      });
    }
  }

  if (BLD.length > 160) BLD.splice(0, BLD.length - 160);
  if (STREAKS.length > 50) STREAKS.splice(0, STREAKS.length - 50);
  if (MISTS.length > 60) MISTS.splice(0, MISTS.length - 60);
}

// Spawns lethal kill explosion, meaty gibs & growing corpse blood pool
function spawnKillGore(x, y, hitAngle, zType, isCrit, curM) {
  if (!isGoreEnabled()) return;
  const colors = getBloodColors(curM);

  // 1. Expanding blood pool under corpse
  const isTank = zType === 'tank' || zType === 'boss';
  const targetR = isTank ? 26 : (isCrit ? 20 : 14);
  POOLS.push({
    x, y,
    r: 3,
    maxR: targetR,
    col: colors.pool,
    rimCol: colors.rim,
    age: 0,
    maxAge: 22, // dries and darkens over 22s
    type: colors.type
  });

  // 2. Meaty chunks / gibs for heavy hits or crits
  const gibCount = isCrit ? 4 : (isTank ? 5 : 2);
  for (let i = 0; i < gibCount; i++) {
    const a = hitAngle + (Math.random() - 0.5) * 1.8;
    const spd = 70 + Math.random() * 140;
    GIBS.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      rot: Math.random() * 6.28,
      vrot: (Math.random() - 0.5) * 16,
      r: 3 + Math.random() * 3.5,
      col: colors.gib,
      l: 12,
      maxL: 12
    });
  }

  // 3. Larger splatter spray
  spawnBloodHit(x, y, hitAngle, 80, true, curM);

  if (POOLS.length > 60) POOLS.shift();
  if (GIBS.length > 40) GIBS.shift();
}

// Spawns a ground decal when a droplet lands
function spawnGroundDecal(x, y, vx, vy, r, col, rimCol, type) {
  const speed = Math.hypot(vx, vy);
  const ang = Math.atan2(vy, vx);
  // Stretched oval if landed with velocity, round splatter if low speed
  const stretch = Math.min(2.4, Math.max(1.0, speed * 0.015));
  DEC.push({
    x, y,
    r: r * 1.4,
    stretch,
    ang,
    col,
    rimCol,
    l: 18,
    maxL: 18,
    type: type || 'blood'
  });

  // Check decal baking threshold to keep active array small and fast
  const maxDecals = getQualityProfile().maxDecals;
  if (DEC.length > maxDecals) {
    bakeDecalsToBackground(20);
  }
}

// Bakes oldest settled decals onto offscreen canvas BG_DEC_CANVAS
function bakeDecalsToBackground(count) {
  if (!BG_DEC_CTX) return;
  const toBake = DEC.splice(0, count);
  for (const d of toBake) {
    BG_DEC_CTX.save();
    BG_DEC_CTX.translate(d.x, d.y);
    BG_DEC_CTX.rotate(d.ang || 0);
    // Thin outer rim
    BG_DEC_CTX.fillStyle = d.rimCol || '#dc2626';
    BG_DEC_CTX.beginPath();
    BG_DEC_CTX.ellipse(0, 0, d.r * (d.stretch || 1.2), d.r * 0.9, 0, 0, 6.28);
    BG_DEC_CTX.fill();
    // Thick darker core
    BG_DEC_CTX.fillStyle = d.col || '#7f1d1d';
    BG_DEC_CTX.beginPath();
    BG_DEC_CTX.ellipse(0, 0, d.r * 0.65 * (d.stretch || 1.2), d.r * 0.6, 0, 0, 6.28);
    BG_DEC_CTX.fill();
    BG_DEC_CTX.restore();
  }
}

// Spawns a bloody footprint when walking through blood
function spawnFootprint(x, y, angle, side, col) {
  if (!isGoreEnabled()) return;
  const lateralOff = side * 5;
  const px = x + Math.cos(angle + 1.57) * lateralOff;
  const py = y + Math.sin(angle + 1.57) * lateralOff;
  FOOTPRINTS.push({
    x: px, y: py,
    ang: angle,
    col: col || 'rgba(127,29,29,0.4)',
    l: 6.0,
    maxL: 6.0
  });
  if (FOOTPRINTS.length > 50) FOOTPRINTS.shift();
}

// Updates all blood, gore, pool & decal simulation
function updateGoreSystem(dt) {
  // 1. In-flight droplets
  for (const b of BLD) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= 0.86;
    b.vy *= 0.86;
    b.l -= dt;
    if (b.l <= 0 || Math.hypot(b.vx, b.vy) < 8) {
      spawnGroundDecal(b.x, b.y, b.vx, b.vy, b.r, b.col, b.rimCol, b.type);
      b.l = -1;
    }
  }
  BLD = BLD.filter(b => b.l > 0);

  // 2. Streaks
  for (const s of STREAKS) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.82;
    s.vy *= 0.82;
    s.l -= dt;
  }
  STREAKS = STREAKS.filter(s => s.l > 0);

  // 3. Mist
  for (const m of MISTS) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vx *= 0.94;
    m.vy *= 0.94;
    m.r += dt * 8;
    m.l -= dt;
  }
  MISTS = MISTS.filter(m => m.l > 0);

  // 4. Expanding & drying pools under corpses
  for (const p of POOLS) {
    p.age += dt;
    if (p.r < p.maxR) {
      p.r = Math.min(p.maxR, p.r + dt * 4.5);
    }
  }
  POOLS = POOLS.filter(p => p.age < p.maxAge);

  // 5. Active decals fading
  for (const d of DEC) {
    d.l -= dt;
  }
  DEC = DEC.filter(d => d.l > 0);

  // 6. Footprints
  for (const f of FOOTPRINTS) {
    f.l -= dt;
  }
  FOOTPRINTS = FOOTPRINTS.filter(f => f.l > 0);

  // 7. Gibs tumble & friction
  for (const g of GIBS) {
    if (g.vx || g.vy) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.82;
      g.vy *= 0.82;
      g.rot += g.vrot * dt;
      g.vrot *= 0.85;
      if (Math.hypot(g.vx, g.vy) < 4) { g.vx = 0; g.vy = 0; }
    }
    g.l -= dt;
  }
  GIBS = GIBS.filter(g => g.l > 0);
}

// Renders the entire blood & gore ground pass
function renderGoreGroundPass(cx, cy, W, H) {
  // 1. Draw pre-baked background decal canvas
  if (BG_DEC_CANVAS) {
    X.drawImage(BG_DEC_CANVAS, 0, 0);
  }

  // 2. Draw drying/expanding blood pools
  for (const p of POOLS) {
    if (p.x < cx - 40 || p.x > cx + W + 40 || p.y < cy - 40 || p.y > cy + H + 40) continue;
    // Darken and dry over lifespan
    const dryPct = Math.min(1, p.age / 12);
    const alpha = Math.max(0.15, 1 - (p.age / p.maxAge));
    X.save();
    X.globalAlpha = alpha;
    // Outer thin rim
    X.fillStyle = p.rimCol || '#dc2626';
    X.beginPath();
    X.arc(p.x, p.y, p.r, 0, 6.28);
    X.fill();
    // Inner thick drying core
    X.fillStyle = dryPct > 0.5 ? '#110a0a' : (p.col || '#581111');
    X.beginPath();
    X.arc(p.x, p.y, p.r * 0.75, 0, 6.28);
    X.fill();
    X.restore();
  }

  // 3. Draw active dynamic decals
  for (const d of DEC) {
    if (d.x < cx - 30 || d.x > cx + W + 30 || d.y < cy - 30 || d.y > cy + H + 30) continue;
    const alpha = Math.min(0.85, d.l / 4);
    X.save();
    X.globalAlpha = alpha;
    X.translate(d.x, d.y);
    X.rotate(d.ang || 0);

    if (d.type === 'crystal') {
      // Frozen crystalline blood facets
      X.fillStyle = d.rimCol;
      X.beginPath();
      X.moveTo(-d.r, 0); X.lineTo(0, -d.r * 0.6); X.lineTo(d.r * 1.3, 0); X.lineTo(0, d.r * 0.6);
      X.closePath(); X.fill();
    } else {
      // Outer lighter rim
      X.fillStyle = d.rimCol;
      X.beginPath();
      X.ellipse(0, 0, d.r * (d.stretch || 1.1), d.r * 0.85, 0, 0, 6.28);
      X.fill();
      // Inner darker core
      X.fillStyle = d.col;
      X.beginPath();
      X.ellipse(0, 0, d.r * 0.65 * (d.stretch || 1.1), d.r * 0.55, 0, 0, 6.28);
      X.fill();
    }
    X.restore();
  }

  // 4. Draw bloody footprints
  for (const f of FOOTPRINTS) {
    if (f.x < cx - 20 || f.x > cx + W + 20 || f.y < cy - 20 || f.y > cy + H + 20) continue;
    X.save();
    X.globalAlpha = Math.min(0.45, f.l / f.maxL);
    X.translate(f.x, f.y);
    X.rotate(f.ang);
    X.fillStyle = f.col;
    X.beginPath();
    X.roundRect(-4, -2, 8, 4, 1.5);
    X.fill();
    X.restore();
  }

  // 5. Draw gibs on ground
  for (const g of GIBS) {
    if (g.x < cx - 20 || g.x > cx + W + 20 || g.y < cy - 20 || g.y > cy + H + 20) continue;
    X.save();
    X.translate(g.x, g.y);
    X.rotate(g.rot);
    // Shadow
    X.fillStyle = '#00000055';
    X.beginPath(); X.ellipse(2, 3, g.r, g.r * 0.6, 0, 0, 6.28); X.fill();
    // Meat chunk
    X.fillStyle = g.col;
    X.beginPath();
    X.roundRect(-g.r, -g.r * 0.7, g.r * 2, g.r * 1.4, 2);
    X.fill();
    X.fillStyle = '#f87171';
    X.fillRect(-g.r * 0.4, -g.r * 0.3, g.r * 0.8, g.r * 0.6);
    X.restore();
  }
}

// Renders in-flight droplets, streaks, and mist
function renderGoreAirPass(cx, cy, W, H) {
  // 1. Mist clouds
  for (const m of MISTS) {
    if (m.x < cx - 30 || m.x > cx + W + 30 || m.y < cy - 30 || m.y > cy + H + 30) continue;
    X.save();
    X.globalAlpha = Math.max(0, m.l / m.maxL) * 0.4;
    X.fillStyle = m.col;
    X.beginPath();
    X.arc(m.x, m.y, m.r, 0, 6.28);
    X.fill();
    X.restore();
  }

  // 2. High-velocity streaks
  for (const s of STREAKS) {
    if (s.x < cx - 30 || s.x > cx + W + 30 || s.y < cy - 30 || s.y > cy + H + 30) continue;
    X.save();
    X.globalAlpha = Math.max(0, s.l / s.maxL);
    X.strokeStyle = s.col;
    X.lineWidth = 1.8;
    X.beginPath();
    X.moveTo(s.x, s.y);
    X.lineTo(s.x - (s.vx * 0.035), s.y - (s.vy * 0.035));
    X.stroke();
    X.restore();
  }

  // 3. Droplets in flight
  for (const b of BLD) {
    if (b.x < cx - 20 || b.x > cx + W + 20 || b.y < cy - 20 || b.y > cy + H + 20) continue;
    X.fillStyle = b.col;
    X.beginPath();
    X.arc(b.x, b.y, b.r, 0, 6.28);
    X.fill();
  }
}
