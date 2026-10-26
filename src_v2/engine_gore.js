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

function clearGoreDecals() {
  BLD = [];
  STREAKS = [];
  MISTS = [];
  DEC = [];
  POOLS = [];
  FOOTPRINTS = [];
  GIBS = [];
  initDecalBakingCanvas();
}

// Surface-aware blood colour palettes based on active map.
// Deliberately desaturated, oxidised and slightly brown so sprays read as dark
// congealed fluid against the muted ground rather than bright cherry red.
function getBloodColors(curM) {
  if (curM === 3 || curM === 6) {
    // Toxic Swamp & Bio-Dome: caustic dark green/black bile
    return {
      core: '#12351f',
      rim: '#3f7a4c',
      pool: '#0c2818',
      mist: 'rgba(63,122,76,0.28)',
      gib: '#1b4526',
      type: 'toxic'
    };
  } else if (curM === 2) {
    // Frozen Peak: frozen, washed-out rust crystals
    return {
      core: '#5e2430',
      rim: '#a86a72',
      pool: '#4a1c26',
      mist: 'rgba(168,106,114,0.26)',
      gib: '#6d2a34',
      type: 'crystal'
    };
  } else if (curM === 4) {
    // Ashlands: scorched charred stains
    return {
      core: '#1a1614',
      rim: '#4e2a26',
      pool: '#151110',
      mist: 'rgba(78,42,38,0.3)',
      gib: '#2e1512',
      type: 'charred'
    };
  } else {
    // Standard: Downtown & Dust Bowl, oxidised maroon
    return {
      core: '#4a1c1c',
      rim: '#78352f',
      pool: '#361312',
      mist: 'rgba(120,53,47,0.3)',
      gib: '#57211c',
      type: 'blood'
    };
  }
}

// Pixel-art quantisation grid. Every gore primitive snaps to this lattice and
// is drawn as hard-edged blocks instead of smooth arcs, so blood matches the
// chunky sprite work rather than looking like an airbrushed overlay.
const GORE_PX = 3;
function pxSnap(v) { return Math.round(v / GORE_PX) * GORE_PX; }
function goreBlock(x, y, col, a) {
  X.globalAlpha = a;
  X.fillStyle = col;
  X.fillRect(pxSnap(x) - GORE_PX * 0.5, pxSnap(y) - GORE_PX * 0.5, GORE_PX, GORE_PX);
}
// Deterministic 2D hash so a splatter keeps its pixel pattern between frames.
function pxHash(x, y) {
  const n = Math.sin(pxSnap(x) * 12.9898 + pxSnap(y) * 78.233) * 43758.5453;
  return n - Math.floor(n);
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
    l: 12,
    maxL: 12,
    type: type || 'blood'
  });

  // Strictly enforce max active decals by fading oldest out cleanly
  const maxDecals = getQualityProfile().maxDecals;
  if (DEC.length > maxDecals) {
    const overflow = DEC.length - maxDecals;
    for (let i = 0; i < overflow; i++) {
      if (DEC[i]) DEC[i].l = Math.min(DEC[i].l, 1.2);
    }
    if (DEC.length > maxDecals + 30) {
      DEC.splice(0, DEC.length - maxDecals);
    }
  }
}

