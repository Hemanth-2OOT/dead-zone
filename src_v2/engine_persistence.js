// DEAD ZONE v1.1.0 - SAVE PERSISTENCE & DATA PIPELINE
// Version: SV.v = 3

let SV = {
  v: 3,
  rev: 1,
  ts: Date.now(),
  xp: 0,
  lvl: 1,
  cr: 0,
  best: 0,
  own: [1],
  start: 0,
  hu: 0,
  du: 0,
  gu: 0,
  cb: 0,
  day: '',
  mute: 0,
  // Mobile control + visual comfort preferences (persisted, see ctlPref()).
  ctlSize: 1,
  ctlOpacity: 1,
  ctlMode: 'fixed',
  shakeLvl: 2,
  fx: 'full',
  rm: null,
  quality: 'high',
  goreLvl: 'full',
  cls: 0,
  ucl: [1],
  sp: 3,
  ar: [],
  eq: [],
  map: 0,
  ap: 0,
  skins: { default: 1 },
  eqSkin: {},
  eqOpSkin: null,
  col: null,
  dmDate: '',
  lastLogin: '',
  rankClaimed: {},
  evDone: {},
  dailyMissions: {},
  dmDone: 0,
  loginDays: 1,
  loginClaimed: {},
  mast: {},
  ach: {},
  lt: {},
  pace: { times: {} },
  asc: {},
  runStreak: 0
};

function transactMetaCredits(cost, desc) {
  cost = Math.max(0, Math.floor(Number(cost) || 0));
  if ((SV.cr || 0) < cost) return false;
  SV.cr -= cost;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  if (typeof lobby === 'function') lobby();
  return true;
}

