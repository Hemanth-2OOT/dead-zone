/* === CASH & PICKUP SYSTEM WITH POP, CURVED MAGNET & HUD FLIGHT === */

// D array is declared in engine_world.js
let HUD_FLYING_ICONS = []; // Particles flying from ground to HUD credit badge

// Spawns an item drop with pop bounce physics
function spawnDrop(x, y, type, value) {
  const ang = Math.random() * 6.28;
  const popSpd = 35 + Math.random() * 45;
  D.push({
    x, y,
    z: 14,
    vz: 65 + Math.random() * 40,
    vx: Math.cos(ang) * popSpd,
    vy: Math.sin(ang) * popSpd,
    k: type || 'c', // 'c'=coin, 'cb'=cash bundle, 'h'=health, 'a'=ammo, 'r'=relic
    v: value || 5,
    l: 15,
    maxL: 15,
    scale: 1.0,
    rot: Math.random() * 6.28,
    vrot: (Math.random() - 0.5) * 6,
    bounces: 0,
    trail: []
  });
  if (D.length > 90) D.shift();
}

// Updates drop physics, bounce, curve magnetization, and collection
function updatePickups(dt) {
  const magnetRadius = 36 * (S.mg || 1) * (S.magRing ? 1.5 : 1);

  for (const d of D) {
    d.l -= dt;

    // 1. Arc pop & bounce physics
    if (d.z > 0 || d.vz > 0) {
      d.z += d.vz * dt;
      d.vz -= 260 * dt; // gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.90;
      d.vy *= 0.90;
      if (d.z <= 0) {
        d.z = 0;
        d.vz = -d.vz * 0.42;
        d.bounces++;
        if (Math.abs(d.vz) < 15 || d.bounces > 2) { d.vz = 0; d.z = 0; }
      }
    }

    // 2. Idle rotation & gentle shine sweep
    d.rot += d.vrot * dt;
    d.vrot *= 0.95;

    // 3. Magnetization & curved acceleration towards player
    const dist = Math.hypot(P.x - d.x, P.y - d.y);
    if (dist < magnetRadius && d.z === 0) {
      const aimAng = Math.atan2(P.y - d.y, P.x - d.x);
      // Curved trajectory force
      const curveForce = 0.3 * Math.sin(d.l * 8);
      const moveAng = aimAng + curveForce;
      const pullSpeed = 380 + (1 - dist / magnetRadius) * 420;

      d.vx = (d.vx || 0) * 0.85 + Math.cos(moveAng) * pullSpeed * dt;
      d.vy = (d.vy || 0) * 0.85 + Math.sin(moveAng) * pullSpeed * dt;
      d.x += d.vx;
      d.y += d.vy;

      // Scale down slightly as it approaches
      d.scale = Math.max(0.65, dist / magnetRadius);

      // Trailing sparkles
      if (Math.random() < 0.4) {
        F.push({
          x: d.x + (Math.random() - 0.5) * 6,
          y: d.y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          l: 0.22,
          c: d.k === 'c' ? '#ffd36b' : (d.k === 'h' ? '#ff5a3a' : '#00e5ff')
        });
      }
    }

    // 4. Contact & collection
    if (dist < 20) {
      d.l = 0; // consumed
      // Sound with chained pitch shift
      sndPickup(d.k);

      // Contact sparkle burst
      burst(d.x, d.y, d.k === 'c' ? '#ffd36b' : (d.k === 'h' ? '#ff5a3a' : '#00e5ff'), 8, 2, 75);

      // Floating +amount text
      if (d.k === 'c' || d.k === 'cb') {
        S.cash += d.v;
        txt(d.x, d.y - 12, '+$' + d.v, '#ffd36b', true);
        // Fly particle to top HUD credit counter
        HUD_FLYING_ICONS.push({
          x: d.x - CX,
          y: d.y - CY,
          progress: 0,
          val: d.v,
          type: 'c'
        });
      } else if (d.k === 'h') {
        healP(d.v);
        txt(d.x, d.y - 12, '+' + d.v + ' HP', '#8fae4a', true);
      } else if (d.k === 'a') {
        if (P) P.ammo = P.maxAmmo;
        txt(d.x, d.y - 12, 'AMMO RESTORED', '#00e5ff', true);
      } else if (d.k === 'r') {
        S.cash += d.v;
        txt(d.x, d.y - 12, '+' + d.v + ' CR', '#be8cff', true);
      }
    }
  }

  D = D.filter(d => d.l > 0);
  if (D.length > 90) D.splice(0, D.length - 90);

  // 5. Update HUD flying particles
  for (const h of HUD_FLYING_ICONS) {
    h.progress += dt * 2.5;
    const targetX = W - 60;
    const targetY = 24;
    // Ease-in curve towards credit badge
    const t = Math.min(1, h.progress);
    h.curX = h.x + (targetX - h.x) * (t * t);
    h.curY = h.y + (targetY - h.y) * (t * t) - Math.sin(t * 3.14) * 45;

    if (t >= 1) {
      HUD_BOUNCE = 1.35; // Trigger bounce on credit HUD
      burst(targetX + CX, targetY + CY, '#ffd36b', 5, 2, 60);
    }
  }
  HUD_FLYING_ICONS = HUD_FLYING_ICONS.filter(h => h.progress < 1);

  // Decay HUD bounce
  if (HUD_BOUNCE > 1.0) {
    HUD_BOUNCE = Math.max(1.0, HUD_BOUNCE - dt * 2.8);
    const crdEl = $('crd');
    if (crdEl) crdEl.style.transform = `scale(${HUD_BOUNCE})`;
  }
}

