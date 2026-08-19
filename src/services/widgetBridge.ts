/**
 * widgetBridge.ts — Native Android Home Screen Widget Sync Bridge
 *
 * Bridges the React/TypeScript local database state to native Android
 * AppWidgets (`AppWidgetProvider`).
 *
 * When built into an Android APK, this service writes streak, habit, and income
 * metrics into Android `SharedPreferences` and triggers `AppWidgetManager` broadcast
 * intents so the user's phone home screen widgets update instantaneously!
 *
 * When running in the browser / PWA preview, it syncs with the in-app
 * Android 14 Glance Widget Deck (`WidgetDeck.tsx`).
 */

import { UserProfile, RoutineTask, IncomeEntry } from '../types';
import { calculateIncomeForecast } from './forecastEngine';

/** Data payload synced to Android SharedPreferences for Native Widgets */
export interface NativeWidgetPayload {
  // Sobriety Shield Widget (4x2)
  streakDays: number;
  longestStreak: number;
  xpPoints: number;
  warriorRank: string;
  archetype: string;
  
  // Habits Widget (2x2)
  habitsCompleted: number;
  totalHabits: number;
  habitPercentage: number;
  nextHabitName: string;
  nextHabitId: string;

  // Freelance Forge Widget (2x2)
  currentMonthIncome: number;
  targetIncome: number;
  incomeProgressPercent: number;
  currencySymbol: string;

  lastUpdatedAt: string;
}

/**
 * Native Android Widget Bridge Service
 */
class NativeWidgetBridge {
  private isNative: boolean = false;

  constructor() {
    // Check if running inside Capacitor Android native shell
    this.isNative = typeof (window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor?.isNativePlatform === 'function' &&
      (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
  }

  /**
   * Syncs latest app state to Android Native SharedPreferences and notifies AppWidgetManager.
   *
   * @param {UserProfile} profile Active user profile
   * @param {RoutineTask[]} routines Daily habit routines
   * @param {IncomeEntry[]} incomeEntries Realized income ledger
   */
  public async syncToNativeWidgets(
    profile: UserProfile,
    routines: RoutineTask[],
    incomeEntries: IncomeEntry[]
  ): Promise<void> {
    const completedCount = routines.filter(r => r.completed).length;
    const habitPercent = Math.round((completedCount / Math.max(1, routines.length)) * 100);
    const nextIncomplete = routines.find(r => !r.completed);
    const forecast = calculateIncomeForecast(incomeEntries, profile.targetMonthlyIncome);

    const payload: NativeWidgetPayload = {
      streakDays: profile.currentStreak,
      longestStreak: profile.longestStreak,
      xpPoints: profile.xpPoints,
      warriorRank: profile.warriorRank,
      archetype: profile.selectedArchetype,

      habitsCompleted: completedCount,
      totalHabits: routines.length,
      habitPercentage: habitPercent,
      nextHabitName: nextIncomplete ? nextIncomplete.name : 'All Done! ⚡',
      nextHabitId: nextIncomplete ? nextIncomplete.id : '',

      currentMonthIncome: forecast.currentMonthTotal,
      targetIncome: profile.targetMonthlyIncome,
      incomeProgressPercent: forecast.targetProgressPercent,
      currencySymbol: '₹',

      lastUpdatedAt: new Date().toISOString()
    };

    // Store in browser localStorage for web preview sync
    localStorage.setItem('rw_native_widget_payload', JSON.stringify(payload));

    // If running in Native Android APK container, broadcast to Android Native Widget Plugin
    if (this.isNative) {
      try {
        const capacitorWindow = window as unknown as {
          Capacitor?: {
            Plugins?: {
              WidgetBridge?: {
                updateWidgets: (data: NativeWidgetPayload) => Promise<void>;
              };
            };
          };
        };

        if (capacitorWindow.Capacitor?.Plugins?.WidgetBridge) {
          await capacitorWindow.Capacitor.Plugins.WidgetBridge.updateWidgets(payload);
          console.log('[NativeWidgetBridge] Successfully broadcasted update to Android AppWidgets');
        }
      } catch (err) {
        console.warn('[NativeWidgetBridge] Failed to dispatch native Android widget update:', err);
      }
    }
  }

  /**
   * Retrieves the cached widget payload.
   */
  public getCachedPayload(): NativeWidgetPayload | null {
    const raw = localStorage.getItem('rw_native_widget_payload');
    return raw ? JSON.parse(raw) : null;
  }
}

/** Singleton instance exported for use across database mutations */
export const widgetBridge = new NativeWidgetBridge();
