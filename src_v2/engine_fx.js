// DEAD ZONE v2.9.0 - FX: ANNOUNCER, COMBO METER, HEARTBEAT, BEACONS, BUILDINGS, FOOTSTEPS, IMPACTS

let ANN = [];          // announcer queue (screen-space banners)
let FX_STEP_T = 0;
let FX_HEART = 0;

function announce(title, col, sub) {
  if (!S) return;
  // Collapse duplicates fired in quick succession
  if (ANN.length && ANN[ANN.length - 1].title === title && ANN[ANN.length - 1].t < 0.6) return;
  ANN.push({ title, col: col || '#fff', sub: sub || '', t: 0, life: 2.4 });
  if (ANN.length > 4) ANN.shift();
}

function fxReset() {
  ANN = []; FX_STEP_T = 0; FX_HEART = 0;
}

function fxUpdate(dt) {
  for (const a of ANN) a.t += dt;
  pruneArr(ANN, a => a.t < a.life);

  // Footstep dust while moving
  if (P && P.hp > 0 && !(P.dash > 0)) {
    const moving = P.st != null && (typeof K !== 'undefined') && (K.w || K.a || K.s || K.d || K.arrowup || K.arrowdown || K.arrowleft || K.arrowright || (typeof J !== 'undefined' && J.l && J.l.on));
    FX_STEP_T -= dt;
    if (moving && FX_STEP_T <= 0 && F.length < 260) {
      FX_STEP_T = 0.16;
      const cm = getCurMap();
      const col = (MP[cm] && MP[cm].t1) || '#777';
      F.push({ x: P.x - (P.lx || 0) * 8 + (Math.random() - 0.5) * 6, y: P.y + 8 - (P.ly || 0) * 8, vx: -(P.lx || 0) * 16 + (Math.random() - 0.5) * 14, vy: -(P.ly || 0) * 16 - 6, l: 0.32, c: col, s: 2.2, fr: 1 });
    }
  }
  // Heartbeat pacing when hurt
  if (P && S && P.hp > 0 && P.hp / P.mx < 0.3) {
    FX_HEART += dt * (2.2 + (0.3 - P.hp / P.mx) * 6);
    if (FX_HEART >= 1) {
      FX_HEART -= 1;
      if (typeof snd === 'function') { snd(62, 0.12, 'sine', 0.1, 0.8); setTimeout(() => snd(54, 0.1, 'sine', 0.08, 0.8), 130); }
    }
  } else FX_HEART = 0;
}

// Impact sparks + chips when a bullet strikes a wall
function impactFX(x, y, vx, vy, col) {
  if (F.length > 280) return;
  const sp = Math.hypot(vx, vy) || 1;
  const bx = -vx / sp, by = -vy / sp;
  for (let i = 0; i < 4; i++) {
    const a = Math.atan2(by, bx) + (Math.random() - 0.5) * 1.6;
    const s = 60 + Math.random() * 140;
    F.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0.18 + Math.random() * 0.15, c: i % 2 ? '#ffe9a8' : '#ffffff', s: 1.6, fr: 1 });
  }
  F.push({ x, y, vx: bx * 25, vy: by * 25 - 10, l: 0.4, c: col || '#8a8a8a', s: 3.2, fr: 1 });
}

/* ---------------- WORLD-SPACE: BEACONS ---------------- */
function renderPowerupBeacons(cx, cy, W, H) {
  for (const d of D) {
    if (d.k !== 'pu') continue;
    const def = PU_DEFS[d.v]; if (!def) continue;
    if (d.x < cx - 60 || d.x > cx + W + 60 || d.y < cy - 400 || d.y > cy + H + 60) continue;
    const t = S.t || 0;
    const pulse = 0.5 + Math.sin(t * 5 + d.x) * 0.25;
    const fade = d.l < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(d.l * 8)) : 1;
    X.save();
    const g = X.createLinearGradient(0, d.y - 340, 0, d.y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, def.col);
    X.globalAlpha = (d.sup ? 0.5 : 0.28) * pulse * fade;
    X.fillStyle = g;
    X.fillRect(d.x - (d.sup ? 7 : 4), d.y - 340, d.sup ? 14 : 8, 340);
    X.globalAlpha = 0.7 * fade;
    X.strokeStyle = def.col; X.lineWidth = 2;
    X.beginPath(); X.arc(d.x, d.y, 18 + Math.sin(t * 4 + d.x) * 3, 0, 6.28); X.stroke();
    X.restore();
  }
}

