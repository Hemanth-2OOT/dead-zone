// DEAD ZONE v2.2 - LOBBY, PREVIEWS, PROGRESSION & UI CONTROLLER
// Senior 2D Artist / Technical UI Engineering System

let curPreviewZone = 0;

function drawZonePreview(mIndex) {
  const cv = document.getElementById('zone-preview');
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

  // Crossfade transition animation
  if (curPreviewZone !== mIndex) {
    cv.style.transition = 'opacity 0.18s ease-out';
    cv.style.opacity = '0.4';
    setTimeout(() => { if (cv) cv.style.opacity = '1'; }, 40);
  }
  curPreviewZone = mIndex;

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
  const reqLvl = (typeof MREQ !== 'undefined' && MREQ[mIndex] != null) ? MREQ[mIndex] : (mIndex * 3);
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
  if (mapd) mapd.textContent = mapDef.desc || mapDef.d || '';

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
    const bnty = mapDef.bountyMult || (MP[mIndex] && MP[mIndex].cm ? MP[mIndex].cm : 1.0);
    bntyEl.textContent = `${bnty.toFixed(2)}x`;
  }
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
    b.scrollIntoView && b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };
}

function tab(i) {
  document.querySelectorAll('#nav button').forEach((b, k) => {
    if (k === i) b.classList.add('on'); else b.classList.remove('on');
  });
  document.querySelectorAll('.pp').forEach(p => p.classList.remove('on'));

  const pids = ['p0', 'pe', 'p1', 'psk', 'pc', 'ps', 'p2', 'pa', 'p3'];
  const target = document.getElementById(pids[i] || 'p0');
  if (target) {
    target.classList.add('on');
    target.style.animation = 'none'; void target.offsetWidth; target.style.animation = '';
    setTimeout(() => target.querySelectorAll('.grid').forEach(staggerIn), 0);
  }

  if (i !== 3 && typeof TURNTABLE_RAF !== 'undefined' && TURNTABLE_RAF) {
    cancelAnimationFrame(TURNTABLE_RAF);
    TURNTABLE_RAF = null;
  }

  if (i === 0) { mapsUI(); drawZonePreview(getCurMap()); }
  else if (i === 1) renderEventsUI();
  else if (i === 2) renderGunsUI();
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
    bestBadge.onclick = () => openTacticalRecords();
  }

  drawZonePreview(getCurMap());
  mapsUI();

  initDailyMissions();
  renderMissionsUI();
  renderLoginTrackUI();

  renderGunsUI();
}

