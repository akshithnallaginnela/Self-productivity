/**
 * RecoveryView.tsx — Duolingo-Style Dynamic Sobriety Streak Dashboard
 *
 * Implements pure Material Design 3 (material.io) layout paradigms & Duolingo streak rules:
 *   1. Dynamic streak tracking: streak ONLY advances when at least 1 task/habit is completed today.
 *   2. Real-time Streak Status Indicator:
 *      - "🔥 Streak Secured Today!" when ≥1 task completed today
 *      - "⚠️ Streak At Risk!" with 1-tap quick actions when pending today's task
 *   3. Confetti celebration cannon upon earning today's streak extension.
 *   4. Milestone Badges chamber with auto-unlock progress.
 *   5. Subconscious Trigger Radar with inline form & resistance logs.
 *
 * 100% dynamic, reactive, and fluidly responsive across all screen dimensions.
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Plus,
  AlertTriangle,
  Trophy,
  Target,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ListTodo,
  BookOpen,
  IndianRupee,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserProfile, MilestoneBadge, TriggerLog, TriggerCategory } from '../../types';
import { db } from '../../services/db';

interface RecoveryViewProps {
  /** Opens the emergency crisis intervention modal (10s urge delay + 4-7-8 breathing) */
  onOpenCrisis: () => void;
}

/**
 * Renders the Duolingo-style Dynamic Recovery Dashboard.
 */
