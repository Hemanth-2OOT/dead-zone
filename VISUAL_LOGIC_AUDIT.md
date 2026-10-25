# DEAD ZONE — Visual, Logic & Retention Audit

**Baseline:** v2.3.0 (`4deb6a9`) · **Scope:** all of `src_v2/` (~9.7k LOC)
**Method:** full read of the render pipeline (`draw()` in `engine_world.js`, `engine_render_*.js`, `engine_fx.js`, `engine_gore.js`), the sim loop, the director/persistence/economy modules, and `style.css`. Every claim below was verified by grep against the shipped code.

> **Implementation status — v2.4.0:** the roadmap in Part 4 has been implemented and shipped in v2.4.0 (`_deep.html` harness: `DEEP PASS`, 57 assertions, 0 failures).
> * **Wave A (depth & presentation)** — DONE: particle render pass (`renderParticles`), Y-sorted entity band (`drawEntityBand`), contact shadows (`contactShadow`), additive light pass + downsample bloom + per-sector colour grade (`renderLightingPass`), ambient weather (`initAmbient`/`updateAmbient`/`renderAmbient`), cached gradients / de-gradiented bullet trails, damage-chip HUD, floating damage numbers with crit pop, acid-puddle and debris passes.
> * **Wave B (logic & balance integrity)** — DONE: stacking wave modifiers with hard caps (`spMul ≤ 2`, `eliteBoost ≤ 0.8`, max 2 per wave, boss waves from wave 15), fixed-step sub-stepped simulation (frame-rate independence), reroll cost scaling, **idempotent wave-clear awards** (`S.clearedWave`, found and fixed by the harness), boons replacing INCENDIARY.
> * **Wave C (retention)** — DONE: between-wave boon draft, per-weapon mastery (XP + tiers + card bars), SERVICE RECORD achievement grid with claimable credit rewards, ghost-pace race, rotating supply deal, run streak, per-map ascension tiers with bounty multipliers.
> * Remaining known gaps: no dynamic-difficulty pass for the first 5 waves, no post-run "next objective" nudge, and CSS motion is still mostly static (the palette/lobby CSS was left untouched this cycle).

This document deliberately separates **what is** (findings, with evidence) from **what to do** (proposals, with effort/payoff), and ends with a prioritised roadmap and a verification plan.

---

## Part 1 — The visual system as built

| Layer | Implementation | Where |
|---|---|---|
| Renderer | Single 2D canvas, `DPR` capped at 2 | `engine_core.js:69-79` |
| Camera | Hard-follow player + 30px look-ahead, clamped to world, per-frame random shake | `draw()` |
| Ground | Flat fill + 100px grid + roads/crosswalks | `draw()` §1-2 |
| Decals | Baked to an offscreen canvas + live pools; re-baked from `DEC` | `engine_gore.js:221,320` |
| Geometry | Extruded quads (top face + 6px "bottom" face + drop shadow) | `draw()` §6 |
| Props | 20+ hand-drawn prop types (lamps, cars, windmill, silo, server racks…) | `draw()` §7 |
| Entities | Zombies → player, iterated in **array order** | `draw()` §14-15 |
| Particles | `F[]` simulated, **never rendered** | see F1 |
| Lighting | Static radial gradients painted in world space; one player muzzle cone | §7, §15 |
| Post-FX | **None.** `globalCompositeOperation` is used **0 times** in the whole codebase | — |
| HUD | Canvas-drawn radar/HP/power-ups/boss bar/perk tray/combo | `renderHUD()` |
| Lobby | DOM + CSS with tokens, 9 keyframes, backdrop-filter | `style.css` |

**Quality tiers** exist (`low/med/high` → decals, particles, dust, dynamicLights flags) and an FPS watchdog trims arrays when FPS < 35 (`engine_core.js:160-178`). This is a good foundation to build lighting on top of — the tiering already anticipates the cost.

---

## Part 2 — Visual depth findings (ranked by impact ÷ effort)

