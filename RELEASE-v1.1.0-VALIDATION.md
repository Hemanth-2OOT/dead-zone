# DEAD ZONE v1.1.0 — release validation (audit pass, not a release)

Scope: verify the existing `draft/v1.1.0` update, fix confirmed defects with the smallest safe change,
and check that the Android release and future updates are not put at risk. No new gameplay was added.
**Nothing was committed, tagged, pushed, merged or published by this pass**, and the application
identity and signing material were left untouched.

Everything below is measured on the working tree described in §1. The code changes are uncommitted on
purpose, so they can be reviewed as a diff before you decide to ship.

---

## 1. Repository state

| Item | Value |
|---|---|
| Branch under review | `draft/v1.1.0` (local only, no upstream, no tag) |
| Draft commit | `73db392` — "Draft v1.1.0: rotating daily missions, two weapons, three achievements" |
| Released branch | `main` = `91b7d09` (tag `v1.0.2`), identical to `origin/main` |
| Remote branches | `main` only. The draft has never been pushed. |
| Tags | `v1.0.0`, `v1.0.1`, `v1.0.2` (all released). No `v1.1.0` tag. |
| Working tree | 12 modified files, +310 / −20 lines, plus untracked `GAME-SUMMARY.md` and `RELEASE-v1.1.0-VALIDATION.md` |
| Local-only worktree | `.agent_tmp/baseline` (detached build used for A/B comparison) |
| Local toolchain | Temurin JDK 17 + Android cmdline-tools / SDK 34 unpacked under `/tmp/tools` for this pass only (not in the repo, not a project change) |

Modified, uncommitted: `src_v2/engine_data.js`, `src_v2/engine_events_missions.js`,
`src_v2/engine_lobby.js`, `src_v2/engine_render_player.js`, `src_v2/engine_world.js`,
`tools/audit.js`, `tools/regression-harness.js`, `tools/test-logic.js`, `www/index.html`,
`package-lock.json` (version field 1.0.0 → 1.1.0, aligned with `package.json`; npm rewrites this on
any install), plus this report's own docs (`RELEASE-v1.1.0-DRAFT.md`, `AGENTS.md`).

The repository matched the expected state (same commit, same branch, same released version), so the
audit continued. No existing work was reset, cleaned or overwritten; a `git stash` used to build a
pre-change baseline was popped again immediately and dropped.

## 2. Audit findings

### Confirmed defects, fixed

1. **The two new guns fired from the wrong place and drew an undefined tracer colour.**
   `WEAP` grew to 24 entries, but the parallel per-weapon tables `ML` (muzzle length) and `WC` (tracer
   colour) still had 22. `ML[22]` / `ML[23]` were `undefined`, so the muzzle flash, smoke and bullet
   spawn point fell back to a generic offset ~20 px short of the barrel, and `WC[22]` / `WC[23]` made
   every tracer from Volt Carbine and Siegebreaker draw in whatever `undefined` composited to.
   Fixed by extending both tables and by a defensive `WC[P.cur] || '#ffe08a'` in `fire()`.

2. **The lobby shop showed no weapon art** (the reported "weapon preview is not working in shop").
   The shop that replaced the retired armory rendered text, stats and a buy button but no gun, so a
   card was a name and a price. Fixed by rendering `gunIcon(i)` into a reserved preview box on every
   card; the sizes are inline because the shop list is rebuilt as an HTML string.

3. **The daily board could draw a target below its own base.** `buildDailyBoard` scaled the target by
   rank tier without a floor, so a negative or non-numeric rank produced a target below the template
   base (and could reach 0, i.e. a mission complete on arrival). Clamped with `Math.max(0, …)`.

4. **Two regression assertions were non-deterministic**, which is how a real failure gets ignored:
   - *Piercing round*: the bullet is stopped by solid props, so whether both test targets were hit
     depended on wherever the preceding sections had left the player. The test now removes props for
     the shot and restores them.
   - *Gradient allocation per frame*: measured during a live battle, the figure tracks how many
     damaged enemies are left standing (3.4–4.4 per frame across runs), so a hard ceiling was a coin
     flip. It now asserts against an idle pass (no enemies, no pending spawns, timed overlays cleared)
     where the base draw path is a stable ~3.0/frame.

