# Dead Zone - APK build

## Easiest: build online (no installs)
1. Create a free GitHub account and a new empty repository.
2. Upload ALL files from this folder (keep the .github folder).
3. Open the Actions tab -> "Build APK" -> wait ~5 min.
4. Open the finished run, download the artifact "dead-zone-apk", unzip it.
5. Send app-debug.apk to your phone and install it (allow "install unknown apps").

## Or build locally
Needs Node 18+, JDK 17, Android Studio/SDK:
  npm install && npx cap add android && npx cap sync android
  cd android && ./gradlew assembleDebug
APK: android/app/build/outputs/apk/debug/app-debug.apk

## Release signing (not in the repo)
Release APKs are signed with a keystore that is **not committed**. CI restores it from
repository secrets, so the signing key and its passwords never appear in the source tree
or the git history of any future commit.

Repository secrets required by `.github/workflows/release.yml`:

| Secret | Contents |
| --- | --- |
| `RELEASE_KEYSTORE_BASE64` | `base64 -w0 release.keystore` |
| `RELEASE_STORE_PASSWORD` | keystore password |
| `RELEASE_KEY_ALIAS` | key alias |
| `RELEASE_KEY_PASSWORD` | key password |

To build a signed release locally, copy `android/app/keystore.properties.example` to
`android/app/keystore.properties` (gitignored), point `storeFile` at your keystore and fill in
the passwords — or export `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`
and `RELEASE_KEY_PASSWORD`. Without either, `assembleRelease` falls back to the debug key and
warns; never publish an APK built that way.

> **Note:** the keystore blob and passwords were previously committed to this repository and
> therefore remain in its *history*. The configuration is now fixed, but the old key should be
> considered compromised — rotate it (`keytool -genkeypair`) if this repo is ever shared, and
> accept that rotating means existing installs can no longer update in place.

## Versioning

The release line restarts at **v1.0.0**. Every release before it was deleted (tags and GitHub
releases) so the repository has one clean starting point instead of a 2.x history carried over from
an earlier, unreleased iteration. Tags are `vMAJOR.MINOR.PATCH`.

Version lives in four places and `npm run audit` fails the build if they disagree:
`package.json`, `src_v2/engine_bootstrap.js` (`GAME_VERSION`), and
`android/app/build.gradle` (`versionCode` + `versionName`) — plus the `// DEAD ZONE vX.Y.Z` headers in
`src_v2/*.js`.

## Checks

```
npm install
npm run build        # src_v2/* -> www/index.html (+ android/app/src/main/assets/public)
npm run audit        # versions, tracked secrets, weapon tiers, skin indices, dead code
npm run test:logic   # tier policy, skin indices, save sanitiser, save round-trip, quota guard
npm test             # build + audit + logic tests, in that order
npm run harness      # writes .agent_tmp/harness.html - browser regression harness (130 assertions)
```

`npm test` needs nothing but Node. The browser harness needs a browser: build it, then open
`.agent_tmp/harness.html` from a static server rooted at `www/` (any headless browser works). It
drives the shipped bundle and checks the Skins tab, HUD overlap at four landscape sizes, projectile
lengths, collision from eight directions at two speeds, and pause/resume.

## Releasing

1. Bump the version in the four places listed above.
2. `npm test` — the release workflow runs the same audit and refuses to publish a tree that fails it.
3. Commit, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The **Release APK** workflow builds, signs and verifies the APK, and attaches
   `dead-zone-vX.Y.Z.apk` plus `dead-zone-vX.Y.Z-source.zip` (generated with `git archive`, so it
   cannot contain build output, `node_modules` or the keystore) to the GitHub release.

A push to `main` runs the **CI** workflow: build, audit, logic tests.
