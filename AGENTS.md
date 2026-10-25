# AGENTS.md — Dead Zone repository notes

## What this is
Top-down zombie survival roguelite. Vanilla JS (no framework, no bundler deps), one HTML shell.
- Source of truth: `src_v2/*.js` + `src_v2/body.html` + `src_v2/style.css`.
- `src_v2/build.js` concatenates the modules (in `jsModules` order) and the markup into a single
  self-contained `www/index.html`, then syntax-audits the bundle with the Node V8 parser.

## Commands
- Build + syntax audit: `node src_v2/build.js` (must print `✓ Syntax Check Passed: 0 compilation errors!`).
- Serve for browser testing: `python3 -m http.server 8125 --directory www` (the port AGENTS used to
  document, 8124, is stale — check the running server before quoting a URL).
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
- **The particle pool `F` has a hard budget** (`getMaxParticles()`: 250 high / 140 med / 60 low) enforced
  by `trimParticleBudget()` (`engine_core.js`), which `update()` calls at **both ends** of the frame:
  above the hit-stop early return (hit-stop skips the rest of the frame, so nothing else trims on those
  frames) and again after the sim (a mass-kill frame pushes a gore burst per corpse, and every emissive
  particle costs an additive `drawImage` in `renderParticles()`). The `F.length < 250` guards on
  individual emitters are a soft throttle only — they are read-then-push and not atomic, and `burst()`
  plus the turret emitters do not guard at all. `_soak.html` asserts the pool peaks at the budget.
- **Never use `Array.prototype.filter()` on a per-frame pool** (`B`, `Z`, `F`, `BLD`, `DEC`, `GIBS`, …) —
  it reallocates every frame. Use `pruneArr(arr, keep)` from `engine_core.js`: it compacts in place, keeps
  order and the same array reference. One-off UI/derivation filters are fine.
- For radius tests only ever call `Math.hypot` when the real distance is consumed (e.g. `boom()` falloff).
  Pure comparisons use squared distance (`dx*dx + dy*dy < r*r`) — this matters in the bullet×zombie loop.
- `drawEntityBand()` (`engine_depth.js`) pools its entries in `BAND_LIST` and culls entities outside the
  camera rect ±140 px; it must not allocate per frame.

## Maps, props and ground detail

- `engine_maps.js` owns `MAP_DATA`, the per-sector rosters (`MP[].enemies`) and `GROUND_THEME`.
  **Two prop paths exist**: `engine_world.js` `draw()` section 7 has hand-written branches for 12
  prop types, and everything else falls through to `drawMapPropExtra(pr)` in `engine_props.js`
  (which returns `false` when it does not handle the type). Before v2.7.0 there was no `else` and
  16 of the 28 authored prop types were silently never drawn — if you add a prop type, add its
  branch *or* accept the fallback stand-in. The `_v27.html` harness fails the build on an
  unhandled authored type (`authored=28 unhandled=0`).
- `drawMapGroundDetail(cx, cy, W, H, mapDef)` paints cracks/stains/debris on a fixed 220px lattice
  hashed by `propRand(x, y, salt)` — deterministic, stores nothing. Tints come from
  `mapDef.crack/stain/debris`, assigned from `GROUND_THEME` in `enrichMapData()`.
- Props are **decoration only** (no collision) — painting them cannot change balance.
- Roads are not props: `mapDef.roads` is drawn by the roads pass in `engine_world.js`. Do not look
  for `dirt_road` / `v_avenue` / `h_boulevard` in the prop loop.
- `engine_props.js` uses `cachedRadialGradient` for the lit props; keep new prop art on the 3px
  lattice (`propPixelRect`) so it matches the rest of the game.

## Enemies, elites and wave modifiers

- `ZT` (`engine_data.js`) holds every archetype. **Aliases are real**: `walker`→`walk`, `runner`→`run`,
  `brute`→`tank`, `exploder`→`exp`, `spitter`→`spit`. A branch on `z.t` must cover the canonical id.
- `damageZ()` owns the positional armour rule: `armored` and the JUGGERNAUT boss take **0.45x** on a
  head-on hit (`cos(ha - facing) < -0.35` is the flank window). A shielder's ward multiplies incoming
  damage by **0.55x** for allies inside the bubble. Support auras are rebuilt every frame in a pass
  that **must run before the damage loop**.
- Adding an archetype means touching five places: `ZT`, the sector rosters in `engine_maps.js`, the
  spawn table / wave gates, a render branch in `engine_render_zombies.js`, and a dying-animation
  branch (`spawnDyingZombie`). The `_v27.html` harness asserts all five.
- **Never mutate `Z` while iterating it.** `necromancer` summons and the `SPLITTER` elite affix push
  onto `SUMQ`, which `update()` flushes after the zombie loop.
- Elites roll one `ELITE_AFFIX` (`z.aff`, `-1` = plain elite): `regen` / `swift` / `volatile` / `split`.
  An affix must change *how* the elite is killed, not just its HP.
- `applyWaveModifier()` conversions must resolve through the **sector roster** (`MP[...].enemies`),
  never a literal archetype — otherwise a modifier drops an enemy into a sector that never fields it.
- Heavy hits arm `HIT_STOP_TIMER`, which makes the *next* `update()` an intentional no-op. A harness
  that measures a 99999-damage kill must run several frames before counting anything.

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
`build.js` also rejects duplicate top-level `function`/`class` names across modules — a new
module must not redeclare an existing global (that is why the props module is `engine_props.js`
and not an extra block in `engine_world.js`).

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

