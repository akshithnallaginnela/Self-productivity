/**
 * StatusBar.tsx — Official Android Transparent Status Bar
 *
 * Implements the edge-to-edge status bar as described in:
 * https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
 *
 * Key behaviors:
 *   - Fully transparent by default (content scrolls behind it)
 *   - Gains a frosted glass effect when content has scrolled
 *   - Shows real-time clock, camera punchhole, and system indicators
 *   - Streak badge is interactive (opens profile on tap)
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { UserProfile } from '../../types';
import { db } from '../../services/db';

interface StatusBarProps {
  /** Whether the content area has scrolled (triggers frosted glass effect) */
  isScrolled: boolean;
  /** Callback when user taps the streak badge to open profile */
  onOpenProfile: () => void;
}

/**
 * Renders the official Android 14 status bar overlay.
 * This component sits on top of the content area with position: absolute
 * and a transparent background, allowing edge-to-edge rendering.
 */
export const StatusBar: React.FC<StatusBarProps> = ({ isScrolled, onOpenProfile }) => {
  const [profile, setProfile] = useState<UserProfile>(db.getProfile());
  const [currentTime, setCurrentTime] = useState<string>('');

  /**
   * Subscribe to profile changes and start the clock ticker.
   * Clock updates every 10 seconds to avoid unnecessary re-renders.
   */
  useEffect(() => {
    const unsub = db.subscribe(() => setProfile(db.getProfile()));

    const tickClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    tickClock();
    const timer = setInterval(tickClock, 10000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  /** Maps archetype to its spirit animal emoji for the status bar badge. */
  const getArchetypeEmoji = (): string => {
    switch (profile.selectedArchetype) {
      case 'WOLF':  return '🐺';
      case 'TIGER': return '🐅';
      default:      return '🦅';
    }
  };

  return (
    <header
      className={`system-status-bar ${isScrolled ? 'scrolled' : ''}`}
      aria-label="Android Status Bar"
    >
      {/* Left cluster: time + streak badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="status-bar-time" style={{ fontWeight: 700 }}>
          {currentTime}
        </span>

        {/* Interactive streak badge — tapping opens warrior profile */}
        <button
          onClick={onOpenProfile}
          aria-label={`${profile.currentStreak} day streak. Tap to open profile.`}
          style={{
            background: 'var(--md-sys-color-surface-container)',
            padding: '2px 8px',
            borderRadius: 'var(--md-sys-shape-small)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '11px',
          }}
        >
          <span>{getArchetypeEmoji()}</span>
          <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 800 }}>
            {profile.currentStreak}d
          </span>
        </button>
      </div>

      {/* Center: camera punchhole cutout */}
      <div className="status-bar-punchhole" />

      {/* Right cluster: system indicators */}
      <div className="status-bar-icons">
        <Signal size={12} />
        <Wifi size={13} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Battery size={14} />
          <span style={{ fontSize: '10px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            98%
          </span>
        </div>
      </div>
    </header>
  );
};
