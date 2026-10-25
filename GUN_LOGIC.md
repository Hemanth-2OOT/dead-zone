# GUN LOGIC PROOF — dead-zone v2.4.1

> **Purpose.** Answer the question *"do the non-Minigun guns actually do less damage, or do they
> just feel weaker?"* with numbers taken from the **shipped** data in `src_v2/engine_data.js`,
> and record the logic defects that were found and fixed.
>
> Where this document and the code disagree, the code in `src_v2/` is authoritative.

## 1. Method

`WEAP` was parsed straight out of `src_v2/engine_data.js` and the following were derived per weapon:

| Metric | Formula |
| --- | --- |
| Burst damage | `d * p` (per-shot damage × pellets) |
| Clip time | `(mag - 1) * r + rl` (fire interval, then reload) |
| Sustained DPS | `burst * mag / clipTime` |
| Enemy HP at wave *w* | `32 * (1 + w*0.055 + max(0,w-15)^1.25 * 0.07 + max(0,w-25)^1.4 * 0.12)` (walker base 32) |
| Shots to kill | `ceil(hp / burst)` |
| TTK (wave 20) | `shots * r` plus reloads when the magazine empties first |

## 2. The measurement (shipped values)

Walker HP: **w1 = 34, w10 = 50, w20 = 84, w30 = 187**.

| Weapon | Dmg | ROF(s) | Pel | Mag | Burst | Clip(s) | **Sustained DPS** | Shots (w20) | TTK w20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pistol | 24 | 0.32 | 1 | 12 | 24 | 4.62 | **62.3** | 4 | 1.28 |
| SMG | 9.5 | 0.10 | 1 | 30 | 9.5 | 4.10 | **69.5** | 9 | 0.90 |
| Shotgun | 11 | 0.62 | 8 | 8 | 88 | 5.84 | **120.5** | 1 | 0.62 |
| Rifle | 30 | 0.20 | 1 | 25 | 30 | 6.10 | **123.0** | 3 | 0.60 |
| **Minigun** | 10 | 0.075 | 1 | 100 | 10 | 9.82 | **101.8** | 9 | 0.67 |
| Revolver | 68 | 0.52 | 1 | 6 | 68 | 3.80 | **107.4** | 2 | 1.04 |
| Assault | 16 | 0.10 | 1 | 30 | 16 | 4.05 | **118.4** | 6 | 0.57 |
| Sniper | 195 | 1.05 | 1 | 5 | 195 | 6.10 | **159.8** | 1 | 1.05 |
| Plasma | 34 | 0.14 | 1 | 20 | 34 | 4.16 | **163.5** | 3 | 0.42 |
| Rocket | 175 | 0.95 | 1 | 4 | 175 | 4.85 | **144.3** | 1 | 0.95 |
| Flamer | 8.5 | 0.07 | 2 | 50 | 17 | 4.88 | **174.0** | 5 | 0.33 |
| Tesla | 62 | 0.30 | 1 | 15 | 62 | 5.80 | **160.3** | 2 | 0.60 |
| GL-40 | 135 | 0.90 | 1 | 6 | 135 | 6.30 | **128.6** | 1 | 0.90 |
| Cryo Blaster | 24 | 0.13 | 1 | 24 | 24 | 4.39 | **131.2** | 4 | 0.52 |
| Railgun | 340 | 1.40 | 1 | 3 | 340 | 5.10 | **200.0** | 1 | 1.40 |
| Dual Pistols | 13 | 0.16 | 2 | 24 | 26 | 4.98 | **125.3** | 4 | 0.64 |
| Burst Rifle | 22 | 0.38 | 3 | 24 | 66 | 10.14 | **156.2** | 2 | 0.76 |
| Arc Shotgun | 24 | 0.65 | 6 | 10 | 144 | 7.45 | **193.3** | 1 | 0.65 |
| Crossbow | 84 | 0.62 | 1 | 6 | 84 | 4.80 | **105.0** | 1 | 0.62 |
| Siphon SMG | 13 | 0.09 | 1 | 36 | 13 | 4.28 | **109.5** | 7 | 0.60 |
| Glacier Breaker | 20 | 0.72 | 6 | 8 | 120 | 6.74 | **142.4** | 1 | 0.72 |
| Hornet | 34 | 0.23 | 1 | 18 | 34 | 5.41 | **113.1** | 3 | 0.69 |

