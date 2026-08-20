package com.recoverywarrior.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import com.recoverywarrior.app.R;
import com.recoverywarrior.app.WidgetBridgePlugin;

import java.text.NumberFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * ForgeWidgetProvider — 2x2 month-to-date freelance income against target.
 *
 * The month label is derived from the device clock rather than stored, so it
 * stays correct across a month boundary without the app being opened.
 * Defaults are zero: a user with no logged income sees ₹0, not sample revenue.
 */
public class ForgeWidgetProvider extends AppWidgetProvider {

    private static final Locale INDIA = Locale.forLanguageTag("en-IN");

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs =
            context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);

        int currentIncome = prefs.getInt("currentMonthIncome", 0);
        int targetIncome = prefs.getInt("targetIncome", 0);
        int percent = prefs.getInt("incomeProgressPercent", 0);

        NumberFormat inrFormat = NumberFormat.getCurrencyInstance(INDIA);
        inrFormat.setMaximumFractionDigits(0);

        String formattedAmount = inrFormat.format(currentIncome);
        String goalLabel = targetIncome > 0
            ? "Goal: " + inrFormat.format(targetIncome)
            : context.getString(R.string.widget_goal_empty);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_forge);

            views.setTextViewText(R.id.widget_forge_month, currentMonthLabel());
            views.setTextViewText(R.id.widget_forge_amount, formattedAmount);
            views.setTextViewText(R.id.widget_forge_percent, percent + "% pace");
            views.setTextViewText(R.id.widget_forge_goal, goalLabel);

            views.setOnClickPendingIntent(
                R.id.widget_forge_root,
                WidgetIntents.forAction(context, WidgetIntents.ACTION_OPEN_INCOME)
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    /** e.g. "Aug realized" — derived from the clock, never stored. */
    private static String currentMonthLabel() {
        Calendar now = Calendar.getInstance();
        String month = now.getDisplayName(Calendar.MONTH, Calendar.SHORT, INDIA);
        return (month == null ? "This month" : month + " realized");
    }
}
