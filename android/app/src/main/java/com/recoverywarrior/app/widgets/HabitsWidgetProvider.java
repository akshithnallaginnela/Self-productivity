package com.recoverywarrior.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.recoverywarrior.app.R;
import com.recoverywarrior.app.WidgetBridgePlugin;

/**
 * HabitsWidgetProvider — 2x2 habit progress.
 *
 * Tapping the card opens the routine tab; tapping the "next habit" row opens
 * the app with a check-off request, which the web layer performs against the
 * real routine list. Defaults are an honest empty state.
 */
public class HabitsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs =
            context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);

        int completed = prefs.getInt("habitsCompleted", 0);
        int total = prefs.getInt("totalHabits", 0);
        int percent = prefs.getInt("habitPercentage", 0);
        String nextHabit = prefs.getString("nextHabitName", "");

        boolean hasRoutine = total > 0;
        boolean allDone = hasRoutine && completed >= total;

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_habits);

            views.setTextViewText(R.id.widget_habit_ratio, completed + "/" + total);
            views.setTextViewText(R.id.widget_habit_percent, percent + "%");

            String nextLabel;
            if (!hasRoutine) {
                nextLabel = context.getString(R.string.widget_habits_empty);
            } else if (allDone) {
                nextLabel = "All done for today ✓";
            } else {
                nextLabel = nextHabit.isEmpty() ? "Next habit" : "▢ " + nextHabit;
            }
            views.setTextViewText(R.id.widget_habit_next, nextLabel);

            views.setOnClickPendingIntent(
                R.id.widget_habits_root,
                WidgetIntents.forAction(context, WidgetIntents.ACTION_OPEN_ROUTINE)
            );

            // Only offer one-tap check-off when there is actually something to check.
            views.setOnClickPendingIntent(
                R.id.widget_habit_next,
                WidgetIntents.forAction(
                    context,
                    (hasRoutine && !allDone)
                        ? WidgetIntents.ACTION_CHECK_NEXT_HABIT
                        : WidgetIntents.ACTION_OPEN_ROUTINE
                )
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
