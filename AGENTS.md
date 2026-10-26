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
Version lives in: `package.json`, `src_v2/engine_bootstrap.js` (`GAME_VERSION`),
`android/app/build.gradle` (`versionCode`/`versionName`) and the `// DEAD ZONE vX.Y.Z` headers in
`src_v2/*.js`. `npm run audit` reads all of them and fails if any disagree, and the release workflow
runs the audit before it builds, so a version drift cannot reach a release any more.

`npm test` = build + audit + logic tests (`tools/`). The release path is a tag: push `vX.Y.Z`, and
`.github/workflows/release.yml` builds the signed APK, verifies the signature, and attaches the APK
and a `git archive` source zip. A push to `main` runs `.github/workflows/ci.yml`.

Current line: **v1.0.0** — the 2.x tags and releases were deleted so the repository restarts from a
single clean baseline.
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

## v2.9.0 notes (shipped)
* Boon draft runs at wave clear and is shown *before* the between-wave heal. The clear heal is
  banked in `S.waveHeal` and applied at the top of `startWave()`, so `COMBAT STIMM` is offered when
  the player is actually hurt instead of being filtered as a wasted pick.
* Enemy slow is additive per stack and now capped at -70% (`1 - Math.min(0.7, 0.12 * S.tw)`).
  Without the cap, 8 slow stacks (4 boons + Time Warp x3 + Chrono Shard) reached -96% and froze the
  swarm. Keep any new slow source inside that cap.
* `S.bl2` (Bloodlust fire-rate window) now decays; it used to latch on for the whole run after the
  first kill.
* Draft totals in `boonTotal()` must show *effective* values: damage uses `effDmPreview()` to mirror
  the soft cap in `fire()` (`raw > 3 -> 3 + sqrt(raw-3) * 0.8`) and crit uses `critChancePreview()`
  so class + skill crit is included. Showing raw `S.dm` overstated late-run damage.
* Latent dead reads remain in `fire()` for `S.fo`/`S.stl` and in the speed/fire-rate math for
  `S.hd`/`S.cst`/`S.lu` (never written anywhere). Harmless today; wire them or drop them.

## v2.9.1 notes (shipped)
* The lobby split is `.l-left: 32% / .l-right: 68%` → back to **35/65**. Narrowing the left column
  to buy width for the sector preview made the hub's own sidebar overflow: at 640x360 the zone
  description and the `#zone-stats` row each wrapped a line, `#hub-sector` grew 52px→80px, and
  `.l-left` needed 269px inside 243px. Measure both columns (`clientHeight` vs `scrollHeight`) after
  any change to this split — the right column fitting says nothing about the left.
* `#zone-stats` (body.html) exists so CSS can target the sector stat row directly. On narrow
  landscape it goes `flex-wrap: nowrap` with ellipsis children, and `#mapd` is line-clamped, because
  the row is what actually decides whether the sidebar fits. Empty `#zone-haz-tag`/`#zone-asc-tag`
  are `display:none` there so they don't eat gap.
* `@media (max-width: 700px) and (max-height: 420px) and (orientation: landscape)` is the block that
  keeps the hub on one screen for 640x360-class phones. Verified: `.l-left` client == scroll (243/243).
* The map window stacks on desktop but is a **two-column grid** under
  `@media (max-height: 460px) and (orientation: landscape)`: preview + zone intel left, `#maps` tiles
  right, CLOSE spanning both. Stacked, the 265px preview filled the whole 278px `.modal-body`, so the
  sector tiles were permanently below the fold. Verified at 640x360: body client == scroll (235/235),
  preview 127px, `#maps` 177px, last tile bottom 264 < body bottom 322. `#map-select-lbl` and
  `#map-modal-enemies` are hidden there.
* `nukeBlast()` (engine_director.js) was a screen wipe: 560px radius, `420 * S.dm` base damage, which
  deleted everything that had closed on the player and looked like "the wave cleared itself". Now
  340px radius, `1 - d/430` falloff, `170 * min(S.dm, 2) * falloff + 45`, boss chip 5%, knockback
  raised to 330 so it staggers instead of killing. The even-wave supply beacon still excludes `nk`.
