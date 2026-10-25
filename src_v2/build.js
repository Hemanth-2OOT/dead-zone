// DEAD ZONE v2.2 - BUNDLER & SYNTAX AUDITOR
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = __dirname;
const rootDir = path.resolve(baseDir, '..');

console.log('--- DEAD ZONE v2.2 BUILD PIPELINE ---');

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
  'engine_pickups.js',
  'engine_render_player.js',
  'engine_render_zombies.js',
  'engine_render_turret.js',
  'engine_world.js',
  'engine_director.js',
  'engine_fx.js',
  'engine_lobby.js',
  'engine_bootstrap.js'
];

let bundledJs = '';
jsModules.forEach(modName => {
  const modPath = path.join(baseDir, modName);
  console.log(`Loading module: ${modName}...`);
  const content = fs.readFileSync(modPath, 'utf8');
  bundledJs += `\n/* === MODULE: ${modName} === */\n` + content + '\n';
});

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
