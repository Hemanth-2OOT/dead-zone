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