* Power-up drops now read as arrivals: `spawnDrop` stamps `age`, `updatePickups` advances it,
  `renderPickupsPass` applies a damped-spring pop (`1 - exp(-a*9) * cos(a*20)`, floored at 0.06)
  for `k === 'pu'`, `spawnPowerup` pushes a coloured arrival ring via `hexToRgbStr(def.col)`, and
  `drawPowerupIcon` (engine_fx.js — *not* engine_feel.js) adds a counter-rotating ticked rune ring
  plus three orbiting motes around the hex plate.
* Enemy HP (engine_data.js `ZT`) raised holistically and the `spawn()` wave curve re-bent
  (`1 + w*0.07`, then `w>12` at 1.2/0.055 and `w>22` at 1.35/0.11), including the 3
  reinforcement/splitter HP sites. Player damage compounds multiplicatively while enemy health grew
  linearly, which is why late waves felt free.

## v2.10.0 notes (shipped)

Signing hardening, loading screens, and the final bug audit.

### Release signing
`android/app/release.keystore` is no longer tracked (`git rm --cached`, entries added to
`.gitignore`). Credentials come from `android/app/keystore.properties` (local, gitignored) or
`RELEASE_*` env vars fed from repo secrets in CI. `build.gradle` falls back to the debug key when
neither is present so local builds still work. `release.yml` now REFUSES to publish if
`RELEASE_KEYSTORE_BASE64` is unset, and `apksigner verify --print-certs` must pass before the
release step runs. `keystore.properties.example` documents the format.
WARNING: the old keystore and its passwords are still in the public git history. Treat that key as
compromised; rotating it breaks in-place updates for existing installs.

### Loading screens
`#load-screen` is a staged boot loader driven by `initGameAssets()` (real first-run work: stat
glyphs, skill/perk glyphs, sector preview). `#deploy-screen` (`showDeployScreen`) is an 820ms
transition used by BOTH run-start paths: `begin()` in engine_world.js and `beginEvent()` in
engine_events_missions.js. During the transition `run` is held at 0 so the world cannot tick;
`onReady` sets it back and calls `startWave()`. Both screens keep `pointer-events: none` (the
deploy screen until `.on`) so a failed removal can never trap the player.

### Bugs found by the audit and fixed
1. **All three Special Operations were dead.** `beginEvent()` reset overlays with
   `['start','over','shopov','pause','perk'].forEach(i=>$(i).classList.remove('on'))`. The shop
   overlay had been deleted from the markup, so the lookup returned null and the unguarded
   `.classList` threw *before* the event context was set. Tapping DEPLOY OPERATION closed the
   briefing and then did nothing. Now guarded.
2. **COMBAT DOSSIER opened empty.** `openTacticalRecords()` filled `#run-details-body`, but the
   markup calls the node `#run-details-content`, so the guarded block never ran.
3. **Lifetime kills always showed 0.** The dossier read `SV.kills`, which nothing ever writes;
   `settleRun()` maintains `SV.lt.kills`.

### Build-time guard (new)
`build.js` step 3b audits element ids: every id reached by `getElementById('x')` / `$('x')` /
`['a','b'].forEach(i=>$(i)...)` must exist in the markup or be created at runtime. It skips
runtime-assigned ids (`el.id = 'x'`), JS-template ids, `||` legacy fallbacks and lookups that are
immediately null-guarded. This is the bug class that killed the Special Operations. Warn-only.

### Audit coverage (this release)
- Static: duplicate ids (none), undefined ids (found the 3 bugs above).
- Runtime pass 1: 70 steps over lobby tabs, all 7 sector previews, map/missions modals, waves 1-19,
  nuke, every powerup, every enemy type, all skills, gun picker, every perk, pause/quit. 0 errors.
- Runtime pass 2: 44 steps over boss waves 20/25, waves 50/100, perk draft, boon-under-perk guard,
  all 3 events, persistence roundtrip, dossier, death, redeploy, back-to-lobby. 0 errors.
- Soak: 42s at 640x360, 13 waves cleared through the real wave-clear branch, 17 drafts resolved,
  **0 boon/perk stack violations**, 0 errors.
- Layout: 640x360 lobby and map modal fit with no overflow; all 7 sector tiles inside the scroll box.

