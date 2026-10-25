// DEAD ZONE v2.4 - META PROGRESSION & RETENTION SYSTEMS
// Short-cycle hooks that keep a run interesting and a session going:
//   * BOON DRAFT      - pick 1 of 3 run-scoped boons after every wave
//   * WEAPON MASTERY  - per-gun XP and permanent damage tiers
//   * ACHIEVEMENTS    - lifetime goal grid with credit payouts
//   * GHOST PACE      - race your own best run pace in real time
//   * SUPPLY DEAL     - one rotating discounted shop item per wave
//   * ASCENSION       - per-sector difficulty tiers for extra bounty
//   * RUN STREAK      - escalating bonus for consecutive deep runs

/* ================================================================== */
/* BOON DRAFT                                                          */
/* ================================================================== */
const BOONS = [
  { id: 'dmg',  n: 'OVERSIZED ROUNDS', d: '+12% weapon damage',            col: '#ff5a3a', rar: 'common', max: 5, ap() { S.dm = (S.dm || 1) * 1.12; } },
  { id: 'rof',  n: 'HAIR TRIGGER',     d: '+8% fire rate',                 col: '#ffd36b', rar: 'common', max: 5, ap() { S.rf = (S.rf || 1) * 1.08; } },
  { id: 'spd',  n: 'LIGHT BOOTS',      d: '+7% move speed',                col: '#5ac8e8', rar: 'common', max: 4, ap() { S.ms = (S.ms || 1) * 1.07; } },
  { id: 'arm',  n: 'PLATE CARRIER',    d: '-6% damage taken',              col: '#94a3b8', rar: 'common', max: 4, ap() { S.ar = Math.max(0.4, (S.ar != null ? S.ar : 1) * 0.94); } },
  { id: 'cr',   n: 'SCRAP PERMIT',     d: '+15% credits earned',           col: '#ffd36b', rar: 'common', max: 4, ap() { S.cm = (S.cm || 1) * 1.15; } },
  { id: 'crit', n: 'HOLLOW POINTS',    d: '+5% crit chance',               col: '#fb923c', rar: 'rare',   max: 5, ap() { S.ct = (S.ct || 0) + 0.05; } },
  { id: 'pierce', n: 'PIERCING SLUGS', d: 'Bullets pierce +1 target',      col: '#e2e8f0', rar: 'rare',   max: 3, ap() { S.pc = (S.pc || 0) + 1; } },
  { id: 'vamp', n: 'VAMPIRIC EDGE',    d: 'Heal 0.6 HP per kill',          col: '#f43f5e', rar: 'rare',   max: 3, ap() { S.ls = (S.ls || 0) + 0.6; } },
  { id: 'magnet', n: 'MAG COIL',       d: '+35% pickup radius',            col: '#c084fc', rar: 'rare',   max: 3, ap() { S.mg = (S.mg || 1) * 1.35; } },
  { id: 'slow', n: 'GRAVITY WELL',     d: 'Enemies move 8% slower',        col: '#a855f7', rar: 'rare',   max: 4, ap() { S.tw = (S.tw || 0) + 1; } },
  { id: 'gren', n: 'BOMBARDIER',       d: '+3 grenades immediately',       col: '#fb923c', rar: 'common', max: 3, ap() { S.gr = (S.gr || 0) + 3; } },
  { id: 'heal', n: 'COMBAT STIMM',     d: 'Heal 30% max health',           col: '#8fae4a', rar: 'common', max: 4, ap() { if (typeof healP === 'function') healP(P.mx * 0.3); } },
  { id: 'shield', n: 'PHASE PLATING',  d: '+1 shield charge',              col: '#eab308', rar: 'rare',   max: 3, ap() { S.bl = (S.bl || 0) + 1; S.bc = (S.bc || 1) + 1; } },
  { id: 'frag', n: 'FRAG TIPS',        d: 'Rounds explode on impact',      col: '#f97316', rar: 'epic',   max: 2, ap() { S.eb = (S.eb || 0) + 1; } },
  { id: 'arc',  n: 'ARC CONDUCTOR',    d: 'Rounds chain to a nearby enemy', col: '#38bdf8', rar: 'epic',  max: 2, ap() { S.cl = (S.cl || 0) + 1; } },
  { id: 'deadeye', n: 'DEADEYE',       d: '+35% critical damage',          col: '#ef4444', rar: 'epic',   max: 3, ap() { S.cdmg = (S.cdmg || 0) + 0.35; } }
];

