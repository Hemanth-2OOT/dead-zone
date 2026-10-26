// DEAD ZONE v2.0.1 - LOBBY, PREVIEWS, PROGRESSION & UI CONTROLLER
// Senior 2D Artist / Technical UI Engineering System

let curPreviewZone = 0;

function drawZonePreview(mIndex, canvasId) {
  const cv = document.getElementById(canvasId || 'zone-preview');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  
  // Dynamic sizing via getBoundingClientRect & devicePixelRatio
  const rect = cv.getBoundingClientRect();
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1, 2);
  const targetW = Math.max(200, Math.round((rect.width || 460) * dpr));
  const targetH = Math.max(100, Math.round((rect.height || 200) * dpr));
  if (cv.width !== targetW || cv.height !== targetH) {
    cv.width = targetW;
    cv.height = targetH;
  }
  const w = cv.width, h = cv.height;

  // Crossfade transition animation (tracked per canvas so the hub preview and
  // the map window can show different sectors at the same time).
  const prevKey = '__dzPreviewZone';
  if (cv[prevKey] !== mIndex) {
    cv.style.transition = 'opacity 0.18s ease-out';
    cv.style.opacity = '0.4';
    setTimeout(() => { if (cv) cv.style.opacity = '1'; }, 40);
  }
  cv[prevKey] = mIndex;

  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[mIndex]) ? MAP_DATA[mIndex] : (MP[mIndex] || MP[0]);
  const worldSize = (typeof WS !== 'undefined') ? WS : 2400;
  const scale = w / worldSize;

  // 1. Sky / atmospheric gradient base
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, mapDef.ground || mapDef.t1 || '#1e241c');
  bg.addColorStop(1, '#0c0f0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle grid lines
  ctx.strokeStyle = mapDef.grid || 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridStep = Math.max(16, Math.round(100 * scale));
  for (let x = 0; x < w; x += gridStep) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += gridStep) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  // 3. Scaled Roads & Crosswalks
  if (mapDef.roads && mapDef.roads.length) {
    for (const rd of mapDef.roads) {
      const rx = rd.x * scale, ry = rd.y * scale, rw = rd.w * scale, rh = rd.h * scale;
      ctx.fillStyle = '#1c221b';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#10140f';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // Yellow center dashed line
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (rw > rh) {
        ctx.moveTo(rx, ry + rh / 2); ctx.lineTo(rx + rw, ry + rh / 2);
      } else {
        ctx.moveTo(rx + rw / 2, ry); ctx.lineTo(rx + rw / 2, ry + rh);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Crosswalks
  if (mapDef.crosswalks && mapDef.crosswalks.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const cw of mapDef.crosswalks) {
      ctx.fillRect(cw.x * scale, cw.y * scale, cw.w * scale, cw.h * scale);
    }
  }

  // 4. Scaled Hazard Zones
  if (mapDef.hazards && mapDef.hazards.length) {
    for (const hz of mapDef.hazards) {
      ctx.fillStyle = mapDef.hazard || mapDef.hz || 'rgba(239,68,68,0.38)';
      ctx.beginPath();
      ctx.arc(hz.x * scale, hz.y * scale, Math.max(4, hz.r * scale), 0, 6.28);
      ctx.fill();
    }
  }

  // 5. Scaled 3D Obstacles & Buildings (Supports walls and obstacles)
  const wallsList = mapDef.walls || mapDef.obstacles || [];
  if (wallsList.length) {
    for (const ob of wallsList) {
      const ox = ob.x * scale, oy = ob.y * scale, ow = Math.max(2, ob.w * scale), oh = Math.max(2, ob.h * scale);
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(ox + 2, oy + 2, ow, oh);
      // Top face
      ctx.fillStyle = ob.col || mapDef.wall || mapDef.wl || '#2d3826';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = mapDef.accent || mapDef.ws || '#445738';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, ow, oh);
    }
  }

  // 6. Map Props (lamps, vehicles, etc.)
  if (mapDef.props && mapDef.props.length) {
    for (const pr of mapDef.props) {
      const px = pr.x * scale, py = pr.y * scale;
      if (pr.type === 'lamp') {
        const lg = ctx.createRadialGradient(px, py, 1, px, py, 20);
        lg.addColorStop(0, 'rgba(255,245,200,0.4)');
        lg.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(px, py, 20, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.28); ctx.fill();
      } else if (pr.type === 'car') {
        ctx.fillStyle = pr.col || '#2563eb';
        ctx.fillRect(px - 4, py - 2.5, 8, 5);
      }
    }
  }

  // 7. Player Start Location Marker (Green tactical marker)
  const startX = (worldSize / 2) * scale, startY = (worldSize / 2) * scale;
  ctx.save();
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(startX, startY, 6, 0, 6.28); ctx.stroke();
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(startX, startY, 2.5, 0, 6.28); ctx.fill();
  ctx.restore();

  // 8. Perimeter Spawn Point Indicators (Red tactical radar blips)
  const spawnPoints = [
    [0.15 * worldSize, 0.15 * worldSize],
    [0.85 * worldSize, 0.15 * worldSize],
    [0.15 * worldSize, 0.85 * worldSize],
    [0.85 * worldSize, 0.85 * worldSize],
    [0.5 * worldSize, 0.1 * worldSize],
    [0.5 * worldSize, 0.9 * worldSize]
  ];
  ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
  for (const [sx, sy] of spawnPoints) {
    const spX = sx * scale, spY = sy * scale;
    ctx.beginPath(); ctx.arc(spX, spY, 3, 0, 6.28); ctx.fill();
  }

  // 9. Tactical CRT Scanline Vignette
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let y = 1; y < h; y += 3) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  updateZoneMeta(mIndex);
}

