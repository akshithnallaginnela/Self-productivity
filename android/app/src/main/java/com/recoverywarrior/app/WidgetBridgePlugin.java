package com.recoverywarrior.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.recoverywarrior.app.widgets.StreakWidgetProvider;
import com.recoverywarrior.app.widgets.HabitsWidgetProvider;
import com.recoverywarrior.app.widgets.ForgeWidgetProvider;

/**
 * WidgetBridgePlugin — Native Android SharedPreferences & AppWidgetManager sync plugin.
 * Receives metric updates from React and broadcasts update intents to native widgets.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "RecoveryWarriorWidgetPrefs";

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        JSObject data = call.getData();
        Context context = getContext();

        // Persist data into SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        if (data.has("streakDays")) editor.putInt("streakDays", data.getInteger("streakDays", 0));
        if (data.has("longestStreak")) editor.putInt("longestStreak", data.getInteger("longestStreak", 0));
        if (data.has("xpPoints")) editor.putInt("xpPoints", data.getInteger("xpPoints", 0));
        if (data.has("warriorRank")) editor.putString("warriorRank", data.getString("warriorRank", "Sovereign"));
        if (data.has("archetype")) editor.putString("archetype", data.getString("archetype", "EAGLE"));

        if (data.has("habitsCompleted")) editor.putInt("habitsCompleted", data.getInteger("habitsCompleted", 0));
        if (data.has("totalHabits")) editor.putInt("totalHabits", data.getInteger("totalHabits", 0));
        if (data.has("habitPercentage")) editor.putInt("habitPercentage", data.getInteger("habitPercentage", 0));
        if (data.has("nextHabitName")) editor.putString("nextHabitName", data.getString("nextHabitName", "All Done! ⚡"));

        if (data.has("currentMonthIncome")) editor.putInt("currentMonthIncome", data.getInteger("currentMonthIncome", 0));
        if (data.has("targetIncome")) editor.putInt("targetIncome", data.getInteger("targetIncome", 120000));
        if (data.has("incomeProgressPercent")) editor.putInt("incomeProgressPercent", data.getInteger("incomeProgressPercent", 0));

        editor.apply();

        // Broadcast updates to all three native widget providers
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

        // 1. Streak Widget (4x2)
        int[] streakIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, StreakWidgetProvider.class));
        Intent streakIntent = new Intent(context, StreakWidgetProvider.class);
        streakIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        streakIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, streakIds);
        context.sendBroadcast(streakIntent);

        // 2. Habits Widget (2x2)
        int[] habitIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, HabitsWidgetProvider.class));
        Intent habitIntent = new Intent(context, HabitsWidgetProvider.class);
        habitIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        habitIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, habitIds);
        context.sendBroadcast(habitIntent);

        // 3. Forge Widget (2x2)
        int[] forgeIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ForgeWidgetProvider.class));
        Intent forgeIntent = new Intent(context, ForgeWidgetProvider.class);
        forgeIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        forgeIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, forgeIds);
        context.sendBroadcast(forgeIntent);

        call.resolve();
    }
}