const BOON_RARITY_W = { common: 100, rare: 55, epic: 24 };

function boonOwned(id) { return (S && S.boons && S.boons[id]) || 0; }

function rollBoonOffer() {
  if (!S) return;
  const pool = BOONS.filter(b => boonOwned(b.id) < b.max);
  S.boonOffer = [];
  const take = Math.min(3, pool.length);
  const bag = pool.slice();
  for (let i = 0; i < take; i++) {
    let total = 0;
    for (const b of bag) total += BOON_RARITY_W[b.rar] || 50;
    let r = Math.random() * total, pick = bag[0];
    for (const b of bag) { r -= (BOON_RARITY_W[b.rar] || 50); if (r <= 0) { pick = b; break; } }
    S.boonOffer.push(pick.id);
    bag.splice(bag.indexOf(pick), 1);
  }
}

function takeBoon(id) {
  if (!S || !S.boonOffer || S.boonOffer.indexOf(id) < 0) return;
  const b = BOONS.find(x => x.id === id);
  if (!b) return;
  if (boonOwned(id) >= b.max) return;
  S.boons = S.boons || {};
  S.boons[id] = boonOwned(id) + 1;
  try { b.ap(); } catch (e) { console.warn('[DeadZone] boon apply failed', id, e); }
  S.boonOffer = [];
  if (typeof snd === 'function') { snd(620, 0.16, 'triangle', 0.08, 1.5); setTimeout(() => snd(930, 0.18, 'triangle', 0.07, 1.4), 70); }
  if (typeof announce === 'function') announce(b.n, b.col, b.d + '  •  LV ' + S.boons[id]);
  if (typeof rebuild === 'function') rebuild();
}

function renderBoonBar() {
  const bar = document.getElementById('boonbar');
  if (!bar) return;
  if (!S || !S.boonOffer || !S.boonOffer.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = 'block';
  bar.innerHTML = '<div style="font-size:10px;font-weight:900;letter-spacing:1px;color:#8fae4a;margin-bottom:5px">TACTICAL BOON DRAFT &mdash; CHOOSE ONE</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + S.boonOffer.map(id => {
      const b = BOONS.find(x => x.id === id);
      if (!b) return '';
      const lvl = boonOwned(id) + 1;
      return `<button data-boon="${b.id}" style="flex:1;min-width:150px;text-align:left;padding:8px 10px;border-radius:8px;border:1.5px solid ${b.col};background:rgba(0,0,0,.45);color:#f0ece1;cursor:pointer">
        <b style="display:block;font-size:11.5px;color:${b.col};letter-spacing:.4px">${b.n} &bull; LV${lvl}</b>
        <span style="font-size:10.5px;opacity:.85">${b.d}</span>
        <span style="display:block;font-size:9px;opacity:.6;margin-top:2px;text-transform:uppercase">${b.rar}</span>
      </button>`;
    }).join('')
    + '</div>';
  bar.onclick = e => {
    const t = e.target.closest('button');
    if (!t || !t.dataset.boon) return;
    takeBoon(t.dataset.boon);
  };
}

// Compact readout of acquired boons for the in-run HUD
function boonHudLine() {
  if (!S || !S.boons) return '';
  const parts = [];
  for (const id in S.boons) {
    if (!S.boons[id]) continue;
    const b = BOONS.find(x => x.id === id);
    if (b) parts.push(b.n.split(' ')[0] + (S.boons[id] > 1 ? ' x' + S.boons[id] : ''));
  }
  return parts.join('  ');
}

/* ================================================================== */
/* WEAPON MASTERY                                                      */
/* ================================================================== */
const MAST_XP = [0, 120, 340, 720, 1250, 2000];
const MAST_MAX = MAST_XP.length;

function masteryLevel(wi) {
  const xp = (SV && SV.mast && SV.mast[wi]) || 0;
  let lv = 1;
  for (let i = 1; i < MAST_XP.length; i++) if (xp >= MAST_XP[i]) lv = i + 1;
  return lv;
}

function masteryDamageMult(wi) {
  return 1 + 0.025 * (masteryLevel(wi) - 1);
}

