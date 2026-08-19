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
 * HabitsWidgetProvider — Native Android 2x2 Habit Progress AppWidget
 */
public class HabitsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        int completed = prefs.getInt("habitsCompleted", 3);
        int total = prefs.getInt("totalHabits", 9);
        int percent = prefs.getInt("habitPercentage", 33);
        String nextHabit = prefs.getString("nextHabitName", "3-Minute Cold Shower");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_habits);

            views.setTextViewText(R.id.widget_habit_ratio, completed + "/" + total);
            views.setTextViewText(R.id.widget_habit_percent, percent + "%");
            views.setTextViewText(R.id.widget_habit_next, nextHabit);

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.putExtra("TAB", "routine");
            PendingIntent openPending = PendingIntent.getActivity(
                context, 2, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_habits_root, openPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