### Mobile-landscape lobby (v2.11.0+)
The lobby is landscape-only by design; there is no portrait/desktop variant to keep in sync.
All lobby CSS lives in one section of `src_v2/style.css` headed
`v2.11.0 - MOBILE LANDSCAPE LOBBY`, scoped to `#start` through custom properties
(`--z-surface`, `--z-line`, `--z-ink`, `--z-acc`, `--z-gold`, ...) so the arena tokens are
untouched. Eight older overlapping landscape media queries were deleted, not layered over.
Invariants worth preserving:
- `.l-left > *:not(#hub-sector)` and `#hub-sector > *` are `flex-shrink: 0`. The zone card is
  the only flexible row, so a short viewport can never squeeze a label or clip its own text.
- `#hub-sector` is `justify-content: space-between` with `#zone-enemy-icons` hidden below
  375px height; don't re-add `margin-top: auto` anywhere inside it.
- `#best-badge` is a `<button>`, so it needs an explicit `min-height` or it inherits the
  global `button { min-height: 38px }`.
- `#mapd` must fall back to `MP[i].d`; `MAP_DATA` has no `desc` field and will blank it.

Verification recipe: build, serve `www/` on a local port, then load `index.html` inside
phone-sized iframes and assert `scrollHeight <= clientHeight` per element, that nothing sits
outside the viewport, and that each of the 8 `#nav` buttons switches its `#p*` panel.
Confirm that element ids 1-8 are `['p0','pe','psk','pc','ps','p2','pa','p3']`.
The vision tool is not reliable for these screenshots; decode the PNG with Pillow instead.


### In-game controls and the maps window (v2.11.0+)
- Canvas-drawn controls cannot inherit CSS `env()` insets. `saInsets()` in
  `src_v2/engine_world.js` reads the computed padding of the zero-size `#sa-probe`
  element instead; `jPos()`, the pause button and the top-right HUD cluster all offset
  by it. If the HUD is ever added to, use `insetR()`, not a literal `W - n`.
- Control geometry scales off the shorter viewport edge via `ctlScale()` (0.78-1.2), so a
  360px-tall phone gets smaller sticks than a 440px one. The touch hit-test radius uses
  the same factor, so button centres and hit areas cannot drift apart.
- `#maps` has two conflicting declarations: `display: grid !important` in the lobby
  section and `display: flex !important` in the swipe-carousel rule below it. The later
  flex rule wins, which turned the 7 sector tiles into an 836px horizontal strip with 5
  off-screen and each stretched to 171px tall. `#map-modal #maps` therefore restates
  `display: grid` and neutralises the carousel's `min-width: 112px` / `flex-basis`.
  Verify with the tile box, not the container: assert `scrollWidth == clientWidth`,
  `scrollHeight == clientHeight`, and that no tile rect escapes the `#maps` box.
- `returnToLobby()` clears the entity arrays. `init()` would clear them on the next
  deploy anyway, but the lobby must not sit on a half-live world.
- `openPerk()` carries the same "the lobby is not a gameplay state" guard as
  `openNextDraft()`: a leftover level-up must never raise a draft over `#start`.

## Post-v2.11.0 notes — mobile controls, combat feel & visual comfort
### Input (one owner per finger)
- Every touch is claimed by a role in the `TOUCH_ROLE` map keyed by pointer
  identifier and released only for that identifier. Releasing one finger can no longer
  cancel another role. `pointerup`, `pointercancel`, `lostpointercapture`, `blur` and
  `pagehide` all funnel into `releaseAllInputs()`; `pause()` and `returnToLobby()` call
  it too, so a control can never stick.
- Buttons are claimed before the sticks in `touchStart()`, so a thumb on an ability or
  FIRE cannot also start an aim drag; a second finger in a half whose stick is held
  takes the free stick instead of stealing the held one.
- Gestures are blocked on the canvas only (`#c { touch-action: none; overscroll-behavior: none }`).
  Long list panels keep `pan-y` so settings and inventories still scroll.
### Control layout
- `btRad()` is one uniform 22 * `ctlScale()` radius for every button, with a per-button
  tap radius `btHit(b) = (b.hr || 25) * ctlScale()` — the drawn size and the hit size use
  the same scale factor, so they can never drift apart. Mixed radii made the cluster look
  ragged and generous radii made neighbouring abilities overlap under first-match-wins.
