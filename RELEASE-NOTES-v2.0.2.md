# DEAD ZONE v2.0.2

Economy, difficulty and late-game stability. This update fixes a currency bug that could cost a
long run most of its earnings, and it rebalances the three things that made deep runs feel wrong:
uncontrolled spawning, passive skills that played the game for you, and bosses that took longer to
kill the further you got.

**Your existing save, weapons, skills, relics, skins and progress are untouched.**

---

## 1. Currency: a long run no longer loses what it earned

**Reported:** about 30 minutes of play, Wave 35 reached, roughly 50,000 collected — but the lobby
balance only went up by about 30,000.

**Root cause.** The game banks your cash to the lobby while you are still playing. Every time the app
is backgrounded, the screen is locked, the phone call arrives or the page is hidden, an autosave
banks the run counter. The banking function then latched a "already banked" flag and refused to run
again for the rest of the run — so the run only ever paid out the amount that happened to be on the
counter at the *first* interruption, and everything earned afterwards was silently dropped. The
death screen kept promising the full figure, which is why the number in the lobby looked wrong
rather than merely small.

**Fixed.**

- Banking is now incremental: it credits the difference between the run counter and what has already
  been banked, and it is safe to call any number of times. Nothing is lost and nothing is paid twice.
- Repeated death/game-over settlement callbacks cannot pay a run out twice.
- In-run spending (the reroll button) is still not refunded.
- The run's lifetime stats (runs, kills, waves, sector record, ascension progress) now settle from
  the *end* of the run instead of from whatever state the first backgrounding caught.
- The lobby balance updates immediately after settlement, and a reload reads back the same number.

**Balance note:** the 50,000 was the run counter, and it is banked 1:1 — the intended rule, now
actually enforced. This update does not inflate the economy and does not touch shop prices.

## 2. Wave scaling: dense, not flooded

**Reported:** by Wave 30-35 the arena was an overwhelming wall of zombies, with continuous phone
vibration and heavy battery/CPU use.

**Root causes.** Three separate multipliers stacked: a per-wave body count of `6 + wave x 4` (146
bodies by Wave 35), a spawn interval that bottomed out at 0.15s (about 7 bodies a second, refilling
the arena instantly), and a hard-coded "55 alive" check that every summoner bypassed — including one
summon queue that had no check at all.

**Fixed.**

- One spawn ceiling for the whole game (`maxAlive()`): 22 alive early, ramping to a hard 34. Every
  spawner, summon and necromancer brood now respects it.
- Spawn pacing has a 0.30s floor instead of 0.15s, so late waves stay dense but breathe.
- Per-wave body count grows more slowly (`6 + wave x 3`).
- A scheduled boss can never be parked behind a wall of trash.
- Dead enemies, projectiles, particles and summons are still cleaned up every frame.

## 3. Passive damage: useful, no longer a substitute for playing

**Reported:** the player stood still and zombies died on their own; a lightning skill appeared to
kill continuously without input.

**Root cause.** Every automatic source — sky lightning, orbiting blades, homing missiles, auras,
soul blasts, meteor rain, shadow step — read the same damage multiplier as your gun. That multiplier
compounds with every damage upgrade, so by Wave 30-35 the passives alone out-damaged the weapon and
the arena cleared itself.

**Fixed.**

- Automatic damage sources scale with a damped, capped multiplier (`pdmg()`): they still improve
  with every damage upgrade, at half the rate, capped at +200%.
- Your guns keep the full multiplier — a damage build still hits exactly as hard as before.
- Chain lightning is unchanged in shape (max 4 jumps, 45% falloff, no recursion) and cannot loop.
- No skill or relic can stack past its intended limit.

## 4. Bosses: a damage check, not a health sponge

**Reported:** bosses, especially late ones, took an unusually long time to kill.

**Root cause.** Bosses rode the same health curve as the horde, which is exponential by design, so a
Wave 35 boss reached roughly 57,000 HP — around 86x a Wave 35 walker — while a stacked build was
deleting that walker on contact. The fight got longer with depth instead of harder.

**Fixed.**

- Boss health now uses a compressed curve. Time-to-kill stays roughly constant across the run
  (~25-35s of sustained fire from the weapon and damage level a build has at that wave) instead of
  growing with depth. Wave 35: about 21,600 HP instead of 57,000.
- Ordinary and elite enemy durability is unchanged. Elite affixes, phase breaks, boss variants and
  the wave-5/10/15/... schedule are all unchanged.

## 5. Late-game performance and the "constant vibration"

**Reported:** continuous vibration at high waves.

**Root cause.** Nothing in the game calls the vibrator (there is no vibration permission in the
manifest and no vibration call anywhere in the code). What the player felt was the speaker: every
sound was a raw oscillator with no ceiling, no limiter and no repeat filtering, so a late wave
stacked dozens of low-frequency voices straight onto the audio output and clipped into a continuous
buzz. The same frames were also building a fresh 24,000-sample random noise buffer for every
explosion.

**Fixed.**

- All sound runs through one limiter bus, with a concurrent-voice ceiling.
- Repeats of the same cue inside a single frame collapse into one hit instead of stacking.
- Boss roars, phase breaks, player hits and level-ups are marked critical and are never dropped or
  collapsed.
- The white-noise buffer is generated once and reused.
- Measured in the same headless browser, a late-wave cue rate now costs about 0.7 ms/frame instead
  of 2.3-2.5 ms/frame, with at most 14 voices sounding at once.
- Haptics: no vibration API is used by the game, so there is no haptic feedback to throttle — the
  buzz was audio, and it is gone. If a future build adds vibration, it must go through the same
  capped path.

## 6. Economy: deep runs pay better

A Wave 35 walker has about 11x the health of a Wave 1 walker and paid exactly the same, so the
hardest waves of a long run were the least rewarding per minute. Kill payouts now carry a depth
bonus of up to +50% (reached around Wave 33). It applies to kills only: shop prices, upgrade costs,
relic prices and the wave-clear award are unchanged, and the early game pays exactly what it did.

---

## Install / update

- **Already playing any previous version:** download `dead-zone-v2.0.2.apk` below and install it over
  your existing copy. Saves, credits, weapons, relics, skins and progress are preserved.
- **New player:** download `dead-zone-v2.0.2.apk` and allow installation from this source when
  Android asks.
- `dead-zone-v2.0.2-source.zip` is the complete source of this tag.

## Verified

- `npm test` — build, 31 audit checks, 106 logic assertions: all pass.
- Browser regression harness — 247 assertions, 0 failures, 0 runtime errors, including new coverage
  for mid-run banking, double settlement, save/reload, the Wave 35 spawn ceiling, boss time-to-kill
  and the audio voice ceiling.
- Package: `com.deadzone.game`, version code 6, version name 2.0.2, minSdk 22, targetSdk 34.
- Signed by CI from the `v2.0.2` tag with the existing release key (same signing identity as
  v1.0.0 - v2.0.1, so it installs over any previous version).

*Release notes written by Lemon Code, an AI agent, on behalf of the project owner.*