function updateZoneMeta(mIndex) {
  const mapDef = (typeof MAP_DATA !== 'undefined' && MAP_DATA[mIndex]) ? MAP_DATA[mIndex] : (MP[mIndex] || MP[0]);
  const reqLvl = Math.max(1, (typeof MREQ !== 'undefined' && MREQ[mIndex] != null) ? MREQ[mIndex] : (mIndex * 3));
  const curLvl = (typeof SV !== 'undefined' && SV && SV.lvl) ? SV.lvl : 1;
  const isLocked = curLvl < reqLvl;

  const zName = document.getElementById('zone-name');
  if (zName) zName.textContent = `ZONE: ${(mapDef.name || mapDef.n || 'DOWNTOWN').toUpperCase()}`;

  const zThreat = document.getElementById('zone-threat-badge');
  if (zThreat) {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][mIndex] || 'I';
    zThreat.textContent = `THREAT ${roman}`;
  }

  const mapd = document.getElementById('mapd');
  if (mapd) {
    const mpDef = (typeof MP !== 'undefined' && MP[mIndex]) ? MP[mIndex] : null;
    mapd.textContent = mapDef.desc || mapDef.d || (mpDef && (mpDef.d || mpDef.desc)) || 'Ruined city streets and buildings.';
  }

  const badge = document.getElementById('zone-rec-lvl') || document.getElementById('rec-badge');
  if (badge) {
    if (isLocked) {
      badge.textContent = `REC. LEVEL: ${reqLvl} (LOCKED)`;
      badge.style.color = '#ff5a3a';
    } else {
      badge.textContent = `REC. LEVEL: ${reqLvl}`;
      badge.style.color = '#e0b83a';
    }
  }

  const enemyCont = document.getElementById('zone-enemy-icons') || document.getElementById('zone-enemies');
  if (enemyCont) {
    const enemyTypes = mapDef.enemies || ['walk', 'run', 'brute'];
    enemyCont.innerHTML = enemyTypes.map(t => {
      const zDef = (typeof ZT !== 'undefined' && ZT[t]) ? ZT[t] : { col: '#4ade80' };
      return `<span class="sec-enemy-tag" style="display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:700;background:rgba(0,0,0,0.5);border:1px solid ${zDef.col};color:${zDef.col};padding:2px 6px;border-radius:4px;letter-spacing:0.5px">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${zDef.col}"></span>
        ${t.toUpperCase()}
      </span>`;
    }).join('');
  }

  const recEl = document.getElementById('zone-best-wave') || document.getElementById('zone-record-text');
  if (recEl) {
    const bestWave = (typeof SV !== 'undefined' && SV && SV.best) ? SV.best : 0;
    recEl.textContent = bestWave > 0 ? `SECTOR BEST: W${bestWave}` : 'SECTOR BEST: NONE';
  }
  const bntyEl = document.getElementById('zone-bounty') || document.getElementById('zone-bounty-text');
  if (bntyEl) {
    const base = mapDef.bountyMult || (MP[mIndex] && MP[mIndex].cm ? MP[mIndex].cm : 1.0);
    const asc = (typeof ascRewardMult === 'function') ? ascRewardMult(mIndex) : 1;
    bntyEl.textContent = `${(base * asc).toFixed(2)}x`;
  }
  const ascEl = document.getElementById('zone-asc-tag');
  if (ascEl) {
    const tier = (typeof ascTier === 'function') ? ascTier(mIndex) : 0;
    ascEl.textContent = tier > 0 ? `ASCENSION ${tier}` : '';
  }

  // Mirror the same readout into the MAP SELECTION window.
  const mn = document.getElementById('map-modal-name');
  if (mn) mn.textContent = `ZONE: ${(mapDef.name || mapDef.n || 'DOWNTOWN').toUpperCase()}`;
  const mt = document.getElementById('map-modal-threat');
  if (mt) mt.textContent = `THREAT ${['I','II','III','IV','V','VI','VII'][mIndex] || 'I'}`;
  const md = document.getElementById('map-modal-desc');
  if (md) md.textContent = mapDef.desc || mapDef.d || '';
  const ms = document.getElementById('map-modal-stats');
  if (ms) {
    const base = mapDef.bountyMult || (MP[mIndex] && MP[mIndex].cm ? MP[mIndex].cm : 1.0);
    const asc = (typeof ascRewardMult === 'function') ? ascRewardMult(mIndex) : 1;
    const tier = (typeof ascTier === 'function') ? ascTier(mIndex) : 0;
    ms.innerHTML = `<span style="font-weight:800;color:${isLocked ? '#ff5a3a' : '#e0b83a'}">${isLocked ? 'LOCKED' : 'REC. LEVEL'} ${reqLvl}</span>`
      + `<span style="font-weight:700;color:#d5d0c2">BOUNTY <b style="color:#ffd36b">${(base * asc).toFixed(2)}x</b></span>`
      + (tier > 0 ? `<span style="font-weight:800;color:#c084fc">ASCENSION ${tier}</span>` : '');
  }
  const me = document.getElementById('map-modal-enemies');
  if (me && enemyCont) me.innerHTML = enemyCont.innerHTML;
}

function mapsUI() {
  const c = document.getElementById('maps');
  if (!c) return;
  const curMap = (typeof getCurMap === 'function') ? getCurMap() : 0;
  const userLvl = (typeof SV !== 'undefined' && SV && SV.lvl) ? SV.lvl : 1;

  c.innerHTML = MP.map((m, i) => {
    const req = (typeof MREQ !== 'undefined' && MREQ[i] != null) ? MREQ[i] : (i * 3);
    const locked = userLvl < req;
    const isSelected = curMap === i;

    const isPrev = curPreviewZone === i;
    return `<button class="map-tile ${isSelected ? 'on' : ''} ${isPrev ? 'prev' : ''} ${locked ? 'locked' : ''}" data-m="${i}">
      <span class="m-num">SEC 0${i + 1}</span>
      <span class="m-title">${locked ? '🔒 ' : ''}${m.n}</span>
      <span class="m-req">${locked ? `RANK ${req} TO UNLOCK` : (isSelected ? 'DEPLOY READY' : 'TAP TO SELECT')}</span>
    </button>`;
  }).join('');

  c.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = +b.dataset.m;
    const req = (typeof MREQ !== 'undefined' && MREQ[i] != null) ? MREQ[i] : (i * 3);
    if (userLvl >= req && typeof SV !== 'undefined') {
      SV.map = i;
      if (typeof sv === 'function') sv();
    }
    curPreviewZone = i;
    mapsUI();
    drawZonePreview(i);
    drawZonePreview(i, 'map-modal-preview');
    updateZoneMeta(i);
    b.scrollIntoView && b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };
}

// ---- Window controls for the hub: each window is its own overlay ----
function openMapModal() {
  const m = document.getElementById('map-modal');
  if (!m) return;
  const cur = (typeof getCurMap === 'function') ? getCurMap() : 0;
  curPreviewZone = cur;
  mapsUI();
  updateZoneMeta(cur);
  drawZonePreview(cur, 'map-modal-preview');
  m.classList.add('on');
}

function closeMapModal() {
  const m = document.getElementById('map-modal');
  if (m) m.classList.remove('on');
  const cur = (typeof getCurMap === 'function') ? getCurMap() : 0;
  mapsUI();
  updateZoneMeta(cur);
  drawZonePreview(cur);
}

function openMissionsModal() {
  const m = document.getElementById('missions-modal');
  if (!m) return;
  if (typeof initDailyMissions === 'function') initDailyMissions();
  if (typeof renderMissionsUI === 'function') renderMissionsUI();
  if (typeof renderLoginTrackUI === 'function') renderLoginTrackUI();
  if (typeof renderRankRewards === 'function') renderRankRewards();
  if (typeof renderAchievements === 'function') renderAchievements();
  m.classList.add('on');
}

function closeMissionsModal() {
  const m = document.getElementById('missions-modal');
  if (m) m.classList.remove('on');
}

function tab(i) {
  document.querySelectorAll('#nav button').forEach((b, k) => {
    if (k === i) b.classList.add('on'); else b.classList.remove('on');
  });
  document.querySelectorAll('.pp').forEach(p => p.classList.remove('on'));

  // Panel ids follow the nav order exactly: PLAY, EVENTS, SHOP, SKINS, HERO,
  // SKILLS, STATS, RELICS, OPTS.
  const pids = ['p0', 'pe', 'psh', 'psk', 'pc', 'ps', 'p2', 'pa', 'p3'];
  const target = document.getElementById(pids[i] || 'p0');
  if (target) {
    target.classList.add('on');
    target.style.animation = 'none'; void target.offsetWidth; target.style.animation = '';
    setTimeout(() => target.querySelectorAll('.grid').forEach(staggerIn), 0);
  }
  // Micro-detail: tabs used to change in silence, which made the hub feel like a
  // static page rather than a shell you move around in.
  if (typeof snd === 'function') snd(i === 3 ? 620 : 480, 0.07, 'triangle', 0.035, 1.6);

  if (i !== 3 && typeof TURNTABLE_RAF !== 'undefined' && TURNTABLE_RAF) {
    cancelAnimationFrame(TURNTABLE_RAF);
    TURNTABLE_RAF = null;
  }

  if (i === 0) { mapsUI(); updateZoneMeta(getCurMap()); drawZonePreview(getCurMap()); }
  else if (i === 1) renderEventsUI();
  else if (i === 2) renderShop();
  else if (i === 3) renderSkinsUI();
  else if (i === 4) lobby2();
  else if (i === 5) lobby2();
  else if (i === 6) lobby2();
  else if (i === 7) relics();
  else if (i === 8) renderSettingsUI();
}

