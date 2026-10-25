// DEAD ZONE v2.0 - ZOMBIE ARCHETYPES & ATTACK TELEGRAPHS
// Senior 2D Artist / Technical Animation Pipeline

function drawTelegraph(z) {
  if (!z || z.dead) return;
  const a = Math.atan2(P.y - z.y, P.x - z.x);
  const dToP = Math.hypot(P.x - z.x, P.y - z.y);

  // 1. Melee attack windup telegraph for Walkers & Runners when closing in
  if ((z.t === 'walk' || z.t === 'run' || z.t === 'brute') && dToP < 55) {
    const pulse = 0.5 + Math.sin((S.t || 0) * 16) * 0.5;
    X.save();
    X.translate(z.x, z.y);
    X.rotate(a);
    // Red attack sector arc on the ground
    X.fillStyle = 'rgba(255, 40, 20, ' + (0.15 + pulse * 0.2) + ')';
    X.beginPath();
    X.moveTo(0, 0);
    X.arc(0, 0, (z.t === 'brute' ? 52 : 36), -0.7, 0.7);
    X.closePath();
    X.fill();
    X.strokeStyle = 'rgba(255, 60, 30, ' + (0.4 + pulse * 0.5) + ')';
    X.lineWidth = 2;
    X.beginPath();
    X.arc(0, 0, (z.t === 'brute' ? 52 : 36), -0.7, 0.7);
    X.stroke();
    // Eye gleam spark during windup
    X.fillStyle = '#ffffff';
    X.beginPath();
    X.arc(14, -4, 1.8 + pulse * 1.2, 0, 6.28);
    X.fill();
    X.restore();
  }

  // 2. Boss multi-phase attack telegraphs
  if (z.t === 'boss') {
    const bv = z.bv || 0;
    // Phase 0: Ground slam AoE shockwave
    if (bv === 0 && z.bs != null && z.bs < 1.1 && z.bs > 0) {
      const pct = Math.min(1, Math.max(0, 1 - z.bs / 1.1));
      X.save();
      // Outer expanding danger zone
      X.fillStyle = 'rgba(255, 60, 10, ' + (pct * 0.22) + ')';
      X.beginPath(); X.arc(z.x, z.y, 185 * pct, 0, 6.28); X.fill();
      // Pulsing boundary ring with hazard dashes
      X.strokeStyle = 'rgba(255, 90, 20, ' + (0.35 + pct * 0.6) + ')';
      X.lineWidth = 2.5 + pct * 2.5;
      X.setLineDash([12, 6]);
      X.beginPath(); X.arc(z.x, z.y, 185, 0, 6.28); X.stroke();
      X.setLineDash([]);
      // Radial ground fracture cracks
      X.strokeStyle = 'rgba(255, 170, 40, ' + (0.45 + pct * 0.55) + ')';
      X.lineWidth = 2.2;
      for (let k = 0; k < 8; k++) {
        const ca = k * 0.785 + (z.ph || 0) * 0.15;
        const cr1 = 22, cr2 = 185 * pct;
        X.beginPath();
        X.moveTo(z.x + Math.cos(ca) * cr1, z.y + Math.sin(ca) * cr1);
        X.lineTo(z.x + Math.cos(ca + 0.14) * (cr2 * 0.52), z.y + Math.sin(ca + 0.14) * (cr2 * 0.52));
        X.lineTo(z.x + Math.cos(ca - 0.08) * cr2, z.y + Math.sin(ca - 0.08) * cr2);
        X.stroke();
      }
      X.restore();
    }
    // Phase 2: Venom spray fan
    else if (bv === 2 && z.bs != null && z.bs < 0.75 && z.bs > 0) {
      const pct = Math.min(1, Math.max(0, 1 - z.bs / 0.75)), bLen = 290 * pct;
      X.save();
      X.strokeStyle = 'rgba(100, 255, 60, ' + (0.28 + pct * 0.6) + ')';
      X.lineWidth = 2.2;
      X.setLineDash([8, 5]);
      for (let k = -2; k <= 2; k++) {
        const ba = a + k * 0.22;
        X.beginPath();
        X.moveTo(z.x, z.y);
        X.lineTo(z.x + Math.cos(ba) * bLen, z.y + Math.sin(ba) * bLen);
        X.stroke();
      }
      X.setLineDash([]);
      X.restore();
    }
    // Phase 3: Orbital lock-on crosshair
    else if (bv === 3 && z.bc2 != null && z.bc2 < 0.95 && z.bc2 > 0) {
      const pct = Math.min(1, Math.max(0, 1 - z.bc2 / 0.95));
      X.save();
      X.strokeStyle = 'rgba(255, 40, 40, ' + (0.35 + pct * 0.65) + ')';
      X.lineWidth = 1.8 + pct * 1.6;
      X.setLineDash([7, 4]);
      X.beginPath(); X.moveTo(z.x, z.y); X.lineTo(P.x, P.y); X.stroke();
      X.setLineDash([]);
      X.translate(P.x, P.y);
      X.rotate((S.t || 0) * 7);
      const lkR = 26 - pct * 9;
      X.strokeStyle = 'rgba(255, 50, 40, ' + (0.45 + pct * 0.55) + ')';
      X.lineWidth = 2;
      X.beginPath(); X.arc(0, 0, lkR, 0, 6.28); X.stroke();
      for (let tk = 0; tk < 4; tk++) {
        const ta = tk * 1.57;
        X.beginPath();
        X.moveTo(Math.cos(ta) * (lkR - 5), Math.sin(ta) * (lkR - 5));
        X.lineTo(Math.cos(ta) * (lkR + 6), Math.sin(ta) * (lkR + 6));
        X.stroke();
      }
      X.restore();
    }
  }
  // 3. Spitter acid shot trajectory
  else if (z.t === 'spit' && z.sc != null && z.sc < 0.7 && z.sc > 0) {
    const pct = Math.min(1, Math.max(0, 1 - z.sc / 0.7)), spitDist = Math.min(480, dToP);
    if (spitDist < 520 && hasLOS(z.x, z.y, P.x, P.y)) {
      X.save();
      X.strokeStyle = 'rgba(70, 255, 50, ' + (0.25 + pct * 0.65) + ')';
      X.lineWidth = 1.6 + pct * 1.8;
      X.setLineDash([8, 6]);
      X.beginPath();
      X.moveTo(z.x, z.y);
      X.lineTo(z.x + Math.cos(a) * spitDist, z.y + Math.sin(a) * spitDist);
      X.stroke();
      X.setLineDash([]);
      const tx = z.x + Math.cos(a) * spitDist, ty = z.y + Math.sin(a) * spitDist;
      X.fillStyle = 'rgba(80, 255, 40, ' + (pct * 0.25) + ')';
      X.beginPath(); X.arc(tx, ty, 15 * pct, 0, 6.28); X.fill();
      X.strokeStyle = 'rgba(110, 255, 70, ' + (0.35 + pct * 0.65) + ')';
      X.lineWidth = 1.6;
      X.beginPath(); X.arc(tx, ty, 15, 0, 6.28); X.stroke();
      X.restore();
    }
  }
  // 4. Charger rush lane projection
  else if (z.t === 'charger' && z.cgT != null && z.cgT < 0.85 && z.cgT > 0) {
    const pct = Math.min(1, Math.max(0, 1 - z.cgT / 0.85)), chLen = 240;
    X.save();
    X.translate(z.x, z.y);
    X.rotate(a);
    // Danger lane fill
    X.fillStyle = 'rgba(255, 100, 20, ' + (pct * 0.22) + ')';
    X.fillRect(0, -15, chLen * pct, 30);
    // Hazard boundary lines
    X.strokeStyle = 'rgba(255, 130, 30, ' + (0.35 + pct * 0.55) + ')';
    X.lineWidth = 2.2;
    X.strokeRect(0, -15, chLen * pct, 30);
    // Forward directional arrow chevrons
    X.fillStyle = 'rgba(255, 190, 40, ' + (0.45 + pct * 0.55) + ')';
    for (let k = 30; k < chLen * pct - 15; k += 35) {
      X.beginPath();
      X.moveTo(k, -11);
      X.lineTo(k + 14, 0);
      X.lineTo(k, 11);
      X.lineTo(k - 5, 11);
      X.lineTo(k + 9, 0);
      X.lineTo(k - 5, -11);
      X.closePath();
      X.fill();
    }
    X.restore();
  }
}

