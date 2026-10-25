// DEAD ZONE v2.6 - PASSIVE AURAS, SUMMONS & STATUS EFFECTS
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
  if (typeof isShakeEnabled === 'function' ? isShakeEnabled() : true) SH = Math.max(SH, 11);
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
      soulBlast(P.x, P.y, 70 * S.dm, 210);
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

  // Immolation - contact-range burn aura.
  if (S.fi) {
    const R = 88 + 8 * S.fi, R2 = R * R;
    for (const z of Z) {
      if (!z || z.dead) continue;
      const dx = z.x - P.x, dy = z.y - P.y;
      if (dx * dx + dy * dy < R2) dotZ(z, 20 * S.fi * dt, 'immolation');
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
        damageZ(z, 55 * S.dm, 'shadowstep', false);
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
          damageZ(z, (drone ? 16 : 26) * S.dm, drone ? 'nanoswarm' : 'blade', false);
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
          l: 2.2, dmg: 34 * S.dm, tgt: start
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
      if (tg) meteorStrike(tg.x, tg.y, 150 * S.dm, 0.6, 130);
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
        damageZ(tg, 65 * S.dm, 'storm', false);
        if (typeof burst === 'function') burst(tg.x, tg.y, '#9be7ff', 8, 2.6, 110, 1);
        if (typeof chainLightning === 'function') chainLightning(tg, { cl: 2, d: 65 * S.dm, h: [tg], wi: (P.cur || 0) });
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
    X.globalAlpha = 0.09 + Math.sin(t * 3) * 0.02;
    X.fillStyle = '#9be7ff';
    X.beginPath(); X.arc(P.x, P.y, 140 + 20 * S.fa, 0, 6.28); X.fill();
  }
  if (S.fi) {
    X.globalAlpha = 0.09 + Math.sin(t * 7) * 0.03;
    X.fillStyle = '#ff7a3a';
    X.beginPath(); X.arc(P.x, P.y, 88 + 8 * S.fi, 0, 6.28); X.fill();
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
  X.restore();
  X.globalAlpha = 1;
}
