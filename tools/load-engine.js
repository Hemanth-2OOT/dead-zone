// Loads the DOM-free engine modules into a sandbox so the audit and the logic
// tests can call the real code instead of re-implementing its rules. Only the
// handful of globals these modules touch at load time are stubbed; anything they
// actually get wrong (a bad tier table, a save shape that cannot be sanitised)
// still fails for real.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeSandbox() {
  const grad = () => ({ addColorStop() {} });
  const ctx = new Proxy({}, {
    get(_, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern') return grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => {};
    },
    set() { return true; },
  });
  const sandbox = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, isNaN, isFinite,
    parseFloat, parseInt, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout,
    WS: 2400, W: 1280, H: 720, DPR: 1, X0: ctx, X: ctx,
    hue: (h) => 'hsl(' + h + ',60%,50%)',
    hexToRgbStr: () => '255,255,255',
    rgba: (r, g, b, a) => 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')',
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.performance = { now: () => Date.now() };
  sandbox.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  sandbox.document = {
    getElementById() { return null; },
    querySelector() { return null; },
    createElement() { return { style: {}, width: 0, height: 0, getContext: () => ctx, toDataURL: () => '' }; },
    addEventListener() {},
  };
  sandbox.addEventListener = () => {};
  return sandbox;
}

// engine_maps.js, engine_data.js and engine_persistence.js are tables and pure
// helpers; everything else in src_v2 talks to the canvas or the DOM.
const PURE_MODULES = ['engine_maps.js', 'engine_data.js', 'engine_persistence.js'];

function loadEngine() {
  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  const loaded = [];
  for (const mod of PURE_MODULES) {
    const file = path.join(ROOT, 'src_v2', mod);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
    loaded.push(mod);
  }
  return { sandbox, loaded };
}

function exportsOf(sandbox, expression) {
  return vm.runInContext('(' + expression + ')', sandbox);
}

module.exports = { loadEngine, exportsOf, PURE_MODULES, ROOT };
