# AGENTS.md — Dead Zone repository notes

## What this is
Top-down zombie survival roguelite. Vanilla JS (no framework, no bundler deps), one HTML shell.
- Source of truth: `src_v2/*.js` + `src_v2/body.html` + `src_v2/style.css`.
- `src_v2/build.js` concatenates the modules (in `jsModules` order) and the markup into a single
  self-contained `www/index.html`, then syntax-audits the bundle with the Node V8 parser.

## Commands
- Build + syntax audit: `node src_v2/build.js` (must print `✓ Syntax Check Passed: 0 compilation errors!`).
- Serve for browser testing: `python3 -m http.server 8124 --directory www`.
- There is no unit-test framework. Verification is done with a throwaway harness page: copy
  `www/index.html`, inject a `<script>` before `</body>` that runs assertions against the bundle's
  globals, load it in a browser, read the pass/fail block out of the DOM. Delete the harness when done.

## Things that bite
- `let`/`const`/`function` declared at the top level of any `src_v2` file land in the *global lexical
  scope* of the page, so a second inline script can read and mutate `S`, `P`, `Z`, `run`, `W`, `H`, etc.
  That is how the harness drives the game. It also means a harness can bypass real gating: calling
  `update()` in a tight loop ignores the `run` flag that `loop()` honours, so keep assertions inside
  `update()`-reachable state machines idempotent (see `S.clearedWave`).
- Adding a module requires editing `jsModules` in `build.js` **and** bumping the version header.
- `git status` should never contain `www/_deep.html` / `www/_live.html`; they are scratch harnesses.

## Balance contract
`BALANCE_POLICY.md` is authoritative for caps and is updated every release. Hard ceilings that must
never be exceeded: crit ≤ 75%, damage reduction ≤ 65% (armour floor 0.35), cooldown reduction ≤ 50%,
wave-modifier `spMul` ≤ 2 and `eliteBoost` ≤ 0.8, ascension tier ≤ 5.

## Release
Version lives in: `package.json`, `android/app/build.gradle` (`versionCode`/`versionName`),
the `// DEAD ZONE vX.Y` headers in `src_v2/*.js`, `src_v2/build.js` banners and `src_v2/body.html`
tagline. Bump all of them, rebuild `www/index.html`, then commit/tag/push. The Android release APK is
produced by the GitHub Actions workflows in `.github/workflows/`.