## Bullets, skill FX and power-up iconography

* `drawBulletDefault` in `engine_feel.js` is the shared renderer for 12 of the 22 guns; the
  other 10 have bespoke branches in `draw()`. Both paths must be checked — the bullet harness
  reports which pass paints each weapon and must show **0 in "NEVER PAINTED"**.
* Bullet archetypes come from `bulletArchetype(wi)` and drive head shape, trail length and
  bloom. Speed matters: the trail length is `base * (1 + tier*0.12) * vk` where
  `vk = clamp(spd/700, 0.45, 1.9)`. Do not "simplify" `spd` away again — it was dead code
  that made every bullet smear identically.
* `skillCastFX` pushes a `SKILL_FX` entry per cast and `renderSkillFX` must draw **every**
  kind. It previously handled only `turret`/`grenThrow`/`nova` with no fallback, silently
  dropping 7 skills. Any new skill needs a matching `else if (e.k === ...)` branch.
* Icons: `getSkillIcon` must produce a **distinct** bitmap per skill id (20 ids) and
  `puGlyph` is the single source of power-up glyph art, used by both `drawPowerupIcon` and
  the HUD chips. `puGlyph` draws straight onto the current `X`; it does not return a data URL.
* `powerupPickupFX(id,x,y)` holds the per-power-up detonation and `renderPowerupAuras` the
  active world auras; both are called from `engine_world.js` draw/`applyPowerup`.
* Pixel power-up FX lives in `engine_feel.js` (`PU_PX`, `puPixelRing`, `powerupPixelBurst`,
  `updatePuPixel`, `renderPuPixel`). It is a *layer on top of* `powerupPickupFX` /
  `renderPowerupAuras`, and `renderPuPixel()` is called from `engine_world.js` `draw()` right after
  `renderPowerupAuras()`. `clearFeelFX()` must empty `PU_PX` on run reset.
* Regenerate and run the harnesses after touching any of this (each generator rewrites its page from
  the current `www/index.html`, so **always regenerate after a rebuild**):
  * `/tmp/mkbul.py` → `www/_bul.html` (per-weapon bullet coverage, trail-length scaling,
    crit palette, skill-icon distinctness, skill-cast paint check, power-up aura check,
    pickup-effect distinctness). Must be **0 FAIL**.
  * `/tmp/mkdeep3.py` → `www/_deep.html` (the full 250-assert regression suite).
  * `/tmp/mkv27.py` → `www/_v27.html` (prop coverage, ground themes, the six v2.7 archetypes, boss
    variants, pixel power-up bursts, the four elite affixes and roster-aware wave modifiers).
  * `/tmp/mkshot.py` → `www/_shot.html` (contact sheet; panels 1–9 — check the `PER-PANEL INK`
    report for non-zero ink and colour variety rather than eyeballing it).
  * `/tmp/mksoak.py` → `www/_soak.html` (the long-run invariant sweep: 14000 frames across all seven
    sectors with every archetype, boss variant and elite affix forced, checking for NaN, pool growth
    and exceptions). This is the harness that catches what per-frame assertions miss — it found the
    particle budget being blown 6x by mass-kill frames. Must be **0 FAIL**.
* Harnesses read their result out of `localStorage` (`V27_LAST`, `DEEP_LAST`, `BUL_LAST`,
  `SHOT_REPORT`) and several **wipe storage on load**, so run them one at a time and read the result
  through a small reader page before loading the next harness.

## v2.8.x notes (updated at v2.8.1)

* One draft screen at a time. `endWave()` calls `openNextDraft()` (engine_world.js), which shows the
  boon draft first (`#boondraft` overlay + `renderBoonBar`), then the perk draft (`openPerk`), then
  releases the run. `S.bd` marks the boon draft as open and blocks `openPerk`, the between-wave
  countdown (`loop()`) and the mid-wave `update()` perk check. Never raise two drafts together.
* The weapon strip lives at the top of the HUD (`weaponBarLayout()` in engine_world.js pins chips at
  y=8 between x=76 and W-196, max 7 owned guns, sliding window around `P.cur`). The touch handler in
  `tch()` hits chips before the reload/swap bands, and chips sit above `H*0.25` so they can never
  start a move stick. Do not move this row back to the bottom-centre: it sat under the thumbs and
  drags kept swapping weapons.
* `sanitizeSV()` must copy every own key of the incoming save (minus `__proto__`/`constructor`/
  `prototype`). A whitelist keyed off the `SV` template silently drops legitimate fields
  (`eqOpSkin`, `col`, `dmDate`, `lastLogin`, `rankClaimed`) and wipes equipped skins on the next
  `lobby()` pass.
* Known harness drift: `/tmp/mkdeep3.py` still asserts the pre-v2.8.0 skins container (`#skin-list`)
  and reads `#rview-s`/`#ach-list` while the rewards panel is closed, so it reports 6 stale FAILs
  ("skin grid renders 24 cards", "SERVICE RECORD ... zero height", etc.). Treat those six as stale
  selectors, not regressions — verify the skins grid in a browser instead. `/tmp/mksoak.py` and the
  244 behavioural deep assertions are the real gate.
* `python3 -m http.server 8131 --directory www` is the port that is actually free in this workspace;
  the 8124 in the build section above is stale.