export const RecoveryView: React.FC<RecoveryViewProps> = () => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [badges, setBadges] = useState<MilestoneBadge[]>(db.getBadges());
  const [triggers, setTriggers] = useState<TriggerLog[]>(db.getTriggers());

  /** Inline trigger form visibility */
  const [showTriggerForm, setShowTriggerForm] = useState<boolean>(false);
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory>('STRESS');
  const [triggerDesc, setTriggerDesc] = useState<string>('');
  const [triggerIntensity, setTriggerIntensity] = useState<number>(5);

  /** Checks if streak is already earned today */
  const isSecuredToday = db.isStreakSecuredToday();
  const tasksDoneToday = profile.tasksCompletedToday || 0;

  /**
   * Subscribes to reactive database state updates.
   */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setBadges(db.getBadges());
      setTriggers(db.getTriggers());
    });
    return () => unsub();
  }, []);

  /** Computes the SVG circle progress stroke-dashoffset. */
  const computeRingProgress = (): number => {
    const nextMilestone = badges.find(b => !b.unlocked);
    if (!nextMilestone) return 0;
    const progress = Math.min(1, profile.currentStreak / nextMilestone.daysRequired);
    const circumference = 2 * Math.PI * 52;
    return circumference - (circumference * progress);
  };

  /** Finds the next locked badge target. */
  const getNextMilestone = (): MilestoneBadge | undefined => {
    return badges.find(b => !b.unlocked);
  };

  /**
   * Fires a festive confetti cannon when the daily streak is extended.
   */
  const triggerConfettiCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#b45309', '#f59e0b', '#10b981', '#3b82f6']
    });
  };

  /** Handles logging a new urge trigger event. */
  const handleLogTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerDesc.trim()) return;

    db.addTrigger({
      category: triggerCategory,
      description: triggerDesc,
      intensity: triggerIntensity,
      resisted: true,
    });

    triggerConfettiCelebration();
    setTriggerDesc('');
    setShowTriggerForm(false);
  };

  /** Completes a quick daily check-in habit to extend today's streak */
  const handleQuickCheckin = () => {
    const routines = db.getRoutines();
    const nextPending = routines.find(r => !r.completed);
    if (nextPending) {
      db.toggleRoutineTask(nextPending.id);
    } else {
      // If all routines done, record daily sovereignty check
      db.recordTaskCompletionAndEvaluateStreak('Daily Sovereignty Check-in');
    }
    triggerConfettiCelebration();
  };

  const circumference = 2 * Math.PI * 52;
  const nextMilestone = getNextMilestone();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="md3-section-title">Sobriety Shield</span>
          <h1 className="md3-headline">Recovery Matrix</h1>
        </div>
        <div className="md3-chip md3-chip-filled" style={{ gap: '4px' }}>
          <Zap size={14} color="var(--md-sys-color-primary)" />
          <span>{profile.xpPoints} XP</span>
        </div>
      </div>

      {/* ── Inactivity Streak Reset Alert Notice ───────────────────── */}
      {profile.streakResetReason && (
        <div style={{
          background: 'var(--md-sys-color-error-container)',
          color: 'var(--md-sys-color-on-error-container)',
          borderRadius: 'var(--md-sys-shape-medium)',
          padding: '12px 14px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} />
            <span>{profile.streakResetReason}</span>
          </div>
          <button
            type="button"
            onClick={() => db.updateProfile({ streakResetReason: undefined })}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 800,
              padding: '2px 6px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Hero Streak Container Card (M3 Tinted Container) ───────── */}
      <div className="md3-card-tinted" style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="136" height="136" viewBox="0 0 120 120">
            {/* Background circular track */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(0, 0, 0, 0.08)"
              strokeWidth="8"
            />
            {/* Active progress indicator */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="var(--md-sys-color-on-primary-container)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={computeRingProgress()}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s var(--md-sys-motion-easing-emphasized)' }}
            />
            {/* Center streak days count */}
            <text 
              x="60" y="56" textAnchor="middle"
              fill="var(--md-sys-color-on-primary-container)"
              style={{ fontFamily: 'var(--md-sys-typescale-display-large-font)', fontSize: '38px', fontWeight: 800 }}
            >
              {profile.currentStreak}
            </text>
            <text 
              x="60" y="74" textAnchor="middle"
              fill="var(--md-sys-color-on-primary-container)"
              opacity="0.85"
              style={{ fontFamily: 'var(--md-sys-typescale-label-medium-font)', fontSize: '11px', fontWeight: 700 }}
            >
              DAYS SOBER
            </text>
          </svg>

          {/* Animated flame */}
          <span className="animate-flame" style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            fontSize: '28px'
          }}>
            🔥
          </span>
        </div>

        {/* Streak summary text */}
        <div style={{ marginTop: '12px' }}>
          <p style={{
            fontFamily: 'var(--md-sys-typescale-body-medium-font)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--md-sys-color-on-primary-container)'
          }}>
            Longest Record: <strong>{profile.longestStreak} days</strong> · Rank: <strong>{profile.warriorRank}</strong>
          </p>

          {nextMilestone && (
            <p style={{
              fontFamily: 'var(--md-sys-typescale-label-small-font)',
              fontSize: '12px',
              fontWeight: 600,
              opacity: 0.85,
              marginTop: '4px'
            }}>
              <Target size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
              Next Milestone: {nextMilestone.title} ({nextMilestone.daysRequired - profile.currentStreak}d remaining)
            </p>
          )}
        </div>

        {/* ── Duolingo Daily Streak Dynamic Status Box ─────────────── */}
        <div style={{
          marginTop: '16px',
          padding: '12px 14px',
          background: isSecuredToday ? 'var(--md-sys-color-surface-container-lowest)' : 'rgba(255, 255, 255, 0.65)',
          borderRadius: 'var(--md-sys-shape-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          boxShadow: 'var(--md-sys-elevation-1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--md-sys-shape-full)',
              background: isSecuredToday ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-error-container)',
              color: isSecuredToday ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-error-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isSecuredToday ? <CheckCircle2 size={20} /> : <Flame size={20} />}
            </div>

            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 800,
                color: isSecuredToday ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-error)'
              }}>
                {isSecuredToday ? 'Streak Secured for Today! ✓' : 'Streak Pending for Today!'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                {isSecuredToday
                  ? `${tasksDoneToday} task(s) completed today · Keep going!`
                  : 'Complete at least 1 task today to extend your streak.'}
              </div>
            </div>
          </div>

          {!isSecuredToday && (
            <button
              type="button"
              className="md3-button-filled md3-button-sm"
              onClick={handleQuickCheckin}
              style={{ flexShrink: 0, gap: '4px' }}
            >
              <Sparkles size={13} />
              Complete 1
            </button>
          )}
        </div>
      </div>

      {/* ── Milestone Badges Chamber (M3 Surface Card) ─────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--md-sys-color-primary)" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Milestone Badges
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {badges.filter(b => b.unlocked).length} of {badges.length} Unlocked
          </span>
        </div>

        {/* 5-Column Badges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={badge.unlocked ? `${badge.title} — Unlocked!` : `${badge.title} (${badge.daysRequired}d required)`}
              style={{
                textAlign: 'center',
                padding: '10px 4px',
                borderRadius: 'var(--md-sys-shape-medium)',
                background: badge.unlocked 
                  ? 'var(--md-sys-color-secondary-container)' 
                  : 'var(--md-sys-color-surface-container)',
                border: badge.unlocked 
                  ? '1px solid var(--md-sys-color-primary)' 
                  : '1px solid var(--md-sys-color-outline-variant)',
                opacity: badge.unlocked ? 1 : 0.45,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '22px' }}>{badge.icon}</div>
              <div style={{
                fontFamily: 'var(--md-sys-typescale-label-small-font)',
                fontSize: '10px',
                fontWeight: 800,
                color: badge.unlocked ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
                marginTop: '3px'
              }}>
                {badge.daysRequired}d
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subconscious Trigger Radar (M3 Grouped Card) ──────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--md-sys-color-error)" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Subconscious Trigger Radar
            </h2>
          </div>
          <button
            className="md3-button-tonal md3-button-sm"
            onClick={() => setShowTriggerForm(!showTriggerForm)}
          >
            <Plus size={14} />
            Log Trigger
          </button>
        </div>

        {/* Inline trigger logging form */}
        {showTriggerForm && (
          <form 
            onSubmit={handleLogTrigger} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px',
              background: 'var(--md-sys-color-surface-container)',
              borderRadius: 'var(--md-sys-shape-medium)',
              marginBottom: '12px'
            }}
          >
            <div>
              <label className="md3-field-label">Trigger Domain:</label>
              <select
                className="md3-select"
                value={triggerCategory}
                onChange={(e) => setTriggerCategory(e.target.value as TriggerCategory)}
              >
                <option value="STRESS">Stress & Anxiety</option>
                <option value="FATIGUE">Late Night Fatigue</option>
                <option value="APP">App / Algorithmic Feed</option>
                <option value="EMOTION">Boredom & Emotional Dip</option>
                <option value="SOCIAL">Social Pressure</option>
                <option value="LOCATION">Environment / Location</option>
                <option value="TIME">Time of Day Habit Loop</option>
              </select>
            </div>

            <div>
              <label className="md3-field-label">Trigger Context:</label>
              <input
                type="text"
                required
                className="md3-field-outlined"
                value={triggerDesc}
                onChange={(e) => setTriggerDesc(e.target.value)}
                placeholder="e.g. Late night endless doomscrolling..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
                Urge Intensity: <strong>{triggerIntensity}/10</strong>
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={triggerIntensity}
                onChange={(e) => setTriggerIntensity(parseInt(e.target.value))}
                style={{ width: '130px' }}
              />
            </div>

            <button type="submit" className="md3-button-filled" style={{ marginTop: '4px' }}>
              <ShieldCheck size={16} />
              Log Urge & Resist (+50 XP)
            </button>
          </form>
        )}

        {/* Grouped trigger items */}
        <div className="md3-list-group">
          {triggers.slice(0, 3).map((t) => (
            <div key={t.id} className="md3-list-group-item" style={{ cursor: 'default' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {t.description}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                  {t.category} · Intensity: {t.intensity}/10 · {new Date(t.recordedAt).toLocaleDateString()}
                </div>
              </div>
              <span className="md3-chip md3-chip-filled" style={{ height: '24px', fontSize: '10px' }}>
                Resisted ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
