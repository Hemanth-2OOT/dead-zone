# DEAD ZONE v1.1.0

Rotating daily missions, two new weapons and three new achievements — plus the fixes the update was
reported for and a round of release-hardening. Everything in this release was validated before it was
tagged; the full audit is in `RELEASE-v1.1.0-VALIDATION.md`.

## New content

- **Daily missions rotate.** The day's board is now drawn from a wider pool, so a fresh set of targets
  can include enemies, events and objectives you did not see yesterday instead of the same fixed list.
  A board you are already working on is kept as-is; the rotation applies on a day change.
- **Two new weapons.** The **Volt Carbine** and the **Siegebreaker** join the arsenal, with their own
  rank gates, prices, art, muzzle behaviour and tracer colours, and their own turntable entry in the
  skins screen.
- **Three new achievements**, each backed by a stat the run actually banks, so they earn and persist.

## Fixes

- **Shop weapon preview.** A card in the lobby shop drew no gun on it. Every card now renders the
  weapon's own turntable art in a reserved preview box, so you can see what you are buying. This is the
  bug the update was reported for.
- **The two new guns fired from the wrong place.** Their muzzle offset and tracer colour were missing
  from the per-weapon tables, so they fired from a generic point about 20 px short of the barrel and
  drew an undefined colour. Both tables are complete now, with a fallback so a missing entry degrades
  instead of breaking.
- **Daily board safety.** The rank tier is clamped, so a negative or non-numeric rank can no longer
  draw a target below the template's base value.

## Under the hood

- New audit check: every per-weapon table must cover the whole arsenal with no holes, so adding a
  weapon can no longer leave firing data behind.
- New logic check: every achievement counter must name a field the game actually writes.
- Two non-deterministic regression assertions were made deterministic — a green harness run now means
  the product is green, not that the reroll went your way.
- Repository safeguards: keystores, `.jks`/`.p12` files and real `keystore.properties` can no longer be
  committed by accident; the `.example` template stays in the tree.

## Install / update

- **Already playing v1.0.x:** download `dead-zone-v1.1.0.apk` below and install it over your current
  copy. Your save, purchases and progress are preserved — this release uses the same signing identity
  as v1.0.0–v1.0.2, so it updates in place.
- **New player:** download `dead-zone-v1.1.0.apk`, allow installation from this source when Android
  asks, and open it.
- Requires Android 5.1 (API 22) or newer. Fully offline — no account, no network.
- `dead-zone-v1.1.0-source.zip` is the complete source of this tag.

## Verification

- Build: `BUILD COMPLETE SUCCESSFULLY`, then audit **31 checks**, logic **75 assertions**, browser
  harness **231 assertions** — all passing, zero captured console errors.
- The APK is built and signed by CI from the `v1.1.0` tag with the existing release key, then verified
  with `apksigner` (v1 + v2 + v3 schemes) before it is published.
- Package: `com.deadzone.game`, version code 4, version name 1.1.0, minSdk 22, targetSdk 34.

Known cosmetic issue, carried over from v1.0.x and not a regression here: while a boss-wave banner is
on screen, its title can print over the boss health bar on short landscape screens. It is documented in
`RELEASE-v1.1.0-VALIDATION.md` §12 with a proposed fix for a later update.
