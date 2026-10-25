// DEAD ZONE v2.9.0 - DEPTH, LIGHTING & PARTICLE PRESENTATION
// Pure-canvas depth cues that the previous build was missing:
//   * cached soft sprites (contact shadows, light falloff) instead of per-frame gradients
//   * a y-sorted entity band so overlap order follows screen depth
//   * a half-resolution light-mask "darkness" pass with punched light pools
//   * additive light blits + a cheap downsample bloom + a per-sector colour grade
//   * the particle array (F) and ambient weather, both previously simulated but never drawn

/* ------------------------------------------------------------------ */
/* CACHED SOFT SPRITES                                                 */
/* ------------------------------------------------------------------ */
let SPRITE_SHADOW = null;
const SPRITE_LIGHTS = {};

function makeRadialSprite(size, stops) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const st of stops) grd.addColorStop(st[0], st[1]);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return cv;
}

function getShadowSprite() {
  if (!SPRITE_SHADOW) {
    SPRITE_SHADOW = makeRadialSprite(64, [
      [0, 'rgba(0,0,0,0.55)'],
      [0.5, 'rgba(0,0,0,0.30)'],
      [1, 'rgba(0,0,0,0)']
    ]);
  }
  return SPRITE_SHADOW;
}

function getLightSprite(col, soft) {
  const key = (col || '#ffffff') + (soft ? '_s' : '');
  if (!SPRITE_LIGHTS[key]) {
    const rgb = (typeof hexToRgbStr === 'function') ? hexToRgbStr(col || '#ffffff') : '255,255,255';
    SPRITE_LIGHTS[key] = makeRadialSprite(128, soft
      ? [[0, 'rgba(' + rgb + ',0.75)'], [0.35, 'rgba(' + rgb + ',0.4)'], [1, 'rgba(' + rgb + ',0)']]
      : [[0, 'rgba(' + rgb + ',0.98)'], [0.35, 'rgba(' + rgb + ',0.5)'], [0.7, 'rgba(' + rgb + ',0.14)'], [1, 'rgba(' + rgb + ',0)']]);
  }
  return SPRITE_LIGHTS[key];
}

/* ------------------------------------------------------------------ */
/* GRADIENT CACHE                                                      */
/* ------------------------------------------------------------------ */
// Static prop lights keep their world position for the whole run, so their
// gradients are built once instead of once per prop per frame.
const GRAD_CACHE = new Map();

function cachedRadialGradient(key, cx, cy, r0, r1, stops) {
  let g = GRAD_CACHE.get(key);
  if (!g) {
    g = X.createRadialGradient(cx, cy, r0, cx, cy, r1);
    for (const st of stops) g.addColorStop(st[0], st[1]);
    GRAD_CACHE.set(key, g);
  }
  return g;
}

let MUZZLE_GLOW = null;
function muzzleGlowGradient() {
  if (!MUZZLE_GLOW) {
    MUZZLE_GLOW = X.createRadialGradient(0, 0, 15, 140, 0, 260);
    MUZZLE_GLOW.addColorStop(0, 'rgba(255,250,220,0.2)');
    MUZZLE_GLOW.addColorStop(0.6, 'rgba(255,240,190,0.06)');
    MUZZLE_GLOW.addColorStop(1, 'rgba(255,240,190,0)');
  }
  return MUZZLE_GLOW;
}

let FLAME_MUZZLE_GLOW = null;
function flameMuzzleGradient() {
  if (!FLAME_MUZZLE_GLOW) {
    FLAME_MUZZLE_GLOW = X.createRadialGradient(20, 0, 4, 20, 0, 46);
    FLAME_MUZZLE_GLOW.addColorStop(0, 'rgba(255,220,120,0.85)');
    FLAME_MUZZLE_GLOW.addColorStop(0.5, 'rgba(255,140,40,0.35)');
    FLAME_MUZZLE_GLOW.addColorStop(1, 'rgba(255,120,20,0)');
  }
  return FLAME_MUZZLE_GLOW;
}

