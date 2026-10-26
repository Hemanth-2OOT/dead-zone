#!/usr/bin/env node
// Builds .agent_tmp/harness.html: the freshly built bundle (www/index.html) plus
// tools/regression-harness.js. Kept out of www/ so the harness can never ship.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const bundle = path.join(ROOT, 'www/index.html');
if (!fs.existsSync(bundle)) {
  console.error('www/index.html is missing - run: npm run build');
  process.exit(1);
}
const js = fs.readFileSync(path.join(__dirname, 'regression-harness.js'), 'utf8');
const hud = '<div id="mout" style="position:fixed;left:0;top:0;width:100%;height:100%;z-index:99999;' +
  'background:#04120a;color:#7ee787;font:11px/1.35 monospace;white-space:pre;overflow:auto;padding:8px;box-sizing:border-box"></div>';
const html = fs.readFileSync(bundle, 'utf8').replace('</body>', hud + '\n<script>\n' + js + '\n</script>\n</body>');

const outDir = path.join(ROOT, '.agent_tmp');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'harness.html');
fs.writeFileSync(out, html);
console.log('harness written: ' + path.relative(ROOT, out) + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