function sanitizeSV(s) {
  if (!s || typeof s !== 'object') return null;
  const out = Object.assign({}, SV);
  // Copy every own key except the three that can rewrite the prototype chain.
  // An earlier whitelist-only version silently dropped legitimate fields that
  // are not in the SV template above (equipped operative skin, suit tint, the
  // daily/login date stamps, claimed-rank map), so equipping a skin was wiped
  // on the very next lobby() pass. Unknown junk keys are harmless; poisoned
  // ones are not.
  for (const k of Object.keys(s)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = s[k];
  }
  // The copy above is deliberately permissive about *names* (see the note about
  // forward compatibility), but it must not be permissive about *size*: a save
  // carrying one 5 MB unknown key would be copied back out on every sv() and the
  // write would throw with the payload still in place, so no amount of pruning
  // could recover it. Unknown keys survive only while they stay small and few.
  {
    const KNOWN = Object.keys(SV);
    let junkKept = 0;
    for (const k of Object.keys(out)) {
      if (KNOWN.indexOf(k) >= 0) continue;
      let size = 0;
      try { size = JSON.stringify(out[k]).length; } catch (e) { size = Infinity; }
      if (!(size <= 1024) || junkKept >= 32) delete out[k];
      else junkKept++;
    }
  }
  // `Math.max(0, Math.floor(Number(v) || 0))` is not enough on its own: an edited
  // save containing `Infinity` passes straight through it (Number(Infinity) is
  // truthy, Math.floor keeps it, Math.max accepts it) and poisons every derived
  // value from XP to the crit roll. Every counter goes through one clamp that
  // rejects anything non-finite.
  const num = (v, lo, hi, dflt) => {
    const n = Math.floor(Number(v));
    if (!isFinite(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  };
  out.lvl = num(out.lvl, 1, 9999, 1);
  out.xp = num(out.xp, 0, 1e12, 0);
  out.cr = num(out.cr, 0, 1e12, 0);
  out.sp = num(out.sp, 0, 1e9, 0);
  out.best = num(out.best, 0, 100000, 0);
  out.dmDone = num(out.dmDone, 0, 1e9, 0);   // lifetime daily-mission claims
  // `rev`/`ts` decide which copy wins when a save is merged back from the native
  // Preferences store, so they are clamped too: an infinite revision would win
  // every future merge.
  out.rev = num(out.rev, 0, 1e9, 1);
  out.ts = num(out.ts, 0, 8.64e15, Date.now());
  // Skill-tree ranks and loadout indices: a corrupt or hand-edited save must
  // never be able to inject NaN/Infinity into P.mx, S.dm or the crit roll.
  const RANKS = ['mx', 'spd', 'dm', 'rof', 'crit', 'vamp', 'regen', 'cb', 'xpb', 'hu', 'du', 'gu', 'sc', 'shadows', 'luck', 'mute'];
  for (const k of RANKS) out[k] = num(out[k], 0, 999, 0);
  // Control and comfort preferences. Clamped rather than trusted: a corrupt save
  // must not be able to hand ctlScale() a NaN (which would place every control at
  // NaN) or push the control size off the screen.
  out.ctlSize = Math.max(0.8, Math.min(1.3, Number(out.ctlSize) || 1));
  out.ctlOpacity = Math.max(0.35, Math.min(1, Number(out.ctlOpacity) || 1));
  out.ctlMode = out.ctlMode === 'floating' ? 'floating' : 'fixed';
  out.shakeLvl = Math.max(0, Math.min(2, Number(out.shakeLvl != null ? out.shakeLvl : 2) || 0));
  out.fx = out.fx === 'reduced' ? 'reduced' : 'full';
  out.rm = (out.rm == null) ? null : Boolean(out.rm);
  out.quality = ['high', 'med', 'low'].indexOf(out.quality) >= 0 ? out.quality : 'high';
  out.goreLvl = ['full', 'reduced', 'minimal'].indexOf(out.goreLvl) >= 0 ? out.goreLvl : 'full';
  if (typeof CL !== 'undefined' && CL.length) out.cls = Math.max(0, Math.min(CL.length - 1, Math.floor(Number(out.cls) || 0)));
  if (typeof WEAP !== 'undefined' && WEAP.length) out.start = Math.max(0, Math.min(WEAP.length - 1, Math.floor(Number(out.start) || 0)));
  if (!Array.isArray(out.own)) out.own = [1];
  out.own[0] = 1;
  while (out.own.length < WEAP.length) out.own.push(0);
  // The clamp above only grows the array; a hand-edited save with a million
  // entries kept them all and every `for (i < own.length)` walk in the game
  // inherited the length.
  if (out.own.length > WEAP.length) out.own.length = WEAP.length;
  for (let i = 0; i < out.own.length; i++) out.own[i] = out.own[i] ? 1 : 0;
  if (!Array.isArray(out.ucl)) out.ucl = [1];
  out.ucl[0] = 1;
  if (typeof CL !== 'undefined' && CL.length && out.ucl.length > CL.length) out.ucl.length = CL.length;
  for (let i = 0; i < out.ucl.length; i++) out.ucl[i] = out.ucl[i] ? 1 : 0;
  // Owned ascension relics / equipped perk slots: ids must point at a real row,
  // and the list is capped, because both are walked on every applySV().
  const idList = (arr, len) => {
    if (!Array.isArray(arr)) return [];
    const out2 = [];
    for (const v of arr) {
      const i = Math.floor(Number(v));
      if (!isFinite(i) || i < 0 || i >= len || out2.indexOf(i) >= 0) continue;
      out2.push(i);
      if (out2.length >= 64) break;
    }
    return out2;
  };
  out.ar = idList(out.ar, (typeof AR !== 'undefined' && AR.length) ? AR.length : 0);
  out.eq = idList(out.eq, (typeof AR !== 'undefined' && AR.length) ? AR.length : 0);
  if (typeof out.map !== 'number' || out.map < 0 || out.map >= MP.length) out.map = 0;
  if (typeof out.ap !== 'number') out.ap = 0;
  out.v = 3;
  // Progress maps are unbounded on the way in: `JSON.parse` returns whatever the
  // file holds, the copy loop above takes all of it, and the oversized result is
  // written straight back on the next sv(). The write then throws
  // QuotaExceededError and the player finishes a session with nothing saved.
  // Every map is therefore capped and its values coerced. The caps sit well above
  // anything the game itself can produce (the largest real table is 22 weapons),
  // so a legitimate save is never trimmed.
  const MAP_MAX = 256;
  const PACE_MAX = 4096;      // one entry per wave of a record run
  const mapOf = (v, max) => {
    const o = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    const keys = Object.keys(o);
    if (keys.length <= max) return o;
    const kept = {};
    for (const k of keys.slice(0, max)) kept[k] = o[k];
    return kept;
  };
  const flagMap = (v, max) => {
    const o = mapOf(v, max), r = {};
    for (const k of Object.keys(o)) r[k] = o[k] ? 1 : 0;
    return r;
  };
  const numMap = (v, max, lo, hi) => {
    const o = mapOf(v, max), r = {};
    for (const k of Object.keys(o)) {
      const n = num(o[k], lo, hi, null);
      if (n !== null) r[k] = n;
    }
    return r;
  };
  out.skins = flagMap(out.skins, MAP_MAX - 1);   // -1 leaves room for `default`
  if (!out.skins.default) out.skins.default = 1;
  // eqSkin maps a weapon index to a skin id; only short strings survive.
  {
    const o = mapOf(out.eqSkin, MAP_MAX), r = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && v.length <= 32) r[k] = v;
    }
    out.eqSkin = r;
  }
  out.evDone = flagMap(out.evDone, MAP_MAX);
  // Daily missions are records, not counters. Running them through numMap() meant
  // `Number({title,target,cur,...})` was NaN for every entry, so the whole board
  // was dropped on the very next save - the missions screen could only ever show
  // what initDailyMissions() had just written, and that only reseeds when the
  // calendar date flips. Progress therefore never survived a load, and a profile
  // whose board had been wiped stayed empty until midnight.
  const missionMap = (v, max) => {
    const o = mapOf(v, max), r = {};
    for (const k of Object.keys(o)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const m = o[k];
      if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
      const target = num(m.target, 1, 1e6, null);
      if (target === null) continue;             // not a mission record
      r[k] = {
        title: (typeof m.title === 'string' ? m.title : 'Daily Mission').slice(0, 64),
        type: (typeof m.type === 'string' ? m.type : 'kills').slice(0, 16),
        target: target,
        cur: Math.min(num(m.cur, 0, 1e6, 0), target),
        reward: num(m.reward, 0, 1e6, 0),
        claimed: m.claimed ? true : false
      };
    }
    return r;
  };
  out.dailyMissions = missionMap(out.dailyMissions, MAP_MAX);
  out.loginClaimed = flagMap(out.loginClaimed, MAP_MAX);
  out.rankClaimed = flagMap(out.rankClaimed, MAP_MAX);
  out.mast = numMap(out.mast, MAP_MAX, 0, 1e12);
  out.ach = flagMap(out.ach, MAP_MAX);
  out.asc = numMap(out.asc, MAP_MAX, 0, 1e6);
  {
    const o = mapOf(out.lt, 64), r = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'number' && isFinite(v)) r[k] = v;
      else if (v && typeof v === 'object') r[k] = numMap(v, 32, 0, 1e9);
    }
    out.lt = r;
  }
  // Ghost pace is keyed by wave number, so junk keys are dropped rather than
  // trimmed by count, and the survivor count is capped far above a real run.
  // (pruneSave() in sv() is the emergency shredder that keeps only the last 80.)
  {
    const raw = (out.pace && typeof out.pace === 'object' && out.pace.times && typeof out.pace.times === 'object') ? out.pace.times : {};
    const rawWave = (out.pace && typeof out.pace === 'object') ? out.pace.wave : undefined;
    const keys = Object.keys(raw).filter(k => {
      const n = Number(k);
      return isFinite(n) && n >= 0 && n <= 100000;
    }).sort((a, b) => Number(a) - Number(b));
    const times = {};
    for (const k of keys.slice(-PACE_MAX)) {
      const n = num(raw[k], 0, 1e9, null);
      if (n !== null) times[k] = n;
    }
    out.pace = { times };
    if (typeof rawWave === 'number') out.pace.wave = num(rawWave, 0, 100000, 0);
  }
  // Player-chosen tint is a hex colour or nothing; the date stamps are short
  // strings. Both are read straight into DOM/style without further checking.
  out.col = (typeof out.col === 'string' && /^#[0-9a-f]{3,8}$/i.test(out.col)) ? out.col : null;
  for (const k of ['day', 'dmDate', 'lastLogin']) {
    out[k] = (typeof out[k] === 'string') ? out[k].slice(0, 64) : '';
  }
  out.eqOpSkin = (typeof out.eqOpSkin === 'string' && out.eqOpSkin.length <= 32) ? out.eqOpSkin : null;
  out.runStreak = num(out.runStreak, 0, 10000, 0);
  out.loginDays = num(out.loginDays, 1, 10, 1);
  out.ap = num(out.ap, 0, 1e6, 0);
  return out;
}

