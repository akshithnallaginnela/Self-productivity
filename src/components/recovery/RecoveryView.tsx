/**
 * RecoveryView.tsx — Monitored Disciplines & Dynamic Sobriety Streak Hub
 *
 * Implements the reference bento layout & organization:
 *   1. Reference Top Header Bar with spirit avatar & quick action controls
 *   2. Dual-Tone Filter Chips Bar ([ All | 8 ], [ Disciplines | 4 ], etc.)
 *   3. Hero Sobriety Shield with glowing progress ring & confetti celebration
 *   4. Monitored Disciplines Bento Card with ↗ action button & striped progress bar
 *   5. Milestone Badges Chamber & Subconscious Trigger Radar
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
  ArrowUpRight,
  ShieldAlert,
  SlidersHorizontal,
  Bell
} from 'lucide-react';
import { UserProfile, MilestoneBadge, TriggerLog, TriggerCategory } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';

interface RecoveryViewProps {
  onOpenCrisis: () => void;
}

type RecoveryFilter = 'ALL' | 'DISCIPLINES' | 'BADGES' | 'TRIGGERS';

export const RecoveryView: React.FC<RecoveryViewProps> = ({ onOpenCrisis }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [badges, setBadges] = useState<MilestoneBadge[]>(db.getBadges());
  const [triggers, setTriggers] = useState<TriggerLog[]>(db.getTriggers());
  const [disciplinesStatus, setDisciplinesStatus] = useState(db.getTodayDisciplinesStatus());
  const [activeFilter, setActiveFilter] = useState<RecoveryFilter>('ALL');

  /** Inline trigger form visibility */
  const [showTriggerForm, setShowTriggerForm] = useState<boolean>(false);
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory>('STRESS');
  const [triggerDesc, setTriggerDesc] = useState<string>('');
  const [triggerIntensity, setTriggerIntensity] = useState<number>(5);

  const isSecuredToday = disciplinesStatus.isStreakSecured;

  /** Subscribes to reactive database state updates. */
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
      
      {/* ── Reference Top Header Bar ───────────────────────────────── */}
      <div className="ref-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="ref-avatar-btn">
            <span style={{ fontSize: '20px' }}>
              {profile.selectedArchetype === 'WOLF' ? '🐺' : profile.selectedArchetype === 'TIGER' ? '🐅' : '🦅'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Sobriety Shield
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              {profile.displayName || 'Sovereign Warrior'}
            </div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={() => setShowTriggerForm(!showTriggerForm)}
            title="Log Urge & Trigger"
            aria-label="Log trigger"
          >
            <Plus size={18} />
          </button>
          <div className="ref-circle-btn ref-circle-btn-light" title="Notifications">
            <Bell size={18} />
            <div className="ref-badge-dot" />
          </div>
        </div>
      </div>

      {/* ── Page Title ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="ref-page-title" style={{ margin: 0 }}>
          Recovery Matrix
        </h1>
        <div className="md3-chip md3-chip-filled" style={{ gap: '4px', fontWeight: 800 }}>
          <Zap size={13} color="var(--md-sys-color-primary)" />
          <span>{profile.xpPoints} XP</span>
        </div>
      </div>

      {/* ── Dual-Tone Filter Chips Bar (Screen 1) ────────────────────── */}
      <div className="ref-filter-bar">
        <button
          className="ref-filter-icon-btn"
          onClick={() => setActiveFilter('ALL')}
          title="Reset filter"
          aria-label="Filter"
        >
          <SlidersHorizontal size={16} />
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          <span>All Overview</span>
          <span className="ref-filter-count">{disciplinesStatus.monitoredDoneCount}/4</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'DISCIPLINES' ? 'active' : ''}`}
          onClick={() => setActiveFilter('DISCIPLINES')}
        >
          <span>Disciplines</span>
          <span className="ref-filter-count">{disciplinesStatus.monitoredDoneCount}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'BADGES' ? 'active' : ''}`}
          onClick={() => setActiveFilter('BADGES')}
        >
          <span>Milestones</span>
          <span className="ref-filter-count">{badges.filter((b) => b.unlocked).length}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'TRIGGERS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('TRIGGERS')}
        >
          <span>Triggers</span>
          <span className="ref-filter-count">{triggers.length}</span>
        </button>
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
      {(activeFilter === 'ALL' || activeFilter === 'DISCIPLINES') && (
        <div className="ref-task-card ref-task-card-tinted" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <svg width="144" height="144" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="rgba(0, 0, 0, 0.06)"
                strokeWidth="8"
              />
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

            <span className="animate-flame" style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              fontSize: '30px'
            }}>
              🔥
            </span>
          </div>

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

          {/* Verification Checklist Badges */}
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isSecuredToday ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-error-container)',
                  color: isSecuredToday ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-error-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSecuredToday ? <CheckCircle2 size={18} /> : <Flame size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: isSecuredToday ? '#0f172a' : 'var(--md-sys-color-error)' }}>
                    {isSecuredToday ? 'Streak Secured for Today! ✓' : 'Verification Pending'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {disciplinesStatus.monitoredDoneCount} of 4 verified disciplines complete.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
              <div style={{
                padding: '6px 8px',
                borderRadius: '12px',
                background: disciplinesStatus.walkDone ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
                color: disciplinesStatus.walkDone ? 'var(--md-sys-color-on-tertiary-container)' : '#64748b',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Footprints size={13} />
                <span>Walk (3k steps) {disciplinesStatus.walkDone ? '✓' : ''}</span>
              </div>

              <div style={{
                padding: '6px 8px',
                borderRadius: '12px',
                background: disciplinesStatus.focusDone ? 'var(--md-sys-color-tertiary-container)' : 'rgba(0,0,0,0.03)',
                color: disciplinesStatus.focusDone ? 'var(--md-sys-color-on-tertiary-container)' : '#64748b',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Clock size={13} />
                <span>30m Focus {disciplinesStatus.focusDone ? '✓' : ''}</span>
              </div>
            </div>
          </div>

          {/* Sub-tray: Striped progress bar */}
          <div className="ref-card-tray" style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="ref-avatar-stack">
                <div className="ref-avatar-stack-item">🦅</div>
                <div className="ref-avatar-stack-item">🔥</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {disciplinesStatus.monitoredDoneCount}/4 Disciplines
              </span>
            </div>

            <div className="ref-progress-striped">
              <div
                className="ref-progress-striped-fill"
                style={{ width: `${Math.round((disciplinesStatus.monitoredDoneCount / 4) * 100)}%` }}
              />
              <span className="ref-progress-striped-text">
                {isSecuredToday ? 'Streak Secured' : 'Extend Today'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Milestone Badges Chamber ───────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'BADGES') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              Milestone Badges Chamber
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {badges.filter((b) => b.unlocked).length}/{badges.length} Unlocked
              </span>
              <button
                className="ref-arrow-btn"
                onClick={() => {
                  setActiveFilter(activeFilter === 'BADGES' ? 'ALL' : 'BADGES');
                  audioEngine.triggerHaptic('light');
                }}
                aria-label="View badges"
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                title={badge.unlocked ? `${badge.title} — Unlocked!` : `${badge.title} (${badge.daysRequired}d required)`}
                style={{
                  textAlign: 'center',
                  padding: '10px 4px',
                  borderRadius: '16px',
                  background: badge.unlocked
                    ? 'var(--md-sys-color-secondary-container)'
                    : '#f1f5f9',
                  opacity: badge.unlocked ? 1 : 0.45,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '22px' }}>{badge.icon}</div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: badge.unlocked ? 'var(--md-sys-color-on-secondary-container)' : '#64748b',
                  marginTop: '4px'
                }}>
                  {badge.daysRequired}d
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subconscious Trigger Radar ─────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'TRIGGERS') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              Subconscious Trigger Radar
            </div>
            <div className="ref-task-card-actions">
              <button
                type="button"
                className="md3-button-tonal md3-button-sm"
                onClick={() => setShowTriggerForm(!showTriggerForm)}
              >
                <Plus size={14} />
                Log
              </button>
            </div>
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
                background: '#f8fafc',
                borderRadius: '18px',
                marginBottom: '10px'
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  Urge Intensity: <strong>{triggerIntensity}/10</strong>
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={triggerIntensity}
                  onChange={(e) => setTriggerIntensity(parseInt(e.target.value))}
                  style={{ width: '120px' }}
                />
              </div>

              <button type="submit" className="md3-button-filled md3-button-md" style={{ marginTop: '4px', fontWeight: 800 }}>
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
                  borderRadius: '16px',
                  background: '#f8fafc',
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      Intensity {trig.intensity}/10
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
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
      )}

    </div>
  );
};
