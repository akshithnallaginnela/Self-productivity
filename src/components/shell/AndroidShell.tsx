/**
 * AndroidShell.tsx — App Shell & Edge-to-Edge Device Frame
 *
 * This is the root layout component that orchestrates:
 *   1. StatusBar — transparent, overlays scrollable content
 *   2. Content Area — scrolls edge-to-edge behind the status bar
 *   3. Crisis FAB — extended floating action button (error variant)
 *   4. NavigationBar — official M3 80dp bottom nav
 *   5. GestureBar — transparent gesture handle
 *   6. Viewport switcher — toggle Pixel 8 frame vs. adaptive fluid
 *
 * The shell detects scroll position and passes it to StatusBar
 * so the status bar can gain a frosted glass effect when content
 * has scrolled beneath it.
 */

import React, { useState, useRef, useCallback } from 'react';
import { ShieldAlert, Smartphone, Maximize2, LayoutGrid } from 'lucide-react';
import { NavigationTab } from '../../types';
import { StatusBar } from './StatusBar';
import { NavigationBar } from './NavigationBar';
import { GestureBar } from './GestureBar';

interface AndroidShellProps {
  /** The currently rendered view content */
  children: React.ReactNode;
  /** Currently active navigation tab */
  activeTab: NavigationTab;
  /** Callback to change the active tab */
  setActiveTab: (tab: NavigationTab) => void;
  /** Opens the crisis intervention modal */
  onOpenCrisis: () => void;
  /** Opens the warrior profile modal */
  onOpenProfile: () => void;
}

/**
 * Renders the complete Android device shell with edge-to-edge rendering.
 * Content draws behind the transparent status bar and above the M3 nav bar.
 */
export const AndroidShell: React.FC<AndroidShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenCrisis,
  onOpenProfile,
}) => {
  /** Tracks whether user is in phone-frame mode or full-screen fluid mode */
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  /** Tracks scroll position to toggle frosted status bar glass effect */
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  /** Ref to the scroll container for detecting scroll position */
  const scrollRef = useRef<HTMLElement>(null);

  /**
   * Handles scroll events on the content area.
   * When the user scrolls more than 8px, the status bar gains
   * a frosted glass backdrop to maintain readability.
   */
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 8);
    }
  }, []);

  /**
   * Handles tab navigation. When switching to 'widgets', we go
   * to the home screen widget deck. Otherwise, navigate to the tab.
   */
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    // Scroll content back to top on tab switch
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Toggles between the widget deck home screen and the last
   * active app tab view.
   */
  const handleWidgetToggle = () => {
    if (activeTab === 'widgets') {
      setActiveTab('recovery');
    } else {
      setActiveTab('widgets');
    }
  };

  return (
    <div className="app-viewport-wrapper" style={!isPhoneFrame ? { padding: 0 } : undefined}>
      {/* ── Viewport Switcher Toolbar (floats above everything) ────────── */}
      <div className="viewport-toolbar">
        <button
          className={`viewport-toolbar-btn ${isPhoneFrame ? 'active' : ''}`}
          onClick={() => setIsPhoneFrame(true)}
          aria-label="Pixel 8 phone frame view"
        >
          <Smartphone size={13} />
          Pixel 8
        </button>
        <button
          className={`viewport-toolbar-btn ${!isPhoneFrame ? 'active' : ''}`}
          onClick={() => setIsPhoneFrame(false)}
          aria-label="Adaptive fluid full-screen view"
        >
          <Maximize2 size={13} />
          Fluid
        </button>
      </div>

      {/* ── Device Frame ─────────────────────────────────────────────── */}
      <div className={`android-device-frame ${!isPhoneFrame ? 'fluid-mode' : ''}`}>

        {/* Transparent edge-to-edge status bar */}
        <StatusBar
          isScrolled={isScrolled}
          onOpenProfile={onOpenProfile}
        />

        {/* ── Scrollable Content Area (edge-to-edge) ────────────────── */}
        <main
          ref={scrollRef}
          className="app-content-area"
          onScroll={handleScroll}
        >
          {/* Container transform wrapper for tab transitions */}
          <div key={activeTab} className="view-enter">
            {children}
          </div>
        </main>

        {/* ── Extended Crisis FAB (above nav bar) ────────────────────── */}
        {activeTab !== 'widgets' && (
          <div className="crisis-fab">
            <button
              className="md3-fab-extended md3-fab-error"
              onClick={onOpenCrisis}
              aria-label="Activate Crisis Shield — 10 second urge delay"
            >
              <ShieldAlert size={20} />
              <span>SOS Shield</span>
            </button>
          </div>
        )}

        {/* ── M3 Navigation Bar (80dp) ───────────────────────────────── */}
        <NavigationBar
          activeTab={activeTab === 'widgets' ? 'recovery' : activeTab}
          onTabChange={handleTabChange}
        />

        {/* ── Gesture Navigation Handle (transparent) ────────────────── */}
        <GestureBar />
      </div>
    </div>
  );
};