### Verified as correct (checked, not changed)

- **Daily missions**: the board is a seeded draw of three of five templates, seeded from the local
  calendar date, stable within a day, re-drawn only on a day change or an empty board; targets scale
  one step per six ranks and stay under the per-template ceiling even at rank 999; both new mission
  types are wired to real events (`bosses` in `damageZ`, `pickups` in `applyPowerup`). The audit fails
  a template that has no caller, so an impossible mission cannot ship silently.
- **New weapons**: Volt Carbine (RARE, rank 21, piercing) and Siegebreaker (LEGENDARY, rank 24) are
  appended, never inserted; `WEAP_RANK`, tier policy, price ladder, shop listing, rank gate, purchase
  and equip paths all agree; they do not unlock automatically; the two guns now have distinct art in
  the armory, the HUD and the shop card.
- **Achievements**: the grid is 17 goals with unique ids and well-formed fields. Every counter reads a
  field the game actually persists — this is now asserted, because `achState()` swallows errors and
  coerces `undefined` to 0, so a counter naming a field that no longer exists would be silently
  unearnable forever rather than failing loudly.
- **Save compatibility**: `sanitizeSV` is permissive about field names and strict about size and
  numeric ranges, so old saves gain the new fields at their defaults and unknown extra keys survive
  only while small. A v1.0.2-shaped profile (22-entry `own[]`) loads, keeps every weapon that was paid
  for, and leaves the two new guns locked; a short or corrupt `own[]` is padded, not trusted.

### Risks and observations

- **The release signing keystore is in public git history and is byte-identical to the keystore in the
  working tree** (`android/app/release.keystore`, md5 `2bf0356e…`, 2668 bytes, also at commit
  `e975ad5`, an ancestor of `main`, on a public repository). Anyone can download it and sign an APK
  that Android will accept as an update to this app. This is pre-existing, not caused by v1.1.0, and
  it is the one item that needs a human decision — rotating the key means existing installs cannot be
  updated in place. The audit's "no signing material is tracked" check only scans the current tree, so
  it cannot see this.
- `GL` (an 8-entry gun-light table in `engine_data.js`) has no consumer at all. Harmless, but the
  dead-code scan only looks at functions, so data tables like this go unflagged.
- The audit verifies versions, arsenal/skin data, secrets, dead code and gameplay wiring; it does not
  run the game. The browser harness does, but only in a desktop Chromium context.

## 3. Changes made

| File | Change |
|---|---|
| `src_v2/engine_data.js` | `ML` and `WC` extended to 24 entries (one per weapon) with a note explaining why they must stay in step with `WEAP` |
| `src_v2/engine_world.js` | `fire()`: tracer colour falls back to `'#ffe08a'` when a weapon has no `WC` entry |
| `src_v2/engine_lobby.js` | Shop card renders a `gunIcon(i)` preview in a reserved box; centred header row; unaffordable price colour no longer clashes |
| `src_v2/engine_render_player.js` | `gun()` gained art for indices 22 (Volt Carbine) and 23 (Siegebreaker) |
| `src_v2/engine_events_missions.js` | `buildDailyBoard` clamps the rank tier at 0 |
| `tools/audit.js` | New check: every per-weapon table (`ML`, `WC`) covers the whole arsenal with no holes |
| `tools/regression-harness.js` | Piercing test isolated from props; PERF section measures the idle draw path; shop preview assertion states what it can and cannot see. **Second pass:** the HUD-layout section now clears the announcer queue before it probes the chrome (see §9.1) and measures the banner/boss-bar lane on its own |
| `tools/test-logic.js` | New section: every achievement counter is backed by a field the game writes, and no achievement is pre-earned on a fresh profile |
| `www/index.html` | Regenerated bundle (`npm run build`); verified byte-identical on rebuild |
| `package-lock.json` | Version field 1.0.0 → 1.1.0, so the lockfile agrees with `package.json`. npm writes this on any install; revert it if you would rather keep the diff to source files |
| `RELEASE-v1.1.0-DRAFT.md`, `AGENTS.md`, this report | Documentation of the two audit passes |

