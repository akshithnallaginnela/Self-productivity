/**
 * App.tsx — root component, navigation state and app-level lifecycle.
 *
 * Owns four things the rest of the tree depends on:
 *   1. The PIN gate. Nothing renders until an enabled lock is satisfied.
 *   2. The daily rollover — run at launch AND whenever the app returns to the
 *      foreground, so an app left open across midnight still rolls over.
 *   3. Home-screen widget actions arriving from native.
 *   4. Android hardware/predictive back dispatch.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationTab, WidgetAction } from './types';
import { db } from './services/db';
import { androidSystem } from './services/androidSystem';
import { widgetBridge } from './services/widgetBridge';
import { notificationService } from './services/notificationService';
import { isUnlocked, markUnlocked } from './services/appLock';
import { AndroidShell } from './components/shell/AndroidShell';
import { LockScreen } from './components/shell/LockScreen';
import { StartView } from './components/shell/StartView';
import { RecoveryView } from './components/recovery/RecoveryView';
import { RoutineView } from './components/routine/RoutineView';
import { IncomeView } from './components/income/IncomeView';
import { MindsetView } from './components/mindset/MindsetView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { WidgetDeck } from './components/widgets/WidgetDeck';
import { CrisisModal } from './components/recovery/CrisisModal';
import { RelapseModal } from './components/recovery/RelapseModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { NotificationDrawer } from './components/shell/NotificationDrawer';

export const App: React.FC = () => {
  const initialProfile = useRef(db.getProfile()).current;

  const [activeTab, setActiveTab] = useState<NavigationTab>(
    initialProfile.isOnboardingCompleted ? 'recovery' : 'start'
  );

  /** True while a configured PIN has not yet been entered this session. */
  const [isLocked, setIsLocked] = useState<boolean>(
    initialProfile.isLockEnabled && !isUnlocked()
  );

  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isRelapseOpen, setIsRelapseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  /* ── Archetype theming ───────────────────────────────────────────────── */
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute(
        'data-archetype',
        db.getProfile().selectedArchetype || 'EAGLE'
      );
    };
    apply();
    return db.subscribe(apply);
  }, []);

  /* ── Daily rollover ──────────────────────────────────────────────────── */

  /**
   * Closes out any elapsed day: writes history, clears the checklist and
   * settles a lapsed streak. Idempotent, so running it on every resume is free.
   */
  const runRollover = useCallback(() => {
    const result = db.performDailyRollover();
    if (result.rolledOver) {
      notificationService.reportRollover(result);
      // The evening streak reminder is conditional on today's state, so it has
      // to be rebuilt once the day has turned over.
      void notificationService.scheduleDailyReminders();
    }
  }, []);

  useEffect(() => {
    if (isLocked) return; // don't mutate state behind a locked screen
    runRollover();
    return androidSystem.onResume(runRollover);
  }, [isLocked, runRollover]);

  /* ── Reminders ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isLocked || !initialProfile.isOnboardingCompleted) return;
    // Rescheduled on every launch: a schedule set once at permission-grant time
    // does not survive reinstalls, restores, or a changed display name.
    void notificationService.scheduleDailyReminders();
  }, [isLocked, initialProfile.isOnboardingCompleted]);

  /* ── Home-screen widget actions ──────────────────────────────────────── */

  const handleWidgetAction = useCallback((action: string) => {
    switch (action as WidgetAction) {
      case 'crisis':
        setIsCrisisOpen(true);
        break;
      case 'open-routine':
        setActiveTab('routine');
        break;
      case 'open-income':
        setActiveTab('income');
        break;
      case 'check-next-habit': {
        const done = db.completeNextHabit();
        setActiveTab('routine');
        androidSystem.showToast(done ? `Checked off: ${done.name}` : 'Everything is already done today');
        break;
      }
      case 'open-recovery':
      default:
        setActiveTab('recovery');
        break;
    }
  }, []);

  useEffect(() => {
    if (isLocked) return;
    let dispose: (() => void) | undefined;
    void widgetBridge.onWidgetAction(handleWidgetAction).then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, [isLocked, handleWidgetAction]);

  /* ── Android back dispatch ───────────────────────────────────────────── */
  useEffect(() => {
    if (isLocked) return;

    const unregister = [
      androidSystem.registerBackHandler('crisis-modal', 100, () => {
        if (!isCrisisOpen) return false;
        setIsCrisisOpen(false);
        return true;
      }),
      androidSystem.registerBackHandler('relapse-modal', 98, () => {
        if (!isRelapseOpen) return false;
        setIsRelapseOpen(false);
        return true;
      }),
      androidSystem.registerBackHandler('notification-drawer', 95, () => {
        if (!isNotificationOpen) return false;
        setIsNotificationOpen(false);
        return true;
      }),
      androidSystem.registerBackHandler('profile-modal', 90, () => {
        if (!isProfileOpen) return false;
        setIsProfileOpen(false);
        return true;
      }),
      androidSystem.registerBackHandler('sub-navigation', 50, () => {
        if (activeTab === 'recovery' || activeTab === 'start') return false;
        setActiveTab('recovery');
        return true;
      })
    ];

    return () => unregister.forEach((fn) => fn());
  }, [isLocked, isCrisisOpen, isRelapseOpen, isNotificationOpen, isProfileOpen, activeTab]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  if (isLocked) {
    return (
      <LockScreen
        onUnlock={() => {
          markUnlocked();
          setIsLocked(false);
        }}
      />
    );
  }

  const openNotifications = () => setIsNotificationOpen(true);

  const renderActiveView = (): React.ReactNode => {
    switch (activeTab) {
      case 'start':
        return <StartView onComplete={() => setActiveTab('recovery')} />;
      case 'routine':
        return <RoutineView onOpenNotifications={openNotifications} />;
      case 'income':
        return <IncomeView onOpenNotifications={openNotifications} />;
      case 'mindset':
        return <MindsetView onOpenNotifications={openNotifications} />;
      case 'analytics':
        return <AnalyticsView onOpenNotifications={openNotifications} />;
      case 'widgets':
        return <WidgetDeck onOpenCrisis={() => setIsCrisisOpen(true)} onNavigate={setActiveTab} />;
      case 'recovery':
      default:
        return (
          <RecoveryView
            onOpenCrisis={() => setIsCrisisOpen(true)}
            onOpenRelapse={() => setIsRelapseOpen(true)}
            onOpenNotifications={openNotifications}
          />
        );
    }
  };

  return (
    <AndroidShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenCrisis={() => setIsCrisisOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      {renderActiveView()}

      <CrisisModal
        isOpen={isCrisisOpen}
        onClose={() => setIsCrisisOpen(false)}
        onReportRelapse={() => {
          setIsCrisisOpen(false);
          setIsRelapseOpen(true);
        }}
      />

      <RelapseModal isOpen={isRelapseOpen} onClose={() => setIsRelapseOpen(false)} />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenStart={() => {
          setIsProfileOpen(false);
          setActiveTab('start');
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </AndroidShell>
  );
};

export default App;
