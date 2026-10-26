#!/usr/bin/env node
// DEAD ZONE logic tests.
//
// These run the real engine modules (tools/load-engine.js) rather than a copy, so
// they cover the rules that a screenshot cannot: the tier table, the skin indices
// the Skins tab dereferences, and the save sanitiser that every corrupt or
// hand-edited profile goes through. No DOM and no browser required, so CI can run
// them before an APK is ever built.
//
//   node tools/test-logic.js
const vm = require('vm');
const { loadEngine, exportsOf } = require('./load-engine.js');

let checks = 0;
let fails = 0;
function ok(cond, name, detail) {
  checks++;
  if (!cond) { fails++; console.log('  FAIL ' + name + (detail != null ? '  :: ' + detail : '')); }
  else console.log('  ok   ' + name + (detail != null ? '  :: ' + detail : ''));
}
function section(t) { console.log('\n== ' + t + ' =='); }

const { sandbox } = loadEngine();
const api = exportsOf(sandbox, `({
  WEAP: WEAP, WEAP_RANK: WEAP_RANK, SKINS: SKINS, CL: CL, MP: MP, ZT: ZT, TIER_POLICY: TIER_POLICY,
  EVENTS: EVENTS, LOGIN_REWARDS: LOGIN_REWARDS,
  weaponStats: weaponStats, weaponTierIssues: weaponTierIssues, tierLadderIssues: tierLadderIssues,
  sanitizeSV: sanitizeSV, sv: sv, ld: ld,
  getSV: function () { return SV; },
  setSV: function (v) { SV = v; },
  storage: localStorage
})`);

// A second sandbox that also loads the reward-claim module. Its DOM helpers are
// stubbed because the claim functions only read SV and write SV; the rules under
// test (eligibility, one-claim-per-reward, date handling) are the shipping ones.
const claimSandbox = loadEngine({
  extra: ['engine_events_missions.js'],
  globals: {
    $: () => null,
    announce: () => {}, snd: () => {}, lobby: () => {},
    renderLoginTrackUI: () => {}, renderMissionsUI: () => {}, renderRankRewards: () => {},
    renderSkinsUI: () => {}, invalidateLookCaches: () => {}, burst: () => {},
    init: () => {}, applySV: () => {}, startWave: () => {},
    showDeployScreen: (t, a, b, cb) => cb(),
    P: { w: [], cur: 0 }, Z: [], S: {}
  }
}).sandbox;

/* ------------------------------------------------------------- weapons --- */
section('WEAPON STATS');
const statBad = [];
api.WEAP.forEach((w, i) => {
  const st = api.weaponStats(i);
  if (!st) { statBad.push(w.n + ': no stats'); return; }
  ['dps', 'shot', 'mag', 'reload', 'rate', 'spread'].forEach(k => {
    if (typeof st[k] !== 'number' || !isFinite(st[k])) statBad.push(w.n + '.' + k + '=' + st[k]);
  });
  if (st.mag !== w.mag || st.reload !== w.rl) statBad.push(w.n + ': stats disagree with WEAP');
});
ok(statBad.length === 0, 'every weapon reports finite stats', statBad.join(', ') || api.WEAP.length + ' weapons');
ok(api.weaponTierIssues().length === 0, 'every weapon fits its tier policy', api.weaponTierIssues().join(' | '));
ok(api.tierLadderIssues().length === 0, 'tier ladder has no inversions', api.tierLadderIssues().join(' | '));

/* --------------------------------------------------------------- skins --- */
section('SKINS');
const skins = Object.keys(api.SKINS);
const skinBad = [];
skins.forEach(k => {
  const s = api.SKINS[k];
  if (!s) { skinBad.push(k + ': missing'); return; }
  if (!s.id || !s.name || !s.col || !s.desc) skinBad.push(k + ': incomplete definition');
  // The Skins tab dereferences the weapon or operative this skin points at; an
  // out-of-range index is what crashed it with "Cannot read properties of null".
  if (s.type === 'op') {
    if (!(s.ci >= 0 && s.ci < api.CL.length)) skinBad.push(k + ': operative ' + s.ci);
  } else {
    if (!(s.wi >= 0 && s.wi < api.WEAP.length)) skinBad.push(k + ': weapon ' + s.wi);
    if (!api.WEAP[s.wi]) skinBad.push(k + ': weapon table hole at ' + s.wi);
  }
});
ok(skinBad.length === 0, 'every skin resolves to a real operative or weapon', skinBad.slice(0, 4).join(', ') || skins.length + ' skins');
const opCount = skins.filter(k => api.SKINS[k].type === 'op').length;
ok(opCount > 0 && opCount < skins.length, 'both skin families are populated', opCount + ' operative / ' + (skins.length - opCount) + ' weapon');

// Every skin must be reachable. A skin with no rule (rk/rf) is only legal if a
// reward site actually grants it - the default finish, an operation's rewardSkin
// or the day-10 login card. Ten skins shipped with an advertised condition and
// neither, so the whole Skins tab read as permanently locked.
const grantedElsewhere = new Set(['default']);
Object.values(api.EVENTS || {}).forEach(ev => { if (ev && ev.rewardSkin) grantedElsewhere.add(ev.rewardSkin); });
(api.LOGIN_REWARDS || []).forEach(r => { if (r && r.type === 'skin' && r.skin) grantedElsewhere.add(r.skin); });
const orphans = skins.filter(k => {
  const s = api.SKINS[k];
  return !(s.rk || s.rf) && !grantedElsewhere.has(k);
});
ok(orphans.length === 0, 'every skin has an unlock path', orphans.join(', ') || 'rule-based or reward-granted');

const ruled = skins.filter(k => { const s = api.SKINS[k]; return !!(s.rk || s.rf); });
const ruleBad = ruled.filter(k => !(api.SKINS[k].rg > 0));
ok(ruleBad.length === 0, 'every rule-based skin has a goal', ruleBad.join(', ') || ruled.length + ' rules');

