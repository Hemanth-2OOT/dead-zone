// DEAD ZONE - BUNDLER, SYNTAX AUDITOR & STATIC ID AUDIT
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = __dirname;
const rootDir = path.resolve(baseDir, '..');

const pkgVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
console.log('--- DEAD ZONE v' + pkgVersion + ' BUILD PIPELINE ---');

// 1. Read Stylesheet
const css = fs.readFileSync(path.join(baseDir, 'style.css'), 'utf8');

// 2. Read HTML Layout
const bodyHtml = fs.readFileSync(path.join(baseDir, 'body.html'), 'utf8');

// 3. JS Modules in strict dependency order
const jsModules = [
  'engine_core.js',
  'engine_data.js',
  'engine_persistence.js',
  'engine_maps.js',
  'engine_events_missions.js',
  'engine_gore.js',
  'engine_props.js',
  'engine_pickups.js',
  'engine_render_player.js',
  'engine_render_zombies.js',
  'engine_render_turret.js',
  'engine_depth.js',
  'engine_feel.js',
  'engine_passives.js',
  'engine_world.js',
  'engine_hud.js',
  'engine_director.js',
  'engine_meta.js',
  'engine_fx.js',
  'engine_lobby.js',
  'engine_bootstrap.js'
];

let bundledJs = '';
const topLevelDecls = new Map();
const collisions = [];
jsModules.forEach(modName => {
  const modPath = path.join(baseDir, modName);
  console.log(`Loading module: ${modName}...`);
  const content = fs.readFileSync(modPath, 'utf8');

  // All modules are concatenated into ONE script scope, so a duplicate
  // top-level function/class name silently wins by load order instead of
  // erroring. Catch that at build time.
  // `const`/`let` at column 0 too: a duplicated const is a hard SyntaxError once
  // the modules are concatenated, and the V8 check below reports it as a bare
  // "Identifier 'X' has already been declared" with no indication of which
  // modules collided.
  const re = /^(?:function|class)\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const name = m[1] || m[2];
    if (topLevelDecls.has(name)) collisions.push(`${name} (${topLevelDecls.get(name)} -> ${modName})`);
    else topLevelDecls.set(name, modName);
  }

  bundledJs += `\n/* === MODULE: ${modName} === */\n` + content + '\n';
});

if (collisions.length) {
  console.error('✕ Duplicate top-level declarations (later module silently overrides earlier):');
  collisions.forEach(c => console.error('  - ' + c));
  process.exit(1);
}

// 3b. Element-id audit. A reference to an element that no longer exists in the
// markup is invisible to the syntax check and only throws at runtime, at whatever
// moment that line runs. That is exactly how every Special Operation died: the id
// of a deleted shop overlay was left in beginEvent's reset list, and the unguarded
// .classList threw before the run context was ever set.
// Three things are treated as intentional and skipped: ids assigned at runtime
// (el.id = 'x'), ids built by JS templates, and legacy fallbacks of the form
// getElementById('current') || getElementById('legacy').
const staticIds = new Set();
const dynIds = new Set();
let idm;
const idRe = /\bid="([^"]+)"/g;
while ((idm = idRe.exec(bodyHtml)) !== null) staticIds.add(idm[1]);
const dynRe = /(?:\bid=["']|\.id\s*=\s*["'])([A-Za-z][\w-]*)["']/g;
while ((idm = dynRe.exec(bundledJs)) !== null) dynIds.add(idm[1]);

const idRefs = new Set();
const fallbackIds = new Set();
const litRefRe = /(?:getElementById|\$)\(\s*['"]([^'"]+)['"]\s*\)/g;
while ((idm = litRefRe.exec(bundledJs)) !== null) idRefs.add(idm[1]);
// ids reached indirectly through a literal array: ['a','b'].forEach(i => $(i)...)
const arrRefRe = /\[([^\]]*?)\]\.forEach\(\s*\w+\s*=>\s*\$\s*\(\s*\w+\s*\)/g;
while ((idm = arrRefRe.exec(bundledJs)) !== null) {
  idm[1].split(',').forEach(tok => {
    const t = tok.trim().replace(/^['"]|['"]$/g, '');
    if (/^[a-z][\w-]*$/.test(t)) idRefs.add(t);
  });
}
const fbRe = /\|\|\s*(?:document\.)?(?:getElementById|\$)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
while ((idm = fbRe.exec(bundledJs)) !== null) fallbackIds.add(idm[1]);

// A lookup whose result is immediately null-checked is deliberate dead code, not
// a crash risk, so leave it out of the report.
const guardedIds = new Set();
for (const id of idRefs) {
  const assignRe = new RegExp('(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:document\\.)?(?:getElementById|\\$)\\s*\\(\\s*[\'"]' + id + '[\'"]\\s*\\)');
  const am = assignRe.exec(bundledJs);
  if (!am) continue;
  const tail = bundledJs.slice(am.index, am.index + 400);
  if (new RegExp('if\\s*\\(\\s*!?' + am[1] + '\\s*[\\)&|]').test(tail)) guardedIds.add(id);
}
const deadIds = [...idRefs]
  .filter(id => !staticIds.has(id) && !dynIds.has(id) && !fallbackIds.has(id) && !guardedIds.has(id))
  .sort();
if (deadIds.length) {
  console.warn('! Element ids referenced in JS but absent from the markup (null-deref risk):');
  deadIds.forEach(id => console.warn('  - ' + id));
} else {
  console.log('\u2713 Element-id audit passed: every referenced id exists in the markup.');
}

// 4. Test Syntax with Node VM
console.log('Auditing bundled JavaScript with Node.js V8 engine...');
try {
  new vm.Script(bundledJs);
  console.log('✓ Syntax Check Passed: 0 compilation errors!');
} catch (err) {
  console.error('✕ Syntax Error in bundled script:');
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
}

// 5. Construct Complete Single-File HTML
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>DEAD ZONE</title>
<style>
${css}
</style>
</head>
<body>
${bodyHtml}
<script>
${bundledJs}
</script>
</body>
</html>`;

// 6. Write to www/index.html
const targetWww = path.join(rootDir, 'www', 'index.html');
fs.writeFileSync(targetWww, fullHtml, 'utf8');
console.log(`✓ Generated ${targetWww} (${(fullHtml.length / 1024).toFixed(1)} KB)`);

// 7. Sync to Android Public Assets if directory exists
const targetAndroid = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html');
if (fs.existsSync(path.dirname(targetAndroid))) {
  fs.writeFileSync(targetAndroid, fullHtml, 'utf8');
  console.log(`✓ Synced to Android assets: ${targetAndroid}`);
}

console.log('--- BUILD COMPLETE SUCCESSFULLY ---');
