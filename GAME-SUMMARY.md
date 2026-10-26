# DEAD ZONE — complete project summary

A single-file, offline, mobile-first **twin-stick survival shooter** written in plain
JavaScript + Canvas 2D and shipped as an Android APK via Capacitor. No engine, no framework,
no build-time dependencies beyond Node for the packaging scripts. Everything on screen —
sprites, buildings, weather, explosions, gore, UI chrome — is drawn procedurally at runtime;
there is not one image or audio file in the game.

**Status at the time of writing:** `v1.0.2` released (tagged, signed APK + source zip on GitHub),
`v1.1.0` drafted on branch `draft/v1.1.0` (not tagged, not released). Repo:
`github.com/Hemanth-2OOT/dead-zone`.

---

## 1. At a glance

| | |
|---|---|
| Genre | Top-down / twin-stick arena survival shooter with light roguelite progression |
| Platform | Android (Capacitor WebView), also runs in any desktop browser |
| Orientation | Landscape, touch-first; keyboard+mouse supported on desktop |
| Language | JavaScript (ES2020), single-file bundle, no transpiler |
| Rendering | Canvas 2D, fully procedural (no image assets) |
| Audio | Synthesised at runtime through WebAudio (`snd()`); no audio files |
| Code size | `src_v2/` 15,851 lines across 22 files; `tools/` 2,079 lines |
| Bundle | `www/index.html` ≈ 732 KB, single self-contained file |
| Save | `localStorage` (`dzs` + `dzs_bak`), 512 KB cap, mirrored to native Preferences |
| Modes | 7 endless sectors (level-gated), 3 scripted operations, sector ascension tiers |
| Content | 24 weapons, 5 operators, 11 abilities, 14 enemy types (incl. boss) + 4 elite affixes, 16 boons, 40 wave-draft cards (perks/specials/ultimates), 24 skins, 17 achievements, 10 login days, 10 career milestones |
| Tests | 30 audit checks + 72 logic assertions + 228 in-browser harness assertions, all green |
| CI | 3 GitHub Actions workflows (CI, debug APK, signed release APK) |

---

## 2. What the game actually is

You pick an operator and a sector, and fight **endless waves** of infected in a bounded arena.
The camera is top-down with a slight depth/parallax layer. Movement is a virtual stick;
**aiming is the trigger** — hold the right stick and the gun fires, there is no separate FIRE
button (a deliberate removal, see §12). Waves get denser and tougher, a **boss spawns every
5th wave** (twin bosses from wave 25), random **elite** variants appear with one of four affixes,
and from wave 2 onward each wave rolls **1–2 modifiers** (RUSH, IRON, TOXIC, BLACKOUT, SWARM,
BLITZ, ELITE HUNT) that change how that wave must be fought. Clearing a wave drafts a **boon**
choice (3 rarity-weighted cards); supply chests land on waves 1, 3, 6, 9, 12…, and kills drop cash,
ammo, power-ups and weapon crates. Dying ends the run and banks XP/credits, which is then spent
between runs on weapons, skill ranks, perks and relics.

Two things give the loop its shape:
* **Endless runs with a per-sector ladder** — sector *N* unlocks at rank 3*N*, and each sector has
  its own palette, hazard, bounty multiplier, enemy roster and **ascension tier** (re-clearing a
  sector at a higher ascension raises threat and payout, and is tracked in the save).
* **Scripted operations** — three fixed objectives (`LAST STAND`: survive 10 waves with healing
  cut 70%, kill the Brute Commander, extract; `ELITE HUNT`; `HEAVY METAL`) with one-time credit
  rewards stored in `SV.evDone`.

---

## 3. Tech stack, build and shipping

* **No framework.** `src_v2/body.html` holds the DOM chrome and 21 `engine_*.js` modules hold the logic;
  `src_v2/build.js` inlines everything into one `www/index.html`.
* **Packaging.** Capacitor (`capacitor.config.json`: appId `com.deadzone.game`, appName "Dead Zone",
  webDir `www`). `npm run sync:android` → `npx cap sync android`; the APK is assembled by Gradle
  (`android/app/build.gradle`) with `versionCode`/`versionName`.
