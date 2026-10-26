# DEAD ZONE — Codebase Analysis

Prepared by Lemon Code (AI agent) on behalf of the user. Repository: `dead-zone` @ `main`.
Scope: full source review of `src_v2/` (21 modules, 14,778 lines), the bundler, the test
tooling, the Android shell, and a live behavioural pass against the built artifact
(`www/index.html`, 688 KB).

Line counts and test numbers in this document were re-measured after the shop-restoration
pass in section 7; the findings themselves are unchanged.

---

## 1. How the code is put together

```
src_v2/*.js  ──build.js──►  www/index.html   (single self-contained file, 688 KB)
                                 │
                              Capacitor  ──►  android/  ──►  release APK
```

`src_v2/build.js` (169 lines) concatenates the modules in a fixed order, then runs three static
audits before writing the bundle:

1. **Duplicate-declaration audit** — the modules share one script scope, so a repeated top-level
   `function`/`const` name silently wins by load order instead of erroring. The build fails on a
   collision and names both modules.
2. **Element-id audit** — every `$('id')` / `getElementById` reference in the JS is matched
   against the ids present in `body.html` + generated markup, including ids only reached through
   a literal array or a `||` fallback. This is the check that would have caught the deleted shop
   overlay whose id was still being dereferenced at run start.
3. **Syntax audit** — the concatenated bundle is compiled with Node's V8 (`new vm.Script`), so a
   syntax error can never ship.

Both audits pass on the current tree (`✓ Element-id audit passed`, `✓ Syntax Check Passed:
0 compilation errors!`). This is the single most valuable piece of infrastructure in the repo:
it converts two whole classes of "the game is a white screen" bug into a build failure.

| Module | Lines | Responsibility |
|---|---|---|
| `engine_world.js` | 3,102 | sim step, sticks/buttons, collision, weapons/firing, camera, run lifecycle |
| `engine_lobby.js` | 1,279 | menu shell, tab router, shop/skins/skills/options UI, save-state editing |
| `engine_feel.js` | 1,272 | projectile archetypes/trails, impacts, recoil, screen punch, hit feedback |
| `engine_render_zombies.js` | 966 | enemy sprites and attack telegraphs |
| `engine_data.js` | 913 | `WEAP`, `WEAP_RANK`, `TIER_POLICY`, boons, perks, relics, `SKINS`, tier validators |
| `engine_hud.js` | 888 | HUD chrome, the pad (sticks/buttons), weapon card, gun picker |
| `engine_events_missions.js` | 728 | operations/missions, skin preview + turntable, equip logic |
| `engine_render_player.js` | 604 | player sprite, muzzle flashes, reload timing |
| `engine_depth.js` | 536 | y-sorted depth band, cached soft sprites, lighting |
| `engine_gore.js` | 466 | corpses, blood, decals, gibs |
| `engine_core.js` | 453 | canvas/DPR setup, safe-area probe, error overlay, colour helpers |
| `engine_fx.js` | 450 | announcer queue, combo meter, impacts, footsteps |
| `engine_meta.js` | 445 | boon draft, weapon mastery, achievements, lifetime stats |
| `engine_director.js` | 442 | wave scheduling, power-ups, last stand, zombie steering |
| `engine_maps.js` | 412 | arena layout, obstacle placement, zone metadata |
| `body.html` | 404 | markup for the shell, lobby, overlays |
| `engine_passives.js` | 383 | passive auras, summons, status effects |
| `engine_render_turret.js` | 375 | deployable sentry turret |
| `engine_props.js` | 326 | destructible/solid prop renderers |
| `engine_persistence.js` | 284 | save/load, sanitiser, rolling backup, Capacitor Preferences sync |
| `engine_pickups.js` | 281 | cash drops, magnet curve, HUD flight |
| `engine_bootstrap.js` | 173 | boot order, `GAME_VERSION`, input bindings, daily bonus |

### Data flow

* **Account state (`SV`)** — persisted in `localStorage['dzs']` with a rolling
  `dzs_bak` and a Capacitor `Preferences` mirror. Every read goes through `sanitizeSV()`, so a
  missing/invalid field is repaired rather than crashing the boot.
