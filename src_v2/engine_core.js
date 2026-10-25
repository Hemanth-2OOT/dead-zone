/* === CORE ENGINE, CANVAS POLYFILLS & AUDIO ENGINE === */

// On-screen error overlay for Step 0 bug reproduction
(function() {
  function showError(msg, file, line, col, err) {
    console.error('[DeadZone Runtime Error]', msg, file, line, col, err);
    let box = document.getElementById('debug-err-overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = 'debug-err-overlay';
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;max-height:45vh;overflow-y:auto;background:rgba(200,20,20,0.95);color:#fff;font-family:monospace;font-size:12px;padding:10px;z-index:999999;pointer-events:auto;border-bottom:2px solid #fff;white-space:pre-wrap;';
      if (document.body) {
        document.body.appendChild(box);
      } else {
        window.addEventListener('DOMContentLoaded', () => document.body && document.body.appendChild(box));
      }
    }
    const stack = (err && err.stack) ? err.stack : `${file}:${line}:${col}`;
    const p = document.createElement('div');
    p.style.cssText = 'margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.4);padding-bottom:4px;';
    p.textContent = `[ERROR] ${msg}\nAt: ${stack}`;
    box.appendChild(p);
  }
  window.onerror = function(msg, file, line, col, err) {
    showError(msg, file, line, col, err);
  };
  window.onunhandledrejection = function(e) {
    showError(e.reason ? (e.reason.message || e.reason) : 'Unhandled Rejection', '', '', '', e.reason);
  };
})();

if (typeof CanvasRenderingContext2D !== 'undefined') {
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
      if (!radii) radii = 0;
      let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? (radii[0] || 0) : 0);
      r = Math.min(Math.max(0, r), Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }
  const _origEllipse = CanvasRenderingContext2D.prototype.ellipse;
  CanvasRenderingContext2D.prototype.ellipse = function(x, y, rx, ry, rot, sa, ea, acw) {
    rx = Math.max(0.1, Math.abs(rx || 0));
    ry = Math.max(0.1, Math.abs(ry || 0));
    if (_origEllipse) {
      try {
        return _origEllipse.call(this, x, y, rx, ry, rot || 0, sa || 0, ea != null ? ea : 6.28318, !!acw);
      } catch (e) {}
    }
    this.save();
    this.translate(x, y);
    this.rotate(rot || 0);
    this.scale(rx, ry);
    this.arc(0, 0, 1, sa || 0, ea != null ? ea : 6.28318, !!acw);
    this.restore();
    return this;
  };
  const _origFillRect = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
    if (w === undefined) w = 0; if (h === undefined) h = w;
    return _origFillRect.call(this, x || 0, y || 0, w || 0, h || 0);
  };
}

const C = document.getElementById('c');
let X = C.getContext('2d'), X0 = X, W, H, DPR = 1;
function rs() {
  DPR = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1, 2);
  W = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : (typeof innerWidth !== 'undefined' ? innerWidth : 800);
  H = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : (typeof innerHeight !== 'undefined' ? innerHeight : 600);
  C.width = W * DPR;
  C.height = H * DPR;
  X.resetTransform && X.resetTransform();
  X.scale(DPR, DPR);
}
addEventListener('resize', rs);
rs();

const WS = 2400;
const $ = id => document.getElementById(id);
let MUTE = 0, PC = '#d8c9a0';
let run = 0, SH = 0, HIT_STOP = 0, HIT_STOP_TIMER = 0, HURT_VIGNETTE_TIMER = 0;
let HUD_BOUNCE = 1;

// Global Lighting Vector (Top-Left Light Source, all shadows cast to bottom-right)
const LIGHT_DIR = { x: 0.7071, y: 0.7071 };

// Quality & Performance Settings (OPTS)
const QUALITY_SETTINGS = {
  profile: 'high',
  screenShake: true,
  goreLevel: 'full',
  decalCap: 140
};

function setQualityProfile(profile) {
  QUALITY_SETTINGS.profile = profile;
  if (profile === 'low') {
    QUALITY_SETTINGS.decalCap = 40;
  } else if (profile === 'med') {
    QUALITY_SETTINGS.decalCap = 80;
  } else {
    QUALITY_SETTINGS.decalCap = 140;
  }
}