function ld() {
  let parsed = null;
  // Try the primary slot, then the backup. Reading `dzs || dzs_bak` only fell
  // back when dzs was absent; a corrupt dzs threw and the good backup was never
  // consulted, which is exactly the case the backup exists for.
  for (const key of ['dzs', 'dzs_bak']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const p = sanitizeSV(JSON.parse(raw));
      if (p) { parsed = p; break; }
    } catch (e) {}
  }
  if (parsed) SV = parsed;
  MUTE = SV.mute ? 1 : 0;
  if (SV.col) PC = SV.col;

  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
    window.Capacitor.Plugins.Preferences.get({ key: 'dzs' }).then(res => {
      if (res && res.value) {
        try {
          const nData = sanitizeSV(JSON.parse(res.value));
          const localRev = (SV.rev || 0);
          const remoteRev = (nData && nData.rev) || 0;
          const localTs = (SV.ts || 0);
          const remoteTs = (nData && nData.ts) || 0;
          if (nData && (remoteRev > localRev || (remoteRev === localRev && remoteTs > localTs))) {
            SV = nData;
            MUTE = SV.mute ? 1 : 0;
            if (SV.col) PC = SV.col;
            if (typeof lobby === 'function') lobby();
            try {
              const s = JSON.stringify(SV);
              localStorage.setItem('dzs', s);
              localStorage.setItem('dzs_bak', s);
            } catch (e) {}
          } else if (SV && localRev > remoteRev) {
            sv();
          }
        } catch (e) {}
      } else {
        sv();
      }
    }).catch(() => {});
  }
}

