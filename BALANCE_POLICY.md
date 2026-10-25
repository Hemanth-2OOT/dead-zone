# DEAD ZONE — GAME BALANCE POLICY & DESIGN STANDARD

This document establishes the mandatory balance, scaling, and architectural standards for **Dead Zone**. All future weapons, enemies, upgrades, and system modifications must comply with the rules outlined below.

> **Status:** Updated for **v2.4.0**. Rules 4 and 6, the weapon matrix, the wave-modifier roster, the Career Rank Milestone track, the Skill/Stat reference, **and the new depth/retention layer (Section 6)** reflect the *shipped* implementation. Where this document and the code disagree, the code in `src_v2/` is authoritative and this document must be corrected.

---

## 1. Core Balance Philosophy

Dead Zone is a tactical top-down action-survival roguelite. Progression must feel:
- **Fair and deliberate in the early game**: Starter loadouts can overcome threats through movement, aim, and spatial awareness; enemies are never bullet sponges, and players never die from unavoidable RNG bursts.
- **Strategic in the mid-game**: Builds branch into clear specializations (e.g., high-penetration ballistic, area incendiary, crowd-control cryogenic, chained electrical, or precision burst).
- **Spectacular in the late game**: Powerful synergistic builds clear dense hordes with satisfying visual punch, while enemies maintain counterplay through complementary attack types, armor, and telegraphed hazards.

---

## 2. The 14 Mandatory Balance Rules

### Rule 1 — Data-Driven Centralized Balance
All weapon stats, enemy stats, perk values, upgrade prices, spawn rates, and difficulty modifiers must reside in centralized data structures (`WEAP`, `ZT`, `PKS`, `AR`, `SKL`, `MP`, `MAP_DATA`, `PU_DEFS`, `EVENTS`). Avoid magic numbers scattered throughout the game loop.

### Rule 2 — Every Change Needs a Documented Reason
Never tweak values blindly. Every adjustment must document:
1. The identified problem.
2. The target combat metric (DPS, TTK, effective range, cost efficiency).
3. The affected systems and trade-offs.
4. Validation results.

### Rule 3 — No Universally Dominant Weapon
Every weapon must have an identifiable strength, an intended engagement envelope, and a clear tactical drawback.
- **High sustained fire weapons (Minigun)** must feature handling penalties (reduced firing movement speed, wider spread cone, or spin-up time).
- **High alpha-damage weapons (Sniper, Railgun, Rocket)** must feature low fire rates, positioning vulnerability, or shot commitment.
- **Close-range powerhouses (Shotgun, Flamer)** must demand hazardous proximity and lack extreme range.
- Higher cost indicates situational specialization or utility—not flat, unconditional superiority in every scenario.

### Rule 4 — Controlled Power Scaling (Additive Over Multiplicative)
Stat bonuses must scale with controlled returns:
- **Meta progression** bonuses (skill ranks, stat-upgrade levels, account rank) stack **additively** from base values (`base × (1 + Σ bonuses)`), never compounding multiplicatively. Only explicitly multiplicative combat perks may compound.
- **Damage soft cap**: the effective damage multiplier above `3.0×` yields diminishing returns — `effDm = 3.0 + √(dm − 3.0) × 0.8` (applied in `fire()`).
- **Critical chance is hard-capped at 75%** (enforced in `fire()`).
- **Damage reduction (armor) is hard-capped at 65%** — the incoming-damage multiplier never drops below `0.35` (enforced in `hurtP()`).
- **Cooldown reduction is hard-capped at 50%** — the skill-cooldown decay multiplier never exceeds `1.5×` (enforced in the `SK` cooldown tick).
- Movement-speed bonuses are additive per rank; persistent stacking belongs to the perk layer, not the meta layer.

*(Caps verified in code as of v2.2.0.)*

### Rule 5 — Difficulty Must Be Earned, Not Inflated
Wave difficulty escalates through **tactical composition** rather than infinite HP pools:
- Mix fast flankers (Runners, Stalkers) with ranged pressure (Spitters) and durable anchors (Tanks, Chargers).
- Elite enemies gain tactical behaviors (auras, faster repositioning, explosive death reactions) rather than simple 10x health bloat.
- Sector environmental hazards (lava, poison pools, laser gates) must be readable and avoidable.