No gameplay, balance, economy, art direction or control change was made, and no fix from the first pass
was reverted. No file was renamed and no data was removed.

## 4. Tests

| Command | Result |
|---|---|
| `npm test` (build → audit → logic) | `--- BUILD COMPLETE SUCCESSFULLY ---`, `AUDIT: ALL CHECKS PASSED (31 checks, 0 warnings)`, `LOGIC TESTS: ALL CHECKS PASSED (75 assertions)` |
| `npm run build` then `npm run harness` | build `--- BUILD COMPLETE SUCCESSFULLY ---`; harness page repacked (787.6 KB). The rebuilt bundle is byte-identical to the reviewed one (md5 `03d5641b…`, 734,314 bytes before and after), so the generated file is a faithful function of the sources |
| Harness in the browser, 3 consecutive runs | `RESULT: ALL CHECKS PASSED (231 assertions)`, `errors captured: 0` in all three, with the same measured numbers (`idle 3.00/frame`, announcer-lane note `818px2`) |
| Harness perf lines | `frame cost :: 42.67 ms/frame`, `gradient objects built per frame (live battle) :: 3.40` |
| New audit check, negative test | With `ML`/`WC` truncated to 22 entries: `FAIL … ML has 22 entries for 24 weapons, WC has 22 entries for 24 weapons`, `AUDIT: 2 FAILURES`; restored → passes |
| New achievements check, mutation test | Renaming a banked stat (`lt.bosses` → `lt.bossCount`) → `FAIL … bo -> lt.bosses`; typo'ing a counter (`l.elitez`) → `FAIL … el -> lt.elitez`; unmodified → passes |
| `git diff` review, incl. the generated bundle | 12 files; the bundle diff contains only the reviewed source changes (`gunIcon`, `'#ffe08a'`, the two new weapons) |
| Android release build + signature | **Run locally with a throwaway key** — `BUILD SUCCESSFUL in 2m 2s`, `apksigner verify` → v1/v2/v3 true. Details in §5 |

Tests deliberately not run: any install, launch, touch-input or soak test on Android hardware or an
emulator (no device attached, no KVM access — §6), a signed build with the real release key (its
passwords exist only as CI secrets and were not read), and CI runs on the draft (it is not pushed, so
CI has not seen it).

## 5. Android build and signing status

Measured this pass. The toolchain is not part of the project: Temurin JDK 17 (`17.0.21+9`) and Android
cmdline-tools / `build-tools;34.0.0` / `platforms;android-34` were unpacked under `/tmp/tools`, the
project was built from the working tree, and `node_modules` was installed with `npm install`.

