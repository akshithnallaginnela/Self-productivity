/**
 * RoutineView.tsx — Monitored Disciplines & Daily Habit Engine
 *
 * Implements:
 *   1. Monitored GPS Walk & Real-time Step Counter (GpsWalkTracker)
 *   2. Monitored 30-Minute Deep Focus Engine with 40Hz Gamma soundscape & completion verification
 *   3. Circadian Sleep & Wind-Down Tracker (SleepTrackerCard)
 *   4. Morning Sovereign Rituals & Evening Wind-Down Checklist
 *
 * Disciplines are strictly monitored and extend the Duolingo daily streak upon genuine completion!
 */

import React, { useState, useEffect } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { RoutineTask, FocusSession } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { GpsWalkTracker } from './GpsWalkTracker';
import { SleepTrackerCard } from './SleepTrackerCard';

export const RoutineView: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineTask[]>(db.getRoutines());
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [disciplinesStatus, setDisciplinesStatus] = useState(db.getTodayDisciplinesStatus());

  /* ── 30-min Monitored Focus Engine state ─────────────────────────── */
  const [focusTargetMinutes, setFocusTargetMinutes] = useState<number>(30);
  const [focusSecondsRemaining, setFocusSecondsRemaining] = useState<number>(30 * 60);
  const [isFocusActive, setIsFocusActive] = useState<boolean>(false);
  const [focusCompletedToday, setFocusCompletedToday] = useState<boolean>(false);

  /** Subscribes to reactive database updates. */
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setRoutines(db.getRoutines());
      const status = db.getTodayDisciplinesStatus();
      setDisciplinesStatus(status);
      setFocusCompletedToday(status.focusDone);
    });
    return () => unsub();
  }, []);

  /**
   * Monitored Focus timer countdown loop.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isFocusActive && focusSecondsRemaining > 0) {
      timer = setInterval(() => setFocusSecondsRemaining((prev) => prev - 1), 1000);
    } else if (focusSecondsRemaining === 0 && isFocusActive) {
      setIsFocusActive(false);
      audioEngine.stop();
      audioEngine.playMilestoneTriumph();

      // Log completed session to DB and trigger streak extension!
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
    return () => clearInterval(timer);
  }, [isFocusActive, focusSecondsRemaining, focusTargetMinutes]);

  /** Toggles 30m Focus Timer and 40Hz Gamma soundscape. */
  const handleToggleFocus = () => {
    if (!isFocusActive) {
      setIsFocusActive(true);
      audioEngine.playTrack('track-gamma');
    } else {
      setIsFocusActive(false);
      audioEngine.stop();
    }
  };

  /** Resets focus timer to preset duration. */
  const handleResetFocusTimer = (minutes: number) => {
    setIsFocusActive(false);
    audioEngine.stop();
    setFocusTargetMinutes(minutes);
    setFocusSecondsRemaining(minutes * 60);
  };

  /** Toggles habit completion with sequential discipline verification. */
  const handleToggleTask = (id: string) => {
    const { sequenceValid } = db.toggleRoutineTask(id);
    if (!sequenceValid) {
      setOrderWarning('Discipline Notice: Morning sequence completed out of order! (Reduced XP)');
      setTimeout(() => setOrderWarning(null), 3500);
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="md3-section-title">Verified Disciplines</span>
          <h1 className="md3-headline">Monitored Matrix</h1>
        </div>
        <div className="md3-chip md3-chip-filled" style={{ gap: '6px' }}>
          <Zap size={14} color="var(--md-sys-color-primary)" />
          <span>{disciplinesStatus.monitoredDoneCount}/4 Disciplines Done</span>
        </div>
      </div>

      {/* ── Sequential Order Alert ─────────────────────────────────── */}
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

      {/* ── Monitored Discipline 1: GPS Walk Tracker ───────────────── */}
      <GpsWalkTracker />

      {/* ── Monitored Discipline 2: 30-Min Deep Focus Engine ────────── */}
      <div className="md3-card-secondary-tinted" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--md-sys-shape-full)',
              background: focusCompletedToday ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-surface-container-lowest)',
              color: focusCompletedToday ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-secondary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={20} />
            </div>
            <div>
              <span className="md3-section-title" style={{ fontSize: '10px' }}>MONITORED FOCUS</span>
              <h2 style={{ fontSize: '16px', fontWeight: 800 }}>
                30m Deep Work Block
              </h2>
            </div>
          </div>

          {/* Duration Presets */}
          <div style={{ width: '130px' }}>
            <div className="md3-segmented-group">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleResetFocusTimer(mins)}
                  className={`md3-segmented-item ${focusTargetMinutes === mins ? 'active' : ''}`}
                  style={{ height: '28px', fontSize: '11px', padding: '0 6px' }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Large Timer & Waveform */}
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <div style={{
            fontSize: '52px',
            fontFamily: 'var(--md-sys-typescale-display-large-font)',
            fontWeight: 900,
            letterSpacing: '-1px',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums'
          }}>
            {formatTimer(focusSecondsRemaining)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-secondary-container)', opacity: 0.85, marginTop: '4px' }}>
            {isFocusActive ? '⚡ 40Hz Gamma Wave Focus Audio Active' : 'Target: 30 minutes uninterrupted deep work'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="md3-progress-track" style={{ height: '6px', background: 'rgba(0,0,0,0.08)' }}>
          <div
            className="md3-progress-indicator"
            style={{ width: `${focusProgress}%`, background: 'var(--md-sys-color-on-secondary-container)' }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="md3-button-filled md3-button-md"
            onClick={handleToggleFocus}
            style={{
              background: isFocusActive ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-surface-container-lowest)',
              color: isFocusActive ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-secondary-container)',
              fontWeight: 800,
              padding: '0 24px'
            }}
          >
            {isFocusActive ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            {isFocusActive ? 'Pause Session' : 'Ignite 30m Focus'}
          </button>

          <button
            type="button"
            className="md3-button-tonal md3-button-sm"
            onClick={() => handleResetFocusTimer(focusTargetMinutes)}
            title="Reset timer"
            style={{ padding: '0 12px' }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── Monitored Discipline 3: Sleep Tracker Card ─────────────── */}
      <SleepTrackerCard />

      {/* ── Morning Sovereign Sequence List ────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sun size={18} color="#d97706" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Morning Sovereign Sequence
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {morningTasks.filter((t) => t.completed).length}/{morningTasks.length} Done
          </span>
        </div>

        <div className="md3-list-group">
          {morningTasks.map((task) => (
            <div
              key={task.id}
              className="md3-list-group-item"
              onClick={() => handleToggleTask(task.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '8px',
                  border: task.completed ? 'none' : '2px solid var(--md-sys-color-outline)',
                  background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--md-sys-color-on-primary)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {task.completed && <CheckCircle2 size={16} />}
                </div>

                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
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
                Step {task.orderIndex}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Evening Wind-Down Sequence List ────────────────────────── */}
      <div className="md3-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Moon size={18} color="#4f46e5" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Evening Wind-Down Checklist
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)' }}>
            {eveningTasks.filter((t) => t.completed).length}/{eveningTasks.length} Done
          </span>
        </div>

        <div className="md3-list-group">
          {eveningTasks.map((task) => (
            <div
              key={task.id}
              className="md3-list-group-item"
              onClick={() => handleToggleTask(task.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '8px',
                  border: task.completed ? 'none' : '2px solid var(--md-sys-color-outline)',
                  background: task.completed ? 'var(--md-sys-color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--md-sys-color-on-primary)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {task.completed && <CheckCircle2 size={16} />}
                </div>

                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
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
                Step {task.orderIndex}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