// Draws the power-up icon itself (called from pickups renderer)
function drawPowerupIcon(id, t) {
  const def = PU_DEFS[id]; if (!def) return;
  // 1. Counter-rotating rune ring with tick marks, so a grounded power-up
  //    reads as an armed device rather than a flat token.
  X.save();
  X.save();
  X.rotate(t * 1.1);
  X.strokeStyle = def.col;
  X.globalAlpha = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 4));
  X.lineWidth = 1.6;
  X.beginPath(); X.arc(0, 0, 17.5, 0, 6.28); X.stroke();
  for (let k = 0; k < 6; k++) {
    const a = k * 1.0472;
    X.beginPath();
    X.moveTo(Math.cos(a) * 17.5, Math.sin(a) * 17.5);
    X.lineTo(Math.cos(a) * 20.5, Math.sin(a) * 20.5);
    X.stroke();
  }
  X.restore();
  X.globalAlpha = 1;
  // 2. Idle wobble, hex plate and glass highlight.
  X.rotate(Math.sin(t * 2) * 0.08);
  X.fillStyle = '#0b0f14';
  X.beginPath();
  for (let k = 0; k < 6; k++) { const a = k * 1.0472 - 1.5708; X.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); }
  X.closePath(); X.fill();
  X.fillStyle = def.col;
  X.beginPath();
  for (let k = 0; k < 6; k++) { const a = k * 1.0472 - 1.5708; X.lineTo(Math.cos(a) * 11.5, Math.sin(a) * 11.5); }
  X.closePath(); X.fill();
  X.fillStyle = 'rgba(255,255,255,0.28)';
  X.beginPath(); X.moveTo(-10, -4); X.lineTo(0, -11); X.lineTo(10, -4); X.lineTo(0, -5); X.closePath(); X.fill();
  // Same vector glyph the HUD chip uses, so the icon on the ground and the
  // icon ticking down in the corner are literally the same shape.
  if (typeof puGlyph === 'function') puGlyph(id, 0, 0, 1, '#ffffff');
  X.restore();
  // 3. Orbiting motes, kept outside the wobble so they trace a clean circle.
  X.save();
  for (let k = 0; k < 3; k++) {
    const a = t * 2.4 + k * 2.094;
    const rr = 15.5 + Math.sin(t * 3 + k * 1.7) * 1.6;
    X.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 6 + k * 2));
    X.fillStyle = '#ffffff';
    X.beginPath(); X.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.4, 0, 6.28); X.fill();
  }
  X.restore();
}

