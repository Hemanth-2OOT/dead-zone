// DEAD ZONE v2.0.1 - EVENTS, MISSIONS, LOGIN TRACK & SKINS CONTROLLER

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
        <button data-act="openEventBriefing" data-arg="${k}" style="min-height:34px;padding:0 18px;font-weight:700;border-color:${ev.col}">${isDone?'REPLAY OP':'INSPECT OP'}</button>
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
  deployBtn.dataset.arg = k;   // the action itself is declared in the markup
  $('ev-modal').classList.add('on');
}

function beginEvent(eventId) {
  const ev = EVENTS[eventId]; if(!ev) return;
  // The shop overlay was deleted from the markup, but its id was left in this
  // reset list. The lookup returned null and the unguarded .classList threw
  // before the event context was set, so tapping DEPLOY OPERATION closed the
  // briefing and then did nothing at all. Guard every entry.
  ['start', 'over', 'pause', 'perk'].forEach(i => {
    const el = document.getElementById(i);
    if (el) el.classList.remove('on');
  });
  
  run = 0;

  const startRun = () => {
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
  };

  if (typeof showDeployScreen === 'function') {
    showDeployScreen(String(ev.title || 'OPERATION').toUpperCase(), 'SPECIAL OPERATION', 'OPERATION', startRun);
  } else {
    startRun();
  }
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

/* ---- Daily mission board ------------------------------------------------
   The board used to be the same three missions every day, so the "daily" list
   was a fixed checklist and the only thing that changed was the player's progress
   through it. Three of the five templates below are now drawn for the day, and
   the draw is seeded by the calendar date: every device and every re-render of
   the same day agrees on the board (reopening the tab cannot re-roll a mission
   away), while tomorrow's board is a different draw. Targets scale with account
   rank, so the list still means something after the early levels. Every `type`
   here must have a real trackMissionProgress() call site - the audit fails the
   build if a template can never complete. */
const DAILY_MISSION_TEMPLATES = [
  { type: 'kills',   base: 60, step: 15, max: 120, reward: 150, title: n => 'Eliminate ' + n + ' Zombies' },
  { type: 'waves',   base: 3,  step: 1,  max: 7,   reward: 200, title: n => 'Survive ' + n + ' Waves in any Sector' },
  { type: 'elites',  base: 2,  step: 1,  max: 6,   reward: 250, title: n => 'Destroy ' + n + ' Elite Enemies' },
  { type: 'bosses',  base: 1,  step: 1,  max: 3,   reward: 300, title: n => 'Bring down ' + n + ' Boss' + (n > 1 ? 'es' : '') },
  { type: 'pickups', base: 3,  step: 1,  max: 7,   reward: 220, title: n => 'Collect ' + n + ' Power-ups' }
];

// FNV-1a over the date string, then an LCG for the draws. Deterministic on
// purpose: the same day must produce the same board on every device.
function dailyBoardSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function buildDailyBoard(seedStr, lvl) {
  // Clamped at both ends: the sanitiser already floors rank at 1, but a board is
  // also drawn for a caller that passes a raw value, and a negative tier would
  // scale the target below its own base.
  const tier = Math.max(0, Math.min(4, Math.floor(((Number(lvl) || 1) - 1) / 6)));   // one step per six ranks
  let seed = dailyBoardSeed(seedStr);
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pool = DAILY_MISSION_TEMPLATES.slice();
  const board = {};
  for (let i = 0; i < 3 && pool.length; i++) {
    const t = pool.splice(Math.floor(rnd() * pool.length) % pool.length, 1)[0];
    const target = Math.min(t.max, t.base + t.step * tier);
    board['m' + (i + 1)] = { title: t.title(target), target, cur: 0, reward: t.reward, claimed: false, type: t.type };
  }
  return board;
}

function initDailyMissions() {
  const today = new Date().toDateString();
  const dayChanged = SV.dmDate !== today;
  SV.dailyMissions = SV.dailyMissions || {};
  // Reseed on an empty board as well as on a new day. The sanitiser used to drop
  // every mission record (see sanitizeSV), so a save that had been through one
  // lobby() pass carried `{}` with today's dmDate already stamped - and since
  // this function only reseeded when the date flipped, that profile sat with an
  // empty missions board until the next midnight.
  if (dayChanged || !Object.keys(SV.dailyMissions).length) {
    SV.dailyMissions = buildDailyBoard(today, SV.lvl || 1);
    // The login streak advances at most once per calendar day, and only on a real
    // day change: re-seeding a wiped board must not hand out another day.
    if (dayChanged) {
      SV.dmDate = today;
      if (SV.lastLogin !== today) {
        SV.lastLogin = today;
        SV.loginDays = Math.min(10, (SV.loginDays || 0) + 1);
      }
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
      <button data-act="claimMission" data-arg="${k}" ${!canClaim?'disabled':''} style="padding:4px 10px;min-height:28px;font-size:10px;font-weight:800;${isDone?'border-color:#8fae4a;color:#8fae4a;background:transparent':''}">${isDone?'CLAIMED':(canClaim?'CLAIM':'IN PROGRESS')}</button>
    </div>`;
  }).join('');
}

function claimMission(k) {
  const m = SV.dailyMissions && SV.dailyMissions[k];
  // Re-validate here rather than trusting the button's disabled state: the same
  // entry point serves a re-rendered list, and a claim must never pay twice.
  if (!m || m.claimed || m.cur < m.target) return;
  m.claimed = true;
  SV.cr = (SV.cr || 0) + m.reward;
  SV.dmDone = (SV.dmDone || 0) + 1;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  lobby();
  if (typeof snd === 'function') snd(760, 0.16, 'triangle', 0.06, 1.4);
  if (typeof announce === 'function') announce('MISSION COMPLETE', '#8fae4a', '+' + m.reward + ' CR', 3);
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
      <button data-act="claimLoginDay" data-arg="${r.day}" ${!isAvailable?'disabled':''} style="font-size:9.5px;padding:4px 6px;min-height:26px;width:100%;font-weight:700">${isClaimed?'CLAIMED':(isAvailable?'CLAIM':'LOCKED')}</button>
    </div>`;
  }).join('');
}

function claimLoginDay(day) {
  // The delegated click listener passes data-arg straight through, and an HTML
  // attribute is always a string. `LOGIN_REWARDS.find(x => x.day === day)` then
  // never matched a numeric table row, so the CLAIM button silently did nothing.
  const d = Math.floor(Number(day));
  if (!isFinite(d)) return;
  const r = LOGIN_REWARDS.find(x => x.day === d);
  if (!r || (SV.loginClaimed && SV.loginClaimed[d]) || d > (SV.loginDays || 1)) return;
  SV.loginClaimed = SV.loginClaimed || {};
  SV.loginClaimed[d] = true;
  const cr = r.amt || r.cr || 0;
  if (cr) SV.cr = (SV.cr || 0) + cr;
  if (r.sp) SV.sp = (SV.sp || 0) + r.sp;
  if (r.skin && SKINS[r.skin]) {
    SV.skins = SV.skins || {};
    SV.skins[r.skin] = 1;
  }
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  lobby();
  renderLoginTrackUI();
  if (typeof snd === 'function') snd(880, 0.18, 'triangle', 0.06, 1.5);
  if (typeof announce === 'function') announce('DAY ' + d + ' CLAIMED', '#ffd36b', '+' + (r.label || (cr + ' CR')), 3);
}

function renderRankRewards() {
  const el = $('rank-list'); if (!el) return;
  SV.rankClaimed = SV.rankClaimed || {};
  const lvl = SV.lvl || 1;
  const claimable = RANK_MILESTONES.filter(m => lvl >= m.r && !SV.rankClaimed[m.r]).length;
  const cnt = $('rank-claim-count');
  if (cnt) cnt.textContent = claimable ? claimable + ' READY' : '';
  el.innerHTML = RANK_MILESTONES.map(m => {
    const claimed = !!SV.rankClaimed[m.r];
    const ready = lvl >= m.r && !claimed;
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin-bottom:4px;border-radius:6px;background:${claimed?'rgba(143,174,74,.14)':ready?'rgba(224,184,58,.16)':'rgba(255,255,255,.04)'};border:1px solid ${claimed?'#8fae4a55':ready?'#e0b83a':'rgba(255,255,255,.08)'}">
      <div style="width:34px;text-align:center;flex-shrink:0">
        <div style="font-size:9px;font-weight:800;color:#aaa;letter-spacing:.5px">RANK</div>
        <div style="font-size:15px;font-weight:900;color:${claimed?'#8fae4a':ready?'#ffd36b':'#ccc'}">${m.r}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10.5px;font-weight:800;color:#f0ece1;letter-spacing:.4px">${m.label}</div>
        <div style="font-size:9.5px;color:#ffd36b;font-weight:700">+${m.cr} CR${claimed?' \u2022 CLAIMED':ready?'':` \u2022 ${lvl}/${m.r}`}</div>
      </div>
      <button data-act="claimRank" data-arg="${m.r}" ${!ready?'disabled':''} style="font-size:9.5px;padding:4px 8px;min-height:26px;font-weight:800;flex-shrink:0">${claimed?'DONE':ready?'CLAIM':'LOCKED'}</button>
    </div>`;
  }).join('');
}

function claimRank(r) {
  // Same string/number trap as claimLoginDay(): the rank arrives from a data
  // attribute, and RANK_MILESTONES rows hold numbers.
  const rk = Math.floor(Number(r));
  if (!isFinite(rk)) return;
  const m = RANK_MILESTONES.find(x => x.r === rk);
  if (!m || (SV.lvl || 1) < rk) return;
  SV.rankClaimed = SV.rankClaimed || {};
  if (SV.rankClaimed[rk]) return;
  SV.rankClaimed[rk] = true;
  SV.cr = (SV.cr || 0) + m.cr;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  if (typeof snd === 'function') snd(880, 0.2, 'triangle', 0.08, 1.6);
  sv();
  lobby();
  if (typeof announce === 'function') announce('RANK ' + rk + ' REWARD', '#ffd36b', '+' + m.cr + ' CR', 3);
}

const LOBBY_REWARD_TABS = ['m', 'l', 'c', 's'];
function switchLobbyRewards(t){
  if (LOBBY_REWARD_TABS.indexOf(t) < 0) t = 'm';
  for (const k of LOBBY_REWARD_TABS) {
    const btn = $('rtab-' + k), view = $('rview-' + k);
    if (btn) btn.classList.toggle('on', k === t);
    if (view) view.classList.toggle('on', k === t);
  }
  if (t === 'c' && typeof renderRankRewards === 'function') renderRankRewards();
  if (t === 's' && typeof renderAchievements === 'function') renderAchievements();
  if (t === 'l' && typeof renderLoginTrackUI === 'function') renderLoginTrackUI();
  if (typeof snd === 'function') snd(520, 0.05, 'square', 0.03);
}

let activeSkinFilter = 'all';
function filterSkins(f){
  activeSkinFilter = f;
  const filterMap = { all: 'all', weap: 'weapon', op: 'operative', unlocked: 'unlocked' };
  const target = filterMap[f] || f;
  document.querySelectorAll('.sk-tab').forEach(b => {
    b.classList.toggle('on', b.textContent.toLowerCase().includes(target));
  });
  renderSkinsUI();
}

// Anything that caches a body or gun sprite has to be dropped when the player
// changes what they are wearing, or the old finish keeps showing up.
function invalidateLookCaches() {
  if (typeof resetCharacterIconCache === 'function') resetCharacterIconCache();
  if (typeof resetGunIconCache === 'function') resetGunIconCache();
  if (typeof resetSkinIconCache === 'function') resetSkinIconCache();
}

const SKI_CACHE = {};
function resetSkinIconCache() { for (const k in SKI_CACHE) delete SKI_CACHE[k]; }
function skinIcon(skinKey) {
  if (SKI_CACHE[skinKey]) return SKI_CACHE[skinKey];
  const sk = SKINS[skinKey];
  if (!sk) return '';
  const cv = document.createElement('canvas');
  cv.width = 180; cv.height = 54;
  const cx = cv.getContext('2d');
  const wi = skinWeaponIndex(sk);
  SV.eqSkin = SV.eqSkin || {};
  const origEq = SV.eqSkin[wi];
  try {
    withCtx(cx, () => {
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
      SV.eqSkin[wi] = skinKey;
      gun(wi, 0);
      X.restore();
    });
  } finally {
    // gun() renders with the preview skin equipped, so the real one has to go back
    if (origEq) SV.eqSkin[wi] = origEq; else delete SV.eqSkin[wi];
  }
  return SKI_CACHE[skinKey] = cv.toDataURL();
}

let TURNTABLE_SKIN = 'volt_railgun';
let TURNTABLE_ROT = 0;
let TURNTABLE_RAF = null;
let TURNTABLE_ERR = 0;

// A weapon or operative preview is decoration. If one definition is broken the
// tab must stay usable, so the preview is allowed to fail once - loudly - and
// then stops requesting frames instead of throwing on every one of them.
function renderTurntable() {
  try {
    turntableFrame();
  } catch (e) {
    TURNTABLE_RAF = null;
    if (!TURNTABLE_ERR) {
      TURNTABLE_ERR = 1;
      console.error('[Skins] turntable preview failed', e);
    }
  }
}

// Resolves a skin's weapon index to something drawable. A skin can legitimately
// carry no weapon, or a stale index from an older build's arsenal.
function skinWeaponIndex(sk) {
  if (!sk) return 0;
  const wi = Number(sk.wi);
  if (!isFinite(wi) || wi < 0 || wi > WEAP.length - 1) return 0;
  return wi | 0;
}

function inspectSkin(skinKey) {
  const sk = SKINS[skinKey]; if (!sk) return;
  TURNTABLE_SKIN = skinKey;
  TURNTABLE_ERR = 0;
  const badge = $('st-badge'), title = $('st-title'), sub = $('st-sub'), desc = $('st-desc');
  const tier = sk.tier || 'RARE';
  const tierCols = { COMMON: '#94a3b8', RARE: '#38bdf8', EPIC: '#c084fc', LEGENDARY: '#f59e0b' };
  if (badge) {
    badge.textContent = tier;
    badge.style.background = tierCols[tier] || '#38bdf8';
    badge.style.color = (tier === 'LEGENDARY' || tier === 'COMMON') ? '#18181b' : '#ffffff';
  }
  if (title) title.textContent = String(sk.name || skinKey).toUpperCase();
  if (sub) {
    // The operative branch used to build a null weapon name and then uppercase it,
    // so every op skin threw right here and took the whole preview down with it.
    const isOp = sk.type === 'op';
    const wName = String(isOp ? 'OPERATIVE' : ((WEAP[skinWeaponIndex(sk)] || {}).n || 'WEAPON')).toUpperCase();
    sub.textContent = (isOp ? 'OPERATIVE CAMO' : (wName + ' FINISH')) + ' • 360° TURNTABLE';
  }
  if (desc) desc.textContent = sk.desc || '';
  renderTurntable();
}

function turntableFrame() {
  const cv = $('skin-turntable-canvas');
  if (!cv) return;
  const cx = cv.getContext('2d');
  const sk = SKINS[TURNTABLE_SKIN] || SKINS.volt_railgun;
  if (!sk) return;

  TURNTABLE_ROT += 0.024;
  const tw = cv.width, th = cv.height;

  cx.clearRect(0, 0, tw, th);

  // Background radial pedestal glow
  const bgGrad = cx.createRadialGradient(tw / 2, th / 2, 8, tw / 2, th / 2, 75);
  bgGrad.addColorStop(0, (sk.col || '#38bdf8') + '3a');
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = bgGrad;
  cx.fillRect(0, 0, tw, th);

  // Rotating pedestal oval shadow
  cx.fillStyle = 'rgba(0,0,0,0.58)';
  cx.beginPath();
  cx.ellipse(tw / 2, th / 2 + 30, 52, 14, 0, 0, 6.28);
  cx.fill();

  // Pedestal rim & metallic shine
  cx.strokeStyle = (sk.col || '#38bdf8') + '66';
  cx.lineWidth = 1.8;
  cx.beginPath();
  cx.ellipse(tw / 2, th / 2 + 30, 52, 14, 0, 0, 6.28);
  cx.stroke();

  // Tier escalating effects: Legendary orbiting energy particles & Epic aura
  const tier = sk.tier || 'RARE';
  if (tier === 'LEGENDARY') {
    const t = performance.now() * 0.003;
    for (let i = 0; i < 4; i++) {
      const ang = t + i * 1.57;
      const px = tw / 2 + Math.cos(ang) * 48;
      const py = th / 2 + 20 + Math.sin(ang) * 13;
      cx.fillStyle = '#f59e0b';
      cx.beginPath(); cx.arc(px, py, 2.2, 0, 6.28); cx.fill();
      cx.fillStyle = '#fef08a';
      cx.beginPath(); cx.arc(px, py, 1.2, 0, 6.28); cx.fill();
    }
  } else if (tier === 'EPIC') {
    const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.3;
    cx.strokeStyle = 'rgba(192, 132, 252, ' + (pulse * 0.45) + ')';
    cx.lineWidth = 2.2;
    cx.beginPath(); cx.ellipse(tw / 2, th / 2 + 30, 56, 16, 0, 0, 6.28); cx.stroke();
  }

  cx.save();
  cx.translate(tw / 2, th / 2 + 6);
  const cosRot = Math.cos(TURNTABLE_ROT);

  // The model draws through the shared X binding; withCtx hands it back even
  // if a skin definition throws half way through the preview.
  withCtx(cx, () => {

    if (sk.type === 'op') {
      // High-fidelity 4-layer operative turntable model
      cx.scale(cosRot * 1.85, 1.85);

      // Drop shadow
      cx.fillStyle = 'rgba(0,0,0,0.42)';
      cx.beginPath(); cx.ellipse(0, 13, 12, 5, 0, 0, 6.28); cx.fill();

      // Combat boots
      cx.fillStyle = '#181b16';
      cx.fillRect(-8, 5, 5.5, 9);
      cx.fillRect(2.5, 5, 5.5, 9);

      // Tactical gear backpack
      cx.fillStyle = sk.pk || '#252e20';
      cx.fillRect(-10, -8, 20, 13);
      cx.strokeStyle = '#10140d'; cx.lineWidth = 1; cx.strokeRect(-10, -8, 20, 13);

      // Torso armor with camouflage accent
      cx.fillStyle = sk.col;
      cx.beginPath(); cx.roundRect(-8, -12, 16, 17, 3.5); cx.fill();
      cx.strokeStyle = sk.ac || '#10140d'; cx.lineWidth = 1.6; cx.stroke();

      // Helmet & Visor
      cx.fillStyle = sk.hm || '#1e293b';
      cx.beginPath(); cx.arc(0, -15, 7.5, 0, 6.28); cx.fill();
      cx.fillStyle = sk.vz || '#00e5ff';
      cx.beginPath(); cx.roundRect(-4, -17, 8, 3.5, 1.5); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,0.7)';
      cx.fillRect(-2, -16.5, 3, 1.5);
    } else {
      // High-resolution scaled weapon preview centered on turntable pedestal
      cx.scale(cosRot * 2.35, 2.35);
      cx.translate(-14, 0);

      const wi = skinWeaponIndex(sk);
      const origEq = (typeof SV !== 'undefined' && SV && SV.eqSkin) ? SV.eqSkin[wi] : null;
      SV.eqSkin = SV.eqSkin || {};
      SV.eqSkin[wi] = TURNTABLE_SKIN;
      try {
        gun(wi, 0);
      } finally {
        // gun() renders with the preview skin equipped; put the real one back
        if (origEq) SV.eqSkin[wi] = origEq; else delete SV.eqSkin[wi];
      }
    }
  });
  cx.restore();

  // Specular reflection sweep across the pedestal
  const sweep = (TURNTABLE_ROT * 1.5) % 6.28;
  if (sweep < 1.2) {
    cx.save();
    cx.fillStyle = 'rgba(255,255,255,0.18)';
    cx.fillRect(tw * (sweep / 1.2), 0, 12, th);
    cx.restore();
  }

  // Loop requestAnimationFrame while skins tab is on
  if ($('psk') && $('psk').classList.contains('on')) {
    TURNTABLE_RAF = requestAnimationFrame(renderTurntable);
  } else {
    TURNTABLE_RAF = null;
  }
}

function renderSkinsUI(){
  const el = $('skin-list'); if(!el) return;
  if (typeof SV === 'undefined' || !SV) return;
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
    // A definition can be incomplete (an event skin shipped without a colour or a
    // description). Fall back instead of printing "undefined" into the card.
    const skName = sk.name || k, skCol = sk.col || '#8fae4a', skDesc = sk.desc || '';
    const wi = skinWeaponIndex(sk);
    const isOwned = Boolean(SV.skins && SV.skins[k]);
    const isEquipped = isOp ? (SV.eqOpSkin === k) : Boolean(SV.eqSkin && SV.eqSkin[wi] === k);
    const subTitle = isOp ? 'OPERATIVE CAMO' : ((WEAP[wi]||{n:'WEAPON'}).n.toUpperCase() + ' FINISH');
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

    const flourish = (tier === 'EPIC' || tier === 'LEGENDARY');
    return `<div class="card skin-card${isEquipped ? ' equipped' : ''}" data-act="inspectSkin" data-arg="${k}" style="cursor:pointer;border:${cardBorder};border-left:5px solid ${skCol};box-shadow:${cardShadow};display:flex;flex-direction:column;gap:8px;background:${cardBg};--aura:${skCol}66">
      ${flourish ? '<div class="sk-pixel"></div><div class="sk-aura"></div>' : ''}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:8.5px;font-weight:900;padding:1px 5px;border-radius:3px;background:${tCol}22;color:${tCol};border:1px solid ${tCol}66">${tier}</span>
            <b style="font-size:13.5px;color:${isEquipped?'#8fae4a':'#f0ece1'}">${skName}</b>
          </div>
          <div style="font-size:10px;opacity:.75;color:${skCol};font-weight:700;margin-top:2px">${subTitle}</div>
        </div>
        <span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;background:${isEquipped?'rgba(143,174,74,.25)':(isOwned?'rgba(143,174,74,.15)':'rgba(255,255,255,.08)')};color:${isEquipped?'#8fae4a':(isOwned?'#8fae4a':'#888')};border:1px solid ${isEquipped?'#8fae4a55':'transparent'}">${isEquipped?'EQUIPPED':(isOwned?'UNLOCKED':'LOCKED')}</span>
      </div>
      <div style="background:radial-gradient(ellipse at center, rgba(35,42,30,.7) 0%, rgba(12,15,10,.95) 100%);border:1px solid ${skCol}33;border-radius:6px;padding:6px;display:flex;justify-content:center;align-items:center;min-height:56px">
        <img src="${previewSrc}" style="width:100%;max-width:210px;height:52px;object-fit:contain">
      </div>
      <div style="font-size:11px;opacity:.85;color:#d0cac0;line-height:1.35">${skDesc}</div>
      <div style="background:rgba(0,0,0,.35);padding:6px 8px;border-radius:6px;font-size:10px">
        <span style="opacity:.65">UNLOCK: </span>
        <span style="color:${isOwned?'#8fae4a':'#e0b83a'};font-weight:700">${sk.how || 'Special Event'}</span>
        ${(() => {
          if (isOwned) return '';
          const st = (typeof skinRuleState === 'function') ? skinRuleState(k) : null;
          if (!st) return '';
          return `<div style="margin-top:6px">
            <div style="display:flex;justify-content:space-between;font-size:9px;letter-spacing:.4px;opacity:.8">
              <span style="color:${sk.col}">PROGRESS</span><span>${st.cur.toLocaleString()} / ${st.goal.toLocaleString()}</span>
            </div>
            <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.1);margin-top:3px;overflow:hidden">
              <div style="width:${st.pct}%;height:100%;background:${sk.col}"></div>
            </div>
          </div>`;
        })()}
      </div>
      <div style="margin-top:auto;display:flex;gap:6px">
        ${isOwned ? `
          <button data-act="equipSkinDirect" data-arg="${k}" style="flex:1;min-height:34px;font-weight:700;border-color:${isEquipped?'#8fae4a':sk.col};background:${isEquipped?'rgba(143,174,74,.25)':'transparent'};color:${isEquipped?'#8fae4a':'#f0ece1'}">
            ${isEquipped ? 'EQUIPPED' : 'EQUIP SKIN'}
          </button>
          ${isEquipped ? `<button data-act="${isOp ? 'unequipOpSkin' : 'unequipSkin'}" data-arg="${isOp ? '' : wi}" style="min-height:34px;padding:0 12px;font-size:10px">DEFAULT</button>` : ''}
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
  invalidateLookCaches();
  sv(); lobby();
}

function equipSkinDirect(skinId){
  const sk = SKINS[skinId]; if (!sk || !(SV.skins && SV.skins[skinId])) return;
  if(sk.type === 'op'){
    SV.eqOpSkin = skinId;
  } else {
    SV.eqSkin = SV.eqSkin || {};
    SV.eqSkin[skinWeaponIndex(sk)] = skinId;
  }
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  invalidateLookCaches();
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