const QUALITY_PROFILES = {
  high: { maxDecals: 300, maxBlood: 20, maxMist: 16, dynamicLights: true, ambientCount: 36, shadowBlur: true },
  med:  { maxDecals: 160, maxBlood: 12, maxMist: 8,  dynamicLights: true, ambientCount: 20, shadowBlur: false },
  low:  { maxDecals: 80,  maxBlood: 6,  maxMist: 0,  dynamicLights: false, ambientCount: 10, shadowBlur: false }
};

function getQuality() {
  return (typeof SV !== 'undefined' && SV && SV.quality) ? SV.quality : 'high';
}
function getQualityProfile() {
  return QUALITY_PROFILES[getQuality()] || QUALITY_PROFILES.high;
}
function isReducedMotion() {
  return Boolean(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function isShakeEnabled() {
  if (isReducedMotion()) return false;
  if (!QUALITY_SETTINGS.screenShake) return false;
  return (typeof SV !== 'undefined' && SV && SV.shake != null) ? Boolean(SV.shake) : true;
}

function isGoreEnabled() {
  if (QUALITY_SETTINGS.goreLevel === 'minimal') return false;
  return (typeof SV !== 'undefined' && SV && SV.gore != null) ? Boolean(SV.gore) : true;
}

function getMaxDecals() {
  if (QUALITY_SETTINGS.profile === 'low') return 60;
  if (QUALITY_SETTINGS.profile === 'med') return 160;
  return 300;
}

function getMaxParticles() {
  if (QUALITY_SETTINGS.profile === 'low') return 60;
  if (QUALITY_SETTINGS.profile === 'med') return 140;
  return 250;
}

function getMaxBloodDrops() {
  if (QUALITY_SETTINGS.profile === 'low') return 25;
  if (QUALITY_SETTINGS.profile === 'med') return 60;
  return 120;
}

// Runtime Performance & FPS Monitor (Active on Low profile or low-spec devices)
let CURRENT_FPS = 60;
let FPS_SMOOTH = 60;
let LOW_FPS_TIME = 0;

function updateFPSMonitor(dt) {
  if (!dt || dt <= 0) return;
  const instantFps = Math.min(120, 1 / dt);
  FPS_SMOOTH = FPS_SMOOTH * 0.92 + instantFps * 0.08;
  CURRENT_FPS = Math.round(FPS_SMOOTH);
  if (QUALITY_SETTINGS.profile === 'low' || CURRENT_FPS < 35) {
    LOW_FPS_TIME += dt;
    if (LOW_FPS_TIME > 2.5) {
      if (typeof F !== 'undefined' && F.length > 30) F.splice(0, F.length - 30);
      if (typeof DEC !== 'undefined' && DEC.length > 40) DEC.splice(0, DEC.length - 40);
      if (typeof BLD !== 'undefined' && BLD.length > 15) BLD.splice(0, BLD.length - 15);
      LOW_FPS_TIME = 0;
    }
  } else {
    LOW_FPS_TIME = Math.max(0, LOW_FPS_TIME - dt);
  }
}

// Audio Engine with Chained Pitch Shifting
let AC = null;
function ac() {
  if (!AC) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) AC = new AudioCtx();
    } catch (e) {}
  }
  if (AC && AC.state === 'suspended') {
    AC.resume().catch(() => {});
  }
  return AC;
}

function snd(f, d, t, v, s) {
  if (MUTE || !ac()) return;
  try {
    const n = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = t || 'square';
    o.frequency.setValueAtTime(f, n);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f * (s || 0.5)), n + d);
    g.gain.setValueAtTime(v || 0.05, n);
    g.gain.exponentialRampToValueAtTime(0.001, n + d);
    o.connect(g);
    g.connect(AC.destination);
    o.start();
    o.stop(n + d);
  } catch (e) {}
}