/* ---------------- SCREEN-SPACE OVERLAY ---------------- */
function renderDirectorOverlay(W, H) {
  if (!S || !P) return;
  const t = S.t || 0;

  // Blackout wave: darkness with a light pool around the player
  if (S.dark > 0 && S.wm) {
    const sx = P.x - CX, sy = P.y - CY;
    const g = X.createRadialGradient(sx, sy, 90, sx, sy, Math.max(W, H) * 0.62);
    g.addColorStop(0, 'rgba(4,6,14,0)');
    g.addColorStop(1, 'rgba(4,6,14,' + S.dark + ')');
    X.fillStyle = g; X.fillRect(0, 0, W, H);
  }

  // Low-HP heartbeat vignette
  if (P.hp > 0 && P.hp / P.mx < 0.3) {
    const sev = 1 - (P.hp / P.mx) / 0.3;
    const beat = Math.max(0, Math.sin(FX_HEART * 6.28 * 1)) ;
    const a = (0.14 + sev * 0.22) * (0.5 + beat * 0.5);
    const g = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, 'rgba(160,0,0,' + a + ')');
    X.fillStyle = g; X.fillRect(0, 0, W, H);
  }

  // Bullet-time tint
  if (S.bt > 0) {
    X.fillStyle = 'rgba(120,200,255,' + Math.min(0.14, S.bt * 0.08) + ')'; X.fillRect(0, 0, W, H);
  }

  // Aegis shield / adrenaline screen-edge glow
  if (S.sh2 > 0 || S.adr > 0) {
    const col = S.sh2 > 0 ? '234,179,8' : '34,211,238';
    const g = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.5, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(1, 'rgba(' + col + ',' + (0.10 + Math.sin(t * 6) * 0.03) + ')');
    X.fillStyle = g; X.fillRect(0, 0, W, H);
  }

  // Off-screen power-up arrows
  for (const d of D) {
    if (d.k !== 'pu') continue;
    const def = PU_DEFS[d.v]; if (!def) continue;
    const sx = d.x - CX, sy = d.y - CY;
    if (sx > 20 && sx < W - 20 && sy > 20 && sy < H - 20) continue;
    const ang = Math.atan2(sy - H / 2, sx - W / 2);
    const ex = Math.max(34, Math.min(W - 34, W / 2 + Math.cos(ang) * W)), ey = Math.max(56, Math.min(H - 56, H / 2 + Math.sin(ang) * H));
    const blink = d.l < 4 ? (Math.sin(d.l * 12) > 0 ? 0.35 : 1) : 1;
    X.save(); X.translate(ex, ey); X.globalAlpha = blink * (0.75 + Math.sin(t * 6) * 0.2);
    X.rotate(ang);
    X.fillStyle = def.col; X.strokeStyle = '#000'; X.lineWidth = 2;
    X.beginPath(); X.moveTo(14, 0); X.lineTo(-8, -10); X.lineTo(-3, 0); X.lineTo(-8, 10); X.closePath(); X.stroke(); X.fill();
    X.restore();
  }

  // Combo heat: as the kill chain climbs, the frame edge warms up so a long
  // streak is felt across the whole screen and not only read off the meter.
  // The tint escalates with the combo tier (gold -> orange -> rose -> violet)
  // and flares briefly on every kill via the shared combo kick.
  if (S.cmb && S.cmb >= 8) {
    let tier = null;
    for (let i = 0; i < COMBO_TIERS.length; i++) if (S.cmb >= COMBO_TIERS[i].at) tier = COMBO_TIERS[i];
    const col = hexToRgbTriplet(tier ? tier.col : '#ffd36b');
    const base = tier ? 0.16 : 0.09;
    const pulse = 0.86 + Math.sin(t * (5 + Math.min(4, S.cmb * 0.06))) * 0.14;
    const kick = Math.min(0.14, (S.cmbKick || 0) * 0.30);
    const a = base * pulse + kick;
    const g = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(' + col + ',0)');
    g.addColorStop(1, 'rgba(' + col + ',' + a.toFixed(3) + ')');
    X.save(); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
  }

  drawComboMeter(W, H);
  drawAnnouncements(W, H);
  drawWaveTag(W, H);
}

