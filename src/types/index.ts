/**
 * types/index.ts — Domain model for Sovereign Eagle.
 *
 * Two numbers are deliberately kept separate throughout:
 *   • daysSober   — elapsed days since `sobrietyStartDate`. Only an explicit
 *                   relapse resets it. This is the number that matters.
 *   • currentStreak — consecutive days on which at least one discipline was
 *                   completed. Missing a day resets this, and that is fine:
 *                   it measures app engagement, not sobriety.
 * Conflating them means a sober user who skips the app for two days is told
 * they are back to zero, which is actively harmful feedback.
 */

export type Archetype = 'EAGLE' | 'WOLF' | 'TIGER';

export interface UserProfile {
  id: string;
  displayName: string;

  /**
   * App lock. The PIN itself is never stored — only a PBKDF2-derived hash and
   * its per-install salt. See services/appLock.ts.
   */
  pinHash?: string;
  pinSalt?: string;
  isLockEnabled: boolean;

  isOnboardingCompleted: boolean;
  selectedArchetype: Archetype;

  /** Monthly freelance target in INR (₹). 0 means "not set". */
  targetMonthlyIncome: number;

  /** ISO timestamp of the current clean period. Reset only by a relapse. */
  sobrietyStartDate: string;

  /** YYYY-MM-DD — last date the app was opened. */
  lastLoginDate: string;
  /** YYYY-MM-DD — last date the daily rollover ran to completion. */
  lastRolloverDate?: string;
  /** YYYY-MM-DD — last date a discipline secured the streak. */
  lastStreakExtendedDate?: string;

  tasksCompletedToday: number;
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;

  /** Derived from xpPoints — never stored as a fixed literal. */
  warriorRank: string;

  /** Set when a streak lapses; cleared once the user dismisses the notice. */
  streakResetReason?: string;

  /** Optional escalation contact surfaced in the crisis shield. */
  trustedContactName?: string;
  trustedContactPhone?: string;

  createdAt: string;
}

/**
 * One calendar day of history, written by the daily rollover. This is the
 * record every chart in the analytics view reads from.
 */
export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  sober: boolean;
  walkCompleted: boolean;
  walkSteps: number;
  focusCompleted: boolean;
  focusMinutes: number;
  sleepCompleted: boolean;
  sleepHours: number;
  routinesCompleted: number;
  routinesTotal: number;
  incomeLogged: number;
  urgesExperienced: number;
  urgesResisted: number;
  streakAtEndOfDay: number;
  xpAtEndOfDay: number;
  notes?: string;
}

/** Append-only trail of what the user actually did, and when. */
export interface ActivityLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  xpAwarded: number;
  securedStreak: boolean;
  recordedAt: string; // ISO
}

/** An explicit, user-reported relapse. */
export interface RelapseEvent {
  id: string;
  date: string; // YYYY-MM-DD
  streakLost: number;
  daysSoberLost: number;
  trigger?: string;
  reflection?: string;
  recordedAt: string; // ISO
}

export type IncomeSource =
  | 'Upwork'
  | 'Fiverr'
  | 'Direct Client'
  | 'Retainer'
  | 'Consulting'
  | 'Other';

export interface IncomeEntry {
  id: string;
  amount: number; // INR ₹
  currency: string; // 'INR'
  source: IncomeSource;
  clientName: string;
  projectDescription?: string;
  isPaid: boolean;
  createdAt: string; // ISO
}

export type TriggerCategory =
  | 'EMOTION'
  | 'LOCATION'
  | 'APP'
  | 'TIME'
  | 'SOCIAL'
  | 'FATIGUE'
  | 'STRESS';

export interface TriggerLog {
  id: string;
  category: TriggerCategory;
  description: string;
  intensity: number; // 1-10
  resisted: boolean;
  recordedAt: string; // ISO
}

export interface RoutineTask {
  id: string;
  name: string;
  category: 'MORNING' | 'EVENING' | 'CUSTOM';
  orderIndex: number;
  durationMinutes: number;
  timeHint: string;
  iconName: string;
  isMandatory: boolean;
  completed: boolean;
  completedAt?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  prompt: string;
  content: string;
  sentimentScore: number; // -1.0 to 1.0
  archetype: Archetype;
  createdAt: string; // ISO
}

export interface MilestoneBadge {
  id: string;
  name: string;
  daysRequired: number;
  title: string;
  icon: string;
  description: string;
  archetypeBonus: Archetype;
  unlocked: boolean;
  unlockedAt?: string;
}

export type NavigationTab =
  | 'recovery'
  | 'routine'
  | 'income'
  | 'mindset'
  | 'analytics'
  | 'widgets'
  | 'start';

export interface SoundscapeTrack {
  id: string;
  name: string;
  archetype: Archetype;
  frequency: string;
  description: string;
  type: 'sine-binaural' | 'theta-calm' | 'gamma-focus' | 'procedural-rain' | 'deep-drone';
  baseFreq: number;
  beatFreq: number;
  durationMinutes: number;
}

export interface GpsWalkSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime?: string;
  durationSeconds: number;
  distanceMeters: number;
  stepsCount: number;
  targetSteps: number;
  completed: boolean;
  /**
   * True when the session came from the indoor simulator rather than the GPS
   * radio. Unverified sessions are recorded for the user's own reference but
   * never award XP and never secure the streak.
   */
  isVerified: boolean;
  coordinates: Array<{ lat: number; lng: number; timestamp: number }>;
}

export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD
  targetMinutes: number;
  completedMinutes: number;
  completed: boolean;
  timestamp: string; // ISO
  soundTrack?: string;
}

export interface SleepSession {
  id: string;
  date: string; // YYYY-MM-DD
  bedTime: string;
  wakeTime: string;
  durationHours: number;
  qualityRating: number; // 1-5
  windDownMinutes: number;
  completed: boolean;
  loggedAt: string; // ISO
}

export interface GeminiCoachInsight {
  id: string;
  date: string; // YYYY-MM-DD
  archetype: Archetype;
  title: string;
  quote: string;
  dailyDirective: string;
  urgeStrategy: string;
  aiAdvice: string;
  generatedAt: string; // ISO
}

/** Actions a home-screen AppWidget tap can request of the running app. */
export type WidgetAction =
  | 'crisis'
  | 'open-recovery'
  | 'open-routine'
  | 'check-next-habit'
  | 'open-income';
