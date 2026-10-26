# DEAD ZONE v1.1.0 — DRAFT (unreleased)

Status: **drafted, not tagged, not released.** Everything below is in the working tree /
`draft/v1.1.0` branch. Nothing has been pushed, tagged or published. The released version is
still v1.0.2.

Theme: **more reasons to come back tomorrow, and a reason to keep playing after rank 20.**
v1.0.2 made the progression systems honest; this pass gives three of them something new to say.

---

## 1. New content — the daily board rotates

The daily mission list was the same three missions every single day (60 kills, 3 waves, 2 elites),
so "daily" meant a fixed checklist with a reset timer. It is now a **draw of three from five
templates**, seeded by the calendar date:

| Template | Base target | Per 6 ranks | Ceiling | Reward |
|---|---|---|---|---|
| Eliminate N Zombies | 60 | +15 | 120 | 150 CR |
| Survive N Waves in any Sector | 3 | +1 | 7 | 200 CR |
| Destroy N Elite Enemies | 2 | +1 | 6 | 250 CR |
| **Bring down N Bosses** (new) | 1 | +1 | 3 | 300 CR |
| **Collect N Power-ups** (new) | 3 | +1 | 7 | 220 CR |

- The draw is **deterministic for a day**: the same date produces the same board on every device,
  and reopening the tab cannot re-roll a hard mission away. Tomorrow draws a different set.
- Targets **scale with account rank** (one step per six ranks) and are capped per template, so the
  board stays meaningful at rank 30 without becoming a chore.
- The two new types are wired to real gameplay events, not to a counter nobody moves: a boss dying
  and a power-up being picked up. The audit fails the build if a template has no caller — the check
  added in v1.0.2 is what guarantees this.

## 2. New content — two weapons

Appended to the arsenal, never inserted (a weapon's index is written into `SV.own`, `SV.start`,
`SV.mast` and every skin's `wi`, so inserting would re-point saved progress at a different gun).

| Weapon | Tier | Rank | Damage | Fire rate | Mag / reload | Cost | Character |
|---|---|---|---|---|---|---|---|
| **Volt Carbine** | RARE | 21 | 26 | 0.14 s | 26 / 1.4 s | 1,150 CR | Pierces 2 targets per round — the crowd answer the tier lacked |
| **Siegebreaker** | LEGENDARY | 24 | 190 | 0.85 s | 4 / 2.3 s | 4,400 CR | Biggest blast in the arsenal (140 px), slowest cycle |

Both sit inside their tier's policy band (sustained DPS 134 and 133), so they cannot accidentally
out-class the tier above them. They render through the existing archetype pipeline (energy / rocket),
so no new art path was added.

## 3. New content — three achievements

| Achievement | Goal | Reward |
|---|---|---|
| DAILY DEVOTEE | Claim 7 login rewards | 450 CR |
| BOUNTY BOARD | Complete 25 daily missions | 650 CR |
| HEAVY METAL | Own 3 legendary weapons | 800 CR |

The achievement grid now holds 17 goals, up from 14. BOUNTY BOARD uses a new lifetime counter
(`SV.dmDone`) that only a real claim increments — a repeat click on a claimed mission cannot move it.

## 4. Fix — the comment that documented the bug

`engine_data.js` still described the arsenal as "weapons are no longer bought: each unlocks
automatically once the account reaches its rank" — the exact behaviour v1.0.2 removed. The code and
the comment agreed with each other and both were wrong once the shop returned. The comment now states
what `WEAP_RANK` actually is (the rank that *allows a purchase*) and where ownership really lives.

## 5. Test tooling added

- **Audit** (30 checks, was 27): `WEAP_RANK` must be a same-length array of sane integers (a short
  table makes the top of the shop silently unbuyable — `lvl >= undefined` is false for everything);
  the achievement table must be well formed with unique ids and positive goals; the daily pool must
  have at least three distinct, titled templates.
- **Logic tests** (72 assertions, was 59): two months of board draws checked for shape, type
  uniqueness, reachability of all five templates, target scaling and the per-template ceiling;
  `dmDone` counts a claim once and not twice; the boss/pickup types advance only their own mission.
- **Browser harness** (228 assertions, was 213): the drawn board is validated as rendered, the same
  day is proved to redraw identically, and both new mission types are driven through their **real
  gameplay entry points** (a boss really dying, a power-up really being picked up). The two new
  weapons are bought through the real shop DOM at their rank gate, and the Volt Carbine's piercing is
  proved by firing one round into two lined-up targets.

## 6. Verification

- `npm test` → build clean, audit **30 checks / 0 warnings**, logic **72 assertions**.
- Browser harness against the built v1.1.0 bundle: **228 assertions, 0 failures, 0 console errors**.
- Perf, A/B measured rather than assumed: the new tests were run against the *old* product code
  (10 failures — every new assertion detects the new content, so none of them is vacuous) and the
  perf figures were **worse** on that side (4.83 gradient objects/frame, 45.9 ms/frame) than with the
  draft in place (3.44 / 42.8). The draw path is untouched by this diff; the spread is session state.
  Harness perf numbers are not device numbers.
- Not run: no device/emulator build, no real-device touch testing, no soak test. The APK has not been
  built for this draft at all.

## 7. Compatibility

- **Saves**: no field is renamed or removed. `SV.dmDone` is new and defaults to 0; `own`/`start`/`mast`
  indices are untouched because the weapons were appended. An existing board for today is kept as-is —
  the rotation only applies when the day changes or the board is empty.
- **Balance**: the two new guns sit above the current best in their tier by design (Volt Carbine is the
  top RARE at rank 21, Siegebreaker the top LEGENDARY at rank 24). Nothing existing was re-tuned.
- **Progression**: no rank, cost or unlock rule for an existing weapon changed.

## 8. Open questions for review (not decided here)

1. **Rank gates**: 21 and 24 assume the level cap stays at 30. If you want them reachable sooner,
   18 and 22 would put both inside the current top-tier band.
2. **Siegebreaker price** (4,400 CR) makes it the most expensive item in the game. Fine if the top of
   the arsenal is meant to be aspirational; lower it if you want it seen more often.
3. **Board size**: three of five templates is a deliberate choice (a longer board turns dailies into a
   checklist again). Four of five is the alternative if the list feels thin.
4. **Deferred, not built** — candidates for the next pass, listed so they are not silently forgotten:
   an 8th sector (needs a new prop pass, not just a palette row), a prestige/ascension rework,
   a new enemy archetype, and the F10 keystore rotation decision.

## 9. Before this can ship

- [ ] Your call on §8.1–§8.3.
- [ ] Bump/confirm the version (currently set to 1.1.0 in `package.json`, `build.gradle` code 4,
      `GAME_VERSION`, the lobby tagline and the module headers).
- [ ] Move §1–§5 into `dead-zone-analysis.md` / `AGENTS.md` as the release note (v1.0.2 entries are
      the current format).
- [ ] Tag `v1.1.0` and push — that is what triggers the signed APK build and the GitHub release.