* **Run state (`S`)** — created by `begin()`, discarded on death. Never persisted directly;
  only the settled results (`commitXP` → cash/kills/best/achievements) are folded into `SV`.
* **Rendering** — one 2D context on `#c`, DPR-scaled in `rs()`, driven by a single
  `requestAnimationFrame` loop (`run` flag gates the sim, not the draw).
* **Global mutable state everywhere.** There is no module system: every function and every
  container (`Z`, `B`, `FX`, `G`, `RG`, `P`, `S`, `SV`) is a single global binding, and the
  *active 2D context itself is a global* (`X`) that overlay code temporarily swaps
  (`const prevX = X; X = cx; … finally { X = prevX; }`).

---

## 2. Findings

Severity is impact × likelihood for a shipped mobile build. "Fixed" items were fixed during
this review and are verified by the automated pass in §3; everything else is an observation
from reading the code, not a claim about runtime behaviour.

### F1 — Operative skins crashed the preview path · **High · fixed**
`inspectSkin()` built a null weapon name for `type: 'op'` skins and then called `.toUpperCase()`
on it:

```js
const wName = (sk.type === 'op' ? null : ((WEAP[skinWeaponIndex(sk)] || {}).n || 'WEAPON')).toUpperCase();
```

Every operative skin threw `Cannot read properties of null (reading 'toUpperCase')`
immediately after the turntable was opened — the same null-read family as the reported
`Cannot read properties of null (reading 't')` crash, one call deeper in the chain
`renderSkinsUI → inspectSkin → renderTurntable → gun`. 8 of the 24 shipped skins are
operative skins, so the crash was reachable from a third of the skin cards.
Fixed by resolving the label first and uppercasing the resolved string.

### F2 — Fire-mode label derived from the wrong field · **Medium · fixed**
`weaponMode()` classified multi-pellet guns with `w.sp >= 0.5` — that is the *projectile step*,
not the rate of fire, and it is ≤ 0.24 on every shotgun in the table. The Shotgun, Arc Shotgun
and Glacier Breaker were all labelled **BURST**; the Burst Rifle was correct only by accident.
Now keyed on the fire interval (`w.r >= 0.5` → `PUMP`), which cleanly separates pump guns
(0.62 / 0.65 / 0.72 s) from burst guns (0.38 s).

### F3 — Wave-modifier row printed over the boss health bar · **Low · fixed**
The modifier chips are laid out right-to-left from `topRightEdge` with no left bound, so on a
640–720 px wide screen `"TOUGH SKIN x2"` overlapped the boss readout (`"BRUTE 5000 / 9000"`)
by ~85–110 px² of glyph area. The row is now bounded by the boss lane (or the vitals column when
no boss is alive) and surplus chips collapse into a `+n` counter.

### F4 — `+n` overflow counter printed over the last chip · **Low · fixed**
The counter was left-aligned at the next slot, which put it inside the previously drawn chip.
It is now right-aligned into the gap (measured 83 px² overlap at 1024×576 before the fix).

### F5 — No automated regression entry point · **Medium · open**
`package.json` has no scripts; the only repeatable checks are the bundler's two static audits.
Nothing exercises the runtime, which is exactly why F1/F2 shipped: both are invisible to a
syntax check and both throw only when a particular card or gun is selected. The harness in §3
is a working starting point, but it currently lives outside the repo tree and is not wired to
`npm test`, a CI job, or the release script.

### F6 — Per-frame gradient and shadow work · **Medium · open, unmeasured**
43 gradient creations and 8 `shadowBlur` assignments across the render modules. `shadowBlur`
in particular is one of the most expensive 2D-context states on low-end Android GPUs. I did not
profile frame time on a device, so this is a hypothesis with a known cost model, not a measured
problem; the fix path is to hoist static gradients into cached objects and replace blurred
glows with pre-rendered sprites.

### F7 — `engine_world.js` is a 4,000-line convergence point · **Medium · open**
The sim step, collision, weapon logic, HUD, on-screen controls, camera, pause/resume and run
lifecycle all live in one file. For a single-file bundle this is workable, but it makes
reviewing a HUD change require loading the collision code as well. A pure-Geometry split
(`hud.js` / `controls.js` / `combat.js`) would shrink review surface without changing the build.