function drawComboMeter(W, H) {
  if (!S.cmb || S.cmb < 3) return;
  const kick = S.cmbKick || 0;
  const tier = COMBO_TIERS.filter(c => S.cmb >= c.at).pop();
  const col = tier ? tier.col : '#e8e4cf';
  const x = W - 22, y = H * 0.34;
  X.save(); X.textAlign = 'right';
  X.translate(x, y); X.scale(1 + kick * 0.22, 1 + kick * 0.22);
  X.shadowColor = col; X.shadowBlur = 10 + Math.min(14, S.cmb * 0.3);
  X.fillStyle = col; X.font = '900 ' + Math.min(44, 24 + S.cmb * 0.25) + 'px Impact,Arial Black,sans-serif';
  X.fillText('x' + S.cmb, 0, 0);
  X.shadowBlur = 0;
  X.font = 'bold 10px Arial'; X.fillStyle = '#e8e4cf99';
  X.fillText('COMBO  +' + Math.round((comboCashMult() - 1) * 100) + '% CASH', 0, 14);
  // decay bar
  const frac = Math.max(0, Math.min(1, S.cmt / comboWindow()));
  X.fillStyle = 'rgba(0,0,0,.5)'; X.fillRect(-90, 20, 90, 5);
  X.fillStyle = frac < 0.3 ? '#ff5a3a' : col; X.fillRect(-90, 20, 90 * frac, 5);
  X.restore();
}

function drawAnnouncements(W, H) {
  if (!ANN.length) return;
  let yy = H * 0.2;
  for (const a of ANN) {
    const inT = Math.min(1, a.t / 0.28), outT = Math.min(1, Math.max(0, (a.life - a.t) / 0.45));
    const ease = 1 - Math.pow(1 - inT, 3);
    const alpha = Math.min(ease, outT);
    const sc = 0.7 + 0.3 * ease + (a.t < 0.2 ? 0.12 * (1 - a.t / 0.2) : 0);
    X.save(); X.translate(W / 2, yy); X.scale(sc, sc); X.globalAlpha = alpha; X.textAlign = 'center';
    X.shadowColor = a.col; X.shadowBlur = 16;
    X.fillStyle = a.col; X.font = '900 ' + (W < 700 ? 26 : 32) + 'px Impact,Arial Black,sans-serif';
    X.fillText(a.title, 0, 0);
    X.shadowBlur = 0;
    if (a.sub) { X.font = 'bold 11px Arial'; X.fillStyle = '#f1efe2'; X.fillText(a.sub, 0, 18); }
    // sweeping underline
    X.fillStyle = a.col; X.globalAlpha = alpha * 0.8;
    const lw = 60 + 120 * ease; X.fillRect(-lw / 2, a.sub ? 26 : 8, lw, 2);
    X.restore();
    yy += a.sub ? 54 : 42;
  }
}

function drawWaveTag(W, H) {
  if (!S.wm) return;
  X.save(); X.textAlign = 'center';
  X.fillStyle = 'rgba(0,0,0,.45)'; X.fillRect(W / 2 - 62, 6, 124, 18);
  X.fillStyle = S.wm.col; X.font = '900 10px Arial'; X.fillText(S.wm.name + ' WAVE  x' + S.wmCash.toFixed(2) + ' $', W / 2, 19);
  X.restore();
}

