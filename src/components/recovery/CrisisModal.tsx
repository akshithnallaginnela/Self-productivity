/**
 * CrisisModal.tsx — urge intervention.
 *
 * A 10-second mandatory delay plus a 4-7-8 breathing pacer, to put a gap
 * between impulse and action.
 *
 * Three outcomes are offered once the delay elapses, not one: the user resisted,
 * the user needs a person, or the user did not resist and wants to record it
 * honestly. Only offering "I resisted" is what makes an app's data drift.
 *
 * All timers are tracked and cleared on close — the previous version left bare
 * setTimeouts running, so breathing phases kept firing after dismissal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, Heart, Phone, RotateCcw } from 'lucide-react';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Opens the relapse recorder — the honest third option. */
  onReportRelapse: () => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale';

const COUNTDOWN_SECONDS = 10;
const PHASE_MS = { inhale: 4000, hold: 7000, exhale: 8000 };
const CYCLE_MS = PHASE_MS.inhale + PHASE_MS.hold + PHASE_MS.exhale; // 19s

export const CrisisModal: React.FC<CrisisModalProps> = ({
  isOpen,
  onClose,
  onReportRelapse
}) => {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');

  /** Every pending timer, so none can outlive the modal. */
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const intervals = useRef<Array<ReturnType<typeof setInterval>>>([]);

  const clearAllTimers = () => {
    timers.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timers.current = [];
    intervals.current = [];
  };

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      setCountdown(COUNTDOWN_SECONDS);
      setBreathPhase('inhale');
      return;
    }

    setCountdown(COUNTDOWN_SECONDS);

    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    intervals.current.push(tick);

    const runCycle = () => {
      setBreathPhase('inhale');
      timers.current.push(setTimeout(() => setBreathPhase('hold'), PHASE_MS.inhale));
      timers.current.push(
        setTimeout(() => setBreathPhase('exhale'), PHASE_MS.inhale + PHASE_MS.hold)
      );
    };
    runCycle();
    const cycle = setInterval(runCycle, CYCLE_MS);
    intervals.current.push(cycle);

    return clearAllTimers;
  }, [isOpen]);

  if (!isOpen) return null;

  const profile = db.getProfile();
  const hasContact = Boolean(profile.trustedContactPhone?.trim());

  const handleResisted = () => {
    db.addTrigger({
      category: 'EMOTION',
      description: 'Urge resisted using the crisis shield',
      intensity: 8,
      resisted: true
    });
    audioEngine.playTaskCompleteChime();
    audioEngine.triggerHaptic('success');
    onClose();
  };

  const breathLabel: Record<BreathPhase, string> = {
    inhale: 'Breathe in — 4 seconds',
    hold: 'Hold — 7 seconds',
    exhale: 'Breathe out — 8 seconds'
  };

  const isWaiting = countdown > 0;

  return (
    <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="crisis-title">
      <div className="md3-dialog crisis-dialog">
        <div className="dialog-header">
          <div className="dialog-header-title">
            <Heart size={20} aria-hidden="true" />
            <h3 id="crisis-title">Crisis shield</h3>
          </div>
          {!isWaiting && (
            <button onClick={onClose} className="icon-button" aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="dialog-body dialog-body-centered">
          <div
            className={`crisis-countdown ${isWaiting ? 'waiting' : 'ready'}`}
            role="timer"
            aria-live="polite"
          >
            {isWaiting ? countdown : '✓'}
          </div>

          <p className="dialog-lede">
            {isWaiting
              ? 'Wait here. The urge will crest and fall. Follow the breath.'
              : 'Ten seconds have passed. The decision is yours again.'}
          </p>

          {/* 4-7-8 pacer */}
          <div className={`breath-circle breath-${breathPhase}`} aria-live="polite">
            <span>{breathLabel[breathPhase]}</span>
          </div>

          {!isWaiting && (
            <div className="crisis-actions">
              <button type="button" className="md3-button-filled" onClick={handleResisted}>
                <ShieldCheck size={16} aria-hidden="true" />
                I resisted
              </button>

              {hasContact && (
                <a
                  className="md3-button-tonal"
                  href={`tel:${profile.trustedContactPhone}`}
                  onClick={() => audioEngine.triggerHaptic('medium')}
                >
                  <Phone size={16} aria-hidden="true" />
                  Call {profile.trustedContactName?.trim() || 'your contact'}
                </a>
              )}

              <button type="button" className="md3-button-text" onClick={onReportRelapse}>
                <RotateCcw size={15} aria-hidden="true" />
                I did not resist — record it
              </button>

              <button type="button" className="md3-button-text" onClick={onClose}>
                Close
              </button>
            </div>
          )}

          {!hasContact && !isWaiting && (
            <p className="dialog-footnote">
              Add a trusted contact in your profile to be able to reach someone from here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
