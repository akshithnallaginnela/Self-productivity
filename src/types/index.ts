export type Archetype = 'EAGLE' | 'WOLF' | 'TIGER';

export interface UserProfile {
  id: string;
  displayName: string;
  avatar: string;
  pin?: string;
  isBiometricEnabled: boolean;
  selectedArchetype: Archetype;
  targetMonthlyIncome: number; // in INR (₹)
  sobrietyStartDate: string; // ISO string
  lastLoginDate: string; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;
  warriorRank: string;
  streakResetReason?: string;
  createdAt: string;
}

export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  sober: boolean;
  relapseTime?: string;
  wakeTime?: string;
  bedTime?: string;
  sleepQualityRating?: number; // 1-5
  walkCompleted: boolean;
  workoutCompleted: boolean;
  coldShowerCompleted: boolean;
  sunlightCompleted: boolean;
  deepWorkMinutes: number;
  proposalsSent: number;
  moodRating: number; // 1-10
  urgesExperienced: number;
  urgesResisted: number;
  notes?: string;
  streakAtEndOfDay: number;
}

export type IncomeSource = 'Upwork' | 'Fiverr' | 'Direct Client' | 'Retainer' | 'Consulting' | 'Other';

export interface IncomeEntry {
  id: string;
  amount: number; // In INR ₹
  currency: string; // 'INR'
  source: IncomeSource;
  clientName: string;
  projectDescription?: string;
  isPaid: boolean;
  createdAt: string; // ISO date string
}

export type TriggerCategory = 'EMOTION' | 'LOCATION' | 'APP' | 'TIME' | 'SOCIAL' | 'FATIGUE' | 'STRESS';

export interface TriggerLog {
  id: string;
  category: TriggerCategory;
  description: string;
  intensity: number; // 1-10
  resisted: boolean;
  recordedAt: string;
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
  createdAt: string;
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

export type NavigationTab = 'recovery' | 'routine' | 'income' | 'mindset' | 'analytics' | 'widgets';

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
