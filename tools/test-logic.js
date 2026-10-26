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
  WEAP: WEAP, SKINS: SKINS, CL: CL, MP: MP, ZT: ZT, TIER_POLICY: TIER_POLICY,
  weaponStats: weaponStats, weaponTierIssues: weaponTierIssues, tierLadderIssues: tierLadderIssues,
  sanitizeSV: sanitizeSV, sv: sv, ld: ld,
  getSV: function () { return SV; },
  setSV: function (v) { SV = v; },
  storage: localStorage
})`);

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
  if (['aim', 'button'].indexOf(out.fireMode) < 0) bad.push('fireMode ' + out.fireMode);
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

console.log('\n' + '='.repeat(64));
console.log('LOGIC TESTS: ' + (fails ? fails + ' FAILURES' : 'ALL CHECKS PASSED') + ' (' + checks + ' assertions)');
process.exit(fails ? 1 : 0);