function renderNextGoal() {
  const el = document.getElementById('next-goal');
  if (!el || typeof nextGoal !== 'function') return;
  const g = nextGoal();
  if (!g) { el.style.display = 'none'; return; }
  el.style.display = '';
  const pct = Math.max(2, Math.min(100, Math.round(100 * g.cur / g.max)));
  const close = pct >= 80;
  el.innerHTML = `<div class="ng-row"><span class="ng-lbl">NEXT GOAL</span><b style="color:${g.col}">${g.label}</b><span class="ng-val">${g.cur.toLocaleString()}/${g.max.toLocaleString()} ${g.unit}</span></div>`
    + `<div class="ng-bar"><div class="ng-fill ${close ? 'close' : ''}" style="width:${pct}%;background:${g.col}"></div></div>`
    + (close ? '<div class="ng-hint">SO CLOSE — ONE MORE RUN</div>' : '');
}

function lobby() {
  if (typeof sanitizeSV === 'function') SV = sanitizeSV(SV);
  if (typeof refreshDailyBtn === 'function') refreshDailyBtn();

  const rankEl = document.getElementById('lvn') || document.getElementById('rnk');
  if (rankEl) rankEl.textContent = SV.lvl || 1;
  const bestEl = document.getElementById('best') || document.getElementById('bst');
  if (bestEl) bestEl.textContent = 'SURVIVAL RECORD: WAVE ' + (SV.best || 0);
  const crEl = document.getElementById('cr') || document.getElementById('scr');
  if (crEl) { if (typeof animateNumber === 'function') animateNumber(crEl, SV.cr || 0, 650); else crEl.textContent = SV.cr || 0; }
  renderNextGoal();

  const xpFill = document.getElementById('xpf') || document.getElementById('xp-fill');
  const xpLbl = document.getElementById('xptxt') || document.getElementById('xp-label');
  const reqXP = (typeof need === 'function') ? need(SV.lvl || 1) : 100;
  const curXP = SV.xp || 0;
  if (xpFill) xpFill.style.width = Math.min(100, Math.round((curXP / reqXP) * 100)) + '%';
  if (xpLbl) xpLbl.textContent = `${curXP} / ${reqXP} XP`;

  const strkEl = document.getElementById('streak-count');
  if (strkEl) strkEl.textContent = `${SV.loginDays || 1} Days`;

  const bestBadge = document.getElementById('best-badge');
  if (bestBadge) {
    // Clicks are handled by the delegated data-act listener (see engine_bootstrap.js).
  }

  drawZonePreview(getCurMap());
  mapsUI();
  updateZoneMeta(getCurMap());

  initDailyMissions();
  renderMissionsUI();
  renderLoginTrackUI();
  if (typeof renderRankRewards === 'function') renderRankRewards();
  if (typeof renderAchievements === 'function') renderAchievements();
  if (typeof checkSkinUnlocks === 'function') checkSkinUnlocks();
}

function openTacticalRecords() {
  const modal = document.getElementById('run-details-modal');
  if (!modal) return;
  // The markup names this node #run-details-content. It was looked up as
  // #run-details-body, so the guard below never filled it and the COMBAT
  // DOSSIER opened completely empty.
  const body = document.getElementById('run-details-content');
  if (body) {
    body.innerHTML = `
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Highest Wave Cleared:</span>
        <b style="color:#ffd36b">Wave ${SV.best || 0}</b>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Lifetime Confirmed Kills:</span>
        <b style="color:#ff5a3a">${(SV.lt && SV.lt.kills) || 0}</b>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Survivor Security Level:</span>
        <b style="color:#4ade80">Rank ${SV.lvl || 1}</b>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Active Operative Class:</span>
        <b style="color:#38bdf8">${CL[SV.cls || 0] ? CL[SV.cls || 0].n : 'Infantry'}</b>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Relics In Possession:</span>
        <b style="color:#c084fc">${(SV.ar || []).length} / ${AR.length}</b>
      </div>
    `;
  }
  modal.classList.add('on');
}

