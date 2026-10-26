// DEAD ZONE v2.0.1 - PASSIVE AURAS, SUMMONS & STATUS EFFECTS
// Twelve late-game SPECIAL perks and one relic shipped purchasable but inert:
// their state fields were set by the perk table and then never read by anything.
// This module gives every one of them a real, legible effect and keeps the
// per-frame cost bounded - each system is O(Z) or less, resolves its target at
// most once per frame, and every pool (meteors, missiles, soul blasts) is capped.
//
// Wired up here: Frost Aura, Immolation, Spectral Blades, Nano Swarm, Arcane
// Missiles, Meteor Rain, Storm Caller, Soul Harvest, Venom Rounds, Thorns and
// Deflector Ring (both in engine_world.hurtP), Shadow Step and Second Wind.

let METEOR = [];   // incoming meteor strikes (Meteor skill + Meteor Rain perk)

// Damage multiplier for automatic sources (auras, orbiting blades, homing
// missiles, sky lightning, soul blasts, meteor rain, shadow step).
//
// They used to read the same S.dm the guns do. S.dm compounds multiplicatively
// across perk stacks and class bonuses, so by wave 30-35 the auras alone were
// out-damaging the weapon: the report's "zombies died automatically while the
// player stood still" was Storm Caller plus Immolation plus the orbiting blades
// all scaling on a multiplier the player had built for their gun. Passives still
// grow with every damage upgrade - at half the rate, and capped - so a passive
// build stays useful without ever being a full replacement for shooting.
function pdmg() {
  const dm = (typeof S !== 'undefined' && S && isFinite(S.dm)) ? S.dm : 1;
  return Math.min(3.0, 1 + (dm - 1) * 0.5);
}
let AMISS = [];    // arcane homing missiles (Arcane Missiles perk)
let SOULW = [];    // expanding soul-blast rings (Soul Harvest perk)

const MAX_METEOR = 6;
const MAX_AMISS = 10;

// Nearest live zombie to a point, or null. Squared-distance scan, no allocation.
function nearestZombie(x, y, maxD) {
  let best = null, bestD2 = maxD * maxD;
  for (let i = 0; i < Z.length; i++) {
    const z = Z[i];
    if (!z || z.dead) continue;
    const dx = z.x - x, dy = z.y - y, d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = z; }
  }
  return best;
}

// Damage over time that deliberately bypasses the hit pipeline: a per-frame
// tick must not fire combatImpactFX (sparks every frame) nor floating numbers.
function dotZ(z, amount, src) {
  if (!z || z.dead) return;
  z.hp -= amount;
  if (!isFinite(z.hp) || z.hp <= 0) {
    z.hp = 0;
    if (typeof killZ === 'function') killZ(z, src || 'dot');
  }
}

/* ------------------------------------------------------------------ */
/* BURN - the one damage-over-time the player can see                  */
/* ------------------------------------------------------------------ */
// Immolation used to deal `20 * S.fi * dt` every frame through dotZ(): real
// damage with no feedback at all, and a rate tied to the frame rate (sixty
// invisible slivers a second). Burn keeps exactly the same damage per second but
// pays it in fixed ticks, so the flames, the embers and the numbers all land on
// the same beat and the effect is readable while it happens.
//
// The duration is one tick plus a hair, so a zombie that walks out of the aura
// takes at most two more ticks - never more than half a second's worth of aura
// damage - while a zombie standing in it is refreshed every frame and burns
// continuously. The margin over the tick length also means a stutter frame cannot
// expire a burn that is still being fed.
const BURN_TICK = 0.25;
const BURN_DUR = 0.3;
const BURN_MAX = 40;        // ceiling on the dps any single burn can claim
const FLAME_RESIDUE = 0.35; // how long a flamethrower hit keeps licking at the wound

// dps is damage per second. A target keeps the strongest burn on it and refreshes
// its clock, so two sources cannot silently stack into an invisible melt.
function applyBurn(z, dps, dur) {
  if (!z || z.dead || !(dps > 0)) return;
  const d = Math.min(BURN_MAX, dps);
  if (d >= (z.bnD || 0)) {
    z.bnD = d;
    z.bn = Math.max(z.bn || 0, dur || BURN_DUR);
  } else {
    z.bn = Math.max(z.bn || 0, Math.min(dur || BURN_DUR, 0.15));
  }
  // Stagger the first tick so a crowd ignited on the same frame does not tick in
  // lockstep - twenty zombies flashing on the same beat reads as one glitch.
  if (z.bnT == null) z.bnT = BURN_TICK * Math.random();
}