/* ---------------- BUILDINGS & OBSTACLES ---------------- */
function fxHash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function drawObstacleDetailed(o, mapDef) {
  const t = o.t;
  const h = 10; // extrusion depth
  const col = o.col || mapDef.wall || '#2a3523';
  const roof = o.roof || col;
  const seed = o.x * 0.013 + o.y * 0.007;

  // drop shadow
  X.fillStyle = 'rgba(0,0,0,0.5)';
  X.fillRect(o.x + 8, o.y + 10, o.w, o.h);

  if (t === 'building' || t === 'farmhouse' || t === 'barn' || t === 'shed' || t === 'cabin' || t === 'corral') {
    // facade (front face)
    X.fillStyle = col; X.fillRect(o.x, o.y + o.h - h, o.w, h);
    X.fillStyle = 'rgba(0,0,0,0.35)'; X.fillRect(o.x, o.y + o.h - h, o.w, h);
    // windows on front face
    if (o.w > 90) {
      for (let wx = o.x + 14; wx < o.x + o.w - 16; wx += 26) {
        const lit = fxHash(seed + wx) > 0.72;
        X.fillStyle = lit ? 'rgba(255,214,120,0.85)' : 'rgba(10,14,18,0.8)';
        X.fillRect(wx, o.y + o.h - h + 2, 10, 6);
      }
    }
    // roof
    X.fillStyle = roof; X.fillRect(o.x, o.y, o.w, o.h - h);
    // roof panel seams
    X.strokeStyle = 'rgba(0,0,0,0.22)'; X.lineWidth = 1;
    const step = t === 'barn' || t === 'farmhouse' || t === 'cabin' || t === 'shed' ? 14 : 48;
    if (t === 'barn' || t === 'farmhouse' || t === 'cabin' || t === 'shed' || t === 'corral') {
      for (let sx = o.x + step; sx < o.x + o.w; sx += step) { X.beginPath(); X.moveTo(sx, o.y); X.lineTo(sx, o.y + o.h - h); X.stroke(); }
    } else {
      for (let sx = o.x + step; sx < o.x + o.w - 4; sx += step) { X.beginPath(); X.moveTo(sx, o.y + 6); X.lineTo(sx, o.y + o.h - h - 6); X.stroke(); }
      for (let sy = o.y + step; sy < o.y + o.h - h - 4; sy += step) { X.beginPath(); X.moveTo(o.x + 6, sy); X.lineTo(o.x + o.w - 6, sy); X.stroke(); }
      // rooftop props: AC units, vents, skylight (deterministic)
      const n = Math.min(6, Math.floor(o.w * o.h / 26000));
      for (let k = 0; k < n; k++) {
        const px = o.x + 24 + fxHash(seed + k * 3.1) * (o.w - 70), py = o.y + 24 + fxHash(seed + k * 7.7) * (o.h - h - 70);
        const kind = Math.floor(fxHash(seed + k * 11.3) * 3);
        if (kind === 0) { X.fillStyle = 'rgba(0,0,0,0.35)'; X.fillRect(px + 3, py + 3, 28, 20); X.fillStyle = '#6b7280'; X.fillRect(px, py, 28, 20); X.fillStyle = '#4b5563'; X.beginPath(); X.arc(px + 14, py + 10, 7, 0, 6.28); X.fill(); X.strokeStyle = '#9ca3af'; X.lineWidth = 1; X.beginPath(); X.moveTo(px + 9, py + 10); X.lineTo(px + 19, py + 10); X.moveTo(px + 14, py + 5); X.lineTo(px + 14, py + 15); X.stroke(); }
        else if (kind === 1) { X.fillStyle = 'rgba(0,0,0,0.3)'; X.fillRect(px + 2, py + 2, 18, 18); X.fillStyle = 'rgba(120,190,220,0.55)'; X.fillRect(px, py, 18, 18); X.strokeStyle = 'rgba(255,255,255,0.4)'; X.strokeRect(px, py, 18, 18); }
        else { X.fillStyle = '#374151'; X.beginPath(); X.arc(px + 8, py + 8, 8, 0, 6.28); X.fill(); X.fillStyle = '#111827'; X.beginPath(); X.arc(px + 8, py + 8, 4, 0, 6.28); X.fill(); }
      }
    }
    // parapet / trim
    X.strokeStyle = 'rgba(255,255,255,0.18)'; X.lineWidth = 2;
    X.strokeRect(o.x + 3, o.y + 3, o.w - 6, o.h - h - 6);
    X.strokeStyle = '#0a0d09'; X.lineWidth = 2; X.strokeRect(o.x, o.y, o.w, o.h);
    // name plate
    if (o.name && o.w > 200) {
      X.fillStyle = 'rgba(0,0,0,0.5)'; X.font = '900 13px Arial'; X.textAlign = 'center';
      X.fillText(o.name.toUpperCase(), o.x + o.w / 2 + 1, o.y + o.h / 2 + 1);
      X.fillStyle = 'rgba(255,255,255,0.28)'; X.fillText(o.name.toUpperCase(), o.x + o.w / 2, o.y);
      X.fillStyle = 'rgba(255,255,255,0.28)'; X.fillText(o.name.toUpperCase(), o.x + o.w / 2, o.y + o.h / 2);
    }
    return true;
  }

  if (t === 'fence') {
    X.fillStyle = col; X.fillRect(o.x, o.y + 4, o.w, Math.max(4, o.h - 8));
    X.fillStyle = 'rgba(255,255,255,0.15)'; X.fillRect(o.x, o.y + 4, o.w, 2);
    const horiz = o.w >= o.h;
    X.fillStyle = '#2b1d10';
    if (horiz) for (let px = o.x; px <= o.x + o.w; px += 28) X.fillRect(px - 2, o.y, 5, o.h + 3);
    else for (let py = o.y; py <= o.y + o.h; py += 28) X.fillRect(o.x, py - 2, o.w + 3, 5);
    return true;
  }

  if (t === 'barrier') {
    X.fillStyle = col; X.fillRect(o.x, o.y, o.w, o.h);
    X.fillStyle = 'rgba(255,255,255,0.18)'; X.fillRect(o.x, o.y, o.w, 3);
    // hazard stripes
    X.save(); X.beginPath(); X.rect(o.x, o.y, o.w, o.h); X.clip();
    X.fillStyle = 'rgba(234,179,8,0.55)';
    const horiz = o.w >= o.h;
    for (let k = -2; k < (horiz ? o.w : o.h) / 12 + 2; k++) {
      X.beginPath();
      if (horiz) { X.moveTo(o.x + k * 14, o.y + o.h); X.lineTo(o.x + k * 14 + 7, o.y + o.h); X.lineTo(o.x + k * 14 + 14, o.y); X.lineTo(o.x + k * 14 + 7, o.y); }
      else { X.moveTo(o.x + o.w, o.y + k * 14); X.lineTo(o.x + o.w, o.y + k * 14 + 7); X.lineTo(o.x, o.y + k * 14 + 14); X.lineTo(o.x, o.y + k * 14 + 7); }
      X.closePath(); X.fill();
    }
    X.restore();
    X.strokeStyle = '#0a0d09'; X.lineWidth = 1.5; X.strokeRect(o.x, o.y, o.w, o.h);
    return true;
  }

  if (t === 'crate' || t === 'cover') {
    X.fillStyle = col; X.fillRect(o.x, o.y, o.w, o.h);
    X.strokeStyle = 'rgba(0,0,0,0.4)'; X.lineWidth = 2; X.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
    X.beginPath(); X.moveTo(o.x + 2, o.y + 2); X.lineTo(o.x + o.w - 2, o.y + o.h - 2); X.moveTo(o.x + o.w - 2, o.y + 2); X.lineTo(o.x + 2, o.y + o.h - 2); X.stroke();
    X.fillStyle = 'rgba(255,255,255,0.16)'; X.fillRect(o.x, o.y, o.w, 3);
    return true;
  }
  return false; // fall back to generic renderer
}

/* ---------------- LOBBY ANIMATION HELPERS ---------------- */
function animateNumber(el, to, ms) {
  if (!el) return;
  const from = parseFloat(String(el.dataset.v || el.textContent).replace(/[^0-9.-]/g, '')) || 0;
  el.dataset.v = to;
  if (from === to || (typeof isReducedMotion === 'function' && isReducedMotion())) { el.textContent = Math.round(to).toLocaleString(); return; }
  const t0 = performance.now(); ms = ms || 600;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e).toLocaleString();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function staggerIn(container) {
  if (!container) return;
  let i = 0;
  for (const c of container.children) { c.style.setProperty('--i', i++); c.classList.add('stg'); }
}
