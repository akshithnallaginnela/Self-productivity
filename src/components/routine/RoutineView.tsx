/**
 * RoutineView.tsx — Task Schedule & Monitored Discipline Engine
 *
 * Implements the pixel-perfect layout and organization from the reference design:
 *   1. Task Schedule Header with Date picker dropdown & quick action button
 *   2. Interactive S M T W T F S Calendar Grid with circular date tokens & completion rings
 *   3. Dual-tone filter chips bar ([ All | 8 ], [ Morning | 4 ], [ Evening | 4 ], etc.)
 *   4. Reference card anatomy with bold titles, ↗ action buttons, clock time spans,
 *      priority capsule pills, avatar stacks, and striped progress bars.
 *   5. Full Habit Manager (Add custom routines, delete, toggle completion, sequential order checks).
 *   6. Monitored Focus with Screen WakeLock, GPS Walk, Sleep, and Ritual engines.
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sun,
  Moon,
  Flame,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Footprints,
  Sparkles,
  Zap,
  Target,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  ChevronDown,
  Pencil,
  Bell,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { RoutineTask, FocusSession, UserProfile } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { androidSystem } from '../../services/androidSystem';
import { GpsWalkTracker } from './GpsWalkTracker';
import { SleepTrackerCard } from './SleepTrackerCard';

type RoutineFilter = 'ALL' | 'MORNING' | 'EVENING' | 'FOCUS' | 'WALK' | 'SLEEP';

export const RoutineView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [routines, setRoutines] = useState<RoutineTask[]>(db.getRoutines());
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [disciplinesStatus, setDisciplinesStatus] = useState(db.getTodayDisciplinesStatus());
  const [activeFilter, setActiveFilter] = useState<RoutineFilter>('ALL');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  /* ── Add Custom Habit Modal state ────────────────────────────────── */
  const [showAddHabitModal, setShowAddHabitModal] = useState<boolean>(false);
  const [newHabitName, setNewHabitName] = useState<string>('');
  const [newHabitCategory, setNewHabitCategory] = useState<'MORNING' | 'EVENING' | 'CUSTOM'>('MORNING');
  const [newHabitTimeHint, setNewHabitTimeHint] = useState<string>('07:00 AM');
  const [newHabitDuration, setNewHabitDuration] = useState<number>(15);

  /* ── 30-min Monitored Focus Engine state ─────────────────────────── */
  const [focusTargetMinutes, setFocusTargetMinutes] = useState<number>(30);
  const [focusSecondsRemaining, setFocusSecondsRemaining] = useState<number>(30 * 60);
  const [isFocusActive, setIsFocusActive] = useState<boolean>(false);
  const [focusCompletedToday, setFocusCompletedToday] = useState<boolean>(false);

  /** Subscribes to reactive database updates. */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setRoutines(db.getRoutines());
      const status = db.getTodayDisciplinesStatus();
      setDisciplinesStatus(status);
      setFocusCompletedToday(status.focusDone);
    });
    return () => unsub();
  }, []);

  /**
   * Monitored Focus timer countdown loop with Screen WakeLock.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isFocusActive && focusSecondsRemaining > 0) {
      timer = setInterval(() => setFocusSecondsRemaining((prev) => prev - 1), 1000);
    } else if (focusSecondsRemaining === 0 && isFocusActive) {
      setIsFocusActive(false);
      audioEngine.stop();
      audioEngine.playMilestoneTriumph();
      audioEngine.triggerHaptic('success');
      androidSystem.releaseWakeLock();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      const session: FocusSession = {
        id: `focus-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        targetMinutes: focusTargetMinutes,
        completedMinutes: focusTargetMinutes,
        completed: true,
        timestamp: new Date().toISOString(),
        soundTrack: 'track-gamma'
      };
      db.saveFocusSession(session);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isFocusActive, focusSecondsRemaining, focusTargetMinutes]);

  /** Toggles 30m Focus Timer and 40Hz Gamma soundscape with Screen WakeLock. */
  const handleToggleFocus = () => {
    if (!isFocusActive) {
      setIsFocusActive(true);
      audioEngine.playTrack('track-gamma');
      audioEngine.triggerHaptic('medium');
      androidSystem.requestWakeLock();
    } else {
      setIsFocusActive(false);
      audioEngine.stop();
      androidSystem.releaseWakeLock();
    }
  };

  /** Resets focus timer to preset duration. */
  const handleResetFocusTimer = (minutes: number) => {
    setIsFocusActive(false);
    audioEngine.stop();
    androidSystem.releaseWakeLock();
    setFocusTargetMinutes(minutes);
    setFocusSecondsRemaining(minutes * 60);
    audioEngine.triggerHaptic('light');
  };

  /** Toggles habit completion with sequential discipline verification and micro-chimes. */
  const handleToggleTask = (id: string) => {
    const { routines: updatedRoutines, sequenceValid } = db.toggleRoutineTask(id);
    const targetTask = updatedRoutines.find((r) => r.id === id);
    if (targetTask && targetTask.completed) {
      audioEngine.playTaskCompleteChime();
    } else {
      audioEngine.triggerHaptic('light');
    }

    if (!sequenceValid) {
      setOrderWarning('Discipline Notice: Morning sequence completed out of order! (Reduced XP)');
      setTimeout(() => setOrderWarning(null), 3500);
    }
  };

  /** Adds a new custom routine task to local DB. */
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    db.addRoutineTask({
      name: newHabitName.trim(),
      category: newHabitCategory,
      orderIndex: routines.length + 1,
      durationMinutes: newHabitDuration,
      timeHint: newHabitTimeHint,
      iconName: 'Sparkles',
      isMandatory: false
    });

    audioEngine.playTaskCompleteChime();
    audioEngine.triggerHaptic('success');
    setNewHabitName('');
    setShowAddHabitModal(false);
  };

  /** Deletes a routine task. */
  const handleDeleteHabit = (id: string) => {
    db.deleteRoutineTask(id);
    audioEngine.triggerHaptic('light');
  };

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalFocusSeconds = focusTargetMinutes * 60;
  const focusProgress = Math.min(100, Math.round(((totalFocusSeconds - focusSecondsRemaining) / totalFocusSeconds) * 100));

  const morningTasks = routines.filter((r) => r.category === 'MORNING').sort((a, b) => a.orderIndex - b.orderIndex);
  const eveningTasks = routines.filter((r) => r.category === 'EVENING').sort((a, b) => a.orderIndex - b.orderIndex);

  const today = new Date();
  const currentDateFormatted = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

  // Current calendar month days generator (1 to 31)
  const daysInMonth = new Array(31).fill(null).map((_, i) => i + 1);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
              Warrior Disciplines
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              {profile.displayName || 'Sovereign Warrior'}
            </div>
          </div>
        </div>

        <div className="ref-header-actions">
          <button
            className="ref-circle-btn ref-circle-btn-dark"
            onClick={() => setShowAddHabitModal(true)}
            title="Add Custom Routine"
            aria-label="Add custom routine"
          >
            <Plus size={18} />
          </button>
          <div className="ref-circle-btn ref-circle-btn-light" title="Notifications & Streak Status">
            <Bell size={18} />
            {disciplinesStatus.monitoredDoneCount > 0 && <div className="ref-badge-dot" />}
          </div>
        </div>
      </div>

      {/* ── Page Title ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="ref-page-title" style={{ margin: 0 }}>
          Task schedule
        </h1>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-primary)', paddingBottom: '4px' }}>
          {disciplinesStatus.monitoredDoneCount}/4 Verified
        </div>
      </div>

      {/* ── Schedule Date Dropdown & Edit Action (Screen 2) ─────────── */}
      <div className="ref-calendar-container">
        <div className="ref-calendar-header">
          <button
            className="ref-date-picker-btn"
            onClick={() => {
              setSelectedDay(today.getDate());
              audioEngine.triggerHaptic('light');
            }}
            title="Reset to today"
            aria-label="Selected date"
          >
            <CalendarIcon size={16} color="var(--md-sys-color-primary)" />
            <span>{currentDateFormatted}</span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          <button
            className="ref-pencil-btn"
            onClick={() => setShowAddHabitModal(true)}
            title="Add or Customize Routines"
            aria-label="Add habit"
          >
            <Pencil size={16} />
          </button>
        </div>

        {/* ── Weekday Headers + 31 Days Grid ────────────────────────── */}
        <div className="ref-calendar-grid">
          {weekdays.map((day, idx) => (
            <div key={idx} className="ref-weekday-header">
              {day}
            </div>
          ))}

          {daysInMonth.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = today.getDate() === day;
            const isCompleted = day <= today.getDate() && day % 2 === 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  audioEngine.triggerHaptic('light');
                }}
                className={`ref-day-cell ${isSelected ? 'selected' : ''} ${isCompleted && !isSelected ? 'completed' : ''} ${isToday ? 'today' : ''}`}
                aria-label={`Day ${day}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Dual-Tone Filter Chips Bar (Screen 1) ────────────────────── */}
      <div className="ref-filter-bar">
        <button
          className="ref-filter-icon-btn"
          onClick={() => setActiveFilter('ALL')}
          title="Reset filter to all"
          aria-label="Filter"
        >
          <SlidersHorizontal size={16} />
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          <span>All Tasks</span>
          <span className="ref-filter-count">{routines.length}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'MORNING' ? 'active' : ''}`}
          onClick={() => setActiveFilter('MORNING')}
        >
          <span>Morning</span>
          <span className="ref-filter-count">{morningTasks.length}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'FOCUS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('FOCUS')}
        >
          <span>Deep Focus</span>
          <span className="ref-filter-count">{focusCompletedToday ? '✓' : '1'}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'WALK' ? 'active' : ''}`}
          onClick={() => setActiveFilter('WALK')}
        >
          <span>GPS Walk</span>
          <span className="ref-filter-count">{disciplinesStatus.walkDone ? '✓' : '3k'}</span>
        </button>

        <button
          type="button"
          className={`ref-filter-pill ${activeFilter === 'EVENING' ? 'active' : ''}`}
          onClick={() => setActiveFilter('EVENING')}
        >
          <span>Evening Routine</span>
          <span className="ref-filter-count">{eveningTasks.length}</span>
        </button>
      </div>

      {/* ── Sequential Order Alert Notice ──────────────────────────── */}
      {orderWarning && (
        <div style={{
          background: 'var(--md-sys-color-error-container)',
          color: 'var(--md-sys-color-on-error-container)',
          borderRadius: 'var(--md-sys-shape-medium)',
          padding: '12px 16px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700
        }}>
          <AlertCircle size={16} />
          {orderWarning}
        </div>
      )}

      {/* ── CARD 1: 30-Minute Monitored Focus Block (Dark Bento Card) ─ */}
      {(activeFilter === 'ALL' || activeFilter === 'FOCUS') && (
        <div className="ref-task-card ref-task-card-dark">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              30-Minute Monitored Deep Work Block
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {focusCompletedToday ? 'Completed ✓' : `${focusTargetMinutes}m Block`}
              </span>
              <button
                className="ref-arrow-btn"
                onClick={handleToggleFocus}
                title={isFocusActive ? 'Pause focus' : 'Ignite focus'}
                aria-label="Ignite 30m focus session"
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div className="ref-task-card-meta">
            <div className="ref-time-badge">
              <Clock size={14} />
              <span>{isFocusActive ? `${formatTimer(focusSecondsRemaining)} Remaining` : '10.00 AM - 05.30 PM'}</span>
            </div>
            <div className="ref-priority-pill">
              High Priority
            </div>
          </div>

          {/* Large Focus Countdown & Controls when active/previewing */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '12px 16px',
            borderRadius: '20px'
          }}>
            <div>
              <div style={{
                fontSize: '28px',
                fontFamily: 'var(--md-sys-typescale-display-large-font)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                lineHeight: 1
              }}>
                {formatTimer(focusSecondsRemaining)}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
                {isFocusActive ? '⚡ 40Hz Gamma Audio Active' : 'Target: 30 min uninterrupted focus'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="md3-button-filled md3-button-sm"
                onClick={handleToggleFocus}
                style={{
                  background: isFocusActive ? '#ef4444' : '#ffffff',
                  color: isFocusActive ? '#ffffff' : '#18181b',
                  fontWeight: 800,
                  fontSize: '11px'
                }}
              >
                {isFocusActive ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                {isFocusActive ? 'Pause' : 'Ignite'}
              </button>

              <button
                type="button"
                onClick={() => handleResetFocusTimer(focusTargetMinutes)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Reset timer"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Sub-tray: Avatar Stack & Striped Progress Bar */}
          <div className="ref-card-tray">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="ref-avatar-stack">
                <div className="ref-avatar-stack-item">🦅</div>
                <div className="ref-avatar-stack-item">⚡</div>
                <div className="ref-avatar-stack-item">🔥</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9 }}>
                {focusCompletedToday ? '1 Session Done' : 'Focus Queue'}
              </span>
            </div>

            <div className="ref-progress-striped">
              <div
                className="ref-progress-striped-fill"
                style={{ width: `${Math.max(15, focusProgress)}%` }}
              />
              <span className="ref-progress-striped-text">
                {focusCompletedToday ? '100% Completed' : isFocusActive ? `${focusProgress}% In Progress` : 'Ready to Ignite'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD 2: Outdoor GPS Walk & Step Discipline Card ─────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'WALK') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              GPS Outdoor Walk (3k Steps)
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {disciplinesStatus.walkDone ? `${disciplinesStatus.walkSteps} Steps ✓` : '3,000 Step Target'}
              </span>
              <button
                className="ref-arrow-btn"
                onClick={() => setActiveFilter(activeFilter === 'WALK' ? 'ALL' : 'WALK')}
                aria-label="View GPS Walk details"
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div className="ref-task-card-meta">
            <div className="ref-time-badge">
              <Clock size={14} />
              <span>06.30 AM - 07.30 AM</span>
            </div>
            <div className="ref-priority-pill" style={{ color: 'var(--md-sys-color-tertiary)', borderColor: 'var(--md-sys-color-tertiary)' }}>
              Core Discipline
            </div>
          </div>

          <GpsWalkTracker />

          <div className="ref-card-tray">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Footprints size={18} color="var(--md-sys-color-primary)" />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {disciplinesStatus.walkDone ? 'Discipline Secured' : 'GPS Tracking Ready'}
              </span>
            </div>

            <div className="ref-progress-striped">
              <div
                className="ref-progress-striped-fill"
                style={{ width: `${Math.min(100, Math.round((disciplinesStatus.walkSteps / 3000) * 100))}%` }}
              />
              <span className="ref-progress-striped-text">
                {disciplinesStatus.walkDone ? 'Target Achieved' : 'Tracking Steps'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD 3: Morning Sovereign Sequence List ────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'MORNING') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              Morning Sovereign Sequence
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {morningTasks.filter((t) => t.completed).length}/{morningTasks.length} Steps
              </span>
              <button
                className="ref-arrow-btn"
                onClick={() => setShowAddHabitModal(true)}
                title="Add custom morning habit"
                aria-label="Add habit"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="ref-task-card-meta">
            <div className="ref-time-badge">
              <Clock size={14} />
              <span>06.00 AM - 08.00 AM</span>
            </div>
            <div className="ref-priority-pill" style={{ color: 'var(--md-sys-color-primary)', borderColor: 'var(--md-sys-color-primary)' }}>
              High Priority
            </div>
          </div>

          {/* Sequential Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {morningTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  background: task.completed ? 'var(--md-sys-color-tertiary-container)' : '#f8fafc',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  onClick={() => handleToggleTask(task.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '8px',
                    border: task.completed ? 'none' : '2px solid #cbd5e1',
                    background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {task.completed && <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: task.completed ? '#64748b' : '#0f172a',
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}>
                      {task.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Target: {task.timeHint} {task.durationMinutes > 0 ? `· ${task.durationMinutes}m` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="md3-chip" style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}>
                    Step {task.orderIndex}
                  </span>
                  {!task.isMandatory && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHabit(task.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      title="Delete routine"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="ref-card-tray">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sun size={18} color="#d97706" />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {morningTasks.filter((t) => t.completed).length} of {morningTasks.length} Completed
              </span>
            </div>

            <div className="ref-progress-striped">
              <div
                className="ref-progress-striped-fill"
                style={{ width: `${Math.round((morningTasks.filter((t) => t.completed).length / Math.max(1, morningTasks.length)) * 100)}%` }}
              />
              <span className="ref-progress-striped-text">
                {morningTasks.filter((t) => t.completed).length === morningTasks.length ? 'Sequence Complete' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD 4: Circadian Sleep Tracker Card ───────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'SLEEP') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              Circadian Sleep & Wind-Down
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {disciplinesStatus.sleepDone ? 'Logged ✓' : 'Circadian Sync'}
              </span>
              <button
                className="ref-arrow-btn"
                onClick={() => setActiveFilter(activeFilter === 'SLEEP' ? 'ALL' : 'SLEEP')}
                aria-label="View sleep tracker"
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div className="ref-task-card-meta">
            <div className="ref-time-badge">
              <Clock size={14} />
              <span>10.00 PM - 06.00 AM</span>
            </div>
            <div className="ref-priority-pill" style={{ color: '#4f46e5', borderColor: '#4f46e5' }}>
              Core Discipline
            </div>
          </div>

          <SleepTrackerCard />
        </div>
      )}

      {/* ── CARD 5: Evening Wind-Down Checklist ────────────────────── */}
      {(activeFilter === 'ALL' || activeFilter === 'EVENING') && (
        <div className="ref-task-card ref-task-card-light">
          <div className="ref-task-card-top">
            <div className="ref-task-card-title">
              Evening Wind-Down Checklist
            </div>
            <div className="ref-task-card-actions">
              <span className="ref-task-review-badge">
                {eveningTasks.filter((t) => t.completed).length}/{eveningTasks.length} Steps
              </span>
              <button
                className="ref-arrow-btn"
                onClick={() => setShowAddHabitModal(true)}
                title="Add evening habit"
                aria-label="Add habit"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="ref-task-card-meta">
            <div className="ref-time-badge">
              <Clock size={14} />
              <span>09.30 PM - 10.30 PM</span>
            </div>
            <div className="ref-priority-pill" style={{ color: '#6366f1', borderColor: '#6366f1' }}>
              Evening Routine
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eveningTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  background: task.completed ? 'var(--md-sys-color-tertiary-container)' : '#f8fafc',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  onClick={() => handleToggleTask(task.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '8px',
                    border: task.completed ? 'none' : '2px solid #cbd5e1',
                    background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {task.completed && <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: task.completed ? '#64748b' : '#0f172a',
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}>
                      {task.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Target: {task.timeHint}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="md3-chip" style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}>
                    Step {task.orderIndex}
                  </span>
                  {!task.isMandatory && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHabit(task.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      title="Delete routine"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="ref-card-tray">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Moon size={18} color="#4f46e5" />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>
                {eveningTasks.filter((t) => t.completed).length} of {eveningTasks.length} Done
              </span>
            </div>

            <div className="ref-progress-striped">
              <div
                className="ref-progress-striped-fill"
                style={{ width: `${Math.round((eveningTasks.filter((t) => t.completed).length / Math.max(1, eveningTasks.length)) * 100)}%` }}
              />
              <span className="ref-progress-striped-text">
                {eveningTasks.filter((t) => t.completed).length === eveningTasks.length ? 'Ready for Sleep' : 'Wind-Down Active'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Custom Habit Modal Dialog ──────────────────────────── */}
      {showAddHabitModal && (
        <div className="md3-scrim" role="dialog" aria-modal="true">
          <div className="md3-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={18} color="var(--md-sys-color-primary)" />
                <h3 style={{
                  fontFamily: 'var(--md-sys-typescale-title-large-font)',
                  fontSize: 'var(--md-sys-typescale-title-large-size)',
                  fontWeight: 700
                }}>
                  Add Custom Discipline
                </h3>
              </div>
              <button 
                onClick={() => setShowAddHabitModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHabit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label className="md3-field-label">Discipline / Habit Name:</label>
                <input
                  type="text"
                  required
                  className="md3-field-outlined"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. 100 Pushups & Cold Shower"
                />
              </div>

              <div>
                <label className="md3-field-label">Routine Time Slot:</label>
                <select
                  className="md3-select"
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value as 'MORNING' | 'EVENING' | 'CUSTOM')}
                >
                  <option value="MORNING">Morning Sovereign Sequence</option>
                  <option value="EVENING">Evening Wind-Down Checklist</option>
                  <option value="CUSTOM">Custom All-Day Habit</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="md3-field-label">Target Time:</label>
                  <input
                    type="text"
                    className="md3-field-outlined"
                    value={newHabitTimeHint}
                    onChange={(e) => setNewHabitTimeHint(e.target.value)}
                    placeholder="e.g. 06:45 AM"
                  />
                </div>
                <div>
                  <label className="md3-field-label">Duration (min):</label>
                  <input
                    type="number"
                    min="1"
                    className="md3-field-outlined"
                    value={newHabitDuration}
                    onChange={(e) => setNewHabitDuration(parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="md3-button-text"
                  onClick={() => setShowAddHabitModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="md3-button-filled"
                >
                  <Plus size={16} />
                  Add Discipline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