* **No native plugins beyond Capacitor core.** The native Preferences store is used only as a
  mirror/backup for the web save.
* **CI.** `.github/workflows/ci.yml` (build + audit + logic tests), `build-apk.yml` (debug APK on
  push to main), `release.yml` (on tag push: restores the release keystore from repo secrets,
  `apksigner verify`, zips the source, publishes a GitHub Release with the APK + source zip).
* **Signing caveat (known, deliberate, unresolved).** An old keystore blob and passwords exist in
  the repository's *history* (pre-2.12 commits). The configuration is fixed going forward (secrets
  only), but the old key must be treated as compromised. Rotating it changes the app's signing
  identity, so existing installs could no longer update in place — that is why it is an owner
  decision and still open (`F10` in the analysis doc).

---

## 4. Repository layout

```
src_v2/          21 engine modules + build.js + body.html (the game)
  build.js               inlines everything into www/index.html
  engine_bootstrap.js    version constant, boot sequence, error overlay
  engine_core.js         canvas, resize/DPR, loop, quality, particles, audio
  engine_data.js         ALL content tables (weapons, operators, enemies, skins, events, tiers)
  engine_maps.js         the 7 sectors (palette, hazard, bounty, roster)
  engine_persistence.js  SV save schema, sanitizer, save/load/merge, rank & stat math
  engine_world.js        run state, waves, spawning, movement, collision, damage, death  (3152 lines)
  engine_lobby.js        the 9 lobby tabs: PLAY/EVENTS/SHOP/SKINS/HERO/SKILLS/STATS/RELICS/OPTS
  engine_events_missions.js  operations, daily missions, login track, rank milestones
  engine_meta.js         achievements, boons, mastery, skin unlock rules, lifetime stats
  engine_director.js     wave modifiers, power-ups, spawning director
  engine_passives.js     auras/burn/frost/immolation, ground rings
  engine_hud.js          in-run HUD, minimap, obstacle render
  engine_feel.js         hit feedback, screen shake, weapon archetypes, impact FX
  engine_fx.js           particles, explosions, beams, muzzle flashes
  engine_gore.js         blood, gibs, decals, footprints
  engine_depth.js        parallax depth, shadows, ambient weather, lighting
  engine_pickups.js      drops, chests, boon offers
  engine_props.js        arena props/obstacles
  engine_render_*.js     player, zombies, turret renderers
tools/           verification harnesses (Node + browser)
  load-engine.js         loads modules into a Node vm sandbox with stubs
  audit.js               30 static/structural checks
  test-logic.js          72 headless logic assertions
  regression-harness.js  228 assertions driven through the real DOM/canvas in a browser
www/             build output (index.html + icons)
android/         Capacitor Android project (Gradle, keystore config)
docs/shots/      screenshots
*.md             README, BALANCE_POLICY, GUN_LOGIC, VISUAL_LOGIC_AUDIT, dead-zone-analysis, AGENTS
```

---

## 5. Architecture in one page

* **Global mutable state, two objects.** `SV` is the *account* (persisted); `S` is the *run*
  (discarded on death). `P` is the player entity, `Z` zombies, `B` bullets, `D` drops,
  `F` particles, `T` turrets, `RG` rings, `DEC` ground decals, `CH` chests, `GH` ghost pace.
* **No classes, no ECS.** Entities are plain objects in arrays, updated by ordered loops in
  `update(dt)` and drawn by `draw()`. Fixed-ish timestep from `requestAnimationFrame`.
* **Data-driven content.** Nearly every tunable lives in `engine_data.js` / `engine_maps.js` /
  `engine_meta.js` tables, so weapons, enemies, skins and events can be changed without touching
  logic — and the audit validates those tables structurally.
* **One delegated click listener** runs every UI button through a `UI_ACTIONS` table keyed by
  `data-act`/`data-arg`; the markup carries no inline JavaScript (an audit check enforces this).
* **Save pipeline.** Every meaningful change calls `sv()` (write) and `lobby()` (re-render).
  `sanitizeSV()` is the single gate: it clamps every numeric field, validates indices, drops
  malformed records and normalises arrays, so a corrupt or hand-edited profile cannot inject
  `NaN`/`Infinity` into damage, health or crit rolls.