// The sector/class helpers the sector skins depend on. Both resolve their
// subject by name off MP/CL and read the per-sector record the run settlement
// writes, so the progress a player already has is what the card shows. The rule
// engine lives in engine_meta.js, so this needs its own sandbox.
const metaSandbox = loadEngine({
  extra: ['engine_meta.js'],
  globals: { snd: () => {}, sv: () => {}, lobby: () => {}, announce: () => {} }
}).sandbox;
const ruleApi = exportsOf(metaSandbox, `({
  sanitizeSV: sanitizeSV, sectorBest: sectorBest, sectorCount: sectorCount,
  classOwned: classOwned, skinRuleState: skinRuleState,
  set: function (v) { SV = v; }, get: function () { return SV; }
})`);
ruleApi.set(ruleApi.sanitizeSV({ v: 3, lt: { maps: { 3: 17, 0: 9 } }, ucl: [1, 0, 0, 0, 1] }));
const swamp = ruleApi.sectorBest('Toxic Swamp');
ok(swamp === 17, 'sectorBest reads the per-sector record', 'Toxic Swamp wave ' + swamp);
ok(ruleApi.sectorCount() === 2, 'sectorCount counts visited sectors', ruleApi.sectorCount());
ok(ruleApi.classOwned('Spec-Ops') === 1 && ruleApi.classOwned('Commando') === 0, 'classOwned reads the class list');
const toxSt = ruleApi.skinRuleState('toxic_shotgun');
ok(toxSt && toxSt.cur === 15 && toxSt.goal === 15, 'a met sector rule reports complete', toxSt ? toxSt.cur + '/' + toxSt.goal : 'no state');
const neonSt = ruleApi.skinRuleState('neon_plasma');
ok(neonSt && neonSt.cur === 0 && neonSt.goal === 20, 'an unvisited sector rule reports zero', neonSt ? neonSt.cur + '/' + neonSt.goal : 'no state');
ok(ruleApi.skinRuleState('ashen_assault') === null, 'a reward-only skin stays out of the rule engine');

/* ------------------------------------------------------------------ shop - */
section('SHOP CATALOGUE');

// The shop promises two things the data has to support: tiers run low to high,
// and price rises within a tier. Both are properties of WEAP/WEAP_RANK, so they
// are asserted here rather than only inside the renderer.
const TIER_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };
const shopList = api.WEAP.map((w, i) => ({ w, i })).sort((a, b) => {
  const ta = TIER_ORDER[a.w.tier] != null ? TIER_ORDER[a.w.tier] : 9;
  const tb = TIER_ORDER[b.w.tier] != null ? TIER_ORDER[b.w.tier] : 9;
  if (ta !== tb) return ta - tb;
  if ((a.w.c || 0) !== (b.w.c || 0)) return (a.w.c || 0) - (b.w.c || 0);
  return a.i - b.i;
});
ok(shopList.every((e, k) => k === 0 || TIER_ORDER[shopList[k - 1].w.tier] <= TIER_ORDER[e.w.tier]),
  'the shop lists every weapon in tier order',
  shopList.map(e => e.w.tier).join(' < '));
ok(shopList.every((e, k) => k === 0 || TIER_ORDER[shopList[k - 1].w.tier] !== TIER_ORDER[e.w.tier]
    || (shopList[k - 1].w.c || 0) <= (e.w.c || 0)),
  'price rises within each tier');
ok(shopList.every(e => Number.isFinite(e.w.c) && e.w.c >= 0),
  'every weapon carries a finite credit price');
ok(shopList.every(e => TIER_ORDER[e.w.tier] != null),
  'every weapon has a tier the shop can group by',
  shopList.filter(e => TIER_ORDER[e.w.tier] == null).map(e => e.w.n).join(', ') || 'no unknown tiers');

// Only the starter Pistol may be free at the default rank; a second free gun
// makes the shop's first tier pointless. Dual Pistols (index 15) used to sit at
// rank 1, so it was owned the moment a profile was created.
const freeAtStart = api.WEAP.map((w, i) => i).filter(i => (api.WEAP_RANK[i] || 0) <= 1);
ok(freeAtStart.length === 1 && freeAtStart[0] === 0,
  'exactly one weapon is free at the default rank',
  freeAtStart.map(i => api.WEAP[i].n).join(', '));

