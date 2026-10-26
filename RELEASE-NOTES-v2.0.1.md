# DEAD ZONE v2.0.1

The four issues reported after v1.1.0 — a relics screen that read as frozen, a skins screen full of
items that could never unlock, a brute boss you could not hear, and a boon draft that covered the boss
death — plus a pass of micro-details, animation and transition work across the lobby, the boss fight
and the arena.

## Fixes

- **The RELICS screen never refreshed itself.** Buying or equipping a relic wrote the change and
  refreshed the header, but not the panel, so the cards and the "Equipped 0/2" counter kept showing the
  state from before the click. The tab re-renders itself in place now, the counter names what is
  equipped ("Equipped 2/2 • Vampire Fang + Storm Crown"), a third equip says **SLOTS FULL — unequip a
  relic first** instead of silently doing nothing, and buying or equipping plays a sound. Relics are
  still earned (boss drops) or bought — none of them ships unlocked: the save template has always been
  `ar: []`, `eq: []`.
- **Ten gun skins could never unlock.** Toxic Shotgun, Neon Plasma, Dragon Flamer, Cyber Juggernaut,
  Hazmat Scout, Desert Infantry, Arctic Commando, Stealth SMG and Ghost Spec-Ops each advertised a
  condition in their card text, but had no unlock rule and no reward that granted them — so the Skins
  tab read as permanently locked no matter what you played. They are real goals now, read from progress
  the game already recorded: reach wave *N* in a named sector, own a Spec-Ops operative, or clear wave 6
  in all seven sectors. Existing progress counts immediately.
- **The brute boss had no sound of its own.** Every boss phase break played the same flat 130 Hz
  sawtooth, and the BRUTE's slam and charge telegraph were both under 100 Hz — inaudible on a phone
  speaker. Each boss now has its own layered break cue built above the speaker floor, the BRUTE slam
  and charge have their own hits with a low-end body, and a boss arriving now announces itself and
  roars instead of walking out of the dark in silence.
- **The boon draft opened before you could see the boss die.** The draft and the corpse animation
  arrived on the same frame: `update()` stops when the wave ends, so the death froze mid-collapse and a
  full-screen draft was already on top of it. A boss kill now holds the draft for a 1.2 second beat —
  the world slips into slow motion, the corpse finishes falling in view, and only then does the draft
  open. The next wave still cannot start early, because the wave countdown is held for the same beat
  and resumes at its usual length once you have picked.

## Micro-details, animation and transitions

- **The BRUTE has its own sprite.** It used to be drawn with the tank art under a different name, so
  the boss banner and the sector cards named a silhouette that did not exist. It is a hunched butcher
  now: spined back plates, exposed rib work, one overgrown cleaver arm that swings with the stride, an
  iron jaw cage and amber eyes set deep under a brow — plus an open wound once it is hurt.
- Boss deaths get a slow-motion beat and a shake, so the kill that ends a wave reads as an event.
- Tab switches in the hub, relic purchases and relic equips all have their own sound; the hub used to
  change screens in silence.
- Death animations keep running through the between-wave beat, so a corpse always finishes falling.

## Under the hood

- New logic checks (8): every skin must have an unlock path — either a rule or a reward that grants it
  — every rule must have a goal, and the sector/class helpers must read the real progress record. A
  skin that cannot be unlocked now fails the build instead of shipping.
- The between-wave beat gained an explicit draft-delay timer (`DRAFT_DELAY_T`) that is reset with the
  wave state, so the delay can never outlive a return to the lobby.
- The browser harness now strips equipped relics before it starts a run. `applySV()` re-applies relic
  effects at run start, so a save with Storm Crown (lightning), Ember Core (immolation) or one of the
  auras equipped changed the numbers the run tests measure — the Immolation geometry assertions failed
  for anyone who owned one, on unchanged game code. A green suite no longer depends on the tester's own
  save; the relics are handed back at the end of the pass.
- Version bump in all three places the audit checks, and `versionCode 5` so this installs over v1.1.0.

## Install / update

- **Already playing v1.0.x or v1.1.0:** download `dead-zone-v2.0.1.apk` below and install it over your
  current copy. Your save, purchases and progress are preserved — this release keeps the same signing
  identity as v1.0.0–v1.1.0, so it updates in place.
- **New player:** download `dead-zone-v2.0.1.apk`, allow installation from this source when Android
  asks, and open it.
- Requires Android 5.1 (API 22) or newer. Fully offline — no account, no network.
- `dead-zone-v2.0.1-source.zip` is the complete source of this tag.

## Verification

- Build: `BUILD COMPLETE SUCCESSFULLY`, then audit **31 checks**, logic **83 assertions**, browser
  harness **231 assertions** — all passing, zero captured console errors.
- Targeted browser probe: relic buy → equip → slot limit → counter recovery, all six sector skins plus
  the class and all-sectors skins unlocking (and unlocking nothing on a fresh profile), the brute
  sprite differing from the tank, and the boss-death beat (no draft on the kill frame, draft still
  held 400 ms later, death animation advancing, next wave not started, draft opening after the beat).
- The APK is built and signed by CI from the `v2.0.1` tag with the existing release key, then verified
  with `apksigner` (v1 + v2 + v3 schemes) before it is published.
- Package: `com.deadzone.game`, version code 5, version name 2.0.1, minSdk 22, targetSdk 34.

Known cosmetic issue, carried over from v1.0.x and not a regression here: while a boss-wave banner is
on screen, its title can print over the boss health bar on short landscape screens.