* **Determinism where it matters.** Daily missions, ghost pace and the shop ordering are all
  derived from stable inputs so the same day/seed produces the same result everywhere.

---

## 6. Run structure and difficulty

| Rule | Value |
|---|---|
| Spawn count per wave | `(6 + wave × 4) × densityMult` |
| Boss | every 5th wave; a **second boss** from wave 25 |
| Elites | possible from wave 2 (wave 1 in ELITE HUNT), chance ramping with wave to a 60% ceiling; 3.5× HP + one affix |
| Enemy HP scaling | `1 + wave × 0.085`, plus `(wave−12)^1.2 × 0.07` and `(wave−22)^1.35 × 0.14` |
| Wave modifiers | roll from wave 2, pool gated by wave (`min`) |
| Supply chests | wave 1, then every 3rd wave that is not a 5th |
| Boon draft | after every wave clear (3 rarity-weighted cards, wasting picks filtered) |
| Event waves | every 3rd wave that is not a 5th |
| Sector unlock | sector index *N* requires rank `3N` (sector 1 at rank 1) |
| Sector bounty | ×1.0 → ×1.8 across the 7 sectors |
| Ascension | per-sector tier, multiplies threat and payout, tracked in `SV.asc` |

**Wave modifiers** (`WAVE_MODS`): RUSH (faster, +cash), IRON (armoured, +cash), TOXIC (spitters/
blasters), BLACKOUT (visibility cut, dark overlay), SWARM (density), BLITZ (overrun), ELITE HUNT
(high-value elite pack, ×1.6 cash). Up to two roll together, which is where most of the run's
variety comes from.

---

## 7. Combat and the arsenal

**24 weapons**, each with a tier (COMMON→LEGENDARY), an account-rank requirement that gates
*purchase* (not ownership — ownership is only ever written by buying or the starter pistol),
a credit cost, and a real mechanical identity. Sustained DPS below is the honest number
(magazine damage ÷ (magazine × shot interval + reload)).


| # | Weapon | Tier | Rank req. | Damage | Pellets | Shot interval | Mag | Reload | Cost | Sustained DPS | Special |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Pistol | COMMON | 0 | 20 | 1 | 0.32s | 12 | 1.1s | 0 | 48.6 | — |
| 1 | SMG | UNCOMMON | 3 | 9.5 | 1 | 0.1s | 30 | 1.2s | 300 | 67.9 | — |
| 2 | Shotgun | UNCOMMON | 4 | 11 | 8 | 0.62s | 8 | 1.5s | 500 | 109.0 | — |
| 3 | Rifle | RARE | 6 | 30 | 1 | 0.2s | 25 | 1.3s | 700 | 119.0 | — |
| 4 | Minigun | EPIC | 9 | 10 | 1 | 0.075s | 100 | 2.4s | 1500 | 101.0 | — |
| 5 | Revolver | COMMON | 2 | 68 | 1 | 0.6s | 6 | 1.45s | 400 | 80.8 | — |
| 6 | Assault | RARE | 7 | 16 | 1 | 0.095s | 30 | 1.3s | 900 | 115.7 | — |
| 7 | Sniper | EPIC | 20 | 195 | 1 | 1.05s | 5 | 1.9s | 1200 | 136.4 | pierce 3, zoom 1.15 |
| 8 | Plasma | LEGENDARY | 11 | 34 | 1 | 0.14s | 20 | 1.5s | 2500 | 158.1 | pierce 2 |
| 9 | Rocket | LEGENDARY | 15 | 175 | 1 | 0.95s | 4 | 2s | 3000 | 120.7 | blast 115 |
| 10 | Flamer | EPIC | 12 | 8.5 | 2 | 0.065s | 50 | 1.7s | 1800 | 171.7 | flame, zoom 0.24 |
| 11 | Tesla | LEGENDARY | 16 | 62 | 1 | 0.3s | 15 | 1.6s | 3500 | 152.5 | pierce 3, chain 3 |
| 12 | GL-40 | EPIC | 14 | 135 | 1 | 0.9s | 6 | 1.8s | 2800 | 112.5 | blast 95 |
| 13 | Cryo Blaster | LEGENDARY | 17 | 24 | 1 | 0.13s | 24 | 1.4s | 3400 | 127.4 | cryo |
| 14 | Railgun | LEGENDARY | 22 | 340 | 1 | 1.4s | 3 | 2.3s | 4200 | 156.9 | pierce 10, zoom 1.35 |
| 15 | Dual Pistols | UNCOMMON | 3 | 13 | 2 | 0.16s | 24 | 1.3s | 350 | 121.4 | — |
| 16 | Burst Rifle | RARE | 8 | 22 | 3 | 0.38s | 24 | 1.4s | 850 | 150.6 | — |
| 17 | Arc Shotgun | LEGENDARY | 19 | 24 | 6 | 0.65s | 10 | 1.6s | 3800 | 177.8 | chain 1 |
| 18 | Crossbow | RARE | 5 | 84 | 1 | 0.62s | 6 | 1.7s | 650 | 93.0 | pierce 2, zoom 0.9 |
| 19 | Siphon SMG | EPIC | 10 | 13 | 1 | 0.085s | 36 | 1.3s | 1900 | 107.3 | lifesteal |
| 20 | Glacier Breaker | EPIC | 13 | 20 | 6 | 0.72s | 8 | 1.7s | 2600 | 128.7 | cryo, zoom 0.42 |
| 21 | Hornet | EPIC | 18 | 34 | 1 | 0.23s | 18 | 1.5s | 2600 | 108.5 | blast 48 |
| 22 | Volt Carbine | RARE | 21 | 26 | 1 | 0.14s | 26 | 1.4s | 1150 | 134.1 | pierce 2 |
| 23 | Siegebreaker | LEGENDARY | 24 | 190 | 1 | 0.85s | 4 | 2.3s | 4400 | 133.3 | blast 140 |

