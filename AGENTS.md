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
- **All modules share one script scope.** A duplicate top-level `function`/`class` name does not error — the
  later module silently wins by load order. `build.js` now fails the build on any duplicate; if you hit it,
  rename your symbol (this is how `engine_feel.js`'s impact pass came to be called `combatImpactFX`, because
  `engine_fx.js` already owned `impactFX`).
- `git status` should never contain `www/_deep.html` / `www/_live.html`; they are scratch harnesses.
- `GUN_LOGIC.md` holds the derived per-weapon DPS/TTK table; re-run its script after any `WEAP` change.

## Depth & performance systems
- `renderParallax()` / `renderDepthFog()` live in `engine_depth.js` and are cosmetic only — parallax is a
  slow (0.55x) hashed ground-scatter layer under the grid, fog is a cached edge haze drawn after the
  lighting pass. Both bail out on the `low` quality profile.
- Combo heat (edge glow that escalates by `COMBO_TIERS`) lives in `renderDirectorOverlay()` in `engine_fx.js`.
- **Never use `Array.prototype.filter()` on a per-frame pool** (`B`, `Z`, `F`, `BLD`, `DEC`, `GIBS`, …) —
  it reallocates every frame. Use `pruneArr(arr, keep)` from `engine_core.js`: it compacts in place, keeps
  order and the same array reference. One-off UI/derivation filters are fine.
- For radius tests only ever call `Math.hypot` when the real distance is consumed (e.g. `boom()` falloff).
  Pure comparisons use squared distance (`dx*dx + dy*dy < r*r`) — this matters in the bullet×zombie loop.
- `drawEntityBand()` (`engine_depth.js`) pools its entries in `BAND_LIST` and culls entities outside the
  camera rect ±140 px; it must not allocate per frame.

## Skills, passives & status effects
- `engine_passives.js` owns every passive aura, summon and status effect (SPECIAL perks/relics) plus the
  meteor/missile/soul-blast pools. `update()` calls `updatePassives(dt)`; `draw()` calls
  `renderPassivesGround()` (aura rings + meteor telegraphs, under entities) and `renderPassives()`
  (blades, drones, missiles, soul rings, venom haze, above entities). `init()` calls `clearPassives()`.
- **Every skill in every `CL[].sk` list must have a real branch in `skill()`** (`engine_world.js`).
  `BT[0..2]` bind directly to `CL[SV.cls].sk[0..2]`, so a missing branch silently burns the cooldown for
  no effect. The harness asserts this for all classes — keep it green when adding a skill or class.
- **Every perk/relic `S.*` field must have a consumer.** It is easy to add a row to `PKS`/`AR`/`SKL` and
  never read the field; the harness asserts a known list of formerly-inert fields stays consumed.
- Damage-over-time (Immolation, Venom) must NOT go through `damageZ()` — use `dotZ()`, which writes
  `z.hp` directly. `damageZ()` fires FX and floating numbers, which is wrong for a per-frame tick.
- Barrier charges (`S.bc` current / `S.bl` cap) absorb one hit of ≥ 5 raw damage and rebuild after 12s in
  the `update()` loop; the ≥ 5 gate keeps per-frame acid ticks from eating a charge every frame.

## Balance contract
`BALANCE_POLICY.md` is authoritative for caps and is updated every release. Hard ceilings that must
never be exceeded: crit ≤ 75%, damage reduction ≤ 65% (armour floor 0.35), cooldown reduction ≤ 50%,
wave-modifier `spMul` ≤ 2 and `eliteBoost` ≤ 0.8, ascension tier ≤ 5.

## Release
Version lives in: `package.json`, `android/app/build.gradle` (`versionCode`/`versionName`),
the `// DEAD ZONE vX.Y` headers in `src_v2/*.js`, `src_v2/build.js` banners and `src_v2/body.html`
tagline. Bump all of them, rebuild `www/index.html`, then commit/tag/push. The Android release APK is
produced by the GitHub Actions workflows in `.github/workflows/`.

## Lobby / mobile layout

* The Android app is **landscape-locked** (`AndroidManifest.xml`). Landscape on a phone *is* the mobile
  layout — always check the lobby at ~844×390 and ~640×360, not just at 1920×1080.
* `#p0.pp.on` (the PLAY page) is a flex row with `overflow: hidden`. Any block inside `.l-left`/`.l-right`
  must be given `flex-shrink: 0` in short-landscape media queries, otherwise the flex algorithm compresses
  it (the sector picker previously collapsed to 12px and the rewards panel to 80px, unreachable because the
  parent cannot scroll).
* Two lobby media queries exist and must both stay working:
  * `@media (max-width: 760px), (max-aspect-ratio: 1/1)` — stacked, single scrolling column (portrait).
  * `@media (max-height: 460px) and (orientation: landscape)` — two independently scrolling columns.
* `_deep.html` (built by `/tmp/mkdeep3.py`) guards both queries. Run it after any lobby CSS change.