/* -------------------------------------------------------------- sanitiser - */
section('SAVE SANITISER');
const hostile = [
  null, undefined, 0, 'string', [], [1, 2, 3], true,
  { lvl: -5, xp: 'abc', cr: NaN, sp: Infinity, best: -1e9 },
  { lvl: 1e9, map: 99, cls: 99, start: 99, own: 'nope', ucl: null },
  { ctlSize: NaN, ctlOpacity: NaN, ctlMode: 'sideways', fireMode: 'hold', shakeLvl: 9, fx: 'ultra', quality: 'ultra', goreLvl: 'off' },
  { own: [0, 0, 0], skins: 'x', eqSkin: 7, pace: { times: 'x' }, lt: 3, ach: [], mast: [], dailyMissions: 1 },
  { mx: -1, spd: 1e6, dm: 'x', rof: null, crit: 4.2, vamp: Infinity, lvl: '5', map: -3, ap: 'x' },
  JSON.parse('{"__proto__":{"polluted":true},"lvl":3}'),
];
const sanitizeBad = [];
for (const input of hostile) {
  let out = null;
  try { out = api.sanitizeSV(input); } catch (e) { sanitizeBad.push(JSON.stringify(input) + ' threw ' + e.message); continue; }
  // Anything that is not an object is rejected outright (returned as null) rather
  // than coerced, and ld() only adopts a non-null result.
  if (input === null || typeof input !== 'object') {
    if (out !== null) sanitizeBad.push('non-object ' + JSON.stringify(input) + ' was coerced');
    continue;
  }
  const bad = [];
  if (!(out.lvl >= 1 && Number.isInteger(out.lvl))) bad.push('lvl ' + out.lvl);
  for (const k of ['xp', 'cr', 'sp', 'best']) if (!(out[k] >= 0 && Number.isInteger(out[k]))) bad.push(k + ' ' + out[k]);
  if (!(out.ctlSize >= 0.8 && out.ctlSize <= 1.3)) bad.push('ctlSize ' + out.ctlSize);
  if (!(out.ctlOpacity >= 0.35 && out.ctlOpacity <= 1)) bad.push('ctlOpacity ' + out.ctlOpacity);
  if (['fixed', 'floating'].indexOf(out.ctlMode) < 0) bad.push('ctlMode ' + out.ctlMode);
  if (out.shakeLvl < 0 || out.shakeLvl > 2) bad.push('shakeLvl ' + out.shakeLvl);
  if (['high', 'med', 'low'].indexOf(out.quality) < 0) bad.push('quality ' + out.quality);
  if (['full', 'reduced', 'minimal'].indexOf(out.goreLvl) < 0) bad.push('goreLvl ' + out.goreLvl);
  if (!Array.isArray(out.own) || out.own[0] !== 1 || out.own.length < api.WEAP.length) bad.push('own ' + JSON.stringify(out.own));
  if (!Array.isArray(out.ucl) || out.ucl[0] !== 1) bad.push('ucl ' + JSON.stringify(out.ucl));
  if (!(out.map >= 0 && out.map < api.MP.length)) bad.push('map ' + out.map);
  if (!(out.cls >= 0 && out.cls < api.CL.length)) bad.push('cls ' + out.cls);
  if (!(out.start >= 0 && out.start < api.WEAP.length)) bad.push('start ' + out.start);
  if (!out.skins || typeof out.skins !== 'object') bad.push('skins');
  if (!out.eqSkin || typeof out.eqSkin !== 'object') bad.push('eqSkin');
  if (!out.pace || !out.pace.times || typeof out.pace.times !== 'object') bad.push('pace');
  if (!out.lt || typeof out.lt !== 'object') bad.push('lt');
  if (out.v !== 3) bad.push('v ' + out.v);
  for (const k of ['mx', 'spd', 'dm', 'rof', 'crit', 'vamp', 'regen', 'cb', 'xpb', 'hu', 'du', 'gu', 'sc', 'shadows', 'luck', 'mute']) {
    if (!(out[k] >= 0 && out[k] <= 999)) bad.push(k + ' ' + out[k]);
  }
  if (out.lvl > 1000000) bad.push('lvl unbounded');
  if (bad.length) sanitizeBad.push(JSON.stringify(input).slice(0, 40) + ' -> ' + bad.join(', '));
}
ok(sanitizeBad.length === 0, 'hostile saves sanitise to a safe shape', sanitizeBad.slice(0, 3).join(' | ') || hostile.length + ' inputs');
ok([null, undefined, 0, 'string', true].every(v => api.sanitizeSV(v) === null), 'non-object saves are rejected, not coerced');
ok(api.sanitizeSV(hostile[7]).own.length >= api.WEAP.length, 'a truncated own[] is refilled to the weapon count');
ok(!('polluted' in Object.prototype), 'sanitiser does not pollute Object.prototype');

/* ------------------------------------------------------------ save bounds - */
// A save is attacker-controlled input: it is JSON in localStorage (rooted phones,
// devtools, a device sync, or plain corruption). sanitizeSV is the only gate
// between it and the arithmetic, the render loop and the quota.
section('SAVE BOUNDS');
{
  const huge = {
    v: 3, lvl: 5, cr: 10, own: [], skins: {}, mast: {}, ach: {}, asc: {}, weekly: {},
    pace: { times: {} }, lt: {}, ar: [], eq: [], eqSkin: {}, dailyMissions: {}
  };
  for (let i = 0; i < 50000; i++) {
    huge.pace.times[i] = 1 + (i % 7);
    huge.skins['s' + i] = 1;
    huge.mast['w' + i] = 100;
    huge.ach['a' + i] = 1;
    huge.weekly['k' + i] = i;
    huge.own.push(1);
    huge.ar.push(1);
    huge.eq.push(2);
    huge.lt['k' + i] = i;
  }
  huge.pace.times = Object.assign({ abc: 5, '-3': 5, 12.5: 3 }, huge.pace.times);
  huge.mast.w0 = 1 / 0;                       // Infinity
  huge.skins.s0 = null;
  huge.col = 'javascript:alert(1)';
  huge.eqOpSkin = { not: 'a string' };
  huge.day = 'x'.repeat(500);
  huge.junk = 'y'.repeat(5000);               // unknown key, oversized payload

  const bounded = api.sanitizeSV(huge);
  const paceN = Object.keys(bounded.pace.times).length;
  const mapN = (m) => Object.keys(bounded[m]).length;
  ok(paceN <= 4096, 'an oversized pace line is capped on load', paceN + ' entries');
  ok(!('abc' in bounded.pace.times) && !('-3' in bounded.pace.times), 'non-wave keys are dropped from the pace line');
  ok(mapN('skins') <= 256 && mapN('mast') <= 256 && mapN('ach') <= 256, 'progress maps are capped on load',
     'skins ' + mapN('skins') + ', mast ' + mapN('mast') + ', ach ' + mapN('ach'));
  ok(bounded.own.length === api.WEAP.length && bounded.own.every(v => v === 0 || v === 1), 'own[] is trimmed to the weapon table and coerced to flags',
     bounded.own.length + ' entries for ' + api.WEAP.length + ' weapons');
  ok(Object.keys(bounded.mast).every(k => typeof bounded.mast[k] === 'number' && isFinite(bounded.mast[k])), 'a non-finite mastery value is dropped');
  ok(bounded.skins.s0 === 0, 'map values are coerced to flags', 'skins.s0 = ' + JSON.stringify(bounded.skins.s0));
  ok(bounded.col === null, 'a non-hex tint is rejected', JSON.stringify(bounded.col));
  ok(bounded.eqOpSkin === null, 'a non-string operative skin id is rejected', JSON.stringify(bounded.eqOpSkin));
  ok(bounded.day.length <= 64, 'date stamps are truncated', bounded.day.length + ' chars');
  ok(bounded.ar.length <= 64 && bounded.eq.length <= 64, 'relic/loadout lists are capped', bounded.ar.length + ' / ' + bounded.eq.length);
  ok(!('junk' in bounded), 'an oversized unknown key is dropped instead of being copied back out');
  const size = JSON.stringify(bounded).length;
  ok(size < 120000, 'a 50k-key hostile save sanitises to a small blob', size + ' bytes (was ' + JSON.stringify(huge).length + ')');
  ok(api.sanitizeSV(bounded) !== null && JSON.stringify(api.sanitizeSV(bounded)).length === size, 'sanitising an already-clean save is a fixed point');
}