* **The tier policy is enforced, not decorative.** `TIER_POLICY` gives every tier a band for sustained
  DPS, damage per shot, magazine, reload and spread; `weaponTierIssues()` fails the build if a weapon drifts out of
  its band, and a deliberate outlier must be declared in `WEAP_TIER_EXCEPTIONS` (currently one: the Minigun's
  100-round belt and 2.4 s reload). Bands are nested, so an upgrade is always an upgrade.
* **Archetypes drive the feel.** `bulletArchetype(wi)` classifies each gun (flame, rocket, rail, heavy, magnum,
  arc, cryo, energy, pellet, tracer) and the projectile renderer, speed, lifetime and impact FX all read from it —
  a revolver round and a railgun slug do not share a look.
* **Weapon mastery.** Every kill grants mastery XP to the equipped weapon; six levels
  (`MAST_XP = 0/120/340/720/1250/2000`) grant stat bonuses, and one skin unlocks at max mastery.
* **Ballistics fields.** `pr` = pierce count, `ex` = blast radius, `cl` = chain targets, `fz` = cryo,
  `flm` = flame cone, `ls` = lifesteal, `rg` > 1 = zoom/rail behaviour, `sp` = spread, `kb` = knockback,
  `rng` = effective range.

### Enemy roster

| Key | Enemy | HP | Speed | Contact dmg | Cash | Tactical role |
|---|---|---|---|---|---|---|
| `walk` | walk | 58 | 55 | 10 | 10 | baseline walker |
| `run` | run | 40 | 115 | 8 | 14 | fast, fragile runner |
| `tank` | tank | 300 | 38 | 22 | 55 | armoured damage sponge |
| `exp` | exp | 46 | 90 | 0 | 22 | explodes on contact |
| `spit` | spit | 74 | 58 | 8 | 30 | ranged spitter |
| `stalker` | stalker | 78 | 82 | 15 | 25 | flanker, hits and backs off |
| `charger` | charger | 200 | 45 | 20 | 35 | winds up and charges |
| `boss` | boss | 5000 | 48 | 40 | 350 | sector boss |
| `crawler` | crawler | 42 | 132 | 6 | 12 | very fast, low-HP swarm |
| `bloater` | bloater | 220 | 33 | 0 | 42 | leaves a toxic cloud on death |
| `armored` | armored | 250 | 50 | 17 | 48 | front plate, must be flanked |
| `screamer` | screamer | 100 | 72 | 8 | 30 | buffs nearby infected |
| `shielder` | shielder | 160 | 62 | 10 | 44 | directional shield |
| `necromancer` | necromancer | 380 | 42 | 13 | 95 | raises the dead |

