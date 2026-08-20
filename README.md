# 🦅 Sovereign Eagle — Mobile Discipline & Monetary Forge

> Sovereign self-mastery, sobriety shield, 30m monitored focus execution, and freelance revenue engine tailored exclusively for Akshith.

---

## ⚡ Quick Start & Development

### 1. Web Local Development
```bash
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 📱 Android Native Build & Release Guide

### ⚠️ JDK 21 Requirement
Gradle 8.14.3 + Android Gradle Plugin 8.13 require **JDK 21 (LTS)**. Gradle will refuse to start on JDK 25 (`Unsupported class file major version 69`).

1. Download & Install [Eclipse Temurin JDK 21](https://adoptium.net/temurin/releases/?version=21).
2. Point Gradle to JDK 21 by opening `android/gradle.properties` and ensuring:
   ```properties
   org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-21.0.x-hotspot
   ```
   *(or `C:/Program Files/Java/jdk-21` depending on your install path)*.

---

### 🔨 Build Debug APK
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
The compiled debug APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

### 🔑 Release Keystore Generation
To generate a production signing key for release builds:

```bash
keytool -genkey -v -keystore sovereign-eagle.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sovereign-eagle
```

Store `sovereign-eagle.jks` securely in your credentials vault.

---

## 🏛️ System Architecture

- **Hardware Back Navigation**: Priority stack (Modals = 100 $\to$ Drawer = 95 $\to$ Profile = 90 $\to$ Tabs = 50 $\to$ Double-Tap Exit Toast = 10).
- **Screen WakeLock Sentinel**: Keeps screen and execution alive during 30m Deep Work sessions and GPS walks.
- **Dual-Layer Persistence**: Synchronous `localStorage` with reactive `IndexedDB` shadow durability vault.
- **Native Scheduled Push**: `@capacitor/local-notifications` with automated 5:30 AM wakeups, 10:00 AM focus blocks, 8:00 PM streak alarms, and 9:30 PM sleep warnings.
- **Web Audio Synthesizer**: Procedural 40Hz Gamma waves, 432Hz harmonic tones, 6Hz Theta waves, and brown noise rain.