const RI = {};
function relicIcon(i) {
  if (RI[i]) return RI[i];
  const cv = document.createElement('canvas');
  cv.width = 56;
  cv.height = 56;
  const cx = cv.getContext('2d'), col = (AR[i] && AR[i][4]) || '#8fae4a';
  cx.fillStyle = '#141712';
  cx.beginPath();
  if (cx.roundRect) cx.roundRect(3, 3, 50, 50, 8); else cx.rect(3, 3, 50, 50);
  cx.fill();
  cx.strokeStyle = col;
  cx.lineWidth = 2;
  cx.stroke();
  cx.fillStyle = 'rgba(255,255,255,0.06)';
  cx.fillRect(5, 5, 46, 23);
  cx.save();
  cx.translate(28, 28);
  if (i == 0) {
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.moveTo(-7, -10); cx.quadraticCurveTo(-4, 2, -8, 12); cx.quadraticCurveTo(-11, 3, -7, -10);
    cx.moveTo(7, -10); cx.quadraticCurveTo(4, 2, 8, 12); cx.quadraticCurveTo(11, 3, 7, -10);
    cx.fill();
    cx.fillStyle = '#ff2222';
    cx.beginPath();
    cx.arc(-8, 13, 2, 0, 6.28); cx.arc(8, 13, 2, 0, 6.28);
    cx.fill();
  } else if (i == 1) {
    cx.fillStyle = '#9be7ff';
    cx.beginPath();
    cx.moveTo(-14, 8); cx.lineTo(-14, -6); cx.lineTo(-6, 0); cx.lineTo(0, -12); cx.lineTo(6, 0); cx.lineTo(14, -6); cx.lineTo(14, 8);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#fff';
    cx.lineWidth = 1.5;
    cx.stroke();
    cx.fillStyle = '#ffd84a';
    cx.fillRect(-12, 4, 24, 3);
  } else if (i == 2) {
    cx.strokeStyle = '#ffb347';
    cx.lineWidth = 2.5;
    cx.beginPath();
    cx.moveTo(10, -14); cx.quadraticCurveTo(0, 0, -12, 12);
    cx.stroke();
    cx.fillStyle = '#ff5a3a';
    cx.beginPath();
    cx.moveTo(10, -14); cx.quadraticCurveTo(8, -4, -2, 4); cx.lineTo(-12, 12); cx.quadraticCurveTo(-2, 12, 6, -2);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#ffee55';
    cx.beginPath();
    cx.arc(-2, 0, 2.5, 0, 6.28);
    cx.fill();
  } else if (i == 3) {
    cx.fillStyle = '#9be7ff';
    cx.beginPath();
    cx.moveTo(0, -4); cx.lineTo(8, -12); cx.lineTo(12, -6); cx.lineTo(0, 12); cx.lineTo(-12, -6); cx.lineTo(-8, -12);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#fff';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(0, -12); cx.lineTo(0, 12); cx.moveTo(-12, -2); cx.lineTo(12, -2);
    cx.stroke();
  } else if (i == 4) {
    cx.strokeStyle = '#7a5fa8';
    cx.lineWidth = 2;
    cx.strokeRect(-9, -9, 18, 18);
    cx.fillStyle = '#251838';
    cx.fillRect(-8, -8, 16, 16);
    cx.fillStyle = '#df8aff';
    cx.beginPath();
    cx.ellipse(0, 0, 5, 7, 0, 0, 6.28);
    cx.fill();
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(0, 1, 2.5, 0, 6.28);
    cx.fill();
    cx.strokeStyle = '#c9a6ff';
    cx.strokeRect(-4, -13, 8, 4);
  } else if (i == 5) {
    cx.fillStyle = '#e0b83a';
    cx.beginPath();
    cx.arc(0, 0, 13, 0, 6.28);
    cx.fill();
    cx.strokeStyle = '#8a6d1a';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#fff';
    cx.font = 'bold 13px Arial';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('CR', 0, 1);
  } else if (i == 6) {
    cx.strokeStyle = '#c9a6ff';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(-10, 10); cx.quadraticCurveTo(-2, -2, 10, -10);
    cx.stroke();
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.moveTo(-10, 10); cx.lineTo(-5, 5); cx.lineTo(12, -12); cx.lineTo(7, -4);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#e0b83a';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(-13, 13); cx.lineTo(-7, 7);
    cx.stroke();
  } else if (i == 7) {
    cx.fillStyle = '#ff4500';
    cx.beginPath();
    cx.arc(0, 0, 10, 0, 6.28);
    cx.fill();
    cx.fillStyle = '#ffd84a';
    cx.beginPath();
    cx.arc(0, 0, 5, 0, 6.28);
    cx.fill();
    cx.strokeStyle = '#3a1f14';
    cx.lineWidth = 2.5;
    cx.beginPath();
    cx.arc(0, 0, 13, 0, 2); cx.arc(0, 0, 13, 3, 5);
    cx.stroke();
  } else if (i == 8) {
    cx.fillStyle = '#432661';
    cx.beginPath();
    if (cx.roundRect) cx.roundRect(-12, -10, 24, 20, 3); else cx.rect(-12, -10, 24, 20);
    cx.fill();
    cx.strokeStyle = '#c9a6ff';
    cx.lineWidth = 1.5;
    cx.stroke();
    cx.fillStyle = '#c9a6ff';
    cx.fillRect(-10, -8, 20, 2);
    cx.fillStyle = '#ffd84a';
    cx.beginPath();
    cx.arc(0, 2, 3.5, 0, 6.28);
    cx.fill();
  } else if (i == 9) {
    cx.fillStyle = '#2d4224';
    cx.beginPath();
    cx.moveTo(0, 12); cx.lineTo(12, -2); cx.lineTo(7, -10); cx.lineTo(0, -4); cx.lineTo(-7, -10); cx.lineTo(-12, -2);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#8fae4a';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#8fae4a';
    cx.fillRect(-3, -2, 6, 6);
  } else if (i == 10) {
    cx.strokeStyle = '#00e5ff';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.arc(0, 0, 11, 0, 6.28);
    cx.stroke();
    cx.fillStyle = '#00e5ff';
    cx.beginPath();
    cx.arc(0, 0, 5, 0, 6.28);
    cx.fill();
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(0, 0, 2.5, 0, 6.28);
    cx.fill();
    for (let k = 0; k < 4; k++) {
      const a = k * 1.57;
      cx.fillStyle = '#fff';
      cx.beginPath();
      cx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 2, 0, 6.28);
      cx.fill();
    }
  } else if (i == 11) {
    cx.fillStyle = '#3a2d52';
    cx.beginPath();
    cx.moveTo(0, -12); cx.lineTo(11, -7); cx.lineTo(9, 4); cx.lineTo(0, 13); cx.lineTo(-9, 4); cx.lineTo(-11, -7);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#be8cff';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#be8cff';
    cx.fillRect(-1.5, -6, 3, 12);
    cx.fillRect(-6, -2, 12, 3);
  } else if (i == 12) {
    cx.fillStyle = '#13382c';
    cx.beginPath();
    cx.moveTo(0, -13); cx.lineTo(10, 0); cx.lineTo(0, 13); cx.lineTo(-10, 0);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#6ee7b7';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#6ee7b7';
    cx.beginPath();
    cx.moveTo(0, -7); cx.lineTo(5, 0); cx.lineTo(0, 7); cx.lineTo(-5, 0);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(0, 0, 2, 0, 6.28);
    cx.fill();
  } else if (i == 13) {
    cx.strokeStyle = '#2e4a20';
    cx.lineWidth = 2;
    cx.strokeRect(-4, -12, 8, 4);
    cx.fillStyle = '#1c3014';
    cx.beginPath();
    cx.arc(0, 2, 10, 0, 6.28);
    cx.fill();
    cx.strokeStyle = '#7be04a';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#7be04a';
    cx.beginPath();
    cx.arc(0, 3, 6, 0, 6.28);
    cx.fill();
    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(-2, 1, 1.5, 0, 6.28);
    cx.arc(2, 4, 1.2, 0, 6.28);
    cx.fill();
  } else if (i == 14) {
    cx.strokeStyle = '#ff5a3a';
    cx.lineWidth = 3.5;
    cx.beginPath();
    cx.arc(0, 0, 10, 0, 6.28);
    cx.stroke();
    cx.fillStyle = '#ff2222';
    cx.beginPath();
    cx.moveTo(0, -12); cx.lineTo(4, -6); cx.lineTo(-4, -6);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#ffd84a';
    cx.beginPath();
    cx.arc(0, 0, 3, 0, 6.28);
    cx.fill();
  } else {
    cx.fillStyle = '#3a3212';
    cx.beginPath();
    if (cx.roundRect) cx.roundRect(-9, -11, 18, 22, 4); else cx.rect(-9, -11, 18, 22);
    cx.fill();
    cx.strokeStyle = '#ffd36b';
    cx.lineWidth = 2;
    cx.stroke();
    cx.fillStyle = '#ffd36b';
    cx.fillRect(-3, -14, 6, 3);
    cx.fillStyle = '#ffd36b';
    cx.beginPath();
    cx.moveTo(2, -7); cx.lineTo(-4, 1); cx.lineTo(1, 1); cx.lineTo(-2, 7); cx.lineTo(4, -1); cx.lineTo(-1, -1);
    cx.closePath();
    cx.fill();
  }
  cx.restore();
  return RI[i] = cv.toDataURL();
}

// One line that states what is actually equipped. The count alone ("Equipped
// 0/2") could not be told apart from a dead panel, which is exactly how the tab
// was read before it re-rendered itself.
function relicCountLine() {
  const eq = Array.isArray(SV.eq) ? SV.eq : [];
  const names = eq.map(i => AR[i] && AR[i][0]).filter(Boolean);
  return `Equipped ${eq.length}/2 • ` + (names.length ? names.join(' + ') : 'Bosses drop relics, or buy one here');
}

function relics() {
  const rcnt = document.getElementById('rcnt');
  if (rcnt) rcnt.textContent = relicCountLine();
  const art = document.getElementById('art');
  if (!art) return;

  art.innerHTML = AR.map((a, i) => {
    const o = SV.ar && SV.ar.includes(i), e = SV.eq && SV.eq.includes(i);
    const full = !e && SV.eq && SV.eq.length >= 2;
    return `<div class="card" style="display:flex;align-items:center;gap:10px;border-color:${e ? '#8fae4a' : '#3a4128'}">
      <img src="${relicIcon(i)}" style="width:48px;height:48px;flex-shrink:0;border-radius:6px;border:1px solid ${a[4]}55">
      <div style="flex:1;min-width:0">
        <b style="color:${a[4]};margin-bottom:2px">${a[0]}</b>
        <span style="display:block;opacity:.85;font-size:11.5px;line-height:1.25">${a[1]}</span>
        ${e ? '<span style="display:block;margin-top:3px;font-size:10px;font-weight:800;color:#8fae4a">● ACTIVE THIS RUN</span>' : ''}
      </div>
      <button data-a="${i}" ${(!o && a[2] > SV.cr) ? 'disabled' : ''} style="flex-shrink:0;min-width:80px;padding:6px 10px${full ? ';opacity:.6' : ''}">
        ${o ? (e ? 'EQUIPPED' : 'EQUIP') : `BUY ${a[2]}`}
      </button>
    </div>`;
  }).join('');

  art.onclick = e => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b || b.disabled) return;
    const i = +b.dataset.a;
    let msg = '';
    if (SV.ar.includes(i)) {
      const k = SV.eq.indexOf(i);
      if (k >= 0) { SV.eq.splice(k, 1); snd(300, 0.12, 'triangle', 0.05, 1.6); }
      else if (SV.eq.length < 2) { SV.eq.push(i); snd(620, 0.14, 'sine', 0.06, 1.5); }
      else { msg = 'SLOTS FULL — unequip a relic first'; snd(170, 0.22, 'square', 0.08, 0.7); }
    } else if (AR[i] && AR[i][2] <= SV.cr) {
      if (transactMetaCredits(AR[i][2], 'relic_' + i)) {
        SV.ar.push(i);
        // Two-tone purchase: the tab used to buy in total silence.
        snd(760, 0.14, 'triangle', 0.07, 1.5);
        setTimeout(() => snd(1180, 0.12, 'sine', 0.05, 1.4), 70);
      }
    } else {
      snd(170, 0.22, 'square', 0.08, 0.7);
    }
    sv();
    lobby();
    // Re-render the tab itself: sv()/lobby() only refresh the header, so the
    // card labels and the equipped counter used to keep showing pre-click state
    // and the whole section read as frozen.
    relics();
    if (msg) {
      const rc = document.getElementById('rcnt');
      if (rc) rc.textContent = msg;
      setTimeout(() => { const r2 = document.getElementById('rcnt'); if (r2) r2.textContent = relicCountLine(); }, 1600);
    }
  };
}

