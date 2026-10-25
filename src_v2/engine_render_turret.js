// DEAD ZONE v2.8.1 - MILITARY SENTRY TURRET ENGINE
// Senior 2D Artist / Technical Rendering Pipeline

let TURRET_DEBRIS = [];

function updateTurrets(dt) {
  if (typeof TR === 'undefined' || !TR || !TR.length) return;

  for (let i = TR.length - 1; i >= 0; i--) {
    const t = TR[i];
    t.l -= dt;
    t.cd = (t.cd || 0) - dt;
    t.heat = Math.max(0, (t.heat || 0) - dt * 1.5);
    t.spin = (t.spin || 0) + dt * 4;
    t.recoilL = Math.max(0, (t.recoilL || 0) - dt * 25);
    t.recoilR = Math.max(0, (t.recoilR || 0) - dt * 25);

    const lifeRatio = Math.max(0, t.l / (t.maxL || 20));

    // Turret Damage States: Smoke (<50% life) and Electrical Sparks (<25% life)
    if (lifeRatio < 0.5 && Math.random() < 0.25 && typeof F !== 'undefined') {
      F.push({
        x: t.x + (Math.random() - 0.5) * 10,
        y: t.y - 4 + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 15,
        vy: -25 - Math.random() * 20,
        l: 0.45 + Math.random() * 0.3,
        c: 'rgba(75, 85, 99, 0.45)',
        s: 3.5 + Math.random() * 2.5
      });
    }
    if (lifeRatio < 0.25 && Math.random() < 0.35 && typeof F !== 'undefined') {
      F.push({
        x: t.x + (Math.random() - 0.5) * 8,
        y: t.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        l: 0.15 + Math.random() * 0.15,
        c: '#fde047',
        s: 2.0
      });
    }

    // Target scanning with line-of-sight check
    let bz = null, bd = 340;
    if (typeof Z !== 'undefined' && Z && Z.length) {
      for (const z of Z) {
        if (z.dead) continue;
        const d = Math.hypot(z.x - t.x, z.y - t.y);
        if (d < bd && typeof hasLOS === 'function' && hasLOS(t.x, t.y, z.x, z.y)) {
          bd = d;
          bz = z;
        }
      }
    }

    if (bz) {
      const targetAngle = Math.atan2(bz.y - t.y, bz.x - t.x);
      // Smooth turret rotation towards target
      let diff = targetAngle - (t.a || 0);
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      t.a = (t.a || 0) + diff * Math.min(1, dt * 14);
      t.hasTarget = true;
      t.targetDist = bd;

      // Firing cycle (alternating dual barrels)
      if (t.cd <= 0) {
        t.cd = 0.18; // High ROF twin-gun
        t.barrelAlt = !t.barrelAlt;
        t.heat = Math.min(1.0, (t.heat || 0) + 0.12);

        const barrelOffset = t.barrelAlt ? -4 : 4;
        if (t.barrelAlt) t.recoilL = 5.0; else t.recoilR = 5.0;

        const cosA = Math.cos(t.a), sinA = Math.sin(t.a);
        const bx = t.x + cosA * 22 - sinA * barrelOffset;
        const by = t.y + sinA * 22 + cosA * barrelOffset;

        // Spawn bullet
        if (typeof B !== 'undefined') {
          B.push({
            x: bx, y: by,
            vx: cosA * 750, vy: sinA * 750,
            d: 16 * ((typeof S !== 'undefined' && S.dm) ? S.dm : 1),
            l: 0.65,
            c: '#7fd8ff',
            pr: 0, ex: 0
          });
        }

        // Brass casing ejection to the side
        if (typeof CS !== 'undefined') {
          const ejectA = t.a + (t.barrelAlt ? -1.8 : 1.8);
          CS.push({
            x: t.x - cosA * 2, y: t.y - sinA * 2,
            vx: Math.cos(ejectA) * (60 + Math.random() * 40),
            vy: Math.sin(ejectA) * (60 + Math.random() * 40),
            a: Math.random() * 6.28,
            va: (Math.random() - 0.5) * 20,
            l: 2.0,
            col: '#e0b83a'
          });
        }

        // Muzzle smoke puff
        if (typeof F !== 'undefined' && Math.random() < 0.45) {
          F.push({
            x: bx, y: by,
            vx: cosA * 25 + (Math.random() - 0.5) * 15,
            vy: sinA * 25 + (Math.random() - 0.5) * 15,
            l: 0.35,
            c: 'rgba(200,210,220,0.5)',
            s: 3.5
          });
        }

        // Turret fire sound
        if (typeof snd === 'function') {
          snd(450 + Math.random() * 50, 0.08, 'sawtooth', 0.04, 1.2);
        }
      }
    } else {
      // Idle sensor sweep
      t.hasTarget = false;
      t.a = (t.a || 0) + Math.sin(t.spin) * 0.015;
    }

    // Destruction explosion & mechanical shrapnel debris when lifetime reaches zero
    if (t.l <= 0) {
      if (typeof boom === 'function') {
        boom(t.x, t.y, 45, '#e0a828');
      }
      // Mechanical destruction shrapnel & cog debris
      for (let k = 0; k < 8; k++) {
        const da = Math.random() * 6.28, dspd = 50 + Math.random() * 110;
        TURRET_DEBRIS.push({
          x: t.x, y: t.y,
          vx: Math.cos(da) * dspd,
          vy: Math.sin(da) * dspd,
          rot: Math.random() * 6.28,
          vrot: (Math.random() - 0.5) * 12,
          l: 2.2 + Math.random() * 1.5,
          maxL: 3.5,
          sz: 3 + Math.random() * 4,
          type: k % 3 // 0=metal plate, 1=bolt/cog, 2=barrel shard
        });
      }
      if (typeof F !== 'undefined') {
        for (let k = 0; k < 18; k++) {
          const fa = Math.random() * 6.28, fspd = 40 + Math.random() * 120;
          F.push({
            x: t.x, y: t.y,
            vx: Math.cos(fa) * fspd, vy: Math.sin(fa) * fspd,
            l: 0.5 + Math.random() * 0.4,
            c: k % 2 === 0 ? '#ff7a3a' : '#4b5563',
            s: 4 + Math.random() * 3
          });
        }
      }
      TR.splice(i, 1);
    }
  }

  // Update Turret Debris physics
  for (let k = TURRET_DEBRIS.length - 1; k >= 0; k--) {
    const deb = TURRET_DEBRIS[k];
    deb.l -= dt;
    deb.x += deb.vx * dt;
    deb.y += deb.vy * dt;
    deb.vx *= 0.88;
    deb.vy *= 0.88;
    deb.rot += deb.vrot * dt;
    deb.vrot *= 0.92;
    if (deb.l <= 0) TURRET_DEBRIS.splice(k, 1);
  }

  // Hard cap turrets to prevent overflow
  if (TR.length > 6) TR.splice(0, TR.length - 6);
}