// A flamethrower hit leaves the jet clinging to the target for a moment. It is an
// impact reaction, not a damage source: the shot that lit it already dealt its
// damage through the normal bullet pipeline.
function applyFlameHit(z) {
  if (!z || z.dead) return;
  z.ignT = Math.max(z.ignT || 0, FLAME_RESIDUE);
}

function burnTickUpdate(z, dt) {
  if (!(z.bn > 0)) return;
  z.bn -= dt;
  z.bnT -= dt;
  if (z.bnT <= 0) {
    z.bnT += BURN_TICK;
    if (z.bnT <= 0) z.bnT = BURN_TICK;
    const dmg = (z.bnD || 0) * BURN_TICK;
    if (dmg > 0) {
      if (typeof F !== 'undefined' && F.length < 240) {
        F.push({
          x: z.x + (Math.random() - 0.5) * 9, y: z.y + (Math.random() - 0.5) * 9,
          vx: 0, vy: -34 - Math.random() * 20, l: 0.3,
          c: Math.random() < 0.5 ? '#ffb03a' : '#ff6a2a', s: 1.6 + Math.random(), fr: 1
        });
      }
      dotZ(z, dmg, 'burn');
    }
  }
  if (z.bn <= 0) { z.bn = 0; z.bnD = 0; z.bnT = null; }
}

// An expanding ring at the exact radius an aura works over, so casting (or
// upgrading) an aura answers "how far does this reach?" at the moment it matters.
function auraRingFX(radius, rgb) {
  if (typeof RG !== 'undefined') {
    RG.push({ x: P.x, y: P.y, r: 8, l: 0.6, v: 320, maxR: radius, c: rgb });
    RG.push({ x: P.x, y: P.y, r: 6, l: 0.36, v: 220, maxR: radius * 0.6, c: '255,240,210' });
  }
  if (typeof burst === 'function') burst(P.x, P.y, rgb === '255,122,58' ? '#ff9a3a' : '#9be7ff', 18, 3, 120, 1);
  if (typeof addShake === 'function') addShake(2.5);
}

function clearPassives() {
  METEOR = [];
  AMISS = [];
  SOULW = [];
}

/* ------------------------------------------------------------------ */
/* METEORS & SOUL BLASTS                                              */
/* ------------------------------------------------------------------ */
function meteorStrike(x, y, dmg, delay, radius) {
  if (METEOR.length >= MAX_METEOR) return false;
  METEOR.push({ x, y, t: 0, dur: delay || 0.55, dmg: dmg, r: radius || 150 });
  if (typeof snd === 'function') snd(150, 0.32, 'sawtooth', 0.05, 0.35);
  return true;
}

function meteorBlast(x, y, r, dmg) {
  if (typeof RG !== 'undefined') {
    RG.push({ x, y, r: 10, l: 0.6, v: 560, c: '255,140,40' });
    RG.push({ x, y, r: 5, l: 0.42, v: 380, c: '255,240,200' });
  }
  if (typeof burst === 'function') {
    burst(x, y, '#ff7a3a', 26, 4.5, 165, 1);
    burst(x, y, '#ffd36b', 12, 3, 210, 1);
    burst(x, y, '#5a4a3a', 10, 4, 90, 1);
  }
  if (typeof AOE_DEBRIS !== 'undefined') {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * 6.28, sp = 60 + Math.random() * 130;
      AOE_DEBRIS.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        l: 0.5 + Math.random() * 0.35, maxL: 0.85,
        sz: 2.5 + Math.random() * 3, col: k % 2 ? '#6b7280' : '#4b5563'
      });
    }
  }
  addShake(8);
  if (typeof noise === 'function') noise(0.4, 0.14);
  // Zombies only: an automatic perk must never punish the player for its own cast.
  for (const z of Z) {
    if (!z || z.dead) continue;
    const dx = z.x - x, dy = z.y - y, d2 = dx * dx + dy * dy;
    if (d2 < r * r) damageZ(z, dmg * (1 - Math.sqrt(d2) / r), 'meteor', false);
  }
}

function soulBlast(x, y, dmg, r) {
  SOULW.push({ x, y, r: 12, l: 0.5, maxL: 0.5, maxR: r });
  if (typeof burst === 'function') burst(x, y, '#c9a6ff', 22, 3.4, 175, 1);
  if (typeof snd === 'function') snd(880, 0.22, 'sine', 0.06, 1.6);
  for (const z of Z) {
    if (!z || z.dead) continue;
    const dx = z.x - x, dy = z.y - y;
    if (dx * dx + dy * dy < r * r) damageZ(z, dmg, 'soul', false);
  }
}