// Renders drops with 4-layer depth, idle shine, and soft shadow
function renderPickupsPass(cx, cy, W, H) {
  for (const d of D) {
    if (d.x < cx - 30 || d.x > cx + W + 30 || d.y < cy - 30 || d.y > cy + H + 30) continue;

    // Despawn blink in final 3 seconds
    if (d.l < 3 && Math.sin(d.l * 14) > 0.2) continue;

    const bob = (d.z > 0) ? -d.z : Math.sin(S.t * 4.5 + d.x) * 3;
    const renderY = d.y + bob;
    const scale = d.scale || 1.0;

    X.save();
    X.translate(d.x, renderY);
    X.scale(scale, scale);

    // 1. Soft contact shadow (shrinks as item pops in air)
    const shadowScale = Math.max(0.4, 1 - (d.z / 60));
    X.fillStyle = '#00000055';
    X.beginPath();
    X.ellipse(0, 7 + (d.z || 0) * 0.9, (d.k === 'c' ? 8 : 11) * shadowScale, 4 * shadowScale, 0, 0, 6.28);
    X.fill();

    // 2. Idle aura glow
    const glowPulse = 0.2 + Math.sin(S.t * 5 + d.x) * 0.1;
    X.fillStyle = d.k === 'c' ? `rgba(224,184,58,${glowPulse})` : (d.k === 'h' ? `rgba(239,68,68,${glowPulse})` : `rgba(0,229,255,${glowPulse})`);
    X.beginPath();
    X.arc(0, 0, d.k === 'c' ? 14 : 16, 0, 6.28);
    X.fill();

    // 3. Multi-layer item rendering per type
    if (d.k === 'c') {
      // Golden Coin: milled rim, embossed star/skull
      X.fillStyle = '#92400e';
      X.beginPath(); X.arc(0, 0, 8, 0, 6.28); X.fill();
      X.fillStyle = '#f59e0b';
      X.beginPath(); X.arc(0, 0, 7, 0, 6.28); X.fill();
      X.fillStyle = '#fde68a';
      X.beginPath(); X.arc(0, 0, 5.5, 0, 6.28); X.fill();
      X.fillStyle = '#d97706';
      X.font = '900 7px Impact'; X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText('$', 0, 0.5);
    } else if (d.k === 'cb') {
      // Cash Bundle: banded stack
      X.fillStyle = '#14532d';
      X.beginPath(); X.roundRect(-9, -6, 18, 12, 2.5); X.fill();
      X.fillStyle = '#22c55e';
      X.beginPath(); X.roundRect(-8, -5, 16, 10, 2); X.fill();
      X.fillStyle = '#fef08a';
      X.fillRect(-2, -5, 4, 10);
    } else if (d.k === 'h') {
      // Medical Crate: red cross with white beveled container
      X.fillStyle = '#cbd5e1';
      X.beginPath(); X.roundRect(-9, -7, 18, 14, 3); X.fill();
      X.fillStyle = '#f8fafc';
      X.beginPath(); X.roundRect(-8, -6, 16, 12, 2.5); X.fill();
      X.fillStyle = '#dc2626';
      X.fillRect(-5, -2, 10, 4);
      X.fillRect(-2, -5, 4, 10);
    } else if (d.k === 'a') {
      // Ammo Box: olive military canister with yellow stencil
      X.fillStyle = '#1e293b';
      X.beginPath(); X.roundRect(-9, -6, 18, 12, 2); X.fill();
      X.fillStyle = '#475569';
      X.beginPath(); X.roundRect(-8, -5, 16, 10, 1.5); X.fill();
      X.fillStyle = '#f59e0b';
      X.fillRect(-4, -1, 8, 2);
    } else if (d.k === 'r') {
      // Relic Shard: faceted violet crystal with specular shimmer
      X.fillStyle = '#4c1d95';
      X.beginPath();
      X.moveTo(0, -10); X.lineTo(7, -3); X.lineTo(5, 8); X.lineTo(-5, 8); X.lineTo(-7, -3);
      X.closePath(); X.fill();
      X.fillStyle = '#a855f7';
      X.beginPath();
      X.moveTo(0, -8); X.lineTo(5, -2); X.lineTo(3, 6); X.lineTo(-3, 6); X.lineTo(-5, -2);
      X.closePath(); X.fill();
      X.fillStyle = '#e9d5ff';
      X.beginPath();
      X.moveTo(0, -6); X.lineTo(3, -2); X.lineTo(0, 4); X.lineTo(-2, -2);
      X.closePath(); X.fill();
    }

    // 4. Specular idle shine sweep
    const sweep = (S.t * 3 + d.x) % 6;
    if (sweep < 1.2) {
      X.save();
      X.beginPath();
      X.arc(0, 0, 8, 0, 6.28);
      X.clip();
      X.fillStyle = 'rgba(255,255,255,0.45)';
      X.fillRect(-10 + sweep * 18, -10, 3.5, 20);
      X.restore();
    }

    X.restore();
  }

  // Draw HUD flying coins / icons in screen coordinates
  // (this pass runs inside the camera transform, so convert screen -> world)
  for (const h of HUD_FLYING_ICONS) {
    if (!isFinite(h.curX) || !isFinite(h.curY)) continue;
    const sx = h.curX + CX, sy = h.curY + CY;
    X.save();
    X.fillStyle = '#ffd36b';
    X.beginPath();
    X.arc(sx, sy, 6, 0, 6.28);
    X.fill();
    X.fillStyle = '#fff';
    X.beginPath();
    X.arc(sx - 1.5, sy - 1.5, 2, 0, 6.28);
    X.fill();
    X.restore();
  }
}

// Global Aliases for world engine compatibility
const updateDrops = updatePickups;
const renderDropsPass = renderPickupsPass;