### Rule 6 — Reward Rarity & Economy Integrity
The game features two strictly separated currencies:
1. **Run Cash (`S.cash`)**: Temporary currency earned during deployment (kill drops and chests), spent at between-wave supply caches on temporary weapon acquisitions, repairs, and combat consumables. At the **end of a run only** (death, abort, or event resolution), unspent cash converts into permanent credits at a fixed, transparent settlement rate of **1:1 (100%)**, exactly as printed on the run-summary panel. Settlement is guarded by `S.committed` so a run can never bank twice, and mid-run autosaves must **not** settle credits (banking mid-run would let a player keep the credits *and* spend the same cash at the next cache). The **Scavenger** skill applies a persistent `+10%` credit bonus per rank (`S.cm`) to in-run cash drops.
2. **Permanent Credits (`SV.cr`)**: Meta-currency displayed in the lobby, used exclusively for persistent base upgrades, weapon armory unlocks, and operative licenses.
- No purchase may ever double-charge or accidentally spend meta-credits during an in-run supply phase.
- All purchases must route through centralized transaction guards with affordability verification.

### Rule 7 — No Silent Persistence Regressions
Save data must maintain strict schema versioning (`SV.v`), monotonic revision counters (`SV.rev`), and UTC timestamps (`SV.ts`).
- Never overwrite newer local state with older remote/preference data.
- Never wipe player save files during routine updates; migration pipelines must sanitize and backfill defaults gracefully.

### Rule 8 — Visual Clarity Beats Visual Noise
Every visual element must communicate gameplay truth:
- Projectile models must accurately reflect weapon identity (Pistol bullets never turn into rockets; railgun shots render as hyper-beams).
- Danger zones and boss attacks must display clear telegraphs before damage frames activate.
- Explosions, particles, and smoke must remain semi-transparent and fade cleanly to preserve battlefield readability during 100+ zombie waves.

### Rule 9 — Mobile Performance Is a Strict Requirement
- Active entities (projectiles, zombies, particles, damage numbers, shell casings) must respect strict collection caps.
- Canvas state must be defensively reset per frame (`setTransform`, `globalAlpha = 1`, `setLineDash([])`).
- Browser and Android WebView polyfills (`roundRect`, `ellipse`) must remain present for older device support.