function drawTurret(t) {
  if (!t) return;
  const a = t.a || 0;
  const heat = t.heat || 0;
  const rL = t.recoilL || 0, rR = t.recoilR || 0;
  const lifeRatio = Math.max(0, t.l / (t.maxL || 20));
  const lvl = t.lvl || ((typeof SV !== 'undefined' && SV && SV.turretLvl) ? SV.turretLvl : 1);

  X.save();
  X.translate(t.x, t.y);

  // 1. Soft ambient contact shadow (cached sprite, offset along the light dir)
  if (typeof contactShadow === 'function') {
    // local space (already translated to t.x/t.y) - no rotation, so light offsets stay correct
    contactShadow(0, 5, 17 + lvl * 2, 0);
  } else {
    X.fillStyle = 'rgba(0,0,0,0.48)';
    X.beginPath();
    X.ellipse(5, 7, 16 + lvl * 2, 12 + lvl * 1.5, 0.2, 0, 6.28);
    X.fill();
  }

  // 2. Heavy steel baseplate with corner anchor bolts
  X.fillStyle = '#222820';
  X.beginPath();
  X.roundRect(-12, -12, 24, 24, 4);
  X.fill();
  X.strokeStyle = '#111510';
  X.lineWidth = 2;
  X.stroke();

  // Turret Damage State: Dent & Scorch marks under 50% HP
  if (lifeRatio < 0.5) {
    X.fillStyle = 'rgba(15, 18, 14, 0.75)';
    X.beginPath(); X.arc(-6, -4, 4.5, 0, 6.28); X.fill();
    X.strokeStyle = '#0a0d09'; X.lineWidth = 1.4;
    X.beginPath(); X.moveTo(-8, -6); X.lineTo(-4, -2); X.stroke();
  }

  // Industrial hazard stripes on baseplate edge
  X.fillStyle = '#eab308';
  X.fillRect(-11, 8, 22, 3);
  X.fillStyle = '#18181b';
  for (let hx = -10; hx < 10; hx += 5) {
    X.beginPath();
    X.moveTo(hx, 8); X.lineTo(hx + 3, 8); X.lineTo(hx + 1, 11); X.lineTo(hx - 2, 11);
    X.closePath(); X.fill();
  }

  // Corner anchor bolts
  X.fillStyle = '#94a3b8';
  [[-10, -10], [8, -10], [-10, 8], [8, 8]].forEach(b => {
    X.fillRect(b[0], b[1], 2, 2);
  });

  // Level 2+ Upgrade: Corner reinforced armor brackets
  if (lvl >= 2) {
    X.fillStyle = '#475569';
    X.fillRect(-13, -13, 5, 5); X.fillRect(8, -13, 5, 5);
    X.fillRect(-13, 8, 5, 5);  X.fillRect(8, 8, 5, 5);
  }

  // 3. Targeting Laser Beam
  if (t.hasTarget && t.targetDist) {
    X.save();
    X.rotate(a);
    X.strokeStyle = lvl >= 3 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(239, 68, 68, 0.65)'; // Cyan if lvl 3
    X.lineWidth = lvl >= 3 ? 1.8 : 1.2;
    X.beginPath();
    X.moveTo(22, 0);
    X.lineTo(t.targetDist, 0);
    X.stroke();
    // Laser dot at impact point
    X.fillStyle = lvl >= 3 ? '#38bdf8' : '#ef4444';
    X.beginPath(); X.arc(t.targetDist, 0, 2.5, 0, 6.28); X.fill();
    X.fillStyle = '#ffffff';
    X.beginPath(); X.arc(t.targetDist, 0, 1.0, 0, 6.28); X.fill();
    X.restore();
  } else {
    // Idle targeting line
    X.save();
    X.rotate(a);
    X.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan sweep
    X.lineWidth = 1.0;
    X.setLineDash([4, 4]);
    X.beginPath(); X.moveTo(20, 0); X.lineTo(90, 0); X.stroke();
    X.setLineDash([]);
    X.restore();
  }

  // 4. Rotating chassis & upgrade-dependent barrels
  X.save();
  X.rotate(a);

  // Side ammo drum (Twin drums if Level 2+)
  X.fillStyle = '#1e241c';
  X.beginPath(); X.roundRect(-8, -13, 8, 5, 2); X.fill();
  X.fillStyle = '#f59e0b';
  X.fillRect(-7, -10, 6, 2);
  if (lvl >= 2) {
    X.fillStyle = '#1e241c';
    X.beginPath(); X.roundRect(-8, 8, 8, 5, 2); X.fill();
    X.fillStyle = '#f59e0b';
    X.fillRect(-7, 9, 6, 2);
  }

  // Level 3 Ballistic Shield Plate
  if (lvl >= 3) {
    X.fillStyle = '#1e293b';
    X.beginPath();
    X.roundRect(8, -10, 4, 20, 2);
    X.fill();
    X.strokeStyle = '#38bdf8';
    X.lineWidth = 1.5;
    X.stroke();
  }

  // Left Gun Barrel
  X.fillStyle = lvl >= 3 ? '#1e293b' : '#334155';
  X.fillRect(6 - rL, -6, 15 + (lvl > 1 ? 4 : 0), 3.5);
  // Right Gun Barrel
  X.fillRect(6 - rR, 2.5, 15 + (lvl > 1 ? 4 : 0), 3.5);

  // Level 3 Quad Barrels
  if (lvl >= 3) {
    X.fillRect(6 - rL, -9.5, 16, 2.5);
    X.fillRect(6 - rR, 7, 16, 2.5);
    // Plasma energy glow ring on barrels
    X.fillStyle = 'rgba(56, 189, 248, 0.75)';
    X.fillRect(14, -7, 2, 14);
  }

  // Barrel Muzzle Brakes & Heat Patina
  if (heat > 0.05) {
    X.fillStyle = `rgba(239, 68, 68, ${Math.min(0.85, heat)})`;
    X.fillRect(17 - rL, -6.5, 4, 4.5);
    X.fillRect(17 - rR, 2, 4, 4.5);
  }

  // Central Armored Gun Housing / Turret Turntable
  X.fillStyle = lvl >= 3 ? '#1e2838' : '#2f3b2a';
  X.beginPath();
  X.arc(0, 0, 9 + (lvl >= 2 ? 1.5 : 0), 0, 6.28);
  X.fill();
  X.strokeStyle = '#172014';
  X.lineWidth = 2.2;
  X.stroke();

  // Top Optic Sensor Dome & Blinking LED
  X.fillStyle = '#0f172a';
  X.beginPath(); X.arc(2, 0, 4.5, 0, 6.28); X.fill();

  const ledCol = t.hasTarget ? '#ef4444' : '#22c55e';
  X.fillStyle = ledCol;
  X.beginPath(); X.arc(2, 0, 2, 0, 6.28); X.fill();

  // Sensor Antenna Mast (Radar Dish if Level >= 2)
  if (lvl >= 2) {
    X.strokeStyle = '#64748b';
    X.lineWidth = 2;
    X.beginPath(); X.arc(-7, 0, 5, -1.2, 1.2); X.stroke();
  } else {
    X.strokeStyle = '#475569';
    X.lineWidth = 1.5;
    X.beginPath(); X.moveTo(-4, 0); X.lineTo(-10, -5); X.stroke();
    X.fillStyle = '#38bdf8';
    X.beginPath(); X.arc(-10, -5, 1.2, 0, 6.28); X.fill();
  }

  X.restore();
  X.restore();
}

function drawTurretDebris(cx, cy, W, H) {
  for (const deb of TURRET_DEBRIS) {
    if (deb.x < cx - 20 || deb.x > cx + W + 20 || deb.y < cy - 20 || deb.y > cy + H + 20) continue;
    const alpha = Math.min(1, deb.l / 1.0);
    X.save();
    X.translate(deb.x, deb.y);
    X.rotate(deb.rot);
    X.globalAlpha = alpha;
    if (deb.type === 0) {
      X.fillStyle = '#334155';
      X.fillRect(-deb.sz / 2, -deb.sz / 3, deb.sz, deb.sz * 0.7);
    } else if (deb.type === 1) {
      X.fillStyle = '#eab308';
      X.beginPath(); X.arc(0, 0, deb.sz * 0.4, 0, 6.28); X.fill();
    } else {
      X.fillStyle = '#1e293b';
      X.fillRect(-deb.sz / 2, -1.5, deb.sz, 3);
    }
    X.restore();
  }
}