- Abilities live in a 2x2 `CLU_CELL` cluster at 52 * s pitch, 104 * s above the right
  stick (`clusterPos()`); slot 0 is the signature skill, slot 3 the far corner. A four-button
  arc plus a dedicated FIRE trigger cannot both fit a 360px-tall screen.
- FIRE sits at `[j[0] - 104*s, j[1] + 4*s]` — the empty band between the weapon card and
  the aim stick, at stick height, where an aiming thumb is least likely to catch it.
- Stick base rings are drawn at the live origin (`J.l.ox/oy`, `J.r.ox/oy`) so a floating
  stick appears under the summoning thumb.
### Freeze / shake on draft selection
- `addShake()` is the single shake funnel; all 12 former `SH = Math.max(...)` call sites
  go through it, and shake decays even while `run === 0`. A frozen `DT` used to leave
  `SH` pinned, which is what made a boon pick read as a shake that never ended.
- `takeBoon()` is guarded by `S.bdLock` (cleared in `openBoonDraft()`), so a double tap
  applies exactly one boon; the second card no longer re-enters the draft open path.
- Drafts chain, never overlap: the tactical boon first, then the level-up perk via
  `openNextDraft()`. `WAVE_CLEAR_T` does not run while `S.po || S.bd || S.gp`, so the
  between-wave beat resumes the moment the last card is taken.
### Announcements
- `announce(title, col, sub, pri, key)` keeps at most one major (pri <= 2) and three
  minors, with per-key lifetimes in `ANN_PRI_LIFE`. A repeated key refreshes its entry
  instead of stacking a second banner. `drawAnnouncements()` renders the major at
  `H * 0.2` and the minors 52px below in a steady column with no scale punch — the old
  per-entry punch on every alive banner was the wave-clear flicker.

## Post-v2.11.0 notes — mobile combat pad & weapon HUD (v2.12.0)

The v2.12.0 release carries two changesets: the boon-freeze / control-layer work (`engine_core`,
`engine_feel`, `engine_director`, `engine_fx`, `engine_lobby`, `engine_meta`, `engine_passives`,
`engine_persistence` + AGENTS.md) and this layout pass (`engine_world.js`, `engine_data.js`).

### One anchored combat pad (`engine_world.js`)
`padAnchor()` derives every control position from the live aim-stick position, which is itself
derived from the viewport and the safe-area insets, so the pad keeps its proportions and its
distance from the resting thumb on any landscape size. Cells (`padUnit()` = `max(0.88, ctlScale)`):

```
        colB        colA     colA = jR.x - 96u    row1 = rowY -  80u
         (o)         (o)     colB = colA - 80u    row2 = rowY - 156u
         (o)         (o)     rowY = jR.y -  8u
                         (o)  aim stick
row2: slot 2   | slot 3        drawn radii: FIRE 34u, others 27u, pause 20u
row1: slot 0   | slot 1        hit radii:   FIRE 38u, others 31u, pause 26u
rowY: RELOAD   | FIRE
```
Before this, RELOAD was positioned off `weaponHudRect()` (`r.x + r.w + 34 * ctlScale()`), i.e. on the
far right edge of the weapon card - a screen and a half from FIRE - and the four abilities fanned
around the aim stick on an arc whose upper cells collided with the FIRE column on 360px-tall
screens. Slot 0 is the class's signature skill (DASH for Infantry) and sits directly above FIRE;
slot 1 (grenade for Infantry/Commando) sits above RELOAD.

`abilitySlots()` de-duplicates the ability list: Infantry and Commando already list `gren` in their
own `CL[].sk` kit, so the always-available grenade entry is only appended when the class does not
have it. That used to put two buttons on screen that threw the same grenade ("GRENADE" and "GREN").

PAUSE moved from `W - 34 * ctlScale()` into the top HUD's own 50px right-hand gutter
(`W - 25u - insetR()`, vertically centred on the cash/horde plate at `26u + insetT`): at 20u it no
longer eats into the plate's reserved gutter, and at 26u its touch target is still >= 44px.