// Called from killZ so kill-gated perks settle exactly once per kill.
function passiveOnKill(z) {
  if (typeof S === 'undefined' || !S) return;
  if (S.so) {
    S.soC = (S.soC || 0) + 1;
    const need = Math.max(4, 9 - S.so);
    if (S.soC >= need) {
      S.soC = 0;
      soulBlast(P.x, P.y, 70 * pdmg(), 210);
    }
  }
}

/* ------------------------------------------------------------------ */
/* PER-FRAME PASSIVE TICK (called from update)                        */
/* ------------------------------------------------------------------ */
function updatePassives(dt) {
  if (typeof P === 'undefined' || !P || typeof S === 'undefined' || !S) return;
  if (P.hp <= 0 || !(dt > 0)) return;
  const t = S.t || 0;

  // Second Wind - flat regeneration.
  if (S.rg) P.hp = Math.min(P.mx, P.hp + S.rg * dt);

  // Per-zombie status timers and venom damage-over-time in a single pass.
  for (const z of Z) {
    if (!z || z.dead) continue;
    if (z.obT > 0) z.obT -= dt;
    if (z.sdT > 0) z.sdT -= dt;
    if (z.ignT > 0) z.ignT -= dt;
    burnTickUpdate(z, dt);
    if (z.psn > 0) {
      z.psn -= dt;
      if (S.pv) dotZ(z, 14 * S.pv * dt, 'venom');
      if (Math.random() < dt * 6 && typeof F !== 'undefined' && F.length < 220) {
        F.push({
          x: z.x + (Math.random() - 0.5) * 10, y: z.y + (Math.random() - 0.5) * 10,
          vx: 0, vy: -18 - Math.random() * 12, l: 0.4, c: '#7be04a', s: 1.8 + Math.random()
        });
      }
    }
  }

  // Frost Aura - keeps nearby zombies chilled (reuses the cryo slow + overlay).
  if (S.fa) {
    const R2 = (140 + 20 * S.fa) * (140 + 20 * S.fa);
    for (const z of Z) {
      if (!z || z.dead) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < R2) z.fz = Math.max(z.fz || 0, 0.3);
    }
  }

  // Immolation - contact-range burn aura. The aura lights the burn; the burn pays
  // the damage in ticks (see burnTickUpdate), so the flames on a zombie are the
  // exact source of the numbers coming off it.
  if (S.fi) {
    const R = 88 + 8 * S.fi, R2 = R * R;
    const dps = 20 * S.fi;
    for (const z of Z) {
      if (!z || z.dead) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < R2) {
        // First contact: a small ignition burst, once per zombie entering the ring.
        if (!(z.bn > 0) && typeof burst === 'function') burst(z.x, z.y - 4, '#ff9a3a', 6, 2.2, 90, 1);
        applyBurn(z, dps, BURN_DUR);
      }
    }
    if (Math.random() < dt * 14 && typeof F !== 'undefined' && F.length < 240) {
      const a = Math.random() * 6.28, rr = Math.random() * R;
      F.push({ x: P.x + Math.cos(a) * rr, y: P.y + Math.sin(a) * rr, vx: 0, vy: -30, l: 0.35, c: '#ff9a3a', s: 2 + Math.random(), fr: 1 });
    }
  }

  // Shadow Step - a dash shreds anything you pass through.
  if (S.sd && P.dash > 0) {
    for (const z of Z) {
      if (!z || z.dead || (z.sdT || 0) > 0) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < 900) {
        z.sdT = 0.35;
        damageZ(z, 55 * pdmg(), 'shadowstep', false);
        if (typeof burst === 'function') burst(z.x, z.y, '#9a7aff', 6, 2.4, 110, 1);
      }
    }
  }

  // Spectral Blades + Nano Swarm - orbiting contact weapons.
  const blades = (S.ob || 0), drones = (S.ns || 0), orbs = blades + drones;
  if (orbs) {
    for (let i = 0; i < orbs; i++) {
      const drone = i >= blades;
      const a = t * (drone ? 3.6 : 2.4) + i * (6.28318 / orbs);
      const ox = P.x + Math.cos(a) * (drone ? 34 : 52), oy = P.y + Math.sin(a) * (drone ? 34 : 52);
      for (const z of Z) {
        if (!z || z.dead || (z.obT || 0) > 0) continue;
        const dx = z.x - ox, dy = z.y - oy;
        if (dx * dx + dy * dy < 400) {
          z.obT = drone ? 0.45 : 0.32;
          damageZ(z, (drone ? 16 : 26) * pdmg(), drone ? 'nanoswarm' : 'blade', false);
        }
      }
    }
  }

  // Arcane Missiles - slow homing volley that picks the nearest hostile.
  if (S.am) {
    S.amT = (S.amT == null ? 1.1 : S.amT) - dt;
    if (S.amT <= 0) {
      S.amT = Math.max(0.45, 1.7 / S.am);
      const start = nearestZombie(P.x, P.y, 460);
      if (start && AMISS.length < MAX_AMISS) {
        const a = Math.atan2(start.y - P.y, start.x - P.x);
        AMISS.push({
          x: P.x + Math.cos(a) * 12, y: P.y + Math.sin(a) * 12,
          vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
          l: 2.2, dmg: 34 * pdmg(), tgt: start
        });
      }
    }
  }
  for (let i = AMISS.length - 1; i >= 0; i--) {
    const m = AMISS[i];
    m.l -= dt;
    const tg = (m.tgt && !m.tgt.dead) ? m.tgt : (m.tgt = nearestZombie(m.x, m.y, 300));
    if (tg) {
      const a = Math.atan2(tg.y - m.y, tg.x - m.x), sp = 320, k = Math.min(1, dt * 8);
      m.vx += (Math.cos(a) * sp - m.vx) * k;
      m.vy += (Math.sin(a) * sp - m.vy) * k;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (tg) {
      const dx = tg.x - m.x, dy = tg.y - m.y;
      if (dx * dx + dy * dy < 256) {
        damageZ(tg, m.dmg, 'arcane', false);
        if (typeof burst === 'function') burst(m.x, m.y, '#c9a6ff', 7, 2.6, 100, 1);
        AMISS.splice(i, 1);
        continue;
      }
    }
    if (m.l <= 0) AMISS.splice(i, 1);
  }

  // Meteor Rain - periodic strikes onto the horde.
  if (S.mt) {
    S.mtT = (S.mtT == null ? 2.2 : S.mtT) - dt;
    if (S.mtT <= 0) {
      S.mtT = Math.max(1.2, 4.2 / S.mt);
      const tg = nearestZombie(P.x, P.y, 560);
      if (tg) meteorStrike(tg.x, tg.y, 150 * pdmg(), 0.6, 130);
    }
  }

  // Storm Caller - periodic sky lightning onto a random hostile.
  if (S.sc) {
    S.scT = (S.scT == null ? 2.0 : S.scT) - dt;
    if (S.scT <= 0) {
      S.scT = Math.max(1.0, 2.6 / S.sc);
      const tg = nearestZombie(P.x, P.y, 520);
      if (tg) {
        if (typeof ARCS !== 'undefined') ARCS.push({ x1: tg.x, y1: tg.y - 300, x2: tg.x, y2: tg.y, l: 0.2, maxL: 0.2, seed: Math.random() * 999 });
        damageZ(tg, 65 * pdmg(), 'storm', false);
        if (typeof burst === 'function') burst(tg.x, tg.y, '#9be7ff', 8, 2.6, 110, 1);
        if (typeof chainLightning === 'function') chainLightning(tg, { cl: 2, d: 65 * pdmg(), h: [tg], wi: (P.cur || 0) });
        if (typeof snd === 'function') snd(1100, 0.16, 'sawtooth', 0.06, 0.2);
      }
    }
  }

  // Landing meteors and fading soul rings.
  for (let i = METEOR.length - 1; i >= 0; i--) {
    const m = METEOR[i];
    m.t += dt;
    if (m.t >= m.dur) {
      METEOR.splice(i, 1);
      meteorBlast(m.x, m.y, m.r, m.dmg);
    }
  }
  for (let i = SOULW.length - 1; i >= 0; i--) {
    SOULW[i].l -= dt;
    if (SOULW[i].l <= 0) SOULW.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ */
/* RENDER - ground layer (aura rings + meteor telegraphs)             */
/* ------------------------------------------------------------------ */
function renderPassivesGround(cx, cy, W, H) {
  if (typeof P === 'undefined' || !P || typeof S === 'undefined' || !S) return;
  const t = S.t || 0;
  X.save();
  if (S.fa) {
    const R = 140 + 20 * S.fa;
    X.globalAlpha = 0.09 + Math.sin(t * 3) * 0.02;
    X.fillStyle = '#9be7ff';
    X.beginPath(); X.arc(P.x, P.y, R, 0, 6.28); X.fill();
    // A dashed boundary that crawls around the rim: the slow radius a zombie has
    // to cross to be chilled, stated as a line rather than implied by a soft disc.
    X.globalAlpha = 0.34 + Math.sin(t * 3) * 0.06;
    X.strokeStyle = '#cdefff';
    X.lineWidth = 1.6;
    if (X.setLineDash) { X.setLineDash([7, 9]); X.lineDashOffset = -t * 26; }
    X.beginPath(); X.arc(P.x, P.y, R, 0, 6.28); X.stroke();
    if (X.setLineDash) { X.setLineDash([]); X.lineDashOffset = 0; }
  }
  if (S.fi) {
    const R = 88 + 8 * S.fi;
    X.globalAlpha = 0.09 + Math.sin(t * 7) * 0.03;
    X.fillStyle = '#ff7a3a';
    X.beginPath(); X.arc(P.x, P.y, R, 0, 6.28); X.fill();
    // Solid rim + tongues of flame licking outward, rotating slowly. This is the
    // burn radius itself, so where the fire ends is where the damage ends.
    X.globalAlpha = 0.42 + Math.sin(t * 9) * 0.08;
    X.strokeStyle = '#ff9a3a';
    X.lineWidth = 2;
    X.beginPath(); X.arc(P.x, P.y, R, 0, 6.28); X.stroke();
    X.globalAlpha = 0.30;
    X.strokeStyle = '#ffd07a';
    X.lineWidth = 2.2;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.5 + i * (6.28318 / 14);
      const ph = Math.sin(t * 6 + i * 1.7) * 0.5 + 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      X.beginPath();
      X.moveTo(P.x + ca * (R - 9), P.y + sa * (R - 9));
      X.quadraticCurveTo(P.x + ca * (R - 3), P.y + sa * (R - 3) - 5, P.x + ca * (R + 2 + ph * 4), P.y + sa * (R + 2 + ph * 4) - 10 - ph * 6);
      X.stroke();
    }
  }
  X.globalAlpha = 1;
  for (const m of METEOR) {
    const k = Math.min(1, m.t / m.dur);
    X.strokeStyle = 'rgba(255,140,60,0.85)';
    X.lineWidth = 2;
    X.beginPath(); X.arc(m.x, m.y, m.r, 0, 6.28); X.stroke();
    X.globalAlpha = 0.20 + k * 0.30;
    X.fillStyle = '#ff7a3a';
    X.beginPath(); X.arc(m.x, m.y, m.r * k, 0, 6.28); X.fill();
    X.globalAlpha = 1;
    X.strokeStyle = 'rgba(255,220,160,0.9)';
    X.beginPath();
    X.moveTo(m.x - 8, m.y); X.lineTo(m.x + 8, m.y);
    X.moveTo(m.x, m.y - 8); X.lineTo(m.x, m.y + 8);
    X.stroke();
  }
  X.restore();
}

/* ------------------------------------------------------------------ */
/* RENDER - above entities (summons, missiles, status haze)           */
/* ------------------------------------------------------------------ */
function renderPassives(cx, cy, W, H) {
  if (typeof P === 'undefined' || !P || typeof S === 'undefined' || !S) return;
  const t = S.t || 0;
  X.save();

  for (const s of SOULW) {
    const k = 1 - Math.max(0, Math.min(1, s.l / s.maxL));
    X.globalAlpha = (1 - k) * 0.7;
    X.strokeStyle = '#c9a6ff';
    X.lineWidth = 3;
    X.beginPath(); X.arc(s.x, s.y, 12 + (s.maxR - 12) * k, 0, 6.28); X.stroke();
  }
  X.globalAlpha = 1;

  const blades = (S.ob || 0), drones = (S.ns || 0), orbs = blades + drones;
  for (let i = 0; i < orbs; i++) {
    const drone = i >= blades;
    const a = t * (drone ? 3.6 : 2.4) + i * (6.28318 / orbs);
    const ox = P.x + Math.cos(a) * (drone ? 34 : 52), oy = P.y + Math.sin(a) * (drone ? 34 : 52);
    X.save();
    X.translate(ox, oy);
    if (drone) {
      X.fillStyle = 'rgba(0,229,255,0.28)';
      X.beginPath(); X.arc(0, 0, 8, 0, 6.28); X.fill();
      X.fillStyle = '#00e5ff';
      X.beginPath(); X.arc(0, 0, 3.4, 0, 6.28); X.fill();
      X.fillStyle = '#d8feff';
      X.fillRect(-1, -1, 2, 2);
    } else {
      X.rotate(a * 2.2);
      X.fillStyle = 'rgba(201,166,255,0.30)';
      X.beginPath(); X.arc(0, 0, 9, 0, 6.28); X.fill();
      X.fillStyle = '#c9a6ff';
      X.beginPath();
      X.moveTo(0, -9); X.lineTo(2.4, 0); X.lineTo(0, 9); X.lineTo(-2.4, 0);
      X.closePath(); X.fill();
      X.fillStyle = '#f3ecff';
      X.fillRect(-0.9, -2, 1.8, 4);
    }
    X.restore();
  }

  for (const m of AMISS) {
    const sp = Math.hypot(m.vx, m.vy) || 1;
    X.globalAlpha = 0.5;
    X.strokeStyle = '#c9a6ff';
    X.lineWidth = 3.4;
    X.lineCap = 'round';
    X.beginPath();
    X.moveTo(m.x - (m.vx / sp) * 12, m.y - (m.vy / sp) * 12);
    X.lineTo(m.x, m.y);
    X.stroke();
    X.globalAlpha = 1;
    X.fillStyle = '#f3ecff';
    X.beginPath(); X.arc(m.x, m.y, 2.6, 0, 6.28); X.fill();
  }
  X.globalAlpha = 1;

  // Venom haze on poisoned zombies, so the damage-over-time is readable.
  for (const z of Z) {
    if (!z || z.dead || !(z.psn > 0)) continue;
    X.globalAlpha = 0.35 + Math.sin(t * 8 + z.x * 0.05) * 0.12;
    X.strokeStyle = '#7be04a';
    X.lineWidth = 1.6;
    X.beginPath(); X.arc(z.x, z.y + 4, 13, 0, 6.28); X.stroke();
  }

  // Burning zombies. Drawn above the body so the flames lick up over it. Two
  // states, both honest: `bn` is the burn paying damage ticks (the aura is on
  // them), `ignT` is the residue of a flamethrower jet that has just hit them.
  // Nothing burns here that was not actually set on fire.
  // Always scanned, like the venom haze above: one early-out per zombie and no
  // extra bookkeeping flag that could go stale and hide a burning enemy.
  for (const z of Z) {
    if (!z || z.dead) continue;
    const burning = z.bn > 0, residue = z.ignT > 0;
    if (!burning && !residue) continue;
    const zr = (typeof ZT !== 'undefined' && ZT[z.t] && ZT[z.t].r) ? ZT[z.t].r : 12;
    const strength = burning ? 1 : 0.55;
    // A burn that is running out dips instead of cutting: the fade is the tell
    // that the tick is about to stop.
    const fade = burning ? Math.min(1, 0.35 + z.bn / 0.3) : Math.min(1, z.ignT / FLAME_RESIDUE);
    X.strokeStyle = '#ff7a2a';
    X.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const ph = t * 9 + k * 2.1 + z.x * 0.03 + z.y * 0.02;
      const h = (zr * 0.85 + Math.sin(ph) * 2.5) * strength;
      const bx = z.x + Math.sin(ph * 0.7 + k * 2.4) * (zr * 0.42);
      const by = z.y + zr * 0.35;
      X.globalAlpha = (0.42 + 0.28 * Math.abs(Math.sin(ph * 1.3))) * strength * fade;
      X.lineWidth = 3.4;
      X.beginPath();
      X.moveTo(bx - 2.6, by);
      X.quadraticCurveTo(bx - 1.2, by - h * 0.6, bx + Math.sin(ph * 1.7) * 3, by - h);
      X.stroke();
      X.strokeStyle = '#ffd07a';
      X.lineWidth = 1.6;
      X.beginPath();
      X.moveTo(bx - 1.2, by);
      X.quadraticCurveTo(bx - 0.6, by - h * 0.4, bx + Math.sin(ph * 1.7) * 2, by - h * 0.62);
      X.stroke();
      X.strokeStyle = '#ff7a2a';
    }
    // Warm rim, so a burning zombie is identifiable even in a dense crowd.
    X.globalAlpha = 0.3 * fade;
    X.strokeStyle = '#ff9a3a';
    X.lineWidth = 1.8;
    X.beginPath(); X.arc(z.x, z.y, zr + 3.5, 0, 6.28); X.stroke();
  }
  X.restore();
  X.globalAlpha = 1;
}
