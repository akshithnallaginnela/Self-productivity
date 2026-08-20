/**
 * ProfileModal.tsx — profile, app lock, safety contact and data controls.
 *
 * The app lock here is real: setting a PIN derives a PBKDF2 hash that the lock
 * screen verifies on launch. The previous version collected a PIN, stored it in
 * plain text and never checked it anywhere — a lock that does not lock is worse
 * than no lock, because the user believes they are protected.
 */

import React, { useState } from 'react';
import { UserCircle, X, CheckCircle2, Lock, Phone, AlertTriangle, Trash2 } from 'lucide-react';
import { Archetype } from '../../types';
import { db, toDateKey } from '../../services/db';
import { createPinCredentials, validatePinFormat, markUnlocked, lock } from '../../services/appLock';
import { audioEngine } from '../../services/audioEngine';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStart?: () => void;
}

const ARCHETYPES: Array<{ value: Archetype; label: string; emoji: string }> = [
  { value: 'EAGLE', label: 'Eagle', emoji: '🦅' },
  { value: 'WOLF', label: 'Wolf', emoji: '🐺' },
  { value: 'TIGER', label: 'Tiger', emoji: '🐅' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenStart }) => {
  const profile = db.getProfile();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [targetIncome, setTargetIncome] = useState(
    profile.targetMonthlyIncome > 0 ? String(profile.targetMonthlyIncome) : ''
  );
  const [archetype, setArchetype] = useState<Archetype>(profile.selectedArchetype);
  const [contactName, setContactName] = useState(profile.trustedContactName ?? '');
  const [contactPhone, setContactPhone] = useState(profile.trustedContactPhone ?? '');

  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const hasLock = profile.isLockEnabled;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    // A blank income target is legitimate — it means "not set", not zero revenue.
    const parsedIncome = targetIncome.trim() === '' ? 0 : Number(targetIncome);
    if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
      setPinError('Enter a valid monthly target, or leave it blank.');
      return;
    }

    let pinFields: { pinHash?: string; pinSalt?: string; isLockEnabled?: boolean } = {};

    if (newPin.trim()) {
      const formatError = validatePinFormat(newPin.trim());
      if (formatError) {
        setPinError(formatError);
        return;
      }
      try {
        const creds = await createPinCredentials(newPin.trim());
        pinFields = { ...creds, isLockEnabled: true };
        markUnlocked(); // don't lock the user out of the session they just set it in
      } catch (err) {
        setPinError(err instanceof Error ? err.message : 'Could not set a PIN on this device.');
        return;
      }
    }

    db.updateProfile({
      displayName: displayName.trim(),
      targetMonthlyIncome: parsedIncome,
      selectedArchetype: archetype,
      trustedContactName: contactName.trim() || undefined,
      trustedContactPhone: contactPhone.trim() || undefined,
      ...pinFields
    });
    db.setArchetype(archetype);

    audioEngine.triggerHaptic('success');
    setNewPin('');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  const handleRemoveLock = () => {
    db.updateProfile({ isLockEnabled: false, pinHash: undefined, pinSalt: undefined });
    lock(); // clear the in-memory unlocked flag too
    markUnlocked();
    setNewPin('');
    audioEngine.triggerHaptic('light');
  };

  const handleFactoryReset = () => {
    db.factoryReset();
    audioEngine.triggerHaptic('heavy');
    onClose();
    // Send the user back through onboarding, since there is no profile now.
    onOpenStart?.();
  };

  return (
    <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="md3-dialog profile-dialog">
        <div className="dialog-header">
          <div className="dialog-header-title">
            <UserCircle size={22} aria-hidden="true" />
            <h3 id="profile-title">Profile</h3>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="dialog-body profile-form">
          {/* Identity */}
          <div>
            <label className="md3-field-label" htmlFor="profile-name">Your name</label>
            <input
              id="profile-name"
              type="text"
              className="md3-field-outlined"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should the app call you?"
            />
          </div>

          <div>
            <label className="md3-field-label" htmlFor="profile-income">
              Monthly income target (₹)
            </label>
            <input
              id="profile-income"
              type="number"
              inputMode="numeric"
              min={0}
              className="md3-field-outlined"
              value={targetIncome}
              onChange={(e) => setTargetIncome(e.target.value)}
              placeholder="Leave blank if you are not tracking one"
            />
          </div>

          <div>
            <span className="md3-field-label">Archetype</span>
            <div className="archetype-row" role="radiogroup" aria-label="Archetype">
              {ARCHETYPES.map((a) => (
                <button
                  type="button"
                  key={a.value}
                  role="radio"
                  aria-checked={archetype === a.value}
                  onClick={() => setArchetype(a.value)}
                  className={archetype === a.value ? 'md3-button-filled' : 'md3-button-outlined'}
                >
                  <span aria-hidden="true">{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Safety contact */}
          <fieldset className="profile-section">
            <legend>
              <Phone size={14} aria-hidden="true" /> Trusted contact
            </legend>
            <p className="profile-section-hint">
              Shown in the crisis shield so you can reach someone in one tap. Stored only
              on this device.
            </p>
            <div className="field-pair">
              <input
                type="text"
                className="md3-field-outlined"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name"
                aria-label="Trusted contact name"
              />
              <input
                type="tel"
                className="md3-field-outlined"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
                aria-label="Trusted contact phone number"
              />
            </div>
          </fieldset>

          {/* App lock */}
          <fieldset className="profile-section">
            <legend>
              <Lock size={14} aria-hidden="true" /> App lock
            </legend>
            <p className="profile-section-hint">
              {hasLock
                ? 'A PIN is set. It is required each time the app starts.'
                : 'Set a 4-8 digit PIN to require it on launch. Only a salted hash is stored.'}
            </p>

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              className="md3-field-outlined pin-field"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder={hasLock ? 'Enter a new PIN to change it' : '4-8 digits'}
              aria-label="New PIN"
            />

            {hasLock && (
              <button
                type="button"
                className="md3-button-text md3-button-sm"
                onClick={handleRemoveLock}
              >
                Remove PIN lock
              </button>
            )}
          </fieldset>

          {pinError && (
            <div className="notice notice-error" role="alert">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>{pinError}</span>
            </div>
          )}

          <button type="submit" className="md3-button-filled">
            <CheckCircle2 size={16} aria-hidden="true" />
            {saved ? 'Saved' : 'Save changes'}
          </button>

          {/* Data controls */}
          <fieldset className="profile-section profile-section-danger">
            <legend>
              <Trash2 size={14} aria-hidden="true" /> Data
            </legend>
            <p className="profile-section-hint">
              Sober since {toDateKey(new Date(profile.sobrietyStartDate))}. Everything is
              stored on this device only.
            </p>

            {!confirmReset ? (
              <button
                type="button"
                className="md3-button-outlined md3-button-danger"
                onClick={() => setConfirmReset(true)}
              >
                Erase all data
              </button>
            ) : (
              <div className="callout callout-danger">
                <p>
                  <strong>This deletes everything permanently</strong> — history, journals,
                  income records and your sobriety start date. Export a backup first if you
                  want to keep any of it.
                </p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="md3-button-text"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="md3-button-filled md3-button-danger"
                    onClick={handleFactoryReset}
                  >
                    Erase everything
                  </button>
                </div>
              </div>
            )}
          </fieldset>
        </form>
      </div>
    </div>
  );
};