// 4-LAYER ZOMBIE SPRITE RENDERING
function drawZombie(z) {
  if (!z || z.dead) return;
  const T = (typeof ZT !== 'undefined' && ZT[z.t]) ? ZT[z.t] : { r: 14, col: '#4a5736' };
  const sc = Math.max(0.01, Math.min(1, (z.age || 0) * 3) * (1 + Math.sin(z.ph || 0) * 0.05) || 0.01);
  const a = Math.atan2(P.y - z.y, P.x - z.x);
  const sw = Math.sin(z.ph || 0);
  const isHit = z.hit > 0;
  const isFlinch = (z.flinch > 0);
  const hitSquash = (isHit || isFlinch) ? 1.25 : 1;
  const wobble = Math.sin(((S.t || 0) * 7) + (z.animOffset || 0)) * 0.1;
  const dToP = Math.hypot(P.x - z.x, P.y - z.y);
  const isDamaged = (z.hp < z.mh * 0.5);

  // Poison aura overlay
  if (z.ps > 0) {
    X.strokeStyle = 'rgba(100, 240, 60, 0.7)';
    X.lineWidth = 2.2;
    X.beginPath(); X.arc(z.x, z.y, T.r * sc + 4, 0, 6.28); X.stroke();
  }

  // Close-proximity danger ring
  if (dToP < 55) {
    X.strokeStyle = 'rgba(255, 60, 40, ' + (0.65 + Math.sin((S.t || 0) * 12) * 0.35) + ')';
    X.lineWidth = 2.5;
    X.beginPath(); X.arc(z.x, z.y, T.r * sc + 5, 0, 6.28); X.stroke();
  }

  // Stalker stealth opacity
  if (z.t === 'stalker') {
    X.globalAlpha = dToP > 180 ? 0.45 : 1;
    X.strokeStyle = 'rgba(201, 85, 255, ' + (dToP > 180 ? 0.75 : 0.3) + ')';
    X.lineWidth = 2;
    X.beginPath(); X.arc(z.x, z.y, T.r * sc + 3, 0, 6.28); X.stroke();
  } else {
    X.globalAlpha = 1;
  }

  // Layer 1: Directional ground drop shadow (casts bottom-right)
  X.fillStyle = 'rgba(0,0,0,0.48)';
  X.beginPath();
  X.ellipse(z.x + 4, z.y + 6, T.r * sc * 1.15, T.r * sc * 0.8, a, 0, 6.28);
  X.fill();

  // Elite glowing orbital aura
  if (z.el) {
    X.strokeStyle = '#ffd84a';
    X.lineWidth = 2.5;
    X.setLineDash([6, 4]);
    X.beginPath(); X.arc(z.x, z.y, T.r * sc + 6 + Math.sin((S.t || 0) * 8) * 2, 0, 6.28); X.stroke();
    X.setLineDash([]);
  }

  // Frozen aura
  if ((typeof S !== 'undefined' && S.fz > 0) || (z.fz > 0)) {
    X.fillStyle = 'rgba(155, 231, 255, 0.35)';
    X.beginPath(); X.arc(z.x, z.y, T.r * sc + 3.5, 0, 6.28); X.fill();
  }

  X.save();
  X.translate(z.x, z.y);
  X.rotate(a + wobble);
  X.scale(sc * hitSquash, sc / hitSquash);

  const r = T.r;
  const fc = isHit ? '#ffffff' : null;

  // ARCHETYPE 1: WALKER (Shambling Rotten Corpse)
  if (z.t === 'walk') {
    const bodyCol = fc || (z.el ? '#8a7830' : '#4a5736');
    const clothCol = fc || '#242b1d';

    // Layer 2: Shambling arms reaching out
    X.strokeStyle = bodyCol;
    X.lineWidth = 4.8;
    X.lineCap = 'round';
    X.beginPath();
    X.moveTo(0, -r * 0.6);
    X.lineTo(r * 0.6 + sw * 3, -r * 0.7);
    X.lineTo(r * 1.15 + sw * 4, -r * 0.45);
    X.stroke();
    X.fillStyle = fc || '#323c22';
    X.beginPath(); X.arc(r * 1.15 + sw * 4, -r * 0.45, 2.5, 0, 6.28); X.fill();

    X.beginPath();
    X.moveTo(0, r * 0.6);
    X.lineTo(r * 0.7 - sw * 3, r * 0.7);
    X.lineTo(r * 1.25 - sw * 4, r * 0.4);
    X.stroke();
    X.beginPath(); X.arc(r * 1.25 - sw * 4, r * 0.4, 2.5, 0, 6.28); X.fill();

    // Layer 3: Decaying torso & tattered clothes
    X.fillStyle = clothCol;
    X.beginPath(); X.ellipse(-2, 0, r * 0.82, r * 0.72, 0, 0, 6.28); X.fill();
    X.fillStyle = bodyCol;
    X.beginPath(); X.ellipse(1, 0, r * 0.66, r * 0.56, 0, 0, 6.28); X.fill();

    // Ribcage / tattered cloth tears
    X.strokeStyle = '#161c11';
    X.lineWidth = 1.6;
    X.beginPath();
    X.moveTo(-4, -r * 0.3); X.lineTo(2, -r * 0.2);
    X.moveTo(-3, 0); X.lineTo(3, 0);
    X.moveTo(-4, r * 0.3); X.lineTo(2, r * 0.2);
    X.stroke();

    // Under 50% HP damaged state: exposed bloody ribs
    if (isDamaged && !fc) {
      X.strokeStyle = '#8a1818';
      X.lineWidth = 2.2;
      X.beginPath();
      X.moveTo(-2, -r * 0.25); X.lineTo(2, -r * 0.15);
      X.moveTo(-2, r * 0.25); X.lineTo(2, r * 0.15);
      X.stroke();
      X.fillStyle = '#f3f4f6'; // Bone shard
      X.fillRect(-1, -r * 0.2, 2, 2);
      X.fillRect(-1, r * 0.2, 2, 2);
    }

    // Layer 4: Head & feral glowing eyes
    X.fillStyle = bodyCol;
    X.beginPath(); X.arc(r * 0.36, 0, r * 0.46, 0, 6.28); X.fill();
    X.fillStyle = '#8a947c';
    X.beginPath(); X.arc(r * 0.26, -r * 0.15, r * 0.18, 0, 6.28); X.fill();
    // Eyes: sickly yellow-green
    X.fillStyle = fc || '#b8e834';
    X.beginPath();
    X.arc(r * 0.56, -r * 0.18, 2, 0, 6.28);
    X.arc(r * 0.56, r * 0.18, 2, 0, 6.28);
    X.fill();
  }
  // ARCHETYPE 2: RUNNER (Feral Fast Hunter)
  else if (z.t === 'run') {
    const bodyCol = fc || (z.el ? '#c4a63a' : '#8c8038');
    const spineCol = fc || '#4a421c';
    const clawSw = Math.sin(z.ph * 2.2);

    // Speed streak shadow
    X.fillStyle = 'rgba(140,128,56,0.22)';
    X.beginPath(); X.ellipse(-r * 0.8, 0, r * 0.65, r * 0.42, 0, 0, 6.28); X.fill();

    // Aggressive sweeping claws
    X.strokeStyle = bodyCol;
    X.lineWidth = 4.2;
    X.lineCap = 'round';
    X.beginPath();
    X.moveTo(-r * 0.2, -r * 0.6);
    X.lineTo(r * 0.5 + clawSw * 4, -r * 0.8);
    X.lineTo(r * 1.25 + clawSw * 6, -r * 0.3);
    X.moveTo(-r * 0.2, r * 0.6);
    X.lineTo(r * 0.5 - clawSw * 4, r * 0.8);
    X.lineTo(r * 1.25 - clawSw * 6, r * 0.3);
    X.stroke();

    // Bloody talons
    X.fillStyle = fc || '#c82828';
    X.beginPath();
    X.arc(r * 1.25 + clawSw * 6, -r * 0.3, 3.2, 0, 6.28);
    X.arc(r * 1.25 - clawSw * 6, r * 0.3, 3.2, 0, 6.28);
    X.fill();

    // Slender athletic torso
    X.fillStyle = bodyCol;
    X.beginPath(); X.ellipse(-r * 0.2, 0, r * 0.86, r * 0.52, 0, 0, 6.28); X.fill();

    // Exposed spine vertebra
    X.fillStyle = spineCol;
    for (let k = -3; k <= 1; k++) X.fillRect(k * r * 0.2 - 2, -2, 3, 4);

    if (isDamaged && !fc) {
      X.fillStyle = '#b91c1c';
      X.fillRect(-r * 0.3, -r * 0.3, 5, 3);
      X.fillRect(-r * 0.1, r * 0.2, 6, 3);
    }

    // Snarling head with blazing red feral eyes
    X.fillStyle = bodyCol;
    X.beginPath(); X.ellipse(r * 0.46, 0, r * 0.46, r * 0.36, 0, 0, 6.28); X.fill();
    X.fillStyle = fc || '#ff1e1e';
    X.beginPath();
    X.arc(r * 0.66, -r * 0.16, 2.2, 0, 6.28);
    X.arc(r * 0.66, r * 0.16, 2.2, 0, 6.28);
    X.fill();
  }
  // ARCHETYPE 3: EXPLODER (Volatile Bloater)
  else if (z.t === 'exp') {
    const pulse = 1 + Math.sin((S.t || 0) * 8 + (z.ph || 0)) * 0.14;
    const bodyCol = fc || (z.el ? '#e08a28' : '#b85c1c');

    X.fillStyle = bodyCol;
    X.beginPath(); X.arc(0, 0, r * pulse, 0, 6.28); X.fill();

    const coreGlow = X.createRadialGradient(0, 0, 2, 0, 0, r * pulse);
    coreGlow.addColorStop(0, fc || 'rgba(255,230,80,0.75)');
    coreGlow.addColorStop(0.6, fc || 'rgba(230,90,20,0.45)');
    coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = coreGlow;
    X.beginPath(); X.arc(0, 0, r * pulse, 0, 6.28); X.fill();

    const psts = [[-r * 0.4, -r * 0.5, r * 0.38], [r * 0.2, -r * 0.6, r * 0.32], [-r * 0.5, r * 0.4, r * 0.35], [r * 0.1, r * 0.65, r * 0.3], [-r * 0.7, 0, r * 0.34]];
    psts.forEach((p, idx) => {
      X.fillStyle = idx % 2 === 0 ? (fc || '#e8ea38') : (fc || '#ff8818');
      X.beginPath(); X.arc(p[0], p[1], p[2] * pulse, 0, 6.28); X.fill();
      X.fillStyle = '#ffffff77';
      X.beginPath(); X.arc(p[0] - 1, p[1] - 1, p[2] * 0.35, 0, 6.28); X.fill();
    });

    X.strokeStyle = bodyCol;
    X.lineWidth = 3.6;
    X.beginPath();
    X.moveTo(r * 0.4, -r * 0.7); X.lineTo(r * 0.7, -r * 0.8);
    X.moveTo(r * 0.4, r * 0.7); X.lineTo(r * 0.7, r * 0.8);
    X.stroke();

    X.fillStyle = bodyCol;
    X.beginPath(); X.arc(r * 0.65, 0, r * 0.3, 0, 6.28); X.fill();
    X.fillStyle = fc || '#ffff44';
    X.beginPath();
    X.arc(r * 0.8, -r * 0.12, 1.8, 0, 6.28);
    X.arc(r * 0.8, r * 0.12, 1.8, 0, 6.28);
    X.fill();

    // Exploder under 50% HP damaged state: ruptured burning fissures
    if (isDamaged && !fc) {
      X.strokeStyle = '#ef4444';
      X.lineWidth = 2.2;
      X.beginPath();
      X.moveTo(-r * 0.3, -r * 0.2); X.lineTo(r * 0.1, 0); X.lineTo(-r * 0.1, r * 0.3);
      X.stroke();
      X.fillStyle = '#ff8818';
      X.fillRect(-1, -2, 4, 3);
    }
  }
  // ARCHETYPE 4: BRUTE (Armored Heavy Behemoth)
  else if (z.t === 'brute') {
    const skinCol = fc || (z.el ? '#8a6230' : '#4a3f36');
    const armorCol = fc || '#24201c';

    // Massive muscular bulk
    X.fillStyle = skinCol;
    X.beginPath(); X.ellipse(0, 0, r * 0.95, r * 0.85, 0, 0, 6.28); X.fill();
    X.strokeStyle = '#1a1612';
    X.lineWidth = 3;
    X.stroke();

    // Heavy shoulder armor pauldrons
    X.fillStyle = armorCol;
    X.beginPath();
    X.roundRect(-r * 0.7, -r * 0.9, r * 0.65, r * 0.55, 3);
    X.roundRect(-r * 0.7, r * 0.35, r * 0.65, r * 0.55, 3);
    X.fill();
    X.strokeStyle = '#443c34';
    X.lineWidth = 1.8;
    X.stroke();

    // Massive spiked fists
    X.fillStyle = skinCol;
    X.beginPath();
    X.arc(r * 0.7, -r * 0.6, 6.5, 0, 6.28);
    X.arc(r * 0.7, r * 0.6, 6.5, 0, 6.28);
    X.fill();
    X.fillStyle = '#d4d4d8'; // Spikes
    X.fillRect(r * 0.85, -r * 0.65, 4, 3);
    X.fillRect(r * 0.85, r * 0.55, 4, 3);

    // Deep battle scars
    X.strokeStyle = isDamaged ? '#b91c1c' : '#221a14';
    X.lineWidth = 2.4;
    X.beginPath();
    X.moveTo(-r * 0.3, -r * 0.4); X.lineTo(r * 0.2, -r * 0.1);
    X.moveTo(-r * 0.4, r * 0.2); X.lineTo(r * 0.1, r * 0.5);
    X.stroke();

    // Heavy cranium with glowing yellow eyes
    X.fillStyle = skinCol;
    X.beginPath(); X.arc(r * 0.45, 0, r * 0.42, 0, 6.28); X.fill();
    X.fillStyle = fc || '#facc15';
    X.beginPath();
    X.arc(r * 0.68, -r * 0.18, 2.5, 0, 6.28);
    X.arc(r * 0.68, r * 0.18, 2.5, 0, 6.28);
    X.fill();
  }
  // ARCHETYPE 5: SPITTER (Acidic Range Attacker)
  else if (z.t === 'spit') {
    const skinCol = fc || (z.el ? '#3a7a40' : '#265430');
    const sacPulse = 1 + Math.sin((S.t || 0) * 6) * 0.15;

    // Acid sac on back
    X.fillStyle = fc || '#4ade80';
    X.beginPath(); X.arc(-r * 0.4, 0, r * 0.58 * sacPulse, 0, 6.28); X.fill();
    X.fillStyle = 'rgba(255,255,255,0.45)';
    X.beginPath(); X.arc(-r * 0.45, -r * 0.15, r * 0.22, 0, 6.28); X.fill();

    // Humped body
    X.fillStyle = skinCol;
    X.beginPath(); X.ellipse(0, 0, r * 0.8, r * 0.62, 0, 0, 6.28); X.fill();

    // Thin insectoid arms
    X.strokeStyle = skinCol;
    X.lineWidth = 3.5;
    X.beginPath();
    X.moveTo(0, -r * 0.5); X.lineTo(r * 0.8, -r * 0.4);
    X.moveTo(0, r * 0.5); X.lineTo(r * 0.8, r * 0.4);
    X.stroke();

    // Distended acidic jaw & neon green eyes
    X.fillStyle = skinCol;
    X.beginPath(); X.arc(r * 0.45, 0, r * 0.38, 0, 6.28); X.fill();
    X.fillStyle = fc || '#22c55e';
    X.beginPath();
    X.arc(r * 0.65, -r * 0.14, 2.2, 0, 6.28);
    X.arc(r * 0.65, r * 0.14, 2.2, 0, 6.28);
    X.fill();
    // Acid drool drip
    if (!fc && Math.random() < 0.2) {
      X.fillStyle = '#4ade80';
      X.fillRect(r * 0.7, -1, 3, 2);
    }
    // Under 50% HP damaged state: ruptured acid sac
    if (isDamaged && !fc) {
      X.fillStyle = '#15803d';
      X.beginPath(); X.arc(-r * 0.35, r * 0.15, r * 0.3, 0, 6.28); X.fill();
      X.fillStyle = '#86efac';
      X.fillRect(-r * 0.45, 0, 7, 2.5);
    }
  }
  // ARCHETYPE 6: CHARGER (Armored Battering Ram)
  else if (z.t === 'charger') {
    const skinCol = fc || (z.el ? '#8a5a2a' : '#523420');
    const armorCol = fc || '#241810';

    // Charger ghost afterimage while charging
    if (z.ch > 0 && Math.random() < 0.45 && typeof CHARGER_TRAILS !== 'undefined') {
      CHARGER_TRAILS.push({ x: z.x, y: z.y, a, r, el: z.el, l: 0.25, maxL: 0.25 });
      if (CHARGER_TRAILS.length > 30) CHARGER_TRAILS.shift();
    }

    // Massive charging body
    X.fillStyle = skinCol;
    X.beginPath(); X.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, 6.28); X.fill();

    // Armored crest plate
    X.fillStyle = armorCol;
    X.beginPath();
    X.moveTo(r * 0.4, -r * 0.7);
    X.lineTo(r * 1.1, -r * 0.4);
    X.lineTo(r * 1.25, 0);
    X.lineTo(r * 1.1, r * 0.4);
    X.lineTo(r * 0.4, r * 0.7);
    X.closePath();
    X.fill();
    X.strokeStyle = '#f97316';
    X.lineWidth = 2.2;
    X.stroke();

    // Under 50% HP damaged state: cracked armor horn
    if (isDamaged && !fc) {
      X.strokeStyle = '#b91c1c';
      X.lineWidth = 2.4;
      X.beginPath();
      X.moveTo(r * 0.4, -r * 0.3); X.lineTo(r * 0.8, -r * 0.1);
      X.stroke();
      X.fillStyle = '#f97316';
      X.fillRect(r * 0.7, -r * 0.25, 4, 3);
    }

    // Armored forward horns
    X.fillStyle = '#e2e8f0';
    X.beginPath();
    X.moveTo(r * 1.0, -r * 0.35); X.lineTo(r * 1.45, -r * 0.5); X.lineTo(r * 1.05, -r * 0.15); X.closePath(); X.fill();
    X.beginPath();
    X.moveTo(r * 1.0, r * 0.35); X.lineTo(r * 1.45, r * 0.5); X.lineTo(r * 1.05, r * 0.15); X.closePath(); X.fill();

    // Blazing orange charger eyes
    X.fillStyle = fc || '#ff6600';
    X.beginPath();
    X.arc(r * 0.72, -r * 0.18, 2.8, 0, 6.28);
    X.arc(r * 0.72, r * 0.18, 2.8, 0, 6.28);
    X.fill();
  }
  // ARCHETYPE 7: STALKER (Cloaked Assassin)
  else if (z.t === 'stalker') {
    const skinCol = fc || '#2a1a38';
    X.fillStyle = skinCol;
    X.beginPath(); X.ellipse(0, 0, r * 0.85, r * 0.5, 0, 0, 6.28); X.fill();
    X.strokeStyle = '#c084fc';
    X.lineWidth = 2;
    X.stroke();

    // Under 50% HP damaged state: flickering purple void tears
    if (isDamaged && !fc) {
      X.strokeStyle = '#e879f9';
      X.lineWidth = 2.0;
      X.beginPath();
      X.moveTo(-r * 0.4, -r * 0.2); X.lineTo(r * 0.2, r * 0.15);
      X.stroke();
      X.fillStyle = '#581c87';
      X.fillRect(-2, -2, 5, 4);
    }

    // Curved scythe blades
    X.fillStyle = '#a855f7';
    X.beginPath();
    X.moveTo(r * 0.2, -r * 0.5); X.quadraticCurveTo(r * 1.1, -r * 0.8, r * 1.3, -r * 0.2); X.lineTo(r * 0.6, -r * 0.3); X.closePath(); X.fill();
    X.beginPath();
    X.moveTo(r * 0.2, r * 0.5); X.quadraticCurveTo(r * 1.1, r * 0.8, r * 1.3, r * 0.2); X.lineTo(r * 0.6, r * 0.3); X.closePath(); X.fill();
    // Purple ethereal eyes
    X.fillStyle = fc || '#e879f9';
    X.beginPath();
    X.arc(r * 0.55, -r * 0.15, 2.2, 0, 6.28);
    X.arc(r * 0.55, r * 0.15, 2.2, 0, 6.28);
    X.fill();
  }
  // ARCHETYPE 8: BOSS VARIANTS (Brute, Necromancer, Spitter Queen, Juggernaut)
  else if (z.t === 'boss') {
    const bv = z.bv || 0;
    if (bv === 0) {
      // Brute Warlord
      const rockCol = fc || '#3e241f', magmaCol = fc || '#e85025';
      X.fillStyle = rockCol; X.beginPath(); X.arc(0, 0, r, 0, 6.28); X.fill();
      X.strokeStyle = magmaCol; X.lineWidth = 3.5;
      X.beginPath();
      X.moveTo(-r * 0.6, -r * 0.3); X.lineTo(0, -r * 0.5); X.lineTo(r * 0.5, -r * 0.2);
      X.moveTo(-r * 0.5, r * 0.4); X.lineTo(-r * 0.1, r * 0.2); X.lineTo(r * 0.3, r * 0.5);
      X.stroke();
      X.fillStyle = rockCol; X.beginPath(); X.arc(r * 0.45, 0, r * 0.45, 0, 6.28); X.fill();
      X.strokeStyle = '#734e45'; X.stroke();
      X.strokeStyle = magmaCol; X.lineWidth = 6; X.lineCap = 'round';
      X.beginPath();
      X.moveTo(r * 0.3, -r * 0.4); X.quadraticCurveTo(r * 1.0, -r * 0.9, r * 1.4, -r * 0.3);
      X.moveTo(r * 0.3, r * 0.4); X.quadraticCurveTo(r * 1.0, r * 0.9, r * 1.4, r * 0.3);
      X.stroke();
      X.fillStyle = fc || '#ffea40';
      X.beginPath(); X.arc(r * 0.68, -r * 0.18, 3.5, 0, 6.28); X.arc(r * 0.68, r * 0.18, 3.5, 0, 6.28); X.fill();
    } else if (bv === 1) {
      // Necromancer
      const robeCol = fc || '#1e122b', soulCol = fc || '#c955ff';
      for (let k = 0; k < 3; k++) {
        const orbAng = (S.t || 0) * 2.8 + k * 2.094, ox = Math.cos(orbAng) * (r + 14), oy = Math.sin(orbAng) * (r + 14);
        X.fillStyle = fc || '#df8aff'; X.beginPath(); X.arc(ox, oy, 6, 0, 6.28); X.fill();
        X.fillStyle = '#220833'; X.beginPath(); X.arc(ox + 1.5, oy - 1.5, 1.5, 0, 6.28); X.arc(ox + 1.5, oy + 1.5, 1.5, 0, 6.28); X.fill();
      }
      X.fillStyle = robeCol; X.beginPath(); X.ellipse(-4, 0, r * 0.9, r * 0.75, 0, 0, 6.28); X.fill();
      X.strokeStyle = '#432661'; X.lineWidth = 2.5;
      X.beginPath(); X.moveTo(-r * 0.8, -r * 0.4); X.lineTo(-r * 0.2, 0); X.lineTo(-r * 0.8, r * 0.4); X.stroke();
      X.fillStyle = '#11081a'; X.beginPath(); X.arc(r * 0.35, 0, r * 0.48, 0, 6.28); X.fill();
      X.strokeStyle = soulCol; X.lineWidth = 2; X.stroke();
      X.fillStyle = fc || '#ff88ff';
      X.beginPath(); X.arc(r * 0.6, -r * 0.16, 3, 0, 6.28); X.arc(r * 0.6, r * 0.16, 3, 0, 6.28); X.fill();
    } else if (bv === 2) {
      // Spitter Queen
      const bodyCol = fc || '#162e1d', eggCol = fc || '#38b84d', legSw = Math.sin(z.ph * 1.5);
      X.strokeStyle = fc || '#2a5435'; X.lineWidth = 4; X.lineCap = 'round';
      [-1, 0, 1].forEach((k, idx) => {
        const f = idx % 2 === 0 ? legSw : -legSw;
        X.beginPath(); X.moveTo(k * r * 0.4, -r * 0.5); X.lineTo(k * r * 0.4 - r * 0.3, -r * 0.9 + f * 4); X.lineTo(k * r * 0.4 + r * 0.2, -r * 1.35 + f * 6); X.stroke();
        X.beginPath(); X.moveTo(k * r * 0.4, r * 0.5); X.lineTo(k * r * 0.4 - r * 0.3, r * 0.9 - f * 4); X.lineTo(k * r * 0.4 + r * 0.2, r * 1.35 - f * 6); X.stroke();
      });
      const eggPulse = 1 + Math.sin((S.t || 0) * 5) * 0.1;
      X.fillStyle = bodyCol; X.beginPath(); X.ellipse(-r * 0.35, 0, r * 0.75 * eggPulse, r * 0.65 * eggPulse, 0, 0, 6.28); X.fill();
      X.fillStyle = eggCol; X.beginPath();
      X.arc(-r * 0.5, -r * 0.25, r * 0.2, 0, 6.28); X.arc(-r * 0.5, r * 0.25, r * 0.2, 0, 6.28); X.arc(-r * 0.2, 0, r * 0.22, 0, 6.28); X.fill();
      X.fillStyle = '#0f2415'; X.beginPath(); X.arc(r * 0.4, 0, r * 0.44, 0, 6.28); X.fill();
      X.fillStyle = fc || '#77ff33';
      X.beginPath();
      X.arc(r * 0.6, -r * 0.2, 2.5, 0, 6.28); X.arc(r * 0.6, r * 0.2, 2.5, 0, 6.28);
      X.arc(r * 0.7, -r * 0.08, 2, 0, 6.28); X.arc(r * 0.7, r * 0.08, 2, 0, 6.28); X.fill();
    } else {
      // Juggernaut
      const metalCol = fc || '#1e2838', armorCol = fc || '#303f56', stripeCol = fc || '#e0a820', jetPulse = Math.random() * 6;
      X.fillStyle = '#111722'; X.fillRect(r * 0.1, -r * 0.85, r * 0.9, r * 0.25); X.fillRect(r * 0.1, r * 0.6, r * 0.9, r * 0.25);
      X.strokeStyle = armorCol; X.lineWidth = 2; X.strokeRect(r * 0.1, -r * 0.85, r * 0.9, r * 0.25); X.strokeRect(r * 0.1, r * 0.6, r * 0.9, r * 0.25);
      X.fillStyle = '#ff6600'; X.fillRect(-r * 1.1 - jetPulse, -r * 0.45, r * 0.3 + jetPulse, r * 0.25); X.fillRect(-r * 1.1 - jetPulse, r * 0.2, r * 0.3 + jetPulse, r * 0.25);
      X.fillStyle = metalCol; X.beginPath(); X.roundRect(-r * 0.8, -r * 0.7, r * 1.5, r * 1.4, 8); X.fill();
      X.strokeStyle = armorCol; X.lineWidth = 3; X.stroke();
      X.fillStyle = stripeCol; X.fillRect(-r * 0.3, -r * 0.5, r * 0.18, r);
      X.fillStyle = '#111'; for (let st = -r * 0.5; st < r * 0.5; st += 8) X.fillRect(-r * 0.3, st, r * 0.18, 4);
      X.fillStyle = armorCol; X.beginPath(); X.roundRect(r * 0.1, -r * 0.4, r * 0.55, r * 0.8, 5); X.fill();
      X.fillStyle = fc || '#ff2020'; const visorSw = Math.sin((S.t || 0) * 8) * (r * 0.2);
      X.fillRect(r * 0.55, -r * 0.25, 4, r * 0.5); X.fillStyle = '#fff'; X.fillRect(r * 0.55, -3 + visorSw, 4, 6);
    }

    // Boss under 50% HP damaged state: raging glowing fractures & sparked exhaust
    if (isDamaged && !fc) {
      X.strokeStyle = '#f87171';
      X.lineWidth = 3.0;
      X.beginPath();
      X.arc(0, 0, r * 0.75, -1.2, 1.2);
      X.stroke();
      X.fillStyle = '#fbbf24';
      X.fillRect(-r * 0.2, -r * 0.2, 6, 4);
      X.fillRect(r * 0.1, r * 0.3, 5, 4);
    }
  }

  X.restore();

  // Floating Health Bar (only visible when damaged)
  if (z.hp < z.mh) {
    const bw = T.r * 2.2, bh = z.t === 'boss' ? 6 : 4, by = z.y - T.r * sc - 10, hpPct = Math.max(0, z.hp / z.mh);
    X.fillStyle = '#000000cc'; X.fillRect(z.x - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    X.strokeStyle = '#222'; X.lineWidth = 1; X.strokeRect(z.x - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const hpGrad = X.createLinearGradient(z.x - bw / 2, 0, z.x + bw / 2, 0);
    hpGrad.addColorStop(0, '#e63946');
    hpGrad.addColorStop(1, hpPct > 0.4 ? '#48cae4' : '#ffb703');
    X.fillStyle = hpGrad;
    X.fillRect(z.x - bw / 2, by, bw * hpPct, bh);
  }

  X.globalAlpha = 1;
}

// === ZOMBIE PER-TYPE DEATH ANIMATIONS & CHARGER AFTERIMAGES ===
let DYING_ZOMBIES = [];
let CHARGER_TRAILS = [];

function spawnDyingZombie(z, killerSrc) {
  if (!z) return;
  const T = (typeof ZT !== 'undefined' && ZT[z.t]) ? ZT[z.t] : { r: 14, col: '#4a5736' };
  const a = Math.atan2((typeof P !== 'undefined' ? P.y : 0) - z.y, (typeof P !== 'undefined' ? P.x : 0) - z.x);
  let animType = 'collapse';
  let maxLife = 0.55;
  if (z.t === 'spit' || z.t === 'stalker') {
    animType = 'dissolve';
    maxLife = 0.65;
  } else if (z.t === 'run' || z.t === 'charger') {
    animType = 'fallback';
    maxLife = 0.50;
  }

  DYING_ZOMBIES.push({
    x: z.x,
    y: z.y,
    t: z.t,
    el: z.el,
    bv: z.bv,
    r: T.r,
    col: T.col,
    a: a,
    animType: animType,
    l: maxLife,
    maxL: maxLife,
    vx: animType === 'fallback' ? -Math.cos(a) * 90 : 0,
    vy: animType === 'fallback' ? -Math.sin(a) * 90 : 0
  });

  if (DYING_ZOMBIES.length > 40) DYING_ZOMBIES.shift();
}

function updateDyingZombies(dt) {
  for (let i = DYING_ZOMBIES.length - 1; i >= 0; i--) {
    const d = DYING_ZOMBIES[i];
    d.l -= dt;
    if (d.animType === 'fallback') {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.88;
      d.vy *= 0.88;
    }
    if (d.l <= 0) {
      DYING_ZOMBIES.splice(i, 1);
    }
  }

  // Update Charger afterimages
  for (let i = CHARGER_TRAILS.length - 1; i >= 0; i--) {
    const tr = CHARGER_TRAILS[i];
    tr.l -= dt;
    if (tr.l <= 0) CHARGER_TRAILS.splice(i, 1);
  }
}

function drawDyingZombies(cx, cy, W, H) {
  for (const d of DYING_ZOMBIES) {
    if (d.x < cx - 50 || d.x > cx + W + 50 || d.y < cy - 50 || d.y > cy + H + 50) continue;
    const progress = 1 - Math.max(0, d.l / d.maxL);
    const alpha = Math.max(0, 1 - progress);

    X.save();
    X.translate(d.x, d.y);
    X.rotate(d.a);
    X.globalAlpha = alpha;

    if (d.animType === 'collapse') {
      // Buckle & collapse to ground
      const scaleY = Math.max(0.15, 1 - progress * 0.85);
      const scaleX = 1 + progress * 0.25;
      X.scale(scaleX, scaleY);
      X.fillStyle = d.col;
      X.beginPath(); X.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, 6.28); X.fill();
    } else if (d.animType === 'fallback') {
      // Hurled back rotation
      X.rotate(progress * 1.5);
      X.fillStyle = d.col;
      X.beginPath(); X.ellipse(0, 0, d.r, d.r * 0.65, 0, 0, 6.28); X.fill();
    } else if (d.animType === 'dissolve') {
      // Dissolve into bubbling residue
      const scale = 1 + progress * 0.4;
      X.scale(scale, scale);
      X.fillStyle = d.t === 'spit' ? `rgba(74, 222, 128, ${alpha})` : `rgba(168, 85, 247, ${alpha})`;
      X.beginPath(); X.arc(0, 0, d.r * (1 - progress * 0.5), 0, 6.28); X.fill();
    }

    X.restore();
  }

  // Draw Charger afterimage ghost trails
  for (const tr of CHARGER_TRAILS) {
    const alpha = (tr.l / tr.maxL) * 0.45;
    X.save();
    X.translate(tr.x, tr.y);
    X.rotate(tr.a);
    X.globalAlpha = alpha;
    X.fillStyle = tr.el ? 'rgba(250, 204, 21, 0.45)' : 'rgba(249, 115, 22, 0.45)';
    X.beginPath(); X.ellipse(0, 0, tr.r * 0.95, tr.r * 0.7, 0, 0, 6.28); X.fill();
    X.restore();
  }
}