### F8 — Global context swapping is fragile by construction · **Low · open**
`skinIcon()` and `renderTurntable()` point the shared `X` binding at a scratch canvas and
restore it in `finally`. The pattern is correct as written (and the `finally` blocks are a
deliberate hardening), but any early `return` added outside a `try` silently leaves the main
loop drawing into a 180×54 offscreen canvas. A helper (`withCtx(cx, fn)`) would make the
invariant impossible to break.

### F9 — Mixed event-binding styles · **Low · open**
18 `addEventListener` calls plus 7 inline `onclick=` handlers inside generated markup. Inline
handlers are re-parsed on every `innerHTML` render and cannot be detached; the lobby rebuilds
its list markup on every state change, so this is a small but recurring allocation cost.

### F10 — Release signing key is public history · **High for release integrity · open (documented)**
Commits `e975ad5` and `c849a6c` carried keystore material; `README.md` documents the exposure
and the build now reads credentials from `keystore.properties` (gitignored) or `RELEASE_*` env
vars, warning loudly and falling back to the debug keystore when absent. The residual risk is
that anyone can sign an APK that installs as an upgrade of builds published before the change.
Rotating to a fresh release identity for store distribution is the mitigation.

### F11 — Save growth and quota · **Low · open**
`SV` is a single JSON blob rewritten on level-up, boss relics, tab changes and menu actions
(38 `sv()` call sites, none of them in the per-kill path — that part is healthy). There is no
size cap; long-lived accounts accumulate stats until a `QuotaExceededError` hits, which the
`try` in `sv()` swallows, silently stopping persistence. A write-counter + previous-good-copy
guard would surface it instead.

### F12 — Single-file bundle and cold start · **Low · design note**
679 KB of HTML+JS parsed on every launch. It is the deliberate price of the "no module
loader, one file" architecture and it keeps the Android shell trivial; noted only because it
is the ceiling on how much further the asset set can grow before launch time becomes visible.

---

## 3. Behavioural verification performed

A headless harness was injected into the *built* `www/index.html` and driven in a real browser
(context `127.0.0.1:8419`). It captures `onerror`, `unhandledrejection` and `console.error`,
fails on the presence of `#debug-err-overlay`, and asserts against the game's own functions and
its own collision/draw paths rather than against re-implementations.

**Result: 126 assertions, 0 failures, 0 console errors.**

Covered, at five landscape sizes (640×360, 720×400, 854×393, 1024×576, 1280×600), in a plain
and a fully-loaded HUD state (14 perks, 10 boons, 3 wave modifiers, 9 power-ups, 5000 HP boss):

* Skins: list renders (24 cards), every one of the 24 skins inspected with a turntable frame,
  locked / owned / equipped / malformed-definition previews, six Skins↔Play round trips, the
  turntable `requestAnimationFrame` confirmed cancelled on leaving the tab.
* Projectiles measured by rasterising the real draw call and scanning the pixels: pistol 28 px,
  SMG 28, rifle 28, revolver 36, rocket 64, railgun 65 — the revolver is 1.29x the pistol where
  it used to be the longest tracer in the game. The revolver sweep at 300/480/700/1050/1400 px/s
  never exceeds 36 px, and its muzzle frame measures 66 px, down from 83 px at the previous
  trail cap measured with the same harness.
* Balance: every weapon inside its tier band, tier ladder monotonic, sustained DPS per tier
  strictly increasing (COMMON 48.6 → LEGENDARY min 120.7), 7 weapons verified applied damage
  == displayed damage, including a ×1.36 damage perk.
* Collision: 35 of the 86 registered colliders are solid props; 8 approach directions × 2
  speeds against the nearest one, a 440 px single-step tunnelling attempt, diagonal corner
  entry, the thinnest registered collider (22×92) crossed in one step, and knockback
  resolution — worst residual penetration 0.00 px in all of them.
* Gameplay: weapon switching + magazines, firing/ammo/projectile ownership, cylinder empty →
  reload → refill in the tuned 1.45 s window, ability slots, pause/resume, wave advance.

---

## 4. Working tree at the time of writing