The same table is reachable under legacy aliases (`walker`, `runner`, `brute`, `exploder`, `spitter`),
which existing code and saves still use.

**Elite affixes** (`ELITE_AFFIX`): REGEN (self-heals), SWIFT (much faster), VOLATILE (explodes on death),
SPLITTER (splits into smaller enemies). An elite is 3.5× HP plus one affix, so each elite demands a different answer.

### Operators

| Operator | HP | Speed | Damage | Crit | Signature kit |
|---|---|---|---|---|---|
| Infantry | 100 | 175 | ×1 | 5% | DASH, GRENADE, TURRET |
| Commando | 130 | 155 | ×1.15 | 4% | RAGE, GRENADE, NOVA |
| Scout | 80 | 215 | ×0.9 | 12% | DASH, FROST BURST, CLOAK |
| Juggernaut | 170 | 130 | ×1.1 | 2% | AEGIS SHIELD, NOVA, FIELD HEAL |
| Spec-Ops | 95 | 190 | ×1.05 | 8% | CLOAK, STORM BOLT, METEOR |

Each operator carries three abilities from the pool of eleven, on their own cooldowns (dash 3 s, nova 10 s, rage 18 s,
grenade 0.5 s charge, turret 14 s, field heal 18 s, cloak 16 s, storm bolt 8 s, frost burst 14 s, meteor 12 s, aegis 16 s).
The four ability cells on the touch pad are re-labelled and re-iconed live when the operator changes.

---

## 8. Progression, economy and retention

**Two currencies and one ladder.**

* **XP → Career Rank.** XP needed per rank is `100 + 50 × rank`. Rank is the master gate: it drives
  base max HP (`+4 HP per rank`), base damage (`+2% per rank`), sector unlocks (`3 × sector`),
  weapon purchase rights, and ten **career rank milestones** (rank 2/4/6/8/10/12/15/20/25/30) that pay
  250–6,500 credits once each.
* **Credits (CR)** buy weapons (300–4,400), skill ranks, perks and relics. Earned from kills
  (scaled by sector bounty ×1.0–1.8 and by wave modifiers), chests, missions, milestones, achievements
  and the login track.
* **Combat cash** is the in-run currency, spent at in-run chests/deals; it is separate from CR and
  resets each run.

**Between-run systems**

| System | What it is |
|---|---|
| Skill tree (`SKL`) | 9 permanent stats bought with CR: Vitality (+10 HP/rank), Agility (+4% speed), Firepower (+5% dmg), Trigger Work (+6% fire rate), Deadly Aim (+4% crit), Life Leech (+0.5 HP/kill), Cellular Repair (+0.4 HP/s), Scavenger (+10% credits), Tactical Training (+8% XP) |
| Wave draft (`PKS`) | 40 cards offered between waves — 14 PERK, 23 SPECIAL, 3 ULTIMATE (Power Shot, Rapid Fire, Double Barrel, Piercing Rounds, Explosive Rounds, Sharpshooter, Iron Body, Second Wind, Bloodthirst, Adrenaline, Kevlar, Quick Skills, Magnet, Gold Rush, Grenadier, then the ✦ specials: Chain Lightning, Frost Aura, Immolation, Spectral Blades, Meteor Rain, Arcane Barrier, Shadow Step, Phoenix, Storm Caller, Venom Rounds, Soul Harvest, Thorns, Berserker, Time Warp, Executioner, Lucky Charm, Arcane Missiles, Bloodlust, Volatile Corpses, Kill Rush, Overcharge, Guardian Angel, Fragmentation, Glass Cannon, Nano Swarm) |
| Boons (`BOONS`) | 16 stacking run-modifiers with rarities and per-boon caps; 3 are drawn each chest as a rarity-weighted choice, and picks that would be wasted (e.g. a heal at full HP) are filtered out (damage, fire rate, speed, armour, credits, crit, pierce, vampirism, magnet, gravity well, grenades, stim, phase plating, frag tips, arc conductor, deadeye) |
| Weapons | 24, bought with CR, rank-gated, individually masterable |
| Skins | 24 (8 operator, 16 weapon) with unlock rules — some free, some by lifetime stat, some by mission/event reward |
| Relics | Long-horizon unlocks tied to lifetime stats and ascension tiers |
| Daily bonus | +200 CR once per calendar day, straight from the PLAY tab (`SV.day`) |
| Login track | 10 days of escalating credits, day 10 = a gold Minigun skin; one claim per day, streak preserved in `SV.loginDays` |
| Daily missions | Rotating board (see §16); 3 of 5 templates, date-seeded, targets scale with rank |
| Achievements | 17 lifetime goals with credit payouts, shown as a progress grid |
| Ascension | Per-sector prestige tiers that raise threat and payout; feeds the `ASCENDANT` achievement and a skin |

