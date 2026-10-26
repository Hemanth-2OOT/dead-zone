// DEAD ZONE v2.9.0 - SAVE PERSISTENCE & DATA PIPELINE
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
  fireMode: 'aim',
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
  out.lvl = Math.max(1, Math.floor(Number(out.lvl) || 1));
  out.xp = Math.max(0, Math.floor(Number(out.xp) || 0));
  out.cr = Math.max(0, Math.floor(Number(out.cr) || 0));
  out.sp = Math.max(0, Math.floor(Number(out.sp) || 0));
  out.best = Math.max(0, Math.floor(Number(out.best) || 0));
  // Skill-tree ranks and loadout indices: a corrupt or hand-edited save must
  // never be able to inject NaN/Infinity into P.mx, S.dm or the crit roll.
  const RANKS = ['mx', 'spd', 'dm', 'rof', 'crit', 'vamp', 'regen', 'cb', 'xpb', 'hu', 'du', 'gu', 'sc', 'shadows', 'luck', 'mute'];
  for (const k of RANKS) out[k] = Math.max(0, Math.min(999, Math.floor(Number(out[k]) || 0)));
  // Control and comfort preferences. Clamped rather than trusted: a corrupt save
  // must not be able to hand ctlScale() a NaN (which would place every control at
  // NaN) or push the control size off the screen.
  out.ctlSize = Math.max(0.8, Math.min(1.3, Number(out.ctlSize) || 1));
  out.ctlOpacity = Math.max(0.35, Math.min(1, Number(out.ctlOpacity) || 1));
  out.ctlMode = out.ctlMode === 'floating' ? 'floating' : 'fixed';
  out.fireMode = out.fireMode === 'button' ? 'button' : 'aim';
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
  if (!Array.isArray(out.ucl)) out.ucl = [1];
  out.ucl[0] = 1;
  if (!Array.isArray(out.ar)) out.ar = [];
  if (!Array.isArray(out.eq)) out.eq = [];
  if (typeof out.map !== 'number' || out.map < 0 || out.map >= MP.length) out.map = 0;
  if (typeof out.ap !== 'number') out.ap = 0;
  out.v = 3;
  if (!out.skins || typeof out.skins !== 'object') out.skins = { default: 1 };
  if (!out.eqSkin || typeof out.eqSkin !== 'object') out.eqSkin = {};
  if (!out.evDone || typeof out.evDone !== 'object') out.evDone = {};
  if (!out.dailyMissions || typeof out.dailyMissions !== 'object') out.dailyMissions = {};
  if (!out.loginClaimed || typeof out.loginClaimed !== 'object') out.loginClaimed = {};
  if (!out.rankClaimed || typeof out.rankClaimed !== 'object') out.rankClaimed = {};
  if (!out.mast || typeof out.mast !== 'object') out.mast = {};
  if (!out.ach || typeof out.ach !== 'object') out.ach = {};
  if (!out.lt || typeof out.lt !== 'object') out.lt = {};
  if (!out.pace || typeof out.pace !== 'object') out.pace = { times: {} };
  if (!out.pace.times || typeof out.pace.times !== 'object') out.pace.times = {};
  if (!out.asc || typeof out.asc !== 'object') out.asc = {};
  out.runStreak = Math.max(0, Math.floor(Number(out.runStreak) || 0));
  out.loginDays = Math.max(1, Math.min(10, Math.floor(Number(out.loginDays) || 1)));
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

function sv() {
  try {
    SV.lvl = Math.max(1, Math.floor(Number(SV.lvl) || 1));
    if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();
    SV.xp = Math.max(0, Math.floor(Number(SV.xp) || 0));
    SV.cr = Math.max(0, Math.floor(Number(SV.cr) || 0));
    SV.sp = Math.max(0, Math.floor(Number(SV.sp) || 0));
    const str = JSON.stringify(SV);
    // Real rolling backup: keep the previous good save as dzs_bak so a corrupt
    // write cannot take both slots down at once. It used to write the same
    // string to both keys, which made the "backup" useless.
    const prev = localStorage.getItem('dzs');
    if (prev && prev !== str) localStorage.setItem('dzs_bak', prev);
    localStorage.setItem('dzs', str);
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
      window.Capacitor.Plugins.Preferences.set({ key: 'dzs', value: str }).catch(() => {});
    }
  } catch (e) {}
}

// Guns are unlocked by account rank rather than bought, so ownership is
// re-derived from the rank on every load and save. Folding it into the existing
// SV.own flags keeps every other reader of SV.own working unchanged.
function syncWeaponUnlocks() {
  if (typeof SV === 'undefined' || !SV || typeof WEAP === 'undefined') return;
  if (!SV.own || !SV.own.length) SV.own = WEAP.map((_, i) => (i === 0 ? 1 : 0));
  const rank = SV.lvl || 1;
  for (let i = 0; i < WEAP.length; i++) {
    if (!SV.own[i] && rank >= (WEAP_RANK[i] || 0)) SV.own[i] = 1;
  }
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
    WEAP.forEach((w, i) => { if (SV.own && SV.own[i]) P.w[i] = 1; });
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
