#!/usr/bin/env node
// DEAD ZONE repository audit.
//
// Runs the checks that a build alone cannot: does the tree still describe a
// shippable game? Every check either inspects the real artefact (the built bundle,
// the git index) or calls the real engine code through tools/load-engine.js, so a
// green run means the shipped rules were exercised, not a copy of them.
//
//   node tools/audit.js          # report, exit 1 on failure
//   node tools/audit.js --quiet  # only failures and the summary
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { loadEngine, exportsOf, ROOT } = require('./load-engine.js');

const QUIET = process.argv.includes('--quiet');
const fails = [];
const warns = [];
let checks = 0;

function ok(name, detail) {
  checks++;
  if (!QUIET) console.log('  ok   ' + name + (detail ? '  :: ' + detail : ''));
}
function fail(name, detail) {
  checks++;
  fails.push(name + (detail ? ' :: ' + detail : ''));
  console.log('  FAIL ' + name + (detail ? '  :: ' + detail : ''));
}
function warn(name, detail) {
  warns.push(name + (detail ? ' :: ' + detail : ''));
  if (!QUIET) console.log('  warn ' + name + (detail ? '  :: ' + detail : ''));
}
function section(t) { console.log('\n== ' + t + ' =='); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function git(args) {
  try { return cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch (e) { return ''; }
}

/* ---------------------------------------------------------------- bundle -- */
section('BUILD ARTEFACT');
const bundlePath = path.join(ROOT, 'www/index.html');
if (!fs.existsSync(bundlePath)) {
  fail('www/index.html exists', 'run npm run build first');
} else {
  const html = fs.readFileSync(bundlePath, 'utf8');
  const parts = html.split(/<script[^>]*>/).slice(1).map(s => s.split('</script>')[0]);
  const code = parts.join('\n;\n');
  try {
    new Function(code);
    ok('bundled script compiles', (code.length / 1024).toFixed(1) + ' KB of JS');
  } catch (e) {
    fail('bundled script compiles', e.message);
  }

  // A stale bundle is the failure mode that shipped two "fixed" builds that were
  // not fixed, because www/index.html was never regenerated.
  const bundleTime = fs.statSync(bundlePath).mtimeMs;
  const sources = fs.readdirSync(path.join(ROOT, 'src_v2'))
    .filter(f => /\.(js|html|css)$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(ROOT, 'src_v2', f)).mtimeMs }))
    .filter(x => x.t > bundleTime + 1000);
  if (sources.length) fail('bundle is up to date', 'newer than www/index.html: ' + sources.map(s => s.f).join(', '));
  else ok('bundle is up to date');

  // Every module must be listed in the bundler, or it silently never ships.
  const buildSrc = read('src_v2/build.js');
  const listed = (buildSrc.match(/'([a-z0-9_]+\.js)'/g) || []).map(s => s.replace(/'/g, ''));
  const onDisk = fs.readdirSync(path.join(ROOT, 'src_v2')).filter(f => f.endsWith('.js') && f !== 'build.js');
  const missing = onDisk.filter(f => !listed.includes(f));
  const ghost = listed.filter(f => !onDisk.includes(f));
  if (missing.length || ghost.length) {
    fail('bundler module list matches src_v2', 'unlisted: ' + (missing.join(', ') || '-') + ' | missing files: ' + (ghost.join(', ') || '-'));
  } else ok('bundler module list matches src_v2', onDisk.length + ' modules');
}

/* --------------------------------------------------------------- version -- */
section('VERSION');
const pkg = JSON.parse(read('package.json'));
const bootstrap = read('src_v2/engine_bootstrap.js');
const gameVersion = (bootstrap.match(/GAME_VERSION\s*=\s*'([^']+)'/) || [])[1];
const gradle = read('android/app/build.gradle');
const gradleName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
const gradleCode = (gradle.match(/versionCode\s+(\d+)/) || [])[1];
const versions = { 'package.json': pkg.version, 'engine_bootstrap.js': gameVersion, 'build.gradle': gradleName };
const unique = Array.from(new Set(Object.values(versions)));
if (unique.length === 1 && unique[0]) ok('version is consistent everywhere', 'v' + unique[0] + ' (versionCode ' + gradleCode + ')');
else fail('version is consistent everywhere', JSON.stringify(versions));
if (fs.existsSync(bundlePath)) {
  const html = fs.readFileSync(bundlePath, 'utf8');
  if (gameVersion && html.indexOf("GAME_VERSION = '" + gameVersion + "'") >= 0) ok('bundle carries the current version');
  else fail('bundle carries the current version', 'expected ' + gameVersion);
}
if (pkg.scripts && pkg.scripts.test) ok('package.json exposes a test script', pkg.scripts.test);
else fail('package.json exposes a test script', 'npm test is the contract CI and humans rely on');

/* ---------------------------------------------------------------- secrets -- */
section('RELEASE HYGIENE');
const tracked = git(['ls-files']).split('\n').filter(Boolean);
const secretish = tracked.filter(f => /(^|\/)(release\.keystore|keystore\.properties|.*\.jks|.*\.p12|\.env(\..+)?|id_rsa)$/.test(f));
if (secretish.length) fail('no signing material or env files are tracked', secretish.join(', '));
else ok('no signing material or env files are tracked', tracked.length + ' files scanned');

const textFiles = tracked.filter(f => /\.(js|json|html|css|md|yml|yaml|gradle|properties|txt)$/.test(f));
const leaks = [];
for (const f of textFiles) {
  let body;
  try { body = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
  if (/BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY/.test(body)) leaks.push(f + ' (private key)');
  const pw = body.match(/storePassword\s*[=:]\s*['"]?([^'"\s]+)/i);
  if (pw && !/^\$|^\{|example|changeme|your-/i.test(pw[1])) leaks.push(f + ' (storePassword literal)');
  const b64 = body.match(/[A-Za-z0-9+/]{600,}={0,2}/);
  if (b64 && f !== 'package-lock.json') leaks.push(f + ' (long base64 blob)');
}
if (leaks.length) fail('no credentials embedded in tracked text files', leaks.join(', '));
else ok('no credentials embedded in tracked text files', textFiles.length + ' files scanned');

const ignore = read('.gitignore');
const wanted = ['www/_*.html', '.agent_tmp/', 'release.keystore'];
const missingIgnores = wanted.filter(w => ignore.indexOf(w) < 0);
if (missingIgnores.length) fail('.gitignore covers scratch and signing files', missingIgnores.join(', '));
else ok('.gitignore covers scratch and signing files');

if (fs.existsSync(path.join(ROOT, '.github/workflows/release.yml'))) {
  const rel = read('.github/workflows/release.yml');
  if (/RELEASE_KEYSTORE_BASE64/.test(rel) && /apksigner/.test(rel) && /verify/.test(rel)) ok('release workflow signs and verifies the APK');
  else warn('release workflow', 'does not restore a keystore and verify the signature');
}

/* ------------------------------------------------------------------ data -- */
section('WEAPON, TIER & SKIN DATA');
let engine = null;
try {
  engine = loadEngine();
} catch (e) {
  fail('engine data modules load', e.message);
}
if (engine) {
  const api = exportsOf(engine.sandbox, `({
    WEAP: WEAP, SKINS: SKINS, CL: CL, MP: MP, ZT: ZT,
    weaponStats: weaponStats, weaponTierIssues: weaponTierIssues, tierLadderIssues: tierLadderIssues,
    TIER_POLICY: TIER_POLICY, WEAP_TIER_EXCEPTIONS: WEAP_TIER_EXCEPTIONS,
    WEAP_RANK: typeof WEAP_RANK !== 'undefined' ? WEAP_RANK : null,
    TIERS: typeof TIERS !== 'undefined' ? TIERS : null
  })`);
  const { WEAP, SKINS, CL, MP, weaponStats } = api;

  const bad = [];
  WEAP.forEach((w, i) => {
    if (!w || typeof w.n !== 'string' || !w.n) bad.push(i + ': name');
    else if (!(w.d > 0) || !(w.r > 0) || !(w.mag >= 1) || !(w.rl > 0)) bad.push(w.n + ': negative/zero stat');
    else if (typeof w.tier !== 'string') bad.push(w.n + ': no tier');
  });
  if (bad.length) fail('every weapon has a name and usable stats', bad.join(', '));
  else ok('every weapon has a name and usable stats', WEAP.length + ' weapons');

  const tierIssues = api.weaponTierIssues();
  if (tierIssues.length) fail('every weapon fits its tier policy', tierIssues.join(' | '));
  else ok('every weapon fits its tier policy', Object.keys(api.TIER_POLICY).length + ' tiers, ' + Object.keys(api.WEAP_TIER_EXCEPTIONS || {}).length + ' documented exceptions');

  const ladder = api.tierLadderIssues();
  if (ladder.length) fail('tier ladder climbs monotonically', ladder.join(' | '));
  else ok('tier ladder climbs monotonically');

  // Independent of the game's own policy table: a higher tier must not open with a
  // weapon weaker than the tier below it, and must still contain its ceiling. The
  // median is reported for context but not asserted on: with two to seven weapons
  // per tier it is mostly sampling noise.
  const byTier = {};
  WEAP.forEach((w, i) => {
    let st;
    try { st = weaponStats(i); } catch (e) { st = null; }
    if (!st) return;
    (byTier[w.tier] = byTier[w.tier] || []).push(st.dps);
  });
  const order = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].filter(t => byTier[t]);
  const mins = order.map(t => Math.min.apply(null, byTier[t]));
  const maxs = order.map(t => Math.max.apply(null, byTier[t]));
  const meds = order.map(t => {
    const a = byTier[t].slice().sort((x, y) => x - y);
    return a[Math.floor(a.length / 2)];
  });
  const floorsRise = mins.every((v, i) => i === 0 || v > mins[i - 1]);
  const ceilingsRise = maxs.every((v, i) => i === 0 || v > maxs[i - 1]);
  const label = (arr) => order.map((t, i) => t.slice(0, 4) + ' ' + arr[i].toFixed(0)).join(' < ');
  if (floorsRise) ok('weakest weapon rises per tier', label(mins));
  else fail('weakest weapon rises per tier', label(mins));
  if (ceilingsRise) ok('strongest weapon rises per tier', label(maxs));
  else fail('strongest weapon rises per tier', label(maxs));
  ok('median DPS per tier (informational)', label(meds));

  const skinBad = [];
  Object.keys(SKINS).forEach(k => {
    const s = SKINS[k];
    if (!s || typeof s.name !== 'string' || typeof s.col !== 'string') { skinBad.push(k + ': no name/colour'); return; }
    if (s.type === 'op') {
      if (!(s.ci >= 0 && s.ci < CL.length)) skinBad.push(k + ': operative index ' + s.ci + ' out of range');
    } else if (!(s.wi >= 0 && s.wi < WEAP.length)) {
      // The Skins tab used to crash here: a skin that names a weapon index the
      // weapon table does not have.
      skinBad.push(k + ': weapon index ' + s.wi + ' out of range');
    }
  });
  if (skinBad.length) fail('every skin points at a real operative or weapon', skinBad.join(' | '));
  else {
    const ops = Object.keys(SKINS).filter(k => SKINS[k].type === 'op').length;
    ok('every skin points at a real operative or weapon', Object.keys(SKINS).length + ' skins (' + ops + ' operative, ' + (Object.keys(SKINS).length - ops) + ' weapon)');
  }

  // Every map is reachable and has the fields the spawn code reads.
  const mapBad = Object.keys(MP).filter(k => !MP[k] || typeof MP[k].n !== 'string');
  if (mapBad.length) fail('every map has a name', mapBad.join(', '));
  else ok('every map has a name', Object.keys(MP).length + ' maps');
}

/* -------------------------------------------------------- projectile look -- */
section('PROJECTILE VISUALS');
try {
  const feel = read('src_v2/engine_feel.js');
  const trailBlock = (feel.match(/const TRAIL_PX\s*=\s*\{([^}]*)\}/) || [])[1] || '';
  const trailKeys = (trailBlock.match(/([a-z_]+)\s*:/g) || []).map(s => s.replace(/[:\s]/g, ''));
  const archetypes = Array.from(new Set((feel.match(/return '([a-z_]+)'/g) || []).map(s => s.replace(/return '|'/g, ''))));
  const uncovered = archetypes.filter(a => trailKeys.indexOf(a) < 0);
  if (!trailKeys.length) fail('TRAIL_PX table found');
  else if (uncovered.length) fail('every bullet archetype has a projectile length', uncovered.join(', '));
  else ok('every bullet archetype has a projectile length', archetypes.length + ' archetypes');
  const magnum = trailKeys.indexOf('magnum') >= 0 ? parseFloat((trailBlock.match(/magnum\s*:\s*(\d+)/) || [])[1]) : null;
  const tracer = parseFloat((trailBlock.match(/tracer\s*:\s*(\d+)/) || [])[1]);
  if (magnum !== null && tracer) {
    if (magnum > 40) fail('revolver tracer stays a compact round', 'magnum ' + magnum + 'px');
    else ok('revolver tracer stays a compact round', 'magnum ' + magnum + 'px vs tracer ' + tracer + 'px');
  }
} catch (e) {
  fail('projectile visual table is readable', e.message);
}

/* -------------------------------------------------------------- dead code -- */
section('DEAD CODE');
try {
  const files = fs.readdirSync(path.join(ROOT, 'src_v2')).filter(f => f.endsWith('.js') && f !== 'build.js');
  const all = files.map(f => ({ f, src: read('src_v2/' + f) }));
  // The markup's inline handlers and the repo tools count as callers, otherwise
  // every function wired up with onclick="fn('x')" looks unreachable.
  const extra = ['src_v2/body.html', 'src_v2/style.css']
    .concat(fs.readdirSync(path.join(ROOT, 'tools')).filter(f => f.endsWith('.js')).map(f => 'tools/' + f));
  const corpus = all.map(x => x.src).concat(extra.map(read)).join('\n');
  const dead = [];
  for (const { f, src } of all) {
    const names = Array.from(src.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)).map(m => m[1]);
    for (const n of names) {
      const uses = (corpus.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length;
      // Exactly one mention == the definition itself: nothing calls it, no inline
      // handler names it, no string-keyed dispatch reaches it.
      if (uses <= 1) dead.push(n + ' (' + f + ')');
    }
  }
  if (dead.length) warn('unreferenced functions', dead.length + ': ' + dead.slice(0, 12).join(', ') + (dead.length > 12 ? ', ...' : ''));
  else ok('every top-level function is referenced');
} catch (e) {
  warn('dead code scan', e.message);
}

/* ------------------------------------------------------- gameplay wiring -- */
// A mission type with no caller is a mission that can never complete, and it is
// invisible to every other check: the board renders it, the reward table prices
// it, only the gameplay event is missing. 'waves' shipped in exactly that state.
section('GAMEPLAY WIRING');
{
  const missions = read('src_v2/engine_events_missions.js');
  const types = Array.from(new Set(Array.from(missions.matchAll(/type:\s*'([a-z]+)'/g)).map(m => m[1])));
  const files = fs.readdirSync(path.join(ROOT, 'src_v2'))
    .filter(f => f.endsWith('.js') && f !== 'build.js' && f !== 'engine_events_missions.js');
  const seen = new Set();
  for (const f of files) {
    for (const m of read('src_v2/' + f).matchAll(/trackMissionProgress\(\s*'([a-z]+)'/g)) seen.add(m[1]);
  }
  const unWired = types.filter(t => !seen.has(t));
  if (!types.length) fail('daily mission types are declared', 'no type: entries found in the mission seed');
  else if (unWired.length) fail('every daily mission type has a gameplay caller', 'no caller for: ' + unWired.join(', '));
  else ok('every daily mission type has a gameplay caller', types.join(', ') + ' (' + seen.size + ' call sites)');

  // The wave counter must sit inside the idempotent clear branch, or re-entering
  // the cleared state would count the same wave twice.
  const world = read('src_v2/engine_world.js');
  const clear = world.match(/clearedWave !== S\.wave[\s\S]{0,700}?trackMissionProgress\(\s*'waves'/);
  if (clear) ok('the waves mission is counted once per cleared wave');
  else fail('the waves mission is counted in the idempotent clear branch', 'trackMissionProgress(\'waves\') not found inside the clearedWave guard');

  // Every claim path must re-validate its own claimed flag: the buttons are only
  // a hint, and a stale re-render must not be able to pay twice.
  const guards = [
    ['claimMission', /m\.claimed/],
    ['claimLoginDay', /SV\.loginClaimed\s*&&\s*SV\.loginClaimed\[/],
    ['claimRank', /SV\.rankClaimed\[/]
  ];
  const missing = guards.filter(([fn, re]) => {
    const body = missions.slice(missions.indexOf('function ' + fn + '('));
    return body.indexOf('function ' + fn + '(') < 0 || !re.test(body.slice(0, body.indexOf('\n}')));
  }).map(([fn]) => fn);
  if (missing.length) fail('every claim function re-validates its own flag', missing.join(', '));
  else ok('every claim function re-validates its own flag', guards.map(g => g[0]).join(', '));
}

/* ------------------------------------------------------------- ui binding -- */
section('UI BINDING');
{
  const src = fs.readdirSync(path.join(ROOT, 'src_v2')).filter(f => /\.(js|html)$/.test(f) && f !== 'build.js');
  // Inline event attributes are how a stale tab index and a deleted function both
  // reached the player: the markup carried JS, nothing checked it, and the only
  // signal was a tap that did nothing (or threw). Buttons now declare data-act and
  // one delegated listener in engine_bootstrap.js runs it.
  const inline = /(?<![\w-])on[a-z]+\s*=\s*["'`]/g;
  const offenders = [];
  for (const f of src) {
    const hits = (read('src_v2/' + f).match(inline) || []).length;
    if (hits) offenders.push(f + ' (' + hits + ')');
  }
  if (offenders.length) fail('no inline event handlers in markup or generated html', offenders.join(', '));
  else ok('no inline event handlers in markup or generated html', src.length + ' files scanned');

  const boot = read('src_v2/engine_bootstrap.js');
  const tableStart = boot.indexOf('const UI_ACTIONS = {');
  const tableEnd = boot.indexOf('\n};', tableStart);
  const table = (tableStart >= 0 && tableEnd > tableStart) ? boot.slice(tableStart, tableEnd) : '';
  const defined = new Set((table.match(/(?:^\s{2}|,\s*)([A-Za-z_$][\w$]*)\s*(?=[,:])/gm) || []).map(s => s.trim().replace(/^,\s*/, '')));
  const used = new Set();
  for (const f of src) {
    const body = read('src_v2/' + f);
    for (const m of body.matchAll(/data-act="([A-Za-z_$][\w$]*)"/g)) used.add(m[1]);
    for (const m of body.matchAll(/data-act="\$\{[^}]*\?\s*'([\w$]+)'\s*:\s*'([\w$]+)'\}/g)) { used.add(m[1]); used.add(m[2]); }
  }
  const unknown = Array.from(used).filter(u => !defined.has(u));
  if (!table) fail('UI action table found', 'const UI_ACTIONS = { ... } missing from engine_bootstrap.js');
  else if (unknown.length) fail('every data-act names a real UI action', unknown.join(', '));
  else ok('every data-act names a real UI action', used.size + ' used, ' + defined.size + ' defined');

  // The engine draws through one mutable global 2D context (`X`). Any code that
  // points it at a scratch canvas must hand it back, which only withCtx() in
  // engine_core.js guarantees - a bare `X = cx` that returns early leaves the main
  // loop drawing into a 200x100 offscreen canvas, silently.
  const rebinders = src.filter(f => f.endsWith('.js') && f !== 'engine_core.js' && /(?<![\w$.])X\s*=(?!=)/.test(read('src_v2/' + f)));
  if (rebinders.length) fail('only withCtx() rebinds the canvas context', rebinders.join(', '));
  else ok('only withCtx() rebinds the canvas context');
}

/* ----------------------------------------------------------------- report -- */
console.log('\n' + '='.repeat(64));
console.log('AUDIT: ' + (fails.length ? fails.length + ' FAILURES' : 'ALL CHECKS PASSED') + ' (' + checks + ' checks, ' + warns.length + ' warnings)');
if (warns.length && QUIET) warns.forEach(w => console.log('  warn ' + w));
process.exit(fails.length ? 1 : 0);