Retention is deliberately built on **scheduled** reasons to return (daily board, login track) and
**asymptotic** goals (mastery, ascension, sector sweep), not on artificial slowdowns.

---

## 9. UI / screens

Nine tabs, all rendered from `SV` on demand (`lobby()`):

1. **PLAY** — sector card (threat numeral, description, hazard tag, bounty, recommended level,
   personal best wave, enemy roster icons, preview), loadout summary, a **daily bonus** button
   (`DAILY +200` credits, once per calendar day, tracked by `SV.day`), a next-goal hint, and the
   deploy button.
2. **EVENTS** — the three operations with briefs, rules, difficulty and rewards; one-time completion.
3. **SHOP** — 24 weapons sorted by tier then price, each showing tier badge, stats, damage/DPS, price,
   `RANK n REQUIRED` gate or BUY/EQUIP state.
4. **SKINS** — turntable preview of the selected skin on the real renderer, lock reasons, equip.
5. **HERO** — operator roster with stats and description.
6. **SKILLS** — the 9 permanent stats with costs and ranks.
7. **STATS** — lifetime statistics.
8. **RELICS** — long-horizon unlocks.
9. **OPTS** — controls, HUD/comfort and quality settings (shake level, FX level, quality, gore level,
   control scale/opacity, control mode).

In-run HUD: health bar, wave counter + modifier chips, minimap, credits, combo meter, weapon name/
ammo/reload/fire-mode/damage, ability cells with cooldown arcs and grenade count, plus the touch pad.
HUD geometry is validated against multiple landscape aspect ratios and safe areas by the harness.

---

## 10. Save data

Single account object `SV`, versioned (`v: 3`) and sanitised on every load:

`v, rev, ts, xp, lvl, cr, best, own[], start, day, dmDate, dmDone, dailyMissions{}, loginDays,
lastLogin, loginClaimed{}, rankClaimed{}, evDone{}, mast{}, ach{}, lt{}, pace{}, asc{}, runStreak,
skins{}, eqSkin{}, sp, map, cls, ctlMode, ctlSize, ctlOpacity, shakeLvl, fx, quality, goreLvl,
fireMode(removed), skill ranks (mx, spd, dm, rof, crit, vamp, regen, cb, xpb, hu, du, gu, sc,
shadows, luck, mute)`

* **Storage**: `localStorage` key `dzs`, with `dzs_bak` as the previous good copy; the same payload is
  mirrored into the native Preferences store, and the merge uses `rev`/`ts` to decide which copy wins.
* **Limits**: `SAVE_MAX_BYTES = 512 KB`, `PACE_KEEP = 80` ghost runs, `MAP_MAX = 256` records.
* **Migrations/normalisation**: `applySV()` normalises a missing/short/non-array `own`, `missionMap()`
  preserves mission records (an earlier bug ran them through a numeric map and silently emptied the
  board), and every numeric field is clamped. Nothing in the schema is ever renamed or reordered, and
  new content is appended rather than inserted — indices into `own`, `start`, `mast` and skin `wi`
  are persisted, so reordering the weapon table would re-point saved progress at a different gun.