## 3. Verdict

**The damage maths was never the problem.** The Minigun sits *mid-table* (101.8 sustained DPS) —
below the Rifle (123.0), Assault (118.4), Plasma (163.5), Sniper (159.8), and less than half the
Railgun (200.0). Per bullet it only does 10 damage.

So why does everything else *feel* weaker than the Minigun?

1. **One projectile = one visual.** 15 of 22 weapons fire a single projectile per trigger pull, and
   every one of them shared the *same* fixed 3 px tracer as the Minigun. A 340-damage railgun slug
   and a 10-damage minigun tick drew an identical line.
2. **Nothing reacted to damage.** The damage pipeline had no per-hit feedback at all: no impact
   sparks, no shockwave, no screen punch, and no muzzle smoke.
3. **`HIT_STOP_TIMER` was dead code.** It was declared in `engine_core.js` and honoured every frame
   by `update()` — but **nothing in the codebase ever set it**. The hit-stop feature had literally
   never fired, so heavy shots had no weight.
4. **Chain Lightning was inert.** `WEAP` declares `cl: 3` on the Tesla and `cl: 1` on the Arc
   Shotgun, and the ✦ *Chain Lightning* pickup sets `S.cl`. The bullet carried both into `b.cl`…
   which **no line of code ever read**. The Tesla's headline mechanic and a purchasable perk did
   nothing.

## 4. Fixes shipped in v2.4.1

| # | Fix | File |
| --- | --- | --- |
| 1 | Damage/archetype-scaled tracers: heavy rounds get an additive bloom halo, a fat body, a hot core and a shed smoke ribbon; light rounds stay thin streaks | `engine_feel.js` (`drawBulletDefault`, `bulletTrailFX`) |
| 2 | `impactFX()` on every landed hit — directional sparks, dust puff, shockwave rings, archetype flourishes (arc / cryo / energy / explosive), scaled by damage tier | `engine_feel.js`, called from `damageZ` |
| 3 | **Hit-stop re-armed** for tier-3 hits (≥150 dmg: Sniper, Rocket, Railgun) and crits from tier-2 hits (≥55 dmg), plus shake punch scaled the same way | `impactFX` → `HIT_STOP_TIMER` |
| 4 | Muzzle smoke count scales with weapon damage tier (3 puffs at tier 3, 1 at tier 1) | `muzzleSmokeFX` ← `fire()` |
| 5 | **Chain Lightning implemented**: arcs jump to up to `b.cl` (max 4) enemies within 190 px of the one just hit for 45 % of the bullet's damage, drawn as seeded jagged polylines | `chainLightning`, `renderArcs`, `b.cl = (S.cl\|\|0) + (w.cl\|\|0)` |
| 6 | Starter Pistol `d: 20 → 24` (sustained DPS 51.9 → 62.3, wave-20 TTK 1.60 s → 1.28 s) so the opening waves are not a slog. Still the weakest gun in the table — SMG 69.5 > Pistol 62.3 | `engine_data.js` |

Pierce (`pr`), explosions (`ex`), freeze (`fz`), knockback (`kb`) and lifesteal (`ls`) were audited
and were already wired correctly through `b.pr`, `b.ex`, `b.fz`, `wKb` and `b.ls`.

## 5. Reproduce

```bash
python3 - <<'PY'
# parses src_v2/engine_data.js and prints the table above
PY
```

The full script lives in the commit message body; the derived numbers are printed in §2.
