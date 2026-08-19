/**
 * RoutineView.tsx — Daily Habit Engine & Sovereign Rituals
 *
 * Implements pure Material Design 3 (material.io) layout paradigms:
 *   1. Pomodoro Focus Timer with M3 Segmented Button intervals (25m / 50m) and Gamma wave audio
 *   2. Morning Sovereign Sequence in a clean M3 Grouped List Container with tactile checkboxes
 *   3. Evening Wind-Down Sequence with sequential progress tracking
 *   4. Circadian Sleep Quality Logger
 *
 * Enforces strict sequential order checking for morning rituals and awards discipline XP.
 */

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Flame,
  Play,
  Square,
  RotateCcw,
  Star,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { RoutineTask } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';

/**
 * Renders the Material Design 3 Daily Habit Engine.
 */
export const RoutineView: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineTask[]>(db.getRoutines());
  const [orderWarning, setOrderWarning] = useState<string | null>(null);

  /* ── Sleep logger state ──────────────────────────────────────────── */
  const [sleepRating, setSleepRating] = useState<number>(4);
  const [wakeTime, setWakeTime] = useState<string>('05:30');
  const [bedTime, setBedTime] = useState<string>('22:00');
  const [sleepSaved, setSleepSaved] = useState<boolean>(false);

  /* ── Pomodoro timer state ────────────────────────────────────────── */
  const [deepWorkSeconds, setDeepWorkSeconds] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  /** Subscribes to reactive database updates. */
  useEffect(() => {
    const unsub = db.subscribe(() => setRoutines(db.getRoutines()));
    return () => unsub();
  }, []);

  /**
   * Pomodoro countdown timer loop with victory triumph synthesizer.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isTimerRunning && deepWorkSeconds > 0) {
      timer = setInterval(() => setDeepWorkSeconds((prev) => prev - 1), 1000);
    } else if (deepWorkSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      audioEngine.playMilestoneTriumph();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, deepWorkSeconds]);

  /**
   * Toggles habit completion with sequential discipline verification.
   */
  const handleToggleTask = (id: string) => {
    const { sequenceValid } = db.toggleRoutineTask(id);
    if (!sequenceValid) {
      setOrderWarning('Discipline Alert: Completed out of sequential order! (Reduced XP awarded)');
      setTimeout(() => setOrderWarning(null), 3500);
    }
  };

  /** Toggles Pomodoro focus timer and 40Hz Gamma soundscape audio. */
  const handleToggleTimer = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      audioEngine.playTrack('track-gamma');
    } else {
      setIsTimerRunning(false);
      audioEngine.stop();
    }
  };

  /** Resets timer to specified duration in minutes. */
  const handleResetTimer = (minutes: number) => {
    setIsTimerRunning(false);
    audioEngine.stop();
    setDeepWorkSeconds(minutes * 60);
  };

  /** Formats seconds into MM:SS display notation. */
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const morningTasks = routines.filter((r) => r.category === 'MORNING').sort((a, b) => a.orderIndex - b.orderIndex);
  const eveningTasks = routines.filter((r) => r.category === 'EVENING').sort((a, b) => a.orderIndex - b.orderIndex);
  const completedCount = routines.filter((r) => r.completed).length;
  const adherenceRate = Math.round((completedCount / Math.max(1, routines.length)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="md3-section-title">Habit Engine</span>
          <h1 className="md3-headline">Daily Disciplines</h1>
        </div>
        <div className="md3-chip md3-chip-filled">
          {adherenceRate}% Adherence
        </div>
      </div>

      {/* ── Sequential Order Alert ─────────────────────────────────── */}
      {orderWarning && (
        <div style={{
          background: 'var(--md-sys-color-error-container)',
          color: 'var(--md-sys-color-on-error-container)',
          borderRadius: 'var(--md-sys-shape-medium)',
          padding: '10px 14px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          <AlertCircle size={16} />
          {orderWarning}
        </div>
      )}

      {/* ── Deep Work Pomodoro Card (M3 Tinted Container) ──────────── */}
      <div className="md3-card-secondary-tinted" style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={16} />
            <span style={{
              fontFamily: 'var(--md-sys-typescale-label-large-font)',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              40Hz Gamma Deep Work
            </span>
          </div>

          {/* M3 Segmented Button Pair for Pomodoro presets */}
          <div style={{ width: '130px' }}>
            <div className="md3-segmented-group">
              <button
                type="button"
                className={`md3-segmented-item ${deepWorkSeconds === 25 * 60 ? 'active' : ''}`}
                onClick={() => handleResetTimer(25)}
                style={{ height: '28px', fontSize: '11px' }}
              >
                25m
              </button>
              <button
                type="button"
                className={`md3-segmented-item ${deepWorkSeconds === 50 * 60 ? 'active' : ''}`}
                onClick={() => handleResetTimer(50)}
                style={{ height: '28px', fontSize: '11px' }}
              >
                50m
              </button>
            </div>
          </div>
        </div>

        {/* Large Timer Display */}
        <div style={{
          fontSize: '54px',
          fontFamily: 'var(--md-sys-typescale-display-large-font)',
          fontWeight: 800,
          margin: '10px 0',
          letterSpacing: '-1px',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {formatTimer(deepWorkSeconds)}
        </div>

        {/* M3 Stadium Button Action Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button className="md3-button-filled" onClick={handleToggleTimer}>
            {isTimerRunning ? <Square size={14} /> : <Play size={14} fill="currentColor" />}
            {isTimerRunning ? 'Pause Session' : 'Ignite Focus'}
          </button>
          
          <button 
            className="md3-button-outlined" 
            onClick={() => handleResetTimer(25)}
            style={{ borderColor: 'currentColor', color: 'inherit' }}
            title="Reset timer"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Morning Rituals List Group (Google Tasks Style) ─────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sun size={18} color="#d97706" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Morning Sovereign Sequence
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {morningTasks.filter((t) => t.completed).length} / {morningTasks.length} Completed
          </span>
        </div>

        <div className="md3-list-group">
          {morningTasks.map((task) => (
            <div
              key={task.id}
              className="md3-list-group-item"
              onClick={() => handleToggleTask(task.id)}
              style={{
                background: task.completed ? 'var(--md-sys-color-surface-container)' : undefined
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Rounded Checkbox */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  border: task.completed ? 'none' : '2px solid var(--md-sys-color-outline)',
                  background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--md-sys-color-on-primary)',
                  fontSize: '13px',
                  fontWeight: 900,
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {task.completed && <CheckCircle2 size={16} />}
                </div>

                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: task.completed ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-on-surface)',
                    textDecoration: task.completed ? 'line-through' : 'none'
                  }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                    Target: {task.timeHint} {task.durationMinutes > 0 ? `· ${task.durationMinutes} min` : ''}
                  </div>
                </div>
              </div>

              <span className="md3-chip" style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}>
                {task.orderIndex}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Evening Wind-Down List Group ───────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Moon size={18} color="#4f46e5" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Evening Wind-Down & Sleep Lock
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {eveningTasks.filter((t) => t.completed).length} / {eveningTasks.length} Done
          </span>
        </div>

        <div className="md3-list-group">
          {eveningTasks.map((task) => (
            <div
              key={task.id}
              className="md3-list-group-item"
              onClick={() => handleToggleTask(task.id)}
              style={{
                background: task.completed ? 'var(--md-sys-color-surface-container)' : undefined
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  border: task.completed ? 'none' : '2px solid var(--md-sys-color-outline)',
                  background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--md-sys-color-on-primary)',
                  fontSize: '13px',
                  fontWeight: 900,
                  flexShrink: 0
                }}>
                  {task.completed && <CheckCircle2 size={16} />}
                </div>

                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: task.completed ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-on-surface)',
                    textDecoration: task.completed ? 'line-through' : 'none'
                  }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                    Target: {task.timeHint}
                  </div>
                </div>
              </div>

              <span className="md3-chip" style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}>
                {task.orderIndex}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Circadian Sleep Quality Logger ─────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{
              fontFamily: 'var(--md-sys-typescale-title-medium-font)',
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Circadian Sleep Logger
            </h2>
          </div>
          {sleepSaved && (
            <span style={{ fontSize: '11px', color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>
              Saved ✓
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label className="md3-field-label">Wake Time:</label>
            <input
              type="time"
              className="md3-field-outlined"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
          <div>
            <label className="md3-field-label">Bed Time:</label>
            <input
              type="time"
              className="md3-field-outlined"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
            Restoration Rating:
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setSleepRating(star);
                  setSleepSaved(true);
                  setTimeout(() => setSleepSaved(false), 2500);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: star <= sleepRating ? '#d97706' : 'var(--md-sys-color-outline-variant)',
                  padding: '2px'
                }}
                aria-label={`Rate sleep ${star} of 5`}
              >
                <Star size={22} fill={star <= sleepRating ? '#d97706' : 'none'} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
