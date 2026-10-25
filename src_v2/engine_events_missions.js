// DEAD ZONE v2.0 - EVENTS, MISSIONS, LOGIN TRACK & SKINS CONTROLLER

let activeEventFilter = 'all';
function filterEvents(f) {
  activeEventFilter = f;
  document.querySelectorAll('.ev-tab').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase().includes(f)));
  renderEventsUI();
}

function getEventRewardSkinName(skinId) {
  if (!skinId) return 'Mystery Skin';
  if (typeof SKINS !== 'undefined' && SKINS[skinId]) {
    return SKINS[skinId].name || SKINS[skinId].title || 'Mystery Skin';
  }
  console.warn('[DeadZone] Unknown skin reward ID:', skinId);
  return 'Mystery Skin';
}

function renderEventsUI() {
  const el = $('ev-list'); if(!el) return;
  const evKeys = Object.keys(EVENTS);
  const filtered = evKeys.filter(k => {
    const isDone = SV.evDone && SV.evDone[k];
    if (activeEventFilter === 'active') return !isDone;
    if (activeEventFilter === 'done') return isDone;
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;opacity:.6">No operations matching current filter. Check back soon!</div>';
    return;
  }

  el.innerHTML = filtered.map(k => {
    const ev = EVENTS[k], isDone = SV.evDone && SV.evDone[k];
    const diffStars = threatStars(ev.diff);
    const skinName = getEventRewardSkinName(ev.rewardSkin);
    const category = ev.category || 'OPERATION';
    const desc = ev.desc || ev.brief || '';

    return `<div class="card" style="border:1.5px solid ${isDone?'#304820':ev.col+'55'};border-left:5px solid ${ev.col};display:flex;flex-direction:column;gap:8px;background:rgba(20,24,18,.96)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:13.5px;color:${isDone?'#8fae4a':'#f0ece1'}">${ev.title}</b>
        <span style="font-size:9px;font-weight:900;color:${ev.col};background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px">${category}</span>
      </div>
      <div style="font-size:11px;opacity:.85;color:#d0cac0;line-height:1.35">${desc}</div>
      <div style="background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center;margin-top:2px">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="display:inline-flex;align-items:center;gap:4px;color:#ffd36b;font-weight:800;font-size:11px"><img src="${getStatIcon('cr','#ffd36b')}" style="width:14px;height:14px"> REWARD: +${ev.rewardCr} CR</span>
          <span style="display:inline-flex;align-items:center;gap:4px;color:${ev.col};font-weight:700;font-size:10.5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${ev.col}" stroke-width="2.2"><path d="M20.38 3.46L16 2 2 16l1.46 4.38L7.84 22 22 7.84l-1.62-4.38z"/><circle cx="7.5" cy="16.5" r="1.5"/></svg> SKIN: ${skinName}</span>
        </div>
        <span style="font-size:9.5px;font-weight:800;letter-spacing:.5px;padding:3px 7px;border-radius:4px;background:${isDone?'rgba(143,174,74,.2)':'rgba(224,184,58,.2)'};color:${isDone?'#8fae4a':'#e0b83a'};border:1px solid ${isDone?'#8fae4a44':'#e0b83a44'}">${isDone?'CLAIMED':'FIRST CLEAR'}</span>
      </div>
      <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="color:#e0b83a;font-size:11px">${diffStars}</span>
        <button onclick="openEventBriefing('${k}')" style="min-height:34px;padding:0 18px;font-weight:700;border-color:${ev.col}">${isDone?'REPLAY OP':'INSPECT OP'}</button>
      </div>
    </div>`;
  }).join('');
}

function openEventBriefing(k) {
  const ev = EVENTS[k]; if(!ev) return;
  const isDone = SV.evDone && SV.evDone[k];
  const rulesList = ev.rules.map(r => `<li style="margin-bottom:4px">${r}</li>`).join('');
  const diffStars = threatStars(ev.diff);
  
  const skinName = getEventRewardSkinName(ev.rewardSkin);
  const desc = ev.desc || ev.brief || '';
  
  $('ev-title').textContent = ev.title;
  $('ev-title').style.color = ev.col;
  $('ev-desc').textContent = desc;
  $('ev-rules').innerHTML = rulesList;
  $('ev-meta').innerHTML = `Sector: <b>${MP[ev.map].n}</b> &bull; Threat Level: <b style="color:#e0b83a">${diffStars}</b>`;
  $('ev-rew').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
    <span style="display:inline-flex;align-items:center;gap:5px;color:#ffd36b;font-weight:800;font-size:12px"><img src="${getStatIcon('cr','#ffd36b')}" style="width:15px;height:15px"> Bounty: +${ev.rewardCr} Credits</span>
    <span style="display:inline-flex;align-items:center;gap:5px;color:${ev.col};font-weight:800;font-size:11.5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${ev.col}" stroke-width="2.2"><path d="M20.38 3.46L16 2 2 16l1.46 4.38L7.84 22 22 7.84l-1.62-4.38z"/><circle cx="7.5" cy="16.5" r="1.5"/></svg> Exclusive Skin: ${skinName}</span>
  </div>
  <div style="font-size:10px;opacity:.75;color:#ccc">One-time operational reward. Replaying operation awards standard sector XP and cash.</div>`;
  
  const deployBtn = $('ev-deploy-btn');
  deployBtn.textContent = isDone ? 'REPLAY OPERATION' : 'DEPLOY OPERATION';
  deployBtn.onclick = () => {
    $('ev-modal').classList.remove('on');
    beginEvent(k);
  };
  $('ev-modal').classList.add('on');
}

function beginEvent(eventId) {
  const ev = EVENTS[eventId]; if(!ev) return;
  ['start','over','shopov','pause','perk'].forEach(i=>$(i).classList.remove('on'));
  
  // Set Dedicated Event Run Context FIRST so init() uses ev.map via getCurMap()
  S = S || {};
  S.isEvent = true;
  S.evId = eventId;
  S.evDef = ev;
  S.evElites = 0;
  S.evTargetWave = ev.targetWave || 5;
  S.evWon = false;

  init();
  applySV();
  
  // Re-confirm event run context on the newly initialized S
  S.isEvent = true;
  S.evId = eventId;
  S.evDef = ev;
  S.evElites = 0;
  S.evTargetWave = ev.targetWave || 5;
  S.evWon = false;
  
  // Apply heavy weapon restriction if requested
  if (ev.heavyOnly) {
    const heavyIndices = [4, 9, 12, 14, 17]; // Minigun, Rocket, GL-40, Railgun, Arc Shotgun
    const ownedHeavy = heavyIndices.find(i => P.w[i] || SV.own[i]);
    P.w.fill(0);
    if (ownedHeavy != null) {
      P.w[ownedHeavy] = 1;
      P.cur = ownedHeavy;
    } else {
      // Safe, explicit fallback: issue GL-40 heavy ordnance
      P.w[12] = 1;
      P.cur = 12;
    }
  }
  
  startWave();
}

function trackEventKill(z) {
  if (!S || !S.isEvent || !S.evDef) return;
  if (z.el) {
    S.evElites = (S.evElites || 0) + 1;
    if (typeof txt === 'function') txt(z.x, z.y - 28, `ELITE ${S.evElites}/${S.evDef.targetElites||8}`, '#ffd36b');
    if (S.evDef.targetElites && S.evElites >= S.evDef.targetElites) {
      triggerEventVictory();
    }
  }
}

function triggerEventVictory() {
  if (!S || !S.isEvent || S.evWon) return;
  S.evWon = true;
  const ev = S.evDef;
  
  // Idempotent completion check
  SV.evDone = SV.evDone || {};
  const isFirstClear = !SV.evDone[ev.id];
  SV.evDone[ev.id] = true;
  
  // Award reward credits and skins strictly once
  if (isFirstClear) {
    SV.cr = (SV.cr || 0) + ev.rewardCr;
    if (ev.rewardSkin && SKINS[ev.rewardSkin]) {
      SV.skins = SV.skins || {};
      SV.skins[ev.rewardSkin] = 1;
    }
  }
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  
  run = 0;
  saveBest();
  $('sum').innerHTML = `<div style="font-size:16px;color:#8fae4a;font-weight:900;margin-bottom:8px">✓ ${ev.title} COMPLETED!</div>`
    + `<div style="font-size:12px;opacity:.9;line-height:1.6;margin-bottom:8px">Operation Objectives Achieved!<br>`
    + (isFirstClear
        ? `Credits Awarded: <b style="color:#e0b83a">+${ev.rewardCr} CR</b><br>`
          + (ev.rewardSkin ? `<span style="color:#00e5ff;font-weight:700">UNLOCKED SKIN: ${getEventRewardSkinName(ev.rewardSkin)}</span><br>` : '')
        : `<span style="color:#8fae4a;font-weight:700">Operation already cleared. Reward already claimed.</span><br>`)
    + `</div>`;
  $('over').classList.add('on');
}


// =========================================================================
// DAILY MISSIONS & LOGIN REWARD TRACK (Phase 8)
// =========================================================================
// LOGIN_REWARDS is defined in engine_data.js

function initDailyMissions() {
  const today = new Date().toDateString();
  SV.dailyMissions = SV.dailyMissions || {};
  if (SV.dmDate !== today) {
    SV.dmDate = today;
    SV.dailyMissions = {
      m1: { title: 'Eliminate 60 Zombies', target: 60, cur: 0, reward: 150, claimed: false, type: 'kills' },
      m2: { title: 'Survive 3 Waves in any Sector', target: 3, cur: 0, reward: 200, claimed: false, type: 'waves' },
      m3: { title: 'Destroy 2 Elite Enemies', target: 2, cur: 0, reward: 250, claimed: false, type: 'elites' }
    };
    // Check login day tracking
    if (SV.lastLogin !== today) {
      SV.lastLogin = today;
      SV.loginDays = Math.min(10, (SV.loginDays || 0) + 1);
    }
    sv();
  }
}

function trackMissionProgress(type, amt, z) {
  if (!SV || !SV.dailyMissions) return;
  for (const k in SV.dailyMissions) {
    const m = SV.dailyMissions[k];
    if (m.claimed) continue;
    if (m.type === type) {
      if (type === 'elites') {
        if (z && z.el) m.cur = Math.min(m.target, (m.cur || 0) + 1);
      } else {
        m.cur = Math.min(m.target, (m.cur || 0) + amt);
      }
    }
  }
}

function renderMissionsUI() {
  initDailyMissions();
  const ml = $('daily-list'); if (!ml) return;
  const ms = Object.entries(SV.dailyMissions || {});
  ml.innerHTML = ms.map(([k, m]) => {
    const canClaim = m.cur >= m.target && !m.claimed;
    const isDone = Boolean(m.claimed);
    return `<div style="display:flex;justify-content:space-between;align-items:center;background:${isDone?'rgba(143,174,74,.08)':'rgba(255,255,255,.05)'};padding:6px 10px;border-radius:6px;margin-bottom:5px;border:1px solid ${isDone?'rgba(143,174,74,.3)':'rgba(255,255,255,.06)'};opacity:${isDone?.55:1};transition:opacity .2s">
      <div>
        <div style="font-size:11px;font-weight:700;color:${isDone?'#8fae4a':'#f0ece1'};display:flex;align-items:center;gap:4px">
          ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8fae4a" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          ${m.title}
        </div>
        <div style="font-size:9.5px;opacity:.75">Progress: ${m.cur}/${m.target} &bull; Reward: +${m.reward} CR</div>
      </div>
      <button onclick="claimMission('${k}')" ${!canClaim?'disabled':''} style="padding:4px 10px;min-height:28px;font-size:10px;font-weight:800;${isDone?'border-color:#8fae4a;color:#8fae4a;background:transparent':''}">${isDone?'CLAIMED':(canClaim?'CLAIM':'IN PROGRESS')}</button>
    </div>`;
  }).join('');
}

function claimMission(k) {
  const m = SV.dailyMissions && SV.dailyMissions[k];
  if (!m || m.claimed || m.cur < m.target) return;
  m.claimed = true;
  SV.cr = (SV.cr || 0) + m.reward;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  lobby();
}

function renderLoginTrackUI() {
  const el = $('login-track'); if (!el) return;
  const curDay = SV.loginDays || 1;
  SV.loginClaimed = SV.loginClaimed || {};
  
  el.innerHTML = LOGIN_REWARDS.map(r => {
    const isClaimed = SV.loginClaimed[r.day];
    const isAvailable = r.day <= curDay && !isClaimed;
    const label = r.label || (r.amt ? '+' + r.amt + ' CR' : 'REWARD');

    return `<div class="login-card" style="flex:0 0 130px;min-width:130px;scroll-snap-align:start;background:${isClaimed?'rgba(143,174,74,.18)':isAvailable?'rgba(224,184,58,.18)':'rgba(255,255,255,.05)'};border:1.5px solid ${isClaimed?'#8fae4a':isAvailable?'#e0b83a':'rgba(255,255,255,.12)'};border-radius:8px;padding:8px 6px;text-align:center;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="font-size:10px;font-weight:900;letter-spacing:.5px;color:${isAvailable?'#ffd36b':'#aaa'}">DAY ${r.day}</div>
      <div style="font-size:11px;font-weight:800;margin:4px 0;color:${isClaimed?'#8fae4a':isAvailable?'#f0ece1':'#888'}">${label}</div>
      <button onclick="claimLoginDay(${r.day})" ${!isAvailable?'disabled':''} style="font-size:9.5px;padding:4px 6px;min-height:26px;width:100%;font-weight:700">${isClaimed?'CLAIMED':(isAvailable?'CLAIM':'LOCKED')}</button>
    </div>`;
  }).join('');
}

function claimLoginDay(day) {
  const r = LOGIN_REWARDS.find(x => x.day === day);
  if (!r || (SV.loginClaimed && SV.loginClaimed[day]) || day > (SV.loginDays || 1)) return;
  SV.loginClaimed = SV.loginClaimed || {};
  SV.loginClaimed[day] = true;
  const cr = r.amt || r.cr || 0;
  if (cr) SV.cr = (SV.cr || 0) + cr;
  if (r.sp) SV.sp = (SV.sp || 0) + r.sp;
  if (r.skin && SKINS[r.skin]) {
    SV.skins = SV.skins || {};
    SV.skins[r.skin] = 1;
  }
  sv();
  lobby();
  renderLoginTrackUI();
}

function toggleSkin(weapIdx) {
  const owned = Object.keys(SKINS).filter(k => SKINS[k].wi === weapIdx && (SV.skins && SV.skins[k]));
  if (!owned.length) return;
  SV.eqSkin = SV.eqSkin || {};
  const cur = SV.eqSkin[weapIdx];
  if (!cur) {
    SV.eqSkin[weapIdx] = owned[0];
  } else {
    const nextIdx = owned.indexOf(cur) + 1;
    if (nextIdx >= owned.length) delete SV.eqSkin[weapIdx];
    else SV.eqSkin[weapIdx] = owned[nextIdx];
  }
  sv();
  lobby();
}

function switchLobbyRewards(t){
  const isM = (t === 'm');
  const btnM = $('rtab-m'), btnL = $('rtab-l');
  const viewM = $('rview-m'), viewL = $('rview-l');
  if (btnM) btnM.classList.toggle('on', isM);
  if (btnL) btnL.classList.toggle('on', !isM);
  if (viewM) viewM.style.display = isM ? 'block' : 'none';
  if (viewL) viewL.style.display = isM ? 'none' : 'block';
}

let activeSkinFilter = 'all';
function filterSkins(f){
  activeSkinFilter = f;
  document.querySelectorAll('.sk-tab').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase().includes(f)));
  renderSkinsUI();
}

const SKI_CACHE = {};
function skinIcon(skinKey) {
  if (SKI_CACHE[skinKey]) return SKI_CACHE[skinKey];
  const sk = SKINS[skinKey];
  if (!sk) return '';
  const cv = document.createElement('canvas');
  cv.width = 180; cv.height = 54;
  const cx = cv.getContext('2d');
  const prevX = X;
  SV.eqSkin = SV.eqSkin || {};
  const origEq = SV.eqSkin[sk.wi];
  X = cx;
  try {
    X.save();
    X.fillStyle = '#10140c';
    X.fillRect(0, 0, 180, 54);
    X.strokeStyle = 'rgba(255,255,255,0.04)';
    X.lineWidth = 1;
    for (let gx = 0; gx < 180; gx += 15) { X.beginPath(); X.moveTo(gx, 0); X.lineTo(gx, 54); X.stroke(); }
    for (let gy = 0; gy < 54; gy += 15) { X.beginPath(); X.moveTo(0, gy); X.lineTo(180, gy); X.stroke(); }
    const rg = X.createRadialGradient(90, 27, 8, 90, 27, 75);
    rg.addColorStop(0, sk.col + '33');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = rg;
    X.fillRect(0, 0, 180, 54);
    X.translate(26, 27);
    X.scale(1.6, 1.6);
    SV.eqSkin[sk.wi] = skinKey;
    gun(sk.wi, 0);
    X.restore();
  } finally {
    // always hand the shared canvas context back, even if gun() throws
    if (origEq) SV.eqSkin[sk.wi] = origEq; else delete SV.eqSkin[sk.wi];
    X = prevX;
  }
  return SKI_CACHE[skinKey] = cv.toDataURL();
}

let TURNTABLE_SKIN = 'volt_railgun';
let TURNTABLE_ROT = 0;
let TURNTABLE_RAF = null;

function inspectSkin(skinKey) {
  const sk = SKINS[skinKey]; if (!sk) return;
  TURNTABLE_SKIN = skinKey;
  const badge = $('st-badge'), title = $('st-title'), sub = $('st-sub'), desc = $('st-desc');
  const tier = sk.tier || 'RARE';
  const tierCols = { COMMON: '#94a3b8', RARE: '#38bdf8', EPIC: '#c084fc', LEGENDARY: '#f59e0b' };
  if (badge) {
    badge.textContent = tier;
    badge.style.background = tierCols[tier] || '#38bdf8';
    badge.style.color = (tier === 'LEGENDARY' || tier === 'COMMON') ? '#18181b' : '#ffffff';
  }
  if (title) title.textContent = sk.name.toUpperCase();
  if (sub) sub.textContent = (sk.type === 'op' ? 'OPERATIVE CAMO' : ((WEAP[sk.wi]||{n:'WEAPON'}).n.toUpperCase() + ' FINISH')) + ' • 360° TURNTABLE';
  if (desc) desc.textContent = sk.desc;
}

function renderTurntable() {
  const cv = $('skin-turntable-canvas');
  if (!cv) return;
  const cx = cv.getContext('2d');
  const sk = SKINS[TURNTABLE_SKIN] || SKINS.volt_railgun;
  if (!sk) return;

  TURNTABLE_ROT += 0.025;
  const tw = cv.width, th = cv.height;

  cx.clearRect(0, 0, tw, th);

  // Background radial pedestal glow
  const bgGrad = cx.createRadialGradient(tw / 2, th / 2, 10, tw / 2, th / 2, 70);
  bgGrad.addColorStop(0, (sk.col || '#38bdf8') + '33');
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = bgGrad;
  cx.fillRect(0, 0, tw, th);

  // Rotating pedestal oval shadow
  cx.fillStyle = 'rgba(0,0,0,0.55)';
  cx.beginPath();
  cx.ellipse(tw / 2, th / 2 + 28, 48, 14, 0, 0, 6.28);
  cx.fill();

  // Pedestal rim
  cx.strokeStyle = (sk.col || '#38bdf8') + '55';
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.ellipse(tw / 2, th / 2 + 28, 48, 14, 0, 0, 6.28);
  cx.stroke();

  cx.save();
  cx.translate(tw / 2, th / 2 + 4);
  const cosRot = Math.cos(TURNTABLE_ROT);
  cx.scale(cosRot, 1.0); // 360-degree turntable perspective projection

  const prevX = X;
  X = cx;

  if (sk.type === 'op') {
    // Draw operative
    const cDef = (typeof CL !== 'undefined' && CL[sk.ci || 0]) ? CL[sk.ci || 0] : { col: sk.col };
    cx.fillStyle = sk.col;
    cx.beginPath(); cx.arc(0, 0, 16, 0, 6.28); cx.fill();
    cx.fillStyle = sk.vz || '#00e5ff';
    cx.fillRect(4, -5, 6, 10);
  } else {
    // Draw weapon with skin
    const origEq = (typeof SV !== 'undefined' && SV && SV.eqSkin) ? SV.eqSkin[sk.wi] : null;
    SV.eqSkin = SV.eqSkin || {};
    SV.eqSkin[sk.wi] = TURNTABLE_SKIN;
    gun(sk.wi, 0);
    if (origEq) SV.eqSkin[sk.wi] = origEq; else delete SV.eqSkin[sk.wi];
  }

  X = prevX;
  cx.restore();

  // Specular reflection sweep across the turntable
  const sweep = (TURNTABLE_ROT * 1.5) % 6.28;
  if (sweep < 1.2) {
    cx.save();
    cx.fillStyle = 'rgba(255,255,255,0.18)';
    cx.fillRect(tw * (sweep / 1.2), 0, 12, th);
    cx.restore();
  }

  if ($('psk') && $('psk').classList.contains('active')) {
    TURNTABLE_RAF = requestAnimationFrame(renderTurntable);
  }
}

function renderSkinsUI(){
  const el = $('skin-list'); if(!el) return;
  const sKeys = Object.keys(SKINS);
  const filtered = sKeys.filter(k => {
    const sk = SKINS[k];
    const isOwned = SV.skins && SV.skins[k];
    if (activeSkinFilter === 'unlocked') return isOwned;
    if (activeSkinFilter === 'weap') return sk.type === 'weap';
    if (activeSkinFilter === 'op') return sk.type === 'op';
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;opacity:.6">No skins matching current filter.</div>';
    return;
  }

  const tierCols = { COMMON: '#94a3b8', RARE: '#38bdf8', EPIC: '#c084fc', LEGENDARY: '#f59e0b' };

  el.innerHTML = filtered.map(k => {
    const sk = SKINS[k];
    const isOp = sk.type === 'op';
    const isOwned = Boolean(SV.skins && SV.skins[k]);
    const isEquipped = isOp ? (SV.eqOpSkin === k) : Boolean(SV.eqSkin && SV.eqSkin[sk.wi] === k);
    const subTitle = isOp ? 'OPERATIVE CAMO' : ((WEAP[sk.wi]||{n:'WEAPON'}).n.toUpperCase() + ' FINISH');
    const previewSrc = isOp ? charSkinIcon(k) : skinIcon(k);
    const tier = sk.tier || 'RARE';
    const tCol = tierCols[tier] || '#38bdf8';

    let cardBorder = `1.5px solid rgba(255,255,255,.08)`;
    let cardShadow = 'none';
    let cardBg = 'rgba(20,24,18,.96)';

    if (tier === 'LEGENDARY') {
      cardBorder = isEquipped ? '2px solid #8fae4a' : '2px solid #f59e0b';
      cardShadow = isEquipped ? '0 0 16px rgba(143,174,74,.4)' : '0 0 18px rgba(245,158,11,.35)';
      cardBg = 'linear-gradient(135deg, rgba(245,158,11,.09), rgba(20,24,18,.96))';
    } else if (tier === 'EPIC') {
      cardBorder = isEquipped ? '2px solid #8fae4a' : '1.5px solid #c084fc';
      cardShadow = isEquipped ? '0 0 14px rgba(143,174,74,.35)' : '0 0 12px rgba(192,132,252,.25)';
      cardBg = 'linear-gradient(135deg, rgba(192,132,252,.06), rgba(20,24,18,.96))';
    } else if (tier === 'RARE') {
      cardBorder = isEquipped ? '2px solid #8fae4a' : '1.5px solid #38bdf8';
      cardShadow = isEquipped ? '0 0 12px rgba(143,174,74,.3)' : '0 0 8px rgba(56,189,248,.18)';
      cardBg = 'linear-gradient(135deg, rgba(56,189,248,.05), rgba(20,24,18,.96))';
    } else {
      cardBorder = isEquipped ? '2px solid #8fae4a' : '1.5px solid #64748b';
    }

    return `<div class="card" onclick="inspectSkin('${k}')" style="cursor:pointer;border:${cardBorder};border-left:5px solid ${sk.col};box-shadow:${cardShadow};display:flex;flex-direction:column;gap:8px;background:${cardBg}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:8.5px;font-weight:900;padding:1px 5px;border-radius:3px;background:${tCol}22;color:${tCol};border:1px solid ${tCol}66">${tier}</span>
            <b style="font-size:13.5px;color:${isEquipped?'#8fae4a':'#f0ece1'}">${sk.name}</b>
          </div>
          <div style="font-size:10px;opacity:.75;color:${sk.col};font-weight:700;margin-top:2px">${subTitle}</div>
        </div>
        <span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;background:${isEquipped?'rgba(143,174,74,.25)':(isOwned?'rgba(143,174,74,.15)':'rgba(255,255,255,.08)')};color:${isEquipped?'#8fae4a':(isOwned?'#8fae4a':'#888')};border:1px solid ${isEquipped?'#8fae4a55':'transparent'}">${isEquipped?'EQUIPPED':(isOwned?'UNLOCKED':'LOCKED')}</span>
      </div>
      <div style="background:radial-gradient(ellipse at center, rgba(35,42,30,.7) 0%, rgba(12,15,10,.95) 100%);border:1px solid ${sk.col}33;border-radius:6px;padding:6px;display:flex;justify-content:center;align-items:center;min-height:56px">
        <img src="${previewSrc}" style="width:100%;max-width:210px;height:52px;object-fit:contain">
      </div>
      <div style="font-size:11px;opacity:.85;color:#d0cac0;line-height:1.35">${sk.desc}</div>
      <div style="background:rgba(0,0,0,.35);padding:6px 8px;border-radius:6px;font-size:10px">
        <span style="opacity:.65">UNLOCK: </span>
        <span style="color:${isOwned?'#8fae4a':'#e0b83a'};font-weight:700">${sk.how || 'Special Event'}</span>
      </div>
      <div style="margin-top:auto;display:flex;gap:6px">
        ${isOwned ? `
          <button onclick="event.stopPropagation();equipSkinDirect('${k}')" style="flex:1;min-height:34px;font-weight:700;border-color:${isEquipped?'#8fae4a':sk.col};background:${isEquipped?'rgba(143,174,74,.25)':'transparent'};color:${isEquipped?'#8fae4a':'#f0ece1'}">
            ${isEquipped ? 'EQUIPPED' : 'EQUIP SKIN'}
          </button>
          ${isEquipped ? `<button onclick="event.stopPropagation();${isOp ? "unequipOpSkinDirect()" : "unequipSkinDirect("+sk.wi+")"}" style="min-height:34px;padding:0 12px;font-size:10px">DEFAULT</button>` : ''}
        ` : `
          <button disabled style="flex:1;min-height:34px;font-size:11px;opacity:.5">LOCKED</button>
        `}
      </div>
    </div>`;
  }).join('');

  // Start turntable render
  inspectSkin(TURNTABLE_SKIN);
  if (!TURNTABLE_RAF) {
    TURNTABLE_RAF = requestAnimationFrame(renderTurntable);
  }
}

function unequipOpSkinDirect(){
  SV.eqOpSkin = null;
  sv(); lobby();
}

function equipSkinDirect(skinId){
  const sk = SKINS[skinId]; if (!sk || !(SV.skins && SV.skins[skinId])) return;
  if(sk.type === 'op'){
    SV.eqOpSkin = skinId;
  } else {
    SV.eqSkin = SV.eqSkin || {};
    SV.eqSkin[sk.wi] = skinId;
  }
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  snd(400, .15, 'sine', .05, 1.5);
  renderSkinsUI();
  if (typeof lobby === 'function') lobby();
}

function unequipSkinDirect(weapIdx){
  if (SV.eqSkin && SV.eqSkin[weapIdx]) {
    delete SV.eqSkin[weapIdx];
    SV.rev = (SV.rev || 0) + 1;
    SV.ts = Date.now();
    sv();
    snd(250, .15, 'sawtooth', .05, 1);
    renderSkinsUI();
    if (typeof lobby === 'function') lobby();
  }
}