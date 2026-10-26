// DEAD ZONE - HUD & ON-SCREEN CONTROLS
// Split out of engine_world.js, which had grown to four thousand lines carrying the
// simulation, collision, weapons and the whole overlay. Everything here is a
// top-level function declaration, so the bundle's single script scope keeps them
// visible to the rest of the engine exactly as before, and the split is a pure
// move: no line of behaviour changed.
//
// Reads the shared globals declared in engine_world.js (BT, BT_FX, ctlScale,
// padUnit, saInsets, hudUnit) and the weapon/tier data in engine_data.js.

// Weapon HUD. The old sliding chip row is gone: on a phone the chips sat under
// the thumbs, so drags kept swapping guns, and a 20px cell cannot show what a
// gun is anyway. The bottom-centre card now shows the equipped gun and, when
// tapped, opens a preview sheet of every gun the account owns.
function weaponHudRect() {
  const bs = padUnit();
  const w = Math.min(200, Math.max(146, Math.round(W * 0.22)));
  const h = Math.round(52 * bs);
  const [, , saB] = saInsets();
  return { x: Math.round(W / 2 - w / 2), y: Math.round(H - h - 8 - saB), w, h };
}

// Fire-mode label, derived from the weapon's own cadence and pellet count. It
// describes how the gun already behaves - no stat, rate or reload is changed by
// it.
function weaponMode(w) {
  if (!w) return 'SEMI';
  if (w.flm) return 'FLAME';
  if (w.ex) return 'LAUNCH';
  // A slow-cycling multi-pellet gun is a pump (Shotgun 0.62s, Arc Shotgun 0.65s,
  // Glacier Breaker 0.72s); a tight burst (Burst Rifle 0.38s) is not. Reading the
  // projectile step here mislabelled the Shotgun as BURST.
  if (w.p > 1) return w.r >= 0.5 ? 'PUMP' : (w.p >= 3 ? 'BURST' : 'DUAL');
  if (w.r <= 0.14) return 'AUTO';
  if (w.r >= 0.5) return 'BOLT';
  return 'SEMI';
}

// Fits a label into a pixel width: shrink a little, then ellipsise. Long weapon
// names used to run straight through the ammunition readout.
function fitLabel(txt, maxW, px, weight, family) {
  const set = f => { X.font = weight + ' ' + f + 'px ' + family; };
  set(px);
  if (X.measureText(txt).width <= maxW) return txt;
  const floor = px * 0.72;
  for (let f = px - 0.5; f >= floor; f -= 0.5) {
    set(f);
    if (X.measureText(txt).width <= maxW) return txt;
  }
  set(floor);
  let t = txt;
  while (t.length > 2 && X.measureText(t + '\u2026').width > maxW) t = t.slice(0, -1);
  return t + '\u2026';
}

// True when the tap landed on the weapon card (the picker trigger).
function weaponHudHit(x, y) {
  const r = weaponHudRect();
  return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 6 && y <= r.y + r.h + 6;
}

function drawWeaponHud() {
  if (!P || !P.w) return;
  const r = weaponHudRect();
  const bs = padUnit();
  const wDef = WEAP[P.cur] || WEAP[0];
  const tcol = (typeof TIER_COLORS !== 'undefined' && TIER_COLORS[wDef.tier]) ? TIER_COLORS[wDef.tier] : '#8fae4a';
  const reloading = !!P.reloading;
  const magMax = wDef.mag || 12;
  const ammo = (P.ammo != null ? P.ammo : magMax);
  const prog = (reloading && P.reloadDuration) ? Math.max(0, Math.min(1, 1 - (P.reloadTimer || 0) / P.reloadDuration)) : 0;
  const pad = Math.round(9 * bs);

  X.save();
  X.beginPath(); X.roundRect(r.x, r.y, r.w, r.h, 8);
  X.fillStyle = 'rgba(14,18,13,0.90)'; X.fill();
  X.strokeStyle = reloading ? '#ffd36b' : tcol + 'cc'; X.lineWidth = 1.5; X.stroke();
  // Tier pip down the left edge so rarity still reads at a glance.
  X.beginPath(); X.roundRect(r.x + 2.5, r.y + 5, 3, r.h - 10, 2);
  X.fillStyle = tcol; X.fill();

  // --- Columns: icon | flexible text | right-aligned ammo -------------------
  // Every value is measured and placed inside the card, so the rows cannot
  // collide no matter how long the weapon name or the magazine figure is.
  const iconW = Math.round(32 * bs);
  const icx = r.x + Math.round(5 * bs) + iconW / 2;
  const icy = r.y + r.h * 0.42;
  X.save();
  X.translate(icx - 12 * 0.62 * bs, icy - 5 * 0.62 * bs);
  X.scale(0.62 * bs, 0.62 * bs);
  if (typeof gun === 'function') gun(P.cur, 0);
  X.restore();

  const ammoTxt = ammo + ' / ' + magMax;
  const modeTxt = reloading ? 'RELOADING' : weaponMode(wDef);
  X.font = `900 ${Math.round(15 * bs)}px Arial`;
  const ammoW = X.measureText(ammoTxt).width;
  X.font = `700 ${Math.round(9 * bs)}px Arial`;
  const modeW = X.measureText(modeTxt).width;

  const rx = r.x + r.w - pad;
  const tx = icx + iconW / 2 + Math.round(7 * bs);
  const nameMax = Math.max(24, rx - Math.max(ammoW, modeW) - Math.round(9 * bs) - tx);
  const rowA = r.y + Math.round(17 * bs);
  const rowB = r.y + Math.round(35 * bs);

  X.textBaseline = 'middle'; X.textAlign = 'left';
  X.fillStyle = tcol;
  X.fillText(fitLabel((wDef.n || 'GUN').toUpperCase(), nameMax, Math.round(12 * bs), '900', 'Arial'), tx, rowA);
  X.fillStyle = 'rgba(213,208,194,0.72)';
  X.font = `700 ${Math.round(9 * bs)}px Arial`;
  // Effective damage per trigger pull, not the raw table value: once damage
  // perks and weapon mastery are in play, the card used to under-report the
  // damage the player was actually dealing. Multi-projectile guns show the
  // per-pull total plus the pellet count.
  const st = (typeof weaponStats === 'function') ? weaponStats(P.cur) : null;
  const perPull = Math.round(baseShotDamage(P.cur) * (st ? st.pellets : (wDef.p || 1)));
  const dmgTxt = 'DMG ' + perPull + (st && st.pellets > 1 ? ' \u00d7' + st.pellets : '');
  X.fillText(dmgTxt, tx, rowB);

  X.textAlign = 'right';
  X.fillStyle = reloading ? '#ffd36b' : (ammo <= Math.ceil(magMax * 0.25) ? '#ff5a3a' : '#efe9d6');
  X.font = `900 ${Math.round(15 * bs)}px Arial`;
  X.fillText(ammoTxt, rx, rowA);
  X.fillStyle = reloading ? '#ffd36b' : 'rgba(213,208,194,0.62)';
  X.font = `700 ${Math.round(9 * bs)}px Arial`;
  X.fillText(modeTxt, rx, rowB);

  // Tap-to-change affordance: two small chevrons under the weapon icon, so the
  // card still reads as a control without a text label fighting the ammunition.
  const sy = r.y + r.h - Math.round(8 * bs);
  X.strokeStyle = 'rgba(213,208,194,0.45)'; X.lineWidth = 1.4; X.lineCap = 'round'; X.lineJoin = 'round';
  X.beginPath();
  X.moveTo(icx - 6, sy - 2.4); X.lineTo(icx - 2.6, sy); X.lineTo(icx - 6, sy + 2.4);
  X.moveTo(icx + 6, sy - 2.4); X.lineTo(icx + 2.6, sy); X.lineTo(icx + 6, sy + 2.4);
  X.stroke();

  // Reload progress along the bottom edge, never over the ammunition readout.
  if (prog > 0) {
    X.beginPath(); X.roundRect(r.x + 6, r.y + r.h - 5, r.w - 12, 2.5, 1.5);
    X.fillStyle = 'rgba(255,255,255,0.12)'; X.fill();
    X.beginPath(); X.roundRect(r.x + 6, r.y + r.h - 5, Math.max(3, (r.w - 12) * prog), 2.5, 1.5);
    X.fillStyle = '#ffd36b'; X.fill();
  }
  X.restore();
  X.textBaseline = 'alphabetic';
  X.textAlign = 'left';
}