### Weapon card (`drawWeaponHud`)
`weaponHudRect()` is now sized from the viewport (`w = clamp(146, W * 0.22, 200)`,
`h = 52 * padUnit()`, bottom margin 8 + safe-area) and centred; it no longer subtracts 30px or
borrows a fixed 46px height. Contents are measured, never hardcoded:
- icon column 32u (the same `gun()` sprite the picker uses) with a two-chevron "tap to change" mark
- row A: weapon name (left, `fitLabel()` shrinks then ellipsises into the space left of the right
  column) and `ammo / mag` right-aligned - the two can never meet
- row B: `DMG n` left, fire mode right, both at 9u
- `weaponMode(w)` labels SEMI / AUTO / BOLT / PUMP from the weapon's own `r` and `p`; it describes
  the gun, it changes no rate, damage or reload
- reloading turns the border, ammo figure and mode label amber and adds a bottom-edge progress bar;
  low ammo (<= 25% of the magazine) shows the count in orange-red
- the card only shrinks the name, so a long name can never collide with "12 / 34"

### Ability icons on the canvas
`getSkillIcon()` now caches its offscreen canvas in `SK_CANVAS` next to the data URL, and
`drawSkillGlyph(ctx, id, x, y, size, col)` blits it. The battlefield buttons therefore use exactly
the glyphs the lobby shows, with no per-frame rasterisation. Cooldown draws as a ring that refills
(not a pie over the icon), the grenade carries a charge badge (`S.gr`, dimmed at 0), and state
colours are fixed: ready `#e4eec8`, cooling `#9fb086`, unavailable `#8a917e`.

### Verification recipe
A temporary `www/_c.html` harness (deleted before packaging) framed `index.html` at 800x360,
854x393, 915x412 and 960x440, read the geometry from the game's own `padAnchor()`/`BT`/`jPos()`/
`weaponHudRect()`, spied `CanvasRenderingContext2D.fillText` to capture the HUD's real text boxes,
and drove the real `touchStart`/`touchEnd` path. 69 assertions, all passing:
- every control >= 44px touch target; drawn vs hit radii within 12px; FIRE the largest
- no touch target overlaps another (tightest ~10px, fire/sk0) and none overlaps a stick
- all controls inside the viewport; pad top 114.8 / 130.1 / 136.4 / 145.6 at the four sizes, all
  clear of the 48px top HUD band; leftmost pad pixel > W/2 at every size
- RELOAD 16.7-19.9px from FIRE, same row, <= 84px centre to centre
- the weapon card touches no control and no stick; its four labels never intersect and never leave
  the card, including the longest weapon name ("Glacier Breaker") and a switched weapon
- FIRE holds and releases; RELOAD reloads without adding a shot and cannot stack or fire while full;
  the gap between two controls fires nothing (it is the aim zone); left stick + aim stick + FIRE run
  together and releasing one leaves the others held; no stuck input after all fingers lift
- desktop `r` still reloads; no console errors

## Post-v2.12.0 — control chrome rebuilt against a reference (unreleased)

The pad geometry from v2.12.0 was kept (positions, pitch, hit radii all passed the same
assertions); what changed is the *drawing layer* of every control, plus one geometry fix.

### One disc vocabulary (`engine_world.js`)
- `ctlDisc(cx, cy, r, ring, {fill, glow, glowA, ringW, hi})` draws every control: dark
  translucent well, one thin accent ring, a hairline inner highlight at `0.78r`, and an optional
  soft outer glow. New controls should use it rather than drawing their own arcs, or the pad
  stops looking like one system.
- `perfNow()` replaces the inline `performance.now()` fallbacks, and `btFlash(b)` (fed by
  `b._t0` set in `btPress`) returns a 0..1 decay over 220ms used to brighten a ring and swell its
  glyph right after a press.
- Stick knobs carry role glyphs: `drawArrowCrossGlyph` (MOVE) and `drawCrosshairGlyph` (AIM).
  The MOVE/AIM word labels moved below centre (`base[1] + R*0.55`) so they never sit under the knob.
- The grenade charge badge is a dark pip with an amber ring (`r*0.68` offset, `max(8.5, r*0.36)`
  radius) instead of a filled amber pill — the reference's numeric-pip idiom.
