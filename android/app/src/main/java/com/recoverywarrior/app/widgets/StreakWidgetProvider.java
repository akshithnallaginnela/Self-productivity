package com.recoverywarrior.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.recoverywarrior.app.R;
import com.recoverywarrior.app.WidgetBridgePlugin;

import java.util.concurrent.TimeUnit;

/**
 * StreakWidgetProvider — 4x2 Sobriety Shield.
 *
 * Shows elapsed days sober (not the task streak — they are different numbers),
 * the current rank, and a one-tap SOS that opens the crisis shield.
 *
 * Days sober is derived here from the stored sobriety start timestamp rather
 * than read as a precomputed integer. That means the widget rolls over at
 * midnight on its own periodic update, even if the app has not been opened.
 *
 * Every default is a genuine empty state. A user who has not completed
 * onboarding sees zeros, never sample data.
 */
public class StreakWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs =
            context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);

        long sobrietyStartMs = prefs.getLong("sobrietyStartEpochMs", 0L);
        int streakDays = prefs.getInt("streakDays", 0);
        int longestStreak = prefs.getInt("longestStreak", 0);
        int xpPoints = prefs.getInt("xpPoints", 0);
        String warriorRank = prefs.getString("warriorRank", "");
        String archetype = prefs.getString("archetype", "EAGLE");
        boolean securedToday = prefs.getBoolean("streakSecuredToday", false);

        int daysSober = computeDaysSober(sobrietyStartMs);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak);

            views.setTextViewText(R.id.widget_streak_days, String.valueOf(daysSober));
            views.setTextViewText(R.id.widget_streak_emoji, emojiFor(archetype));
            views.setTextViewText(
                R.id.widget_warrior_rank,
                warriorRank.isEmpty()
                    ? context.getString(R.string.widget_rank_empty)
                    : warriorRank
            );
            views.setTextViewText(
                R.id.widget_streak_subtext,
                buildSubtext(context, streakDays, longestStreak, xpPoints, securedToday)
            );

            // A secured day gets the flame; an unsecured one gets a quiet marker
            // so the widget reads as "still to do" at a glance.
            views.setTextViewText(R.id.widget_streak_flame, securedToday ? "🔥" : "🌑");

            views.setOnClickPendingIntent(
                R.id.widget_streak_root,
                WidgetIntents.forAction(context, WidgetIntents.ACTION_OPEN_RECOVERY)
            );
            views.setOnClickPendingIntent(
                R.id.widget_btn_sos,
                WidgetIntents.forAction(context, WidgetIntents.ACTION_CRISIS)
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    /**
     * Whole days elapsed since the sobriety anchor. Returns 0 when no anchor is
     * set (pre-onboarding) or if the stored timestamp is in the future.
     */
    private static int computeDaysSober(long sobrietyStartMs) {
        if (sobrietyStartMs <= 0L) {
            return 0;
        }
        long elapsed = System.currentTimeMillis() - sobrietyStartMs;
        if (elapsed < 0L) {
            return 0;
        }
        return (int) TimeUnit.MILLISECONDS.toDays(elapsed);
    }

    private static String buildSubtext(
        Context context,
        int streakDays,
        int longestStreak,
        int xpPoints,
        boolean securedToday
    ) {
        if (streakDays <= 0 && xpPoints <= 0) {
            return context.getString(R.string.widget_streak_empty);
        }
        String status = securedToday ? "secured" : "not yet today";
        return "Streak " + streakDays + "d (" + status + ") · best " + longestStreak + "d · " + xpPoints + " XP";
    }

    private static String emojiFor(String archetype) {
        if ("WOLF".equals(archetype)) {
            return "🐺";
        }
        if ("TIGER".equals(archetype)) {
            return "🐅";
        }
        return "🦅";
    }
}