// Live operator portrait for the HERO tab. Drawn with the real body/gun
// renderer so the equipped operative skin, suit tint and starting weapon all
// show exactly as they will in the arena.
function drawHeroBand() {
  const cv = document.getElementById('hero-preview');
  const ci = SV.cls || 0;
  const c = CL[ci] || CL[0] || { n: 'Infantry', hp: 100, spd: 175, dm: 1, sk: [], d: '' };
  if (cv) {
    const cx = cv.getContext('2d');
    // Drawn through withCtx so the engine context is always handed back, even
    // if a body or gun sprite throws mid-draw.
    try {
      withCtx(cx, () => {
        const w = cv.width, h = cv.height;
        cx.clearRect(0, 0, w, h);
        const g = cx.createRadialGradient(w * 0.5, h * 0.6, 6, w * 0.5, h * 0.6, w * 0.72);
        g.addColorStop(0, 'rgba(62,80,44,0.95)');
        g.addColorStop(0.55, 'rgba(24,31,18,0.98)');
        g.addColorStop(1, 'rgba(8,11,7,1)');
        cx.fillStyle = g;
        cx.fillRect(0, 0, w, h);
        // Floor grid, in the same pixel-art spirit as the arena
        cx.strokeStyle = 'rgba(143,174,74,0.16)';
        cx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
          cx.beginPath();
          cx.moveTo(w * 0.5 + i * 26, h * 0.72);
          cx.lineTo(w * 0.5 + i * 74, h);
          cx.stroke();
        }
        for (let j = 1; j <= 3; j++) {
          cx.beginPath();
          const yy = h * 0.72 + j * j * 6;
          cx.moveTo(0, yy); cx.lineTo(w, yy); cx.stroke();
        }
        // Character, scaled up from the sprite's own 1.7x icon framing
        cx.save();
        cx.translate(w * 0.34, h * 0.56);
        cx.scale(2.35, 2.35);
        if (typeof bodyBack === 'function') bodyBack(ci);
        if (typeof gun === 'function') gun(SV.start || 0, 0);
        if (typeof bodyFront === 'function') bodyFront(ci);
        cx.restore();
      });
    } catch (e) {
      console.warn('[DeadZone] hero preview failed', e);
    }
  }
  const nameEl = document.getElementById('hero-name');
  if (nameEl) nameEl.textContent = (c.n || 'Infantry').toUpperCase();
  const st = document.getElementById('hero-stats');
  if (st) {
    const dmgPct = Math.round((c.dm - 1) * 100);
    st.innerHTML = `
      <span class="hs-chip" style="border-color:#ff5a3a55;color:#ff8a6a">HP <b>${c.hp}</b></span>
      <span class="hs-chip" style="border-color:#5ac8e855;color:#7fd6f0">SPD <b>${c.spd}</b></span>
      <span class="hs-chip" style="border-color:#ffd36b55;color:#ffd36b">DMG <b>${dmgPct >= 0 ? '+' : ''}${dmgPct}%</b></span>
      <span class="hs-chip" style="border-color:#c084fc55;color:#c084fc">CRIT <b>${Math.round((c.crit || 0) * 100)}%</b></span>`;
  }
  const skl = document.getElementById('hero-skills');
  if (skl) {
    skl.innerHTML = (c.sk || []).map(k => `<span class="hs-chip" style="gap:4px"><img src="${getSkillIcon(k, '#8fae4a')}" style="width:14px;height:14px" alt="">${SKN[k] || k.toUpperCase()}</span>`).join('');
  }
  const skinEl = document.getElementById('hero-skin');
  if (skinEl) {
    const key = SV.eqOpSkin;
    const sk = (key && typeof SKINS !== 'undefined') ? SKINS[key] : null;
    const tint = (typeof PC !== 'undefined' && PC) ? PC : '#d8c9a0';
    skinEl.innerHTML = sk
      ? `<span class="hs-skin-lbl">OPERATIVE SKIN</span> <b style="color:${sk.col || '#ffd36b'}">${sk.name}</b>`
      : `<span class="hs-skin-lbl">OPERATIVE SKIN</span> <b style="color:#888">Default fatigues</b> &bull; <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${tint};vertical-align:middle"></span> suit tint`;
  }
}

