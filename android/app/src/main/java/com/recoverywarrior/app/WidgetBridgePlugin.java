package com.recoverywarrior.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.recoverywarrior.app.widgets.ForgeWidgetProvider;
import com.recoverywarrior.app.widgets.HabitsWidgetProvider;
import com.recoverywarrior.app.widgets.StreakWidgetProvider;

/**
 * WidgetBridgePlugin — two-way bridge between the web app and the native
 * home-screen AppWidgets.
 *
 * Outbound: the web layer pushes a metrics payload after every state change;
 * we persist it to SharedPreferences and broadcast an update so all three
 * widget providers redraw.
 *
 * Inbound: a widget tap launches MainActivity with an action string, which is
 * delivered here and forwarded to JS as a "widgetAction" event. If the app was
 * cold-started the WebView has no listener yet, so the event is retained until
 * the web layer attaches one — see notifyListeners(..., true).
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "RecoveryWarriorWidgetPrefs";

    /** Event name observed by the web layer (androidSystem.ts). */
    private static final String EVENT_WIDGET_ACTION = "widgetAction";

    /**
     * Live plugin instance, set once Capacitor loads the plugin. Static because
     * MainActivity receives widget intents before/independently of the bridge.
     */
    @Nullable
    private static WidgetBridgePlugin instance;

    /** Action received before the plugin was loaded; replayed on load(). */
    @Nullable
    private static String pendingAction;

    @Override
    public void load() {
        super.load();
        instance = this;

        // Cold start: MainActivity.onCreate ran before the bridge existed.
        if (pendingAction != null) {
            String action = pendingAction;
            pendingAction = null;
            emitWidgetAction(action);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.handleOnDestroy();
    }

    /**
     * Entry point used by MainActivity when a widget tap launches the app.
     * Safe to call at any point in the lifecycle.
     */
    public static void dispatchWidgetAction(String action) {
        if (action == null || action.isEmpty()) {
            return;
        }
        WidgetBridgePlugin live = instance;
        if (live != null) {
            live.emitWidgetAction(action);
        } else {
            pendingAction = action;
        }
    }

    private void emitWidgetAction(String action) {
        JSObject payload = new JSObject();
        payload.put("action", action);
        // retainUntilConsumed = true: survives the window between the bridge
        // coming up and the React app registering its listener.
        notifyListeners(EVENT_WIDGET_ACTION, payload, true);
    }

    /**
     * Lets the web layer drain any action queued before it was listening.
     * Belt-and-braces alongside the retained event above.
     */
    @PluginMethod
    public void consumePendingAction(PluginCall call) {
        JSObject result = new JSObject();
        result.put("action", pendingAction == null ? "" : pendingAction);
        pendingAction = null;
        call.resolve(result);
    }

    /**
     * Persists the latest metrics and redraws every placed widget.
     *
     * Values are written unconditionally rather than only when present, so a
     * reset app state (all zeros) actually clears the widgets instead of
     * leaving the previous numbers stranded on the home screen.
     */
    @PluginMethod
    public void updateWidgets(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("No Android context available");
            return;
        }

        JSObject data = call.getData();

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        // Sobriety Shield.
        // The anchor timestamp is stored rather than a precomputed day count so
        // StreakWidgetProvider can roll the number over at midnight by itself,
        // without the app being launched. Sent as a string because JSObject has
        // no long accessor and epoch millis overflow an int.
        editor.putLong("sobrietyStartEpochMs", parseLong(data.getString("sobrietyStartEpochMs"), 0L));
        editor.putInt("streakDays", data.getInteger("streakDays", 0));
        editor.putInt("longestStreak", data.getInteger("longestStreak", 0));
        editor.putInt("xpPoints", data.getInteger("xpPoints", 0));
        editor.putString("warriorRank", safeString(data.getString("warriorRank"), ""));
        editor.putString("archetype", safeString(data.getString("archetype"), "EAGLE"));
        editor.putBoolean("streakSecuredToday", Boolean.TRUE.equals(data.getBool("streakSecuredToday")));

        // Habits
        editor.putInt("habitsCompleted", data.getInteger("habitsCompleted", 0));
        editor.putInt("totalHabits", data.getInteger("totalHabits", 0));
        editor.putInt("habitPercentage", data.getInteger("habitPercentage", 0));
        editor.putString("nextHabitName", safeString(data.getString("nextHabitName"), ""));

        // Freelance Forge
        editor.putInt("currentMonthIncome", data.getInteger("currentMonthIncome", 0));
        editor.putInt("targetIncome", data.getInteger("targetIncome", 0));
        editor.putInt("incomeProgressPercent", data.getInteger("incomeProgressPercent", 0));

        editor.putLong("lastUpdatedAt", System.currentTimeMillis());
        editor.apply();

        broadcastUpdate(context, StreakWidgetProvider.class);
        broadcastUpdate(context, HabitsWidgetProvider.class);
        broadcastUpdate(context, ForgeWidgetProvider.class);

        call.resolve();
    }

    /** Sends an explicit APPWIDGET_UPDATE to one provider's placed instances. */
    private void broadcastUpdate(Context context, Class<?> providerClass) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, providerClass));
        if (ids == null || ids.length == 0) {
            // Nothing placed on the home screen — skip the broadcast entirely.
            return;
        }
        Intent intent = new Intent(context, providerClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }

    private static String safeString(@Nullable String value, String fallback) {
        return (value == null || value.isEmpty()) ? fallback : value;
    }

    private static long parseLong(@Nullable String value, long fallback) {
        if (value == null || value.isEmpty()) {
            return fallback;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
