/**
 * CrisisModal.tsx — Emergency Urge Intervention Modal
 *
 * Implements a 10-second mandatory delay mechanism designed to
 * disrupt the impulsive urge-to-action neural pathway.
 *
 * Flow:
 *   1. Modal opens with a 10-second countdown timer
 *   2. During countdown, a 4-7-8 breathing pacer animates
 *   3. User cannot dismiss the modal until timer reaches 0
 *   4. After timer completes, user can choose to "resist" or "close"
 *   5. Resisting logs a trigger entry and awards XP
 *
 * The 4-7-8 breathing technique:
 *   - 4 seconds inhale
 *   - 7 seconds hold
 *   - 8 seconds exhale
 *   Total cycle: 19 seconds (animation runs on loop)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, Heart } from 'lucide-react';
import { db } from '../../services/db';

interface CrisisModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Renders the crisis intervention overlay with countdown timer
 * and animated breathing pacer using official M3 dialog styling.
 */
export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  /** Countdown seconds remaining (starts at 10) */
  const [countdown, setCountdown] = useState<number>(10);

  /** Current phase of the 4-7-8 breathing cycle */
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  /** Timer ref for cleanup */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Starts the 10-second countdown when the modal opens.
   * Resets state when closed.
   */
  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(10);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  /**
   * Cycles through the 4-7-8 breathing phases.
   * Inhale (4s) → Hold (7s) → Exhale (8s) → repeat
   */
  useEffect(() => {
    if (!isOpen) return;

    const breathCycle = () => {
      setBreathPhase('inhale');
      setTimeout(() => setBreathPhase('hold'), 4000);
      setTimeout(() => setBreathPhase('exhale'), 11000);
    };

    breathCycle();
    const interval = setInterval(breathCycle, 19000);
    return () => clearInterval(interval);
  }, [isOpen]);

  /**
   * Called when the user successfully resists the urge.
   * Logs a trigger entry, awards XP, and closes the modal.
   */
  const handleResist = () => {
    db.addTrigger({
      category: 'EMOTION',
      description: 'Urge successfully resisted via 10s Crisis Shield',
      intensity: 8,
      resisted: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  /** Maps the breath phase to a human-readable instruction. */
  const getBreathInstruction = (): string => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe In (4s)';
      case 'hold':   return 'Hold (7s)';
      case 'exhale': return 'Breathe Out (8s)';
    }
  };

  return (
    <div className="md3-scrim">
      <div className="md3-dialog" style={{ textAlign: 'center' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{
            fontFamily: 'var(--md-sys-typescale-title-large-font)',
            fontSize: 'var(--md-sys-typescale-title-large-size)',
            fontWeight: 600,
            color: 'var(--md-sys-color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Heart size={20} />
            Crisis Shield Active
          </h3>
          {countdown === 0 && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer' }}
              aria-label="Close crisis modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Countdown timer */}
        <div style={{
          fontSize: '56px',
          fontFamily: 'var(--md-sys-typescale-display-large-font)',
          fontWeight: 700,
          color: countdown > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
          margin: '8px 0',
        }}>
          {countdown > 0 ? countdown : '✓'}
        </div>

        <p style={{
          fontFamily: 'var(--md-sys-typescale-body-medium-font)',
          fontSize: 'var(--md-sys-typescale-body-medium-size)',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}>
          {countdown > 0
            ? 'Wait. The urge will pass. Focus on your breath.'
            : 'The 10 seconds are up. You are in control now.'
          }
        </p>

        {/* 4-7-8 Breathing pacer circle */}
        <div style={{
          width: '100px',
          height: '100px',
          margin: '16px auto',
          borderRadius: 'var(--md-sys-shape-full)',
          border: '3px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'breathe-4-7-8 19s infinite ease-in-out',
        }}>
          <span style={{
            fontFamily: 'var(--md-sys-typescale-label-large-font)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--md-sys-color-on-surface)',
          }}>
            {getBreathInstruction()}
          </span>
        </div>

        {/* Resist / Close actions */}
        {countdown === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button className="md3-button-filled" onClick={handleResist}>
              <ShieldCheck size={16} />
              I Resisted (+100 XP)
            </button>
            <button className="md3-button-text" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
