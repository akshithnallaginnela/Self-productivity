package com.recoverywarrior.app.widgets;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import com.recoverywarrior.app.MainActivity;

/**
 * WidgetIntents — builds the launch PendingIntents used by every AppWidget.
 *
 * All app state lives in the WebView (localStorage), so native code cannot
 * mutate it directly. A widget tap therefore launches MainActivity carrying an
 * action string; the web layer performs the action once the bridge is up.
 *
 * Request codes must be unique per distinct action: PendingIntent equality
 * ignores extras, so two PendingIntents sharing a request code would collapse
 * into one and every widget button would fire the same action.
 */
final class WidgetIntents {

    /** Actions understood by androidSystem.ts on the web side. */
    static final String ACTION_CRISIS = "crisis";
    static final String ACTION_OPEN_ROUTINE = "open-routine";
    static final String ACTION_CHECK_NEXT_HABIT = "check-next-habit";
    static final String ACTION_OPEN_INCOME = "open-income";
    static final String ACTION_OPEN_RECOVERY = "open-recovery";

    private static final int RC_OPEN_RECOVERY = 100;
    private static final int RC_CRISIS = 101;
    private static final int RC_OPEN_ROUTINE = 102;
    private static final int RC_CHECK_NEXT_HABIT = 103;
    private static final int RC_OPEN_INCOME = 104;

    private WidgetIntents() {}

    static PendingIntent forAction(Context context, String action) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(MainActivity.EXTRA_WIDGET_ACTION, action);

        return PendingIntent.getActivity(
            context,
            requestCodeFor(action),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static int requestCodeFor(String action) {
        switch (action) {
            case ACTION_CRISIS:
                return RC_CRISIS;
            case ACTION_OPEN_ROUTINE:
                return RC_OPEN_ROUTINE;
            case ACTION_CHECK_NEXT_HABIT:
                return RC_CHECK_NEXT_HABIT;
            case ACTION_OPEN_INCOME:
                return RC_OPEN_INCOME;
            case ACTION_OPEN_RECOVERY:
            default:
                return RC_OPEN_RECOVERY;
        }
    }
}