/* ---- Owned-weapon picker -------------------------------------------- */
// Opens from the weapon card. The run is held while it is up so the player is
// not being eaten while they read, and resumes exactly as it was on close.
function openGunPicker() {
  if (!S || !P || P.hp <= 0) return false;
  if (S.po || S.bd) return false;
  const el = document.getElementById('gunpick');
  if (!el) return false;
  renderGunPicker();
  el.classList.add('on');
  S.gp = 1;
  run = 0;
  if (typeof snd === 'function') snd(520, 0.06, 'square', 0.03, 1.1);
  return true;
}

function closeGunPicker() {
  const el = document.getElementById('gunpick');
  if (el) el.classList.remove('on');
  if (S) S.gp = 0;
  const lob = document.getElementById('start');
  const inLobby = !!(lob && lob.classList.contains('on'));
  if (!inLobby && P && P.hp > 0 && S && !S.po && !S.bd && !pendingNextWave) run = 1;
}

function pickWeapon(i) {
  const ok = selectWeapon(i);
  if (ok === false && P && P.cur === i) closeGunPicker();
  else if (ok) closeGunPicker();
  else renderGunPicker();
}

function gunTraitTags(w) {
  const tags = [];
  if (w.p > 1) tags.push(w.p + ' PELLETS');
  if (w.pr) tags.push('PIERCE ' + w.pr);
  if (w.cl) tags.push('CHAIN ' + w.cl);
  if (w.ex) tags.push('EXPLOSIVE');
  if (w.fz) tags.push('CRYO');
  if (w.flm) tags.push('FLAME');
  if (w.ls) tags.push('LIFESTEAL');
  if (w.rng >= 800) tags.push('LONG RANGE');
  else if (w.rng <= 120) tags.push('POINT BLANK');
  return tags;
}

function renderGunPicker() {
  const host = document.getElementById('gunpick-grid');
  if (!host || !P) return;
  const owned = [];
  for (let i = 0; i < WEAP.length; i++) if (P.w && P.w[i]) owned.push(i);
  host.innerHTML = owned.map(i => {
    const w = WEAP[i] || WEAP[0];
    const cur = P.cur === i;
    const tcol = (typeof TIER_COLORS !== 'undefined' && TIER_COLORS[w.tier]) ? TIER_COLORS[w.tier] : '#8fae4a';
    const mast = (typeof masteryLevel === 'function') ? masteryLevel(i) : 1;
    const skKey = (typeof SV !== 'undefined' && SV && SV.eqSkin && SV.eqSkin[i]) ? SV.eqSkin[i] : null;
    const sk = (skKey && typeof SKINS !== 'undefined' && SKINS[skKey]) ? SKINS[skKey] : null;
    const rps = w.r > 0 ? Math.round(60 / w.r) : 0;
    const tags = gunTraitTags(w);
    return `<button data-gun="${i}" class="gun-card${cur ? ' on' : ''}" style="--tc:${tcol}">
      <span class="gc-top"><b>${w.n}</b><i class="gc-tier">${w.tier}</i></span>
      <span class="gc-art"><img src="${typeof gunIcon === 'function' ? gunIcon(i) : ''}" alt=""></span>
      <span class="gc-stats"><span>DMG <b>${Math.round(w.d)}</b></span><span>RPM <b>${rps}</b></span><span>MAG <b>${w.mag || 12}</b></span></span>
      <span class="gc-tags">${tags.map(t => `<i>${t}</i>`).join('')}</span>
      <span class="gc-foot">MASTERY LV${mast}${sk ? ' &bull; ' + sk.name : ''}${cur ? ' &bull; EQUIPPED' : ''}</span>
    </button>`;
  }).join('') || '<p style="opacity:.7;font-size:12px">No weapons unlocked yet.</p>';
  host.onclick = e => {
    const b = e.target.closest('button[data-gun]');
    if (!b) return;
    pickWeapon(parseInt(b.dataset.gun, 10));
  };
}

