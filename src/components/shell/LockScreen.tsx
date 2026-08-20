/**
 * LockScreen.tsx — PIN gate shown before any app content.
 *
 * Rendered instead of the app whenever a PIN is set and the session has not
 * been unlocked. Verification is PBKDF2 against a stored salt+hash (see
 * services/appLock.ts); the PIN itself is never persisted.
 *
 * A failed-attempt backoff is applied so the 4-digit space cannot be walked
 * quickly by hand.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Delete, Lock, ShieldAlert } from 'lucide-react';
import { db } from '../../services/db';
import { verifyPin } from '../../services/appLock';
import { audioEngine } from '../../services/audioEngine';
import { AppLogo } from './AppLogo';

interface LockScreenProps {
  /** Called once the correct PIN is entered. */
  onUnlock: () => void;
}

const MAX_PIN_LENGTH = 8;
/** Lockout thresholds: attempts -> seconds locked out. */
const BACKOFF_AFTER_ATTEMPTS = 5;
const BACKOFF_SECONDS = 30;

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const profile = db.getProfile();
  const displayName = profile.displayName.trim();

  /** Countdown for the lockout window. */
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    lockoutTimer.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          if (lockoutTimer.current) clearInterval(lockoutTimer.current);
          setAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (lockoutTimer.current) clearInterval(lockoutTimer.current);
    };
  }, [lockoutRemaining]);

  const isLockedOut = lockoutRemaining > 0;

  const handleDigit = (digit: string) => {
    if (isLockedOut || isChecking || entry.length >= MAX_PIN_LENGTH) return;
    setError(null);
    audioEngine.triggerHaptic('light');
    setEntry((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (isLockedOut || isChecking) return;
    audioEngine.triggerHaptic('light');
    setEntry((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (isLockedOut || isChecking || entry.length < 4) return;

    setIsChecking(true);
    const ok = await verifyPin(entry, {
      pinHash: profile.pinHash,
      pinSalt: profile.pinSalt
    });
    setIsChecking(false);

    if (ok) {
      audioEngine.triggerHaptic('success');
      onUnlock();
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setEntry('');
    audioEngine.triggerHaptic('heavy');

    if (nextAttempts >= BACKOFF_AFTER_ATTEMPTS) {
      setLockoutRemaining(BACKOFF_SECONDS);
      setError(`Too many attempts. Try again in ${BACKOFF_SECONDS} seconds.`);
    } else {
      const left = BACKOFF_AFTER_ATTEMPTS - nextAttempts;
      setError(`Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} left before a short lockout.`);
    }
  };

  // Submit automatically once a plausible PIN length is reached, but only for
  // the common 4-digit case — longer PINs use the confirm key.
  useEffect(() => {
    if (entry.length === 4) void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="lock-screen">
      <div className="lock-screen-inner">
        <AppLogo size={64} variant="badge" />

        <div className="lock-screen-heading">
          <h1>{displayName ? `Welcome back, ${displayName}` : 'Sovereign Eagle'}</h1>
          <p>
            <Lock size={13} aria-hidden="true" />
            Enter your PIN to unlock
          </p>
        </div>

        {/* Entry dots */}
        <div className="lock-dots" role="status" aria-live="polite"
             aria-label={`${entry.length} of ${MAX_PIN_LENGTH} digits entered`}>
          {Array.from({ length: Math.max(4, entry.length) }).map((_, i) => (
            <span key={i} className={`lock-dot ${i < entry.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && (
          <p className="lock-error" role="alert">
            <ShieldAlert size={14} aria-hidden="true" />
            {isLockedOut
              ? `Too many attempts. Try again in ${lockoutRemaining} second${lockoutRemaining === 1 ? '' : 's'}.`
              : error}
          </p>
        )}

        {/* Keypad */}
        <div className="lock-keypad">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              className="lock-key"
              onClick={() => handleDigit(k)}
              disabled={isLockedOut || isChecking}
              aria-label={k}
            >
              {k}
            </button>
          ))}

          <button
            type="button"
            className="lock-key lock-key-ghost"
            onClick={handleSubmit}
            disabled={isLockedOut || isChecking || entry.length < 4}
            aria-label="Confirm PIN"
          >
            OK
          </button>

          <button
            type="button"
            className="lock-key"
            onClick={() => handleDigit('0')}
            disabled={isLockedOut || isChecking}
            aria-label="0"
          >
            0
          </button>

          <button
            type="button"
            className="lock-key lock-key-ghost"
            onClick={handleBackspace}
            disabled={isLockedOut || isChecking || entry.length === 0}
            aria-label="Delete last digit"
          >
            <Delete size={20} />
          </button>
        </div>

        <p className="lock-footnote">
          Your PIN never leaves this device, and it is stored only as a salted hash.
        </p>
      </div>
    </div>
  );
};