/* ------------------------------------------------------------------ */
/* CONTACT SHADOWS                                                     */
/* ------------------------------------------------------------------ */
// Soft, light-direction-aware ground shadow. `lift` 0 = grounded, 1 = airborne
// (separates and fades as the caster leaves the floor).
function contactShadow(x, y, r, lift) {
  if (!QUALITY_SETTINGS.screenShake && typeof SV !== 'undefined' && SV && SV.shadows === 0) return;
  const k = Math.max(0, Math.min(1, lift || 0));
  const lx = (typeof LIGHT_DIR !== 'undefined' && LIGHT_DIR) ? LIGHT_DIR.x : 0.7071;
  const ly = (typeof LIGHT_DIR !== 'undefined' && LIGHT_DIR) ? LIGHT_DIR.y : 0.7071;
  const rx = r * (1.15 + k * 0.7), ry = r * (0.8 + k * 0.15);
  const ox = lx * (4 + k * 12), oy = ly * (5 + k * 15);
  X.save();
  const outer = X.globalAlpha;
  X.globalAlpha = (isFinite(outer) ? outer : 1) * (1 - k * 0.6);
  X.drawImage(getShadowSprite(), x - rx + ox, y - ry + oy, rx * 2, ry * 2);
  X.restore();
}

/* ------------------------------------------------------------------ */
/* PARTICLE PASS (F)                                                   */
/* ------------------------------------------------------------------ */
// F is simulated in engine_world.update(); this is the draw half that never existed.
function renderParticles(cx, cy, W, H) {
  if (typeof F === 'undefined' || !F.length) return;
  const profile = getQualityProfile();
  const maxP = typeof getMaxParticles === 'function' ? getMaxParticles() : 250;

  // Emissive sparks first, additively, so they bloom against the dark ground.
  // Capped at the profile budget: update() already trims F, this keeps the draw
  // pass honest if a caller ever pushes after the trim.
  const nP = Math.min(F.length, maxP);
  let additive = false;
  X.save();
  for (let i = 0; i < nP; i++) {
    const f = F[i];
    if (f.x < cx - 40 || f.x > cx + W + 40 || f.y < cy - 40 || f.y > cy + H + 40) continue;
    const want = f.fr ? 1 : 0;
    if (want !== additive) {
      X.restore();
      additive = !!want;
      X.save();
      if (additive) X.globalCompositeOperation = 'lighter';
    }
    const alpha = Math.max(0, Math.min(1, f.l / 0.6));
    if (alpha <= 0.01) continue;
    const sz = (f.s || 3.5) * (0.45 + alpha * 0.75);
    X.globalAlpha = additive ? alpha * 0.9 : alpha;
    X.fillStyle = f.c || '#ddd';
    if (additive) {
      X.drawImage(getLightSprite(f.c || '#ffd86b', true), f.x - sz * 2.4, f.y - sz * 2.4, sz * 4.8, sz * 4.8);
      X.fillStyle = '#ffffff';
      X.globalAlpha = alpha * 0.5;
      X.beginPath(); X.arc(f.x, f.y, sz * 0.42, 0, 6.28); X.fill();
    } else {
      // Tumbling debris chip with a short velocity smear
      X.beginPath();
      X.moveTo(f.x - f.vx * 0.012, f.y - f.vy * 0.012);
      X.lineTo(f.x + sz * 0.6, f.y - sz * 0.6);
      X.lineTo(f.x - sz * 0.4, f.y + sz * 0.55);
      X.closePath(); X.fill();
    }
  }
  X.restore();
}