| Step | Result |
|---|---|
| `npm run build` → `npx cap sync android` | `www/index.html` 734,314 bytes; copied to `android/app/src/main/assets/public/index.html` (byte-identical) |
| `./gradlew assembleRelease` | `BUILD SUCCESSFUL in 2m 2s`, 121 actionable tasks. Artifact: `android/app/build/outputs/apk/release/app-release.apk`, 7,330,284 bytes |
| `apksigner verify --print-certs --verbose` | `Verifies`; v1 (JAR) **true**, v2 **true**, v3 **true**, v3.1 false, v4 false; RSA 2048 |
| `aapt2 dump badging` | `package com.deadzone.game`, `versionCode 4`, `versionName 1.1.0`, `minSdk 22`, `targetSdk 34`, `compileSdk 34`, label `Dead Zone`, `launchable-activity com.deadzone.game.MainActivity`, permissions `INTERNET` + `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (Capacitor default) |

- **Signed with a throwaway key, not the release key.** A local PKCS12 keystore (`CN=Local Build
  Verification`) was generated for this build. The release key's passwords exist only as GitHub secrets
  and were not read, guessed or reused, so this APK is a *build-and-signing-path* verification, not a
  release artifact. The point of the exercise is that the signing config produces exactly the same
  scheme set (v1+v2+v3, no v3.1/v4) as the published releases — see below.
- **The artifact carries the reviewed code**: the APK's `assets/public/index.html` is byte-identical to
  the reviewed `www/index.html` (md5 `03d5641b…`).
- **The first attempt failed and the cause is environmental**: the Gradle daemon (1.5 GB heap from
  `android/gradle.properties`) plus dexing and `lintVital` exceeded this workspace's 4 GiB memory
  cgroup and the daemon was killed (`Gradle build daemon disappeared unexpectedly`). Re-running with
  `-x lintVitalAnalyzeRelease -x lintVitalRelease --max-workers=2 -Dorg.gradle.jvmargs="-Xmx2560m"`
  succeeded. This is a constraint of this sandbox, not a project defect: CI runners have more memory and
  the workflow already runs the same `assembleRelease` successfully.
- **Version metadata is consistent** and enforced by the audit: `package.json` 1.1.0, Gradle
  `versionCode 4` / `versionName "1.1.0"`, `GAME_VERSION = '1.1.0'`.
- **Update path is safe**: `versionCode 4` > the released `3`; `applicationId`/namespace
  `com.deadzone.game` and the app name are unchanged; `android/app/build.gradle` is the *only* file
  that differs from `main` under `android/` and `.github/` (2 lines: the version bump). Existing
  installs upgrade in place and keep their saves.
- **Release pipeline** (`.github/workflows/release.yml`) builds the bundle, runs the logic tests and
  audit, `npx cap sync android`, restores the keystore from `RELEASE_KEYSTORE_BASE64` (and refuses to
  publish if the secret is unset), assembles, verifies the APK with `apksigner`, and only then uploads
  the APK and a source zip taken from the tag. `.github/workflows/build-apk.yml` is the online
  "build a debug APK" path; its artifacts are debug-signed and are not release candidates.
- **The published release identity is one key, used since v1.0.0.** All three release APKs
  (`v1.0.0`, `v1.0.1`, `v1.0.2`) verify with v1+v2+v3 and share one signer:
  `CN=Dead Zone, OU=Games, O=Hemanth, C=IN`, RSA 2048, certificate valid from **2026-10-21 08:47:58Z**
  to 2054-03-08, cert SHA-256 `5F:8A:8B:BC:…:52:E6`, SHA-1 `46:08:CA:…`, MD5 `FC:9C:68:…`, public-key
  SHA-256 `E5:B8:0C:…`. No rotation lineage exists in any published APK.
- **Not verifiable from here**: whether the CI secret `RELEASE_KEYSTORE_BASE64` holds exactly the
  keystore that is exposed in public history (§11). The evidence for and against is in §11; the
  one-command check for you is in §11 step 5.

## 6. Device validation

Completed: desktop-Chromium execution of the real bundle through the browser harness — 231 assertions
covering the shop, missions, weapons, saves, powers, combat feedback, controls and the draw path, with
zero captured console errors; plus a manual pass through the lobby into the shop. A release APK was
built and its signature and package metadata verified (§5).

Not performed, and not claimed: **any run on Android hardware or an emulator**, and therefore no
launch test, no touch-input playtest with the on-screen twin-stick controls, no real-WebView execution,
no performance profile on a phone, no soak/endurance run, and no save-persistence check across a real
app restart (the persistence assertions exercise the same code path in Chromium, not in the Android
WebView).

Why no emulator: `adb devices` reports no attached device, and although `/dev/kvm` exists it is owned
by another group with mode `660` and this workspace's uid cannot open it (`PermissionError: [Errno 13]`),
with no passwordless `sudo` to change that. Without KVM an x86_64 Android system image cannot run, so
the install/launch/smoke test the task asked for is genuinely unavailable here rather than skipped. It
needs a real phone (or a CI job with an emulator runner).

## 7. Save and update compatibility

- No field is renamed or removed; `SV.dmDone` is new and defaults to 0; `SV.dailyMissions` is new and
  seeds on the next board build; weapon indices are append-only, so `SV.own`, `SV.start` and `SV.mast`
  keep pointing at the same guns.
- A v1.0.2 profile loads unchanged, keeps its purchases, and gains the new content at its defaults
  (asserted in the logic tests, including the 22-entry `own[]` case).
- An existing board for today is kept as-is; the rotation only applies on a day change or an empty
  board. The date is the device-local calendar date, so a device timezone change can present a second
  board the same instant-day — accepted behaviour, documented in `AGENTS.md`.
- Unresolved concern: none for saves. The only compatibility risk is the signing key (§5).

## 8. Future maintainability

- **Adding a weapon** now touches `WEAP`, `WEAP_RANK`, `ML`, `WC` and possibly the tier tables; the new
  audit check fails the build if the per-weapon tables fall out of step, and the harness fails if a
  weapon has no distinct art or is missing from the shop. That is the check that was missing and let
  the two v1.1.0 guns ship with mismatched firing data.
- **Adding an achievement** is a table row; the new logic check fails if its counter names a field the
  game does not persist.
- **Bumping a version** means `package.json`, `android/app/build.gradle` and `GAME_VERSION`; the audit
  fails if they disagree. Tagging `v*` is the only release trigger.
- The harness is deterministic now, so a fresh red result means a real regression rather than a reroll.
  Its perf numbers still drift with the state the earlier sections leave behind — compare against a
  baseline build before calling a drift a regression.
- `GL` is dead data; harmless, but a candidate for deletion the next time `engine_data.js` is edited.
- Historical risk worth remembering: signing material once committed stays readable in a public repo
  forever, so "is it tracked?" is not the same question as "is it exposed?".

## 9. Known issues

1. **The release keystore is downloadable from public history** (§11). Unresolved here by design —
   rotating a signing identity is an irreversible decision that is yours to make, not this pass's.
2. **A live announcement banner is drawn over the boss health bar on short landscape screens**
   (`H * 0.2` banner lane vs the bar's 52-HUD-unit lane). Measured deterministically at 640×360 as
   `"WAVE 1" over "BRUTE 5000 / 9000"` with an 818 px² overlap, which is why the harness reported three
   HUD failures in one earlier run and none in the next: the banner's 2.2–2.6 s life straddled the
   probe. **Both lanes are byte-identical to v1.0.2** (`engine_fx.js` and `engine_hud.js` differ from
   `main` only in the version header), so this is pre-existing, not a v1.1.0 regression, and it is
   cosmetic and transient. The harness now probes the chrome with a clear queue and measures this
   separately. A three-line fix is sketched in §12 but **not applied** — moving a HUD lane is a visual
   change and your call.
3. Not device-tested and not soak-tested (§6). This is the largest remaining evidence gap.
4. Five open design questions sit in `RELEASE-v1.1.0-DRAFT.md` §8 (the two rank gates, the Siegebreaker
   price, and the board size) — the update is shippable with the current values, but they are your call.
5. `GL` (8-entry gun-light table) has no consumer, and `package-lock.json` was still on 1.0.0 before
   this pass — two small inconsistencies a later cleanup can absorb.
6. `GAME-SUMMARY.md` is still untracked — commit it, keep it local, or delete it.
7. The harness page must be regenerated (`npm run harness`) after `npm run build`, or a stale bundle
   gets tested. Worth an npm script that chains the two.

## 10. Release recommendation

**READY FOR YOUR APPROVAL** — for the game content and the update itself, with more evidence behind it
than the first pass had.

- The update validates: 31 audit checks, 75 logic assertions and 231 browser assertions pass on the
  working tree, with zero captured console errors, three runs in a row; the two real defects found in
  the new content (mismatched per-weapon tables, and the shop preview the update was reported for) are
  fixed with narrowly scoped changes; daily missions, both new weapons, the three new achievements and
  the v1.0.2 → v1.1.0 save migration all behave as specified.
- The Android side now has measurements, not inference: the release build succeeds from this tree, the
  APK verifies with v1+v2+v3, and its package metadata (`com.deadzone.game`, versionCode 4, versionName
  1.1.0, minSdk 22, targetSdk 34) and bundled web asset are exactly what is expected. What is still
  missing is any run on a real device or emulator (§6) — launch, touch controls and real-WebView save
  persistence remain unverified.
- One decision should be made before tagging: the exposed signing key (§11). Shipping v1.1.0 with the
  current key changes nothing about the exposure; replacing it breaks in-place updates for everyone who
  already installed v1.0.x and orphans those installs until they reinstall. The recommendation in §11 is
  to ship v1.1.0 on the current key, then decide on rotation as its own piece of work with a proper
  distribution plan.

No release action has been taken. When you approve, the next step is a commit on `draft/v1.1.0`, a
merge to `main`, and a `v1.1.0` tag — the tag is what triggers the signed build and the GitHub release.

---

## 11. Signing-key exposure — investigation

Asked for: what exactly is exposed, how the app is distributed, what retaining vs replacing the key
costs, whether a supported upgrade path exists, and the options. No key was rotated, no password was
printed, read or guessed, and no secret left this workspace.

### 11.1 What is exposed

| Item | Finding |
|---|---|
| The file | `android/app/release.keystore` — a **PKCS#12** container (not JKS), 2,668 bytes, md5 `2bf0356ef5bab26c1a68bc0cd087f062` |
| Where | Committed to the **public** repo at `e975ad5`, which is an ancestor of `main`; it was added and removed by later commits but is permanently readable from history (`git show e975ad5:android/app/release.keystore` reproduces the live file byte for byte) |
| Key it holds | Alias `deadzone` (per `keystore.properties.example` and the CI `RELEASE_KEY_ALIAS`), a 2048-bit RSA private key plus its self-signed certificate |
| Also leaked | `android/app/keystore.properties.example` (a placeholder template, no real credential). The keystore is also inside **local, gitignored** release zips on this machine (`dead-zone-v2.6.0.zip`, `v2.9.0.zip`, `v2.9.1.zip`) — those were never uploaded: the only assets on your Releases are `dead-zone-vX.Y.Z.apk` and `dead-zone-vX.Y.Z-source.zip`, and I downloaded the v1.0.2 source zip to check (152 entries, the only "keystore" entry is `android/app/keystore.properties.example`). The tagged trees are clean too — see below |
| Where exactly | The exposure is the **git history**: the keystore was added in `e975ad5` (2026-10-21 14:26:31 +05:30, "build: configure release keystore and enable v1, v2, v3 signing") and removed in `c849a6c` (2026-10-26 02:00:07Z, "harden signing"), which is **before the first tag**, so no release asset ever contained it — but a public `git clone` still carries both blobs. Verified: `git ls-tree -r v1.0.0/v1.0.1/v1.0.2` contain only `keystore.properties.example` |
| **Not** exposed | **No password appears anywhere in the history.** Every blob in every revision was scanned: the only secret-looking strings are the literal placeholders `CHANGE_ME` in the `.example` file. No PEM/PKCS#8 private-key text, no `keystore.properties` with real values, no `.env`. The keystore's password was never read, and an empty-password open is rejected (`Mac verify error: invalid password?`), so the container is genuinely password-protected |
| Exposure surface | Repo is public; GitHub secret scanning is **disabled** on it (the API answers `Secret scanning is disabled on this repository`), so nothing alerts you if the pattern recurs |

So the accurate statement is: **the encrypted private key is public; the password that unlocks it is
not.** That is a much weaker exposure than a leaked `.jks` plus its password — it is a
password-strength problem, not an open door.

### 11.2 Which signing identity may have been exposed

Everything published was signed by one identity, and the exposed keystore is the only keystore in the
project, so the identity at risk is:

```
CN=Dead Zone, OU=Games, O=Hemanth, C=IN      RSA 2048
certificate valid 2026-10-21 08:47:58Z .. 2054-03-08
cert SHA-256  5F:8A:8B:BC:7B:4E:08:F3:CB:4F:B9:F8:AF:D0:A4:D8:9C:C0:64:68:82:DE:3D:57:7C:2B:B2:A6:49:FB:52:E6
cert SHA-1    46:08:CA:72:B7:67:8F:58:CB:01:94:68:03:27:75:AB:68:22:5B:A6
cert MD5      FC:9C:68:2E:97:CA:11:E6:6F:1B:A9:0E:5C:A3:EE:E7
pubkey SHA-256 E5:B8:0C:E9:AE:99:4B:EC:83:73:9D:4A:C2:58:55:16:B4:CA:BF:2D:23:9B:F0:49:41:44:18:38:E7:D0:EC:1D
```

Evidence that the published APKs and the exposed keystore are the same key: (a) all three release APKs
(v1.0.0, v1.0.1, v1.0.2) verify under v1+v2+v3 with exactly this one signer; (b) the exposed keystore's
certificate was issued 2026-10-21 08:47:58Z, eight and a half minutes before `e975ad5` added the
keystore to history (2026-10-21 08:56:31Z); (c) it is the project's only keystore, and `README.md` documents it as *the* release keystore;
(d) the alias matches the CI's `RELEASE_KEY_ALIAS=deadzone` and the certificate fields match the
project owner. What cannot be closed from here is the last link — that the CI secret
`RELEASE_KEYSTORE_BASE64` holds *this* file and not a second, later key. §11.7 is the one-command check.

### 11.3 How the app is distributed

GitHub Releases on the public repo, not Google Play. The APK is a **sideloaded** artifact: users
download `dead-zone-vX.Y.Z.apk`, enable installation from unknown sources, and install it directly.
`.github/workflows/release.yml` builds and signs it, `apksigner`-verifies it, and uploads it with a
source zip only when a `v*` tag is pushed. There is no store, no Play App Signing, no store-managed
rotation, and no distribution channel that can vouch for the signing key — which is what makes the
key itself the only trust anchor. Currently published: v1.0.2 (Latest), v1.0.1, v1.0.0.

### 11.4 Consequences — retain vs replace

Android ties app identity to the signing certificate: an update must be signed by a certificate with the
same identity as the installed app, otherwise the package manager refuses it
(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) and the user must uninstall (losing local saves) and reinstall.

| | RETAIN the current key | REPLACE with a new key |
|---|---|---|
| v1.1.0 update | Installs over v1.0.x, keeps saves. No change for users | Rejected as an update. Every existing install must be uninstalled and reinstalled to move forward |
| Save data | Preserved across the update | **Lost** on uninstall unless the player exports it first (this game stores its save locally) |
| Risk if the password is cracked | Whoever cracks it can sign a malicious "update" that existing users' devices accept — the highest-severity outcome | Exposure is closed: the leaked key can no longer author anything a current install will accept |
| Effort | None | New keystore, new CI secrets, a migration note, and losing the install base until they reinstall |
| Future | Nothing blocks v1.2.0 and later | Same as any new app: the new key becomes the identity from here on |

Note the asymmetry: replacing the key *does not retroactively protect* existing installs — it only
prevents the leaked key from signing something the *new* installs will take. The old key stays able to
impersonate the app to anyone still on a v1.0.x/v1.1.0 build.

### 11.5 Is there a supported upgrade path?

- **Not via this distribution channel.** GitHub Releases has no key management, and there is no store
  to arbitrate. There is nothing to "recover" — the keystore file and its password are both still in
  your possession, so no recovery is needed for the current key.
- **Android's own mechanism is APK Signature Scheme v3.1 (signing-key rotation)**: a new APK can carry
  both the old and the new signer with a proof-of-rotation lineage, letting a *new* key update an
  *old-key* install. Two limits make it a partial answer here: it only upgrades installs running
  **API 28+ / Android 9+**, while this app's `minSdk` is **22** — Android 5.1–8.1 devices (which is what
  minSdk 22 is there to serve) would still need a full reinstall; and the tooling is `apksigner
  rotate`/`--rotation-min-sdk-version` against the *old* key, so **it still requires the old keystore's
  password** — the very secret that is not leaked but is the thing you would be trying to retire.
- **Play App Signing** would have made this a non-event, but the game is not on Play, and moving to Play
  at this point would itself be a new key with the same reinstall consequence.
- **If your plan is to keep sideloading**, the practical durable fix is the same either way: generate a
  *new* key with a strong password, store it only as CI secrets (never in the repo), and treat a future
  reinstall as the migration.

### 11.6 Recommendation

**Ship v1.1.0 on the current key, then treat rotation as its own deliberate piece of work.** Reasons:

1. v1.1.0 is a small sideloaded update to an early-access game. Replacing the key now would force every
   existing player to uninstall, lose their save and reinstall — a much more certain harm than a
   password-protected key sitting in public history.
2. The exposure is a *crackable container*, not a leaked credential; no password is in history.
3. Rotating now does not undo the leak for anyone still on v1.0.x, so it buys less than it costs.
4. Rotation is reversible-ish only in the sense that it cannot be undone: it is exactly the class of
   irreversible decision this pass was told not to make.

Concretely, in order:

1. **Before tagging — close the easy holes, no irreversible step:** add a `.gitignore` rule that keeps
   `*.keystore`, `*.jks`, `*.p12` and `keystore.properties` out of the repo, and rotate the *keystore
   password* only **if** the same password is used anywhere else. (Changing the password does not change
   the key's identity, so it does **not** break updates. It also does not un-leak the old file, but the
   ciphertext under a fresh password is no longer useful to an attacker who later reads the old blob.)
2. **Decide on the key itself as a separate task**, i.e. generate a new keystore with a strong, unique
   password, keep it only in CI secrets, and accept the reinstall migration — best done when you are
   also willing to tell players to reinstall (for example alongside a bigger release).
3. **Enable GitHub secret scanning** on the repo (free for public repos) so a future commit of key
   material is flagged automatically. This is the control whose absence made the original leak silent.
4. **Do not** use the leaked keystore's password anywhere you cannot change; keep it only in the CI
   secret store.

Nothing in this section has been executed.

### 11.7 Your one-command check

To close the last unverified link (does CI hold this keystore?), with the password you already have:

```bash
keytool -list -v -keystore android/app/release.keystore -storetype PKCS12 \
  | grep -i "SHA256\|Alias name\|Valid from"