`main` @ `436ec3f` (v1.0.0 at `3190a20` is the first release of the restarted line). The
polish sprint, the v1.0.0 audit pass and the shop-restoration pass are all committed; the
working tree is clean. `www/index.html` is rebuilt from `src_v2/` on every `npm test`, so the
committed bundle always matches the committed source.

## 5. Recommended next steps, in order

1. Wire the harness into `npm test` / CI so F1-class crashes cannot ship again (**F5**).
2. Profile frame time on the lowest supported Android device; if `shadowBlur` shows up, hoist
   static gradients and sprite the glows (**F6**).
3. Add a scratch-context helper to remove the swapped-`X` footgun (**F8**).
4. Plan a key rotation for the next store release (**F10**).
5. Split `engine_world.js` by concern when the next sizeable HUD/control change lands (**F7**).

## 6. v1.0.0 audit pass

A second pass over the same tree, this time reading it as a release candidate rather than as a
codebase to improve. Findings are numbered `N*` to keep them distinct from section 2. Everything
marked **fixed** has a check that fails if it comes back.

### N1 — Eight functions nothing calls · **Low · fixed**

`initMapArchitecture()` (`engine_maps.js`) was the interesting one: a second, complete obstacle
builder that assigned `O = []` and refilled it from `MAP_DATA[curM].walls`, superseded by
`engine_world.js` `rebuild()`. Had anything ever invoked it mid-run it would have wiped every live
collider, including the prop colliders added for this release. The rest were stale helpers whose job
had moved on: `getMaxDecals()`/`getMaxBloodDrops()` (the live caps are
`getQualityProfile().maxDecals` and the `BLD` splice in `engine_gore.js`), `sndTurretFire()` (the
turret already plays its own shot sound), `flameMuzzleGradient()` and its `FLAME_MUZZLE_GLOW` cache
(superseded by `muzzleGlowGradient()`), `toggleSkin()` (superseded by the Skins tab), and
`bakeDecalsToBackground()` / `boonHudLine()`.

All eight were removed. `tools/audit.js` now lists every `function` declaration and fails the check
if one is never mentioned anywhere in the modules, `body.html`, `style.css` or `tools/` — inline
`onclick="fn('x')"` handlers count as callers, which is what makes that check trustworthy.

### N2 — The save sanitiser accepted non-finite numbers · **Medium · fixed**

`sanitizeSV()` clamped each counter with `Math.max(0, Math.floor(Number(v) || 0))`. That rejects
`NaN` and negatives but not `Infinity`: `Number(Infinity)` is truthy, `Math.floor` keeps it and
`Math.max` obliges. A hand-edited or partially corrupted save could therefore put `Infinity` into
`lvl`, `xp`, `cr`, `sp`, `best` and every skill rank, and everything derived from them — level-up
thresholds, credit totals, damage multipliers — became `Infinity` or `NaN` for the rest of the
profile's life, with no crash to point at it.

Every counter now goes through one helper that rejects anything non-finite, and the fields that
decide which copy of a save wins when the native Preferences copy is merged back (`rev`, `ts`) are
clamped too, so an infinite revision can no longer win every future merge. `tools/test-logic.js`
feeds fourteen hostile saves (including `Infinity`, `NaN`, `"abc"`, `1e9`, a truncated `own[]` and a
`__proto__` payload) through the real function and asserts the shape of the result.

### N3 — Version drift between the three manifests · **Medium · fixed**

The version was written by hand into `package.json`, `engine_bootstrap.js`, `build.gradle` and a
dozen module headers, and nothing compared them. Two of those had already fallen behind (the module
headers still said `v2.9.0`; `package-lock.json` still said `1.5.0`). `tools/audit.js` now reads all
of them, plus the version string inside the built bundle, and fails on any disagreement — and the
release workflow runs the audit before it builds.

### N4 — The bundle could ship stale · **High for release integrity · fixed**

`www/index.html` is generated, and the Android build copies it into `assets/public`. Nothing verified
it was newer than `src_v2/*`, so a commit that changed the sources but forgot `node src_v2/build.js`
produced an APK that looked like the fix and was not. The audit now fails when any source file is
newer than the bundle, CI builds before it audits, and the release workflow builds before it audits.

### N5 — No automated entry point (F5) · **Medium · fixed**

