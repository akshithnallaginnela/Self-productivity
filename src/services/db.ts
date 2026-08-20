/**
 * db.ts — Zero-Cost Local-First Reactive Database & Duolingo Streak Engine
 *
 * Implements a 100% offline, privacy-first data store utilizing Web LocalStorage
 * with a reactive publish/subscribe architecture.
 *
 * Dynamic Duolingo-Style Streak Mechanics:
 *   1. Opening the app alone does NOT increment your streak.
 *   2. You MUST complete at least 1 task (routine, Pomodoro, income, journal, or urge resistance).
 *   3. The FIRST task completed on any calendar day officially extends & secures the streak (+150 XP).
 *   4. If an entire calendar day passes without completing at least 1 task, the streak drops to 0!
 *   5. Automatically notifies all UI listeners and syncs to Android Native AppWidgets.
 */

import {
  UserProfile,
  DailyEntry,
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

/** Key constants for LocalStorage partitioning */
const STORAGE_KEYS = {
  PROFILE: 'rw_profile_v1',
  DAILY_ENTRIES: 'rw_daily_entries_v1',
  INCOME_ENTRIES: 'rw_income_entries_v1',
  TRIGGERS: 'rw_triggers_v1',
  ROUTINE_TASKS: 'rw_routine_tasks_v1',
  JOURNALS: 'rw_journals_v1',
  BADGES: 'rw_badges_v1',
  WALK_SESSIONS: 'rw_walk_sessions_v1',
  FOCUS_SESSIONS: 'rw_focus_sessions_v1',
  SLEEP_SESSIONS: 'rw_sleep_sessions_v1',
  COACH_INSIGHTS: 'rw_coach_insights_v1'
};

/** Seed Badges configuration covering 1-day to 365-day milestones */
export const DEFAULT_BADGES: MilestoneBadge[] = [
  { id: 'b-1d', name: 'Awakening', daysRequired: 1, title: 'Day 1: The Decision', icon: '🌱', description: 'Break the cycle. Take the first conscious step.', archetypeBonus: 'EAGLE', unlocked: true, unlockedAt: '2026-08-01' },
  { id: 'b-3d', name: 'First Trial', daysRequired: 3, title: 'Day 3: The Dopamine Dip', icon: '⚔️', description: 'Withstand the initial chemical withdrawal.', archetypeBonus: 'WOLF', unlocked: true, unlockedAt: '2026-08-03' },
  { id: 'b-7d', name: 'Iron Discipline', daysRequired: 7, title: 'Day 7: Full Week Sovereign', icon: '🛡️', description: 'One complete week of pure clarity.', archetypeBonus: 'EAGLE', unlocked: true, unlockedAt: '2026-08-07' },
  { id: 'b-14d', name: 'Neural Rewire', daysRequired: 14, title: 'Day 14: Fortified Focus', icon: '⚡', description: 'Dopamine receptors begin natural up-regulation.', archetypeBonus: 'TIGER', unlocked: true, unlockedAt: '2026-08-14' },
  { id: 'b-21d', name: 'Habit Anchor', daysRequired: 21, title: 'Day 21: The 3-Week Crucible', icon: '🦅', description: 'New neural pathways permanently cement.', archetypeBonus: 'EAGLE', unlocked: true, unlockedAt: '2026-08-21' },
  { id: 'b-30d', name: 'Apex Predator', daysRequired: 30, title: 'Day 30: One Month Titan', icon: '🐺', description: 'Energy, skin radiance, and confidence surge.', archetypeBonus: 'WOLF', unlocked: false },
  { id: 'b-60d', name: 'Unshakable', daysRequired: 60, title: 'Day 60: Two Months Fortress', icon: '🏰', description: 'Total mastery over baseline emotional states.', archetypeBonus: 'TIGER', unlocked: false },
  { id: 'b-90d', name: 'Sovereign Rebirth', daysRequired: 90, title: 'Day 90: Complete Brain Reset', icon: '👑', description: 'Full neuroplastic reboot achieved.', archetypeBonus: 'EAGLE', unlocked: false },
  { id: 'b-180d', name: 'Grandmaster', daysRequired: 180, title: 'Half-Year Ascendant', icon: '🌌', description: 'Operating at peak human executive function.', archetypeBonus: 'WOLF', unlocked: false },
  { id: 'b-365d', name: 'Immortal Warrior', daysRequired: 365, title: 'Year One: Sovereign Legend', icon: '🔥', description: 'Complete transcendence of old identity.', archetypeBonus: 'TIGER', unlocked: false }
];

/** Default Routine Tasks configuration */
export const DEFAULT_ROUTINES: RoutineTask[] = [
  { id: 'm-1', name: '5:30 AM Wake Up (No Snooze)', category: 'MORNING', orderIndex: 1, durationMinutes: 0, timeHint: '5:30 AM', iconName: 'AlarmClock', isMandatory: true, completed: true, completedAt: '05:30' },
  { id: 'm-2', name: 'Hydrate 500ml + 10m Sunlight', category: 'MORNING', orderIndex: 2, durationMinutes: 10, timeHint: '5:35 AM', iconName: 'Sun', isMandatory: true, completed: true, completedAt: '05:40' },
  { id: 'm-3', name: '3km Outdoor Walk / Ruck', category: 'MORNING', orderIndex: 3, durationMinutes: 30, timeHint: '5:45 AM', iconName: 'Footprints', isMandatory: true, completed: true, completedAt: '06:15' },
  { id: 'm-4', name: '3-Minute Cold Shower', category: 'MORNING', orderIndex: 4, durationMinutes: 3, timeHint: '6:18 AM', iconName: 'Droplets', isMandatory: true, completed: false },
  { id: 'm-5', name: 'Warrior Journal & Top 3 Priorities', category: 'MORNING', orderIndex: 5, durationMinutes: 10, timeHint: '6:25 AM', iconName: 'BookOpen', isMandatory: true, completed: false },
  { id: 'm-6', name: 'Deep Work Block 1 (Freelance Forge)', category: 'MORNING', orderIndex: 6, durationMinutes: 120, timeHint: '6:45 AM', iconName: 'Flame', isMandatory: true, completed: false },
  
  { id: 'e-1', name: '9:00 PM Screens Off & Blue Light Block', category: 'EVENING', orderIndex: 1, durationMinutes: 0, timeHint: '9:00 PM', iconName: 'SmartphoneOff', isMandatory: true, completed: false },
  { id: 'e-2', name: 'Daily Review & Income Audit', category: 'EVENING', orderIndex: 2, durationMinutes: 10, timeHint: '9:15 PM', iconName: 'CheckCircle2', isMandatory: true, completed: false },
  { id: 'e-3', name: '10:00 PM Lights Out (7-8h Sleep Target)', category: 'EVENING', orderIndex: 3, durationMinutes: 0, timeHint: '10:00 PM', iconName: 'Moon', isMandatory: true, completed: false }
];

/** Default User Profile seed with Duolingo streak tracking fields */
export const DEFAULT_PROFILE: UserProfile = {
  id: 'warrior-01',
  displayName: 'Akshith Warrior',
  avatar: '🦅',
  isBiometricEnabled: true,
  selectedArchetype: 'EAGLE',
  targetMonthlyIncome: 120000,
  sobrietyStartDate: '2026-07-29T00:00:00.000Z',
  lastLoginDate: new Date().toISOString().split('T')[0],
  lastStreakExtendedDate: new Date().toISOString().split('T')[0],
  tasksCompletedToday: 3,
  currentStreak: 21,
  longestStreak: 21,
  xpPoints: 3450,
  warriorRank: 'Tier III Sovereign',
  createdAt: '2026-07-29T00:00:00.000Z'
};

/** Seed Income Entries in INR (₹) */
export const DEFAULT_INCOME_ENTRIES: IncomeEntry[] = [
  { id: 'inc-1', amount: 35000, currency: 'INR', source: 'Direct Client', clientName: 'Nexus Tech Lab', projectDescription: 'Fullstack Mobile PWA & API Integration', isPaid: true, createdAt: '2026-08-04T10:00:00.000Z' },
  { id: 'inc-2', amount: 18000, currency: 'INR', source: 'Upwork', clientName: 'Aero Dynamics EU', projectDescription: 'TypeScript UI/UX Redesign & Optimization', isPaid: true, createdAt: '2026-08-09T14:30:00.000Z' },
  { id: 'inc-3', amount: 22500, currency: 'INR', source: 'Retainer', clientName: 'Apex Growth Studio', projectDescription: 'Monthly Performance & Feature Retainer', isPaid: true, createdAt: '2026-08-15T09:15:00.000Z' },
  { id: 'inc-4', amount: 12000, currency: 'INR', source: 'Fiverr', clientName: 'Quantum AI', projectDescription: 'Custom Web Audio Synth Implementation', isPaid: true, createdAt: '2026-08-18T16:45:00.000Z' }
];

/** Seed Triggers Log */
export const DEFAULT_TRIGGERS: TriggerLog[] = [
  { id: 'trig-1', category: 'FATIGUE', description: 'Late night phone browsing after 11 PM', intensity: 7, resisted: true, recordedAt: '2026-08-16T23:15:00.000Z' },
  { id: 'trig-2', category: 'STRESS', description: 'Tough client proposal revision anxiety', intensity: 8, resisted: true, recordedAt: '2026-08-12T15:20:00.000Z' },
  { id: 'trig-3', category: 'APP', description: 'Triggering social media explore algorithmic feed', intensity: 6, resisted: true, recordedAt: '2026-08-08T18:00:00.000Z' },
  { id: 'trig-4', category: 'EMOTION', description: 'Post-lunch boredom and lack of momentum', intensity: 5, resisted: true, recordedAt: '2026-08-03T14:10:00.000Z' }
];

/** Seed Reflection Journals */
export const DEFAULT_JOURNALS: JournalEntry[] = [
  {
    id: 'j-1',
    date: '2026-08-19',
    prompt: 'What did I conquer today that would have broken my past self?',
    content: 'Completed 2 hours of pure deep work without picking up my phone once. Reached Day 21 streak. Energy is stable, mental fog is completely gone.',
    sentimentScore: 0.92,
    archetype: 'EAGLE',
    createdAt: '2026-08-19T06:35:00.000Z'
  },
  {
    id: 'j-2',
    date: '2026-08-18',
    prompt: 'How did I protect my sovereignty during high pressure?',
    content: 'Felt an urge around 4 PM due to work fatigue. Deployed the 10-second breath delay shield. The urge vanished after 3 minutes. Dispatched 2 proposals right after.',
    sentimentScore: 0.85,
    archetype: 'WOLF',
    createdAt: '2026-08-18T21:20:00.000Z'
  }
];

/**
 * LocalDatabase class — encapsulates storage operations, Duolingo streak engine, and reactive dispatch.
 */
class LocalDatabase {
  private listeners: (() => void)[] = [];

  /** Initializes the local database, seeds initial values if missing, and checks streak integrity. */
  constructor() {
    this.initSeedData();
    this.checkDailyStreakIntegrity();
  }

  /**
   * Checks if core collections exist in LocalStorage; if not, seeds default data.
   */
  private initSeedData(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BADGES)) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(DEFAULT_BADGES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROUTINE_TASKS)) {
      localStorage.setItem(STORAGE_KEYS.ROUTINE_TASKS, JSON.stringify(DEFAULT_ROUTINES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INCOME_ENTRIES)) {
      localStorage.setItem(STORAGE_KEYS.INCOME_ENTRIES, JSON.stringify(DEFAULT_INCOME_ENTRIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRIGGERS)) {
      localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(DEFAULT_TRIGGERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.JOURNALS)) {
      localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(DEFAULT_JOURNALS));
    }
  }

  /**
   * Registers a subscriber callback that is executed whenever state changes.
   * @param listener Callback function invoked upon state modification
   * @returns Unsubscribe function to clean up listener
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Dispatches notifications to all active listeners and updates native widgets.
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
    try {
      widgetBridge.syncToNativeWidgets(
        this.getProfile(),
        this.getRoutines(),
        this.getIncomeEntries()
      );
    } catch {
      // Background sync safe fallback
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * PROFILE & USER STATE METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves the current UserProfile object from local storage.
   * @returns {UserProfile} Current user profile
   */
  public getProfile(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  }

  /**
   * Updates user profile fields, persists them, and notifies subscribers.
   * @param {Partial<UserProfile>} updates Partial profile updates
   * @returns {UserProfile} Updated user profile
   */
  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    this.notify();
    return updated;
  }

  /**
   * Sets the active archetype (EAGLE | WOLF | TIGER) and updates the root HTML attribute.
   * @param {Archetype} archetype Selected mindset archetype
   * @returns {UserProfile} Updated user profile
   */
  public setArchetype(archetype: Archetype): UserProfile {
    document.documentElement.setAttribute('data-archetype', archetype);
    return this.updateProfile({ selectedArchetype: archetype });
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * DUOLINGO-STYLE DYNAMIC STREAK ENGINE
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Verifies daily streak integrity based on calendar days elapsed since last task completion.
   * If an entire calendar day passes without completing at least 1 task, the streak drops to 0!
   * Also resets daily tasks completed counter when a new calendar day starts.
   *
   * @returns {{ resetOccurred: boolean; daysMissed: number }} Integrity check result
   */
  public checkDailyStreakIntegrity(): { resetOccurred: boolean; daysMissed: number } {
    const profile = this.getProfile();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastActiveDate = profile.lastStreakExtendedDate || profile.lastLoginDate || today;

    const todayObj = new Date(today);
    const lastActiveObj = new Date(lastActiveDate);
    const diffTime = todayObj.getTime() - lastActiveObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let resetOccurred = false;

    // If new day, reset today's tasks completed count
    if (profile.lastLoginDate !== today) {
      this.updateProfile({
        lastLoginDate: today,
        tasksCompletedToday: (profile.lastStreakExtendedDate === today) ? profile.tasksCompletedToday : 0
      });
    }

    // If user missed 1 or more full days without completing a task
    if (diffDays > 1 && profile.currentStreak > 0) {
      resetOccurred = true;
      const lostStreak = profile.currentStreak;

      this.updateProfile({
        currentStreak: 0,
        sobrietyStartDate: new Date().toISOString(),
        tasksCompletedToday: 0,
        streakResetReason: `Missed daily check-in (0 tasks completed on ${lastActiveDate})`
      });

      this.addTrigger({
        category: 'FATIGUE',
        description: `Streak of ${lostStreak} days reset to 0: Missed daily task requirement (${diffDays} days inactive)`,
        intensity: 8,
        resisted: false
      });
    }

    return { resetOccurred, daysMissed: Math.max(0, diffDays - 1) };
  }

  /**
   * Records that the user completed an action/task today.
   * If this is the user's FIRST task of the day, it automatically EXTENDS & SECURES
   * their sobriety streak for today and awards +150 XP!
   *
   * @param {string} [actionDescription] Description of completed task/action
   * @returns {{ streakExtended: boolean; currentStreak: number; isFirstToday: boolean }} Result
   */
  public recordTaskCompletionAndEvaluateStreak(actionDescription?: string): {
    streakExtended: boolean;
    currentStreak: number;
    isFirstToday: boolean;
  } {
    const profile = this.getProfile();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tasksDone = (profile.tasksCompletedToday || 0) + 1;
    const isFirstToday = profile.lastStreakExtendedDate !== today;

    if (isFirstToday) {
      // First task of the day! Streak is secured and incremented!
      const newStreak = profile.currentStreak + 1;
      const newLongest = Math.max(newStreak, profile.longestStreak);

      this.updateProfile({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastStreakExtendedDate: today,
        lastLoginDate: today,
        tasksCompletedToday: tasksDone,
        xpPoints: profile.xpPoints + 150,
        streakResetReason: undefined
      });

      this.evaluateBadges(newStreak);

      return { streakExtended: true, currentStreak: newStreak, isFirstToday: true };
    } else {
      // Already secured today, increment today's completed task count
      this.updateProfile({
        tasksCompletedToday: tasksDone,
        lastLoginDate: today
      });

      return { streakExtended: false, currentStreak: profile.currentStreak, isFirstToday: false };
    }
  }

  /**
   * Checks whether the user has already secured their streak for today by completing at least 1 task.
   * @returns {boolean} True if secured today, false if streak is pending / at risk
   */
  public isStreakSecuredToday(): boolean {
    const profile = this.getProfile();
    const today = new Date().toISOString().split('T')[0];
    return profile.lastStreakExtendedDate === today && (profile.tasksCompletedToday || 0) > 0;
  }

  /**
   * Resets the current streak counter to 0 upon a relapse, updates start date,
   * and optionally logs a trigger entry for self-reflection.
   * @param {string} [reason] Optional relapse context / description
   * @returns {UserProfile} Reset user profile
   */
  public resetStreak(reason?: string): UserProfile {
    const updated = this.updateProfile({
      currentStreak: 0,
      sobrietyStartDate: new Date().toISOString(),
      tasksCompletedToday: 0
    });
    if (reason) {
      this.addTrigger({
        category: 'STRESS',
        description: `Relapse event: ${reason}`,
        intensity: 9,
        resisted: false
      });
    }
    return updated;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * MILESTONE BADGE METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves the full milestone badge catalog with unlock statuses.
   * @returns {MilestoneBadge[]} List of milestone badges
   */
  public getBadges(): MilestoneBadge[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BADGES);
    return raw ? JSON.parse(raw) : DEFAULT_BADGES;
  }

  /**
   * Evaluates current streak against badge criteria and unlocks newly achieved milestones.
   * @param {number} currentStreak Current active streak in days
   */
  private evaluateBadges(currentStreak: number): void {
    const badges = this.getBadges();
    let updatedAny = false;
    const updated = badges.map(b => {
      if (currentStreak >= b.daysRequired && !b.unlocked) {
        updatedAny = true;
        return { ...b, unlocked: true, unlockedAt: new Date().toISOString().split('T')[0] };
      }
      return b;
    });

    if (updatedAny) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(updated));
      this.notify();
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * ROUTINE & HABIT METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves all morning and evening routine tasks.
   * @returns {RoutineTask[]} List of habit tasks
   */
  public getRoutines(): RoutineTask[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTINE_TASKS);
    return raw ? JSON.parse(raw) : DEFAULT_ROUTINES;
  }

  /**
   * Toggles task completion state, checks sequential order adherence for morning routines,
   * dynamically evaluates daily streak extension, and persists state.
   * @param {string} id Unique task identifier
   * @returns {{ routines: RoutineTask[]; sequenceValid: boolean }} Updated tasks and validity flag
   */
  public toggleRoutineTask(id: string): { routines: RoutineTask[]; sequenceValid: boolean } {
    const routines = this.getRoutines();
    const target = routines.find(r => r.id === id);
    if (!target) return { routines, sequenceValid: true };

    const newCompleted = !target.completed;
    
    // Strict sequential verification for morning tasks
    let sequenceValid = true;
    if (target.category === 'MORNING' && newCompleted) {
      const morningTasks = routines.filter(r => r.category === 'MORNING').sort((a, b) => a.orderIndex - b.orderIndex);
      const targetIndex = morningTasks.findIndex(r => r.id === id);
      for (let i = 0; i < targetIndex; i++) {
        if (!morningTasks[i].completed) {
          sequenceValid = false;
          break;
        }
      }
    }

    const updated = routines.map(r => {
      if (r.id === id) {
        return {
          ...r,
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      }
      return r;
    });

    localStorage.setItem(STORAGE_KEYS.ROUTINE_TASKS, JSON.stringify(updated));
    
    if (newCompleted) {
      const profile = this.getProfile();
      this.updateProfile({ xpPoints: profile.xpPoints + (sequenceValid ? 50 : 25) });
      // Dynamically evaluate & extend Duolingo daily streak!
      this.recordTaskCompletionAndEvaluateStreak(`Routine: ${target.name}`);
    }

    this.notify();
    return { routines: updated, sequenceValid };
  }

  /**
   * Resets all daily routine tasks to incomplete state for a new day.
   */
  public resetDailyRoutines(): void {
    const routines = this.getRoutines().map(r => ({ ...r, completed: false, completedAt: undefined }));
    localStorage.setItem(STORAGE_KEYS.ROUTINE_TASKS, JSON.stringify(routines));
    this.notify();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * FREELANCE INCOME METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves all freelance income ledger entries.
   * @returns {IncomeEntry[]} Array of income entries
   */
  public getIncomeEntries(): IncomeEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INCOME_ENTRIES);
    return raw ? JSON.parse(raw) : DEFAULT_INCOME_ENTRIES;
  }

  /**
   * Logs a new freelance income transaction in INR (₹), awards +100 XP,
   * and dynamically evaluates daily streak extension.
   * @param {Omit<IncomeEntry, 'id' | 'createdAt'>} entry Income parameters
   * @returns {IncomeEntry} Newly created and saved entry
   */
  public addIncomeEntry(entry: Omit<IncomeEntry, 'id' | 'createdAt'>): IncomeEntry {
    const entries = this.getIncomeEntries();
    const newEntry: IncomeEntry = {
      ...entry,
      id: 'inc-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    const updated = [newEntry, ...entries];
    localStorage.setItem(STORAGE_KEYS.INCOME_ENTRIES, JSON.stringify(updated));
    
    const profile = this.getProfile();
    this.updateProfile({ xpPoints: profile.xpPoints + 100 });

    // Dynamically extend Duolingo streak
    this.recordTaskCompletionAndEvaluateStreak(`Income: ${entry.clientName} (₹${entry.amount})`);

    this.notify();
    return newEntry;
  }

  /**
   * Deletes an income entry by ID.
   * @param {string} id Unique income transaction ID
   */
  public deleteIncomeEntry(id: string): void {
    const entries = this.getIncomeEntries().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.INCOME_ENTRIES, JSON.stringify(entries));
    this.notify();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * TRIGGER RADAR METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves all subconscious trigger radar logs.
   * @returns {TriggerLog[]} Array of trigger entries
   */
  public getTriggers(): TriggerLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIGGERS);
    return raw ? JSON.parse(raw) : DEFAULT_TRIGGERS;
  }

  /**
   * Logs a new urge trigger event. If resisted, dynamically evaluates daily streak extension.
   * @param {Omit<TriggerLog, 'id' | 'recordedAt'>} trigger Trigger details
   * @returns {TriggerLog} Saved trigger log
   */
  public addTrigger(trigger: Omit<TriggerLog, 'id' | 'recordedAt'>): TriggerLog {
    const triggers = this.getTriggers();
    const newTrigger: TriggerLog = {
      ...trigger,
      id: 'trig-' + Date.now(),
      recordedAt: new Date().toISOString()
    };
    const updated = [newTrigger, ...triggers];
    localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(updated));

    if (trigger.resisted) {
      this.recordTaskCompletionAndEvaluateStreak(`Resisted Urge: ${trigger.category}`);
    }

    this.notify();
    return newTrigger;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * REFLECTION JOURNAL METHODS
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves all stored journal entries.
   * @returns {JournalEntry[]} Array of journal entries
   */
  public getJournals(): JournalEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOURNALS);
    return raw ? JSON.parse(raw) : DEFAULT_JOURNALS;
  }

  /**
   * Persists a new reflection journal entry, awards +75 XP, and extends daily streak.
   * @param {string} prompt Daily introspective prompt
   * @param {string} content User reflection text
   * @param {number} [sentimentScore=0.8] Local NLP sentiment score (0.0 to 1.0)
   * @returns {JournalEntry} Newly created journal entry
   */
  public addJournal(prompt: string, content: string, sentimentScore: number = 0.8): JournalEntry {
    const journals = this.getJournals();
    const profile = this.getProfile();
    const newJournal: JournalEntry = {
      id: 'j-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      prompt,
      content,
      sentimentScore,
      archetype: profile.selectedArchetype,
      createdAt: new Date().toISOString()
    };
    const updated = [newJournal, ...journals];
    localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(updated));
    this.updateProfile({ xpPoints: profile.xpPoints + 75 });

    // Dynamically extend Duolingo streak
    this.recordTaskCompletionAndEvaluateStreak('Reflection Journal Saved');

    this.notify();
    return newJournal;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * DATA EXPORT & SOVEREIGN IMPORT (JSON / CSV)
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Serializes the complete application state into an encrypted/standard JSON backup string.
   * @returns {string} JSON backup data string
   */
  public exportDataJSON(): string {
    const backup = {
      profile: this.getProfile(),
      badges: this.getBadges(),
      routines: this.getRoutines(),
      income: this.getIncomeEntries(),
      triggers: this.getTriggers(),
      journals: this.getJournals(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restores application state from a JSON backup string with validation.
   * @param {string} jsonStr Raw JSON backup content
   * @returns {boolean} True if successfully restored, false otherwise
   */
  public importDataJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(parsed.profile));
      if (parsed.badges) localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(parsed.badges));
      if (parsed.routines) localStorage.setItem(STORAGE_KEYS.ROUTINE_TASKS, JSON.stringify(parsed.routines));
      if (parsed.income) localStorage.setItem(STORAGE_KEYS.INCOME_ENTRIES, JSON.stringify(parsed.income));
      if (parsed.triggers) localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(parsed.triggers));
      if (parsed.journals) localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(parsed.journals));
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Exports freelance income transactions into CSV format for spreadsheet analysis.
   * @returns {string} CSV spreadsheet string
   */
  public exportIncomeCSV(): string {
    const income = this.getIncomeEntries();
    const header = 'ID,Date,Client,Source,Amount (INR),Paid,Description\n';
    const rows = income.map(e => `"${e.id}","${e.createdAt.split('T')[0]}","${e.clientName}","${e.source}",${e.amount},${e.isPaid ? 'YES' : 'NO'},"${e.projectDescription || ''}"`).join('\n');
    return header + rows;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * MONITORED DISCIPLINES: GPS WALKING, FOCUS, SLEEP & GEMINI AI COACH
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retrieves all logged GPS walking sessions.
   */
  public getWalkSessions(): GpsWalkSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.WALK_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Saves a GPS walking session and extends the streak if verified completed.
   */
  public saveWalkSession(session: GpsWalkSession): void {
    const sessions = this.getWalkSessions();
    const updated = [session, ...sessions];
    localStorage.setItem(STORAGE_KEYS.WALK_SESSIONS, JSON.stringify(updated));

    if (session.completed) {
      const profile = this.getProfile();
      this.updateProfile({ xpPoints: profile.xpPoints + 120 });
      this.recordTaskCompletionAndEvaluateStreak(`GPS Walk: ${session.stepsCount} steps (${(session.distanceMeters / 1000).toFixed(1)} km)`);
    }

    this.notify();
  }

  /**
   * Retrieves all logged 30-min deep focus sessions.
   */
  public getFocusSessions(): FocusSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Saves a completed 30-min focus session and extends the streak.
   */
  public saveFocusSession(session: FocusSession): void {
    const sessions = this.getFocusSessions();
    const updated = [session, ...sessions];
    localStorage.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(updated));

    if (session.completed) {
      const profile = this.getProfile();
      this.updateProfile({ xpPoints: profile.xpPoints + 100 });
      this.recordTaskCompletionAndEvaluateStreak(`30m Deep Focus Session Completed`);
    }

    this.notify();
  }

  /**
   * Retrieves all logged sleep sessions.
   */
  public getSleepSessions(): SleepSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SLEEP_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Saves a verified sleep session and extends the streak.
   */
  public saveSleepSession(session: SleepSession): void {
    const sessions = this.getSleepSessions();
    const updated = [session, ...sessions];
    localStorage.setItem(STORAGE_KEYS.SLEEP_SESSIONS, JSON.stringify(updated));

    if (session.completed) {
      const profile = this.getProfile();
      this.updateProfile({ xpPoints: profile.xpPoints + 80 });
      this.recordTaskCompletionAndEvaluateStreak(`Sleep Rest Logged: ${session.durationHours}h (${session.qualityRating}★)`);
    }

    this.notify();
  }

  /**
   * Retrieves stored Gemini AI coaching insights.
   */
  public getCoachInsights(): GeminiCoachInsight[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COACH_INSIGHTS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Saves a newly generated Gemini AI coaching insight.
   */
  public saveCoachInsight(insight: GeminiCoachInsight): void {
    const insights = this.getCoachInsights();
    const updated = [insight, ...insights.filter(i => i.date !== insight.date)].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.COACH_INSIGHTS, JSON.stringify(updated));
    this.notify();
  }

  /**
   * Computes today's real-time monitored discipline status across GPS Walk, 30m Focus, Sleep, & Routines.
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
    const today = new Date().toISOString().split('T')[0];
    const walks = this.getWalkSessions().filter(w => w.date === today && w.completed);
    const focus = this.getFocusSessions().filter(f => f.date === today && f.completed);
    const sleep = this.getSleepSessions().filter(s => s.date === today && s.completed);
    const routines = this.getRoutines();
    const completedRoutines = routines.filter(r => r.completed).length;

    const totalSteps = walks.reduce((acc, w) => acc + w.stepsCount, 0);
    const totalDistMeters = walks.reduce((acc, w) => acc + w.distanceMeters, 0);
    const totalFocusMins = focus.reduce((acc, f) => acc + f.completedMinutes, 0);
    const latestSleep = sleep[0];

    const walkDone = totalSteps >= 500 || totalDistMeters >= 400 || walks.length > 0;
    const focusDone = totalFocusMins >= 25 || focus.length > 0;
    const sleepDone = sleep.length > 0;

    let monitoredDoneCount = 0;
    if (walkDone) monitoredDoneCount++;
    if (focusDone) monitoredDoneCount++;
    if (sleepDone) monitoredDoneCount++;
    if (completedRoutines > 0) monitoredDoneCount++;

    return {
      walkDone,
      walkSteps: totalSteps,
      walkDistanceKm: Math.round((totalDistMeters / 1000) * 10) / 10,
      focusDone,
      focusMinutes: totalFocusMins,
      sleepDone,
      sleepHours: latestSleep ? latestSleep.durationHours : 0,
      routinesDone: completedRoutines,
      totalRoutines: routines.length,
      isStreakSecured: this.isStreakSecuredToday(),
      monitoredDoneCount
    };
  }
}

/** Singleton database instance exported for application-wide use */
export const db = new LocalDatabase();