---

## 11. Input and controls

* **Mobile (primary).** Left half = movement stick; **right stick = aim and fire** (holding it fires;
  there is no FIRE button — it was removed as dead weight). A compact cluster anchored to the
  bottom-right holds the four ability cells, with RELOAD beside the weapon readout and PAUSE on the
  HUD. Buttons are circular, consistent in size/border, and laid out with hit-area checks that the
  harness verifies (no overlap, inside safe area, nothing off-screen, arena centre kept clear).
* **Desktop.** WASD/arrows to move, mouse to aim and fire, keys for abilities, reload and pause.
* Control scale, opacity and mode are user settings; input is released cleanly when pausing.

---

## 12. Rendering, FX, audio and performance

* **All procedural.** Zombies, operators, weapons, buildings, vehicles, foliage, ice, magma, neon,
  spores — drawn with paths, gradients and cached soft sprites. Buildings/props come from per-sector
  prop generators with collision boxes derived from the same data.
* **Depth and atmosphere.** A depth layer adds contact shadows, a top-left light vector, parallax and
  per-sector ambient weather (rain, dust, snow, spore, ember, spark) plus hazards (toxic pools, magma
  fissures, ice, water).
* **Combat feedback.** Per-archetype muzzle flashes, tracers and projectiles; impact sparks, hit
  flashes, flinch, knockback, crit popups, screen shake (off/reduced/normal, persisted), blood and
  gibs, ground decals (blood, scorch marks, footprints) and footfall dust.
* **Status systems.** Burn (damage-over-time with capped dps and refresh-instead-of-stack semantics),
  frost/cryo, chain lightning, auras (Frost/Immolation rings) that visibly match their actual radius,
  and explosions that leave ground scorch decals.
* **Audio.** Everything is synthesised at runtime through WebAudio — `snd(frequency, duration,
  waveform, volume, ...)` covers gunshots, impacts, reloads, pickups and UI. There is no music track
  and no audio file.
* **Performance guards.** Particle budget by quality (low 60 / medium 140 / high 250) with trimming,
  decal and ghost-pace caps, cached gradients instead of per-frame allocation (measured in the
  harness), and quality settings that scale effects rather than resolution.

---

## 13. Verification and tooling

Three layers, all runnable locally and in CI:

| Tool | What it proves |
|---|---|
| `npm run build` (`src_v2/build.js`) | every module parses, then the single-file bundle is produced |
| `npm run audit` (`tools/audit.js`, 30 checks) | structural invariants: every weapon has usable stats and fits its tier policy, the tier ladder is monotonic, `WEAP_RANK` is a same-length array of sane integers, every skin points at a real weapon/operator, every achievement is well formed with unique ids, the daily pool is well formed, **every daily mission type has a real gameplay caller**, every claim function re-validates its own flag, the markup carries no inline event attributes, every `data-act` element resolves to a handler |
| `npm run test:logic` (`tools/test-logic.js`, 72 assertions) | headless rules: weapon stats, skin indices, the save sanitiser, ownership rules (rank does not grant weapons, credits do not bypass the gate), reward/claim eligibility and one-claim semantics, date handling, mission tracking, board determinism/scaling |
| `npm run harness` + browser (`tools/regression-harness.js`, 228 assertions) | the real thing in a real browser: renders the built bundle, clicks the actual DOM buttons, fires the actual weapons, drives the sim loop, checks HUD geometry at several landscape sizes, checks the draw path's per-frame cost, and captures console errors |

The harness runs against the *built* bundle (`npm run build` first, or a stale `www/index.html` is
tested). "Verified" in this project means: input paths, DOM handlers and the render path were driven
in a browser — **not** that the game was played on a physical device.

---

## 14. Release engineering

* **Versioning** is mirrored in five places: `package.json`, `android/app/build.gradle`
  (`versionCode`/`versionName`), the `GAME_VERSION` constant, the lobby tagline, and the header
  comment of every module.
