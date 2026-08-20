/**
 * AndroidShell.tsx — app frame and layout.
 *
 * On a device this is a plain edge-to-edge container. The Pixel-8 chassis and
 * the "Pixel 8 / Fluid" viewport switcher are browser-preview scaffolding and
 * are not rendered on native — shipping them inside the APK put a fake device
 * bezel and a developer toolbar on top of the real UI.
 */

import React, { useState, useRef, useCallback } from 'react';
import { ShieldAlert, Smartphone, Maximize2 } from 'lucide-react';
import { NavigationTab } from '../../types';
import { androidSystem } from '../../services/androidSystem';
import { StatusBar } from './StatusBar';
import { NavigationBar } from './NavigationBar';
import { GestureBar } from './GestureBar';

interface AndroidShellProps {
  children: React.ReactNode;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenCrisis: () => void;
  onOpenProfile: () => void;
}

export const AndroidShell: React.FC<AndroidShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenCrisis,
  onOpenProfile
}) => {
  const isNative = androidSystem.isNative;

  /** Browser preview only: phone chassis vs. full-bleed. */
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  /**
   * Scroll listener, throttled to one state update per animation frame.
   * Unthrottled, this fired setState on every scroll event.
   */
  const scrollTicking = useRef(false);
  const handleScroll = useCallback(() => {
    if (scrollTicking.current) return;
    scrollTicking.current = true;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) setIsScrolled(el.scrollTop > 8);
      scrollTicking.current = false;
    });
  }, []);

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showChrome = activeTab !== 'start';
  const frameClasses = [
    'android-device-frame',
    isNative ? 'native-mode' : !isPhoneFrame ? 'fluid-mode' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`app-viewport-wrapper ${isNative ? 'native-mode' : ''}`}>
      {/* Preview-only viewport switcher. Never rendered inside the APK. */}
      {!isNative && (
        <div className="viewport-toolbar">
          <button
            className={`viewport-toolbar-btn ${isPhoneFrame ? 'active' : ''}`}
            onClick={() => setIsPhoneFrame(true)}
            aria-pressed={isPhoneFrame}
          >
            <Smartphone size={13} aria-hidden="true" />
            Phone
          </button>
          <button
            className={`viewport-toolbar-btn ${!isPhoneFrame ? 'active' : ''}`}
            onClick={() => setIsPhoneFrame(false)}
            aria-pressed={!isPhoneFrame}
          >
            <Maximize2 size={13} aria-hidden="true" />
            Full
          </button>
        </div>
      )}

      <div className={frameClasses}>
        {showChrome && <StatusBar isScrolled={isScrolled} onOpenProfile={onOpenProfile} />}

        <main ref={scrollRef} className="app-content-area" onScroll={handleScroll}>
          <div key={activeTab} className="view-enter">
            {children}
          </div>
        </main>

        {/* Crisis FAB — hidden on the widget deck and during onboarding. */}
        {showChrome && activeTab !== 'widgets' && (
          <div className="crisis-fab">
            <button
              className="md3-fab-extended md3-fab-error"
              onClick={onOpenCrisis}
              aria-label="Open the crisis shield"
            >
              <ShieldAlert size={20} aria-hidden="true" />
              <span>SOS</span>
            </button>
          </div>
        )}

        {showChrome && <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />}

        {/* Gesture handle: only meaningful in the browser mock. Android draws
            its own, and duplicating it wastes 20dp of real screen. */}
        {!isNative && showChrome && <GestureBar />}
      </div>
    </div>
  );
};