function renderHUD() {
  // Every anchor in this overlay is derived from the HUD unit and the measured
  // safe-area insets, so nothing is pinned to the physical screen edge (where a
  // notch, a rounded corner or the camera cutout sits on a modern phone) and the
  // whole block breathes proportionally on any landscape aspect ratio.
  const u = hudUnit();
  const saT = saInsets()[0], saL = saInsets()[3];
  const pad = Math.round(14 * u);
  const rx = pad + Math.round(28 * u) + saL;
  const ry = pad + Math.round(28 * u) + saT;
  const radarRad = Math.round(26 * u);
  const colX = rx + Math.round(36 * u);              // left edge of the vitals column
  const hpw = Math.round(Math.max(96, Math.min(150, W * 0.15)) * u);

  // 1. Radar Background & Clipping Boundary
  X.save();
  X.fillStyle = '#0a0e08ee';
  X.beginPath(); X.arc(rx, ry, radarRad, 0, 6.28); X.fill();
  X.clip();

  // 2. Tactical Grid Rings
  X.strokeStyle = 'rgba(255,255,255,0.08)';
  X.lineWidth = 1;
  X.beginPath();
  X.arc(rx, ry, 13 * u, 0, 6.28);
  X.arc(rx, ry, 22 * u, 0, 6.28);
  X.stroke();

  // 3. Walls & Buildings from MAP_DATA / Obstacles O
  X.fillStyle = 'rgba(74, 95, 60, 0.45)';
  const curM = getCurMap();
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[curM]) ? MAP_DATA[curM] : (MP[curM] || MP[0]);
  const wallsList = (typeof O !== 'undefined' && O.length) ? O : (mapDef.walls || mapDef.obstacles || []);
  for (const w of wallsList) {
    const wx = rx + (w.x - P.x) / 24;
    const wy = ry + (w.y - P.y) / 24;
    const ww = Math.max(1.5, w.w / 24);
    const wh = Math.max(1.5, w.h / 24);
    if (Math.hypot(wx - rx, wy - ry) < radarRad + 10) {
      X.fillRect(wx, wy, ww, wh);
    }
  }

  // 4. World Bounds Boundary
  const wLeft = rx + (0 - P.x) / 24;
  const wTop = ry + (0 - P.y) / 24;
  const wSize = (typeof WS !== 'undefined' ? WS : 2400) / 24;
  X.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  X.lineWidth = 1.2;
  X.strokeRect(wLeft, wTop, wSize, wSize);

  // 5. Radar Sweep Line
  const swpAng = (S ? S.t : 0) * 2.8;
  X.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  X.lineWidth = 1.4;
  X.beginPath(); X.moveTo(rx, ry); X.lineTo(rx + Math.cos(swpAng) * radarRad, ry + Math.sin(swpAng) * radarRad); X.stroke();

  // 6. Player Vision Cone
  X.fillStyle = 'rgba(56, 189, 248, 0.12)';
  X.beginPath();
  X.moveTo(rx, ry);
  X.arc(rx, ry, 20, P.a - 0.38, P.a + 0.38);
  X.closePath();
  X.fill();

  // 7. Pickups & Relic Chests (CH & D)
  for (const c of CH) {
    const dx = (c.x - P.x) / 24, dy = (c.y - P.y) / 24;
    const dist = Math.hypot(dx, dy);
    const k = dist > (radarRad - 3) ? (radarRad - 3) / dist : 1;
    X.fillStyle = '#ffd36b';
    X.fillRect(rx + dx * k - 2, ry + dy * k - 2, 4, 4);
  }
  for (const d of D) {
    const dx = (d.x - P.x) / 24, dy = (d.y - P.y) / 24;
    if (dx * dx + dy * dy < radarRad * radarRad) {
      X.fillStyle = d.k === 'h' ? '#ef4444' : (d.k === 'a' ? '#38bdf8' : (d.k === 'pu' ? '#c084fc' : (d.k === 'r' ? '#be8cff' : '#ffd36b')));
      X.beginPath(); X.arc(rx + dx, ry + dy, 1.8, 0, 6.28); X.fill();
    }
  }

  // 8. Zombie Radar Blips
  for (const z of Z) {
    if (z.dead) continue;
    const dx = (z.x - P.x) / 24, dy = (z.y - P.y) / 24;
    const distSq = dx * dx + dy * dy;

    if (distSq < radarRad * radarRad) {
      if (z.t === 'boss') {
        const bRad = 3.5 + Math.sin((S ? S.t : 0) * 10) * 1.2;
        X.fillStyle = 'rgba(239,68,68,0.45)';
        X.beginPath(); X.arc(rx + dx, ry + dy, bRad + 2, 0, 6.28); X.fill();
        X.fillStyle = '#ef4444';
        X.beginPath();
        X.moveTo(rx + dx, ry + dy - bRad);
        X.lineTo(rx + dx + bRad, ry + dy);
        X.lineTo(rx + dx, ry + dy + bRad);
        X.lineTo(rx + dx - bRad, ry + dy);
        X.closePath(); X.fill();
      } else if (z.t === 'tank' || z.t === 'brute' || z.t === 'charger') {
        X.fillStyle = '#f97316';
        X.beginPath();
        X.moveTo(rx + dx, ry + dy - 2.5);
        X.lineTo(rx + dx + 2.5, ry + dy);
        X.lineTo(rx + dx, ry + dy + 2.5);
        X.lineTo(rx + dx - 2.5, ry + dy);
        X.closePath(); X.fill();
      } else if (z.t === 'exp' || z.t === 'exploder') {
        X.fillStyle = Math.sin((S ? S.t : 0) * 12) > 0 ? '#facc15' : '#ef4444';
        X.beginPath(); X.arc(rx + dx, ry + dy, 2.2, 0, 6.28); X.fill();
      } else {
        X.fillStyle = '#ff5a3a';
        X.fillRect(rx + dx - 1.2, ry + dy - 1.2, 2.4, 2.4);
      }
    } else if (z.t === 'boss') {
      // Off-screen boss directional pointer along radar rim
      const bAng = Math.atan2(dy, dx);
      X.fillStyle = '#ef4444';
      X.beginPath();
      X.moveTo(rx + Math.cos(bAng) * (radarRad - 2), ry + Math.sin(bAng) * (radarRad - 2));
      X.lineTo(rx + Math.cos(bAng + 0.22) * (radarRad - 6), ry + Math.sin(bAng + 0.22) * (radarRad - 6));
      X.lineTo(rx + Math.cos(bAng - 0.22) * (radarRad - 6), ry + Math.sin(bAng - 0.22) * (radarRad - 6));
      X.closePath(); X.fill();
    }
  }

  // 9. Central Player Directional Chevron
  X.save();
  X.translate(rx, ry);
  X.rotate(P.a);
  X.fillStyle = '#38bdf8';
  X.beginPath();
  X.moveTo(5, 0); X.lineTo(-3.5, -3.5); X.lineTo(-1.8, 0); X.lineTo(-3.5, 3.5);
  X.closePath(); X.fill();
  X.restore();

  X.restore(); // Restore radar clipping

  // 10. Mini-Radar Perimeter & Health Ring
  const ringR = 28 * u;
  X.lineWidth = Math.max(2.6, 3.5 * u); X.strokeStyle = '#141a12';
  X.beginPath(); X.arc(rx, ry, ringR, 0, 6.28); X.stroke();
  X.strokeStyle = P.hp > 30 ? '#8fae4a' : '#d9453a';
  X.beginPath(); X.arc(rx, ry, ringR, -1.57, -1.57 + 6.28 * Math.max(0, P.hp) / P.mx); X.stroke();

  // Wave readout + sector ascension badge + live ghost-pace chip
  const waveTxt = 'WAVE ' + (S ? S.wave : 1);
  X.fillStyle = '#e8e4cf'; X.font = '900 ' + Math.round(13 * u) + 'px Impact,Arial Black,sans-serif'; X.textAlign = 'left';
  X.fillText(waveTxt, colX, ry - Math.round(8 * u));
  const waveW = X.measureText(waveTxt).width;
  if (S && S.ascTier > 0) {
    X.fillStyle = '#c084fc'; X.font = '900 ' + Math.round(9.5 * u) + 'px Arial';
    X.fillText('ASC ' + S.ascTier + '  BOUNTY x' + (S.ascMul || 1).toFixed(2), colX + waveW + Math.round(8 * u), ry - Math.round(8 * u));
  }
  const gdNow = (typeof ghostDelta === 'function') ? ghostDelta() : null;
  if (gdNow != null && Math.abs(gdNow) >= 0.5) {
    X.fillStyle = gdNow < 0 ? '#4ade80' : '#fb923c'; X.font = '900 ' + Math.round(9.5 * u) + 'px Arial';
    X.fillText((gdNow < 0 ? 'GHOST -' : 'GHOST +') + Math.abs(gdNow) + 's', colX + waveW + Math.round(8 * u), ry + Math.round(4 * u));
  }

  // Damage-chip health bar (yellow chip drains after the red bar)
  {
    const hpx = colX, hpy = ry + Math.round(8 * u), hph = Math.round(7 * u);
    const hpf = Math.max(0, Math.min(1, P.hp / P.mx));
    const chipf = Math.max(hpf, Math.min(1, (S && S.hpChip != null ? S.hpChip : P.hp) / P.mx));
    X.fillStyle = 'rgba(6,9,6,0.82)';
    X.beginPath(); X.roundRect(hpx - 2, hpy - 2, hpw + 4, hph + 4, 3); X.fill();
    X.fillStyle = '#241412';
    X.beginPath(); X.roundRect(hpx, hpy, hpw, hph, 2); X.fill();
    if (chipf > hpf) {
      X.fillStyle = '#ffd36b';
      X.beginPath(); X.roundRect(hpx + hpw * hpf, hpy, hpw * (chipf - hpf), hph, 2); X.fill();
    }
    const hpCol = hpf > 0.6 ? '#8fae4a' : (hpf > 0.3 ? '#e0b83a' : '#d9453a');
    X.fillStyle = hpCol;
    X.beginPath(); X.roundRect(hpx, hpy, Math.max(1, hpw * hpf), hph, 2); X.fill();
    X.strokeStyle = 'rgba(255,255,255,0.14)'; X.lineWidth = 1;
    X.beginPath(); X.roundRect(hpx, hpy, hpw, hph, 2); X.stroke();
    const vitY = hpy + hph + Math.round(11 * u);
    X.fillStyle = '#e8e4cf'; X.font = 'bold ' + Math.round(9.5 * u) + 'px Arial'; X.textAlign = 'left';
    const hpTxt = 'HP ' + Math.max(0, Math.round(P.hp)) + '/' + P.mx;
    X.fillText(hpTxt, hpx, vitY);
    // Secondary vitals sit on the row below rather than sharing the HP line:
    // measured text can grow past its column on a narrow screen and used to run
    // into the HP readout.
    const vit2Y = vitY + Math.round(12 * u);
    let vit2X = hpx;
    X.font = '900 ' + Math.round(9.5 * u) + 'px Arial';
    if (S && S.ar != null && S.ar < 0.999) {
      X.fillStyle = '#94a3b8';
      const armTxt = '-ARMOR ' + Math.round((1 - S.ar) * 100) + '%';
      X.fillText(armTxt, vit2X, vit2Y);
      vit2X += X.measureText(armTxt).width + Math.round(8 * u);
    }
    if (S && S.bc > 0) {
      X.fillStyle = '#eab308';
      X.fillText('SHIELD ' + S.bc + '/' + Math.max(S.bl || 0, S.bc), vit2X, vit2Y);
    }
  }

  // Active Powerups HUD with Circular Timer Rings & 3-Second Blink
  const activePowerups = [];
  if (S && typeof PU_DEFS !== 'undefined') {
    for (const id in PU_DEFS) {
      const pd = PU_DEFS[id];
      if (pd.key && S[pd.key] > 0) activePowerups.push({ id, name: pd.tag, col: pd.col, time: S[pd.key], maxTime: pd.dur });
    }
  }

  // Powerup timer rings used to sit at ry+26, directly on top of the HP, armour
  // and shield readouts. They now start below the whole vitals block, and the
  // count is capped by the space actually available before the arena centre.
  const pStartX = colX;
  const pStartY = ry + Math.round(54 * u);
  const puPitch = Math.round(32 * u);
  const puRad = 11 * u;
  const puMax = Math.max(1, Math.floor((W * 0.46 - pStartX) / puPitch));
  activePowerups.slice(0, puMax).forEach((pu, idx) => {
    // Blink in the final 3 seconds
    if (pu.time < 3.0 && Math.sin(pu.time * 14) > 0.3) return;

    const px = pStartX + idx * puPitch;
    const py = pStartY;

    // Background circle
    X.fillStyle = '#111827dd';
    X.beginPath(); X.arc(px, py, puRad, 0, 6.28); X.fill();
    X.strokeStyle = '#374151'; X.lineWidth = 1.2; X.stroke();

    // Radial countdown timer ring
    const pct = Math.max(0, Math.min(1, pu.time / pu.maxTime));
    X.strokeStyle = pu.col;
    X.lineWidth = 2.2;
    X.beginPath();
    X.arc(px, py, puRad, -1.57, -1.57 + 6.28 * pct);
    X.stroke();

    // Shared vector glyph - the same art the collectable uses on the ground.
    if (typeof puGlyph === 'function') {
      puGlyph(pu.id, px, py, 0.82, pu.col);
    } else {
      X.fillStyle = pu.col;
      X.font = '900 8px Impact'; X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText(pu.name.slice(0, 2), px, py + 0.5);
    }
  });

  // Freeze Fullscreen Frost Vignette Effect
  if (S && S.fz > 0) {
    const fzAlpha = Math.min(0.35, S.fz * 0.1);
    const fzVig = grad('fzVig' + W + 'x' + H + '_' + fzAlpha.toFixed(2), g => {
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.8);
      gr.addColorStop(0, 'rgba(56, 189, 248, 0)');
      gr.addColorStop(1, `rgba(56, 189, 248, ${fzAlpha})`);
      return gr;
    });
    X.fillStyle = fzVig;
    X.fillRect(0, 0, W, H);
  }

  // Nuke Blinding Whiteout Flash Effect. Capped well below full white and
  // skipped entirely under reduced visual effects: a screen-filling white frame
  // is the single most uncomfortable thing the game drew.
  if (S && S.nukeFlash > 0 && !isFxReduced()) {
    X.fillStyle = `rgba(255, 255, 255, ${Math.min(0.55, S.nukeFlash * 1.6)})`;
    X.fillRect(0, 0, W, H);
  }

  // Boss lane, computed before the right-hand plates so the modifier row and the
  // perk/boon trays can be capped against it. The bar itself is still drawn after
  // the arena-side overlays so it keeps sitting above them.
  const boss = Z.find(z => z.t === 'boss' && !z.dead);
  let bx = 0, bw = 0;
  {
    const laneL = rx + ringR + Math.round(10 * u);
    const laneR = W - Math.round(50 * u) - insetR() - Math.round(6 * u);
    if (boss) {
      bw = Math.max(140, Math.min(Math.round(420 * u), laneR - laneL));
      bx = Math.max(laneL, W / 2 - bw / 2);
    }
  }

  // Cash and horde count on one measured plate. The live wave modifiers used to
  // be printed inside the same plate as the right-aligned cash readout, so a long
  // modifier list ran straight through the money. The plate is now measured from
  // its content and the modifiers get their own row beneath it.
  const topRightEdge = W - Math.round(50 * u) - insetR();
  let stackY = Math.round(6 * u) + saT;
  {
    const ty0 = stackY;
    const cashTxt = '$' + (S ? S.cash : 0);
    const hordeTxt = 'HORDE ' + (Z.length + (S ? S.q.length : 0));
    X.font = 'bold ' + Math.round(15 * u) + 'px Arial';
    const cashW = X.measureText(cashTxt).width;
    X.font = 'bold ' + Math.round(10.5 * u) + 'px Arial';
    const hordeW = X.measureText(hordeTxt).width;
    const tw = Math.round(Math.max(136 * u, Math.max(cashW, hordeW) + 32 * u));
    const th = Math.round(40 * u);
    const tx0 = topRightEdge - tw;
    X.fillStyle = 'rgba(8,11,8,0.72)';
    X.beginPath(); X.roundRect(tx0, ty0, tw, th, 6); X.fill();
    X.strokeStyle = 'rgba(255,255,255,0.10)'; X.lineWidth = 1;
    X.beginPath(); X.roundRect(tx0, ty0, tw, th, 6); X.stroke();
    X.textAlign = 'right';
    X.font = 'bold ' + Math.round(15 * u) + 'px Arial'; X.fillStyle = '#ffd36b';
    X.fillText(cashTxt, topRightEdge - Math.round(6 * u), ty0 + Math.round(17 * u));
    X.font = 'bold ' + Math.round(10.5 * u) + 'px Arial'; X.fillStyle = '#e8e4cf';
    X.fillText(hordeTxt, topRightEdge - Math.round(6 * u), ty0 + Math.round(32 * u));
    stackY = ty0 + th;
  }
  if (S && S.wmList && S.wmList.length) {
    const my = stackY + Math.round(12 * u);
    X.font = '900 ' + Math.round(8.5 * u) + 'px Arial';
    const chips = [];
    for (const m of S.wmList) chips.push({ t: m.name, c: m.col, w: X.measureText(m.name).width });
    // Right-aligned, so without a left limit a long modifier list ran across the
    // boss health bar (and the vitals on a narrow screen). Chips that do not fit
    // are dropped behind a +n counter instead of overprinting them.
    const mLimit = boss ? (bx + bw + Math.round(10 * u)) : (colX + hpw + Math.round(14 * u));
    let mx = topRightEdge, dropped = 0;
    for (let i = chips.length - 1; i >= 0; i--) {
      const next = mx - chips[i].w;
      if (next < mLimit) { dropped = i + 1; break; }
      chips[i].x = next;
      mx = next - Math.round(6 * u);
    }
    X.textAlign = 'left';
    for (const c of chips) if (c.x != null) { X.fillStyle = c.c; X.fillText(c.t, c.x, my); }
    if (dropped > 0) {
      // Right-aligned into the gap left of the last drawn chip, so the counter cannot
      // print over its text (it did, by 83px2 at 1024x576).
      X.textAlign = 'right'; X.fillStyle = '#d5d0c2';
      X.fillText('+' + dropped, mx, my);
      X.textAlign = 'left';
    }
    stackY = my;
  }
  X.textAlign = 'right';

  // Combo multiplier
  if (typeof renderDirectorOverlay === 'function') renderDirectorOverlay(W, H);

  // Equipped weapon card. Tapping it opens the owned-weapon picker.
  drawWeaponHud();
  X.textAlign = 'left';

  // Screen-edge damage vignette. This is the low-health warning, so it stays
  // readable under reduced effects - just softer and shorter.
  if (HURT_VIGNETTE_TIMER > 0) {
    const vAlpha = Math.min(isFxReduced() ? 0.26 : 0.5, HURT_VIGNETTE_TIMER * 1.6);
    const vig = grad('hurtVig' + W + 'x' + H + '_' + vAlpha.toFixed(2), g => {
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(239,68,68,0)');
      gr.addColorStop(1, `rgba(239,68,68,${vAlpha})`);
      return gr;
    });
    X.fillStyle = vig;
    X.fillRect(0, 0, W, H);
  }

  // Boss health bar (top centre), occupying the lane reserved for it above.
  if (boss) {
    const by = Math.round(52 * u) + saT;
    const pctB = Math.max(0, Math.min(1, boss.hp / (boss.mh || 1)));
    X.textBaseline = 'alphabetic';
    X.fillStyle = 'rgba(10,12,8,0.78)';
    X.beginPath(); X.roundRect(bx - 5, by - 5, bw + 10, 24, 6); X.fill();
    X.strokeStyle = '#ef4444'; X.lineWidth = 1.5; X.stroke();
    X.fillStyle = '#2a1010';
    X.beginPath(); X.roundRect(bx, by, bw, 14, 4); X.fill();
    const bg = grad('bossBar' + bx + '_' + bw, g => {
      const gr = g.createLinearGradient(bx, 0, bx + bw, 0);
      gr.addColorStop(0, '#ef4444'); gr.addColorStop(1, '#ff9a3a');
      return gr;
    });
    X.fillStyle = bg;
    X.beginPath(); X.roundRect(bx, by, Math.max(2, bw * pctB), 14, 4); X.fill();
    X.fillStyle = '#f0ece1'; X.font = '900 ' + Math.round(11 * u) + 'px Impact,Arial Black,sans-serif'; X.textAlign = 'center';
    X.fillText((typeof BN !== 'undefined' && BN[boss.bv % 4] ? BN[boss.bv % 4] : 'BOSS') + '   ' + Math.max(0, Math.round(boss.hp)) + ' / ' + Math.round(boss.mh), bx + bw / 2, by + 11);
  }

  // Width the right-hand trays may use. They are drawn after the boss bar, so an
  // uncapped tray would paint straight over a live boss's health - the one readout
  // a player cannot afford to lose. Capped to the lane left of the boss bar when
  // one is up, and to a third of the screen otherwise.
  const trayMax = boss
    ? Math.max(36, topRightEdge - (bx + bw) - Math.round(10 * u))
    : Math.max(36, W * 0.30);

  // Acquired perk tray (build readout) — top-right under the cash counter
  if (S && S.pk) {
    const names = Object.keys(S.pk).filter(k => S.pk[k] > 0);
    if (names.length) {
      const bw2 = Math.round(16 * u), gap = Math.round(2 * u);
      const fit = Math.max(1, Math.floor(trayMax / (bw2 + gap)));
      const shown = names.slice(0, Math.min(16, fit));
      const extraP = names.length - shown.length;
      let sx0 = topRightEdge - (shown.length + (extraP > 0 ? 1 : 0)) * (bw2 + gap);
      const ty = stackY + Math.round(18 * u);
      X.textAlign = 'left'; X.textBaseline = 'middle';
      shown.forEach((name, i) => {
        const pdef = PKS.find(p => p[0] === name) || PKS.find(p => p[0] === '\u2726 ' + name) || [];
        const col = pdef[4] || '#8fae4a';
        const x = sx0 + i * (bw2 + gap);
        X.fillStyle = 'rgba(10,12,8,0.72)';
        X.beginPath(); X.roundRect(x, ty - 8, bw2, bw2, 4); X.fill();
        X.strokeStyle = col; X.lineWidth = 1.4; X.stroke();
        X.fillStyle = col;
        X.beginPath(); X.arc(x + 8, ty - 1.5, 3.2, 0, 6.28); X.fill();
        if (S.pk[name] > 1) {
          X.fillStyle = '#fff'; X.font = '900 8px Arial';
          X.fillText(String(S.pk[name]), x + 9.5, ty + 6);
        }
      });
      if (extraP > 0) {
        const x = sx0 + shown.length * (bw2 + gap);
        X.fillStyle = 'rgba(10,12,8,0.72)';
        X.beginPath(); X.roundRect(x, ty - 8, bw2, bw2, 4); X.fill();
        X.strokeStyle = 'rgba(255,255,255,0.25)'; X.lineWidth = 1.2; X.stroke();
        X.fillStyle = '#d5d0c2'; X.font = '900 8px Arial'; X.textAlign = 'center';
        X.fillText('+' + extraP, x + bw2 / 2, ty + 6);
        X.textAlign = 'left';
      }
      X.textBaseline = 'alphabetic';
    }
  }

  // Run boons. These used to be a 9px green text string under the perk icons,
  // which was unreadable on a phone and made the draft feel like it did nothing.
  // They now get the same chip treatment as perks, coloured and stack-counted.
  if (S && typeof boonHudList === 'function') {
    const list = boonHudList();
    if (list.length) {
      const bw = Math.round(18 * u), gap = Math.round(2 * u);
      const cap = Math.max(1, Math.min(12, Math.floor(trayMax / (bw + gap))));
      const shown = list.slice(0, cap);
      const extra = list.length - shown.length;
      let sx0 = topRightEdge - (shown.length + (extra > 0 ? 1 : 0)) * (bw + gap);
      const ty = stackY + Math.round(44 * u);
      X.textAlign = 'center'; X.textBaseline = 'middle';
      shown.forEach((b, i) => {
        const x = sx0 + i * (bw + gap);
        X.fillStyle = 'rgba(10,12,8,0.74)';
        X.beginPath(); X.roundRect(x, ty - 9, bw, bw, 4); X.fill();
        X.strokeStyle = b.col; X.lineWidth = 1.4; X.stroke();
        X.fillStyle = b.col; X.font = '900 8.5px Arial';
        X.fillText(b.short.slice(0, 3).toUpperCase(), x + bw / 2, ty);
        if (b.st > 1) {
          X.fillStyle = 'rgba(8,10,6,0.9)';
          X.beginPath(); X.arc(x + bw - 3, ty + 6, 6, 0, 6.28); X.fill();
          X.fillStyle = '#fff'; X.font = '900 8px Arial';
          X.fillText(String(b.st), x + bw - 3, ty + 6.2);
        }
      });
      if (extra > 0) {
        const x = sx0 + shown.length * (bw + gap);
        X.fillStyle = 'rgba(10,12,8,0.74)';
        X.beginPath(); X.roundRect(x, ty - 9, bw, bw, 4); X.fill();
        X.strokeStyle = 'rgba(255,255,255,0.25)'; X.lineWidth = 1.2; X.stroke();
        X.fillStyle = '#d5d0c2'; X.font = '900 8.5px Arial';
        X.fillText('+' + extra, x + bw / 2, ty);
      }
      X.textAlign = 'left'; X.textBaseline = 'alphabetic';
    }
  }

  // Virtual Joysticks, Action Buttons, and Combat Overlay
  drawControls();
}