/* ------------------------------------------------------------------ */
/* AMBIENT WEATHER                                                     */
/* ------------------------------------------------------------------ */
const WEATHER = [
  { type: 'rain',   count: 34, vx: -30, vy: 320, col: 'rgba(180,200,215,0.5)', sz: 1.6 },
  { type: 'dust',   count: 30, vx: 42,  vy: -6,  col: 'rgba(196,158,96,0.35)', sz: 2.2 },
  { type: 'snow',   count: 34, vx: 14,  vy: 46,  col: 'rgba(240,250,255,0.7)',  sz: 2.4 },
  { type: 'spore',  count: 32, vx: 10,  vy: 16,  col: 'rgba(120,240,140,0.4)',  sz: 2.0 },
  { type: 'ember',  count: 30, vx: 8,   vy: -34, col: 'rgba(255,140,60,0.6)',   sz: 1.8 },
  { type: 'spark',  count: 26, vx: -18, vy: 22,  col: 'rgba(0,229,255,0.5)',    sz: 1.7 },
  { type: 'spore',  count: 34, vx: -12, vy: -14, col: 'rgba(0,255,136,0.4)',    sz: 2.1 }
];

function initAmbient(mapIndex) {
  AMB_PARTICLES = [];
  const w = WEATHER[mapIndex] || WEATHER[0];
  const prof = getQualityProfile();
  const n = Math.round(w.count * (prof.ambientCount / 36));
  for (let i = 0; i < n; i++) {
    AMB_PARTICLES.push({
      x: Math.random() * WS, y: Math.random() * WS, z: Math.random(),
      vx: w.vx * (0.6 + Math.random() * 0.8), vy: w.vy * (0.6 + Math.random() * 0.8),
      sz: w.sz * (0.6 + Math.random() * 0.9), a: 0.25 + Math.random() * 0.6,
      ph: Math.random() * 6.28, type: w.type, col: w.col
    });
  }
}

function updateAmbient(dt) {
  if (!AMB_PARTICLES.length) return;
  for (const p of AMB_PARTICLES) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.ph += dt * 2.2;
    if (p.x < -20) p.x = WS + 20; else if (p.x > WS + 20) p.x = -20;
    if (p.y < -20) p.y = WS + 20; else if (p.y > WS + 20) p.y = -20;
  }
}

function renderAmbient(cx, cy, W, H) {
  if (!AMB_PARTICLES.length) return;
  X.save();
  for (const p of AMB_PARTICLES) {
    if (p.x < cx - 30 || p.x > cx + W + 30 || p.y < cy - 30 || p.y > cy + H + 30) continue;
    const sway = Math.sin(p.ph) * 6;
    X.globalAlpha = p.a;
    X.strokeStyle = p.col;
    X.fillStyle = p.col;
    if (p.type === 'rain' || p.type === 'spark') {
      X.lineWidth = p.sz * 0.8;
      X.beginPath();
      X.moveTo(p.x, p.y);
      X.lineTo(p.x - p.vx * 0.02 + sway * 0.1, p.y - p.vy * 0.02);
      X.stroke();
    } else {
      X.beginPath(); X.arc(p.x + sway, p.y, p.sz, 0, 6.28); X.fill();
    }
  }
  X.restore();
}

/* ------------------------------------------------------------------ */
/* Y-SORTED ENTITY BAND                                                */
/* ------------------------------------------------------------------ */
// Turrets, zombies and the player used to be painted in three fixed bands, so a
// zombie standing below the player was always drawn behind him. The band keeps
// one list, sorts it by foot position and paints back-to-front.
// Persistent band scratch: entry objects are recycled every frame instead of
// allocating a fresh array of wrappers, and anything well outside the camera
// rect is skipped so draw cost tracks what is actually on screen.
const BAND_LIST = [];
let BAND_N = 0;

function bandPush(y, k, o) {
  let e = BAND_LIST[BAND_N];
  if (!e) e = { y: 0, k: 0, o: null };
  BAND_LIST[BAND_N] = e;
  BAND_N++;
  e.y = y; e.k = k; e.o = o;
}