- Ready abilities keep a faint olive glow (`rgba(143,174,74,0.42)` at `glowA 0.3`); cooling and
  unavailable states drop the glow entirely, so *available* is the only thing that halos.

### Pause button is now sized in absolute pixels
`pauseRad()` 18 / `pauseHit()` 24 / `pausePos()` at `W - 24 - saR`, `26 + saT`. It sits inside the
top HUD's fixed 50px right-hand gutter, which is a fixed band: the old `20*u` ring overhung the
screen edge once `padUnit()` passed ~1.09 and clipped toward the cash/horde plate above that.
Do not put pause back on `padUnit()` scaling.

### Verification recipe (reference-styling pass)
Temporary `www/_v.html` harness (deleted before packaging), deleted after use. It frames
`index.html` at 800x360 / 854x393 / 915x412 / 960x440, reads geometry from the game's own
`BT`/`jPos()`/`weaponHudRect()`, installs the `fillText` spy **inside the game realm** (patching
the prototype from the parent window does not reach the game's context), and posts both its report
and canvas `toDataURL` captures to a local sink so results can be read from disk.

81 assertions, 0 failures on the new build. Assertions worth keeping: every touch target >= 44px,
drawn vs hit radii within 12px, every touch target and every *drawn* ring inside the viewport,
PAUSE ring inside the 50px gutter, no two touch targets overlap, no control overlaps a stick or the
weapon card, FIRE largest, pad clear of the 48px top band and of the left half, RELOAD beside FIRE,
the card's four labels inside the card and never intersecting (including "Glacier Breaker"), the
full touch path (hold/release, reload without firing, gap = aim zone, three fingers at once,
no stuck input), desktop keys.

The same harness run against the shipped v2.12.0 build fails exactly one real assertion — PAUSE's
hit target extends past the right edge at all four sizes — plus 11 cascade failures caused by the
harness probing functions that build does not have.

### Flat-plate captures
Rendering `drawControls()` over `#0f130e` with no world gives a deterministic image that can be
diffed between revisions and between states (idle / FIRE held / reloading / cooling / pressed).
Measured deltas against v2.12.0, same geometry: AIM knob reticle 0 -> 163 warm px, MOVE knob
arrows 0 -> 129 light px, stick well ring mean luminance +8 (move) / +7 (aim), pad region
1704 -> 2494 distinct colours; state feedback: FIRE ring luminance 96 -> 170 held plus glow
93 -> 769 px, reload ring 72 -> 146 with 596 amber progress px, press flash 79 -> 115 with 272
near-white px, cooling dash icon 53 -> 42 (dimmed) with the refill arc 60 -> 164 px.


## Release baseline v1.0.0

The 2.x line was deleted (tags and releases) and this repository restarts at `v1.0.0`: one commit
range, one tag, one APK. What the pre-release audit changed, beyond the gameplay/UI work already
recorded above:

* **Dead code removed** (`tools/audit.js` scans every `function` declaration in `src_v2/*.js` against
  every mention in the modules, `body.html`, `style.css` and `tools/`, so inline `onclick="fn('x')"`
  handlers count as callers). Removed: `engine_maps.js:initMapArchitecture` (a parallel obstacle
  builder that would have wiped `O`; the live path is `engine_world.js` `rebuild()` reading
  `MAP_DATA[].walls`), `engine_core.js:getMaxDecals`/`getMaxBloodDrops` (superseded by
  `getQualityProfile().maxDecals` and the `BLD` cap in `engine_gore.js`), `engine_core.js:sndTurretFire`
  (the turret already plays its own shot sound in `engine_render_turret.js`), `engine_depth.js:flameMuzzleGradient`
  + `FLAME_MUZZLE_GLOW` (superseded by `muzzleGlowGradient()`), `engine_events_missions.js:toggleSkin`
  (superseded by the Skins tab's `equipSkinDirect`), `engine_gore.js:bakeDecalsToBackground` and
  `engine_meta.js:boonHudLine`.
* **Save sanitiser hardened** (`engine_persistence.js` `sanitizeSV`): the old
  `Math.max(0, Math.floor(Number(v) || 0))` clamp lets `Infinity` through — a hand-edited save could
  inject a non-finite XP/credit/skill-rank value and poison everything derived from it. All counters
  now go through one `num(v, lo, hi, dflt)` that rejects non-finite input, `lvl` is capped at 9999,
  `best` at 100000, and `rev`/`ts` (which decide the native-Preferences merge winner) are clamped too,
  so an infinite revision cannot win every future merge.
* **One gradient cache** (`engine_core.js` `grad()`/`gradReset()`, declared before the first `rs()`
  call): static screen-space gradients are built once per resize instead of per frame. Measured on the
  bundled build: 3.83 -> 0.32 gradient objects per frame at unchanged frame time.
* **`engine_hud.js`** split out of `engine_world.js` (pure move, same single script scope).


## Release v1.0.1 — the UI binding, the scratch canvas and the save bounds

Three of the audit findings that shipped as "documented" in v1.0.0 are fixed here. All three are the
same shape of bug: state that only one code path was supposed to touch, reachable from several.

* **F9 — the markup no longer carries JavaScript.** Every `onclick="fn('x')"` in `body.html` and in the
  markup `engine_events_missions.js` / `engine_lobby.js` render into a string is now
  `data-act="name" data-arg="…"`, and `engine_bootstrap.js` owns one delegated `click` listener over a
  `UI_ACTIONS` table (last section of that file). A click walks up from the target to the nearest
  `[data-act]` and calls the matching action with `dataset.arg`. Why it was worth the churn: the inline
  handlers were invisible to every check the repo has — the dead-code scan counts a name inside an
  `onclick` string as a *caller*, so a deleted function stayed "referenced", and a stale tab index in
  the markup (the SHOP insertion shifted every panel) produced a tap that did nothing instead of an
  error. Two new audit checks and one harness section now cover it: `no inline event handlers in markup
  or generated html`, `every data-act names a real UI action` (both the literal and the
  `${cond ? 'a' : 'b'}` form), and a harness that clicks all nine nav buttons and asserts each one opens
  exactly its panel. Render-scoped closures that capture per-render state (perk cards, the gun picker)
  keep their direct `.onclick`; converting those would need the state passed through the DOM.
* **F8 — one helper owns the scratch canvas swap.** `withCtx(cx, fn)` in `engine_core.js` saves `X`,
  points it at the scratch context and restores it in a `finally`. `gunIcon`/`charSkinIcon`
  (`engine_data.js`), `clsIcon` (`engine_render_player.js`) and `drawHeroBand` (`engine_lobby.js`) now
  go through it instead of assigning `X = cx` and restoring by hand. The old code restored `X` on the
  normal path only, so a throw between the assignment and the restore left the *main loop* drawing into
  a 220×128 offscreen canvas — the lobby keeps painting its background, so the game looks "frozen at the
  menu" with no error. The audit now fails if any module other than `engine_core.js` contains a bare
  `X =` assignment, and the harness asserts `X === document.getElementById('c').getContext('2d')` after
  each scratch render *and* after forcing one to throw mid-draw.
* **F11 — a save has a size, and it is enforced on the way in.** `sanitizeSV` used to copy every key of
  the incoming object and clamp only the collections it knew about, so a hand-edited save with a 50 000
  key `pace.times` (or `skins`, `mast`, `ach`, `ar`, `own`, …) was adopted whole and written straight
  back out. The write then throws `QuotaExceededError`, the player finishes the session with nothing
  saved, and the payload is still in the save for the next write — unrecoverable by pruning, which only
  knows about the pace line. Now: every known map is capped (`MAP_MAX` 256 for id-keyed maps, `PACE_MAX`
  4096 for the wave-keyed pace line, 64 for the relic/loadout lists), values are coerced or dropped
  (flags to 0/1, non-finite numbers dropped, ids must index a real table row), `col` must be a hex
  colour, the date stamps are truncated, and an *unknown* key survives only while it is under 1 KB and
  among the first 32 — that keeps the forward-compatibility intent ("a key from a newer build is not
  data loss") without leaving a quota bomb in place. `sv()` also gained a last-resort path: if the
  string is still over `SAVE_MAX_BYTES` after pruning the pace line, `dropHistory()` clears the pace
  line and the `lt` caches (both rebuild themselves) and warns once, because losing the run history is
  better than losing every credit the player earned after that point.
* **F10 — the keystore in git history: looked at, deliberately not rotated.** `android/app/release.keystore`
  is in history (added by `e975ad5`, removed from tracking later and now gitignored), and the repository
  is public. The audit's tracked-file scan and `git log --all -p` over every `keystore.properties` path
  both come back empty for `storePassword`/`keyPassword`, so the file is exposed without its password,
  and a JKS is useless without it. Rotating it would change the app's signing identity, which breaks
  in-place updates for anyone who already installed a release APK, so it stays a decision for the owner
  rather than something a release commit does silently. The procedure, if the password ever leaks: new
  `keytool -genkeypair` under a new alias → replace `android/app/release.keystore` locally → update
  `RELEASE_KEYSTORE_BASE64`/`RELEASE_STORE_PASSWORD`/`RELEASE_KEY_PASSWORD`/`RELEASE_KEY_ALIAS` →
  cut a new tag.


## Release v1.0.2 — ownership, claims, and the feedback that was missing

Two functional bugs (both "a second code path quietly overrode the intended rule") plus the combat
feedback work. Details and root causes: `dead-zone-analysis.md` §9 (N14–N17).

* **N14 — weapons no longer unlock themselves.** `syncWeaponUnlocks()` derived ownership from rank
  (`SV.lvl >= WEAP_RANK[i] -> SV.own[i] = 1`). That was right when the shop was retired and became a
  bug when the shop returned in v1.0.0: every rank-up handed over that rank's guns for free, past
  their prices (Dual Pistols "unlocked by default" was rank 3 doing this). Ownership is now written
  only by a purchase or the starter pistol; rank is a purchase *prerequisite*
  (`weaponRankReq(i)` / `weaponRankMet(i)`), shown on the card as `RANK n REQUIRED`. `applySV()`
  mirrors ownership both ways and normalises a short/absent/non-array `own` list.
* **N15 — missions and claims work.** Four causes: `sanitizeSV` pushed `dailyMissions` through
  `numMap()` (mission records are objects → `NaN` → board dropped on save; now `missionMap()`);
  `claimLoginDay`/`claimRank` compared a string `data-arg` against numeric table rows with `===` (now
  coerced and re-validated server-side); `initDailyMissions()` only reseeded on a date flip (an empty
  board is now reseeded for today, while the streak still only advances on a real day change); and the
  `waves` mission type had no caller at all (now counted inside the idempotent wave-clear branch).
* **N16 — burn is visible damage.** Immolation dealt `20 * S.fi * dt` per frame through `dotZ()`:
  real damage, zero feedback, frame-rate-dependent. `applyBurn()` now pays the same dps in 0.25s ticks
  with flames drawn from the same status, capped at `BURN_MAX`, non-stacking, and with a short
  flamethrower-hit residue (`applyFlameHit`, presentation only — the shot already dealt its damage).
* **N17 — auras and explosions touch the ground.** Frost/Immolation draw their real radius as a
  boundary and fire a reach ring when taken; `boom()` drops a scorch decal sized from the blast radius
  it damages; walking kicks up footfall dust on the stride beat. `RG` rings accept an optional `maxR`
  so a reach ring stops at the aura radius instead of sailing past it.
* **Test tooling.** `tools/audit.js` gained a GAMEPLAY WIRING section (every daily mission type has a
  gameplay caller; the waves mission sits in the idempotent branch; every claim function re-validates
  its own flag) — that is the check that would have caught the `waves` mission shipping dead.
  `tools/load-engine.js` `loadEngine()` now takes `extra` modules and `globals` so the claim functions
  can be tested headlessly; `tools/test-logic.js` gained WEAPON OWNERSHIP and REWARDS & CLAIMS
  sections (59 assertions); `tools/regression-harness.js` gained PROGRESSION & REWARDS, BURN STATUS and
  GROUNDING sections (213 assertions) and its SHOP section now raises the profile to the weapon's rank
  before expecting a buy button.
* **Remember when running the harness:** `npm run harness` only repacks `www/index.html`, it does not
  rebuild it — run `npm run build` first or you will test a stale bundle.
