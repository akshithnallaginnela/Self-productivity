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

import java.text.NumberFormat;
import java.util.Locale;

/**
 * ForgeWidgetProvider — Native Android 2x2 Freelance Income Forge AppWidget
 */
public class ForgeWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        int currentIncome = prefs.getInt("currentMonthIncome", 87500);
        int targetIncome = prefs.getInt("targetIncome", 120000);
        int percent = prefs.getInt("incomeProgressPercent", 73);

        NumberFormat inrFormat = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        inrFormat.setMaximumFractionDigits(0);
        String formattedAmount = inrFormat.format(currentIncome);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_forge);

            views.setTextViewText(R.id.widget_forge_amount, formattedAmount);
            views.setTextViewText(R.id.widget_forge_percent, percent + "% Pace");

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.putExtra("TAB", "income");
            PendingIntent openPending = PendingIntent.getActivity(
                context, 3, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_forge_root, openPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