### F1 — The entire particle system is invisible *(highest impact, lowest effort)*
`burst(x, y, colour, count, size, speed)` pushes particles into `F` (`engine_core.js:311`). It is called ~20 times: kill gore, pickups, level-ups, chests, explosions, Phoenix reborn, Last Stand, turret sparks, flamethrower embers.

```js
// engine_core.js:311  particle creation
F.push({ x, y, vx, vy, l, c, s, fr });
// engine_world.js:1139  simulation only — no draw
for (const f of F) { f.x += f.vx*dt; f.y += f.vy*dt; ... }
```

`grep -rn "renderParticles|drawParticles" → 0`. The only real airborne visuals are `MISTS/STREAKS/BLD` (gore) and `FOOTPRINTS`. **Kill, hit, pickup and level-up feedback is being simulated and thrown away.**

**Fix:** add one `renderParticles()` pass inside `draw()` (after zombies, before floating text).
- Emissive colours (`fr`), draw with `globalCompositeOperation='lighter'` → sparks glow for free.
- Debris (`fr=0`), normal blend, square-ish chips.
- Fade `alpha = f.l / f.life`, shrink radius with life, add 1px motion trail along `(vx,vy)`.
- Respect `getMaxParticles()` tiering (already defined).

**Payoff: immediate, across-the-board "juice" on every kill, pickup and level-up. Effort: S.**

### F2 — No depth sorting: the 2.5D illusion breaks on every overlap
Entities are drawn in fixed layer bands — obstacles, then zombies, then the player. With `grep "\.sort("` returning only the perk shuffle, there is **no y-ordering**. Consequences:
- A zombie standing *below* the player (nearer the camera) still renders **behind** the player.
- A zombie in front of a building renders **on top of it**, because all buildings are drawn in §6 and all zombies in §14.
- Zombies overlap each other in spawn order, not screen depth.

**Fix (progressive):**
1. **Entity band sort** (S): build one array of `{y, draw()}` for zombies + player → sort by `y` → draw. Trivially cheap (`<400` items).
2. **Footprint splitting** (M) for tall geometry: draw each building in two passes — `base` (its top face) in the behind-band, `cap` (roof lip/highlights) in the front-band, and insert entities by `y` between them. Enemies then correctly disappear *behind* a wall they walk above.
3. **Soft occlusion** (M): when an entity's `y` is inside a building's footprint, fade its alpha to 0.45 near the wall edge so it reads as "in shadow behind" instead of vanishing.

**Payoff: the single biggest perceived-quality jump after F1. Effort: S→M.**

### F3 — Lighting is flat: no screen-space light model
There is no darkness pass, no bloom, no colour grade. Lamp light pools are baked radial gradients at **α 0.22, radius 110** (`draw()` §7) — barely visible — and they only brighten the ground, never entities. Muzzle flash only lights a cone drawn around the player's own sprite. The one place with a real light model (BLACKOUT: a hole punched around the player, `engine_fx.js:118-124`) proves the technique works and looks good.

**Fixes (in cost order):**
1. **Additive light sprite blit** (S) — cheapest real win. Pre-render a soft radial "light" sprite once; for each lamp/muzzle/beacon/explosion draw it with `globalCompositeOperation='lighter'` at low alpha, camera-transformed. On the **high** tier only; `low` skips it (matching `dynamicLights`).
2. **Global darkness + light mask** (M) — fill a screen-space layer with the map's ambient tint, punch radial holes at light sources via `destination-out` on an offscreen canvas, then composite once per frame with `multiply`. This gives genuine sculpted lighting, and makes BLACKOUT a first-class feature rather than a one-off.
3. **Fake bloom** (M) — draw bright emitters (muzzle flashes, tracers, beacons, acid, ice) into a ¼-scale offscreen canvas, then blit it back full-size at α ~0.25 with `lighter`. Two draws, enormous perceived polish.
4. **Per-map colour grade** (S) — a full-screen low-alpha rect per map (toxic green, frozen cyan, neon magenta) as the final draw op. Instantly differentiates the 7 sectors.
5. **Dynamic muzzle light** (S) — 2-3 frame radial light at the muzzle, keyed off `P.fl`, so firing illuminates nearby walls and enemies.