function noise(d, v) {
  if (MUTE || !ac()) return;
  try {
    const n = AC.currentTime, len = Math.floor(AC.sampleRate * d);
    if (len < 1) return;
    const b = AC.createBuffer(1, len, AC.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < len; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = b;
    g.gain.value = v || 0.08;
    s.connect(g);
    g.connect(AC.destination);
    s.start();
  } catch (e) {}
}

let LAST_PICKUP_TIME = 0;
let PICKUP_CHAIN = 0;
function sndPickup(type) {
  const now = Date.now();
  if (now - LAST_PICKUP_TIME < 850) {
    PICKUP_CHAIN = Math.min(8, PICKUP_CHAIN + 1);
  } else {
    PICKUP_CHAIN = 0;
  }
  LAST_PICKUP_TIME = now;
  const pitchMult = 1 + PICKUP_CHAIN * 0.12;
  const baseFreq = type === 'c' ? 520 : (type === 'h' ? 620 : 440);
  snd(baseFreq * pitchMult, 0.09, 'triangle', 0.08, 1.25);
  setTimeout(() => { snd(baseFreq * 1.5 * pitchMult, 0.07, 'sine', 0.05, 1.5); }, 45);
}

function sndReloadStart() {
  snd(380, 0.09, 'triangle', 0.08, 0.4);
  setTimeout(() => { snd(220, 0.12, 'square', 0.06, 0.5); }, 110);
}
function sndReloadEnd() {
  snd(460, 0.08, 'triangle', 0.07, 1.4);
  setTimeout(() => { snd(640, 0.1, 'sawtooth', 0.08, 0.8); }, 80);
}
function sndTurretFire() {
  noise(0.08, 0.07);
  snd(260, 0.06, 'sawtooth', 0.05, 0.3);
}

function sfx(i) {
  if (i == 2) noise(0.18, 0.12);
  else if (i == 7) noise(0.25, 0.14);
  else if (i == 9) snd(110, 0.3, 'sawtooth', 0.1, 0.3);
  else if (i == 8 || i == 11) snd(900, 0.12, 'sine', 0.06, 0.3);
  else if (i == 10) noise(0.08, 0.05);
  else if (i == 12) { noise(0.15, 0.12); snd(160, 0.2, 'sine', 0.08, 0.3); }
  else if (i == 13) { noise(0.09, 0.07); snd(780, 0.14, 'triangle', 0.05, 1.2); }
  else if (i == 14) { snd(1150, 0.24, 'sawtooth', 0.13, 0.1); noise(0.18, 0.14); }
  else noise(0.07, 0.06);
}

// Math and Geometry Helpers
function lineBox(x1, y1, x2, y2, bx, by, bw, bh) {
  let dx = x2 - x1, dy = y2 - y1, p = [-dx, dx, -dy, dy], q = [x1 - bx, (bx + bw) - x1, y1 - by, (by + bh) - y1], u1 = 0, u2 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      let t = q[i] / p[i];
      if (p[i] < 0) { if (t > u2) return false; if (t > u1) u1 = t; }
      else { if (t < u1) return false; if (t < u2) u2 = t; }
    }
  }
  return u1 <= u2;
}

function hasLOS(x1, y1, x2, y2) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2), minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  for (let i = 0; i < O.length; i++) {
    const o = O[i];
    if (maxX < o.x || minX > o.x + o.w || maxY < o.y || minY > o.y + o.h) continue;
    if (lineBox(x1, y1, x2, y2, o.x, o.y, o.w, o.h)) return false;
  }
  return true;
}

function sanitizePlayer() {
  if (!P) return false;
  let rec = false;
  if (!isFinite(P.x) || !isFinite(P.y) || P.x < 16 || P.x > WS - 16 || P.y < 16 || P.y > WS - 16) {
    P.x = isFinite(P.safeX) ? P.safeX : WS / 2;
    P.y = isFinite(P.safeY) ? P.safeY : WS / 2;
    rec = true;
  }
  if (!isFinite(P.a)) {
    P.a = isFinite(P.safeA) ? P.safeA : 0;
    rec = true;
  }
  if (!isFinite(P.lx) || !isFinite(P.ly) || Math.hypot(P.lx, P.ly) < 0.1) {
    P.lx = 1; P.ly = 0;
  }
  P.x = Math.max(16, Math.min(WS - 16, P.x));
  P.y = Math.max(16, Math.min(WS - 16, P.y));
  if (!rec) { P.safeX = P.x; P.safeY = P.y; P.safeA = P.a; }
  return rec;
}

function burst(x, y, c, n, sz, spd, fr) {
  if (typeof F === 'undefined') return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = (spd || 70) * (0.5 + Math.random());
    F.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      l: 0.35 + Math.random() * 0.3,
      c,
      s: sz || 3.5,
      fr: fr || 0
    });
  }
}