function openTacticalRecords() {
  const modal = document.getElementById('run-details-modal');
  if (!modal) return;
  const body = document.getElementById('run-details-body');
  if (body) {
    body.innerHTML = `
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Highest Wave Cleared:</span>
        <b style="color:#ffd36b">Wave ${SV.best || 0}</b>
      </div>
      <div style="background:rgba(0,0,0,0.4);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between">
        <span style="opacity:0.8">Lifetime Confirmed Kills:</span>
        <b style="color:#ff5a3a">${SV.kills || 0}</b>
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

function renderGunsUI() {
  const arm = document.getElementById('arm');
  if (!arm) return;

  arm.innerHTML = WEAP.map((w, i) => {
    const o = SV.own && SV.own[i], isCur = SV.start === i;
    const isHeavy = [4, 9, 12, 14, 17].includes(i);
    const tierCol = TIER_COLORS[w.tier || 1] || '#8fae4a';

    return `<div class="card" style="display:flex;flex-direction:column;gap:8px;padding:10px;border-left:3.5px solid ${tierCol};background:rgba(20,24,18,0.95);border-radius:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <canvas id="gun-prev-${i}" width="140" height="48" style="width:105px;height:42px;background:rgba(0,0,0,0.35);border-radius:6px;border:1px solid rgba(255,255,255,0.08);flex-shrink:0"></canvas>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
            <b style="font-size:13px;color:#f0ece1">${w.n}</b>
            ${isHeavy ? '<span style="font-size:8px;font-weight:800;color:#ff5a3a;background:rgba(255,90,58,0.15);padding:1px 4px;border-radius:3px">HEAVY</span>' : ''}
          </div>
          <div style="font-size:10px;opacity:0.85;margin-top:3px;display:flex;flex-wrap:wrap;gap:6px">
            <span>DMG: <b style="color:#ffd36b">${w.d}</b></span>
            <span>ROF: <b style="color:#ffd36b">${Math.round(1 / w.r * 10) / 10}/s</b></span>
            <span>MAG: <b style="color:#ffd36b">${w.mag || 12}</b></span>
          </div>
        </div>
      </div>
      <div style="display:flex;margin-top:auto;flex-shrink:0">
        <button data-w="${i}" ${(!o && w.c > SV.cr) ? 'disabled' : ''} style="width:100%;min-height:30px;padding:4px 10px;font-size:11px;font-weight:700">
          ${o ? (isCur ? 'EQUIPPED' : 'EQUIP') : `BUY $${w.c}`}
        </button>
      </div>
    </div>`;
  }).join('');

  // Render high-fidelity procedural canvas preview for every gun card
  WEAP.forEach((w, i) => {
    const cv = document.getElementById('gun-prev-' + i);
    if (!cv) return;
    const cx = cv.getContext('2d');
    const oldX = X; X = cx;
    X.save();
    X.translate(16, 22);
    X.scale(1.35, 1.35);
    try {
      if (typeof gun === 'function') gun(i, 0);
    } catch (e) {
      console.warn('[DeadZone] Gun render error for index', i, e);
    }
    X.restore();
    X = oldX;
  });

  arm.onclick = e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const i = +b.dataset.w;
    if (SV.own[i]) {
      SV.start = i;
    } else if (WEAP[i].c <= SV.cr) {
      if (transactMetaCredits(WEAP[i].c, 'weap_' + i)) {
        SV.own[i] = 1;
        SV.start = i;
      }
    }
    sv();
    lobby();
  };
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

function relics() {
  const rcnt = document.getElementById('rcnt');
  if (rcnt) rcnt.textContent = `Equipped ${(SV.eq || []).length}/2 • Bosses drop relics`;
  const art = document.getElementById('art');
  if (!art) return;

  art.innerHTML = AR.map((a, i) => {
    const o = SV.ar && SV.ar.includes(i), e = SV.eq && SV.eq.includes(i);
    return `<div class="card" style="display:flex;align-items:center;gap:10px;border-color:${e ? '#8fae4a' : '#3a4128'}">
      <img src="${relicIcon(i)}" style="width:48px;height:48px;flex-shrink:0;border-radius:6px;border:1px solid ${a[4]}55">
      <div style="flex:1;min-width:0">
        <b style="color:${a[4]};margin-bottom:2px">${a[0]}</b>
        <span style="display:block;opacity:.85;font-size:11.5px;line-height:1.25">${a[1]}</span>
      </div>
      <button data-a="${i}" ${(!o && a[2] > SV.cr) ? 'disabled' : ''} style="flex-shrink:0;min-width:80px;padding:6px 10px">
        ${o ? (e ? 'EQUIPPED' : 'EQUIP') : `BUY ${a[2]}`}
      </button>
    </div>`;
  }).join('');

  art.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = +b.dataset.a;
    if (SV.ar.includes(i)) {
      const k = SV.eq.indexOf(i);
      if (k >= 0) SV.eq.splice(k, 1);
      else if (SV.eq.length < 2) SV.eq.push(i);
    } else if (AR[i] && AR[i][2] <= SV.cr) {
      if (transactMetaCredits(AR[i][2], 'relic_' + i)) SV.ar.push(i);
    }
    sv();
    lobby();
  };
}

function lobby2() {
  relics();

  // Class Selection in #pc
  const clsCont = document.getElementById('cls');
  if (clsCont) {
    clsCont.innerHTML = CL.map((c, i) => {
      const o = SV.ucl && SV.ucl[i], cost = [0, 800, 1500, 2200, 2600][i];
      const isSelected = SV.cls === i;
      const skillsHtml = (c.sk || []).map(k => `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.06);padding:2px 5px;border-radius:4px;font-size:9.5px;color:#ece7d5"><img src="${getSkillIcon(k, '#8fae4a')}" style="width:14px;height:14px">${SKN[k] || k.toUpperCase()}</span>`).join(' ');

      return `<div class="card" style="display:flex;flex-direction:column;gap:8px;border:1.5px solid ${isSelected ? '#8fae4a' : '#303824'};background:rgba(18,22,14,.95);border-radius:8px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-size:14px;letter-spacing:.5px;color:${isSelected ? '#ffd36b' : '#f0ece1'}">${c.n}</b>
          <span style="font-size:9px;font-weight:800;letter-spacing:1px;padding:2px 6px;border-radius:4px;background:${isSelected ? '#8fae4a33' : 'rgba(255,255,255,.08)'};color:${isSelected ? '#8fae4a' : '#888'}">${isSelected ? 'DEPLOYED' : (o ? 'READY' : 'LOCKED')}</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${clsIcon(i, SV.start)}" style="width:68px;height:48px;object-fit:contain;background:rgba(0,0,0,.3);border-radius:6px;border:1px solid rgba(255,255,255,.08);flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;opacity:.88;line-height:1.3;margin-bottom:5px;color:#d5d0c2">${c.d}</div>
            <div style="display:flex;gap:8px;font-size:10px;opacity:.9;font-weight:700">
              <span style="display:inline-flex;align-items:center;gap:3px"><img src="${getStatIcon('hp', '#ff5a3a')}" style="width:12px;height:12px">HP ${c.hp}</span>
              <span style="display:inline-flex;align-items:center;gap:3px"><img src="${getStatIcon('spd', '#5ac8e8')}" style="width:12px;height:12px">SPD ${c.spd}</span>
              <span style="display:inline-flex;align-items:center;gap:3px"><img src="${getStatIcon('dmg', '#ffd36b')}" style="width:12px;height:12px">DMG ${Math.round((c.dm - 1) * 100) >= 0 ? '+' : ''}${Math.round((c.dm - 1) * 100)}%</span>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${skillsHtml}</div>
        <button data-c="${i}" ${(!o && cost > SV.cr) ? 'disabled' : ''} style="width:100%;margin-top:2px;min-height:34px;font-weight:700;letter-spacing:.5px;border-color:${isSelected ? '#8fae4a' : '#3a4128'}">${o ? (isSelected ? 'CURRENT OPERATOR' : 'DEPLOY OPERATOR') : 'RECRUIT • ' + cost + ' CR'}</button>
      </div>`;
    }).join('');

    clsCont.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      const i = +b.dataset.c;
      if (SV.ucl[i]) SV.cls = i;
      else {
        const c = [0, 800, 1500, 2200, 2600][i];
        if (!transactMetaCredits(c, 'class_' + i)) return;
        SV.ucl[i] = 1;
        SV.cls = i;
      }
      sv();
      lobby();
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

