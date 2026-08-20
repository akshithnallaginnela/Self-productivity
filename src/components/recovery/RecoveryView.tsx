/**
 * RecoveryView.tsx — Monitored Disciplines & Dynamic Sobriety Streak Hub
 *
 * Implements:
 *   1. Monitored Streak Integrity: Streaks ONLY advance when genuine monitored tasks are completed
 *      (GPS Walk, 30m Focus Timer, Sleep Session, or Verified Habit).
 *   2. Real-time Monitored Discipline Verification Hub:
 *      - 🚶‍♂️ GPS Walk Status (Steps & Distance)
 *      - ⏱️ 30m Deep Focus Status
 *      - 🌙 Circadian Sleep Log Status
 *      - ⚡ Sovereign Habit Disciplines
 *   3. Modern Glassmorphic UI with glowing radial progress ring & confetti celebration.
 *   4. Milestone Badges Chamber & Subconscious Trigger Radar.
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
  Footprints,
  Clock,
  Moon,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, MilestoneBadge, TriggerLog, TriggerCategory } from '../../types';
import { db } from '../../services/db';

interface RecoveryViewProps {
  /** Opens the emergency crisis intervention modal (10s urge delay + 4-7-8 breathing) */
  onOpenCrisis: () => void;
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({ onOpenCrisis }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [badges, setBadges] = useState<MilestoneBadge[]>(db.getBadges());
  const [triggers, setTriggers] = useState<TriggerLog[]>(db.getTriggers());
  const [disciplinesStatus, setDisciplinesStatus] = useState(db.getTodayDisciplinesStatus());

  /** Inline trigger form visibility */
  const [showTriggerForm, setShowTriggerForm] = useState<boolean>(false);
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory>('STRESS');
  const [triggerDesc, setTriggerDesc] = useState<string>('');
  const [triggerIntensity, setTriggerIntensity] = useState<number>(5);

  const isSecuredToday = disciplinesStatus.isStreakSecured;

  /**
   * Subscribes to reactive database state updates.
   */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setBadges(db.getBadges());
      setTriggers(db.getTriggers());
      setDisciplinesStatus(db.getTodayDisciplinesStatus());
    });
    return () => unsub();
  }, []);

  /** Computes the SVG circle progress stroke-dashoffset. */
  const computeRingProgress = (): number => {
    const nextMilestone = badges.find((b) => !b.unlocked);
    if (!nextMilestone) return 0;
    const progress = Math.min(1, profile.currentStreak / nextMilestone.daysRequired);
    const circumference = 2 * Math.PI * 52;
    return circumference - circumference * progress;
  };

  const getNextMilestone = (): MilestoneBadge | undefined => {
    return badges.find((b) => !b.unlocked);
  };

  const triggerConfettiCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#b45309', '#f59e0b', '#10b981', '#3b82f6']
    });
  };

  const handleLogTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerDesc.trim()) return;

    db.addTrigger({
      category: triggerCategory,
      description: triggerDesc,
      intensity: triggerIntensity,
      resisted: true
    });

    triggerConfettiCelebration();
    setTriggerDesc('');
    setShowTriggerForm(false);
  };

  const circumference = 2 * Math.PI * 52;
  const nextMilestone = getNextMilestone();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="md3-section-title">Sobriety Shield</span>
          <h1 className="md3-headline">Recovery Matrix</h1>
        </div>
        <div className="md3-chip md3-chip-filled" style={{ gap: '6px', fontWeight: 800 }}>
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
          padding: '12px 16px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              padding: '4px 8px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Hero Streak Container Card (Fluid Modern Aura) ─────────── */}
      <div className="md3-card-tinted" style={{ padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="144" height="144" viewBox="0 0 120 120">
            {/* Background circular track */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgba(0, 0, 0, 0.06)"
              strokeWidth="8"
            />
            {/* Active progress indicator with glowing stroke */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--md-sys-color-on-primary-container)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={computeRingProgress()}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2, 0.0, 0.0, 1.0)' }}
            />
            {/* Center streak days count */}
            <text
              x="60"
              y="56"
              textAnchor="middle"
              fill="var(--md-sys-color-on-primary-container)"
              style={{ fontFamily: 'var(--md-sys-typescale-display-large-font)', fontSize: '38px', fontWeight: 900 }}
            >
              {profile.currentStreak}
            </text>
            <text
              x="60"
              y="74"
              textAnchor="middle"
              fill="var(--md-sys-color-on-primary-container)"
              opacity="0.85"
              style={{ fontFamily: 'var(--md-sys-typescale-label-medium-font)', fontSize: '11px', fontWeight: 800 }}
            >
              DAYS SOBER
            </text>
          </svg>

          {/* Animated flame */}
          <span className="animate-flame" style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            fontSize: '30px'
          }}>
            🔥
          </span>
        </div>

        {/* Streak summary text */}
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--md-sys-color-on-primary-container)' }}>
            Longest Record: <strong>{profile.longestStreak} days</strong> · Rank: <strong>{profile.warriorRank}</strong>
          </p>

          {nextMilestone && (
            <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, marginTop: '4px' }}>
              <Target size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Next Milestone: {nextMilestone.title} ({nextMilestone.daysRequired - profile.currentStreak}d remaining)
            </p>
          )}
        </div>

        {/* ── Monitored Disciplines Status Box ───────────────────────── */}
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: isSecuredToday ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--md-sys-shape-large)',
          textAlign: 'left',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--md-sys-shape-full)',
                background: isSecuredToday ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-error-container)',
                color: isSecuredToday ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-error-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isSecuredToday ? <CheckCircle2 size={22} /> : <Flame size={22} />}
              </div>

              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: isSecuredToday ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-error)'
                }}>
                  {isSecuredToday ? 'Streak Secured for Today! ✓' : 'Streak Verification Pending!'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                  {isSecuredToday
                    ? `${disciplinesStatus.monitoredDoneCount} monitored discipline(s) completed today.`
                    : 'Complete at least 1 verified discipline below to extend your streak:'}
                </div>
              </div>
            </div>
          </div>

          {/* Monitored Verification Checklist Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div style={{
              padding: '8px 10px',
              borderRadius: 'var(--md-sys-shape-medium)',
              background: disciplinesStatus.walkDone ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
              color: disciplinesStatus.walkDone ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <Footprints size={14} />
              <span>{disciplinesStatus.walkDone ? `Walk: ${disciplinesStatus.walkSteps} steps ✓` : 'GPS Walk (3k steps)'}</span>
            </div>

            <div style={{
              padding: '8px 10px',
              borderRadius: 'var(--md-sys-shape-medium)',
              background: disciplinesStatus.focusDone ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
              color: disciplinesStatus.focusDone ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <Clock size={14} />
              <span>{disciplinesStatus.focusDone ? '30m Focus Done ✓' : '30m Focus Timer'}</span>
            </div>

            <div style={{
              padding: '8px 10px',
              borderRadius: 'var(--md-sys-shape-medium)',
              background: disciplinesStatus.sleepDone ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
              color: disciplinesStatus.sleepDone ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <Moon size={14} />
              <span>{disciplinesStatus.sleepDone ? `Sleep: ${disciplinesStatus.sleepHours}h ✓` : 'Sleep & Wind-down'}</span>
            </div>

            <div style={{
              padding: '8px 10px',
              borderRadius: 'var(--md-sys-shape-medium)',
              background: disciplinesStatus.routinesDone > 0 ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
              color: disciplinesStatus.routinesDone > 0 ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              <Zap size={14} />
              <span>{disciplinesStatus.routinesDone > 0 ? `${disciplinesStatus.routinesDone} Habit(s) Done ✓` : 'Sovereign Habits'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Milestone Badges Chamber ───────────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Milestone Badges
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {badges.filter((b) => b.unlocked).length} of {badges.length} Unlocked
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
                opacity: badge.unlocked ? 1 : 0.45,
                transition: 'all 0.2s ease',
                boxShadow: badge.unlocked ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              <div style={{ fontSize: '22px' }}>{badge.icon}</div>
              <div style={{
                fontFamily: 'var(--md-sys-typescale-label-small-font)',
                fontSize: '10px',
                fontWeight: 800,
                color: badge.unlocked ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)',
                marginTop: '4px'
              }}>
                {badge.daysRequired}d
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subconscious Trigger Radar ─────────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--md-sys-color-error)" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Subconscious Trigger Radar
            </h2>
          </div>
          <button
            type="button"
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
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
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

            <button type="submit" className="md3-button-filled md3-button-md" style={{ marginTop: '6px', fontWeight: 800 }}>
              <ShieldCheck size={16} />
              Log Urge & Resist (+50 XP)
            </button>
          </form>
        )}

        {/* Triggers Log Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {triggers.slice(0, 3).map((trig) => (
            <div
              key={trig.id}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--md-sys-shape-medium)',
                background: 'var(--md-sys-color-surface-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="md3-chip" style={{ height: '20px', fontSize: '9px', padding: '0 6px', background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)' }}>
                    {trig.category}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Intensity {trig.intensity}/10
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginTop: '4px' }}>
                  {trig.description}
                </div>
              </div>

              <div style={{ color: 'var(--md-sys-color-tertiary)', fontWeight: 800, fontSize: '11px' }}>
                Resisted ✓
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
