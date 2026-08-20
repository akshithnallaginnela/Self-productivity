/**
 * RecoveryView.tsx — the sobriety dashboard.
 *
 * The hero number is DAYS SOBER, derived from the sobriety anchor and reset
 * only by an explicit relapse. The daily streak is shown separately and framed
 * as what it is: engagement momentum. Previously these were the same number,
 * which meant skipping the app for two days told a sober user they were back
 * to zero.
 *
 * Every figure on this screen comes from stored records. There are no
 * placeholder counts — a new install shows genuine empty states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Plus,
  AlertTriangle,
  Target,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Footprints,
  Clock,
  Moon,
  ListChecks,
  ArrowUpRight,
  SlidersHorizontal,
  Bell,
  RotateCcw
} from 'lucide-react';
import { UserProfile, MilestoneBadge, TriggerLog, TriggerCategory } from '../../types';
import { db, nextRankProgress } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { notificationService } from '../../services/notificationService';

interface RecoveryViewProps {
  onOpenCrisis: () => void;
  onOpenRelapse: () => void;
  onOpenNotifications?: () => void;
}

type RecoveryFilter = 'ALL' | 'DISCIPLINES' | 'BADGES' | 'TRIGGERS';

const TRIGGER_OPTIONS: Array<{ value: TriggerCategory; label: string }> = [
  { value: 'STRESS', label: 'Stress and anxiety' },
  { value: 'FATIGUE', label: 'Late-night fatigue' },
  { value: 'APP', label: 'An app or feed' },
  { value: 'EMOTION', label: 'Boredom or low mood' },
  { value: 'SOCIAL', label: 'Social pressure' },
  { value: 'LOCATION', label: 'Environment' },
  { value: 'TIME', label: 'Time-of-day habit' }
];

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  onOpenCrisis,
  onOpenRelapse,
  onOpenNotifications
}) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [badges, setBadges] = useState<MilestoneBadge[]>(db.getBadges());
  const [triggers, setTriggers] = useState<TriggerLog[]>(db.getTriggers());
  const [status, setStatus] = useState(db.getTodayDisciplinesStatus());
  const [daysSober, setDaysSober] = useState(db.getDaysSober());
  const [unreadCount, setUnreadCount] = useState(notificationService.getUnreadCount());
  const [activeFilter, setActiveFilter] = useState<RecoveryFilter>('ALL');

  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory>('STRESS');
  const [triggerDesc, setTriggerDesc] = useState('');
  const [triggerIntensity, setTriggerIntensity] = useState(5);

  const refresh = useCallback(() => {
    setProfile(db.getProfile());
    setBadges(db.getBadges());
    setTriggers(db.getTriggers());
    setStatus(db.getTodayDisciplinesStatus());
    setDaysSober(db.getDaysSober());
  }, []);

  useEffect(() => db.subscribe(refresh), [refresh]);
  useEffect(
    () => notificationService.subscribe((list) => setUnreadCount(list.filter((n) => !n.isRead).length)),
    []
  );

  const isSecuredToday = status.isStreakSecured;
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const nextMilestone = badges.find((b) => !b.unlocked);
  const rank = nextRankProgress(profile.xpPoints);

  /** Progress ring toward the next milestone, in days sober. */
  const RING_RADIUS = 52;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const ringOffset = (() => {
    if (!nextMilestone) return 0;
    const progress = Math.min(1, daysSober / nextMilestone.daysRequired);
    return circumference - circumference * progress;
  })();

  const handleLogTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerDesc.trim()) return;

    db.addTrigger({
      category: triggerCategory,
      description: triggerDesc.trim(),
      intensity: triggerIntensity,
      resisted: true
    });

    audioEngine.playTaskCompleteChime();
    audioEngine.triggerHaptic('success');
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      disableForReducedMotion: true
    });

    setTriggerDesc('');
    setTriggerIntensity(5);
    setShowTriggerForm(false);
  };

  const archetypeEmoji =
    profile.selectedArchetype === 'WOLF' ? '🐺' : profile.selectedArchetype === 'TIGER' ? '🐅' : '🦅';

  const disciplines = [
    { done: status.walkDone, icon: <Footprints size={13} />, label: 'GPS walk', detail: status.walkDone ? `${status.walkSteps.toLocaleString('en-IN')} steps` : 'Not yet' },
    { done: status.focusDone, icon: <Clock size={13} />, label: 'Deep focus', detail: status.focusDone ? `${status.focusMinutes} min` : 'Not yet' },
    { done: status.sleepDone, icon: <Moon size={13} />, label: 'Sleep', detail: status.sleepDone ? `${status.sleepHours}h` : 'Not logged' },
    { done: status.routinesDone > 0, icon: <ListChecks size={13} />, label: 'Routine', detail: `${status.routinesDone}/${status.totalRoutines}` }
  ];

  return (
    <div className="view-stack">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="ref-header">
        <div className="ref-header-identity">
          <div className="ref-avatar-btn" aria-hidden="true">
            <span>{archetypeEmoji}</span>
          </div>
          <div>
            <div className="ref-header-eyebrow">Sobriety shield</div>
            <div className="ref-header-name">{profile.displayName || 'Warrior'}</div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={() => setShowTriggerForm((v) => !v)}
            aria-label="Log an urge"
            aria-expanded={showTriggerForm}
          >
            <Plus size={18} />
          </button>
          <button
            className="ref-circle-btn ref-circle-btn-light"
            onClick={onOpenNotifications}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="ref-badge-dot" />}
          </button>
        </div>
      </div>

      <div className="view-title-row">
        <h1 className="ref-page-title">Recovery</h1>
        <div className="md3-chip md3-chip-filled">
          <Zap size={13} aria-hidden="true" />
          <span>{profile.xpPoints.toLocaleString('en-IN')} XP</span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="ref-filter-bar" role="tablist" aria-label="Recovery sections">
        <button
          className="ref-filter-icon-btn"
          onClick={() => setActiveFilter('ALL')}
          aria-label="Show everything"
        >
          <SlidersHorizontal size={16} />
        </button>
        {([
          ['ALL', 'Overview', `${status.monitoredDoneCount}/4`],
          ['DISCIPLINES', 'Today', String(status.monitoredDoneCount)],
          ['BADGES', 'Milestones', String(unlockedBadges.length)],
          ['TRIGGERS', 'Triggers', String(triggers.length)]
        ] as Array<[RecoveryFilter, string, string]>).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeFilter === key}
            className={`ref-filter-pill ${activeFilter === key ? 'active' : ''}`}
            onClick={() => setActiveFilter(key)}
          >
            <span>{label}</span>
            <span className="ref-filter-count">{count}</span>
          </button>
        ))}
      </div>

      {/* ── Streak lapse notice ─────────────────────────────────────────── */}
      {profile.streakResetReason && (
        <div className="notice notice-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{profile.streakResetReason}</span>
          <button
            type="button"
            className="notice-dismiss"
            onClick={() => db.updateProfile({ streakResetReason: undefined })}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Hero: days sober ────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'DISCIPLINES') && (
        <div className="ref-task-card ref-task-card-tinted hero-card">
          <div className="hero-ring">
            <svg width="150" height="150" viewBox="0 0 120 120" role="img"
                 aria-label={`${daysSober} days sober`}>
              <circle cx="60" cy="60" r={RING_RADIUS} fill="none"
                      stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" />
              <circle
                cx="60" cy="60" r={RING_RADIUS} fill="none"
                stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 60 60)"
                className="hero-ring-progress"
              />
              <text x="60" y="57" textAnchor="middle" className="hero-ring-value">
                {daysSober}
              </text>
              <text x="60" y="74" textAnchor="middle" className="hero-ring-label">
                {daysSober === 1 ? 'DAY SOBER' : 'DAYS SOBER'}
              </text>
            </svg>
          </div>

          <p className="hero-subline">
            {profile.warriorRank}
            {rank.nextTitle && (
              <span className="hero-subline-muted">
                {' '}· {rank.xpRemaining.toLocaleString('en-IN')} XP to {rank.nextTitle}
              </span>
            )}
          </p>

          {nextMilestone ? (
            <p className="hero-milestone">
              <Target size={12} aria-hidden="true" />
              Next: {nextMilestone.title} — {Math.max(0, nextMilestone.daysRequired - daysSober)} day
              {nextMilestone.daysRequired - daysSober === 1 ? '' : 's'} to go
            </p>
          ) : (
            <p className="hero-milestone">Every milestone unlocked. Extraordinary.</p>
          )}

          {/* Today's disciplines */}
          <div className="hero-today">
            <div className="hero-today-head">
              <div
                className={`hero-today-badge ${isSecuredToday ? 'secured' : 'pending'}`}
                aria-hidden="true"
              >
                {isSecuredToday ? <CheckCircle2 size={18} /> : <Flame size={18} />}
              </div>
              <div>
                <div className="hero-today-title">
                  {isSecuredToday ? 'Today is secured' : 'Today is not secured yet'}
                </div>
                <div className="hero-today-sub">
                  {status.monitoredDoneCount} of 4 disciplines ·{' '}
                  {profile.currentStreak} day streak
                </div>
              </div>
            </div>

            <div className="hero-discipline-grid">
              {disciplines.map((d) => (
                <div key={d.label} className={`hero-discipline ${d.done ? 'done' : ''}`}>
                  {d.icon}
                  <span className="hero-discipline-label">{d.label}</span>
                  <span className="hero-discipline-detail">{d.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="hero-actions">
            <button type="button" className="md3-button-filled" onClick={onOpenCrisis}>
              <ShieldCheck size={16} aria-hidden="true" />
              Crisis shield
            </button>
            <button type="button" className="md3-button-text hero-relapse" onClick={onOpenRelapse}>
              <RotateCcw size={14} aria-hidden="true" />
              Log a relapse
            </button>
          </div>
        </div>
      )}

      {/* ── Milestones ──────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'BADGES') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">Milestones</div>
            <span className="ref-task-review-badge">
              {unlockedBadges.length}/{badges.length} unlocked
            </span>
          </div>

          <div className="badge-grid">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`badge-cell ${badge.unlocked ? 'unlocked' : ''}`}
                title={
                  badge.unlocked
                    ? `${badge.title} — unlocked ${badge.unlockedAt}`
                    : `${badge.title} — ${badge.daysRequired} days sober required`
                }
              >
                <div className="badge-icon" aria-hidden="true">{badge.icon}</div>
                <div className="badge-days">{badge.daysRequired}d</div>
              </div>
            ))}
          </div>

          {unlockedBadges.length === 0 && (
            <p className="empty-hint">
              Your first milestone unlocks after one full day. It is counted from your
              sobriety start date, not from app activity.
            </p>
          )}
        </div>
      )}

      {/* ── Trigger radar ───────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'TRIGGERS') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">Trigger radar</div>
            <button
              type="button"
              className="md3-button-tonal md3-button-sm"
              onClick={() => setShowTriggerForm((v) => !v)}
            >
              <Plus size={14} aria-hidden="true" />
              Log
            </button>
          </div>

          {showTriggerForm && (
            <form onSubmit={handleLogTrigger} className="inline-form">
              <div>
                <label className="md3-field-label" htmlFor="trigger-domain">Trigger</label>
                <select
                  id="trigger-domain"
                  className="md3-select"
                  value={triggerCategory}
                  onChange={(e) => setTriggerCategory(e.target.value as TriggerCategory)}
                >
                  {TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="md3-field-label" htmlFor="trigger-context">What happened?</label>
                <input
                  id="trigger-context"
                  type="text"
                  required
                  className="md3-field-outlined"
                  value={triggerDesc}
                  onChange={(e) => setTriggerDesc(e.target.value)}
                  placeholder="Scrolling late at night"
                />
              </div>

              <div className="range-row">
                <label className="md3-field-label" htmlFor="trigger-intensity">
                  Intensity: <strong>{triggerIntensity}/10</strong>
                </label>
                <input
                  id="trigger-intensity"
                  type="range"
                  min={1}
                  max={10}
                  value={triggerIntensity}
                  onChange={(e) => setTriggerIntensity(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="md3-button-filled">
                <ShieldCheck size={16} aria-hidden="true" />
                Log as resisted
              </button>
            </form>
          )}

          {triggers.length === 0 ? (
            <p className="empty-hint">
              Nothing logged yet. Recording an urge — resisted or not — is what makes the
              pattern visible in your analytics later.
            </p>
          ) : (
            <div className="trigger-list">
              {triggers.slice(0, 5).map((trig) => (
                <div key={trig.id} className="trigger-row">
                  <div className="trigger-row-main">
                    <div className="trigger-row-meta">
                      <span className={`md3-chip trigger-chip ${trig.resisted ? '' : 'not-resisted'}`}>
                        {trig.category}
                      </span>
                      <span className="trigger-intensity">Intensity {trig.intensity}/10</span>
                    </div>
                    <div className="trigger-row-desc">{trig.description}</div>
                  </div>
                  <div className={`trigger-outcome ${trig.resisted ? 'resisted' : 'not-resisted'}`}>
                    {trig.resisted ? 'Resisted' : 'Relapse'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {triggers.length > 5 && (
            <button
              type="button"
              className="md3-button-text card-more"
              onClick={() => setActiveFilter('TRIGGERS')}
            >
              {triggers.length - 5} more
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
