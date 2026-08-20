/**
 * RoutineView.tsx — daily checklist, focus block, walk and sleep.
 *
 * Two corrections over the previous version:
 *
 * 1. THE CALENDAR IS REAL. It renders the actual current month, with the 1st
 *    under its true weekday, and marks days from stored history. It previously
 *    drew a fixed 1-31 grid starting under "S" and marked every even-numbered
 *    past day complete via `day % 2 === 0`.
 *
 * 2. THE FOCUS TIMER IS WALL-CLOCK. Remaining time is derived from a start
 *    timestamp, so backgrounding the app no longer loses minutes — Android
 *    throttles timers in hidden WebViews, and the old tick-counting loop
 *    silently under-counted every session where the screen went off.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sun,
  Moon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  Bell,
  Plus,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import { RoutineTask, FocusSession, UserProfile } from '../../types';
import { db, toDateKey } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { androidSystem } from '../../services/androidSystem';
import { notificationService } from '../../services/notificationService';
import { GpsWalkTracker } from './GpsWalkTracker';
import { SleepTrackerCard } from './SleepTrackerCard';

type RoutineFilter = 'ALL' | 'MORNING' | 'EVENING' | 'FOCUS' | 'WALK' | 'SLEEP';

interface RoutineViewProps {
  onOpenNotifications?: () => void;
}

const FOCUS_PRESETS = [15, 25, 30, 45];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const RoutineView: React.FC<RoutineViewProps> = ({ onOpenNotifications }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [routines, setRoutines] = useState<RoutineTask[]>(db.getRoutines());
  const [status, setStatus] = useState(db.getTodayDisciplinesStatus());
  const [history, setHistory] = useState(db.getDailyEntries());
  const [unreadCount, setUnreadCount] = useState(notificationService.getUnreadCount());

  const [activeFilter, setActiveFilter] = useState<RoutineFilter>('ALL');
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Add-habit dialog ─────────────────────────────────────────────────── */
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<RoutineTask['category']>('MORNING');
  const [newHabitTime, setNewHabitTime] = useState('07:00 AM');
  const [newHabitDuration, setNewHabitDuration] = useState(15);

  /* ── Focus timer (wall-clock) ─────────────────────────────────────────── */
  const [focusTargetMinutes, setFocusTargetMinutes] = useState(30);
  const [focusEndsAt, setFocusEndsAt] = useState<number | null>(null);
  const [focusRemaining, setFocusRemaining] = useState(30 * 60);

  const refresh = useCallback(() => {
    setProfile(db.getProfile());
    setRoutines(db.getRoutines());
    setStatus(db.getTodayDisciplinesStatus());
    setHistory(db.getDailyEntries());
  }, []);

  useEffect(() => db.subscribe(refresh), [refresh]);
  useEffect(
    () =>
      notificationService.subscribe((list) =>
        setUnreadCount(list.filter((n) => !n.isRead).length)
      ),
    []
  );
  useEffect(
    () => () => {
      if (warningTimer.current) clearTimeout(warningTimer.current);
    },
    []
  );

  /**
   * Ticks the display and detects completion. Remaining time is recomputed
   * from `focusEndsAt` each tick rather than decremented, so a throttled or
   * skipped tick costs nothing.
   */
  useEffect(() => {
    if (focusEndsAt === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((focusEndsAt - Date.now()) / 1000));
      setFocusRemaining(remaining);

      if (remaining === 0) {
        setFocusEndsAt(null);
        audioEngine.stop();
        audioEngine.playMilestoneTriumph();
        audioEngine.triggerHaptic('success');
        androidSystem.releaseWakeLock();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, disableForReducedMotion: true });

        const session: FocusSession = {
          id: `focus-${Date.now()}`,
          date: toDateKey(),
          targetMinutes: focusTargetMinutes,
          completedMinutes: focusTargetMinutes,
          completed: true,
          timestamp: new Date().toISOString(),
          soundTrack: 'track-gamma'
        };
        db.saveFocusSession(session);
        void notificationService.sendImmediateNotification(
          'Focus block complete',
          `${focusTargetMinutes} minutes done.`,
          'FOCUS'
        );
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [focusEndsAt, focusTargetMinutes]);

  // Recompute immediately on resume so the readout is never stale.
  useEffect(
    () =>
      androidSystem.onResume(() => {
        if (focusEndsAt !== null) {
          setFocusRemaining(Math.max(0, Math.ceil((focusEndsAt - Date.now()) / 1000)));
        }
      }),
    [focusEndsAt]
  );

  const isFocusActive = focusEndsAt !== null;

  const handleToggleFocus = () => {
    if (isFocusActive) {
      setFocusEndsAt(null);
      audioEngine.stop();
      androidSystem.releaseWakeLock();
      audioEngine.triggerHaptic('light');
    } else {
      setFocusEndsAt(Date.now() + focusRemaining * 1000);
      audioEngine.playTrack('track-gamma');
      audioEngine.triggerHaptic('medium');
      void androidSystem.requestWakeLock();
    }
  };

  const handleResetFocus = (minutes: number) => {
    setFocusEndsAt(null);
    audioEngine.stop();
    androidSystem.releaseWakeLock();
    setFocusTargetMinutes(minutes);
    setFocusRemaining(minutes * 60);
    audioEngine.triggerHaptic('light');
  };

  const handleToggleTask = (id: string) => {
    const { routines: updated, sequenceValid } = db.toggleRoutineTask(id);
    const task = updated.find((r) => r.id === id);

    if (task?.completed) audioEngine.playTaskCompleteChime();
    else audioEngine.triggerHaptic('light');

    if (!sequenceValid) {
      setOrderWarning('Completed out of order — reduced XP for this one.');
      if (warningTimer.current) clearTimeout(warningTimer.current);
      warningTimer.current = setTimeout(() => setOrderWarning(null), 3500);
    }
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const sameCategory = routines.filter((r) => r.category === newHabitCategory);
    db.addRoutineTask({
      name: newHabitName.trim(),
      category: newHabitCategory,
      orderIndex: sameCategory.length + 1,
      durationMinutes: newHabitDuration,
      timeHint: newHabitTime.trim(),
      iconName: 'Sparkles',
      isMandatory: false
    });

    audioEngine.playTaskCompleteChime();
    audioEngine.triggerHaptic('success');
    setNewHabitName('');
    setShowAddHabit(false);
  };

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}`;
  };

  const morningTasks = routines
    .filter((r) => r.category === 'MORNING')
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const eveningTasks = routines
    .filter((r) => r.category === 'EVENING')
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const customTasks = routines
    .filter((r) => r.category === 'CUSTOM')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const focusTotal = focusTargetMinutes * 60;
  const focusProgress =
    focusTotal === 0 ? 0 : Math.round(((focusTotal - focusRemaining) / focusTotal) * 100);

  /* ── Real month calendar ──────────────────────────────────────────────── */
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leadingBlanks = monthStart.getDay(); // 0 = Sunday, matching WEEKDAY_LABELS

  const historyByDate = new Map(history.map((h) => [h.date, h]));
  const todayKey = toDateKey(today);

  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const renderTaskList = (tasks: RoutineTask[]) => (
    <div className="task-list">
      {tasks.map((task) => (
        <div key={task.id} className={`task-row ${task.completed ? 'completed' : ''}`}>
          <button
            type="button"
            className="task-row-main"
            onClick={() => handleToggleTask(task.id)}
            aria-pressed={task.completed}
          >
            <span className={`task-checkbox ${task.completed ? 'checked' : ''}`} aria-hidden="true">
              {task.completed && <CheckCircle2 size={16} />}
            </span>
            <span className="task-row-text">
              <span className="task-name">{task.name}</span>
              <span className="task-meta">
                {task.timeHint}
                {task.durationMinutes > 0 ? ` · ${task.durationMinutes}m` : ''}
                {task.completedAt ? ` · done ${task.completedAt}` : ''}
              </span>
            </span>
          </button>

          {!task.isMandatory && (
            <button
              type="button"
              className="task-delete"
              onClick={() => {
                db.deleteRoutineTask(task.id);
                audioEngine.triggerHaptic('light');
              }}
              aria-label={`Delete ${task.name}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const progressBar = (done: number, total: number, doneLabel: string, pendingLabel: string) => (
    <div className="ref-card-tray">
      <span className="tray-count">
        {done} of {total}
      </span>
      <div className="ref-progress-striped">
        <div
          className="ref-progress-striped-fill"
          style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%` }}
        />
        <span className="ref-progress-striped-text">
          {total > 0 && done === total ? doneLabel : pendingLabel}
        </span>
      </div>
    </div>
  );

  return (
    <div className="view-stack">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="ref-header">
        <div className="ref-header-identity">
          <div className="ref-avatar-btn" aria-hidden="true">
            <span>
              {profile.selectedArchetype === 'WOLF'
                ? '🐺'
                : profile.selectedArchetype === 'TIGER'
                  ? '🐅'
                  : '🦅'}
            </span>
          </div>
          <div>
            <div className="ref-header-eyebrow">Daily disciplines</div>
            <div className="ref-header-name">{profile.displayName || 'Warrior'}</div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={() => setShowAddHabit(true)}
            aria-label="Add a habit"
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
        <h1 className="ref-page-title">Today</h1>
        <span className="view-title-meta">{status.monitoredDoneCount}/4 disciplines</span>
      </div>

      {/* ── Month calendar ──────────────────────────────────────────────── */}
      <div className="ref-calendar-container">
        <div className="ref-calendar-header">
          <span className="calendar-month">{monthLabel}</span>
          <span className="calendar-legend">
            <span className="calendar-legend-dot complete" aria-hidden="true" /> day secured
          </span>
        </div>

        <div className="ref-calendar-grid" role="grid" aria-label={`${monthLabel} activity`}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={`wd-${i}`} className="ref-weekday-header" aria-hidden="true">
              {label}
            </div>
          ))}

          {/* Offset so the 1st lands under its real weekday. */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="ref-day-cell blank" aria-hidden="true" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateKey = toDateKey(new Date(today.getFullYear(), today.getMonth(), day));
            const entry = historyByDate.get(dateKey);
            const isToday = dateKey === todayKey;
            const isFuture = dateKey > todayKey;

            // "Complete" means a real record with at least one discipline.
            const wasActive = entry
              ? entry.routinesCompleted > 0 ||
                entry.walkCompleted ||
                entry.focusCompleted ||
                entry.sleepCompleted
              : isToday && status.monitoredDoneCount > 0;

            return (
              <div
                key={day}
                role="gridcell"
                className={[
                  'ref-day-cell',
                  isToday ? 'today' : '',
                  wasActive ? 'completed' : '',
                  isFuture ? 'future' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${dateKey}${wasActive ? ', disciplines logged' : ''}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="ref-filter-bar" role="tablist" aria-label="Routine sections">
        <button
          className="ref-filter-icon-btn"
          onClick={() => setActiveFilter('ALL')}
          aria-label="Show everything"
        >
          <SlidersHorizontal size={16} />
        </button>
        {([
          ['ALL', 'All', String(routines.length)],
          ['FOCUS', 'Focus', status.focusDone ? '✓' : `${focusTargetMinutes}m`],
          ['WALK', 'Walk', status.walkDone ? '✓' : '3k'],
          ['MORNING', 'Morning', String(morningTasks.length)],
          ['EVENING', 'Evening', String(eveningTasks.length)],
          ['SLEEP', 'Sleep', status.sleepDone ? '✓' : '—']
        ] as Array<[RoutineFilter, string, string]>).map(([key, label, count]) => (
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

      {orderWarning && (
        <div className="notice notice-warning" role="status">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{orderWarning}</span>
        </div>
      )}

      {/* ── Focus block ─────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'FOCUS') && (
        <div className="ref-task-card ref-task-card-dark focus-card">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">Deep work block</div>
            <span className="ref-task-review-badge">
              {status.focusDone ? `${status.focusMinutes}m today` : `${focusTargetMinutes}m target`}
            </span>
          </div>

          <div className="focus-timer-row">
            <div>
              <div className="focus-timer">{formatTimer(focusRemaining)}</div>
              <div className="focus-timer-sub">
                {isFocusActive ? '40Hz gamma audio playing' : 'Uninterrupted, phone face down'}
              </div>
            </div>

            <div className="focus-controls">
              <button
                type="button"
                className={`md3-button-filled md3-button-sm ${isFocusActive ? 'is-running' : ''}`}
                onClick={handleToggleFocus}
              >
                {isFocusActive ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {isFocusActive ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                className="icon-button focus-reset"
                onClick={() => handleResetFocus(focusTargetMinutes)}
                aria-label="Reset the timer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          <div className="focus-presets" role="group" aria-label="Focus duration">
            {FOCUS_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className={`preset-chip ${focusTargetMinutes === m ? 'selected' : ''}`}
                onClick={() => handleResetFocus(m)}
                disabled={isFocusActive}
              >
                {m}m
              </button>
            ))}
          </div>

          <div className="ref-card-tray">
            <span className="tray-count">
              <Clock size={14} aria-hidden="true" />
              {status.focusDone ? 'Secured today' : 'Not yet today'}
            </span>
            <div className="ref-progress-striped">
              <div className="ref-progress-striped-fill" style={{ width: `${focusProgress}%` }} />
              <span className="ref-progress-striped-text">
                {isFocusActive ? `${focusProgress}%` : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Walk ────────────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'WALK') && <GpsWalkTracker />}

      {/* ── Morning ─────────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'MORNING') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              <Sun size={16} aria-hidden="true" /> Morning sequence
            </div>
            <button
              className="ref-arrow-btn"
              onClick={() => {
                setNewHabitCategory('MORNING');
                setShowAddHabit(true);
              }}
              aria-label="Add a morning habit"
            >
              <Plus size={18} />
            </button>
          </div>

          {morningTasks.length === 0 ? (
            <p className="empty-hint">No morning habits yet. Add one to get started.</p>
          ) : (
            <>
              {renderTaskList(morningTasks)}
              {progressBar(
                morningTasks.filter((t) => t.completed).length,
                morningTasks.length,
                'Sequence complete',
                'In progress'
              )}
            </>
          )}
        </div>
      )}

      {/* ── Custom ──────────────────────────────────────────────────────── */}
      {activeFilter === 'ALL' && customTasks.length > 0 && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              <Sparkles size={16} aria-hidden="true" /> Anytime
            </div>
          </div>
          {renderTaskList(customTasks)}
        </div>
      )}

      {/* ── Sleep ───────────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'SLEEP') && <SleepTrackerCard />}

      {/* ── Evening ─────────────────────────────────────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'EVENING') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              <Moon size={16} aria-hidden="true" /> Evening wind-down
            </div>
            <button
              className="ref-arrow-btn"
              onClick={() => {
                setNewHabitCategory('EVENING');
                setShowAddHabit(true);
              }}
              aria-label="Add an evening habit"
            >
              <Plus size={18} />
            </button>
          </div>

          {eveningTasks.length === 0 ? (
            <p className="empty-hint">No evening habits yet.</p>
          ) : (
            <>
              {renderTaskList(eveningTasks)}
              {progressBar(
                eveningTasks.filter((t) => t.completed).length,
                eveningTasks.length,
                'Ready for sleep',
                'Winding down'
              )}
            </>
          )}
        </div>
      )}

      {/* ── Add habit dialog ────────────────────────────────────────────── */}
      {showAddHabit && (
        <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="add-habit-title">
          <div className="md3-dialog">
            <div className="dialog-header">
              <div className="dialog-header-title">
                <Sparkles size={18} aria-hidden="true" />
                <h3 id="add-habit-title">Add a habit</h3>
              </div>
              <button
                onClick={() => setShowAddHabit(false)}
                className="icon-button"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="dialog-body">
              <div>
                <label className="md3-field-label" htmlFor="habit-name">Habit</label>
                <input
                  id="habit-name"
                  type="text"
                  required
                  className="md3-field-outlined"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="100 push-ups"
                  autoFocus
                />
              </div>

              <div>
                <label className="md3-field-label" htmlFor="habit-slot">When</label>
                <select
                  id="habit-slot"
                  className="md3-select"
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value as RoutineTask['category'])}
                >
                  <option value="MORNING">Morning sequence</option>
                  <option value="EVENING">Evening wind-down</option>
                  <option value="CUSTOM">Anytime</option>
                </select>
              </div>

              <div className="field-pair">
                <div>
                  <label className="md3-field-label" htmlFor="habit-time">Target time</label>
                  <input
                    id="habit-time"
                    type="text"
                    className="md3-field-outlined"
                    value={newHabitTime}
                    onChange={(e) => setNewHabitTime(e.target.value)}
                    placeholder="06:45 AM"
                  />
                </div>
                <div>
                  <label className="md3-field-label" htmlFor="habit-duration">Minutes</label>
                  <input
                    id="habit-duration"
                    type="number"
                    min={0}
                    className="md3-field-outlined"
                    value={newHabitDuration}
                    onChange={(e) => setNewHabitDuration(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="md3-button-text"
                  onClick={() => setShowAddHabit(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="md3-button-filled">
                  <Plus size={16} aria-hidden="true" />
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deep link into insights for anyone wanting the fuller picture. */}
      {activeFilter === 'ALL' && history.length > 0 && (
        <button type="button" className="md3-button-text card-more" onClick={() => setActiveFilter('ALL')}>
          {history.length} day{history.length === 1 ? '' : 's'} of history recorded
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