**Payoff: transforms the game from "flat top-down" to "lit scene". Effort: S (1, 4, 5) / M (2, 3).**

### F4 — Shadows are inconsistent and lifeless
Zombie shadow: `ellipse(z.x+4, z.y+6, r*1.15, r*0.8)` **rotated by the angle-to-player** (`engine_render_zombies.js:199-202`). Obstacles: `+6,+8`. Props: `+4,+6` … `+10,+12`. So the shadow offset drifts by object type, and no shadow ever softens or separates from its caster.

**Fix:** one `contactShadow(x, y, radius, lift)` helper: a cached soft-gradient ellipse, offset by `LIGHT_DIR * (6 + lift*4)`, scaled/softened by a `lift` value (0 grounded, 1 airborne — chargers, gibs, jumps). Slight blur halo under the entity anchors it to the floor far better than a hard ellipse.

**Payoff: grounding and weight on every entity. Effort: S.**

### F5 — Per-frame gradient allocation (mobile GC stalls)
`createRadialGradient`/`createLinearGradient` are called **14×** inside the draw path — per lamp, per ice patch, per acid puddle, per player (muzzle cone), per flamethrower shot, and **per default bullet trail**. At wave 20 with a Minigun those are dozens of allocations per frame, exactly when the frame budget is tightest.

**Fix:** cache gradients by geometry (lamps/pools are static → build once, or blit a pre-rendered sprite). For bullet trails, replace the linear gradient with two cheap strokes (core + halo). Keep `shadowBlur` (8 uses) gated behind the `high` tier — it is the most expensive canvas op present.

**Payoff: smoother hordes on mid-range Android. Effort: S.**

### F6 — Character animation is a single rigid blob
Zombies are drawn as one rotated, scaled shape with a `wobble` sine; the player translates by a "breathing bob". There are no articulated limbs, no walk cycle, no attack wind-up frames beyond `drawTelegraph`.

**Fix:** 2-segment legs/arms with a phase offset driven by speed (`walk` vs `run` vs `charger` already have distinct archetypes). Add: hit-flinch *rotation* (not just squash), a rim-light hit flash instead of setting fill to `#ffffff` (`fc` — the full white-out destroys silhouette reading), and a 2-frame attack wind-up pose per archetype so telegraphs are legible in the sprite, not only via the ground ring.

**Payoff: high — enemies become readable and alive. Effort: M (per archetype).**

### F7 — HUD is information-dense but flat
Zones: radar+HP ring+wave+power-up rings top-left (`renderHUD()`), boss bar top-centre, perk tray top-right, combo mid-right, off-screen arrows, plus canvas text drawn directly on busy ground with no backdrop.

**Fixes:**
- **3-zone hierarchy** (S): vitals (left) / threat (right) / contextual centre. Move combo out of the right edge where it collides with the tray on narrow phones.
- **Damage-chip health bar** (S): a white "ghost" bar that lags ~0.4s behind the green bar — the standard, extremely legible hit-feedback pattern.
- **Consistent text plate** (S): 1-2px dark stroke or a small translucent rounded rect behind every canvas text run (wave, HP, combo) so it never fights the ground.
- **Crit styling** (S): floating damage numbers already exist — make crits larger, orange, slight arc + outline so crits *read*.
- **Next-goal cohesion** (S): the DOM lobby is nicely tiered; mirror its palette in-canvas via one shared palette object.

**Payoff: clarity and "premium" feel. Effort: S.**

---

## Part 3 — Logic, feel & balance findings