function addMasteryXP(wi, n) {
  if (typeof SV === 'undefined' || wi == null || n <= 0) return;
  if (!SV.mast) SV.mast = {};
  const before = masteryLevel(wi);
  SV.mast[wi] = (SV.mast[wi] || 0) + n;
  const after = masteryLevel(wi);
  if (after > before && typeof txt === 'function' && typeof P !== 'undefined' && P) {
    const w = (typeof WEAP !== 'undefined' && WEAP[wi]) ? WEAP[wi] : null;
    txt(P.x, P.y - 46, (w ? w.n.toUpperCase() : 'WEAPON') + ' MASTERY ' + after, '#ffd36b', true);
    if (typeof snd === 'function') snd(700, 0.22, 'triangle', 0.07, 1.6);
  }
}

/* ================================================================== */
/* ACHIEVEMENTS                                                        */
/* ================================================================== */
const ACHIEVEMENTS = [
  { id: 'k1',  n: 'FIRST BLOOD',      d: 'Eliminate 100 infected',                 goal: 100,    rw: 150,  cur: l => l.kills },
  { id: 'k2',  n: 'EXTERMINATOR',     d: 'Eliminate 2,500 infected',               goal: 2500,   rw: 700,  cur: l => l.kills },
  { id: 'el',  n: 'ELITE HUNTER',     d: 'Eliminate 25 elites',                    goal: 25,     rw: 400,  cur: l => l.elites },
  { id: 'bo',  n: 'TITAN SLAYER',     d: 'Eliminate 10 bosses',                    goal: 10,     rw: 900,  cur: l => l.bosses },
  { id: 'wv',  n: 'WAVE RIDER',       d: 'Clear 100 waves in total',               goal: 100,    rw: 500,  cur: l => l.waves },
  { id: 'hw',  n: 'SURVIVOR',         d: 'Reach wave 20 in a single run',          goal: 20,     rw: 600,  cur: l => l.highestWave },
  { id: 'cm',  n: 'UNSTOPPABLE',      d: 'Reach a 50 kill combo',                  goal: 50,     rw: 450,  cur: l => l.bestCombo },
  { id: 'pu',  n: 'POWER SURGE',      d: 'Use 40 power-ups',                       goal: 40,     rw: 350,  cur: l => l.pu },
  { id: 'sh',  n: 'TRIGGER DISCIPLINE', d: 'Fire 20,000 rounds',                   goal: 20000,  rw: 550,  cur: l => l.shots },
  { id: 'fl',  n: 'UNTOUCHABLE',      d: '5 flawless waves in one run',            goal: 5,      rw: 500,  cur: l => l.bestFlawless },
  { id: 'ar',  n: 'ARSENAL',          d: 'Own 12 weapons',                         goal: 12,     rw: 800,  cur: () => (SV.own || []).filter(Boolean).length },
  { id: 'sw',  n: 'SECTOR SWEEP',     d: 'Clear all 7 sectors',                    goal: 7,      rw: 1200, cur: () => Object.keys((SV.lt && SV.lt.maps) || {}).length },
  { id: 'mg',  n: 'GUNSMITH',         d: 'Max out mastery on a weapon',            goal: 1,      rw: 900,  cur: () => Object.keys(SV.mast || {}).filter(i => masteryLevel(+i) >= MAST_MAX).length },
  { id: 'asc', n: 'ASCENDANT',        d: 'Reach ascension tier 3 on a sector',     goal: 3,      rw: 1000, cur: () => Math.max(0, ...Object.values(SV.asc || {}), 0) }
];

function achState(id) {
  const lt = (SV && SV.lt) || {};
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return { cur: 0, goal: 1 };
  let cur = 0;
  try { cur = a.cur(lt) || 0; } catch (e) { cur = 0; }
  return { cur: Math.min(cur, a.goal), goal: a.goal };
}

function achReady() {
  return ACHIEVEMENTS.filter(a => {
    const s = achState(a.id);
    return s.cur >= s.goal && !(SV.ach && SV.ach[a.id]);
  }).length;
}