// A save that quietly stops persisting is worse than one that fails loudly: the
// player keeps earning for hours and finds nothing at the next launch. Anything
// over this size is pruned before the write, and a write that still fails is
// surfaced in the lobby tagline instead of being swallowed.
const SAVE_MAX_BYTES = 512 * 1024;
const PACE_KEEP = 80;
let SAVE_FAIL_LOGGED = 0;
let SAVE_TRIM_LOGGED = 0;

function pruneSave() {
  if (!SV || !SV.pace || !SV.pace.times) return false;
  const keys = Object.keys(SV.pace.times);
  if (keys.length <= PACE_KEEP) return false;
  keys.sort((a, b) => Number(a) - Number(b));
  const keep = {};
  for (const k of keys.slice(-PACE_KEEP)) keep[k] = SV.pace.times[k];
  SV.pace.times = keep;
  return true;
}

// Last resort before giving up on the write entirely: the ghost-pace line and the
// lifetime caches are the only parts of the save that grow during a session, and
// both rebuild themselves. Losing them is bad; losing every credit and unlock
// earned after this point is worse.
function dropHistory() {
  if (SV.pace) SV.pace = { times: {} };
  if (SV.lt) SV.lt = {};
}

function saveWarning() {
  return (SV && SV.saveFail) ? ' \u2022 SAVE OFFLINE' : '';
}

function sv() {
  try {
    SV.lvl = Math.max(1, Math.floor(Number(SV.lvl) || 1));
    if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();
    SV.xp = Math.max(0, Math.floor(Number(SV.xp) || 0));
    SV.cr = Math.max(0, Math.floor(Number(SV.cr) || 0));
    SV.sp = Math.max(0, Math.floor(Number(SV.sp) || 0));
    let str = JSON.stringify(SV);
    if (str.length > SAVE_MAX_BYTES && pruneSave()) str = JSON.stringify(SV);
    if (str.length > SAVE_MAX_BYTES) {
      dropHistory();
      str = JSON.stringify(SV);
      if (!SAVE_TRIM_LOGGED) {
        SAVE_TRIM_LOGGED = 1;
        try { console.warn('[dead-zone] save was oversized; run history trimmed'); } catch (_) {}
      }
    }
    // Real rolling backup: keep the previous good save as dzs_bak so a corrupt
    // write cannot take both slots down at once. It used to write the same
    // string to both keys, which made the "backup" useless.
    const prev = localStorage.getItem('dzs');
    if (prev && prev !== str) localStorage.setItem('dzs_bak', prev);
    localStorage.setItem('dzs', str);
    if (SV.saveFail) { SV.saveFail = 0; SAVE_FAIL_LOGGED = 0; }
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
      window.Capacitor.Plugins.Preferences.set({ key: 'dzs', value: str }).catch(() => {});
    }
  } catch (e) {
    SV.saveFail = 1;
    if (!SAVE_FAIL_LOGGED) {
      SAVE_FAIL_LOGGED = 1;
      try { console.warn('[dead-zone] progress could not be saved:', e && e.message ? e.message : e); } catch (_) {}
      if (typeof lobby === 'function') { try { lobby(); } catch (_) {} }
    }
  }
}