### L1 — Variable timestep with a hard clamp
```js
const dt = Math.min(0.05, (t - last)/1000 || 0);
update(dt * directorTimeScale());
```
No fixed-step accumulator. At 60 FPS this is fine; when a frame spikes to 200 ms, only 50 ms is simulated (correct, avoids tunnelling) — but when the device runs at 45 FPS, `dt ≈ 0.022` and everything is subtly faster/slower than intended, and fast projectiles (Railgun 1.4 r, Sniper tracers) can step past thin walls because collision is positional, not swept.

**Fix:** fixed 120 Hz logic accumulator with render interpolation (M), or at minimum sub-step `update()` when `dt > 1/45` and sweep-test bullets against `O` along the segment (S).

### L2 — Difficulty curve is linear in count, piecewise in HP
- Count: `n = (6 + wave*4) * densityMult` (`engine_world.js:229`) → linear.
- HP: `1 + wave*0.055`, plus `(wave-15)^1.25*0.07`, plus `(wave-25)^1.4*0.12` (`engine_world.js:275-277`) → superlinear late.
- Enemy *action rate* also rises: `S.sp = max(0.15, (1 - wave*0.055) * spMul / densityMult)` (`engine_world.js:920`).

The HP curve is sound, but combined with the player's multiplicative perk/relic stacking it means the mid-game (waves 8-15) can flatten out — nothing new happens, just more of the same at the same effective challenge. **Fix:** a "threat budget" director that spends its allowance on *composition* (new archetype mixes, hazard placement, modifier stacking) rather than raw HP, plus a guaranteed **new element every 5 waves** (already true for bosses; extend to hazard/modifier introductions).

### L3 — Wave modifiers are under-exploited
7 modifiers exist, but they only roll on **non-boss waves ≥2 at 55%**, never repeat consecutively, and never stack. Two cheap expansions:
- **Dual modifiers** from wave 10 (e.g. BLACKOUT + SWARM) for spiky, memorable waves.
- **Modifier on boss waves from wave 15** (currently boss waves are modifier-free, so the hardest waves in the game are also the most *predictable*).

### L4 — Fixed reroll cost is exploitable late
Reroll is a flat **150** run cash (`engine_world.js:807`). By wave 15 the player banks thousands per wave, so rerolling becomes free and the draft loses all tension. **Fix:** scale cost with wave and/or with rerolls-used-this-run (`150 * (1 + 0.35*rerolls)`), capped at a fraction of current cash.

### L5 — Between-wave shop is a static list
`rebuild()` renders every weapon/power at fixed prices, every wave, forever. No scarcity, no rotating stock, no discounted "deal of the wave". This removes a whole axis of run-to-run variation and decision-making.

### L6 — Verification gap
There is no automated test suite; correctness relies on the ad-hoc deep harness used during development. See Part 6.

---

## Part 4 — The additive / "never get bored" layer

**Loops that already exist:** daily missions, 10-day login track, timed events, roster of 22 weapons with a permanent credit-bought armory (`SV.own`, `engine_lobby.js:367`), 7 unlockable maps gated by rank, operative classes, skill tree, stat upgrades, relics, perk drafts, cosmetics/skins, career rank milestones (v2.3.0), best-wave record.

That is a genuinely deep meta-layer. What's missing are the **short-cycle** hooks — the ones that fire every 2-5 minutes and drive "one more run".

