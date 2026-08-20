/**
 * GpsWalkTracker.tsx — Monitored GPS Walk & Real-time Step Counter
 *
 * Implements:
 *   1. Real-time GPS Geolocation distance accumulation & biomechanical step estimation
 *   2. Live duration, pace (min/km), and target milestone progress ring
 *   3. Touch-friendly Start, Pause, Finish controls
 *   4. Verified discipline completion that unlocks today's daily streak (+120 XP)
 *   5. Seamless indoor / desktop simulation toggle
 */

import React, { useState, useEffect } from 'react';
import {
  Footprints,
  Play,
  Pause,
  CheckCircle2,
  Navigation,
  Sparkles,
  RotateCcw,
  Zap,
  Activity
} from 'lucide-react';
import { gpsTracker, GpsState } from '../../services/gpsTracker';
import { db } from '../../services/db';
import { androidSystem } from '../../services/androidSystem';

interface GpsWalkTrackerProps {
  onWalkFinished?: () => void;
}

export const GpsWalkTracker: React.FC<GpsWalkTrackerProps> = ({ onWalkFinished }) => {
  const [gpsState, setGpsState] = useState<GpsState>(gpsTracker.getState());
  const [showSimNotice, setShowSimNotice] = useState(false);
  const [recentWalks, setRecentWalks] = useState(db.getWalkSessions());

  useEffect(() => {
    const unsub = gpsTracker.subscribe((state) => {
      setGpsState(state);
    });

    const unsubDb = db.subscribe(() => {
      setRecentWalks(db.getWalkSessions());
    });

    return () => {
      unsub();
      unsubDb();
      androidSystem.releaseWakeLock();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayWalks = recentWalks.filter((w) => w.date === today && w.completed);
  const totalStepsToday = todayWalks.reduce((acc, w) => acc + w.stepsCount, 0);
  const isGoalCompletedToday = totalStepsToday >= 3000 || todayWalks.length > 0;

  const handleStartWalk = (forceSim: boolean = false) => {
    gpsTracker.startWalk(3000, forceSim);
    androidSystem.requestWakeLock();
    if (forceSim) {
      setShowSimNotice(true);
      setTimeout(() => setShowSimNotice(false), 4000);
    }
  };

  const handleTogglePause = () => {
    gpsTracker.togglePause();
  };

  const handleFinishWalk = () => {
    androidSystem.releaseWakeLock();
    const session = gpsTracker.finishWalk();
    if (session && onWalkFinished) {
      onWalkFinished();
    }
  };

  const handleCancelWalk = () => {
    androidSystem.releaseWakeLock();
    gpsTracker.cancelWalk();
  };

  const formatTime = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stepProgressPercent = Math.min(100, Math.round((gpsState.stepsCount / gpsState.targetSteps) * 100));
  const distanceKm = (gpsState.distanceMeters / 1000).toFixed(2);

  return (
    <div className="md3-card-elevated" style={{ padding: '20px' }}>
      {/* ── Card Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--md-sys-shape-full)',
            background: isGoalCompletedToday ? 'var(--md-sys-color-tertiary-container)' : 'var(--md-sys-color-primary-container)',
            color: isGoalCompletedToday ? 'var(--md-sys-color-on-tertiary-container)' : 'var(--md-sys-color-on-primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Footprints size={20} />
          </div>
          <div>
            <span className="md3-section-title" style={{ fontSize: '10px' }}>MONITORED DISCIPLINE</span>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
              GPS Walk & Step Counter
            </h2>
          </div>
        </div>

        {isGoalCompletedToday ? (
          <div className="md3-chip" style={{ background: 'var(--md-sys-color-tertiary-container)', color: 'var(--md-sys-color-on-tertiary-container)', fontWeight: 800 }}>
            <CheckCircle2 size={13} /> Walk Secured!
          </div>
        ) : (
          <div className="md3-chip" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Goal: 3,000 Steps
          </div>
        )}
      </div>

      {/* ── Active Walking Dashboard or Standby State ────────────────── */}
      {gpsState.isActive ? (
        <div style={{ marginTop: '16px' }}>
          {/* Live Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: '10px',
            background: 'var(--md-sys-color-surface-container)',
            padding: '16px',
            borderRadius: 'var(--md-sys-shape-large)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>
                Live Steps
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--md-sys-typescale-display-large-font)', color: 'var(--md-sys-color-primary)', lineHeight: 1.1 }}>
                {gpsState.stepsCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                {stepProgressPercent}% of 3k
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>
                Distance
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)', marginTop: '4px' }}>
                {distanceKm} <span style={{ fontSize: '12px', fontWeight: 600 }}>km</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
                Speed: {gpsState.currentSpeedKmh} km/h
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase' }}>
                Duration
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--md-sys-color-on-surface)', marginTop: '4px' }}>
                {formatTime(gpsState.durationSeconds)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
                {gpsState.isPaused ? '⏸️ Paused' : '🟢 Tracking'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div className="md3-progress-track" style={{ height: '8px' }}>
              <div
                className="md3-progress-indicator"
                style={{ width: `${stepProgressPercent}%` }}
              />
            </div>
          </div>

          {/* GPS Mode & Accuracy Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={12} color="var(--md-sys-color-primary)" />
              {gpsState.isSimulated ? 'Indoor / Motion Simulator Mode' : `GPS Active (±${gpsState.gpsAccuracy || 5}m accuracy)`}
            </span>
            <span>+{Math.min(120, Math.round(gpsState.stepsCount / 25))} XP Earned</span>
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleTogglePause}
              className="md3-button-tonal md3-button-sm"
              style={{ width: '100%' }}
            >
              {gpsState.isPaused ? <Play size={14} /> : <Pause size={14} />}
              {gpsState.isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              type="button"
              onClick={handleFinishWalk}
              className="md3-button-filled md3-button-sm"
              style={{ width: '100%', gap: '6px' }}
            >
              <CheckCircle2 size={15} /> Finish & Log
            </button>

            <button
              type="button"
              onClick={handleCancelWalk}
              className="md3-button-text md3-button-sm"
              style={{ color: 'var(--md-sys-color-error)', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.4 }}>
            Outdoor walking activates neural dopamine up-regulation and circadian cortisol regulation. Complete a 3,000-step walk or 2.0 km to secure today's streak!
          </p>

          {todayWalks.length > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: 'var(--md-sys-color-tertiary-container)',
              borderRadius: 'var(--md-sys-shape-medium)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--md-sys-color-on-tertiary-container)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              <span>Today's Total: {totalStepsToday.toLocaleString()} steps logged across {todayWalks.length} session(s)!</span>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => handleStartWalk(false)}
              className="md3-button-filled md3-button-md"
              style={{ flex: 1, gap: '8px', fontWeight: 800 }}
            >
              <Play size={16} /> Start GPS Walk
            </button>

            <button
              type="button"
              onClick={() => handleStartWalk(true)}
              className="md3-button-tonal md3-button-sm"
              title="Test / Indoor treadmill simulator mode"
              style={{ flexShrink: 0, padding: '0 12px' }}
            >
              <Activity size={15} /> Indoor Sim
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
