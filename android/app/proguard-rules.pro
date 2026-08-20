# ============================================================================
# Sovereign Eagle — R8 / ProGuard rules
#
# Capacitor resolves plugins reflectively: MainActivity registers classes by
# literal, and capacitor.plugins.json names them by classpath STRING. R8 cannot
# see those references, so every plugin class and every @PluginMethod must be
# kept explicitly or the app crashes at first bridge call in a release build.
# ============================================================================

# ── Keep readable crash reports from Play Console / logcat ──────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Annotations drive Capacitor's plugin discovery — never strip them.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod


# ── Capacitor core bridge ───────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}

# ── Installed Capacitor plugins (named as strings in capacitor.plugins.json) ─
-keep class com.capacitorjs.plugins.app.** { *; }
-keep class com.capacitorjs.plugins.localnotifications.** { *; }

# ── This app's own native surface ───────────────────────────────────────────
# WidgetBridgePlugin is registered by literal in MainActivity; the widget
# providers are instantiated by the framework from the manifest.
-keep class com.recoverywarrior.app.WidgetBridgePlugin { *; }
-keep class com.recoverywarrior.app.MainActivity { *; }
-keep class com.recoverywarrior.app.widgets.** { *; }
-keep class * extends android.appwidget.AppWidgetProvider { *; }

# ── Cordova compatibility layer (empty here, but the plugin module is on the
#    classpath and resolves plugins reflectively the same way) ───────────────
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# ── WebView JavaScript interfaces ───────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── JSON model classes crossing the bridge ──────────────────────────────────
-keepclassmembers class * {
    public <init>(org.json.JSONObject);
}

# ── Quieten known-absent optional deps ──────────────────────────────────────
-dontwarn com.google.android.gms.**
-dontwarn org.chromium.**