| # | Proposal | Why it hooks | Effort |
|---|---|---|---|
| R1 | **Between-wave boon draft** — after each wave, pick 1 of 3 temporary, run-scoped boons (stacking, mutually exclusive branches) | Highest-yield addition. Makes every wave a decision, makes every run a distinct build, and creates the "next wave could break my build open" pull. | M |
| R2 | **Weekly/daily challenge runs** — fixed seed + forced modifiers ("BLACKOUT, pistol only, no reloads") with credit/skin rewards | Reuses the existing modifier + event systems; gives a reason to return on a schedule beyond simple kill counters. | M |
| R3 | **Per-map Ascension tiers** — clearing a sector at wave N unlocks tier+1 with extra modifiers and +% rewards | Vertical progression *inside* content the player already owns; the classic roguelite longevity engine. | M |
| R4 | **Weapon mastery** — each gun earns XP, unlocking 1-2 gun-specific modifiers at levels | Gives all 22 weapons a reason to exist; converts the armory from a one-time buy into a collection to level. | M |
| R5 | **Meta-achievement grid** (1000 headshots, 50 elites, clear each map, …) with visible progress + cosmetic rewards | Turns incidental play into tracked progress; a completion grid is a strong "just one more" driver. | S |
| R6 | **Personal-ghost race** — race your previous best run's pace live, show a delta indicator | Free replay value from data already stored (`SV.best`); directly attacks "I can beat that". | S |
| R7 | **Streak + comeback systems** — escalating login streak, "welcome back" reward after a lapse | Proven retention mechanics; partially present (login track) — extend with the comeback branch. | S |
| R8 | **Rotating shop / limited offers** — "deal of the wave" with a timer | Introduces urgency and decision cost into the existing between-wave screen (ties to L5). | S |
| R9 | **Friction removal** — instant redeploy, remembered loadout, skip-intro | The cheapest retention win of all: every second between runs costs a replay. | S |
| R10 | **Run recap card** — shareable stat card (weapon, build, wave, kills) | Social/identity loop, and it makes the meta-progression legible. | M |

---

## Part 5 — Prioritised roadmap

**Wave A — "Look and feel" (highest impact, lowest risk; ~1-2 days)**
1. Render the particle system (`F1`) — S
2. Y-sort the entity band (`F2.1`) — S
3. Contact-shadow helper (`F4`) — S
4. Cache gradients; de-gradient bullet trails; gate `shadowBlur` (`F5`) — S
5. HUD: damage-chip bar, text plates, crit styling, zone layout (`F7`) — S
6. Per-map colour grade + additive light sprites + muzzle light (`F3.1/3.4/3.5`) — S
7. Difficulty: modifier stacking + boss-wave modifiers (`L3`) — S
8. Reroll cost scaling (`L4`) — S

**Wave B — "Depth and variety" (~3-5 days)**
9. Footprint-split occlusion + soft occlusion (`F2.2/2.3`) — M
10. Global darkness + light mask (`F3.2`) — M
11. Fake bloom (`F3.3`) — M
12. Articulated limbs + wind-up frames (`F6`) — M
13. Between-wave boon draft (`R1`) — M
14. Fixed-step accumulator / sub-stepping (`L1`) — M

**Wave C — "Long game" (~1-2 weeks)**
15. Ascension tiers (`R3`), weapon mastery (`R4`), weekly challenges (`R2`)
16. Achievement grid (`R5`), ghost race (`R6`), rotating shop (`R8`), recap card (`R10`)

---

## Part 6 — Verification plan

Every change above must be validated the way v2.2.0/v2.3.0 were:

1. **Build gate:** `node src_v2/build.js` → 0 syntax errors (already enforced).
2. **Deep runtime harness** (extend the existing one): drive 20+ waves with all perks/relics/power-ups/classes/skills; assert no `NaN`, bounded `Z/B/D/F/DEC`, save-round-trip, and targeted probes per newly-added system (e.g. boon draft never offers an owned boon; mastery XP is monotonic; refresh states).
3. **Deterministic visual harness** (new): seed `Math.random`, capture a frame with the renderer into a data URL, and hash it — catches accidental "everything went black" regressions in the new lighting/post passes.
4. **Perf counter** (new): instrument `draw()` with `performance.now()` around each layer, and assert a frame budget on the `high` tier (< 12 ms) with a synthetic 300-entity horde. `QUALITY_PROFILES` already gives the knobs to degrade lighting/bloom first.
5. **Mobile smoke:** landscape, touch input, and a low-tier device/emulation run confirming the lo-fi path still renders (lighting skipped, decals trimmed).

---

*Prepared as an analysis of the v2.3.0 codebase. No source changes accompany this document.*