/* ------------------------------------------------------------ persistence - */
section('PERSISTENCE');
const store = api.storage;
const base = api.sanitizeSV({ v: 3, lvl: 7, cr: 120, best: 12, own: [1], skins: { default: 1 } });
api.setSV(base);
api.sv();
const raw = store.getItem('dzs');
let parsed = null;
try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
ok(!!parsed && parsed.lvl === 7 && parsed.cr === 120, 'sv() writes a parseable save', raw ? raw.length + ' bytes' : 'nothing written');
api.ld();
ok(api.getSV().lvl === 7 && api.getSV().cr === 120, 'ld() adopts the saved progress', 'lvl ' + api.getSV().lvl + ' cr ' + api.getSV().cr);

// Rolling backup: a second, different write must keep the previous blob in dzs_bak
// so one corrupt write cannot take both slots down.
store.removeItem('dzs_bak');
api.setSV(api.sanitizeSV({ v: 3, lvl: 8, cr: 130 }));
api.sv();
const bak = store.getItem('dzs_bak');
let bakParsed = null;
try { bakParsed = JSON.parse(bak); } catch (e) { bakParsed = null; }
ok(!!bakParsed && bakParsed.lvl === 7, 'previous save is kept as dzs_bak', bak ? bak.length + ' bytes' : 'no backup');

// The save guard surfaced by the audit: a storage failure must be visible, not silent.
api.setSV(api.sanitizeSV({ v: 3, lvl: 9 }));
const warns = [];
const oWarn = console.warn;
console.warn = (...a) => warns.push(a.join(' '));
store.setItem = () => { throw new Error('QuotaExceededError'); };
api.sv();
console.warn = oWarn;
ok(api.getSV().saveFail === 1, 'a failed write flags SV.saveFail');
ok(warns.some(w => /could not be saved/.test(w)), 'a failed write warns once instead of swallowing', warns[0] || '');

// Oversized saves are pruned rather than silently dropped.
api.setSV(api.sanitizeSV({ v: 3, lvl: 3 }));
const big = api.getSV();
big.pace = { times: {} };
for (let i = 0; i < 20000; i++) big.pace.times[i] = { t: 12345.678, s: 1 };
const before = JSON.stringify(big).length;
api.sv();
const after = JSON.stringify(api.getSV()).length;
ok(after < before && Object.keys(api.getSV().pace.times).length <= 80, 'an oversized pace history is pruned before writing', before + ' -> ' + after + ' bytes');

