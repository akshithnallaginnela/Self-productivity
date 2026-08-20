/**
 * StartView.tsx — onboarding.
 *
 * Starts everyone at zero. The one place a non-zero number can enter is the
 * sobriety anchor, and only because the user states it themselves: someone who
 * is genuinely 40 days clean should not have to throw that away to use the app.
 * That sets `sobrietyStartDate` — it does not fabricate a streak, XP or income.
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Shield,
  Target,
  CheckCircle2,
  Lock,
  ArrowRight,
  IndianRupee,
  CalendarClock,
  AlertTriangle
} from 'lucide-react';
import { Archetype } from '../../types';
import { db, toDateKey } from '../../services/db';
import { createPinCredentials, validatePinFormat, markUnlocked } from '../../services/appLock';
import { audioEngine } from '../../services/audioEngine';
import { notificationService } from '../../services/notificationService';
import { AppLogo } from './AppLogo';

interface StartViewProps {
  onComplete: () => void;
}

const ARCHETYPES: Array<{ value: Archetype; emoji: string; label: string; blurb: string }> = [
  { value: 'EAGLE', emoji: '🦅', label: 'Eagle', blurb: 'Perspective. Rise above the noise.' },
  { value: 'WOLF', emoji: '🐺', label: 'Wolf', blurb: 'Loyalty. Discipline when nobody is watching.' },
  { value: 'TIGER', emoji: '🐅', label: 'Tiger', blurb: 'Precision. Stillness, then decisive action.' }
];

const INCOME_PRESETS = [50_000, 100_000, 150_000, 200_000];

export const StartView: React.FC<StartViewProps> = ({ onComplete }) => {
  const existing = db.getProfile();

  const [displayName, setDisplayName] = useState(existing.displayName);
  const [archetype, setArchetype] = useState<Archetype>(existing.selectedArchetype);
  const [incomeTarget, setIncomeTarget] = useState(
    existing.targetMonthlyIncome > 0 ? String(existing.targetMonthlyIncome) : ''
  );

  /** Days already clean before installing. Defaults to 0 — today is day zero. */
  const [priorDays, setPriorDays] = useState('0');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArchetype = (a: Archetype) => {
    setArchetype(a);
    db.setArchetype(a);
    audioEngine.triggerHaptic('medium');
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priorDaysNum = priorDays.trim() === '' ? 0 : Number(priorDays);
    if (!Number.isInteger(priorDaysNum) || priorDaysNum < 0 || priorDaysNum > 20_000) {
      setError('Days already clean must be a whole number of days.');
      return;
    }

    const incomeNum = incomeTarget.trim() === '' ? 0 : Number(incomeTarget);
    if (!Number.isFinite(incomeNum) || incomeNum < 0) {
      setError('Enter a valid monthly target, or leave it blank.');
      return;
    }

    let pinFields: { pinHash?: string; pinSalt?: string; isLockEnabled?: boolean } = {};
    if (pin.trim()) {
      const formatError = validatePinFormat(pin.trim());
      if (formatError) {
        setError(formatError);
        return;
      }
      try {
        setIsSubmitting(true);
        pinFields = { ...(await createPinCredentials(pin.trim())), isLockEnabled: true };
        markUnlocked();
      } catch (err) {
        setIsSubmitting(false);
        setError(err instanceof Error ? err.message : 'Could not set a PIN on this device.');
        return;
      }
    }

    // Backdate the anchor by the days the user says they already have.
    const anchor = new Date();
    anchor.setDate(anchor.getDate() - priorDaysNum);

    db.updateProfile({
      displayName: displayName.trim(),
      selectedArchetype: archetype,
      targetMonthlyIncome: incomeNum,
      sobrietyStartDate: anchor.toISOString(),
      isOnboardingCompleted: true,
      lastLoginDate: toDateKey(),
      lastRolloverDate: toDateKey(),
      // Explicitly zero: nothing is earned before the app is used.
      currentStreak: 0,
      longestStreak: 0,
      xpPoints: 0,
      tasksCompletedToday: 0,
      lastStreakExtendedDate: undefined,
      ...pinFields
    });

    db.setArchetype(archetype);
    // Any milestone already covered by the stated clean period unlocks now.
    db.evaluateBadges();
    void notificationService.scheduleDailyReminders();

    audioEngine.playMilestoneTriumph();
    audioEngine.triggerHaptic('success');
    confetti({ particleCount: 70, spread: 75, origin: { y: 0.5 }, disableForReducedMotion: true });

    setIsSubmitting(false);
    onComplete();
  };

  return (
    <form className="onboarding" onSubmit={handleStart}>
      <header className="onboarding-hero">
        <AppLogo size={80} variant="badge" animated />
        <h1>Sovereign Eagle</h1>
        <p>Sobriety, discipline and freelance income — tracked entirely on this device.</p>
      </header>

      {/* Name */}
      <section className="onboarding-card">
        <label className="md3-field-label" htmlFor="onb-name">What should the app call you?</label>
        <input
          id="onb-name"
          type="text"
          className="md3-field-outlined"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name or a call-sign"
          autoComplete="given-name"
        />
      </section>

      {/* Archetype */}
      <section className="onboarding-card">
        <span className="md3-field-label">Choose an archetype</span>
        <p className="onboarding-hint">It sets the app&apos;s colour palette and coaching voice.</p>
        <div className="archetype-grid" role="radiogroup" aria-label="Archetype">
          {ARCHETYPES.map((a) => (
            <button
              type="button"
              key={a.value}
              role="radio"
              aria-checked={archetype === a.value}
              className={`archetype-card ${archetype === a.value ? 'selected' : ''}`}
              onClick={() => handleArchetype(a.value)}
            >
              <span className="archetype-emoji" aria-hidden="true">{a.emoji}</span>
              <span className="archetype-name">{a.label}</span>
              <span className="archetype-blurb">{a.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Sobriety anchor */}
      <section className="onboarding-card">
        <label className="md3-field-label" htmlFor="onb-prior">
          <CalendarClock size={14} aria-hidden="true" /> How long have you been clean?
        </label>
        <p className="onboarding-hint">
          Leave this at 0 to start from today. If you already have a run behind you, enter it —
          your counter will reflect the truth rather than restarting.
        </p>
        <div className="prior-days-row">
          <input
            id="onb-prior"
            type="number"
            inputMode="numeric"
            min={0}
            className="md3-field-outlined"
            value={priorDays}
            onChange={(e) => setPriorDays(e.target.value)}
          />
          <span className="prior-days-unit">days</span>
        </div>
        <p className="onboarding-note">
          <Shield size={13} aria-hidden="true" />
          This sets your sobriety date only. Streak, XP and milestones all start at zero and
          are earned from here.
        </p>
      </section>

      {/* Income target */}
      <section className="onboarding-card">
        <label className="md3-field-label" htmlFor="onb-income">
          <IndianRupee size={14} aria-hidden="true" /> Monthly income target (optional)
        </label>
        <div className="preset-row">
          {INCOME_PRESETS.map((amount) => (
            <button
              type="button"
              key={amount}
              className={`preset-chip ${incomeTarget === String(amount) ? 'selected' : ''}`}
              onClick={() => {
                setIncomeTarget(String(amount));
                audioEngine.triggerHaptic('light');
              }}
            >
              ₹{(amount / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
        <input
          id="onb-income"
          type="number"
          inputMode="numeric"
          min={0}
          className="md3-field-outlined"
          value={incomeTarget}
          onChange={(e) => setIncomeTarget(e.target.value)}
          placeholder="Or type an amount — leave blank to skip"
        />
      </section>

      {/* Optional PIN */}
      <section className="onboarding-card">
        <label className="md3-field-label" htmlFor="onb-pin">
          <Lock size={14} aria-hidden="true" /> App lock (optional)
        </label>
        <p className="onboarding-hint">
          A 4-8 digit PIN, required each time the app opens. Only a salted hash is stored,
          never the PIN itself.
        </p>
        <input
          id="onb-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={8}
          className="md3-field-outlined pin-field"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Leave blank for no lock"
        />
      </section>

      {error && (
        <div className="notice notice-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="md3-button-filled onboarding-cta" disabled={isSubmitting}>
        <Target size={18} aria-hidden="true" />
        {isSubmitting ? 'Setting up…' : 'Start'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>

      <p className="onboarding-footer">
        <CheckCircle2 size={13} aria-hidden="true" />
        Nothing is uploaded. Cloud backup is switched off at the Android level.
      </p>
    </form>
  );
};
