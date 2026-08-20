/**
 * StatusBar.tsx — the app's own top bar.
 *
 * What this deliberately does NOT draw any more: a simulated signal strength,
 * wifi glyph, camera punch-hole, or a hardcoded "98%" battery. On a device
 * those sat directly beneath the real Android status bar, duplicating it and
 * showing a battery level that was always wrong.
 *
 * What remains is real: the device clock (browser preview only, since the OS
 * already shows one on Android) and the live streak chip, which is a genuine
 * control that opens the profile.
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { db } from '../../services/db';
import { androidSystem } from '../../services/androidSystem';
import { AppLogo } from './AppLogo';

interface StatusBarProps {
  /** Content has scrolled — the bar gains a frosted backdrop for legibility. */
  isScrolled: boolean;
  onOpenProfile: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isScrolled, onOpenProfile }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [daysSober, setDaysSober] = useState(db.getDaysSober());
  const [isSecured, setIsSecured] = useState(db.isStreakSecuredToday());
  const [currentTime, setCurrentTime] = useState('');

  const isNative = androidSystem.isNative;

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setProfile(db.getProfile());
      setDaysSober(db.getDaysSober());
      setIsSecured(db.isStreakSecuredToday());
    });

    // The OS draws its own clock on Android; only the browser preview needs one.
    if (isNative) return unsub;

    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    tick();
    const timer = setInterval(tick, 15_000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [isNative]);

  const archetypeEmoji =
    profile.selectedArchetype === 'WOLF' ? '🐺' : profile.selectedArchetype === 'TIGER' ? '🐅' : '🦅';

  return (
    <header className={`system-status-bar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="status-bar-left">
        {!isNative && <span className="status-bar-time">{currentTime}</span>}
        <AppLogo size={14} />
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className={`status-streak-chip ${isSecured ? 'secured' : ''}`}
        aria-label={`${daysSober} days sober. ${
          isSecured ? 'Today is secured.' : 'Today is not secured yet.'
        } Open your profile.`}
      >
        <span aria-hidden="true">{archetypeEmoji}</span>
        <strong>{daysSober}d</strong>
        <span className="status-streak-state" aria-hidden="true">
          {isSecured ? '✓' : '·'}
        </span>
      </button>
    </header>
  );
};