function drawControls() {
  // 1. Out of bounds map border warnings
  if (P && (P.x < 140 || P.x > WS - 140 || P.y < 140 || P.y > WS - 140)) {
    // Out-of-bounds warning: a slow, low-amplitude breathe instead of the old
    // 1.3Hz throb, which read as a flicker at the screen edge.
    const oobAlpha = isFxReduced() ? 0.34 : 0.3 + 0.1 * Math.sin((S ? S.t : 0) * 3);
    X.fillStyle = `rgba(239, 68, 68, ${oobAlpha})`;
    if (P.x < 140) X.fillRect(0, 0, 8, H);
    if (P.x > WS - 140) X.fillRect(W - 8, 0, 8, H);
    if (P.y < 140) X.fillRect(0, 0, W, 8);
    if (P.y > WS - 140) X.fillRect(0, H - 8, W, 8);
  }

  // 2. LEVEL UP banner
  // Guarded on `run`: the banner used to keep painting while the boon draft or
  // perk modal was up (run = 0), so a wave-clear read as "LEVEL UP!" + "BOON
  // DRAFT" stacking. The banner belongs to live gameplay only.
  if (run && S && S.lu > 0) {
    X.save();
    const luAlpha = Math.min(1, S.lu * 1.5);
    X.globalAlpha = luAlpha;
    X.fillStyle = '#ffd84a';
    X.font = '900 24px Impact, Arial Black, sans-serif';
    X.textAlign = 'center';
    X.shadowColor = 'rgba(0,0,0,0.8)';
    X.shadowBlur = 8;
    X.fillText('LEVEL UP!', W / 2, H * 0.26);
    X.restore();
  }

  // 3. Dual virtual joysticks. One base ring plus a smaller thumb indicator;
  //    the MOVE/AIM label is only drawn while the stick is at rest, so nothing is
  //    written under a moving finger.
  const ctlAlpha = ctlPref().opacity;
  const [lx, ly] = jPos('l');
  const [rx, ry] = jPos('r');
  const drawStick = (side) => {
    const held = J[side];
    const base = held ? [held.ox, held.oy] : (side === 'l' ? [lx, ly] : [rx, ry]);
    const cur = held ? [held.x, held.y] : base;
    const R = jRad(), kn = jKnob();
    // White movement stick, warm-red aiming stick: the same disc either way, so
    // the pair reads as one system and the colour tells the hands apart.
    const acc = side === 'l' ? '232,236,224' : '255,118,84';
    X.save();
    X.globalAlpha = ctlAlpha;

    // well: soft dark halo, translucent bowl, one bright ring, hairline inside
    X.beginPath(); X.arc(base[0], base[1], R + 3.5, 0, 6.28);
    X.fillStyle = 'rgba(0,0,0,0.18)'; X.fill();
    X.beginPath(); X.arc(base[0], base[1], R, 0, 6.28);
    X.fillStyle = held ? 'rgba(10,13,10,0.42)' : 'rgba(10,13,10,0.32)'; X.fill();
    X.strokeStyle = 'rgba(' + acc + ',' + (held ? '0.75' : '0.5') + ')';
    X.lineWidth = Math.max(2, 2.2 * ctlScale());
    X.stroke();
    X.strokeStyle = 'rgba(' + acc + ',0.14)'; X.lineWidth = 1;
    X.beginPath(); X.arc(base[0], base[1], R - 5, 0, 6.28); X.stroke();

    if (!held) {
      // rest marks: four ticks on the cardinals, so the ring reads as a dial
      X.strokeStyle = 'rgba(' + acc + ',0.34)'; X.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 - Math.PI / 2;
        X.beginPath();
        X.moveTo(base[0] + Math.cos(a) * (R - 13 * ctlScale()), base[1] + Math.sin(a) * (R - 13 * ctlScale()));
        X.lineTo(base[0] + Math.cos(a) * (R - 4.5), base[1] + Math.sin(a) * (R - 4.5));
        X.stroke();
      }
      X.fillStyle = 'rgba(' + acc + ',0.32)';
      X.font = '900 ' + Math.round(10 * ctlScale()) + 'px Arial';
      X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText(side === 'l' ? 'MOVE' : 'AIM', base[0], base[1] + R * 0.55);
    }

    // knob: dark disc, bright rim, and the role's own glyph inside
    X.beginPath(); X.arc(cur[0], cur[1], kn, 0, 6.28);
    X.fillStyle = held ? 'rgba(22,26,20,0.86)' : 'rgba(16,20,15,0.74)'; X.fill();
    X.strokeStyle = 'rgba(' + acc + ',0.92)'; X.lineWidth = 2; X.stroke();
    if (side === 'l') drawArrowCrossGlyph(cur[0], cur[1], kn * 1.15, 'rgba(' + acc + ',0.9)');
    else drawCrosshairGlyph(cur[0], cur[1], kn * 1.5, 'rgba(' + acc + ',0.92)');
    X.restore();
  };
  drawStick('l');
  drawStick('r');

  // 4. Combat-control pad. One lattice, one button size, icons instead of words:
  //    fire, reload and the class abilities are drawn from the same geometry the
  //    hit-test uses, so what a player sees is what the game reads.
  const reloading = !!(P && P.reloading);
  const noAmmo = !!(P && P.ammo != null && P.ammo <= 0);
  const magMax = (P && WEAP[P.cur] && WEAP[P.cur].mag) || 12;
  for (const b of BT) {
    if (!btActive(b)) continue;
    const pos = b.p();
    const bx = pos[0], by = pos[1];
    const r = btnRad(b);

    // The dedicated FIRE button was removed: firing is driven by the aim
    // stick and the tap/hold fire modes, so a separate button only duplicated
    // the same action and crowded the pad.


    if (b.id === 'pause') {
      X.save(); X.globalAlpha = ctlAlpha;
      ctlDisc(bx, by, r, btFlash(b) > 0 ? '#c9e08a' : '#54663f', { ringW: 1.8, hi: 'rgba(255,255,255,0.07)' });
      X.fillStyle = '#d5d0c2';
      const bw = Math.max(3, r * 0.2), bh = r * 0.8;
      X.fillRect(bx - r * 0.36 - bw / 2, by - bh / 2, bw, bh);
      X.fillRect(bx + r * 0.36 - bw / 2, by - bh / 2, bw, bh);
      X.restore();
      continue;
    }

    if (b.id === 'reload') {
      // Three readable states: idle/ready, reloading (amber + progress ring),
      // and magazine already full (dimmed, so a wasted press is obvious before
      // it happens). startReload() itself rejects overlapping requests.
      const full = P && P.ammo != null && P.ammo >= magMax;
      const prog = (reloading && P.reloadDuration) ? Math.max(0, Math.min(1, 1 - (P.reloadTimer || 0) / P.reloadDuration)) : 0;
      const fl = btFlash(b);
      X.save();
      X.globalAlpha = ctlAlpha * (full && !reloading ? 0.55 : 1);
      ctlDisc(bx, by, r,
        fl > 0 ? '#fff3d0' : reloading ? '#ffd36b' : full ? 'rgba(96,106,84,0.55)' : '#8fae4a',
        {
          fill: reloading ? 'rgba(44,36,18,0.9)' : 'rgba(12,16,11,0.86)',
          glow: reloading ? 'rgba(255,211,107,0.55)' : null
        });
      if (prog > 0) {
        X.strokeStyle = '#ffd36b'; X.lineWidth = 3.2; X.lineCap = 'round';
        X.beginPath(); X.arc(bx, by, r + 3.5, -1.5708, -1.5708 + 6.28 * prog); X.stroke();
      }
      drawReloadGlyph(bx, by, r * (1.02 + 0.06 * fl), reloading ? '#ffd36b' : full ? '#8a917e' : '#e6e2d2');
      X.restore();
      continue;
    }

    // Abilities: class glyph, cooldown ring, and the grenade's charge count.
    const key = b.k;
    const sk = (typeof SK !== 'undefined' && SK[key]) ? SK[key] : null;
    const cdRatio = (sk && sk.cd > 0) ? Math.max(0, Math.min(1, sk.cd / (sk.max || 1))) : 0;
    const charges = (key === 'gren') ? ((typeof S !== 'undefined' && S) ? (S.gr || 0) : 0) : null;
    const unavail = (charges === 0);
    const flc = btFlash(b);
    X.save();
    X.globalAlpha = ctlAlpha * (unavail ? 0.6 : 1);
    ctlDisc(bx, by, r,
      flc > 0 ? '#fff3d0' : unavail ? 'rgba(126,118,98,0.5)' : cdRatio > 0 ? 'rgba(122,134,104,0.62)' : '#8fae4a',
      {
        fill: cdRatio > 0 ? 'rgba(12,17,10,0.84)' : 'rgba(12,16,11,0.8)',
        // A ready skill keeps a faint olive halo, so the eye finds what is
        // available without any of it competing with the world behind it.
        glow: (unavail || cdRatio > 0) ? null : 'rgba(143,174,74,0.42)',
        glowA: 0.3
      });
    if (cdRatio > 0) {
      // Cooldown reads as a ring refilling instead of a pie hiding the icon.
      X.strokeStyle = 'rgba(196,212,158,0.75)'; X.lineWidth = 3; X.lineCap = 'round';
      X.beginPath(); X.arc(bx, by, r - 3.5, -1.5708, -1.5708 + 6.28 * cdRatio); X.stroke();
    }
    drawSkillGlyph(X, key, bx, by, r * (1.26 + 0.08 * flc),
      unavail ? '#8a917e' : cdRatio > 0 ? '#a6b78c' : '#e8f0d4');
    if (charges != null) {
      // Charge badge on the rim, in the reference's numeric-pip style.
      const br = Math.max(8.5, r * 0.36);
      const gx = bx + r * 0.68, gy = by + r * 0.68;
      X.beginPath(); X.arc(gx, gy, br, 0, 6.28);
      X.fillStyle = charges > 0 ? 'rgba(26,20,10,0.95)' : 'rgba(34,34,30,0.9)'; X.fill();
      X.strokeStyle = charges > 0 ? '#ffb75a' : 'rgba(150,144,128,0.65)';
      X.lineWidth = 1.6; X.stroke();
      X.fillStyle = charges > 0 ? '#ffd9a0' : '#a8a396';
      X.font = '900 ' + Math.round(br * 1.2) + 'px Arial';
      X.textAlign = 'center'; X.textBaseline = 'middle';
      X.fillText(String(charges), gx, gy + 0.5);
    }
    X.restore();
  }

  // 5. Activation rings: one short expanding ring per press, so an ability that
  //    fires while the screen is busy still confirms that the tap landed.
  if (BT_FX.length) {
    const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    for (let i = BT_FX.length - 1; i >= 0; i--) {
      const f = BT_FX[i];
      const a = (nowMs - f.t0) / 320;
      if (a >= 1) { BT_FX.splice(i, 1); continue; }
      X.save();
      X.globalAlpha = (1 - a) * 0.7 * ctlAlpha;
      X.strokeStyle = f.col; X.lineWidth = 2;
      X.beginPath(); X.arc(f.x, f.y, f.r + a * 14, 0, 6.28); X.stroke();
      X.restore();
    }
  }
}