/* ================================================================== */
/* SKIN UNLOCK RULES                                                   */
/* ================================================================== */
// Skins carrying rk/rg (lifetime stat + goal) or rf (custom counter) unlock
// themselves the moment their condition is met, evaluated on every lobby
// refresh. Reward-gated event/login skins are untouched by this system.
function skinRuleState(k) {
  const s = (typeof SKINS !== 'undefined') ? SKINS[k] : null;
  if (!s || (!s.rk && !s.rf)) return null;
  let cur = 0;
  try {
    const lt = (SV && SV.lt) || {};
    cur = s.rf ? (s.rf() || 0) : (lt[s.rk] || 0);
  } catch (e) { cur = 0; }
  const goal = s.rg || 1;
  return { cur: Math.min(cur, goal), goal, pct: Math.max(0, Math.min(100, Math.round(100 * cur / goal))) };
}

function checkSkinUnlocks() {
  if (typeof SV === 'undefined' || typeof SKINS === 'undefined') return 0;
  SV.skins = SV.skins || {};
  const unlocked = [];
  for (const k in SKINS) {
    if (SV.skins[k]) continue;
    const st = skinRuleState(k);
    if (!st || st.cur < st.goal) continue;
    SV.skins[k] = 1;
    unlocked.push(SKINS[k]);
  }
  if (!unlocked.length) return 0;
  if (typeof sv === 'function') sv();
  if (typeof snd === 'function') snd(880, 0.28, 'triangle', 0.06, 1.5);
  lobbySkinToast(unlocked);
  return unlocked.length;
}

function lobbySkinToast(list) {
  if (typeof document === 'undefined') return;
  let host = document.getElementById('skin-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'skin-toast-host';
    document.body.appendChild(host);
  }
  host.innerHTML = list.map((s, i) => `<div class="skin-toast" style="animation-delay:${i * 120}ms;border-left:5px solid ${s.col || '#ffd36b'}">
      <div class="st-k">SKIN UNLOCKED</div>
      <div class="st-n">${s.name}</div>
      <div class="st-d">${s.type === 'op' ? 'OPERATIVE CAMO' : 'WEAPON FINISH'} &bull; EQUIP IN SKINS TAB</div>
    </div>`).join('');
  clearTimeout(host._t);
  host._t = setTimeout(() => { host.innerHTML = ''; }, 5200);
}

