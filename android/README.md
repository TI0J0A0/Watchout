# Funnyroll — Android wrapper (Mobile + Android TV)

Native WebView container for the Funnyroll React SPA (`https://funnyroll.com`).
Lives in this `/android` subfolder, side-by-side with `/src` and `/supabase`.
It does **not** affect the Vite build — Vite only processes `index.html` + `/src`,
and Android build artifacts are ignored via [`.gitignore`](./.gitignore).

## What's here

```
android/
├── settings.gradle.kts        # root project + :app module
├── build.gradle.kts           # AGP / Kotlin plugin versions
├── gradle.properties          # AndroidX, JVM args
└── app/
    ├── build.gradle.kts        # appId com.funnyroll.app, minSdk 21, sdk 34
    ├── proguard-rules.pro      # keep the JS bridge in release builds
    └── src/main/
        ├── AndroidManifest.xml          # LAUNCHER + LEANBACK_LAUNCHER, touch optional
        ├── java/com/funnyroll/app/MainActivity.kt
        └── res/
            ├── values/strings.xml
            ├── values/themes.xml        # black, no action bar
            └── xml/network_security_config.xml
```

## First-time setup (one-time, generates the Gradle wrapper + icons)

Because the Gradle wrapper JAR and launcher icons are binary, generate them once:

**Option A — Android Studio (recommended)**
1. `File → Open…` and select this **`android/`** folder (open the subfolder, *not* the repo root).
2. Let it sync. If it prompts to create the Gradle wrapper, accept.
3. Add launcher assets: right-click `app/res` → *New → Image Asset* for `ic_launcher`,
   and add a **TV banner** `app/src/main/res/drawable/banner.png` (320×180) referenced by
   `android:banner` in the manifest.
4. Run on a device/emulator. Use an **Android TV emulator image** to test D-Pad.

**Option B — CLI**
```bash
cd android
gradle wrapper --gradle-version 8.7   # creates ./gradlew + gradle/wrapper/*
./gradlew assembleDebug                # APK in app/build/outputs/apk/debug/
```

> Keep the repo root clean: run all Gradle commands from inside `android/`.
> Never run `npm`/Vite from `android/`, and never run `gradle` from the repo root.

## How platform detection works

`MainActivity` tells the SPA which platform it's on, two ways:
- **User-Agent tag** (synchronous, available at first paint): `… FunnyrollApp/1.0 AndroidTV|Android`
- **JS flags** (injected on page start/finish): `window.__IS_ANDROID__`, `window.__IS_ANDROID_TV__`,
  plus a `funnyroll:platform` event.

The web app reads these in [`src/utils/platform.js`](../src/utils/platform.js)
(`isAndroid()`, `isAndroidTV()`).

## D-Pad navigation (web side)

`App.jsx` calls `useTVNavigation(isTV)` ([`src/hooks/useTVNavigation.js`](../src/hooks/useTVNavigation.js)),
which adds `html.tv-mode`, intercepts arrow keys, and moves `document.activeElement`
to the nearest focusable in that direction (geometry-based). Overlays like `AnimePage`
call `useFocusScope(ref, isAndroidTV())` to trap focus while open and restore it on close.
TV focus styling lives under `html.tv-mode :focus` in `src/index.css`.

## Notes

- Fullscreen HTML5 video is handled by `WebChromeClient.onShowCustomView` (immersive mode).
- The hardware **Back** button maps to the SPA's `pushState` history, then exits.
- The site is HTTPS; `network_security_config.xml` only allows cleartext for `funnyroll.com`
  as a dev safety net — remove it for a strict HTTPS build.
- Bump `versionCode`/`versionName` in `app/build.gradle.kts` per release.
