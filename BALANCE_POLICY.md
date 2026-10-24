# DEAD ZONE — GAME BALANCE POLICY & DESIGN STANDARD

This document establishes the mandatory balance, scaling, and architectural standards for **Dead Zone**. All future weapons, enemies, upgrades, and system modifications must comply with the rules outlined below.

---

## 1. Core Balance Philosophy

Dead Zone is a tactical top-down action-survival roguelite. Progression must feel:
- **Fair and deliberate in the early game**: Starter loadouts can overcome threats through movement, aim, and spatial awareness; enemies are never bullet sponges, and players never die from unavoidable RNG bursts.
- **Strategic in the mid-game**: Builds branch into clear specializations (e.g., high-penetration ballistic, area incendiary, crowd-control cryogenic, chained electrical, or precision burst).
- **Spectacular in the late game**: Powerful synergistic builds clear dense hordes with satisfying visual punch, while enemies maintain counterplay through complementary attack types, armor, and telegraphed hazards.

---

## 2. The 15 Mandatory Balance Rules

### Rule 1 — Data-Driven Centralized Balance
All weapon stats, enemy stats, perk values, upgrade prices, spawn rates, and difficulty modifiers must reside in centralized data structures (`WEAP`, `ZT`, `PKS`, `U`, `AR`, `MP`). Avoid magic numbers scattered throughout the game loop.

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
- Stacking percentage modifiers (e.g. damage, fire rate) must calculate from base values additively (`1 + sum(bonuses)`) rather than compounding multiplicatively (`base * (1+a) * (1+b) * (1+c)`).
- Critical chance is hard-capped at **75%**.
- Movement speed bonuses have diminishing returns beyond `+60%`.
- Damage reduction (armor) is hard-capped at **65%** to prevent complete invulnerability.
- Cooldown reduction is hard-capped at **50%** to prevent infinite skill spamming.

### Rule 5 — Difficulty Must Be Earned, Not Inflated
Wave difficulty escalates through **tactical composition** rather than infinite HP pools:
- Mix fast flankers (Runners, Stalkers) with ranged pressure (Spitters) and durable anchors (Tanks, Chargers).
- Elite enemies gain tactical behaviors (auras, faster repositioning, explosive death reactions) rather than simple 10x health bloat.
- Sector environmental hazards (lava, poison pools, laser gates) must be readable and avoidable.

### Rule 6 — Reward Rarity & Economy Integrity
The game features two strictly separated currencies:
1. **Run Cash (`S.cash`)**: Temporary currency earned during deployment, spent at between-wave supply caches on temporary weapon acquisitions, repairs, and combat consumables. At the end of a run, unspent cash converts into permanent credits at a fixed, transparent settlement rate (50%).
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
- **Dual Pistols (350 cr)**: High mobility run-and-gun skirmisher, alternating dual fire.
- **Revolver (400 cr)**: Heavy kinetic stopping power, high single-target stagger, deliberate cadence.
- **Shotgun (500 cr)**: Devastating point-blank burst (8 pellets), rapid falloff beyond mid-range.
- **Rifle (700 cr)**: Disciplined mid-to-long range battle rifle with moderate recoil.
- **Burst Rifle (850 cr)**: Precision 3-round burst, lethal at mid-to-long range.
- **Assault (900 cr)**: Versatile full-auto combat weapon with predictable recoil.
- **Sniper (1200 cr)**: High-caliber precision rifle, pierces 3 targets, severe hipfire penalty while sprinting.
- **Minigun (1500 cr)**: Heavy rotary cannon, immense sustained suppression, -22% movement speed while firing.
- **Flamer (1800 cr)**: Dedicated short-range conical stream, intense point-blank billow, burn damage-over-time.
- **Plasma (2500 cr)**: High-energy piercing spheres with ionized splash radius.
- **GL-40 (2800 cr)**: Bouncing 40mm explosive canisters, high tactical crowd clearance.
- **Rocket Launcher (3000 cr)**: Massive explosive warhead, 175 direct damage + 115 splash radius.
- **Cryo Blaster (3400 cr)**: Cryogenic shards slowing enemies by 55%, defensive utility over raw DPS.
- **Tesla (3500 cr)**: High-voltage arc generator chaining through up to 4 targets with falloff.
- **Arc Shotgun (3800 cr)**: Electrified heavy buckshot chaining miniature lightning arcs to adjacent targets.
- **Heavy Railgun (4200 cr)**: Pure electromagnetic kinetic beam piercing up to 10 targets, high commitment.

---

## 3. Mandatory Operational & Live-Service Rules

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

## 4. Pre-Update Verification Checklist

Before any update is committed or deployed, verify:
- [ ] Automated syntax and simulation tests pass with exit code 0.
- [ ] Centralized damage/death pipeline prevents immortal enemies with NaN health.
- [ ] Flamer reach is restricted to a short-range cone stream (~140px max) with visible muzzle flare.
- [ ] No firearm bullets visually morph into rockets or other projectile types.
- [ ] Events mode is strictly isolated to the Events lobby tab and never bleeds into normal runs.
- [ ] Event rewards and daily missions cannot be claimed twice.
- [ ] 10-day login track preserves progress across app restarts and does not reset on missed days.
- [ ] Save migration from previous versions preserves all player credits and unlocks without reset.
- [ ] Frame rate on mobile maintains steady 60 FPS without memory leaks or unbounded arrays.
- [ ] Android landscape and sticky immersive fullscreen remain locked.