function drawEntityBand() {
  BAND_N = 0;
  const haveCam = typeof CX === 'number' && typeof CY === 'number' && typeof W === 'number' && typeof H === 'number' && W > 0 && H > 0;
  const mx = haveCam ? CX - 140 : -Infinity, my = haveCam ? CY - 140 : -Infinity;
  const mx2 = haveCam ? CX + W + 140 : Infinity, my2 = haveCam ? CY + H + 140 : Infinity;

  if (typeof TR !== 'undefined' && TR) {
    for (let i = 0; i < TR.length; i++) {
      const t = TR[i];
      const ty = t.y || 0;
      if (t.x < mx || t.x > mx2 || ty < my || ty > my2) continue;
      bandPush(ty, 0, t);
    }
  }
  if (typeof Z !== 'undefined' && Z) {
    for (let i = 0; i < Z.length; i++) {
      const z = Z[i];
      if (z.dead) continue;
      const zy = z.y || 0;
      if (z.x < mx || z.x > mx2 || zy < my || zy > my2) continue;
      bandPush(zy, 1, z);
    }
  }
  if (typeof P !== 'undefined' && P) bandPush(P.y || 0, 2, P);

  // Writing index BAND_N-1 may have lengthened the array, so clamp it back down
  // to drop entries left over from a busier frame.
  BAND_LIST.length = BAND_N;

  const list = BAND_LIST;
  const n = BAND_N;
  if (n > 1) {
    // Insertion sort: band sizes are tiny (dozens) and this keeps the frame
    // allocation-free while staying near-linear on nearly-sorted input.
    for (let i = 1; i < n; i++) {
      const cur = list[i];
      let j = i - 1;
      while (j >= 0 && list[j].y > cur.y) { list[j + 1] = list[j]; j--; }
      list[j + 1] = cur;
    }
  }

  for (let i = 0; i < n; i++) {
    const e = list[i];
    if (e.k === 0) { if (typeof drawTurret === 'function') drawTurret(e.o); }
    else if (e.k === 1) { if (typeof drawZombie === 'function') drawZombie(e.o); }
    else if (e.k === 2) { if (typeof drawPlayerEntity === 'function') drawPlayerEntity(); }
  }
}

/* ------------------------------------------------------------------ */
/* SECTOR MOOD (ambient darkness + colour grade)                       */
/* ------------------------------------------------------------------ */
const MAP_MOOD = [
  { amb: 0.36, tint: '#2a3a4a', ta: 0.10 }, // Downtown
  { amb: 0.16, tint: '#c08a3a', ta: 0.13 }, // Dust Bowl
  { amb: 0.24, tint: '#7fb6d8', ta: 0.15 }, // Frozen Peak
  { amb: 0.40, tint: '#4adf6a', ta: 0.12 }, // Toxic Swamp
  { amb: 0.46, tint: '#ff5a22', ta: 0.10 }, // Ashlands
  { amb: 0.50, tint: '#00e5ff', ta: 0.09 }, // Neon Lab
  { amb: 0.42, tint: '#00ff88', ta: 0.10 }  // Bio-Dome
];

let DARK_CV = null, DARK_CTX = null, DARK_W = 0, DARK_H = 0;
let BLOOM_CV = null, BLOOM_CTX = null, BLOOM_W = 0, BLOOM_H = 0;

function ensureDarkLayer(w, h) {
  const sw = Math.max(2, Math.round(w / 2)), sh = Math.max(2, Math.round(h / 2));
  if (!DARK_CV) {
    DARK_CV = document.createElement('canvas');
    DARK_CTX = DARK_CV.getContext('2d');
    DARK_CV.width = sw; DARK_CV.height = sh; DARK_W = sw; DARK_H = sh;
  } else if (DARK_W !== sw || DARK_H !== sh) {
    DARK_CV.width = sw; DARK_CV.height = sh; DARK_W = sw; DARK_H = sh;
  }
}

function ensureBloomLayer(w, h) {
  const sw = Math.max(2, Math.round(w / 4)), sh = Math.max(2, Math.round(h / 4));
  if (!BLOOM_CV) {
    BLOOM_CV = document.createElement('canvas');
    BLOOM_CTX = BLOOM_CV.getContext('2d');
    BLOOM_CV.width = sw; BLOOM_CV.height = sh; BLOOM_W = sw; BLOOM_H = sh;
  } else if (BLOOM_W !== sw || BLOOM_H !== sh) {
    BLOOM_CV.width = sw; BLOOM_CV.height = sh; BLOOM_W = sw; BLOOM_H = sh;
  }
}