function lobby2() {
  relics();

  // Class Selection in #pc. The band renders the deployed operator live; the
  // cards below are compact so the whole tab still fits a phone screen.
  const clsCont = document.getElementById('cls');
  if (clsCont) {
    drawHeroBand();
    clsCont.innerHTML = CL.map((c, i) => {
      const o = SV.ucl && SV.ucl[i], cost = [0, 800, 1500, 2200, 2600][i];
      const isSelected = SV.cls === i;
      const dmgPct = Math.round((c.dm - 1) * 100);
      const skillsHtml = (c.sk || []).map(k => `<span class="hc-sk"><img src="${getSkillIcon(k, '#8fae4a')}" alt="">${SKN[k] || k.toUpperCase()}</span>`).join('');
      const btnLabel = isSelected ? 'CURRENT OPERATOR' : (o ? 'DEPLOY OPERATOR' : 'RECRUIT \u2022 ' + cost + ' CR');
      return `<div class="card hero-card${isSelected ? ' on' : ''}">
        <div class="hc-head">
          <b>${c.n}</b>
          <span class="hc-badge${isSelected ? ' on' : ''}">${isSelected ? 'DEPLOYED' : (o ? 'READY' : 'LOCKED')}</span>
        </div>
        <div class="hc-mid">
          <img class="hc-art" src="${clsIcon(i, SV.start)}" alt="">
          <div class="hc-body">
            <div class="hc-desc">${c.d}</div>
            <div class="hc-stats">
              <span><img src="${getStatIcon('hp', '#ff5a3a')}" alt="">HP ${c.hp}</span>
              <span><img src="${getStatIcon('spd', '#5ac8e8')}" alt="">SPD ${c.spd}</span>
              <span><img src="${getStatIcon('dmg', '#ffd36b')}" alt="">DMG ${dmgPct >= 0 ? '+' : ''}${dmgPct}%</span>
            </div>
            <div class="hc-skills">${skillsHtml}</div>
          </div>
        </div>
        <button data-c="${i}" ${(!o && cost > SV.cr) ? 'disabled' : ''}>${btnLabel}</button>
      </div>`;
    }).join('');

    clsCont.onclick = e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const i = +b.dataset.c;
      if (SV.ucl[i]) SV.cls = i;
      else {
        const c = [0, 800, 1500, 2200, 2600][i];
        if (!transactMetaCredits(c, 'class_' + i)) return;
        SV.ucl[i] = 1;
        SV.cls = i;
      }
      snd(400, 0.12, 'square', 0.04, 1.3);
      sv();
      drawHeroBand();
      lobby2();
    };
  }

  // Skill Points Tree in #pk
  const sptCont = document.getElementById('spt');
  if (sptCont) {
    sptCont.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(20,24,18,.9);border:1px solid rgba(224,184,58,.3);border-radius:6px;padding:6px 10px;margin-bottom:8px">
      <span style="font-size:12px;font-weight:800;color:#ffd36b;display:inline-flex;align-items:center;gap:6px">
        <img src="${getSkillIcon('xpb', '#ffd36b')}" style="width:16px;height:16px"> SKILL POINTS: ${SV.sp || 0}
      </span>
      <span style="font-size:9.5px;opacity:.7;color:#ece7d5">+1 Point per Level</span>
    </div>`;
  }
  const sklCont = document.getElementById('skl');
  if (sklCont) {
    sklCont.innerHTML = SKL.map(s => {
      const n = SV[s[0]] || 0;
      return `<div class="card" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(20,24,18,.96);border:1px solid rgba(255,255,255,.08);border-radius:8px">
        <div style="width:38px;height:38px;border-radius:8px;background:rgba(0,0,0,.45);border:1px solid rgba(143,174,74,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <img src="${getSkillIcon(s[0], '#8fae4a')}" style="width:26px;height:26px">
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <b style="font-size:13px;color:#f0ece1">${s[1]}</b>
            <span style="font-size:11px;letter-spacing:1px;color:#8fae4a">${'\u25cf'.repeat(n)}<span style="opacity:.3;color:#888">${'\u25cb'.repeat(5 - n)}</span></span>
          </div>
          <div style="font-size:10.5px;opacity:.8;color:#ccc;line-height:1.25">${s[2]}</div>
        </div>
        <button data-k="${s[0]}" ${n >= 5 || !(SV.sp > 0) ? 'disabled' : ''} style="min-width:36px;height:36px;padding:0;font-size:17px;font-weight:900;border-color:${n >= 5 ? '#333' : (SV.sp > 0 ? '#8fae4a' : '#444')};color:${n >= 5 ? '#666' : (SV.sp > 0 ? '#8fae4a' : '#888')};display:flex;align-items:center;justify-content:center">+</button>
      </div>`;
    }).join('');

    sklCont.onclick = e => {
      const b = e.target.closest('button');
      if (!b || !(SV.sp > 0)) return;
      const k = b.dataset.k;
      if ((SV[k] || 0) >= 5) return;
      SV[k] = (SV[k] || 0) + 1;
      SV.sp--;
      sv();
      lobby();
    };
  }

  // Stat Upgrades in #upg or #stt
  const sttCont = document.getElementById('upg') || document.getElementById('stt');
  if (sttCont) {
    const statsList = [
      ['hu', 'Max Health', '+10 HP per level', 150, 'hp', '#ff5a3a'],
      ['du', 'Damage Output', '+5% base damage', 200, 'dmg', '#ffd36b'],
      ['gu', 'Grenade Reserve', '+2 grenades at wave start', 180, 'ammo', '#ff9a3a'],
              ['sc', 'Starting Cash', '+$50 starting cash per wave', 120, 'spd', '#5ac8e8']
    ];
    sttCont.innerHTML = statsList.map(st => {
      const curLvl = SV[st[0]] || 0;
      const cost = Math.round(st[3] * Math.pow(1.4, curLvl));
      return `<div class="card" style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(20,24,18,0.95);border-radius:8px">
        <div style="width:38px;height:38px;border-radius:8px;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;border:1px solid ${st[5]}44">
          <img src="${getStatIcon(st[4], st[5])}" style="width:24px;height:24px">
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between">
            <b style="font-size:13px;color:#f0ece1">${st[1]}</b>
            <span style="font-size:11px;font-weight:700;color:${st[5]}">LV ${curLvl}</span>
          </div>
          <div style="font-size:10.5px;opacity:0.8;color:#ccc">${st[2]}</div>
        </div>
        <button data-st="${st[0]}" data-cost="${cost}" ${cost > SV.cr ? 'disabled' : ''} style="min-width:75px;padding:6px 10px;font-size:11px;font-weight:700">
          BUY $${cost}
        </button>
      </div>`;
    }).join('');

    sttCont.onclick = e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const stKey = b.dataset.st;
      const cost = +b.dataset.cost;
      if (transactMetaCredits(cost, 'stat_' + stKey)) {
        SV[stKey] = (SV[stKey] || 0) + 1;
        sv();
        lobby();
      }
    };
  }
}

/* ---- Shop ---------------------------------------------------------------
   The armory tab was retired when guns became rank rewards. It is back as a
   shop: the ladder is ordered by tier and then by price, so progression reads
   top-to-bottom, and rank unlocks still apply. A gun can be earned by playing
   or bought early with credits, which is the only way to field a tier before
   its rank arrives. */
const SHOP_TIER_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };
const SHOP_TIER_COLS = { COMMON: '#94a3b8', UNCOMMON: '#4ade80', RARE: '#38bdf8', EPIC: '#c084fc', LEGENDARY: '#f59e0b' };
let activeShopFilter = 'all';

function shopEntries() {
  return WEAP.map((w, i) => ({ w, i })).sort((a, b) => {
    const ta = SHOP_TIER_ORDER[a.w.tier] != null ? SHOP_TIER_ORDER[a.w.tier] : 9;
    const tb = SHOP_TIER_ORDER[b.w.tier] != null ? SHOP_TIER_ORDER[b.w.tier] : 9;
    if (ta !== tb) return ta - tb;
    if ((a.w.c || 0) !== (b.w.c || 0)) return (a.w.c || 0) - (b.w.c || 0);
    return a.i - b.i;
  });
}

function filterShop(f) {
  activeShopFilter = f;
  document.querySelectorAll('.sh-tab').forEach(b => {
    b.classList.toggle('on', b.textContent.trim().toUpperCase() === f.toUpperCase());
  });
  renderShop();
}

function renderShop() {
  const el = document.getElementById('shop-list'); if (!el) return;
  if (typeof SV === 'undefined' || !SV) return;
  if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();

  const crEl = document.getElementById('shop-cr');
  if (crEl) crEl.textContent = (SV.cr || 0).toLocaleString();

  el.onclick = e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.buy != null) buyWeapon(parseInt(b.dataset.buy, 10));
    else if (b.dataset.eq != null) equipWeapon(parseInt(b.dataset.eq, 10));
  };

  const rows = shopEntries().filter(e => activeShopFilter === 'all' || e.w.tier === activeShopFilter);
  if (!rows.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;opacity:.6">No weapons in this tier.</div>';
    return;
  }

  el.innerHTML = rows.map(({ w, i }) => {
    const st = weaponStats(i);
    const owned = Boolean(SV.own && SV.own[i]);
    const equipped = owned && SV.start === i;
    const tCol = SHOP_TIER_COLS[w.tier] || '#94a3b8';
    const rankReq = weaponRankReq(i);
    const rankOk = weaponRankMet(i);
    const cost = Math.max(0, w.c || 0);
    const affordable = (SV.cr || 0) >= cost;
    // Three honest states, not two: you may not own it yet and cannot buy it
    // (rank too low), you may buy it, or it is yours.
    const status = equipped ? 'EQUIPPED' : owned ? 'OWNED' : rankOk ? 'FOR SALE' : 'RANK ' + rankReq;
    const action = owned
      ? '<button data-eq="' + i + '"' + (equipped ? ' disabled' : '') + ' style="min-width:96px;padding:7px 10px;font-size:11px;font-weight:800;border-color:' + (equipped ? '#333' : '#8fae4a') + ';color:' + (equipped ? '#666' : '#8fae4a') + '">' + (equipped ? 'EQUIPPED' : 'EQUIP') + '</button>'
      : rankOk
        ? '<button data-buy="' + i + '"' + (affordable ? '' : ' disabled') + ' style="min-width:96px;padding:7px 10px;font-size:11px;font-weight:800">BUY ' + cost.toLocaleString() + ' CR</button>'
        : '<button disabled style="min-width:96px;padding:7px 10px;font-size:10px;font-weight:800;color:#8892a0;border-color:#3a4048">RANK ' + rankReq + '</button>';
    const stats = [['DMG', Math.round(st.shot)], ['DPS', Math.round(st.dps)], ['MAG', st.mag], ['RELOAD', st.reload.toFixed(1) + 's']]
      .map(r => '<div style="text-align:center"><div style="font-size:8.5px;letter-spacing:.5px;opacity:.6">' + r[0] + '</div><div style="font-size:12px;font-weight:800;color:#e8e2d6">' + r[1] + '</div></div>').join('');
    const origin = rankReq > 0 ? 'RANK ' + rankReq + ' REQUIRED &bull; ' : 'STARTER WEAPON &bull; ';
    const footer = owned ? (equipped ? 'YOUR DEPLOYED WEAPON' : 'IN YOUR ARSENAL')
      : rankOk ? cost.toLocaleString() + ' CREDITS'
        : 'UNLOCKS AT ACCOUNT RANK ' + rankReq;
    const footerCol = owned ? '#8fae4a' : (rankOk ? (affordable ? '#e0b83a' : '#c98a6a') : '#8892a0');
    // The procedural weapon preview. The armory used to draw one per card; the
    // shop that replaced it rendered text only, so the gun the player is about to
    // buy was invisible. gunIcon() is the same renderer the in-run weapon crate
    // uses, and it caches per weapon+skin, so this costs one canvas per gun.
    const art = (typeof gunIcon === 'function') ? gunIcon(i) : '';
    return '<div class="card" style="display:flex;flex-direction:column;gap:8px;background:linear-gradient(135deg,' + tCol + '0f,rgba(20,24,18,.96));border-left:5px solid ' + tCol + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'
      +   '<div style="flex-shrink:0;width:104px;height:44px;border-radius:6px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.08);overflow:hidden;display:flex;align-items:center;justify-content:center">'
      +     '<img src="' + art + '" alt="" style="width:100%;height:100%;object-fit:contain;display:block">'
      +   '</div>'
      +   '<div style="min-width:0;flex:1">'
      +     '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
      +       '<span style="font-size:8.5px;font-weight:900;padding:1px 5px;border-radius:3px;background:' + tCol + '22;color:' + tCol + ';border:1px solid ' + tCol + '66">' + (w.tier || 'COMMON') + '</span>'
      +       '<b style="font-size:14px;color:' + (equipped ? '#8fae4a' : '#f0ece1') + '">' + w.n + '</b>'
      +     '</div>'
      +     '<div style="font-size:10px;opacity:.72;color:#ccc;margin-top:3px">' + origin + ((w.p || 1) > 1 ? (w.p + ' PELLETS') : 'SINGLE SHOT') + '</div>'
      +   '</div>'
      +   '<span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.07);color:' + (owned ? '#8fae4a' : '#888') + ';white-space:nowrap">' + status + '</span>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:rgba(0,0,0,.32);border-radius:6px;padding:7px 8px">' + stats + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'
      +   '<div style="font-size:11px;font-weight:700;color:' + footerCol + '">' + footer + '</div>'
      +   action
      + '</div>'
      + '</div>';
  }).join('');
}

function buyWeapon(i) {
  const w = WEAP[i]; if (!w) return;
  if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();
  // Ownership, then the rank precondition, then the price. Every path in (shop
  // click, future shortcut) comes through here, so a locked gun cannot be forced
  // into the arsenal by calling buyWeapon directly either.
  if (SV.own && SV.own[i]) return;
  if (!weaponRankMet(i)) {
    if (typeof announce === 'function') announce('RANK LOCKED', '#8892a0', w.n + ' requires account rank ' + weaponRankReq(i), 3);
    return;
  }
  const cost = Math.max(0, w.c || 0);
  if ((SV.cr || 0) < cost) {
    if (typeof announce === 'function') announce('NOT ENOUGH CREDITS', '#e07a5a', 'Need ' + cost.toLocaleString() + ' CR', 3);
    return;
  }
  // The debit is the authority: it re-checks the balance and returns false if it
  // could not be applied, so a failed transaction can never leave ownership set.
  if (!transactMetaCredits(cost, 'weapon_' + i)) return;
  if (!Array.isArray(SV.own)) SV.own = [];
  while (SV.own.length < WEAP.length) SV.own.push(0);
  SV.own[i] = 1;
  sv();
  if (typeof snd === 'function') snd(660, 0.12, 'triangle', 0.05, 1.4);
  if (typeof announce === 'function') announce('UNLOCKED', '#e0b83a', w.n + ' added to your arsenal', 3);
  renderShop();
}

function equipWeapon(i) {
  if (!WEAP[i]) return;
  if (!(SV.own && SV.own[i])) return;
  SV.start = i;
  sv();
  if (typeof snd === 'function') snd(520, 0.1, 'square', 0.04, 1.2);
  renderShop();
}

function renderSettingsUI() {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('qualbtn', `GRAPHICS QUALITY: ${QUALITY_SETTINGS.profile.toUpperCase()}`);
  set('gorebtn', `BLOOD & GORE: ${QUALITY_SETTINGS.goreLevel.toUpperCase()}`);
  set('sndbtn', `AUDIO & SFX: ${SV.mute ? 'MUTED' : 'ENABLED'}`);
  set('apbtn', `AUTO-PICK POWERS: ${SV.ap ? 'ON' : 'OFF'}`);

  // Camera shake is a 3-level choice now, not a boolean. When reduced motion is
  // forcing it off, say so - an "OFF" that will not toggle is otherwise a mystery.
  const lv = Math.max(0, Math.min(2, Number(SV.shakeLvl != null ? SV.shakeLvl : 2) || 0));
  const rmForce = isReducedMotion() && lv > 0;
  set('shakebtn', `CAMERA SHAKE: ${['OFF', 'REDUCED', 'NORMAL'][lv]}${rmForce ? ' (REDUCED MOTION)' : ''}`);

  set('fxbtn', `VISUAL EFFECTS: ${SV.fx === 'reduced' ? 'REDUCED' : 'FULL'}`);
  set('rmbtn', `REDUCED MOTION: ${SV.rm == null ? 'AUTO' : (SV.rm ? 'ON' : 'OFF')}`);

  const c = ctlPref();
  set('ctlsizebtn', `CONTROL SIZE: ${Math.round(c.size * 100)}%`);
  set('ctlopbtn', `CONTROL OPACITY: ${Math.round(c.opacity * 100)}%`);
  set('ctlbtn', `JOYSTICK: ${c.floating ? 'FLOATING' : 'FIXED'}`);
}

function toggleQuality() {
  const modes = ['high', 'med', 'low'];
  const next = modes[(modes.indexOf(QUALITY_SETTINGS.profile) + 1) % modes.length];
  SV.quality = next;
  applyVisualSettings();
  sv();
  renderSettingsUI();
}

function toggleShake() {
  const cur = Math.max(0, Math.min(2, Number(SV.shakeLvl != null ? SV.shakeLvl : 2) || 0));
  const next = (cur + 1) % 3;
  SV.shakeLvl = next;
  SV.shake = next > 0 ? 1 : 0;   // legacy mirror
  applyVisualSettings();
  sv();
  renderSettingsUI();
}

function toggleGore() {
  const modes = ['full', 'reduced', 'minimal'];
  const next = modes[(modes.indexOf(QUALITY_SETTINGS.goreLevel) + 1) % modes.length];
  SV.goreLvl = next;
  SV.gore = next === 'minimal' ? 0 : 1;
  applyVisualSettings();
  sv();
  renderSettingsUI();
}

function cycleCtlSize() {
  const steps = [0.85, 1, 1.15, 1.3];
  const cur = ctlPref().size;
  const i = steps.findIndex(v => Math.abs(v - cur) < 0.01);
  SV.ctlSize = steps[(i + 1) % steps.length];
  sv();
  renderSettingsUI();
}

function cycleCtlOpacity() {
  const steps = [1, 0.8, 0.6, 0.45];
  const cur = ctlPref().opacity;
  const i = steps.findIndex(v => Math.abs(v - cur) < 0.02);
  SV.ctlOpacity = steps[(i + 1) % steps.length];
  sv();
  renderSettingsUI();
}

function cycleCtlMode() {
  SV.ctlMode = ctlPref().floating ? 'fixed' : 'floating';
  sv();
  renderSettingsUI();
}

function cycleFx() {
  SV.fx = SV.fx === 'reduced' ? 'full' : 'reduced';
  sv();
  renderSettingsUI();
}

// AUTO follows the OS preference, ON and OFF are explicit overrides.
function cycleReducedMotion() {
  SV.rm = (SV.rm == null) ? true : (SV.rm ? false : null);
  sv();
  renderSettingsUI();
}

function autoSave() {
  if (run || (S && S.wave > 0)) {
    commitXP();
    if (S.wave > 0) SV.best = Math.max(SV.best, S.wave);
    sv();
  }
}

// Rotating one-liners for both loading screens. Cosmetic — they exist so the
// bars have something to say while real work runs behind them.
const LOAD_TIPS = [
  'TIP: dash THROUGH a horde, not around it.',
  'TIP: boons reset every deploy, perks last the whole run.',
  'TIP: each sector has its own enemy roster - read the map card.',
  'TIP: reload behind cover. Reloading in the open is how runs end.',
  'TIP: bosses telegraph before they charge. Watch the floor.',
  'TIP: the even-wave supply beacon never drops SHOCKWAVE.'
];

// Boot loader. The previous version jumped 25% -> 65% -> 100% on fixed timers
// with no work behind any of it, so it flickered past on a fast device and told
// the player nothing. Now each step is real first-run work and the bar advances
// as it lands, with a floor on how long the screen stays up.
function initGameAssets() {
  const ls = document.getElementById('load-screen');
  if (!ls) return;
  const lp = document.getElementById('load-progress');
  const lst = document.getElementById('load-status');
  const ltip = document.getElementById('load-tip');

  const STEPS = [
    { label: 'BOOTING TACTICAL KERNEL...' },
    { label: 'DECRYPTING SURVIVOR RECORD...' },
    { label: 'CACHING STAT GLYPHS...', run: () => {
      ['hp', 'dmg', 'rof', 'crit', 'spd', 'ar', 'kills', 'cr', 'lvl'].forEach(k => {
        if (typeof getStatIcon === 'function') getStatIcon(k);
      });
    } },
    { label: 'CACHING SKILL & PERK GLYPHS...', run: () => {
      ['dash', 'turret', 'repair', 'cloak', 'ward', 'nova', 'rage', 'bolt', 'frost', 'meteor', 'gren'].forEach(k => {
        if (typeof getSkillIcon === 'function') getSkillIcon(k);
      });
      if (typeof getPerkIcon === 'function' && typeof PKS !== 'undefined') {
        PKS.forEach(p => getPerkIcon(p[0], p[4]));
      }
    } },
    { label: 'RENDERING SECTOR PREVIEW...', run: () => {
      if (typeof drawZonePreview === 'function') {
        drawZonePreview(typeof curPreviewZone !== 'undefined' ? curPreviewZone : 0);
      }
    } }
  ];

  let i = 0;
  const t0 = performance.now();
  const MIN_VISIBLE = 900;
  const advance = () => {
    if (i >= STEPS.length) {
      if (lp) lp.style.width = '100%';
      if (lst) lst.textContent = 'SYSTEMS OPERATIONAL \u2022 READY FOR DEPLOYMENT';
      if (ltip) ltip.textContent = '';
      const wait = Math.max(0, MIN_VISIBLE - (performance.now() - t0));
      setTimeout(() => {
        ls.classList.add('gone');
        setTimeout(() => { try { ls.remove(); } catch (e) {} }, 420);
      }, wait + 200);
      return;
    }
    const step = STEPS[i];
    if (lst) lst.textContent = step.label;
    if (ltip) ltip.textContent = LOAD_TIPS[i % LOAD_TIPS.length];
    if (lp) lp.style.width = Math.round(((i + 1) / (STEPS.length + 1)) * 100) + '%';
    // Yield a frame so the label paints before the synchronous work runs.
    requestAnimationFrame(() => {
      try { if (step.run) step.run(); } catch (e) {}
      i++;
      setTimeout(advance, 90);
    });
  };
  advance();
}

// Run-start transition. begin() used to hide the lobby and call startWave() on
// the same tick, so the first frame of a wave landed during a layout/paint
// hitch. This names the sector, holds the world still, and runs the init work
// while the screen is up. Tapping skips; a 3s guard means a stall can never
// strand the player on the transition.
const DEPLOY_STATUS = [
  'ESTABLISHING DROP CORRIDOR...',
  'SYNCING SQUAD TELEMETRY...',
  'ARMING LOADOUT...',
  'HOSTILES INBOUND'
];
let deployScreenActive = 0;
function showDeployScreen(title, sub, kicker, onReady) {
  const el = document.getElementById('deploy-screen');
  if (!el) { onReady(); return; }
  if (deployScreenActive) return;
  deployScreenActive = 1;

  const tEl = document.getElementById('dp-title');
  const sEl = document.getElementById('dp-sub');
  const kEl = document.getElementById('dp-kicker');
  const bEl = document.getElementById('dp-bar');
  const stEl = document.getElementById('dp-status');
  const tipEl = document.getElementById('dp-tip');
  if (tEl) tEl.textContent = title || 'SECTOR';
  if (sEl) sEl.textContent = sub || '';
  if (kEl) kEl.textContent = kicker || 'DEPLOYING';
  if (tipEl) tipEl.textContent = LOAD_TIPS[(Math.random() * LOAD_TIPS.length) | 0];
  if (bEl) bEl.style.width = '0%';
  el.classList.remove('gone');
  el.classList.add('on');

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(guard);
    try { onReady(); } catch (e) { if (typeof console !== 'undefined') console.error(e); }
    el.classList.add('gone');
    setTimeout(() => { el.classList.remove('on'); deployScreenActive = 0; }, 420);
  };
  el.onclick = finish;
  const guard = setTimeout(finish, 3000);

  const t0 = performance.now();
  const DURATION = 820;
  const tick = () => {
    if (done) return;
    const k = Math.min(1, (performance.now() - t0) / DURATION);
    if (bEl) bEl.style.width = Math.round(k * 100) + '%';
    if (stEl) stEl.textContent = DEPLOY_STATUS[Math.min(DEPLOY_STATUS.length - 1, Math.floor(k * DEPLOY_STATUS.length))];
    if (k >= 1) { finish(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