// Bakes or recycles oldest settled decals smoothly without permanent clutter
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
  pruneArr(BLD, b => b.l > 0);

  // 2. Streaks
  for (const s of STREAKS) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.82;
    s.vy *= 0.82;
    s.l -= dt;
  }
  pruneArr(STREAKS, s => s.l > 0);

  // 3. Mist
  for (const m of MISTS) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vx *= 0.94;
    m.vy *= 0.94;
    m.r += dt * 8;
    m.l -= dt;
  }
  pruneArr(MISTS, m => m.l > 0);

  // 4. Expanding & drying pools under corpses
  for (const p of POOLS) {
    p.age += dt;
    if (p.r < p.maxR) {
      p.r = Math.min(p.maxR, p.r + dt * 4.5);
    }
  }
  pruneArr(POOLS, p => p.age < p.maxAge);

  // 5. Active decals fading
  for (const d of DEC) {
    d.l -= dt;
  }
  pruneArr(DEC, d => d.l > 0);

  // 6. Footprints
  for (const f of FOOTPRINTS) {
    f.l -= dt;
  }
  pruneArr(FOOTPRINTS, f => f.l > 0);

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
  pruneArr(GIBS, g => g.l > 0);
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
    // Darken and dry over lifespan, then fade to zero opacity
    const dryPct = Math.min(1, p.age / 10);
    const timeLeft = Math.max(0, (p.maxAge || 18) - p.age);
    const alpha = Math.max(0, Math.min(0.85, timeLeft / 3.0));
    if (alpha <= 0.005) continue;
    X.save();
    // Stepped pixel disc instead of a smooth circle: walk the bounding box on
    // the 3px lattice and only paint cells inside the radius, with a jittered
    // rim so the pool edge is ragged rather than geometric.
    const pr = p.r;
    const core = dryPct > 0.5 ? '#171010' : (p.col || '#361312');
    for (let gy = -pr; gy <= pr; gy += GORE_PX) {
      for (let gx = -pr; gx <= pr; gx += GORE_PX) {
        const d = Math.hypot(gx, gy);
        if (d > pr) continue;
        const inner = d <= pr * 0.72 && pxHash(p.x + gx, p.y + gy) > 0.12;
        goreBlock(p.x + gx, p.y + gy, inner ? core : (p.rimCol || '#78352f'), alpha * (inner ? 1 : 0.85));
      }
    }
    X.restore();
  }

  // 3. Draw active dynamic decals
  for (const d of DEC) {
    if (d.x < cx - 30 || d.x > cx + W + 30 || d.y < cy - 30 || d.y > cy + H + 30) continue;
    const alpha = Math.max(0, Math.min(0.85, d.l / 2.5));
    if (alpha <= 0.005) continue;
    X.save();
    X.globalAlpha = alpha;
    X.translate(d.x, d.y);
    X.rotate(d.ang || 0);

    // Blocky splatter: lattice cells inside a stretched disc, with a ragged
    // edge and a darker core, so every landing reads as chunky pixel spray.
    const sx = d.r * (d.stretch || 1.1), sy = d.r * 0.85;
    for (let gy = -sy; gy <= sy; gy += GORE_PX) {
      for (let gx = -sx; gx <= sx; gx += GORE_PX) {
        const nrm = Math.hypot(gx / sx, gy / sy);
        if (nrm > 1) continue;
        const edge = nrm > 0.66;
        if (edge && pxHash(d.x + gx, d.y + gy) < 0.28) continue;
        X.globalAlpha = alpha * (edge ? 0.75 : 1);
        X.fillStyle = (edge || d.type === 'crystal') ? d.rimCol : d.col;
        // Local space: the context is already translated to (d.x, d.y).
        X.fillRect(pxSnap(gx) - GORE_PX * 0.5, pxSnap(gy) - GORE_PX * 0.5, GORE_PX, GORE_PX);
      }
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
    // Meat chunk: hard pixel block with a stepped highlight, no soft corners.
    const gw = Math.max(GORE_PX, pxSnap(g.r * 2)), gh = Math.max(GORE_PX, pxSnap(g.r * 1.4));
    X.fillStyle = g.col;
    X.fillRect(-gw * 0.5, -gh * 0.5, gw, gh);
    X.fillStyle = 'rgba(0,0,0,0.35)';
    X.fillRect(-gw * 0.5, gh * 0.5 - GORE_PX, gw, GORE_PX);
    X.fillStyle = 'rgba(214,180,150,0.35)';
    X.fillRect(-gw * 0.15, -gh * 0.25, Math.max(GORE_PX, pxSnap(gw * 0.3)), GORE_PX);
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

  // 3. Droplets in flight: square pixel chunks, not round blobs.
  X.save();
  for (const b of BLD) {
    if (b.x < cx - 20 || b.x > cx + W + 20 || b.y < cy - 20 || b.y > cy + H + 20) continue;
    X.globalAlpha = Math.max(0.25, Math.min(1, b.l / b.maxL));
    const sz = Math.max(GORE_PX, pxSnap(b.r * 1.6));
    X.fillStyle = b.rimCol || b.col;
    X.fillRect(pxSnap(b.x) - sz * 0.5, pxSnap(b.y) - sz * 0.5, sz, sz);
    if (sz > GORE_PX) {
      X.fillStyle = b.col;
      X.fillRect(pxSnap(b.x) - sz * 0.5 + 1, pxSnap(b.y) - sz * 0.5 + 1, sz - 2, sz - 2);
    }
  }
  X.restore();
}