function renderSettingsUI() {
  const qBtn = document.getElementById('qualbtn') || document.getElementById('opt-quality-btn');
  if (qBtn) qBtn.textContent = `GRAPHICS QUALITY: ${QUALITY_SETTINGS.profile.toUpperCase()}`;
  const sBtn = document.getElementById('shakebtn') || document.getElementById('opt-shake-btn');
  if (sBtn) sBtn.textContent = `SCREEN SHAKE: ${QUALITY_SETTINGS.screenShake ? 'ON' : 'OFF'}`;
  const gBtn = document.getElementById('gorebtn') || document.getElementById('opt-gore-btn');
  if (gBtn) gBtn.textContent = `BLOOD & GORE: ${QUALITY_SETTINGS.goreLevel.toUpperCase()}`;
  const sndBtn = document.getElementById('sndbtn');
  if (sndBtn) sndBtn.textContent = `AUDIO & SFX: ${SV.mute ? 'MUTED' : 'ENABLED'}`;
}

function toggleQuality() {
  const modes = ['high', 'med', 'low'];
  const next = modes[(modes.indexOf(QUALITY_SETTINGS.profile) + 1) % modes.length];
  setQualityProfile(next);
  renderSettingsUI();
}

function toggleShake() {
  QUALITY_SETTINGS.screenShake = !QUALITY_SETTINGS.screenShake;
  renderSettingsUI();
}

function toggleGore() {
  const modes = ['full', 'reduced', 'minimal'];
  const next = modes[(modes.indexOf(QUALITY_SETTINGS.goreLevel) + 1) % modes.length];
  QUALITY_SETTINGS.goreLevel = next;
  renderSettingsUI();
}

function autoSave() {
  if (run || (S && S.wave > 0)) {
    commitXP();
    if (S.wave > 0) SV.best = Math.max(SV.best, S.wave);
    sv();
  }
}

function initGameAssets() {
  const ls = document.getElementById('load-screen');
  const lp = document.getElementById('load-progress');
  const lst = document.getElementById('load-status');
  if (!ls) return;
  if (lst) lst.textContent = 'CACHING PROCEDURAL OPERATIONAL ASSETS...';
  if (lp) lp.style.width = '65%';
  setTimeout(() => {
    try {
      ['hp', 'dmg', 'rof', 'crit', 'spd', 'ar', 'kills', 'cr', 'lvl'].forEach(k => {
        if (typeof getStatIcon === 'function') getStatIcon(k);
      });
      ['dash', 'turret', 'repair', 'cloak', 'ward', 'nova', 'rage', 'bolt', 'frost', 'meteor', 'gren'].forEach(k => {
        if (typeof getSkillIcon === 'function') getSkillIcon(k);
      });
    } catch (e) {}
    if (lst) lst.textContent = 'SYSTEMS OPERATIONAL • READY FOR DEPLOYMENT';
    if (lp) lp.style.width = '100%';
    setTimeout(() => {
      ls.style.opacity = '0';
      setTimeout(() => { try { ls.remove(); } catch (e) {} }, 350);
    }, 120);
  }, 100);
}