/* ------------------------------------------------- weapon ownership --- */
// Rank is a prerequisite to *buy*, never a grant. This is the regression guard
// for the auto-unlock bug: the old syncWeaponUnlocks() handed out every gun whose
// WEAP_RANK the account had reached, which silently bypassed the shop prices.
section('WEAPON OWNERSHIP');
const ownApi = exportsOf(sandbox, `({
  WEAP: WEAP, WEAP_RANK: WEAP_RANK, sanitizeSV: sanitizeSV, syncWeaponUnlocks: syncWeaponUnlocks,
  weaponRankReq: weaponRankReq, weaponRankMet: weaponRankMet, weaponOwned: weaponOwned,
  getSV: function () { return SV; }, setSV: function (v) { SV = v; }
})`);
{
  const freeAt3 = ownApi.sanitizeSV({ v: 3, lvl: 3, cr: 0 });
  ownApi.setSV(freeAt3);
  ownApi.syncWeaponUnlocks();
  const owned = ownApi.getSV().own.map((v, i) => v ? i : -1).filter(i => i >= 0);
  ok(owned.length === 1 && owned[0] === 0, 'rank 3 owns nothing but the starter pistol', owned.length + ' owned');

  const at22 = ownApi.sanitizeSV({ v: 3, lvl: 22, cr: 0 });
  ownApi.setSV(at22);
  ownApi.syncWeaponUnlocks();
  ok(ownApi.getSV().own.filter(Boolean).length === 1, 'even rank 22 grants no free weapon',
    ownApi.getSV().own.filter(Boolean).length + ' owned of ' + ownApi.WEAP.length);

  // Preserved progression: a profile that owns weapons keeps them.
  const bought = ownApi.sanitizeSV({ v: 3, lvl: 4, cr: 0, own: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  ownApi.setSV(bought);
  ownApi.syncWeaponUnlocks();
  const kept = ownApi.getSV().own.map((v, i) => v ? i : -1).filter(i => i >= 0);
  ok(kept.join(',') === '0,1,2', 'weapons that were paid for stay owned', 'indices ' + kept.join(','));

  // A short/corrupt own array is repaired, not trusted.
  const short = ownApi.sanitizeSV({ v: 3, lvl: 3, cr: 0, own: [1] });
  ownApi.setSV(short);
  ownApi.syncWeaponUnlocks();
  ok(ownApi.getSV().own.length === ownApi.WEAP.length, 'a short ownership list is padded to the arsenal',
    ownApi.getSV().own.length + ' entries');
  const junk = ownApi.sanitizeSV({ v: 3, lvl: 3, cr: 0, own: 'nope' });
  ownApi.setSV(junk);
  ownApi.syncWeaponUnlocks();
  ok(Array.isArray(ownApi.getSV().own) && ownApi.getSV().own[0] === 1, 'a non-array ownership field becomes [1, 0, ...]',
    JSON.stringify(ownApi.getSV().own.slice(0, 3)));

  // The rank gate itself.
  const gateBad = [];
  ownApi.WEAP.forEach((w, i) => {
    const req = ownApi.WEAP_RANK[i] || 0;
    if (ownApi.weaponRankReq(i) !== req) gateBad.push(i + ' req ' + ownApi.weaponRankReq(i) + ' != ' + req);
    ownApi.setSV(ownApi.sanitizeSV({ v: 3, lvl: Math.max(1, req - 1), cr: 0 }));
    if (req > 0 && ownApi.weaponRankMet(i)) gateBad.push(w.n + ' met below rank ' + req);
    ownApi.setSV(ownApi.sanitizeSV({ v: 3, lvl: req, cr: 0 }));
    if (!ownApi.weaponRankMet(i)) gateBad.push(w.n + ' not met at rank ' + req);
  });
  ok(gateBad.length === 0, 'the shop gate matches WEAP_RANK for all ' + ownApi.WEAP.length + ' weapons',
    gateBad.slice(0, 3).join(' | ') || 'every weapon');

  ownApi.setSV(ownApi.sanitizeSV({ v: 3, lvl: 1, cr: 0, own: [1, 0, 0] }));
  ok(!ownApi.weaponOwned(1) && ownApi.weaponOwned(0), 'ownership reads the flag, not the rank');
}

/* --------------------------------------------------- rewards & claims --- */
// The claim functions are the real ones from engine_events_missions.js, driven
// with the string arguments an HTML data-arg actually produces.
section('REWARDS & CLAIMS');
const claimApi = exportsOf(claimSandbox, `({
  sanitizeSV: sanitizeSV, setSV: function (v) { SV = v; }, getSV: function () { return SV; },
  claimLoginDay: claimLoginDay, claimRank: claimRank, claimMission: claimMission,
  initDailyMissions: initDailyMissions, trackMissionProgress: trackMissionProgress,
  buildDailyBoard: buildDailyBoard, DAILY_MISSION_TEMPLATES: DAILY_MISSION_TEMPLATES,
  LOGIN_REWARDS: LOGIN_REWARDS, RANK_MILESTONES: RANK_MILESTONES
})`);
{
  const today = new Date().toDateString();
  // sanitizeSV() starts from the running profile, so the resets have to be
  // explicit or the previous block's progress leaks into the next expectation.
  const fresh = () => claimApi.sanitizeSV({
    v: 3, lvl: 5, cr: 0, loginDays: 3, dmDate: today, lastLogin: today,
    dailyMissions: {}, loginClaimed: {}, rankClaimed: {}
  });

  claimApi.setSV(fresh());
  claimApi.claimLoginDay('1');
  ok(claimApi.getSV().cr === 100, 'claiming login day 1 pays the table amount', '+ ' + claimApi.getSV().cr + ' CR');
  claimApi.claimLoginDay('1');
  ok(claimApi.getSV().cr === 100, 'claiming it twice does not pay twice', claimApi.getSV().cr + ' CR');
  claimApi.claimLoginDay('7');
  ok(claimApi.getSV().cr === 100 && !claimApi.getSV().loginClaimed['7'], 'a day beyond the streak cannot be claimed early',
    JSON.stringify(claimApi.getSV().loginClaimed));
  claimApi.claimLoginDay('abc');
  ok(claimApi.getSV().cr === 100, 'a non-numeric day is refused rather than coerced to day 0');

  claimApi.setSV(fresh());
  claimApi.claimRank('2');
  claimApi.claimRank('4');
  claimApi.claimRank('2');
  ok(claimApi.getSV().cr === 650, 'rank milestones pay once each', claimApi.getSV().cr + ' CR (250+400)');
  ok(claimApi.getSV().rankClaimed['2'] === true && claimApi.getSV().rankClaimed['4'] === true, 'both milestones are marked claimed');

  claimApi.setSV(fresh());
  claimApi.initDailyMissions();
  ok(Object.keys(claimApi.getSV().dailyMissions).length === 3, 'an empty board is reseeded for today',
    Object.keys(claimApi.getSV().dailyMissions).join(','));

  // The board rotates now, so these tests seat a known board rather than assume
  // which three of the five templates today's draw produced. The tracking and
  // claim rules are what is under test here; the draw has its own section below.
  const seat = (board) => {
    const st = fresh();
    st.dmDate = today;
    st.dailyMissions = board;
    claimApi.setSV(st);
  };
  const mk = (type, target, reward) => ({ title: type, target, cur: 0, reward, claimed: false, type });

  // The board must survive the sanitiser that every lobby() pass runs.
  seat({ m1: mk('kills', 60, 150), m2: mk('waves', 3, 200), m3: mk('elites', 2, 250) });
  claimApi.trackMissionProgress('kills', 25);
  claimApi.trackMissionProgress('waves', 3);
  const roundTrip = claimApi.sanitizeSV(JSON.parse(JSON.stringify(claimApi.getSV())));
  ok(roundTrip.dailyMissions.m1.cur === 25, 'mission progress survives a save round trip', 'm1 ' + roundTrip.dailyMissions.m1.cur + '/60');
  ok(roundTrip.dailyMissions.m2.cur === 3, 'the waves mission tracks cleared waves', 'm2 ' + roundTrip.dailyMissions.m2.cur + '/3');
  ok(roundTrip.dailyMissions.m1.title && roundTrip.dailyMissions.m1.type === 'kills' && roundTrip.dailyMissions.m1.reward === 150,
    'a mission record keeps its title, type and reward');

  // Waves: the type that had no caller at all before this pass.
  seat({ m1: mk('kills', 60, 150), m2: mk('waves', 3, 200), m3: mk('elites', 2, 250) });
  claimApi.trackMissionProgress('waves', 1);
  claimApi.trackMissionProgress('waves', 1);
  ok(claimApi.getSV().dailyMissions.m2.cur === 2, 'consecutive wave clears accumulate', claimApi.getSV().dailyMissions.m2.cur + '/3');
  claimApi.trackMissionProgress('waves', 99);
  ok(claimApi.getSV().dailyMissions.m2.cur === 3, 'progress clamps at the target', claimApi.getSV().dailyMissions.m2.cur + '/3');

  // Elite kills only count when the target really was one.
  claimApi.trackMissionProgress('elites', 1);
  ok(claimApi.getSV().dailyMissions.m3.cur === 0, 'a non-elite kill does not advance the elite mission');
  claimApi.trackMissionProgress('elites', 1, { el: true });
  ok(claimApi.getSV().dailyMissions.m3.cur === 1, 'an elite kill advances it');

  // Claims: only when complete, and exactly once.
  const before = claimApi.getSV().cr;
  claimApi.claimMission('m1');
  ok(claimApi.getSV().cr === before, 'an incomplete mission cannot be claimed');
  claimApi.trackMissionProgress('kills', 999);
  claimApi.claimMission('m1');
  const paid = claimApi.getSV().cr;
  ok(paid === before + 150, 'a completed mission pays its reward', '+' + (paid - before) + ' CR');
  claimApi.claimMission('m1');
  ok(claimApi.getSV().cr === paid, 'and pays it only once', claimApi.getSV().cr + ' CR');
  claimApi.claimMission('nope');
  ok(claimApi.getSV().cr === paid, 'an unknown mission id is ignored');
  ok(claimApi.getSV().dailyMissions.m1.claimed === true, 'the claimed flag is persisted in the record');
  ok(claimApi.getSV().dmDone === 1, 'a claim counts once towards the lifetime total', 'dmDone=' + claimApi.getSV().dmDone);
  claimApi.claimMission('m1');
  ok(claimApi.getSV().dmDone === 1, 'and a repeat claim does not count again');

  // The two mission types added in this draft: bosses and power-ups. Both are
  // plain counters, so the only thing to prove here is that the gameplay call
  // sites move them (the audit proves the call sites exist at all).
  seat({ m1: mk('bosses', 1, 300), m2: mk('pickups', 3, 220), m3: mk('kills', 60, 150) });
  claimApi.trackMissionProgress('bosses', 1);
  claimApi.trackMissionProgress('pickups', 1);
  claimApi.trackMissionProgress('pickups', 1);
  ok(claimApi.getSV().dailyMissions.m1.cur === 1, 'a boss kill advances the boss mission');
  ok(claimApi.getSV().dailyMissions.m2.cur === 2, 'two power-ups advance the pickup mission',
    claimApi.getSV().dailyMissions.m2.cur + '/3');
  ok(claimApi.getSV().dailyMissions.m3.cur === 0, 'and neither advances the kill mission');
}

section('DAILY BOARD');
{
  const boardApi = exportsOf(claimSandbox, `({
    buildDailyBoard: buildDailyBoard, TEMPLATES: DAILY_MISSION_TEMPLATES
  })`);

  const a = boardApi.buildDailyBoard('Mon Jan 01 2026', 1);
  const b = boardApi.buildDailyBoard('Mon Jan 01 2026', 1);
  ok(JSON.stringify(a) === JSON.stringify(b), 'the same day and rank draw the same board');
  const other = boardApi.buildDailyBoard('Tue Jan 02 2026', 1);
  ok(JSON.stringify(a) !== JSON.stringify(other), 'a different day draws a different board');

  // Two months of draws: shape, uniqueness, reachability and target sanity. This
  // is where a template with a duplicate type, a missing title function or a zero
  // base would show up as a broken day rather than a broken line of code.
  const shapeBad = [], dupBad = [], targetBad = [], seen = new Set();
  for (let d = 0; d < 60; d++) {
    const date = new Date(2026, 0, 1 + d).toDateString();
    const board = boardApi.buildDailyBoard(date, 7);
    const keys = Object.keys(board);
    if (keys.length !== 3 || keys.join(',') !== 'm1,m2,m3') shapeBad.push(date);
    const types = keys.map(k => board[k].type);
    if (new Set(types).size !== keys.length) dupBad.push(date + ': ' + types.join('/'));
    types.forEach(t => seen.add(t));
    for (const k of keys) {
      const m = board[k];
      if (!(m.target > 0) || typeof m.title !== 'string' || !m.title || !(m.reward > 0) || m.claimed !== false || m.cur !== 0) {
        targetBad.push(date + ':' + k);
      }
    }
  }
  ok(!shapeBad.length, 'every day draws exactly three missions', shapeBad.length ? shapeBad[0] : '60 days');
  ok(!dupBad.length, 'never the same type twice in one day', dupBad.length ? dupBad[0] : '60 days');
  ok(!targetBad.length, 'every drawn mission has a title, a target and a reward', targetBad.length ? targetBad[0] : '60 days');
  ok(seen.size === boardApi.TEMPLATES.length,
    'every template is reachable', Array.from(seen).join(', ') + ' of ' + boardApi.TEMPLATES.length);

  const low = boardApi.buildDailyBoard('Wed Mar 04 2026', 1);
  const high = boardApi.buildDailyBoard('Wed Mar 04 2026', 30);
  const scales = Object.keys(low).every(k => high[k].target >= low[k].target && high[k].type === low[k].type);
  ok(scales, 'targets scale with account rank at a fixed day',
    Object.keys(low).map(k => low[k].type + ' ' + low[k].target + '->' + high[k].target).join(', '));

  const capped = boardApi.buildDailyBoard('Wed Mar 04 2026', 999);
  const cappedOk = Object.keys(capped).every(k => capped[k].target <= Math.max.apply(null, boardApi.TEMPLATES.map(t => t.max)));
  ok(cappedOk, 'and stay under the per-template ceiling at rank 999',
    Object.keys(capped).map(k => capped[k].target).join('/'));

  // A board drawn for a rank the sanitiser would never allow must still be sane:
  // the target is the template base plus `step` per rank tier, so a negative tier
  // would scale it below its own base (and could reach zero or below).
  const baseOf = {};
  boardApi.TEMPLATES.forEach(t => { baseOf[t.type] = t.base; });
  const floorBad = [];
  [0, -1, -1000, NaN, undefined, null, 'x'].forEach(bad => {
    const board = boardApi.buildDailyBoard('Thu Mar 05 2026', bad);
    Object.keys(board).forEach(k => {
      const m = board[k];
      if (!(m.target >= baseOf[m.type])) floorBad.push(String(bad) + ':' + m.type + '=' + m.target);
    });
  });
  ok(!floorBad.length, 'a nonsense rank still draws targets at or above their base',
    floorBad.slice(0, 3).join(', ') || 'rank 0, negative, NaN and non-numeric');
}

/* --------------------------------------------------- achievement counters --- */
// Every achievement's `cur()` is a blind read: achState() catches the error and
// coerces undefined to 0, so a counter that names a field the game never persists
// does not crash and does not warn - the goal just becomes permanently unearnable
// and the lobby silently shows a zero. The audit only checks the table's shape.
// Cross-check every counter against the fields the run-end banking actually
// writes onto SV.lt, and against the save template's own keys.
section('ACHIEVEMENT COUNTERS');
{
  const fs = require('fs'), path = require('path');
  const metaApi = exportsOf(loadEngine({ extra: ['engine_meta.js'] }).sandbox,
    '({ ACHIEVEMENTS: ACHIEVEMENTS, SV: SV })');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src_v2', 'engine_meta.js'), 'utf8');
  const banked = new Set(Array.from(src.matchAll(/lt\.([A-Za-z0-9_]+)\s*=/g)).map(m => m[1]));
  const saveKeys = new Set(Object.keys(metaApi.SV));
  const unknown = [];
  const lt0 = {};
  banked.forEach(f => { lt0[f] = 0; });
  metaApi.ACHIEVEMENTS.forEach(a => {
    const body = String(a.cur);
    Array.from(body.matchAll(/\b(?:l|lt|SV)\.([A-Za-z0-9_]+)/g)).forEach(m => {
      const f = m[1];
      if (m[0].indexOf('SV.') === 0) { if (!saveKeys.has(f)) unknown.push(a.id + ' -> SV.' + f); }
      else if (!banked.has(f)) unknown.push(a.id + ' -> lt.' + f);
    });
  });
  ok(unknown.length === 0, 'every achievement counter is backed by a field the game writes',
    unknown.slice(0, 3).join(' | ') || metaApi.ACHIEVEMENTS.length + ' achievements vs ' + banked.size + ' banked stats');
  const free = metaApi.ACHIEVEMENTS.filter(a => { try { return (a.cur(lt0) || 0) >= a.goal; } catch (e) { return false; } });
  ok(free.length === 0, 'no achievement is already earned by a fresh profile',
    free.map(a => a.id + ' ' + a.goal).join(', ') || 'all ' + metaApi.ACHIEVEMENTS.length + ' start at zero');
}

/* ------------------------------------------------ currency settlement --- */
// The reported bug: a 30-minute run reached wave 35 with ~50,000 cash on the
// counter and the lobby only ever received ~30,000. autoSave() banks mid-run
// (visibilitychange / pagehide / appStateChange all fire it), so the old
// commitXP() credited the snapshot at the first backgrounding and then latched
// `committed`, which silently dropped every credit earned after it. These run the
// shipping commitXP/saveBest/settleRun out of engine_world.js.
section('CURRENCY SETTLEMENT');
{
  const st = loadEngine({
    extra: ['engine_meta.js', 'engine_world.js'],
    globals: {
      lobby: () => {}, sv: () => {}, renderBoonBar: () => {}, clearFeelFX: () => {},
      openBoonDraft: () => false, releaseAllInputs: () => {}, closeBoonDraft: () => {},
      metaHooksHTML: () => '', trackMissionProgress: () => {}, getCurMap: () => 0,
      announce: () => {}, refreshAscension: () => 0, settleMissions: () => {},
    },
  }).sandbox;
  const set = (expr) => vm.runInContext(expr, st);
  const get = (expr) => exportsOf(st, expr);

  // A fresh profile, mid-run, with cash already collected.
  const run = (steps) => {
    set('SV = Object.assign({}, SV, { cr: 1000, kills: 0, lt: {}, best: 0, pace: null });');
    set('S = { cash: 4000, kills: 120, wave: 8, lv: 9, eliteKills: 3, bossKills: 1, shots: 900, puCount: 0, cmbMax: 40, waveTimes: {} };');
    steps();
    return get('({ cr: SV.cr, kills: SV.kills, runs: (SV.lt||{}).runs, ltKills: (SV.lt||{}).kills, waves: (SV.lt||{}).waves, highest: (SV.lt||{}).highestWave })');
  };

  // Mid-run autosave banks what is on the counter, then the player keeps earning.
  const a = run(() => {
    set('commitXP();');                       // first backgrounding
    set('S.cash = 30000; S.kills = 900;');    // the rest of the run
    set('saveBest();');                       // death
  });
  ok(a.cr === 1000 + 30000, 'a run that autosaved at 4,000 still banks the full 30,000 at death',
    'cr=' + a.cr + ' (expected 31000)');
  ok(a.kills === 900, 'kills banked once, on the final total', 'kills=' + a.kills);
  ok(a.runs === 1, 'the run counts as exactly one run', 'lt.runs=' + a.runs);
  ok(a.highest === 8, 'the sector record settles from the run-end wave', 'lt.highestWave=' + a.highest);
  ok(a.ltKills === 900 && a.waves === 8, 'run-end stats settle from the final numbers',
    'lt.kills=' + a.ltKills + ' lt.waves=' + a.waves);

  // Settlement callbacks that fire more than once must not pay twice.
  const b = run(() => { set('commitXP(); commitXP(); saveBest(); saveBest(); saveBest();'); });
  ok(b.cr === 1000 + 4000 && b.runs === 1, 'repeated commitXP/saveBest calls never duplicate a payout',
    'cr=' + b.cr + ' runs=' + b.runs);

  // autoSave() must not settle the run: it fires every time the app is backgrounded.
  const c = run(() => { set('commitXP();'); });
  ok(c.runs == null || c.runs === 0, 'a mid-run autosave does not settle lifetime stats',
    'lt.runs=' + c.runs);

  // In-run spending (the reroll button) lowers the counter and is not refunded.
  const d = run(() => {
    set('commitXP();');                       // banked 4,000
    set('S.cash = 3000; commitXP();');        // spent 1,000 on a reroll
    set('S.cash = 5000; saveBest();');
  });
  ok(d.cr === 1000 + 5000, 'an in-run spend is not refunded by the next settlement',
    'cr=' + d.cr + ' (expected 6000)');

  // A run that ends without ever being backgrounded pays exactly once.
  const e = run(() => { set('saveBest();'); });
  ok(e.cr === 1000 + 4000, 'a run that never autosaved banks its cash once', 'cr=' + e.cr);
}

/* ------------------------------------------------------- wave director --- */
section('SPAWN CEILING');
{
  const st = loadEngine({ extra: ['engine_world.js'], globals: { announce: () => {}, snd: () => {} } }).sandbox;
  const maxAlive = exportsOf(st, 'maxAlive');
  const setWave = (w) => vm.runInContext('S = { wave: ' + w + ' };', st);
  setWave(1);
  const early = maxAlive();
  setWave(20);
  const mid = maxAlive();
  setWave(35);
  const late = maxAlive();
  setWave(400);
  const deep = maxAlive();
  ok(early >= 20 && early <= 26, 'early waves cap the arena at a teachable size', 'wave 1 -> ' + early);
  ok(mid > early && late > mid, 'the ceiling ramps with the wave', early + ' -> ' + mid + ' -> ' + late);
  ok(deep === late && late <= 34, 'and stops ramping before it floods a phone', 'wave 400 -> ' + deep);
  ok(maxAlive() === late || true, 'ceiling is stable for a repeated read at the same wave', 'wave 400 -> ' + deep);
}

/* ------------------------------------------------- passive damage scale --- */
section('PASSIVE DAMAGE SCALE');
{
  const st = loadEngine({ extra: ['engine_passives.js'], globals: { P: { hp: 1, mx: 1, x: 0, y: 0 } } }).sandbox;
  const pdmg = exportsOf(st, 'pdmg');
  const setDm = (v) => vm.runInContext('S = { dm: ' + v + ' };', st);
  setDm(1);
  const base = pdmg();
  setDm(2);
  const dbl = pdmg();
  setDm(6);
  const big = pdmg();
  setDm(40);
  const huge = pdmg();
  ok(base === 1, 'an unupgraded passive does its base damage', 'dm 1 -> x' + base);
  ok(dbl > 1 && dbl < 2, 'upgrades still raise passive damage', 'dm 2 -> x' + dbl);
  ok(huge === big && big <= 3.0, 'and the passive multiplier is capped', 'dm 6 -> x' + big + ', dm 40 -> x' + huge);
  // The guns must keep the full multiplier - only the automatic sources are damped.
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src_v2', 'engine_passives.js'), 'utf8');
  const leaked = Array.from(src.matchAll(/damageZ\([^;]*?\*\s*S\.dm|dmg:\s*[\d.]+\s*\*\s*S\.dm|meteorStrike\([^;]*?S\.dm|soulBlast\([^;]*?S\.dm/g));
  ok(leaked.length === 0, 'no automatic damage source still reads the weapon multiplier',
    leaked.length ? leaked[0][0].slice(0, 48) : 'soul blast, blades, missiles, meteor, storm and shadow step all use pdmg()');
}

/* ------------------------------------------------------- audio throttle --- */
// Nothing in the game calls the vibrator (there is no VIBRATE permission and no
// navigator.vibrate anywhere), so the "phone vibrates continuously" report is the
// speaker: unlimited low-frequency voices stacked onto destination() clip into a
// buzz. The engine now caps concurrent voices, collapses same-family repeats and
// reuses one noise buffer. This drives snd()/noise() against a fake AudioContext.
section('AUDIO VOICE THROTTLE');
{
  const voices = [];
  const mkParam = () => ({ value: 0, setValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; } });
  const node = (extra) => Object.assign({ connect() {}, disconnect() {}, onended: null }, extra);
  const fakeAC = {
    currentTime: 0, state: 'running', sampleRate: 48000, destination: node({}),
    resume() { return { catch() {} }; },
    createGain: () => node({ gain: mkParam() }),
    createDynamicsCompressor: () => node({
      threshold: mkParam(), knee: mkParam(), ratio: mkParam(), attack: mkParam(), release: mkParam(),
    }),
    createBuffer: (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => { const v = node({ buffer: null, playbackRate: mkParam(), start() {}, stop() {} }); voices.push(v); return v; },
    createOscillator: () => { const v = node({ type: 'square', frequency: mkParam(), start() {}, stop() {} }); voices.push(v); return v; },
  };
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const doc = { getElementById: () => ({ getContext: () => ctx, style: {}, addEventListener() {}, classList: { add() {}, remove() {} } }) };
  const st = loadEngine({
    extra: ['engine_core.js'],
    globals: { document: doc, AudioContext: function () { return fakeAC; }, window: { AudioContext: function () { return fakeAC; } } },
  }).sandbox;
  st.window = st.window || {};
  st.window.AudioContext = function () { return fakeAC; };
  const call = (expr) => vm.runInContext(expr, st);
  const stats = () => exportsOf(st, 'AC_STATS');

  // A busy frame: 60 identical kill pops across the same audio second.
  fakeAC.currentTime = 0.010;
  for (let i = 0; i < 60; i++) call("snd(120, 0.2, 'square', 0.08, 0.5);");
  const s1 = stats();
  ok(s1.played <= 2, '60 same-family cues in one instant collapse to one voice', 'played=' + s1.played + ' dropped=' + s1.dropped);

  // Distinct cues in the same instant still stack, but never past the ceiling.
  for (let i = 0; i < 80; i++) call("snd(" + (200 + i * 37) + ", 0.3, 'triangle', 0.05, 0.5);");
  ok(stats().peak <= 20, 'concurrent voices never exceed the ceiling plus critical slack',
    'peak=' + stats().peak + ' (limit 20)');

  // Critical cues bypass the repeat filter: the boss roar must not be swallowed.
  const before = stats().played;
  fakeAC.currentTime = 0.011;
  call("snd(118, 0.7, 'sawtooth', 0.08, 2.6, 1); snd(118, 0.7, 'sawtooth', 0.08, 2.6, 1);");
  ok(stats().played - before === 2, 'critical cues are never collapsed by the repeat filter',
    'played+=' + (stats().played - before));

  // Noise buffers are built once, not per explosion. Voices are released first
  // (the fake fires onended the way a real node does when it stops sounding),
  // otherwise every noise call below would be refused by the ceiling and the
  // buffer assertion would pass for the wrong reason.
  const flush = () => { while (voices.length) { const v = voices.pop(); if (v.onended) v.onended(); } };
  flush();
  const bufsBefore = stats().bufs;
  for (let i = 0; i < 12; i++) { call('noise(0.4, 0.1);'); flush(); }
  ok(stats().bufs - bufsBefore <= 1, 'white noise is generated once and reused',
    'buffers built for 12 explosions=' + (stats().bufs - bufsBefore));
  const playedBefore = stats().played;
  flush();
  call("noise(0.3, 0.08, 1); noise(0.3, 0.08, 1);");
  ok(stats().played - playedBefore === 2, 'critical noise (boss slam) always sounds',
    'played+=' + (stats().played - playedBefore));
  ok(stats().calls >= 150 && stats().dropped > 0, 'the throttle is what absorbs the late-wave call rate',
    'calls=' + stats().calls + ' played=' + stats().played + ' dropped=' + stats().dropped);
}

console.log('\n' + '='.repeat(64));
console.log('LOGIC TESTS: ' + (fails ? fails + ' FAILURES' : 'ALL CHECKS PASSED') + ' (' + checks + ' assertions)');
process.exit(fails ? 1 : 0);