function getMapMood() {
  const m = (typeof getCurMap === 'function') ? getCurMap() : 0;
  return MAP_MOOD[m] || MAP_MOOD[0];
}

// Collects every world-space light for the current frame: torch, muzzle, lamps,
// props, hazards, beacons, explosions and off-screen-visible power-up drops.
function collectLights(cx, cy, W, H) {
  const out = [];
  const inView = (x, y, r) => (x + r > cx && x - r < cx + W && y + r > cy && y - r < cy + H);

  if (typeof P !== 'undefined' && P && P.hp > 0) {
    out.push({ x: P.x + Math.cos(P.a) * 26, y: P.y + Math.sin(P.a) * 26, r: 250, col: '#ffe9b8', a: 1.0 });
    if (P.fl > 0) {
      const m = (typeof ML !== 'undefined' && ML[P.cur]) ? ML[P.cur] * 0.87 : 45;
      out.push({ x: P.x + Math.cos(P.a) * m, y: P.y + Math.sin(P.a) * m, r: 230, col: '#fff2c0', a: 0.95 });
    }
  }

  const curM = (typeof getCurMap === 'function') ? getCurMap() : 0;
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : null;
  if (mapDef && mapDef.props) {
    for (const pr of mapDef.props) {
      if (!inView(pr.x, pr.y, 260)) continue;
      if (pr.type === 'lamp') out.push({ x: pr.x, y: pr.y, r: 165, col: '#ffd9a0', a: 0.9 });
      else if (pr.type === 'glowing_puddle') out.push({ x: pr.x, y: pr.y, r: 130, col: '#4ade80', a: 0.6 });
      else if (pr.type === 'ice_patch') out.push({ x: pr.x, y: pr.y, r: 110, col: '#a8e4ff', a: 0.4 });
      else if (pr.type === 'server_rack') out.push({ x: pr.x, y: pr.y, r: 74, col: '#22c55e', a: 0.5 });
    }
  }

  if (typeof HZ !== 'undefined') {
    for (const h of HZ) {
      if (!inView(h.x, h.y, h.r * 2)) continue;
      out.push({ x: h.x, y: h.y, r: h.r * 2.1, col: '#ff6a3a', a: 0.42 });
    }
  }
  if (typeof ACID_PUDDLES !== 'undefined') {
    for (const ap of ACID_PUDDLES) {
      if (!inView(ap.x, ap.y, ap.r * 2)) continue;
      out.push({ x: ap.x, y: ap.y, r: ap.r * 1.9, col: '#86efac', a: 0.4 });
    }
  }
  if (typeof D !== 'undefined') {
    for (const d of D) {
      if (d.sup) { if (inView(d.x, d.y, 300)) out.push({ x: d.x, y: d.y, r: 190, col: '#38bdf8', a: 0.95 }); }
      else if (d.k === 'pu' && inView(d.x, d.y, 160)) {
        const def = (typeof PU_DEFS !== 'undefined') ? PU_DEFS[d.v] : null;
        out.push({ x: d.x, y: d.y, r: 130, col: (def && def.col) || '#c084fc', a: 0.8 });
      }
    }
  }
  if (typeof CH !== 'undefined') {
    for (const c of CH) if (inView(c.x, c.y, 140)) out.push({ x: c.x, y: c.y, r: 120, col: '#ffd36b', a: 0.7 });
  }
  if (typeof RG !== 'undefined') {
    for (const r of RG) out.push({ x: r.x, y: r.y, r: r.r * 2.4, col: '#ffbb66', a: Math.max(0, Math.min(1, r.l)) * 0.85 });
  }
  return out;
}

