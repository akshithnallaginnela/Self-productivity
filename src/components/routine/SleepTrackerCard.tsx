/**
 * SleepTrackerCard.tsx — Circadian Sleep Logger & Wind-Down Sleep Timer
 *
 * Implements:
 *   1. Circadian sleep duration calculation & 1-5 star quality logger
 *   2. Sleep Wind-Down Timer with relaxing procedural Delta wave / rain soundscapes
 *   3. Monitored discipline completion that extends today's daily streak (+80 XP)
 */

import React, { useState, useEffect } from 'react';
import {
  Moon,
  Star,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  BedDouble
} from 'lucide-react';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';
import { SleepSession } from '../../types';

export const SleepTrackerCard: React.FC = () => {
  const [bedTime, setBedTime] = useState<string>('22:30');
  const [wakeTime, setWakeTime] = useState<string>('06:00');
  const [qualityRating, setQualityRating] = useState<number>(4);
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>(db.getSleepSessions());
  const [isSaved, setIsSaved] = useState<boolean>(false);

  /* ── Wind-down sleep timer state ─────────────────────────────────── */
  const [isSleepTimerActive, setIsSleepTimerActive] = useState<boolean>(false);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number>(20 * 60); // 20 min wind-down
  const [isPlayingDelta, setIsPlayingDelta] = useState<boolean>(false);

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setSleepSessions(db.getSleepSessions());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isSleepTimerActive && sleepTimerSeconds > 0) {
      timer = setInterval(() => setSleepTimerSeconds((prev) => prev - 1), 1000);
    } else if (sleepTimerSeconds === 0 && isSleepTimerActive) {
      setIsSleepTimerActive(false);
      setIsPlayingDelta(false);
      audioEngine.stop();
    }
    return () => clearInterval(timer);
  }, [isSleepTimerActive, sleepTimerSeconds]);

  /**
   * Calculates total sleep duration in hours from bedTime & wakeTime.
   */
  const computeDurationHours = (): number => {
    const [bH, bM] = bedTime.split(':').map(Number);
    const [wH, wM] = wakeTime.split(':').map(Number);

    let startMinutes = bH * 60 + bM;
    let endMinutes = wH * 60 + wM;

    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // crossed midnight
    }

    const diffMinutes = endMinutes - startMinutes;
    return Math.round((diffMinutes / 60) * 10) / 10;
  };

  const durationHours = computeDurationHours();
  const today = new Date().toISOString().split('T')[0];
  const todaySleep = sleepSessions.find((s) => s.date === today);

  const handleSaveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const session: SleepSession = {
      id: `sleep-${Date.now()}`,
      date: today,
      bedTime,
      wakeTime,
      durationHours,
      qualityRating,
      windDownMinutes: 20,
      completed: true,
      loggedAt: new Date().toISOString()
    };

    db.saveSleepSession(session);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleSleepTimer = () => {
    if (!isSleepTimerActive) {
      setIsSleepTimerActive(true);
      setIsPlayingDelta(true);
      audioEngine.playTrack('track-rain');
    } else {
      setIsSleepTimerActive(false);
      setIsPlayingDelta(false);
      audioEngine.stop();
    }
  };

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="md3-card-elevated" style={{ padding: '20px' }}>
      {/* ── Card Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--md-sys-shape-full)',
            background: todaySleep ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-secondary-container)',
            color: todaySleep ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-secondary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Moon size={20} />
          </div>
          <div>
            <span className="md3-section-title" style={{ fontSize: '10px' }}>CIRCADIAN HEALTH</span>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              Sleep & Wind-Down Tracker
            </h2>
          </div>
        </div>

        {todaySleep ? (
          <div className="md3-chip" style={{ background: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)', fontWeight: 800 }}>
            <CheckCircle2 size={13} /> {todaySleep.durationHours}h Rest Logged
          </div>
        ) : (
          <div className="md3-chip" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Target: 7.5 - 8.5h
          </div>
        )}
      </div>

      {/* ── Sleep Wind-Down Audio Timer Pill ────────────────────────── */}
      <div style={{
        marginTop: '16px',
        padding: '12px 14px',
        background: 'var(--md-sys-color-surface-container)',
        borderRadius: 'var(--md-sys-shape-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={16} color="var(--md-sys-color-primary)" />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
              Delta Sleep Timer
            </div>
            <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {isSleepTimerActive ? `Wind-down active: ${formatTimer(sleepTimerSeconds)}` : '20m procedural sleep soundscape'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleSleepTimer}
          className={isSleepTimerActive ? 'md3-button-filled md3-button-sm' : 'md3-button-tonal md3-button-sm'}
          style={{ height: '30px', padding: '0 12px' }}
        >
          {isSleepTimerActive ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isSleepTimerActive ? 'Stop' : 'Start Timer'}</span>
        </button>
      </div>

      {/* ── Sleep Logging Form ─────────────────────────────────────── */}
      <form onSubmit={handleSaveSleep} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label className="md3-field-label">Bedtime</label>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              className="md3-field-outlined"
              style={{ height: '40px', padding: '0 12px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label className="md3-field-label">Wake Up</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="md3-field-outlined"
              style={{ height: '40px', padding: '0 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: 'var(--md-sys-shape-medium)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>
              Calculated Duration
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--md-sys-color-primary)' }}>
              {durationHours} Hours {durationHours >= 7 ? '✨ Optimal' : '⚠️ Low Rest'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Quality Rating
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setQualityRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: star <= qualityRating ? '#eab308' : 'var(--md-sys-color-outline-variant)'
                  }}
                >
                  <Star size={18} fill={star <= qualityRating ? '#eab308' : 'none'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="md3-button-filled md3-button-md"
          style={{ width: '100%', gap: '6px', fontWeight: 800 }}
        >
          <CheckCircle2 size={16} />
          {todaySleep ? 'Update Sleep Record' : 'Log Sleep & Extend Streak (+80 XP)'}
        </button>

        {isSaved && (
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-tertiary)', textAlign: 'center' }}>
            ✓ Sleep record logged successfully! Daily streak evaluated.
          </div>
        )}
      </form>
    </div>
  );
};
