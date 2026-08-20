/**
 * db.ts — Local-first reactive store, streak engine and daily rollover.
 *
 * Everything lives on-device (localStorage, with an IndexedDB shadow copy for
 * durability). Nothing is uploaded, and Android Auto Backup is disabled in the
 * manifest so none of it leaves the phone.
 *
 * Two counters, deliberately distinct:
 *   • daysSober     — elapsed days since `sobrietyStartDate`. Reset ONLY by an
 *                     explicit, user-reported relapse. Drives milestone badges.
 *   • currentStreak — consecutive days with at least one completed discipline.
 *                     Lapses after a fully inactive day. Drives daily momentum.
 *
 * Seed data is empty by design. A fresh install starts at zero on every metric;
 * there is no sample profile, no sample income and no pre-unlocked badge.
 */

import {
  UserProfile,
  DailyEntry,
  ActivityLogEntry,
  RelapseEvent,
  IncomeEntry,
  TriggerLog,
  RoutineTask,
  JournalEntry,
  MilestoneBadge,
  Archetype,
  GpsWalkSession,
  FocusSession,
  SleepSession,
  GeminiCoachInsight
} from '../types';
import { widgetBridge } from './widgetBridge';

/**
 * Storage keys. The v2 suffix intentionally abandons any v1 data: v1 shipped
 * with a seeded 21-day streak and sample income, and silently migrating that
 * fiction into a real user's history would be worse than starting clean.
 */
const STORAGE_KEYS = {
  SCHEMA: 'rw_schema_version',
  PROFILE: 'rw_profile_v2',
  DAILY_ENTRIES: 'rw_daily_entries_v2',
  ACTIVITY_LOG: 'rw_activity_log_v2',
  RELAPSES: 'rw_relapses_v2',
  INCOME_ENTRIES: 'rw_income_entries_v2',
  TRIGGERS: 'rw_triggers_v2',
  ROUTINE_TASKS: 'rw_routine_tasks_v2',
  JOURNALS: 'rw_journals_v2',
  BADGES: 'rw_badges_v2',
  WALK_SESSIONS: 'rw_walk_sessions_v2',
  FOCUS_SESSIONS: 'rw_focus_sessions_v2',
  SLEEP_SESSIONS: 'rw_sleep_sessions_v2',
  COACH_INSIGHTS: 'rw_coach_insights_v2'
} as const;

const SCHEMA_VERSION = 2;

/** Every XP award in one place, so the economy is auditable. */
export const XP = {
  ROUTINE_IN_ORDER: 50,
  ROUTINE_OUT_OF_ORDER: 25,
  FIRST_TASK_OF_DAY: 150,
  INCOME_LOGGED: 100,
  JOURNAL_SAVED: 75,
  WALK_VERIFIED: 120,
  FOCUS_COMPLETED: 100,
  SLEEP_LOGGED: 80,
  URGE_RESISTED: 50
} as const;

/** Rank thresholds, ascending. Rank is always derived, never stored as fact. */
const RANK_TIERS: ReadonlyArray<{ minXp: number; title: string }> = [
  { minXp: 0, title: 'Initiate' },
  { minXp: 500, title: 'Tier I Aspirant' },
  { minXp: 1500, title: 'Tier II Disciplined' },
  { minXp: 3500, title: 'Tier III Sovereign' },
  { minXp: 7000, title: 'Tier IV Ascendant' },
  { minXp: 12000, title: 'Tier V Unshakable' },
  { minXp: 20000, title: 'Tier VI Grandmaster' },
  { minXp: 35000, title: 'Immortal Warrior' }
];

/** Resolves the rank title for an XP total. */
export const computeWarriorRank = (xpPoints: number): string => {
  let title = RANK_TIERS[0].title;
  for (const tier of RANK_TIERS) {
    if (xpPoints >= tier.minXp) title = tier.title;
  }
  return title;
};

/** XP still needed for the next rank, plus that rank's title. */
export const nextRankProgress = (
  xpPoints: number
): { nextTitle: string | null; xpRemaining: number; progressPercent: number } => {
  const next = RANK_TIERS.find((t) => xpPoints < t.minXp);
  if (!next) return { nextTitle: null, xpRemaining: 0, progressPercent: 100 };

  const prevMin = [...RANK_TIERS].reverse().find((t) => xpPoints >= t.minXp)?.minXp ?? 0;
  const span = Math.max(1, next.minXp - prevMin);
  return {
    nextTitle: next.title,
    xpRemaining: next.minXp - xpPoints,
    progressPercent: Math.round(((xpPoints - prevMin) / span) * 100)
  };
};

/* ────────────────────────────────────────────────────────────────────────────
 * DATE HELPERS
 * Local-time based. Using toISOString() here would bucket evening activity in
 * IST (UTC+5:30) into the wrong calendar day.
 * ────────────────────────────────────────────────────────────────────────── */

/** Local calendar date as YYYY-MM-DD. */
export const toDateKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Parses YYYY-MM-DD as local midnight. */
const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Whole days from `a` to `b`, both YYYY-MM-DD. Negative if b precedes a. */
const daysBetween = (a: string, b: string): number => {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
};