### Rule 10 — Mandatory Multi-Profile Testing
Balance changes must be validated across three distinct profiles:
1. **Fresh Account**: Rank 1, base Pistol, zero meta-upgrades (verifying early waves are survivable and fair).
2. **Mid-Tier Account**: Rank 10, mid-tier loadouts (Assault/Shotgun), moderate perks (verifying progression feels rewarding).
3. **Endgame Account**: Rank 25+, high-tier weapons (Railgun/Cryo), stacked perks (verifying high waves test skill and don't collapse into 0-second boss wipes).

### Rule 11 — Chest Cadence Standard
Chests provide high-excitement rewards and must remain special:
- Standard waves spawn at most **1 chest** every 2-3 waves.
- Boss victories reward **1 high-tier supply chest**.
- Elites and Tanks have a small, controlled chance (10-15%) with an internal drop cooldown (minimum 25s between drops).
- Maximum simultaneous uncollected chests on screen is capped at **3**.

### Rule 12 — Distinct Weapon & Relic Visual Hierarchy
Every weapon, skill, relic, and upgrade card must feature a distinct procedural vector or canvas silhouette. Never rely on emojis or plain text cards.

### Rule 13 — Avoid Global Knee-Jerk Nerfs
When an overpowered combination is detected, identify the exact multiplicative synergy before reducing baseline weapon stats. Preserve the weapon's distinctive mechanical punch.

### Rule 14 — Weapon Identity Matrix
Every firearm in Dead Zone must satisfy its designated role:
- **Pistol (0 cr)**: Pinpoint precision, moderate fire rate, high mobility, low cost.
- **SMG (300 cr)**: Close-to-mid spray, high mobility, wider spread cone.
- **Dual Pistols (350 cr)**: High-mobility run-and-gun skirmisher, alternating dual fire.
- **Revolver (400 cr)**: Heavy kinetic stopping power, high single-target stagger, deliberate cadence.
- **Shotgun (500 cr)**: Devastating point-blank burst (8 pellets), rapid falloff beyond mid-range.
- **Crossbow (650 cr)**: Silent precision bolts, pierces 2 targets, tight spread, slow cadence.
- **Rifle (700 cr)**: Disciplined mid-to-long range battle rifle with moderate recoil.
- **Burst Rifle (850 cr)**: Precision 3-round burst, lethal at mid-to-long range.
- **Assault (900 cr)**: Versatile full-auto combat weapon with predictable recoil.
- **Sniper (1200 cr)**: High-caliber precision rifle, pierces 3 targets, severe hipfire penalty while sprinting.
- **Minigun (1500 cr)**: Heavy rotary cannon (10 dmg, 13.3/s), immense sustained suppression, wide spread cone, low per-shot knockback.
- **Flamer (1800 cr)**: Dedicated short-range conical stream (2 pellets), intense point-blank billow.
- **Siphon SMG (1900 cr)**: Sustained-fire SMG (13 dmg, 11.8/s) that heals the operator on hit (lifesteal).
- **Plasma (2500 cr)**: High-energy piercing spheres (2 pierce) with ionized splash.
- **Glacier Breaker (2600 cr)**: 6-pellet cryogenic punt-gun (20 dmg/pellet), crowd-freezing utility over raw DPS.
- **Hornet (2600 cr)**: Compact explosive carbine (34 dmg + 48 splash), splash damage for clustered hordes.
- **GL-40 (2800 cr)**: 40mm explosive canisters (135 dmg + 95 splash), high tactical crowd clearance.
- **Rocket Launcher (3000 cr)**: Massive explosive warhead, 175 direct damage + 115 splash radius.
- **Cryo Blaster (3400 cr)**: Cryogenic shards slowing enemies, defensive utility over raw DPS.
- **Tesla (3500 cr)**: High-voltage arc generator chaining through up to 4 targets with falloff.
- **Arc Shotgun (3800 cr)**: Electrified heavy buckshot (24 dmg × 6 pellets) chaining miniature lightning arcs to adjacent targets.
- **Heavy Railgun (4200 cr)**: Pure electromagnetic kinetic beam piercing up to 10 targets, high commitment.

---

## 3. Progression Reference (Skills, Stats & Rank)

Every meta upgrade must map a single save key (`SV.<key>`) to exactly one runtime effect. Keys must never collide between the skill tree and the stat-upgrade panel.

### 3.1 Skill Tree (`SKL`, max 5 ranks each, 1 skill point per level)

| Skill | Save key | Effect per rank | Applied in |
|---|---|---|---|
| Vitality | `mx` | `+10` max HP | `applySV` (`P.mx`) |
| Agility | `spd` | `+4%` move speed | player movement |
| Firepower | `dm` | `+5%` base damage | `applySV` (`S.dm`) |
| Trigger Work | `rof` | `+6%` fire rate | `fire()` cooldown |
| Deadly Aim | `crit` | `+4%` crit chance (hard-capped 75%) | `fire()` |
| Life Leech | `vamp` | `+0.5` HP per kill | `applySV` (`S.ls`) |
| Cellular Repair | `regen` | `+0.4` HP/sec | player update loop |
| Scavenger | `cb` | `+10%` credit gain | `applySV` (`S.cm`) |
| Tactical Training | `xpb` | `+8%` XP gain | `gainXP()` |

### 3.2 Stat-Upgrade Panel (`lobby2` statsList)

| Upgrade | Save key | Effect per level | Cost |
|---|---|---|---|
| Max Health | `hu` | `+10` HP | 150 (×1.4/level) |
| Damage Output | `du` | `+5%` base damage | 200 (×1.4/level) |
| Grenade Reserve | `gu` | `+2` grenades at wave start | 180 (×1.4/level) |
| Starting Cash | `sc` | `+$50` starting cash per wave | 120 (×1.4/level) |

### 3.3 Account Rank & Skill Points
- **Account Rank** (`SV.lvl`) increases by **1 per in-run level-up** and scales max HP (`+4/rank`) and base damage (`+2%/rank`).
- **Skill Points** (`SV.sp`) are granted at **+1 per in-run level-up** and are spent in the lobby skill tree. Login-reward entries may also define an `sp` amount.
- The **run-over summary** reports skill points earned this run as `S.up`.

> These mappings are enforced as of v2.3.0. The `sc` (Starting Cash) key was renamed from `cb` to resolve a collision with the Scavenger skill; the *runtime* Starting Cash value now lives in `S.stCash` so it can never collide with the Storm Caller perk/relic counter (`S.sc`).

### 3.4 Career Rank Milestones (`RANK_MILESTONES`)
A persistent, additive reward track that gives every account rank a concrete goal:
- Milestones are defined at ranks **2, 4, 6, 8, 10, 12, 15, 20, 25, 30**, each granting a one-time credit payout (250 → 6500 CR).
- Claims are keyed by rank in `SV.rankClaimed` and are **idempotent** — a milestone can be claimed exactly once, and only when `SV.lvl >= milestone.r`.
- The lobby **CAREER REWARDS** panel always surfaces the next locked milestone with progress, so the player is never without a near-term objective.

### 3.5 Wave Modifier Roster (`WAVE_MODS`)
Non-boss waves from wave 2 may roll one modifier (55% chance, never the same as the previous wave). Seven modifiers exist and must remain mutually distinct:
`RUSH`, `IRON`, `TOXIC`, `BLACKOUT`, `SWARM`, `BLITZ` (overrun — heavy runner density, `spMul 0.5`), and `ELITE HUNT` (raises elite spawn chance via `S.eliteBoost`). Each modifier carries a cash multiplier so risk is always rewarded.

### 3.6 In-Run Perk Draft
- The level-up draft offers **3 distinct perks**, and must **never** offer a perk already at its maximum stack count (`PKS[i][3]`); when fewer than three un-maxed perks remain, the pool falls back to the full list.
- A **REROLL** option (150 run cash) lets the player re-draw the hand, giving agency over a bad roll. Rerolls spend run cash only and never meta-credits.

---

## 4. Mandatory Operational & Live-Service Rules

### Mandatory Rule 1 — Validated Enemy Death Pipeline
All enemy damage must pass through a validated, centralized damage/death pipeline (`damageZ`). Damage must check for finite numbers, clamp corrupted health, apply legitimate armor/resistance, and trigger the death lifecycle (`killZ`) exactly once. Dead enemies must immediately cease attacks and collision.

### Mandatory Rule 2 — Weapon Visual Fidelity
Every weapon's visuals and trajectories must strictly match its actual firing mechanics. Ballistic tracers, pellet spreads, rockets, and beams must reflect their true hitboxes and ranges. An explosion flag must never transform unrelated bullets into rocket sprites.

### Mandatory Rule 3 — Cosmetic Integrity (Zero Pay-to-Win)
Cosmetic skins, finishes, and visual evolutions must never secretly or overtly alter damage, fire rate, range, hitboxes, critical chance, or survivability. Any combat bonus must belong to transparent gameplay progression.

### Mandatory Rule 4 — Purposeful Arsenal Expansion
Every weapon added to Dead Zone must fill a genuine tactical role, with defined range, DPS envelope, recoil, price, weakness, and upgrade interaction. Redundant or gimmicky weapons are strictly prohibited.

### Mandatory Rule 5 — Dedicated Events Isolation
Special operations and events are strictly separate game modes accessed through the dedicated Events lobby section. Events must never randomly activate during normal sector deployment. Normal play remains pure survival across the seven sectors.

### Mandatory Rule 6 — Defined Event Specifications
Every event must define explicit start conditions, objectives, difficulty ratings, modifiers, win/loss criteria, reward schedules, and cleanup routines. Completing or failing an event must return cleanly to the lobby without residual modifiers bleeding into standard runs.

### Mandatory Rule 7 — Idempotent Reward Claims
All event rewards, milestone achievements, daily missions, and login rewards must be strictly idempotent. Repeated callbacks, app restarts, or network re-connections must never grant duplicate rewards.

### Mandatory Rule 8 — Documented Reset Cycles
Daily missions and login reward tracks must follow a single, transparent calendar date reset. Progression tracks must be forgiving: missing a day must never harshly wipe accumulated progress back to Day 1.

### Mandatory Rule 9 — Multi-Tier Progression Testing
All new content, balance adjustments, and game modes must be verified across three distinct account tiers:
1. Fresh Account (Rank 1, basic Pistol, zero meta-upgrades).
2. Mid-Tier Account (Rank 10, mid-tier loadouts, moderate upgrades).
3. Endgame Account (Rank 25+, high-tier weapons, stacked perks).

### Mandatory Rule 10 — Mobile Performance Limits & Fallbacks
All transient visual effects, particles, damage indicators, and bullet casings must enforce strict array caps and lifecycle limits. Performance on mobile devices must sustain 60 FPS without memory leaks.

### Mandatory Rule 11 — Safe Save Migrations
Save data schema updates must increment version numbers (`SV.v`), preserve all historical credits, unlocks, and progression, and provide defensive migration fallbacks. A save file must never be wiped due to an unrecognized optional field.

### Mandatory Rule 12 — Genuine Loading Screens
Loading screens must correspond to real operational work (asset initialization, procedural icon caching, preference synchronization). Arbitrary spin delays and frozen spinners are forbidden.

### Mandatory Rule 13 — Rarity and Power Separation
Weapon rarity tiers (Common, Uncommon, Rare, Epic, Legendary, Event-Exclusive) communicate acquisition difficulty, thematic uniqueness, and complexity—not raw unbalanced DPS superiority.

---

## 5. Pre-Update Verification Checklist

Before any update is committed or deployed, verify:
- [ ] Automated syntax and simulation tests pass with exit code 0.
- [ ] Centralized damage/death pipeline prevents immortal enemies with NaN health.
- [ ] Combat caps hold: crit ≤ 75%, damage reduction ≤ 65%, cooldown reduction ≤ 50%, damage soft cap intact.
- [ ] Skill-tree and stat-upgrade save keys are unique and each maps to a live runtime effect (no inert upgrades).
- [ ] Gore call sites pass the full argument contract (`hitAngle`, `dmg`/`zType`, `isCrit`, sector `curM`).
- [ ] Every spawn bucket in `startWave` is reachable (no archetype starved by an unreachable `else if`).
- [ ] Flamer reach is restricted to a short-range cone stream with visible muzzle flare.
- [ ] No firearm bullets visually morph into rockets or other projectile types.
- [ ] Events mode is strictly isolated to the Events lobby tab and never bleeds into normal runs.
- [ ] Event rewards and daily missions cannot be claimed twice.
- [ ] 10-day login track preserves progress across app restarts and does not reset on missed days.
- [ ] Save migration from previous versions preserves all player credits and unlocks without reset.
- [ ] Frame rate on mobile maintains steady 60 FPS without memory leaks or unbounded arrays.
- [ ] Android landscape and sticky immersive fullscreen remain locked.
- [ ] Run cash settles to credits exactly once, at run end (death/abort/event), and never during a mid-run autosave.
- [ ] The Starting Cash stat (`S.stCash`) and the Storm Caller perk/relic counter (`S.sc`) remain separate runtime fields.
- [ ] The perk draft never offers a perk already at max stacks, and REROLL spends run cash only.
- [ ] Career Rank Milestone claims are idempotent and rank-gated (`SV.rankClaimed`).
- [ ] All 7 wave modifiers remain reachable and mutually distinct, and the radar colours drops by `d.k`.
- [ ] Wave modifiers may stack (max 2 per wave); `spMul` never exceeds 2 and `eliteBoost` never exceeds 0.8.
- [ ] The wave-clear award is idempotent per wave (`S.clearedWave`): re-entering the clear branch cannot duplicate flawless bonuses or reopen the shop.
- [ ] Every run boon declares `max` stacks and `ap()` cannot push a runtime stat past its Section 6 cap.
- [ ] Weapon mastery XP is always attributed to the weapon that fired the shot (`b.wi`), never to the currently equipped weapon at kill time.
- [ ] Ascension tiers are capped (5 per sector) and only raise enemy HP/roll chance plus a bounded reward multiplier (`1 + 0.12 x tier`).
- [ ] Achievement credit claims are idempotent (`SV.ach`) and are never payable twice.
- [ ] New save fields (`mast`, `ach`, `lt`, `pace`, `asc`, `runStreak`, `clearedWave`) upgrade cleanly from older saves via `sanitizeSV`.

---

## 6. v2.4.0 — Depth, Retention & Meta Systems

v2.4.0 adds presentation depth and the long-tail retention layer. Each system has explicit caps so that "more content" never becomes "uncapped power".

### 6.1 Between-Wave Boon Draft (`engine_meta.js` — `BOONS`)
- Fires on every wave clear (`openShop` → `rollBoonOffer`); three distinct picks from `BOONS`, weighted by `BOON_RARITY_W` (`common 100 / rare 55 / epic 24`).
- Every boon declares a hard `max` stack count; `takeBoon` refuses a fourth stack of a max-3 boon. Acquisitions are recorded in `S.boons` and surfaced in the HUD as a compact line (`boonHudLine`).
- Boons are **run-scoped** and multiplicative only on their own axis (`S.dm`, `S.rf`, `S.ms`, `S.ar`, `S.cm`, `S.ct`, `S.ls`, `S.eb`, `S.cl`, `S.cdmg`).
- `S.ar` (damage taken) is floored at 0.4, preserving the Rule 6 armour floor (damage reduction ≤ 65%).
- DEADEYE (`deadeye`, +0.35 critical damage, max 3) is the replacement for the removed INCENDIARY boon; it feeds `critMult = 2 + S.cdmg` and therefore stacks with, but never bypasses, the 75% crit-chance cap.

### 6.2 Weapon Mastery (`MAST_XP`, `masteryLevel`, `masteryDamageMult`)
- Per-weapon XP (`SV.mast[wi]`) awarded at kill time: boss 40, elite 12, normal 3, attributed through the bullet's origin index so off-hand kills still credit the correct gun.
- Six tiers (`MAST_XP = [0, 120, 340, 720, 1250, 2000]`); the damage bonus is deliberately small and additive in effect (`masteryDamageMult`, ~1 + 0.02 x level) so mastery rewards time invested without creating a dominant weapon (Rule 3).
- Mastery is permanent meta progress and is displayed on every gun card and in the SERVICE RECORD grid.

### 6.3 Ascension Tiers (`ASC_MAX`, `refreshAscension`, `ascRewardMult`, `ascRollChance`)
- Clearing a sector at a deeper wave permanently raises that sector's tier (`SV.asc[mapIndex]`), capped at `ASC_MAX = 5`.
- Each tier: +7% enemy HP per tier in `spawn`, a higher chance of a stacked wave modifier (`ascRollChance = min(1, 0.55 + 0.08 x tier)`), and a bounded payout multiplier (`ascRewardMult = 1 + 0.12 x tier`, max 1.6x).
- None of these touch the crit / damage-reduction / cooldown caps: ascension changes *threat and payout*, never the Rule 4 ceilings.

### 6.4 Achievement / Service Record Grid (`ACHIEVEMENTS`, `claimAchievement`)
- Fourteen lifetime goals read from `SV.lt` (lifetime totals: kills, elites, bosses, waves, highest wave, best combo, power-ups, shots, flawless, maps, owned weapons, mastery, ascension).
- Claims are one-shot (`SV.ach`) and pay a fixed credit reward; `transactMetaCredits` remains the single credits mutation point (Rule 6).

### 6.5 Retained Habits: Ghost Pace, Supply Deal, Run Streak
- **Ghost pace** records per-wave clear times (`SV.pace.times`) on a personal-best run and reports an AHEAD/BEHIND delta at wave clear and live in the HUD.
- **Supply deal** features one randomly discounted shop entry per wave (`S.deal`, x0.6 cost), re-rolled when `S.deal.wave !== S.wave` and consumed on purchase.
- **Run streak** (`SV.runStreak`, incremented on waves ≥ 10) adds a bounded cash multiplier via `runStreakBonus()`, keeping the risk-reward loop (Rule 5) without inflating the economy.

### 6.6 Presentation Depth (no balance impact)
- `engine_depth.js` adds the Y-sorted entity band, contact shadows, additive light pass, downsample bloom, per-sector colour grade and ambient weather. These are **quality-gated** presentation only: `QUALITY_SETTINGS` still governs `dynamicLights`, `shadowBlur`, decal/mist caps, and the low profile disables the light/bloom layers entirely (Rule 9).
- The particle system (`F[]`) is now rendered through `renderParticles`, and per-frame gradient allocations were replaced with cached gradients; both are strictly performance wins.

### 6.7 Mandatory Test Coverage (v2.4.0)
The `_deep.html` bundle harness must report `DEEP PASS` with zero failures, including: boon stacks capped, modifier stacking caps, mastery XP attribution, achievement claim idempotency, ascension cap, reroll cost scaling, the rotating deal, and **wave-clear award idempotency** (an `update()` storm over an emptied horde must not inflate cash or stack flawless streaks).
