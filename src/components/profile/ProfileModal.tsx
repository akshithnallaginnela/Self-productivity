/**
 * ProfileModal.tsx — Warrior Command Profile & Configuration Modal
 *
 * Implements the user settings and profile configuration dialog:
 *   1. Call-sign / Display Name customizer
 *   2. Monthly Freelance Income Target in INR (₹)
 *   3. Active Mindset Archetype selector (Eagle / Wolf / Tiger) with dynamic M3 palette switching
 *   4. Local Security PIN configuration (100% offline & client-side)
 *
 * Persists all changes directly to the reactive LocalDatabase instance
 * and dynamically updates the `data-archetype` attribute on the root HTML element.
 */

import React, { useState } from 'react';
import { UserCircle, X, CheckCircle2 } from 'lucide-react';
import { Archetype } from '../../types';
import { db } from '../../services/db';

interface ProfileModalProps {
  /** Whether the modal dialog is currently visible */
  isOpen: boolean;
  /** Callback fired to close the modal */
  onClose: () => void;
  /** Callback to re-open the Start / Setup screen */
  onOpenStart?: () => void;
}

/**
 * Renders the Material Design 3 profile configuration dialog.
 */
export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenStart }) => {
  const profile = db.getProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [targetIncome, setTargetIncome] = useState(profile.targetMonthlyIncome.toString());
  const [archetype, setArchetype] = useState<Archetype>(profile.selectedArchetype);
  const [pin, setPin] = useState(profile.pin || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  /**
   * Saves profile updates to local database, updates archetype tokens,
   * and provides user confirmation before closing.
   */
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeNum = parseFloat(targetIncome);

    db.updateProfile({
      displayName,
      targetMonthlyIncome: isNaN(incomeNum) ? 120000 : incomeNum,
      selectedArchetype: archetype,
      pin: pin || undefined
    });

    db.setArchetype(archetype);

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
      <div className="md3-dialog">
        {/* Dialog Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCircle size={22} color="var(--md-sys-color-primary)" />
            <h3 
              id="profile-dialog-title"
              style={{
                fontFamily: 'var(--md-sys-typescale-title-large-font)',
                fontSize: 'var(--md-sys-typescale-title-large-size)',
                fontWeight: 600,
                color: 'var(--md-sys-color-on-surface)'
              }}
            >
              Warrior Command Profile
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer' }}
            aria-label="Close profile settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Configuration Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="md3-field-label">Warrior Call-Sign / Name:</label>
            <input 
              type="text" 
              required
              className="md3-field-outlined"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Akshith Sovereign"
            />
          </div>

          <div>
            <label className="md3-field-label">Monthly Income Target (INR ₹):</label>
            <input 
              type="number" 
              required
              className="md3-field-outlined"
              value={targetIncome}
              onChange={(e) => setTargetIncome(e.target.value)}
              placeholder="e.g. 150000"
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="md3-field-label">Active Mindset Archetype:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '4px' }}>
              {(['EAGLE', 'WOLF', 'TIGER'] as Archetype[]).map((a) => {
                const isSelected = archetype === a;
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => setArchetype(a)}
                    className={isSelected ? 'md3-button-filled' : 'md3-button-outlined'}
                    style={{
                      padding: '6px 4px',
                      fontSize: '11px',
                      height: '36px',
                      fontWeight: isSelected ? 800 : 600
                    }}
                  >
                    {a === 'EAGLE' ? '🦅 Eagle' : a === 'WOLF' ? '🐺 Wolf' : '🐅 Tiger'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="md3-field-label">Local Security Lock PIN (Optional):</label>
            <input 
              type="password" 
              maxLength={6}
              className="md3-field-outlined"
              value={pin}
              placeholder="e.g. 1234"
              onChange={(e) => setPin(e.target.value)}
              style={{ letterSpacing: '4px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="md3-button-filled">
              <CheckCircle2 size={16} />
              {saved ? 'Profile Settings Saved ✓' : 'Save Command Settings'}
            </button>

            {onOpenStart && (
              <button
                type="button"
                className="md3-button-tonal"
                onClick={onOpenStart}
                style={{ fontSize: '12px' }}
              >
                🦅 Re-launch Start Screen & Setup
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