// Screen-space pass: darkness mask -> additive light -> bloom -> colour grade.
function renderLightingPass(cx, cy, W, H) {
  const profile = getQualityProfile();
  const mood = getMapMood();
  const lights = (typeof P !== 'undefined' && P) ? collectLights(cx, cy, W, H) : [];
  const blackout = (typeof S !== 'undefined' && S && S.dark) ? S.dark : 0;
  const amb = Math.max(0, mood.amb * (1 - blackout * 0.55));

  if (profile.dynamicLights && amb > 0.02) {
    ensureDarkLayer(W, H);
    DARK_CTX.setTransform(1, 0, 0, 1, 0, 0);
    DARK_CTX.globalCompositeOperation = 'source-over';
    DARK_CTX.clearRect(0, 0, DARK_W, DARK_H);
    DARK_CTX.fillStyle = 'rgba(5,8,16,' + amb.toFixed(3) + ')';
    DARK_CTX.fillRect(0, 0, DARK_W, DARK_H);

    // Punch soft holes: destination-out with the cached white falloff sprite.
    DARK_CTX.globalCompositeOperation = 'destination-out';
    const hole = getLightSprite('#ffffff', false);
    for (const L of lights) {
      const sx = (L.x - cx) / 2, sy = (L.y - cy) / 2, sr = L.r / 2;
      if (sx + sr < -8 || sx - sr > DARK_W + 8 || sy + sr < -8 || sy - sr > DARK_H + 8) continue;
      DARK_CTX.globalAlpha = Math.max(0, Math.min(1, L.a));
      DARK_CTX.drawImage(hole, sx - sr, sy - sr, sr * 2, sr * 2);
    }
    DARK_CTX.globalAlpha = 1;
    DARK_CTX.globalCompositeOperation = 'source-over';

    X.drawImage(DARK_CV, 0, 0, W, H);

    // Warm additive light sprites on top of the mask (only the coloured ones).
    X.save();
    X.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const sr = L.r;
      if (L.x + sr < cx || L.x - sr > cx + W || L.y + sr < cy || L.y - sr > cy + H) continue;
      X.globalAlpha = Math.max(0, Math.min(0.5, L.a * 0.42));
      X.drawImage(getLightSprite(L.col, false), L.x - sr, L.y - sr, sr * 2, sr * 2);
    }
    X.restore();
  }

  // Cheap downsample bloom: blur the frame, add it back additively.
  if (getQuality() === 'high' && QUALITY_SETTINGS.screenShake && !isReducedMotion()) {
    try {
      ensureBloomLayer(W, H);
      BLOOM_CTX.setTransform(1, 0, 0, 1, 0, 0);
      BLOOM_CTX.clearRect(0, 0, BLOOM_W, BLOOM_H);
      BLOOM_CTX.drawImage(C, 0, 0, BLOOM_W, BLOOM_H);
      X.save();
      X.globalCompositeOperation = 'lighter';
      X.globalAlpha = 0.17;
      X.drawImage(BLOOM_CV, 0, 0, W, H);
      X.restore();
    } catch (e) { /* bloom is cosmetic - never break the frame for it */ }
  }

  // Per-sector colour grade
  X.save();
  X.globalCompositeOperation = 'overlay';
  X.globalAlpha = mood.ta;
  X.fillStyle = mood.tint;
  X.fillRect(0, 0, W, H);
  X.restore();
  X.globalAlpha = 1;
  X.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------------ */
/* VISUAL DEPTH: PARALLAX GROUND SCATTER                               */
/* ------------------------------------------------------------------ */
// A slow-scrolling detail layer sitting under the real ground art. Because it
// tracks the camera at 55%, nearby props slide past it and the arena gains a
// convincing sense of height without any extra geometry or collision cost.
const PARALLAX_FACTOR = 0.55;
const PARALLAX_INV = 1 - PARALLAX_FACTOR;
const PARALLAX_CELL = 92;