* **Releases** are tag-driven. Pushing a tag runs `release.yml`, which restores the keystore from
  secrets, builds a signed APK, verifies the signature, zips the source and publishes a GitHub
  Release with both assets. `main` pushes produce debug APKs and run CI.
* **Documentation of record**: `BALANCE_POLICY.md` (design rules and standards), `GUN_LOGIC.md`
  (DPS/TTK derivation and weapon-logic defects found), `VISUAL_LOGIC_AUDIT.md` (visual defects and
  fixes), `dead-zone-analysis.md` (the running bug/risk audit with numbered findings F1–F12 and
  passes N1–N17), `AGENTS.md` (repo memory: build/test commands, conventions, release notes).

---

## 15. Version history and current state

| Version | State | Highlights |
|---|---|---|
| v2.x series | shipped earlier | mobile control redesign, HUD polish, skins crash fix, weapon balance/tier system, collision work |
| **v1.0.0** | released | the "starting version": full audit, production release, all previous releases deleted |
| **v1.0.1** | released | closed three deferred audit findings (incl. the missing lobby shop) |
| **v1.0.2** | released | fixed the two progression bugs (weapons auto-unlocking from rank; missions/login rewards/claims not working) and added combat/progression feedback (auras that match their real radius, ground scorch, footfall dust) |
| **v1.1.0** | **draft, unreleased** (`draft/v1.1.0`) | rotating daily board (3 of 5 date-seeded templates, rank-scaled targets), two new wired mission types (bosses, power-ups), two new weapons (Volt Carbine RARE rank 21 piercing; Siegebreaker LEGENDARY rank 24 blast), three new achievements, a corrected comment in `engine_data.js`, and +3 audit / +13 logic / +15 harness assertions |

### Root causes of the two v1.0.2 progression bugs (worth knowing)

1. **Weapons unlocked themselves.** `syncWeaponUnlocks()` in `engine_persistence.js` wrote
   `SV.own[i] = 1` for *every* weapon at or below the account's rank. That was correct while the shop
   was retired, and became a bug the moment the shop returned in v1.0.0 — ranking up handed over the
   whole arsenal for free. Ownership is now written only by a purchase (or the starter pistol), rank
   is a prerequisite checked in `buyWeapon()` and displayed as `RANK n REQUIRED`.
2. **Missions and claims did nothing**, for four independent reasons: the save sanitiser ran
   `dailyMissions` through a numeric map so mission records became `NaN` and the board was dropped on
   the next save; the claim handlers compared a string `data-arg` against numeric table rows with
   `===` so the lookup always missed; the board only reseeded on a date change; and login-day
   eligibility compared a string against a number.

---

## 16. Known limitations and open decisions

* **Not device-tested.** All verification is headless/browser-driven; no physical-device profiling or
  soak test has been run.
* **Keystore in public history** (§3) — unresolved by choice, because rotation changes the signing
  identity.
* **Single-file bundle and cold start** — the whole game is one ~732 KB HTML file parsed at launch;
  acceptable now, worth revisiting if content grows a lot.
* **Dead data / duplication** — `DAILY_MISSIONS_POOL` in `engine_data.js` is a legacy table no longer
  read (the live board is built in `engine_events_missions.js`); `recLvl` in the map table duplicates
  the `3 × sector` rule the lobby actually enforces; `S.deal` is declared in the run state but never
  read (the "rotating supply deal" it was reserved for does not exist yet).
* **Scorches share the decal pool**, so a very busy map can trim old ones; dust stops at the particle
  budget; burn dps is capped per enemy — all deliberate.
* **Drafted but not decided** for v1.1.0: the new weapons' rank gates (21/24), the Siegebreaker's
  4,400 CR price, and whether the daily board should draw 3 of 5 or 4 of 5 templates.

---

## 17. Commands

```bash
npm run build        # compile src_v2/* into www/index.html
npm run audit        # 30 structural checks
npm run test:logic   # 72 headless logic assertions
npm run test         # build + audit + logic tests
npm run harness      # repack the bundle for the browser harness (run build first)
npm run sync:android # npx cap sync android  (then Gradle assembleDebug / assembleRelease)
```
