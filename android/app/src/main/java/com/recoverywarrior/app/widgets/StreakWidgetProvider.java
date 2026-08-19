package com.recoverywarrior.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.recoverywarrior.app.MainActivity;
import com.recoverywarrior.app.R;
import com.recoverywarrior.app.WidgetBridgePlugin;

/**
 * StreakWidgetProvider — Native Android 4x2 Sobriety Shield AppWidget
 * Displays real-time streak days, warrior rank, flame icon, and 1-tap SOS urge button.
 */
public class StreakWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        int streakDays = prefs.getInt("streakDays", 21);
        int longestStreak = prefs.getInt("longestStreak", 21);
        int xpPoints = prefs.getInt("xpPoints", 3450);
        String warriorRank = prefs.getString("warriorRank", "Tier III Sovereign");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak);

            views.setTextViewText(R.id.widget_streak_days, String.valueOf(streakDays));
            views.setTextViewText(R.id.widget_warrior_rank, warriorRank);
            views.setTextViewText(R.id.widget_streak_subtext, "Longest: " + longestStreak + "d · +" + xpPoints + " XP");

            // Open app on widget tap
            Intent openAppIntent = new Intent(context, MainActivity.class);
            PendingIntent openPending = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_streak_root, openPending);

            // SOS button tap opens app with crisis flag
            Intent sosIntent = new Intent(context, MainActivity.class);
            sosIntent.putExtra("TRIGGER_CRISIS", true);
            PendingIntent sosPending = PendingIntent.getActivity(
                context, 1, sosIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_sos, sosPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