function parallaxHash(ix, iy) {
  // Stable per-cell pseudo-random so scatter never shimmers as the camera pans.
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function renderParallax(cx, cy, W, H, mapDef) {
  if (typeof getQualityProfile === 'function') {
    const q = getQualityProfile();
    if (q && (q.name === 'low' || q.level === 0)) return;
  }
  const ox = cx * PARALLAX_INV;
  const oy = cy * PARALLAX_INV;
  const x0 = Math.floor((cx - ox - PARALLAX_CELL) / PARALLAX_CELL);
  const x1 = Math.ceil((cx - ox + W + PARALLAX_CELL) / PARALLAX_CELL);
  const y0 = Math.floor((cy - oy - PARALLAX_CELL) / PARALLAX_CELL);
  const y1 = Math.ceil((cy - oy + H + PARALLAX_CELL) / PARALLAX_CELL);
  // Guard against absurd camera values producing an unbounded loop.
  if (!isFinite(x0) || !isFinite(x1) || !isFinite(y0) || !isFinite(y1)) return;
  if ((x1 - x0) * (y1 - y0) > 900) return;

  const pebble = (mapDef && mapDef.pebble) || 'rgba(255,255,255,0.055)';
  const crack = (mapDef && mapDef.crack) || 'rgba(0,0,0,0.16)';

  X.save();
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      const h = parallaxHash(ix, iy);
      if (h > 0.42) continue;                       // sparse scatter
      const px = ix * PARALLAX_CELL + h * 61 + ox;
      const py = iy * PARALLAX_CELL + ((h * 977) % 1) * 71 + oy;
      const kind = h * 10 | 0;
      if (kind < 6) {                               // pebble / rubble chip
        const s = 1.1 + h * 2.2;
        X.fillStyle = pebble;
        X.beginPath(); X.ellipse(px, py, s, s * 0.62, h * 3.1, 0, 6.28); X.fill();
      } else {                                      // hairline crack in the slab
        X.strokeStyle = crack;
        X.lineWidth = 1;
        X.beginPath();
        X.moveTo(px, py);
        X.lineTo(px + 6 + h * 14, py + (h - 0.5) * 16);
        X.lineTo(px + 12 + h * 20, py + (h - 0.5) * 26);
        X.stroke();
      }
    }
  }
  X.restore();
}

/* ------------------------------------------------------------------ */
/* VISUAL DEPTH: ATMOSPHERIC EDGE FOG                                  */
/* ------------------------------------------------------------------ */
// Screen-space haze that thickens toward the frame edge. It reads as distance
// and also softens the hard rectangle where the arena meets the viewport.
let FOG_GRAD = null, FOG_W = 0, FOG_H = 0, FOG_TINT = '';

function renderDepthFog(cx, cy, W, H) {
  if (typeof getQualityProfile === 'function') {
    const q = getQualityProfile();
    if (q && (q.name === 'low' || q.level === 0)) return;
  }
  const mood = (typeof getMapMood === 'function') ? getMapMood() : null;
  const tint = (mood && mood.tint) ? mood.tint : '#0b1220';
  const key = W + 'x' + H + tint;
  if (!FOG_GRAD || FOG_W !== W || FOG_H !== H || FOG_TINT !== key) {
    const cxg = W * 0.5, cyg = H * 0.5;
    const g = X.createRadialGradient(cxg, cyg, Math.min(W, H) * 0.30, cxg, cyg, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0.10)');
    g.addColorStop(1, 'rgba(4,7,14,0.42)');
    FOG_GRAD = g; FOG_W = W; FOG_H = H; FOG_TINT = key;
  }
  X.save();
  X.globalCompositeOperation = 'source-over';
  X.globalAlpha = 1;
  X.fillStyle = FOG_GRAD;
  X.fillRect(0, 0, W, H);
  // A whisper of sector colour riding on top of the darkening keeps the haze
  // from reading as a flat black frame.
  X.globalCompositeOperation = 'overlay';
  X.globalAlpha = 0.06;
  X.fillStyle = tint;
  X.fillRect(0, 0, W, H);
  X.restore();
  X.globalAlpha = 1;
  X.globalCompositeOperation = 'source-over';
}