// A weapon is owned or it is not. Ownership is bought (SV.own, persisted) and
// the starter pistol is owned on every profile; account rank is only the
// *prerequisite* that makes a gun offerable in the shop (weaponRankMet).
//
// This used to hand out every gun whose WEAP_RANK the account had already
// reached. That was correct while the shop was retired - rank *was* the only
// unlock path - but the shop returned in v1.0.0 and prices the same guns, so the
// rank grant was silently bypassing every price: an account at rank 3 owned the
// SMG, the revolver and the dual pistols for free without ever visiting the
// shop, and the card's "RANK 3 UNLOCK" line read as a receipt rather than a gate.
// Ownership is now never derived from rank; only purchase writes SV.own.
function syncWeaponUnlocks() {
  if (typeof SV === 'undefined' || !SV || typeof WEAP === 'undefined') return;
  if (!Array.isArray(SV.own)) SV.own = [];
  while (SV.own.length < WEAP.length) SV.own.push(0);
  if (SV.own.length > WEAP.length) SV.own.length = WEAP.length;
  for (let i = 0; i < WEAP.length; i++) SV.own[i] = SV.own[i] ? 1 : 0;
  SV.own[0] = 1;   // the starter pistol is standard issue, never sold
}

// Rank needed before a weapon may be *acquired* (0 = no requirement). Read
// wherever ownership or purchase eligibility is decided, so the number the shop
// prints and the number the purchase checks cannot drift apart.
function weaponRankReq(i) {
  return (typeof WEAP_RANK !== 'undefined' && WEAP_RANK[i]) ? Math.max(0, WEAP_RANK[i]) : 0;
}
function weaponRankMet(i) {
  if (!i) return true;
  const lvl = (typeof SV !== 'undefined' && SV && SV.lvl) ? SV.lvl : 1;
  return lvl >= weaponRankReq(i);
}
function weaponOwned(i) {
  return Boolean(typeof SV !== 'undefined' && SV && SV.own && SV.own[i]);
}

function need(l) { return 100 + l * 50; }
function rneed(l) { return Math.round(55 + l * 32 + Math.pow(l, 1.35) * 10); }

function applySV() {
  if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();
  const cl = (typeof CL !== 'undefined' && CL[SV.cls || 0]) ? CL[SV.cls || 0] : (CL ? CL[0] : { hp: 100, dm: 1 });
  if (typeof SK !== 'undefined' && SK.dash) {
    SK.dash.max = SV.cls === 2 ? 2 : 3;
  }
  if (typeof P !== 'undefined') {
    P.mx = cl.hp + 4 * (SV.lvl - 1) + (SV.hu || 0) * 10 + (SV.mx || 0) * 10; // 'Max Health' stat + 'Vitality' skill
    P.hp = P.mx;
    // The run arsenal mirrors ownership exactly, in both directions: only
    // setting the owned entries to 1 would let a weapon granted mid-run by an
    // operation leak into the next run's picker.
    WEAP.forEach((w, i) => { P.w[i] = (SV.own && SV.own[i]) ? 1 : 0; });
    P.cur = (SV.own && SV.own[SV.start]) ? SV.start : 0;
    P.maxAmmo = WEAP[P.cur].mag || 12;
    P.ammo = P.maxAmmo;
    P.reloading = false;
    P.recoil = 0;
  }
  if (typeof S !== 'undefined' && S) {
    S.dm = (1 + 0.02 * (SV.lvl - 1) + (SV.du || 0) * 0.05 + (SV.dm || 0) * 0.05) * cl.dm; // 'Damage Output' stat + 'Firepower' skill
    S.gr = 5 + (SV.gu || 0) * 2;
    S.cm = 1 + 0.10 * (SV.cb || 0);              // Scavenger: +10% credits per rank
    S.stCash = (SV.sc || 0) * 50;                // Starting Cash stat: +$50 per wave (S.sc is reserved for the Storm Caller perk)
    S.ls = (S.ls || 0) + 0.5 * (SV.vamp || 0);   // Life Leech: +0.5 HP per kill per rank
  }
  if (Array.isArray(SV.eq)) {
    SV.eq.forEach(i => { if (AR[i] && AR[i][3]) AR[i][3](); });
  }
}