function renderAchievements() {
  const el = document.getElementById('ach-list');
  if (!el) return;
  const ready = achReady();
  const cnt = document.getElementById('ach-count');
  if (cnt) {
    cnt.textContent = ready ? ready + ' READY' : ACHIEVEMENTS.filter(a => SV.ach && SV.ach[a.id]).length + '/' + ACHIEVEMENTS.length;
    cnt.style.color = ready ? '#8fae4a' : '#a8a29e';
  }
  el.innerHTML = ACHIEVEMENTS.map(a => {
    const s = achState(a.id);
    const done = SV.ach && SV.ach[a.id];
    const claimable = !done && s.cur >= s.goal;
    const pct = Math.round(100 * s.cur / s.goal);
    const col = done ? '#8fae4a' : (claimable ? '#ffd36b' : '#7a7f6e');
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:6px">
          <b style="font-size:10.5px;color:${col};letter-spacing:.3px">${a.n}</b>
          <span style="font-size:9.5px;opacity:.75;white-space:nowrap">${s.cur}/${s.goal}</span>
        </div>
        <div style="font-size:9.5px;opacity:.6;margin:1px 0 3px">${a.d}</div>
        <div style="height:4px;border-radius:2px;background:rgba(255,255,255,.09);overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${col}"></div>
        </div>
      </div>
      <button data-ach="${a.id}" ${(!claimable) ? 'disabled' : ''} style="min-width:74px;min-height:26px;padding:2px 6px;font-size:9.5px;font-weight:800">${done ? 'CLAIMED' : (claimable ? '+' + a.rw + ' CR' : 'LOCKED')}</button>
    </div>`;
  }).join('');
  el.onclick = e => {
    const b = e.target.closest('button');
    if (!b || b.disabled || !b.dataset.ach) return;
    claimAchievement(b.dataset.ach);
  };
}

function claimAchievement(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  const s = achState(id);
  if (s.cur < s.goal) return;
  if (!SV.ach) SV.ach = {};
  if (SV.ach[id]) return;
  SV.ach[id] = 1;
  SV.cr = (SV.cr || 0) + a.rw;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  if (typeof snd === 'function') { snd(880, 0.2, 'triangle', 0.08, 1.6); setTimeout(() => snd(1180, 0.22, 'triangle', 0.07, 1.5), 90); }
  if (typeof sv === 'function') sv();
  if (typeof lobby === 'function') lobby();
}

/* ================================================================== */
/* GHOST PACE                                                          */
/* ================================================================== */
function recordWavePace() {
  if (!S) return;
  S.waveTimes = S.waveTimes || {};
  S.waveTimes[S.wave] = Math.round(S.t * 10) / 10;
}

// Seconds ahead (-) or behind (+) your best run at the last cleared wave.
function ghostDelta() {
  if (!S || !S.waveTimes || !SV || !SV.pace) return null;
  const times = SV.pace.times || {};
  const w = S.wave;
  if (S.waveTimes[w] == null || times[w] == null) return null;
  return Math.round((S.waveTimes[w] - times[w]) * 10) / 10;
}

/* ================================================================== */
/* ASCENSION & RUN STREAK                                              */
/* ================================================================== */
const ASC_MAX = 5;

function ascTier(mapIndex) {
  return Math.min(ASC_MAX, (SV.asc && SV.asc[mapIndex]) || 0);
}

function ascRewardMult(mapIndex) {
  return 1 + 0.12 * ascTier(mapIndex);
}

function ascRollChance(mapIndex) {
  return Math.min(1, 0.55 + 0.08 * ascTier(mapIndex));
}

// Chance that a wave carries a director modifier (higher tiers = more chaos)
function waveModChance() {
  const m = (typeof getCurMap === 'function') ? getCurMap() : 0;
  return ascRollChance(m);
}

function refreshAscension(mapIndex, wave) {
  if (!SV) return 0;
  if (wave <= 0) return 0;
  const need = 12 + 6 * ascTier(mapIndex);
  if (wave < need) return 0;
  if (!SV.asc) SV.asc = {};
  const t = Math.min(ASC_MAX, (SV.asc[mapIndex] || 0) + 1);
  SV.asc[mapIndex] = t;
  return t;
}

function runStreakBonus() {
  const st = (SV && SV.runStreak) || 0;
  return Math.min(0.5, st * 0.05);
}

/* ================================================================== */
/* RUN SETTLEMENT (called once, from commitXP)                         */
/* ================================================================== */
function settleRun() {
  if (typeof SV === 'undefined' || !S) return;
  const lt = SV.lt = SV.lt || {};
  lt.kills = (lt.kills || 0) + (S.kills || 0);
  lt.elites = (lt.elites || 0) + (S.eliteKills || 0);
  lt.bosses = (lt.bosses || 0) + (S.bossKills || 0);
  lt.waves = (lt.waves || 0) + (S.wave || 0);
  lt.pu = (lt.pu || 0) + (S.puCount || 0);
  lt.shots = (lt.shots || 0) + (S.shots || 0);
  lt.runs = (lt.runs || 0) + 1;
  lt.bestCombo = Math.max(lt.bestCombo || 0, S.cmbMax || 0);
  lt.highestWave = Math.max(lt.highestWave || 0, S.wave || 0);
  lt.bestFlawless = Math.max(lt.bestFlawless || 0, S.flawlessBest || 0);

  const curM = (typeof getCurMap === 'function') ? getCurMap() : 0;
  if (S.wave >= 6) {
    lt.maps = lt.maps || {};
    lt.maps[curM] = Math.max(lt.maps[curM] || 0, S.wave);
  }

  const ascGain = refreshAscension(curM, S.wave);

  // Consecutive deep runs build a streak; a shallow run resets it.
  SV.runStreak = (S.wave >= 10) ? ((SV.runStreak || 0) + 1) : 0;

  // Ghost pace: only a record-setting run overwrites the reference line.
  if (!SV.pace) SV.pace = { times: {} };
  if ((S.wave || 0) >= (SV.best || 0) && S.waveTimes) {
    const times = {};
    for (const k in S.waveTimes) times[k] = S.waveTimes[k];
    SV.pace = { times, wave: S.wave };
  }

  if (ascGain > 0 && typeof announce === 'function') {
    announce('ASCENSION ' + ascGain, '#c084fc', 'SECTOR THREAT RISES - BOUNTY UP');
  }
}
