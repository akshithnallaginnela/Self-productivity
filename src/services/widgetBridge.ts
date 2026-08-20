/**
 * widgetBridge.ts — pushes app state to the native Android home-screen widgets.
 *
 * On a device this calls the WidgetBridge Capacitor plugin, which writes to
 * SharedPreferences and broadcasts an AppWidgetManager update. In a browser it
 * is a no-op beyond caching the payload.
 *
 * The sobriety anchor is sent as an epoch timestamp rather than a precomputed
 * day count, so StreakWidgetProvider can roll the number over at midnight by
 * itself without the app being launched.
 */

import { UserProfile, RoutineTask, IncomeEntry } from '../types';
import { calculateIncomeForecast } from './forecastEngine';

/** Payload mirrored into Android SharedPreferences. */
export interface NativeWidgetPayload {
  // Sobriety Shield (4x2)
  sobrietyStartEpochMs: string; // string: epoch ms overflows a Java int
  streakDays: number;
  longestStreak: number;
  xpPoints: number;
  warriorRank: string;
  archetype: string;
  streakSecuredToday: boolean;

  // Habits (2x2)
  habitsCompleted: number;
  totalHabits: number;
  habitPercentage: number;
  nextHabitName: string;

  // Freelance Forge (2x2)
  currentMonthIncome: number;
  targetIncome: number;
  incomeProgressPercent: number;

  lastUpdatedAt: string;
}

interface WidgetBridgeNativePlugin {
  updateWidgets: (data: NativeWidgetPayload) => Promise<void>;
  consumePendingAction: () => Promise<{ action: string }>;
  addListener: (
    eventName: 'widgetAction',
    handler: (data: { action: string }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { WidgetBridge?: WidgetBridgeNativePlugin };
}

const capacitor = (): CapacitorGlobal | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

/** True when running inside the Android shell rather than a browser. */
export const isNativePlatform = (): boolean => {
  const cap = capacitor();
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
};

const CACHE_KEY = 'rw_native_widget_payload_v2';

class NativeWidgetBridge {
  /** Last payload sent, used to skip redundant native round-trips. */
  private lastSerialized: string | null = null;

  private plugin(): WidgetBridgeNativePlugin | undefined {
    return capacitor()?.Plugins?.WidgetBridge;
  }

  /**
   * Builds the payload from current state and pushes it natively.
   * Skips the bridge call entirely when nothing the widgets display has changed.
   */
  public async syncToNativeWidgets(
    profile: UserProfile,
    routines: RoutineTask[],
    incomeEntries: IncomeEntry[],
    streakSecuredToday: boolean
  ): Promise<void> {
    const completedCount = routines.filter((r) => r.completed).length;
    const nextIncomplete = routines
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find((r) => !r.completed);
    const forecast = calculateIncomeForecast(incomeEntries, profile.targetMonthlyIncome);

    const sobrietyStartMs = profile.isOnboardingCompleted
      ? new Date(profile.sobrietyStartDate).getTime()
      : 0;

    const payload: NativeWidgetPayload = {
      sobrietyStartEpochMs: String(Number.isFinite(sobrietyStartMs) ? sobrietyStartMs : 0),
      streakDays: profile.currentStreak,
      longestStreak: profile.longestStreak,
      xpPoints: profile.xpPoints,
      warriorRank: profile.warriorRank,
      archetype: profile.selectedArchetype,
      streakSecuredToday,

      habitsCompleted: completedCount,
      totalHabits: routines.length,
      habitPercentage:
        routines.length === 0 ? 0 : Math.round((completedCount / routines.length) * 100),
      nextHabitName: nextIncomplete ? nextIncomplete.name : '',

      currentMonthIncome: Math.round(forecast.currentMonthTotal),
      targetIncome: Math.round(profile.targetMonthlyIncome),
      incomeProgressPercent: forecast.targetProgressPercent,

      lastUpdatedAt: new Date().toISOString()
    };

    // Compare everything except the timestamp, which always differs.
    const { lastUpdatedAt: _ignored, ...comparable } = payload;
    const serialized = JSON.stringify(comparable);
    if (serialized === this.lastSerialized) return;
    this.lastSerialized = serialized;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* cache is a convenience; a failure here must not break the sync */
    }

    const plugin = this.plugin();
    if (!plugin) return; // browser / PWA — nothing native to update

    try {
      await plugin.updateWidgets(payload);
    } catch (err) {
      console.warn('[widgetBridge] Native widget update failed:', err);
    }
  }

  /**
   * Subscribes to home-screen widget taps. Returns an unsubscribe function.
   *
   * Two delivery paths are needed: `addListener` catches taps while the app is
   * running, and `consumePendingAction` drains an action that arrived during a
   * cold start, before this listener existed.
   */
  public async onWidgetAction(handler: (action: string) => void): Promise<() => void> {
    const plugin = this.plugin();
    if (!plugin) return () => {};

    let removeListener: (() => Promise<void>) | null = null;

    try {
      const handle = await plugin.addListener('widgetAction', ({ action }) => {
        if (action) handler(action);
      });
      removeListener = handle.remove;
    } catch (err) {
      console.warn('[widgetBridge] Could not attach widget listener:', err);
    }

    try {
      const pending = await plugin.consumePendingAction();
      if (pending?.action) handler(pending.action);
    } catch {
      /* no pending action, or plugin unavailable */
    }

    return () => {
      void removeListener?.();
    };
  }

  public getCachedPayload(): NativeWidgetPayload | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as NativeWidgetPayload) : null;
    } catch {
      return null;
    }
  }
}

export const widgetBridge = new NativeWidgetBridge();
