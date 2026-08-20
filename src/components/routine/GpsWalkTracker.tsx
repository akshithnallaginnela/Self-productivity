/**
 * GpsWalkTracker.tsx — live GPS walk with honest verification state.
 *
 * The important behavioural change: indoor mode is now an explicit choice that
 * produces a clearly-labelled UNVERIFIED session worth no XP and unable to
 * secure the streak. Previously a denied location permission silently fell
 * back to synthesised steps, so standing still could earn the day.
 */

import React, { useState, useEffect } from 'react';
import {
  Footprints,
  Play,
  Pause,
  CheckCircle2,
  Navigation,
  Activity,
  AlertTriangle,
  Satellite
} from 'lucide-react';
import { gpsTracker, GpsState } from '../../services/gpsTracker';
import { db, toDateKey } from '../../services/db';
import { androidSystem } from '../../services/androidSystem';
import { audioEngine } from '../../services/audioEngine';

interface GpsWalkTrackerProps {
  onWalkFinished?: () => void;
}

const STEP_TARGET = 3000;

export const GpsWalkTracker: React.FC<GpsWalkTrackerProps> = ({ onWalkFinished }) => {
  const [gps, setGps] = useState<GpsState>(gpsTracker.getState());
  const [walks, setWalks] = useState(db.getWalkSessions());

  useEffect(() => {
    const unsubGps = gpsTracker.subscribe(setGps);
    const unsubDb = db.subscribe(() => setWalks(db.getWalkSessions()));
    return () => {
      unsubGps();
      unsubDb();
    };
  }, []);

  // Release the wake lock if this card unmounts mid-session.
  useEffect(() => () => androidSystem.releaseWakeLock(), []);

  const today = toDateKey();
  const todayWalks = walks.filter((w) => w.date === today && w.completed);
  const verifiedToday = todayWalks.filter((w) => w.isVerified);
  const stepsToday = verifiedToday.reduce((sum, w) => sum + w.stepsCount, 0);
  const isSecuredToday = verifiedToday.length > 0;

  const handleStart = (mode: 'gps' | 'simulator') => {
    gpsTracker.startWalk(STEP_TARGET, mode);
    void androidSystem.requestWakeLock();
    audioEngine.triggerHaptic('medium');
  };

  const handleFinish = () => {
    androidSystem.releaseWakeLock();
    const session = gpsTracker.finishWalk();
    if (session?.completed && session.isVerified) {
      audioEngine.playMilestoneTriumph();
      audioEngine.triggerHaptic('success');
    }
    onWalkFinished?.();
  };

  const handleCancel = () => {
    androidSystem.releaseWakeLock();
    gpsTracker.cancelWalk();
  };

  const formatTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = `${m}`.padStart(2, '0');
    const ss = `${s}`.padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const stepProgress = Math.min(100, Math.round((gps.stepsCount / gps.targetSteps) * 100));

  return (
    <div className="gps-card">
      <div className="gps-card-head">
        <div className="gps-card-title">
          <div className={`gps-icon ${isSecuredToday ? 'secured' : ''}`} aria-hidden="true">
            <Footprints size={20} />
          </div>
          <div>
            <span className="md3-section-title">Monitored discipline</span>
            <h2>GPS walk</h2>
          </div>
        </div>

        <div className={`md3-chip ${isSecuredToday ? 'md3-chip-success' : ''}`}>
          {isSecuredToday ? (
            <>
              <CheckCircle2 size={13} aria-hidden="true" /> Secured
            </>
          ) : (
            `Goal: ${STEP_TARGET.toLocaleString('en-IN')} steps`
          )}
        </div>
      </div>

      {gps.isActive ? (
        <div className="gps-active">
          {/* Verification banner — always visible, never buried */}
          <div className={`gps-mode-banner ${gps.isVerified ? 'verified' : 'unverified'}`}>
            {gps.isVerified ? (
              <>
                <Satellite size={14} aria-hidden="true" />
                <span>
                  {gps.hasFix
                    ? `GPS verified · ±${gps.gpsAccuracy ?? '—'}m`
                    : 'Waiting for a GPS fix…'}
                </span>
              </>
            ) : (
              <>
                <Activity size={14} aria-hidden="true" />
                <span>Indoor mode — this session will not count toward your streak</span>
              </>
            )}
          </div>

          {gps.error && (
            <div className="notice notice-warning" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{gps.error}</span>
            </div>
          )}

          <div className="gps-metrics">
            <div>
              <span className="gps-metric-label">Steps</span>
              <div className="gps-metric-value primary">{gps.stepsCount.toLocaleString('en-IN')}</div>
              <span className="gps-metric-sub">{stepProgress}% of goal</span>
            </div>
            <div>
              <span className="gps-metric-label">Distance</span>
              <div className="gps-metric-value">
                {(gps.distanceMeters / 1000).toFixed(2)}
                <small> km</small>
              </div>
              <span className="gps-metric-sub">{gps.currentSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="gps-metric-label">Time</span>
              <div className="gps-metric-value">{formatTime(gps.durationSeconds)}</div>
              <span className="gps-metric-sub">{gps.isPaused ? 'Paused' : 'Tracking'}</span>
            </div>
          </div>

          <div className="md3-progress-track">
            <div className="md3-progress-indicator" style={{ width: `${stepProgress}%` }} />
          </div>

          <div className="gps-controls">
            <button type="button" className="md3-button-tonal md3-button-sm" onClick={() => gpsTracker.togglePause()}>
              {gps.isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              {gps.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="md3-button-filled md3-button-sm" onClick={handleFinish}>
              <CheckCircle2 size={15} aria-hidden="true" />
              Finish
            </button>
            <button type="button" className="md3-button-text md3-button-sm gps-cancel" onClick={handleCancel}>
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="gps-idle">
          <p className="gps-blurb">
            A verified outdoor walk secures one of today&apos;s four disciplines. Keep the app
            open while you walk — tracking stops when Android suspends the screen.
          </p>

          {verifiedToday.length > 0 && (
            <div className="notice notice-success">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>
                {stepsToday.toLocaleString('en-IN')} steps today across{' '}
                {verifiedToday.length} verified session{verifiedToday.length === 1 ? '' : 's'}.
              </span>
            </div>
          )}

          <div className="gps-start-row">
            <button
              type="button"
              className="md3-button-filled md3-button-md gps-start-primary"
              onClick={() => handleStart('gps')}
            >
              <Navigation size={16} aria-hidden="true" />
              Start GPS walk
            </button>
            <button
              type="button"
              className="md3-button-tonal md3-button-sm"
              onClick={() => handleStart('simulator')}
              title="Log an indoor session. Not GPS-verified, so it earns no XP."
            >
              <Activity size={15} aria-hidden="true" />
              Indoor
            </button>
          </div>

          <p className="gps-footnote">
            Indoor sessions are recorded for your own reference but are marked unverified —
            they do not award XP or secure the day.
          </p>
        </div>
      )}
    </div>
  );
};