```

The `SHA256` line must be `5F:8A:8B:BC:7B:4E:08:F3:CB:4F:B9:F8:AF:D0:A4:D8:9C:C0:64:68:82:DE:3D:57:7C:2B:B2:A6:49:FB:52:E6`.
If it matches, the key exposed in public history is also the key that signs your releases — which is what
the evidence above indicates, and what makes the decision in §11.6 yours to take rather than mine.

---

## 12. Proposed (unapplied) fix: announcement lane vs boss readout

For your decision — this changes where a HUD element is drawn, so it was not applied during a
validation pass.

Cause: `drawAnnouncements()` pins a major banner at `H * 0.2` with a 26–32 px title, while the boss
health bar is pinned at `52 * hudUnit()` from the top. On a short landscape viewport (the common phone
case — at 800×360 the two text boxes already cross) the banner title prints under the bar for its whole
2.2–2.6 s life, which is exactly when a boss wave announces "BOSS INBOUND".

Minimal shape of a fix (two small hooks, no layout rework):

```js
// engine_fx.js - expose whether a major banner is on screen
function annMajorLift() {
  for (const a of ANN) if (a.pri <= 2 && a.t < a.life) return 1;
  return 0;
}

// engine_hud.js - drop the boss bar below the banner lane when one is up
const by = Math.round(52 * u) + saT +
  (typeof annMajorLift === 'function' ? annMajorLift() * Math.round(26 * u) : 0);
```

Alternatives if you prefer them: move the banner lane down (it would then sit over the arena centre,
which the harness's keep-out box asserts against), move it up (it would collide with the wave-modifier
tag at the top centre instead), or suppress a boss readout while a boss-wave banner is up. Dropping the
bar is the only one of the four that moves a transient element instead of the permanent HUD.

Verified either way by the harness's new measurement block: with the queue cleared it logs
`clear`; while a banner is live at 640×360 it logs the overlap and its area.

