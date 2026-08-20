/**
 * RelapseModal.tsx — records an honest relapse.
 *
 * This is the counterpart to the streak: without it the app can only ever be
 * told about wins, which makes every number it shows unreliable.
 *
 * Tone is deliberate. A relapse screen that punishes gets avoided, and an
 * avoided screen produces false data. It states plainly what will change, asks
 * two optional questions that make the record useful later, and requires one
 * explicit confirmation so it can never be triggered by a mis-tap.
 */

import React, { useState } from 'react';
import { X, RotateCcw, HeartHandshake } from 'lucide-react';
import { TriggerCategory } from '../../types';
import { db } from '../../services/db';
import { audioEngine } from '../../services/audioEngine';

interface RelapseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRIGGER_OPTIONS: Array<{ value: TriggerCategory; label: string }> = [
  { value: 'STRESS', label: 'Stress or anxiety' },
  { value: 'FATIGUE', label: 'Late-night fatigue' },
  { value: 'APP', label: 'An app or feed' },
  { value: 'EMOTION', label: 'Boredom or low mood' },
  { value: 'SOCIAL', label: 'Social pressure' },
  { value: 'LOCATION', label: 'Being somewhere specific' },
  { value: 'TIME', label: 'A time-of-day habit' }
];

export const RelapseModal: React.FC<RelapseModalProps> = ({ isOpen, onClose }) => {
  const [stage, setStage] = useState<'form' | 'confirm' | 'done'>('form');
  const [trigger, setTrigger] = useState<TriggerCategory>('STRESS');
  const [reflection, setReflection] = useState('');

  if (!isOpen) return null;

  const daysSober = db.getDaysSober();
  const profile = db.getProfile();

  const reset = () => {
    setStage('form');
    setTrigger('STRESS');
    setReflection('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = () => {
    const label = TRIGGER_OPTIONS.find((t) => t.value === trigger)?.label ?? trigger;

    db.recordRelapse({ trigger: label, reflection: reflection.trim() || undefined });

    // Also file it on the trigger radar so patterns surface in analytics.
    db.addTrigger({
      category: trigger,
      description: reflection.trim() || `Relapse — ${label}`,
      intensity: 9,
      resisted: false
    });

    audioEngine.triggerHaptic('medium');
    setStage('done');
  };

  return (
    <div className="md3-scrim" role="dialog" aria-modal="true" aria-labelledby="relapse-title">
      <div className="md3-dialog">
        <div className="dialog-header">
          <div className="dialog-header-title">
            <RotateCcw size={20} aria-hidden="true" />
            <h3 id="relapse-title">
              {stage === 'done' ? 'Recorded' : 'Log a relapse'}
            </h3>
          </div>
          <button onClick={handleClose} className="icon-button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {stage === 'form' && (
          <div className="dialog-body">
            <p className="dialog-lede">
              Recording this keeps your data honest, which is the only way the app can
              show you a real pattern. Nothing here is shared with anyone.
            </p>

            <div>
              <label className="md3-field-label" htmlFor="relapse-trigger">
                What set it off? (optional)
              </label>
              <select
                id="relapse-trigger"
                className="md3-select"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as TriggerCategory)}
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="md3-field-label" htmlFor="relapse-reflection">
                Anything worth remembering? (optional)
              </label>
              <textarea
                id="relapse-reflection"
                className="md3-field-outlined"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What was happening just before?"
              />
            </div>

            <div className="dialog-actions">
              <button type="button" className="md3-button-text" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="md3-button-filled md3-button-danger"
                onClick={() => setStage('confirm')}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {stage === 'confirm' && (
          <div className="dialog-body">
            <div className="callout callout-warning">
              <p>
                <strong>This will reset your sobriety count.</strong>
              </p>
              <ul>
                <li>
                  Days sober goes from <strong>{daysSober}</strong> back to <strong>0</strong>.
                </li>
                <li>
                  Your daily streak of <strong>{profile.currentStreak}</strong> ends.
                </li>
                <li>Milestone badges relock and start earning again from today.</li>
                <li>
                  Your history, journals and income records are <strong>kept</strong>.
                </li>
              </ul>
            </div>

            <div className="dialog-actions">
              <button type="button" className="md3-button-text" onClick={() => setStage('form')}>
                Go back
              </button>
              <button
                type="button"
                className="md3-button-filled md3-button-danger"
                onClick={handleConfirm}
              >
                Yes, record it
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="dialog-body dialog-body-centered">
            <HeartHandshake size={40} aria-hidden="true" className="dialog-icon-accent" />
            <p className="dialog-lede">
              Day one starts now. The record is saved and the pattern it belongs to will
              show up in your analytics — that is what makes the next one easier to see coming.
            </p>
            <button type="button" className="md3-button-filled" onClick={handleClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
