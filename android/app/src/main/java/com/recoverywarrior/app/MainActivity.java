package com.recoverywarrior.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity — Capacitor host activity for Sovereign Eagle.
 *
 * Responsibilities beyond the stock BridgeActivity:
 *   1. Registers the WidgetBridgePlugin (resolved by literal, not by
 *      capacitor.plugins.json, so it must be registered before super.onCreate).
 *   2. Enables true edge-to-edge so the web layer's safe-area padding is the
 *      single source of truth for system-bar insets.
 *   3. Routes home-screen AppWidget taps into the running web app.
 *
 * Widget routing note: the app's data lives in the WebView (localStorage), so
 * native code cannot mutate app state directly. A widget action therefore
 * launches the activity carrying an EXTRA_WIDGET_ACTION, and the web layer
 * performs the action once it is ready. Because launchMode is singleTask, the
 * intent arrives via onCreate on a cold start and via onNewIntent on a warm
 * one — both paths are handled.
 */
public class MainActivity extends BridgeActivity {

    /** Intent extra naming the action a widget tap requested. */
    public static final String EXTRA_WIDGET_ACTION = "com.recoverywarrior.app.WIDGET_ACTION";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // Draw behind the status and navigation bars. The web layer already
        // pads with env(safe-area-inset-*), so letting the system draw its own
        // backgrounds here would double the inset.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

        applySystemBarIconContrast();

        handleWidgetIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Keep getIntent() consistent for anything that reads it later.
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    /**
     * Extracts a widget action from the launch intent and hands it to the
     * plugin, which either delivers it immediately or retains it until the
     * web layer attaches a listener.
     */
    private void handleWidgetIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getStringExtra(EXTRA_WIDGET_ACTION);
        if (action == null || action.isEmpty()) {
            return;
        }

        // Consume it so a configuration change (rotation, theme switch) does
        // not replay the same action.
        intent.removeExtra(EXTRA_WIDGET_ACTION);

        WidgetBridgePlugin.dispatchWidgetAction(action);
    }

    /**
     * Requests dark system-bar icons on light backgrounds. The web UI is light
     * in day mode and dark in night mode, so the icon contrast follows the
     * configured night mode rather than being hardcoded.
     */
    private void applySystemBarIconContrast() {
        boolean isNightMode =
            (getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;

        View decor = getWindow().getDecorView();
        WindowCompat.getInsetsController(getWindow(), decor)
            .setAppearanceLightStatusBars(!isNightMode);
        WindowCompat.getInsetsController(getWindow(), decor)
            .setAppearanceLightNavigationBars(!isNightMode);
    }
}
