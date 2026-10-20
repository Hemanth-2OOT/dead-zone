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