const addDays = (key: string, n: number): string => {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

/* ────────────────────────────────────────────────────────────────────────────
 * DEFAULTS — all empty. This is the entire "no fake data" contract.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Milestone badges. Every one starts locked; `daysRequired` is measured against
 * days sober, not the engagement streak.
 */
export const DEFAULT_BADGES: MilestoneBadge[] = [
  { id: 'b-1d', name: 'Awakening', daysRequired: 1, title: 'Day 1: The Decision', icon: '🌱', description: 'Break the cycle. Take the first conscious step.', archetypeBonus: 'EAGLE', unlocked: false },
  { id: 'b-7d', name: 'Iron Discipline', daysRequired: 7, title: 'Day 7: Full Week Sovereign', icon: '🛡️', description: 'One complete week of pure clarity.', archetypeBonus: 'EAGLE', unlocked: false },
  { id: 'b-14d', name: 'Neural Rewire', daysRequired: 14, title: 'Day 14: Fortified Focus', icon: '⚡', description: 'Dopamine receptors begin natural up-regulation.', archetypeBonus: 'TIGER', unlocked: false },
  { id: 'b-21d', name: 'Habit Anchor', daysRequired: 21, title: 'Day 21: The 3-Week Crucible', icon: '🦅', description: 'New neural pathways begin to cement.', archetypeBonus: 'EAGLE', unlocked: false },
  { id: 'b-30d', name: 'Apex Predator', daysRequired: 30, title: 'Day 30: One Month Titan', icon: '🐺', description: 'Energy, clarity and confidence compound.', archetypeBonus: 'WOLF', unlocked: false },
  { id: 'b-60d', name: 'Unshakable', daysRequired: 60, title: 'Day 60: Two Months Fortress', icon: '🏰', description: 'Baseline emotional states stabilise.', archetypeBonus: 'TIGER', unlocked: false },
  { id: 'b-90d', name: 'Sovereign Rebirth', daysRequired: 90, title: 'Day 90: Complete Reset', icon: '👑', description: 'A full neuroplastic reboot.', archetypeBonus: 'EAGLE', unlocked: false },
  { id: 'b-180d', name: 'Grandmaster', daysRequired: 180, title: 'Half-Year Ascendant', icon: '🌌', description: 'Operating at peak executive function.', archetypeBonus: 'WOLF', unlocked: false },
  { id: 'b-365d', name: 'Immortal Warrior', daysRequired: 365, title: 'Year One: Sovereign Legend', icon: '🔥', description: 'Complete transcendence of the old identity.', archetypeBonus: 'TIGER', unlocked: false }
];

/**
 * Starter routine. These are suggestions, all unchecked — the user edits or
 * deletes any of them. `isMandatory` only means "not user-deletable by accident".
 */
export const DEFAULT_ROUTINES: RoutineTask[] = [
  { id: 'm-1', name: 'Wake up (no snooze)', category: 'MORNING', orderIndex: 1, durationMinutes: 0, timeHint: '05:30 AM', iconName: 'AlarmClock', isMandatory: true, completed: false },
  { id: 'm-2', name: 'Hydrate 500ml + 10m sunlight', category: 'MORNING', orderIndex: 2, durationMinutes: 10, timeHint: '05:35 AM', iconName: 'Sun', isMandatory: true, completed: false },
  { id: 'm-3', name: '3km outdoor walk', category: 'MORNING', orderIndex: 3, durationMinutes: 30, timeHint: '05:45 AM', iconName: 'Footprints', isMandatory: true, completed: false },
  { id: 'm-4', name: '3-minute cold shower', category: 'MORNING', orderIndex: 4, durationMinutes: 3, timeHint: '06:18 AM', iconName: 'Droplets', isMandatory: false, completed: false },
  { id: 'm-5', name: 'Journal & top 3 priorities', category: 'MORNING', orderIndex: 5, durationMinutes: 10, timeHint: '06:25 AM', iconName: 'BookOpen', isMandatory: false, completed: false },
  { id: 'm-6', name: 'Deep work block 1', category: 'MORNING', orderIndex: 6, durationMinutes: 120, timeHint: '06:45 AM', iconName: 'Flame', isMandatory: false, completed: false },

  { id: 'e-1', name: 'Screens off & blue light cut', category: 'EVENING', orderIndex: 1, durationMinutes: 0, timeHint: '09:00 PM', iconName: 'SmartphoneOff', isMandatory: true, completed: false },
  { id: 'e-2', name: 'Daily review & income audit', category: 'EVENING', orderIndex: 2, durationMinutes: 10, timeHint: '09:15 PM', iconName: 'CheckCircle2', isMandatory: false, completed: false },
  { id: 'e-3', name: 'Lights out (7-8h sleep target)', category: 'EVENING', orderIndex: 3, durationMinutes: 0, timeHint: '10:00 PM', iconName: 'Moon', isMandatory: true, completed: false }
];

/** A brand-new profile. Every metric is zero and onboarding has not run. */
export const createEmptyProfile = (): UserProfile => {
  const now = new Date();
  const today = toDateKey(now);
  return {
    id: 'warrior-01',
    displayName: '',
    isLockEnabled: false,
    isOnboardingCompleted: false,
    selectedArchetype: 'EAGLE',
    targetMonthlyIncome: 0,
    sobrietyStartDate: now.toISOString(),
    lastLoginDate: today,
    lastRolloverDate: today,
    lastStreakExtendedDate: undefined,
    tasksCompletedToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    xpPoints: 0,
    warriorRank: computeWarriorRank(0),
    createdAt: now.toISOString()
  };
};

/** Number of past days the rollover will back-fill in one pass. */
const MAX_BACKFILL_DAYS = 60;

/**
 * LocalDatabase — reactive local store.
 */
class LocalDatabase {
  private listeners: Array<() => void> = [];
  private sideEffectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initSeedData();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * INITIALISATION & PERSISTENCE
   * ──────────────────────────────────────────────────────────────────────── */

  private initSeedData(): void {
    if (!this.readRaw(STORAGE_KEYS.PROFILE)) {
      this.writeRaw(STORAGE_KEYS.PROFILE, createEmptyProfile());
    }
    if (!this.readRaw(STORAGE_KEYS.BADGES)) {
      this.writeRaw(STORAGE_KEYS.BADGES, DEFAULT_BADGES);
    }
    if (!this.readRaw(STORAGE_KEYS.ROUTINE_TASKS)) {
      this.writeRaw(STORAGE_KEYS.ROUTINE_TASKS, DEFAULT_ROUTINES);
    }
    localStorage.setItem(STORAGE_KEYS.SCHEMA, String(SCHEMA_VERSION));
  }

  private readRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** Reads and parses a collection, falling back to `fallback` on any error. */
  private read<T>(key: string, fallback: T): T {
    const raw = this.readRaw(key);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : (parsed as T);
    } catch {
      // Corrupt entry — do not throw on every render; fall back and move on.
      console.error(`[db] Corrupt data at ${key}; falling back to empty state.`);
      return fallback;
    }
  }

  private writeRaw(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // QuotaExceededError is the realistic failure here. Surface it rather
      // than silently losing the user's history.
      console.error(`[db] Failed to persist ${key}:`, err);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * REACTIVITY
   * ──────────────────────────────────────────────────────────────────────── */

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notifies UI subscribers synchronously (so React stays responsive), then
   * defers the expensive work — full-state serialisation for the IndexedDB
   * shadow copy and the native widget sync — behind a debounce. Previously both
   * ran inline on every single mutation, including each checkbox tick.
   */
  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[db] Subscriber threw:', err);
      }
    }
    this.scheduleSideEffects();
  }

  private scheduleSideEffects(): void {
    if (this.sideEffectTimer !== null) clearTimeout(this.sideEffectTimer);
    this.sideEffectTimer = setTimeout(() => {
      this.sideEffectTimer = null;
      const run = () => {
        void this.shadowSyncToIndexedDB();
        void this.syncWidgets();
      };
      const ric = (window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (typeof ric === 'function') ric(run, { timeout: 2000 });
      else run();
    }, 400);
  }

  private async syncWidgets(): Promise<void> {
    try {
      await widgetBridge.syncToNativeWidgets(
        this.getProfile(),
        this.getRoutines(),
        this.getIncomeEntries(),
        this.isStreakSecuredToday()
      );
    } catch (err) {
      console.warn('[db] Widget sync failed:', err);
    }
  }

  /** Mirrors the full export into IndexedDB so a localStorage eviction is survivable. */
  private shadowSyncToIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) return resolve();
      try {
        const request = indexedDB.open('sovereign_eagle_vault_v2', 1);
        request.onupgradeneeded = () => {
          const idb = request.result;
          if (!idb.objectStoreNames.contains('snapshots')) {
            idb.createObjectStore('snapshots', { keyPath: 'id' });
          }
        };
        request.onerror = () => resolve();
        request.onsuccess = () => {
          const idb = request.result;
          try {
            const tx = idb.transaction('snapshots', 'readwrite');
            tx.objectStore('snapshots').put({
              id: 'latest_backup',
              data: this.exportDataJSON(),
              timestamp: Date.now()
            });
            tx.oncomplete = () => {
              idb.close();
              resolve();
            };
            tx.onerror = () => {
              idb.close();
              resolve();
            };
          } catch {
            idb.close();
            resolve();
          }
        };
      } catch {
        resolve();
      }
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * PROFILE
   * ──────────────────────────────────────────────────────────────────────── */

  public getProfile(): UserProfile {
    const stored = this.read<Partial<UserProfile> | null>(STORAGE_KEYS.PROFILE, null);
    if (!stored) return createEmptyProfile();
    // Merge over a fresh profile so a field added in a later build is never
    // undefined at a call site that assumes it exists.
    return { ...createEmptyProfile(), ...stored } as UserProfile;
  }

  /**
   * Applies a partial update. `warriorRank` is always recomputed from XP here,
   * so it can never drift into being a stale literal.
   */
  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const merged = { ...current, ...updates };
    merged.warriorRank = computeWarriorRank(merged.xpPoints);
    this.writeRaw(STORAGE_KEYS.PROFILE, merged);
    this.notify();
    return merged;
  }

  public setArchetype(archetype: Archetype): UserProfile {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-archetype', archetype);
    }
    return this.updateProfile({ selectedArchetype: archetype });
  }

  /** Whole days elapsed since the current clean period began. */
  public getDaysSober(): number {
    const profile = this.getProfile();
    if (!profile.isOnboardingCompleted) return 0;
    const start = new Date(profile.sobrietyStartDate).getTime();
    if (!Number.isFinite(start)) return 0;
    const elapsed = Date.now() - start;
    return elapsed <= 0 ? 0 : Math.floor(elapsed / 86_400_000);
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * DAILY ROLLOVER
   * The single place where "a new day started" is handled: history is written,
   * routines are cleared, and a lapsed streak is settled.
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Runs at launch and whenever the app returns to the foreground.
   * Idempotent — calling it repeatedly on the same day does nothing.
   */
  public performDailyRollover(): { rolledOver: boolean; daysMissed: number; streakLapsed: boolean } {
    const profile = this.getProfile();
    const today = toDateKey();
    const lastRollover = profile.lastRolloverDate || today;

    if (lastRollover === today) {
      if (profile.lastLoginDate !== today) this.updateProfile({ lastLoginDate: today });
      return { rolledOver: false, daysMissed: 0, streakLapsed: false };
    }

    const gap = Math.max(0, daysBetween(lastRollover, today));

    // 1. Close out the day that just ended, using its real session records.
    this.writeDailyEntry(lastRollover, { includeCurrentRoutines: true });

    // 2. Back-fill any fully-missed days with genuine zero rows.
    const backfill = Math.min(gap - 1, MAX_BACKFILL_DAYS);
    for (let i = 1; i <= backfill; i++) {
      this.writeDailyEntry(addDays(lastRollover, i), { includeCurrentRoutines: false });
    }

    // 3. Clear the checklist for the new day.
    this.resetDailyRoutines({ silent: true });

    // 4. Settle the engagement streak.
    const lastSecured = profile.lastStreakExtendedDate;
    const daysSinceSecured = lastSecured ? daysBetween(lastSecured, today) : Infinity;
    const streakLapsed = profile.currentStreak > 0 && daysSinceSecured > 1;

    this.updateProfile({
      lastLoginDate: today,
      lastRolloverDate: today,
      tasksCompletedToday: 0,
      currentStreak: streakLapsed ? 0 : profile.currentStreak,
      streakResetReason: streakLapsed
        ? `Streak of ${profile.currentStreak} day${profile.currentStreak === 1 ? '' : 's'} ended — no discipline was logged on ${lastSecured ? addDays(lastSecured, 1) : lastRollover}. Your sobriety count is untouched.`
        : profile.streakResetReason
    });

    return { rolledOver: true, daysMissed: Math.max(0, gap - 1), streakLapsed };
  }

  /**
   * Snapshots one calendar day into history. Session stores are date-stamped so
   * any past date can be reconstructed accurately; routine completion is only
   * knowable for the day being closed, hence the flag.
   */
  private writeDailyEntry(date: string, opts: { includeCurrentRoutines: boolean }): void {
    const entries = this.getDailyEntries();
    if (entries.some((e) => e.date === date)) return; // never overwrite history

    const profile = this.getProfile();
    const walks = this.getWalkSessions().filter((w) => w.date === date && w.completed);
    const focus = this.getFocusSessions().filter((f) => f.date === date && f.completed);
    const sleep = this.getSleepSessions().filter((s) => s.date === date && s.completed);
    const income = this.getIncomeEntries().filter((i) => toDateKey(new Date(i.createdAt)) === date);
    const triggers = this.getTriggers().filter(
      (t) => toDateKey(new Date(t.recordedAt)) === date
    );
    const relapsed = this.getRelapses().some((r) => r.date === date);

    const routines = this.getRoutines();
    const routinesCompleted = opts.includeCurrentRoutines
      ? routines.filter((r) => r.completed).length
      : 0;

    const entry: DailyEntry = {
      id: `day-${date}`,
      date,
      sober: !relapsed,
      walkCompleted: walks.length > 0,
      walkSteps: walks.reduce((sum, w) => sum + w.stepsCount, 0),
      focusCompleted: focus.length > 0,
      focusMinutes: focus.reduce((sum, f) => sum + f.completedMinutes, 0),
      sleepCompleted: sleep.length > 0,
      sleepHours: sleep.length > 0 ? sleep[0].durationHours : 0,
      routinesCompleted,
      routinesTotal: routines.length,
      incomeLogged: income.reduce((sum, i) => sum + i.amount, 0),
      urgesExperienced: triggers.length,
      urgesResisted: triggers.filter((t) => t.resisted).length,
      streakAtEndOfDay: profile.currentStreak,
      xpAtEndOfDay: profile.xpPoints
    };

    // Keep roughly a year of history; beyond that, charts read from aggregates.
    const updated = [entry, ...entries].slice(0, 400);
    this.writeRaw(STORAGE_KEYS.DAILY_ENTRIES, updated);
  }

  public getDailyEntries(): DailyEntry[] {
    return this.read<DailyEntry[]>(STORAGE_KEYS.DAILY_ENTRIES, []);
  }

  /** History for the last `days` calendar days, oldest first, gaps filled with nulls. */
  public getRecentHistory(days: number): Array<{ date: string; entry: DailyEntry | null }> {
    const byDate = new Map(this.getDailyEntries().map((e) => [e.date, e]));
    const today = toDateKey();
    const out: Array<{ date: string; entry: DailyEntry | null }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      out.push({ date, entry: byDate.get(date) ?? null });
    }
    return out;
  }

  /**
   * Live view of today, assembled from session stores rather than history
   * (today has not been rolled over yet, so no DailyEntry exists for it).
   */
  public getTodayMetrics(): DailyEntry {
    const today = toDateKey();
    const profile = this.getProfile();
    const walks = this.getWalkSessions().filter((w) => w.date === today && w.completed);
    const focus = this.getFocusSessions().filter((f) => f.date === today && f.completed);
    const sleep = this.getSleepSessions().filter((s) => s.date === today && s.completed);
    const income = this.getIncomeEntries().filter((i) => toDateKey(new Date(i.createdAt)) === today);
    const triggers = this.getTriggers().filter((t) => toDateKey(new Date(t.recordedAt)) === today);
    const routines = this.getRoutines();

    return {
      id: `day-${today}`,
      date: today,
      sober: !this.getRelapses().some((r) => r.date === today),
      walkCompleted: walks.length > 0,
      walkSteps: walks.reduce((sum, w) => sum + w.stepsCount, 0),
      focusCompleted: focus.length > 0,
      focusMinutes: focus.reduce((sum, f) => sum + f.completedMinutes, 0),
      sleepCompleted: sleep.length > 0,
      sleepHours: sleep.length > 0 ? sleep[0].durationHours : 0,
      routinesCompleted: routines.filter((r) => r.completed).length,
      routinesTotal: routines.length,
      incomeLogged: income.reduce((sum, i) => sum + i.amount, 0),
      urgesExperienced: triggers.length,
      urgesResisted: triggers.filter((t) => t.resisted).length,
      streakAtEndOfDay: profile.currentStreak,
      xpAtEndOfDay: profile.xpPoints
    };
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * STREAK ENGINE
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Records a completed discipline. The first one on any calendar day secures
   * that day and extends the engagement streak.
   *
   * `description` is persisted to the activity log — it used to be computed at
   * every call site and then discarded.
   */
  public recordTaskCompletion(
    description: string,
    xpAwarded: number = 0
  ): { streakExtended: boolean; currentStreak: number } {
    const profile = this.getProfile();
    const today = toDateKey();
    const isFirstToday = profile.lastStreakExtendedDate !== today;

    let currentStreak = profile.currentStreak;

    if (isFirstToday) {
      currentStreak = profile.currentStreak + 1;
      this.updateProfile({
        currentStreak,
        longestStreak: Math.max(currentStreak, profile.longestStreak),
        lastStreakExtendedDate: today,
        lastLoginDate: today,
        tasksCompletedToday: profile.tasksCompletedToday + 1,
        xpPoints: profile.xpPoints + xpAwarded + XP.FIRST_TASK_OF_DAY,
        streakResetReason: undefined
      });
    } else {
      this.updateProfile({
        tasksCompletedToday: profile.tasksCompletedToday + 1,
        lastLoginDate: today,
        xpPoints: profile.xpPoints + xpAwarded
      });
    }

    this.appendActivity(description, xpAwarded + (isFirstToday ? XP.FIRST_TASK_OF_DAY : 0), isFirstToday);
    this.evaluateBadges();

    return { streakExtended: isFirstToday, currentStreak };
  }

  public isStreakSecuredToday(): boolean {
    return this.getProfile().lastStreakExtendedDate === toDateKey();
  }

  /**
   * Records an explicit, user-reported relapse: resets the sobriety anchor and
   * the engagement streak, and files a RelapseEvent for later reflection.
   * This is the only thing that resets days sober.
   */
  public recordRelapse(input: { trigger?: string; reflection?: string }): RelapseEvent {
    const profile = this.getProfile();
    const now = new Date();

    const event: RelapseEvent = {
      id: `relapse-${now.getTime()}`,
      date: toDateKey(now),
      streakLost: profile.currentStreak,
      daysSoberLost: this.getDaysSober(),
      trigger: input.trigger,
      reflection: input.reflection,
      recordedAt: now.toISOString()
    };

    this.writeRaw(STORAGE_KEYS.RELAPSES, [event, ...this.getRelapses()].slice(0, 200));

    this.updateProfile({
      sobrietyStartDate: now.toISOString(),
      currentStreak: 0,
      tasksCompletedToday: 0,
      lastStreakExtendedDate: undefined,
      streakResetReason: undefined
    });

    // Badges track days sober, so re-evaluate: they relock on a reset.
    this.relockBadges();
    this.appendActivity('Relapse recorded — sobriety count restarted', 0, false);

    return event;
  }

  public getRelapses(): RelapseEvent[] {
    return this.read<RelapseEvent[]>(STORAGE_KEYS.RELAPSES, []);
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * ACTIVITY LOG
   * ──────────────────────────────────────────────────────────────────────── */

  private appendActivity(description: string, xpAwarded: number, securedStreak: boolean): void {
    const now = new Date();
    const entry: ActivityLogEntry = {
      id: `act-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      date: toDateKey(now),
      description,
      xpAwarded,
      securedStreak,
      recordedAt: now.toISOString()
    };
    this.writeRaw(STORAGE_KEYS.ACTIVITY_LOG, [entry, ...this.getActivityLog()].slice(0, 300));
  }

  public getActivityLog(): ActivityLogEntry[] {
    return this.read<ActivityLogEntry[]>(STORAGE_KEYS.ACTIVITY_LOG, []);
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * BADGES — keyed to days sober
   * ──────────────────────────────────────────────────────────────────────── */

  public getBadges(): MilestoneBadge[] {
    return this.read<MilestoneBadge[]>(STORAGE_KEYS.BADGES, DEFAULT_BADGES);
  }

  /** Unlocks any badge whose day threshold the current clean period has passed. */
  public evaluateBadges(): MilestoneBadge[] {
    const daysSober = this.getDaysSober();
    const badges = this.getBadges();
    let changed = false;

    const updated = badges.map((b) => {
      if (daysSober >= b.daysRequired && !b.unlocked) {
        changed = true;
        return { ...b, unlocked: true, unlockedAt: toDateKey() };
      }
      return b;
    });

    if (changed) {
      this.writeRaw(STORAGE_KEYS.BADGES, updated);
      this.notify();
    }
    return updated;
  }

  /** Relocks every badge — called when a relapse restarts the clean period. */
  private relockBadges(): void {
    const relocked = this.getBadges().map((b) => ({
      ...b,
      unlocked: false,
      unlockedAt: undefined
    }));
    this.writeRaw(STORAGE_KEYS.BADGES, relocked);
  }

  /** Badges newly unlocked since the caller last checked, for notification purposes. */
  public getNextBadge(): MilestoneBadge | undefined {
    return this.getBadges().find((b) => !b.unlocked);
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * ROUTINES
   * ──────────────────────────────────────────────────────────────────────── */

  public getRoutines(): RoutineTask[] {
    return this.read<RoutineTask[]>(STORAGE_KEYS.ROUTINE_TASKS, DEFAULT_ROUTINES);
  }

  public toggleRoutineTask(id: string): { routines: RoutineTask[]; sequenceValid: boolean } {
    const routines = this.getRoutines();
    const target = routines.find((r) => r.id === id);
    if (!target) return { routines, sequenceValid: true };

    const newCompleted = !target.completed;

    // Morning tasks are a sequence; completing one out of order still counts
    // but earns reduced XP.
    let sequenceValid = true;
    if (target.category === 'MORNING' && newCompleted) {
      const morning = routines
        .filter((r) => r.category === 'MORNING')
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = morning.findIndex((r) => r.id === id);
      sequenceValid = morning.slice(0, idx).every((r) => r.completed);
    }

    const updated = routines.map((r) =>
      r.id === id
        ? {
            ...r,
            completed: newCompleted,
            completedAt: newCompleted
              ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined
          }
        : r
    );

    this.writeRaw(STORAGE_KEYS.ROUTINE_TASKS, updated);

    if (newCompleted) {
      this.recordTaskCompletion(
        `Routine: ${target.name}`,
        sequenceValid ? XP.ROUTINE_IN_ORDER : XP.ROUTINE_OUT_OF_ORDER
      );
    } else {
      this.notify();
    }

    return { routines: updated, sequenceValid };
  }

  /** Clears every checkbox. Called by the rollover, not by the UI. */
  public resetDailyRoutines(opts: { silent?: boolean } = {}): void {
    const cleared = this.getRoutines().map((r) => ({
      ...r,
      completed: false,
      completedAt: undefined
    }));
    this.writeRaw(STORAGE_KEYS.ROUTINE_TASKS, cleared);
    if (!opts.silent) this.notify();
  }

  public addRoutineTask(task: Omit<RoutineTask, 'id' | 'completed'>): RoutineTask {
    const routines = this.getRoutines();
    const newTask: RoutineTask = { ...task, id: `task-${Date.now()}`, completed: false };
    this.writeRaw(STORAGE_KEYS.ROUTINE_TASKS, [...routines, newTask]);
    this.notify();
    return newTask;
  }

  public deleteRoutineTask(id: string): void {
    this.writeRaw(
      STORAGE_KEYS.ROUTINE_TASKS,
      this.getRoutines().filter((r) => r.id !== id)
    );
    this.notify();
  }

  /** Completes the next unchecked habit — used by the home-screen widget action. */
  public completeNextHabit(): RoutineTask | null {
    const next = this.getRoutines()
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find((r) => !r.completed);
    if (!next) return null;
    this.toggleRoutineTask(next.id);
    return next;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * INCOME
   * ──────────────────────────────────────────────────────────────────────── */

  public getIncomeEntries(): IncomeEntry[] {
    return this.read<IncomeEntry[]>(STORAGE_KEYS.INCOME_ENTRIES, []);
  }

  public addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'createdAt'>): IncomeEntry {
    const newEntry: IncomeEntry = {
      ...entry,
      id: `inc-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.writeRaw(STORAGE_KEYS.INCOME_ENTRIES, [newEntry, ...this.getIncomeEntries()]);
    this.recordTaskCompletion(
      `Income logged: ${entry.clientName} (₹${entry.amount.toLocaleString('en-IN')})`,
      XP.INCOME_LOGGED
    );
    return newEntry;
  }

  public deleteIncomeEntry(id: string): void {
    this.writeRaw(
      STORAGE_KEYS.INCOME_ENTRIES,
      this.getIncomeEntries().filter((e) => e.id !== id)
    );
    this.notify();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * TRIGGERS
   * ──────────────────────────────────────────────────────────────────────── */

  public getTriggers(): TriggerLog[] {
    return this.read<TriggerLog[]>(STORAGE_KEYS.TRIGGERS, []);
  }

  public addTrigger(trigger: Omit<TriggerLog, 'id' | 'recordedAt'>): TriggerLog {
    const newTrigger: TriggerLog = {
      ...trigger,
      id: `trig-${Date.now()}`,
      recordedAt: new Date().toISOString()
    };
    this.writeRaw(STORAGE_KEYS.TRIGGERS, [newTrigger, ...this.getTriggers()].slice(0, 500));

    if (trigger.resisted) {
      this.recordTaskCompletion(`Urge resisted: ${trigger.category}`, XP.URGE_RESISTED);
    } else {
      this.notify();
    }
    return newTrigger;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * JOURNAL
   * ──────────────────────────────────────────────────────────────────────── */

  public getJournals(): JournalEntry[] {
    return this.read<JournalEntry[]>(STORAGE_KEYS.JOURNALS, []);
  }

  public addJournal(prompt: string, content: string, sentimentScore: number = 0): JournalEntry {
    const profile = this.getProfile();
    const now = new Date();
    const newJournal: JournalEntry = {
      id: `j-${now.getTime()}`,
      date: toDateKey(now),
      prompt,
      content,
      sentimentScore,
      archetype: profile.selectedArchetype,
      createdAt: now.toISOString()
    };
    this.writeRaw(STORAGE_KEYS.JOURNALS, [newJournal, ...this.getJournals()]);
    this.recordTaskCompletion('Reflection journal saved', XP.JOURNAL_SAVED);
    return newJournal;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * MONITORED DISCIPLINES
   * ──────────────────────────────────────────────────────────────────────── */

  public getWalkSessions(): GpsWalkSession[] {
    return this.read<GpsWalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []);
  }

  /**
   * Saves a walk. Only GPS-verified sessions award XP or secure the streak —
   * an indoor-simulator session is recorded for reference but cannot earn a day.
   */
  public saveWalkSession(session: GpsWalkSession): void {
    this.writeRaw(STORAGE_KEYS.WALK_SESSIONS, [session, ...this.getWalkSessions()].slice(0, 400));

    if (session.completed && session.isVerified) {
      this.recordTaskCompletion(
        `GPS walk: ${session.stepsCount.toLocaleString('en-IN')} steps (${(session.distanceMeters / 1000).toFixed(2)} km)`,
        XP.WALK_VERIFIED
      );
    } else {
      this.notify();
    }
  }

  public getFocusSessions(): FocusSession[] {
    return this.read<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []);
  }

  public saveFocusSession(session: FocusSession): void {
    this.writeRaw(STORAGE_KEYS.FOCUS_SESSIONS, [session, ...this.getFocusSessions()].slice(0, 400));
    if (session.completed) {
      this.recordTaskCompletion(
        `Deep work: ${session.completedMinutes} min focus block`,
        XP.FOCUS_COMPLETED
      );
    } else {
      this.notify();
    }
  }

  public getSleepSessions(): SleepSession[] {
    return this.read<SleepSession[]>(STORAGE_KEYS.SLEEP_SESSIONS, []);
  }

  public saveSleepSession(session: SleepSession): void {
    this.writeRaw(STORAGE_KEYS.SLEEP_SESSIONS, [session, ...this.getSleepSessions()].slice(0, 400));
    if (session.completed) {
      this.recordTaskCompletion(
        `Sleep logged: ${session.durationHours}h (${session.qualityRating}/5)`,
        XP.SLEEP_LOGGED
      );
    } else {
      this.notify();
    }
  }

  public getCoachInsights(): GeminiCoachInsight[] {
    return this.read<GeminiCoachInsight[]>(STORAGE_KEYS.COACH_INSIGHTS, []);
  }

  public saveCoachInsight(insight: GeminiCoachInsight): void {
    const existing = this.getCoachInsights().filter((i) => i.date !== insight.date);
    this.writeRaw(STORAGE_KEYS.COACH_INSIGHTS, [insight, ...existing].slice(0, 14));
    this.notify();
  }

  /**
   * Today's monitored-discipline status. Four disciplines count toward the day:
   * verified walk, deep focus, sleep, and at least one routine task.
   */
  public getTodayDisciplinesStatus(): {
    walkDone: boolean;
    walkSteps: number;
    walkDistanceKm: number;
    focusDone: boolean;
    focusMinutes: number;
    sleepDone: boolean;
    sleepHours: number;
    routinesDone: number;
    totalRoutines: number;
    isStreakSecured: boolean;
    monitoredDoneCount: number;
  } {
    const today = toDateKey();
    // Only verified walks count — see saveWalkSession.
    const walks = this.getWalkSessions().filter(
      (w) => w.date === today && w.completed && w.isVerified
    );
    const focus = this.getFocusSessions().filter((f) => f.date === today && f.completed);
    const sleep = this.getSleepSessions().filter((s) => s.date === today && s.completed);
    const routines = this.getRoutines();
    const routinesDone = routines.filter((r) => r.completed).length;

    const walkSteps = walks.reduce((sum, w) => sum + w.stepsCount, 0);
    const walkMeters = walks.reduce((sum, w) => sum + w.distanceMeters, 0);
    const focusMinutes = focus.reduce((sum, f) => sum + f.completedMinutes, 0);

    const walkDone = walks.length > 0;
    const focusDone = focus.length > 0;
    const sleepDone = sleep.length > 0;

    const monitoredDoneCount =
      (walkDone ? 1 : 0) + (focusDone ? 1 : 0) + (sleepDone ? 1 : 0) + (routinesDone > 0 ? 1 : 0);

    return {
      walkDone,
      walkSteps,
      walkDistanceKm: Math.round((walkMeters / 1000) * 100) / 100,
      focusDone,
      focusMinutes,
      sleepDone,
      sleepHours: sleep.length > 0 ? sleep[0].durationHours : 0,
      routinesDone,
      totalRoutines: routines.length,
      isStreakSecured: this.isStreakSecuredToday(),
      monitoredDoneCount
    };
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * EXPORT / IMPORT
   * ──────────────────────────────────────────────────────────────────────── */

  public exportDataJSON(): string {
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        app: 'sovereign-eagle',
        exportedAt: new Date().toISOString(),
        profile: this.getProfile(),
        badges: this.getBadges(),
        routines: this.getRoutines(),
        dailyEntries: this.getDailyEntries(),
        activityLog: this.getActivityLog(),
        relapses: this.getRelapses(),
        income: this.getIncomeEntries(),
        triggers: this.getTriggers(),
        journals: this.getJournals(),
        walkSessions: this.getWalkSessions(),
        focusSessions: this.getFocusSessions(),
        sleepSessions: this.getSleepSessions()
      },
      null,
      2
    );
  }

  /**
   * Restores from a backup. Validates shape and provenance before touching
   * anything — previously any JSON object carrying a `profile` key would
   * silently overwrite the entire database.
   */
  public importDataJSON(jsonStr: string): { ok: boolean; error?: string } {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { ok: false, error: 'That file is not valid JSON.' };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, error: 'That file is not a Sovereign Eagle backup.' };
    }
    if (parsed.app !== 'sovereign-eagle') {
      return { ok: false, error: 'That backup was not created by Sovereign Eagle.' };
    }
    if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > SCHEMA_VERSION) {
      return {
        ok: false,
        error: 'That backup came from a newer version of the app. Update, then import.'
      };
    }
    const profile = parsed.profile as Partial<UserProfile> | undefined;
    if (!profile || typeof profile !== 'object' || typeof profile.id !== 'string') {
      return { ok: false, error: 'That backup is missing its profile section.' };
    }

    const restore = <T>(key: string, value: unknown, mustBeArray = true): void => {
      if (value === undefined) return;
      if (mustBeArray && !Array.isArray(value)) return;
      this.writeRaw(key, value as T);
    };

    this.writeRaw(STORAGE_KEYS.PROFILE, { ...createEmptyProfile(), ...profile });
    restore(STORAGE_KEYS.BADGES, parsed.badges);
    restore(STORAGE_KEYS.ROUTINE_TASKS, parsed.routines);
    restore(STORAGE_KEYS.DAILY_ENTRIES, parsed.dailyEntries);
    restore(STORAGE_KEYS.ACTIVITY_LOG, parsed.activityLog);
    restore(STORAGE_KEYS.RELAPSES, parsed.relapses);
    restore(STORAGE_KEYS.INCOME_ENTRIES, parsed.income);
    restore(STORAGE_KEYS.TRIGGERS, parsed.triggers);
    restore(STORAGE_KEYS.JOURNALS, parsed.journals);
    restore(STORAGE_KEYS.WALK_SESSIONS, parsed.walkSessions);
    restore(STORAGE_KEYS.FOCUS_SESSIONS, parsed.focusSessions);
    restore(STORAGE_KEYS.SLEEP_SESSIONS, parsed.sleepSessions);

    this.notify();
    return { ok: true };
  }

  public exportIncomeCSV(): string {
    const escape = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const header = 'ID,Date,Client,Source,Amount (INR),Paid,Description\n';
    const rows = this.getIncomeEntries()
      .map((e) =>
        [
          escape(e.id),
          escape(toDateKey(new Date(e.createdAt))),
          escape(e.clientName),
          escape(e.source),
          String(e.amount),
          e.isPaid ? 'YES' : 'NO',
          escape(e.projectDescription || '')
        ].join(',')
      )
      .join('\n');
    return header + rows;
  }

  /** Wipes every local store and returns the app to a first-run state. */
  public factoryReset(): void {
    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* nothing useful to do if removal fails */
      }
    }
    this.initSeedData();
    this.notify();
  }
}

/** Singleton store used across the app. */
export const db = new LocalDatabase();