`npm test` now runs the build, the audit and the logic tests, and `.github/workflows/ci.yml` runs
them on every push to `main` and every pull request. The browser harness is checked in as
`tools/regression-harness.js` with `npm run harness` to generate a page around it; it needs a
rendering loop, so it stays a manual step rather than a CI one.

### N6 — Per-frame gradient allocation (F6) · **Medium · measured and fixed**

Screen-space gradients were rebuilt every frame. They now go through one cache in `engine_core.js`,
invalidated on resize. Measured on the bundled build under a representative load: 3.83 → 0.32
gradient objects per frame at statistically unchanged frame time.

### N7 — `engine_world.js` (F7) · **Medium · partly addressed**

The HUD and on-screen control code (~1,300 lines) moved to `engine_hud.js` as a pure move, since
top-level function declarations share one script scope, so the split carries no behaviour risk. The
remaining simulation file is still large; further splitting is deferred, not done.

### N8 — Release artifacts · **Low · fixed**

The source zip attached to earlier releases was produced by hand outside the workflow, so it could
drift from the tag and did not exist at all until someone remembered. `release.yml` now generates it
with `git archive` from the tagged commit — which by construction cannot contain build output,
`node_modules` or the keystore — and verifies the APK signature before publishing either.

### N9 — Signing key in public history (F10) · **High for release integrity · cannot be fixed by commit**

The old keystore and its passwords are in this repository's history. Removing the files going forward
does not remove the blobs, and rewriting published history is not something to do silently to a
shared remote. Documented in `README.md`: the key must be treated as compromised and rotated if the
repository is ever shared, at the cost of in-place updates for existing installs.

### Still open

`F8` (global canvas context swapping is fragile by construction), `F9` (three event-binding styles),
`F12` (single-file bundle and cold start) are design notes rather than defects; none of them is a
correctness or release-integrity risk, and none of them was touched by this release.

---

## 7. Shop-restoration pass

A third pass, this time on the lobby economy. The finding was a regression rather than a
long-standing defect: `engine_lobby.js` had retired the armory when guns became rank rewards
(`GUNS/armory was retired; panels shift up by one after EVENTS`), and `engine_events_missions.js`
records that the shop overlay was deleted from the markup while its id stayed behind. With no
shop, credits had nothing to buy, and the tab router was quietly one entry short of the nav.

* **O1 — No shop.** The `<!-- TAB 2: GUNS ARMORY -->` placeholder is a real panel again
  (`#psh`), the nav gains a SHOP button, and `tab()` routes it at index 2. Because the router
  indexes panels positionally (`['p0','pe','psh','psk','pc','ps','p2','pa','p3']`), every
  later panel and both in-lobby shortcuts (`CHANGE SKIN`, `SKILL TREE`) had to shift with it;
  a stale index shows the wrong panel rather than throwing, so the harness now opens SKINS and
  asserts what it rendered.
* **O2 — Ordering.** `shopEntries()` sorts by tier, then price, then table order, and the
  panel adds a tier filter for the same five tiers `TIER_POLICY` validates. The rendered order
  is asserted from the DOM in the harness, not from the comparator.
* **O3 — Dual Pistols was free.** `syncWeaponUnlocks()` re-derives ownership from rank on every
  load (`rank >= WEAP_RANK[i]`), and index 15 sat at rank 1, so a fresh profile owned a second
  gun before playing. It is rank 3 now, and a logic assertion pins "exactly one weapon is free
  at the default rank".
* **O4 — The FIRE button.** Removed as a control, not just hidden: the `BT` entry, its 38px hit
  radius, the `FIRE_HOLD` pointer claim, `fireHeld()`, the `fireMode` preference and its Options
  row are all gone. Aiming with the right stick is the trigger on touch and the mouse is the
  trigger on desktop, so no input path was lost. RELOAD moves into the primary cell the button
  vacated.

**Verification.** `npm test` = build (3 audits) + `tools/audit.js` (21 checks) +
`tools/test-logic.js` (20 assertions). The browser harness (`tools/regression-harness.js`) runs
the built bundle headlessly: **150 assertions, 0 console errors**, including buying and equipping
through the real DOM handlers, the aim-stick trigger consuming rounds with no FIRE button in the
path, and the tab-index shift. No open findings from this pass.
